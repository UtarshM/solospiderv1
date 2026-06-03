import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    let dbContentId = "";
    let originalText = "";
    let supabaseUrl = "";
    let supabaseKey = "";

    try {
        const authHeader = req.headers.get("Authorization");
        supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");

        // Verify user auth
        const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
            global: { headers: { Authorization: authHeader || "" } },
        });
        const { data: { user }, error: userError } = await anonClient.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { contentId, prompt } = await req.json();
        if (!contentId || !prompt) {
            return new Response(JSON.stringify({ error: "Missing contentId or prompt" }), {
                status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        dbContentId = contentId;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch the content
        const { data: content, error: fetchError } = await supabase
            .from("content_items")
            .select("generated_content, user_id")
            .eq("id", contentId)
            .eq("user_id", user.id)
            .single();

        if (fetchError || !content) {
            return new Response(JSON.stringify({ error: "Content not found" }), {
                status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        originalText = content.generated_content || "";
        let refinedContent = "";

        const systemMessage = "You are a content editor. The user will give you blog content and an editing instruction. Apply the instruction to the content and return the FULL modified content. Keep all markdown formatting, headings, bold text, and structure exactly the same. Only change what the user asks you to change. Return ONLY the modified content, nothing else. No explanations, no preamble.";
        const userMessage = `Here is the blog content:\n\n---\n${originalText}\n---\n\nApply this edit: ${prompt}\n\nReturn the full modified content with the edit applied. Keep all formatting intact.`;

        // 1. Try OpenRouter if key is available
        if (openrouterKey) {
          try {
            console.log("Calling OpenRouter to refine content...");
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${openrouterKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://solospider.ai",
                    "X-Title": "SoloSpider",
                },
                body: JSON.stringify({
                    model: "google/gemini-2.5-flash",
                    messages: [
                        { role: "system", content: systemMessage },
                        { role: "user", content: userMessage },
                    ],
                    max_tokens: 4000,
                    temperature: 0.3,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                refinedContent = data.choices?.[0]?.message?.content || "";
            } else {
                console.warn("OpenRouter refine request failed, status:", response.status);
            }
          } catch (err) {
              console.warn("OpenRouter refine call failed:", err);
          }
        }

        // 2. Try Pollinations AI text endpoint fallback
        if (!refinedContent) {
          try {
            console.log("Calling Pollinations AI for content refine fallback...");
            const fullPrompt = `${systemMessage}\n\nInput Content:\n${userMessage}\n\nReturn ONLY the modified content text. Do not wrap in markdown code blocks.`;
            const encodedPrompt = encodeURIComponent(fullPrompt);
            const pollinationsUrl = `https://text.pollinations.ai/${encodedPrompt}?model=openai`;
            
            const res = await fetch(pollinationsUrl);
            if (res.ok) {
              refinedContent = await res.text();
            }
          } catch (err) {
              console.warn("Pollinations AI content refine fallback failed:", err);
          }
        }

        // 3. Fallback or process
        let cleaned = "";
        if (refinedContent) {
            cleaned = refinedContent.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        } else {
            cleaned = originalText; // Safe absolute fallback
        }

        // Update the content in the database
        const { error: updateError } = await supabase
            .from("content_items")
            .update({ generated_content: cleaned })
            .eq("id", contentId);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ success: true, content: cleaned }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unknown error";
        console.error("Refine content critical error, serving original fallback:", message);
        
        // Try to return the original unchanged text if possible
        const cleaned = originalText || "";
        if (dbContentId && supabaseUrl && supabaseKey && cleaned) {
            try {
                const supabase = createClient(supabaseUrl, supabaseKey);
                await supabase
                    .from("content_items")
                    .update({ generated_content: cleaned })
                    .eq("id", dbContentId);
            } catch (_) {}
        }

        return new Response(JSON.stringify({ success: false, error: message, content: cleaned }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
