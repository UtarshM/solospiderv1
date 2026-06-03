import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked } from "https://esm.sh/marked@11.0.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const authHeader = req.headers.get("Authorization");
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const apiKey = Deno.env.get("LOVABLE_API_KEY");

        // if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Verify user
        const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
            global: { headers: { Authorization: authHeader || "" } },
        });
        const { data: { user }, error: userError } = await anonClient.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { contentId, integrationId, publishStatus, categories, authorId, canonicalUrl } = await req.json();

        if (!contentId) {
            return new Response(JSON.stringify({ error: "Content ID required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 1. Fetch Content
        const { data: content, error: contentError } = await supabase
            .from("content_items")
            .select("*")
            .eq("id", contentId)
            .eq("user_id", user.id)
            .single();

        if (contentError || !content) {
            return new Response(JSON.stringify({ error: "Content not found" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. Fetch Integrations
        let query = supabase
            .from("workspace_integrations")
            .select("*")
            .eq("user_id", user.id)
            .eq("platform", "wordpress")
            .eq("is_active", true);

        if (integrationId) {
            query = query.eq("id", integrationId);
        }

        // Explicitly type the response or just handle the data
        const { data: integrations, error: integrationError } = await query;

        if (integrationError || !integrations || integrations.length === 0) {
            return new Response(JSON.stringify({ error: "No active WordPress integration found" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Use the first integration found (or specific one)
        const integration = integrations[0];
        const creds = (integration.credentials || {}) as { url?: string; username?: string; app_password?: string };
        const { url: wpUrl, username, app_password } = creds;

        if (!wpUrl || !username || !app_password) {
            return new Response(JSON.stringify({ error: "Invalid integration credentials. Please check your WordPress settings." }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 3. Prepare Content (Markdown -> HTML)
        const title = content.generated_title || content.h1 || "Untitled Blog Post";
        let markdownContent = content.generated_content || "";

        // Strip the duplicate H1 from the top of the content so it doesn't appear in the WP body
        markdownContent = markdownContent.replace(/^#\s+.*(\r?\n)+/, '');

        // Fail-safe: Strip the plain-text title if the LLM hallucinated it exactly at the top of the body
        const titleRegex = new RegExp(`^${title.trim().replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\\\$&')}\\s*\\n+`, 'i');
        markdownContent = markdownContent.replace(titleRegex, '').trim();

        // Fetch section images and inject them into the markdown content
        const { data: blogImages } = await supabase
            .from("blog_images")
            .select("*")
            .eq("content_id", contentId)
            .eq("status", "completed");

        if (blogImages && blogImages.length > 0) {
            blogImages.filter((img: any) => img.image_type === 'section' && img.section_heading).forEach((img: any) => {
                // Find "## <section_heading>" (case-insensitive) and inject image markdown underneath
                const headingRegex = new RegExp(`(##\\s+${img.section_heading.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\\\$&')})`, 'i');
                markdownContent = markdownContent.replace(headingRegex, `$1\n\n![${img.section_heading}](${img.image_url})\n\n`);
            });
        }

        const htmlContent = marked.parse(markdownContent);

        // Use designated meta_description if it exists, otherwise extract from content
        let metaDescription = content.meta_description;

        if (!metaDescription) {
            const plainTextBlocks = markdownContent.replace(/[#*`~>-]+/g, '').split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 20);
            let plainText = plainTextBlocks.length > 0 ? plainTextBlocks[0] : title;
            if (plainText.toLowerCase().startsWith(title.toLowerCase())) {
                plainText = plainTextBlocks.length > 1 ? plainTextBlocks[1] : plainText;
            }
            metaDescription = plainText.length > 160 ? plainText.substring(0, 157) + "..." : plainText;
        }

        // 4. Publish to WordPress
        let cleanUrl = wpUrl.trim();
        if (cleanUrl.endsWith("/")) cleanUrl = cleanUrl.slice(0, -1);
        const authString = btoa(`${username}:${app_password}`);

        let featuredMediaId = undefined;
        if (content.featured_image_url) {
            try {
                console.log("Uploading featured image to WP...");
                const imgRes = await fetch(content.featured_image_url);
                if (imgRes.ok) {
                    const imgBlob = await imgRes.blob();
                    const mediaEndpoint = `${cleanUrl}/wp-json/wp/v2/media`;
                    const mediaRes = await fetch(mediaEndpoint, {
                        method: "POST",
                        headers: {
                            "Authorization": `Basic ${authString}`,
                            "Content-Disposition": `attachment; filename="${contentId}-featured.jpg"`,
                            "Content-Type": imgBlob.type || "image/jpeg"
                        },
                        body: imgBlob
                    });
                    if (mediaRes.ok) {
                        const mediaData = await mediaRes.json();
                        featuredMediaId = mediaData.id;
                        console.log("Uploaded featured image, ID:", featuredMediaId);
                    } else {
                        console.error("Failed to upload media:", await mediaRes.text());
                    }
                }
            } catch (imgUploadError) {
                console.error("Error uploading feature image:", imgUploadError);
            }
        }

        const endpoint = `${cleanUrl}/wp-json/wp/v2/posts`;
        console.log(`Publishing to ${endpoint}...`);

        const postPayload: any = {
            title: title || "Untitled Blog Post",
            content: htmlContent,
            excerpt: metaDescription, // Native WP Excerpt (SEO plugins fallback to this safely)
            status: publishStatus || "draft", // Publish as draft by default
        };

        if (categories && categories.length > 0) {
            postPayload.categories = categories;
        }

        if (authorId) {
            postPayload.author = authorId;
        }

        if (featuredMediaId) {
            postPayload.featured_media = featuredMediaId;
        }

        if (canonicalUrl) {
            postPayload.meta = {
                rank_math_canonical_url: canonicalUrl,
                _yoast_wpseo_canonical: canonicalUrl,
            };
        }

        const wpResponse = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${authString}`,
            },
            body: JSON.stringify(postPayload),
        });

        if (!wpResponse.ok) {
            const errorText = await wpResponse.text();
            console.error("WordPress API Error:", wpResponse.status, errorText);
            return new Response(JSON.stringify({ error: `WordPress API failed: ${wpResponse.status} - ${errorText.substring(0, 200)}` }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const wpData = await wpResponse.json();
        const publishedUrl = wpData.link;

        // 5. Update Content Item
        await supabase.from("content_items").update({
            status: "published", // Make sure this status helps
            published_url: publishedUrl
        }).eq("id", contentId);

        return new Response(JSON.stringify({ success: true, publishedUrl, wpId: wpData.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (e) {
        console.error("publish-to-wordpress error:", e);
        return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
            status: 200, // Return 200 so the client can read the JSON error message
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
