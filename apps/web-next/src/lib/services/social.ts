import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// ────────────────────────────────────────────────────────────────────────────
// Instagram Profile Scraper (public profiles via CORS proxy)
// ────────────────────────────────────────────────────────────────────────────

export interface InstagramProfile {
  handle: string;
  fullName: string;
  bio: string;
  profilePicUrl: string;
  followersCount: string;
  postsCount: string;
  isPrivate: boolean;
  recentCaptions: string[];
  recentHashtags: string[];
}

type InstagramUserData = {
  username?: string;
  full_name?: string;
  biography?: string;
  profile_pic_url_hd?: string;
  profile_pic_url?: string;
  edge_followed_by?: { count?: number };
  edge_owner_to_timeline_media?: { count?: number };
  is_private?: boolean;
};

function parseJsonObjectFromText(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    // continue to object-slice fallback
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;

  const objectSlice = cleaned.slice(firstBrace, lastBrace + 1);
  try {
    const parsed = JSON.parse(objectSlice);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    return null;
  }

  return null;
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w]+/g) || [];
  return [...new Set(matches)].slice(0, 30);
}

function cleanHandle(input: string): string {
  return input
    .replace(/https?:\/\/(www\.)?instagram\.com\/?/i, "")
    .replace(/\/$/, "")
    .replace(/@/g, "")
    .trim();
}

export async function fetchInstagramProfile(handleOrUrl: string): Promise<InstagramProfile> {
  const handle = cleanHandle(handleOrUrl);
  const url = `https://www.instagram.com/${handle}/`;

  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    const data = await res.json();
    const html: string = data.contents || "";

    // Try to extract JSON data embedded in the page
    let profileData: InstagramUserData = {};

    // Method 1: try _sharedData JSON
    const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.+?});<\/script>/);
    if (sharedDataMatch) {
      try {
        const parsed = JSON.parse(sharedDataMatch[1]);
        const user = parsed?.entry_data?.ProfilePage?.[0]?.graphql?.user;
        if (user) {
          profileData = user;
        }
      } catch (err) {
        console.warn("Failed to parse _sharedData payload", err);
      }
    }

    // Method 2: try __additionalDataLoaded JSON
    if (!profileData.username) {
      const additionalMatch = html.match(/"user":\s*({.+?"edge_followed_by".+?})/);
      if (additionalMatch) {
        try {
          profileData = JSON.parse(additionalMatch[1]);
        } catch (err) {
          console.warn("Failed to parse additional user payload", err);
        }
      }
    }

    let ogDesc = "";
    let ogImage = "";
    let ogTitle = "";
    let captions: string[] = [];

    if (typeof window !== "undefined") {
      // Extract meta tags as fallback
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const getMeta = (prop: string) =>
        doc.querySelector(`meta[property="${prop}"]`)?.getAttribute("content") ||
        doc.querySelector(`meta[name="${prop}"]`)?.getAttribute("content") ||
        "";

      ogDesc = getMeta("og:description");
      ogImage = getMeta("og:image");
      ogTitle = getMeta("og:title");
    }

    // Parse followers from description like "1.2M Followers, 500 Following, 320 Posts"
    const followersMatch = ogDesc.match(/([\d,.KMk]+)\s*Followers?/i);
    const postsMatch = ogDesc.match(/([\d,]+)\s*Posts?/i);

    // Extract captions from page scripts
    const captionMatches = html.match(/"text":"([^"]{10,300})"/g) || [];
    captions = captionMatches
      .map((m) => m.replace(/"text":"/, "").replace(/"$/, ""))
      .filter((c) => !c.startsWith("http") && c.length > 20)
      .slice(0, 10);

    const allHashtags = captions.flatMap(extractHashtags);

    return {
      handle,
      fullName: profileData.full_name || ogTitle?.split(" (@")[0] || handle,
      bio: profileData.biography || ogDesc || "",
      profilePicUrl: profileData.profile_pic_url_hd || profileData.profile_pic_url || ogImage || "",
      followersCount: profileData.edge_followed_by?.count?.toLocaleString() ||
        followersMatch?.[1] || "—",
      postsCount: profileData.edge_owner_to_timeline_media?.count?.toLocaleString() ||
        postsMatch?.[1] || "—",
      isPrivate: profileData.is_private || false,
      recentCaptions: captions,
      recentHashtags: [...new Set(allHashtags)].slice(0, 20),
    };
  } catch (e) {
    console.error("Instagram fetch error:", e);
    // Return minimal data if fetch fails
    return {
      handle,
      fullName: handle,
      bio: "",
      profilePicUrl: "",
      followersCount: "—",
      postsCount: "—",
      isPrivate: false,
      recentCaptions: [],
      recentHashtags: [],
    };
  }
}


// ────────────────────────────────────────────────────────────────────────────
// AI Post Idea Generator via Pollinations AI (free, no key required)
// ────────────────────────────────────────────────────────────────────────────

export interface PostIdea {
  id: string;
  type: "educational" | "promotional" | "engagement" | "story" | "product";
  caption: string;
  hashtags: string[];
  imagePrompt: string;
  hook: string;
}

export interface GeneratedSocialPost {
  hook: string;
  caption: string;
  hashtags: string[];
  imagePrompt: string;
}

function normalizeHashtags(hashtags: unknown): string[] {
  if (!Array.isArray(hashtags)) return [];
  return hashtags
    .map((tag) => String(tag).replace(/^#/, "").trim())
    .filter(Boolean)
    .slice(0, 30);
}

export async function generatePostIdeas(params: {
  brandName: string;
  brandDescription: string;
  instagramBio: string;
  recentCaptions: string[];
  recentHashtags: string[];
  niche?: string;
}): Promise<PostIdea[]> {
  const { brandName, brandDescription, instagramBio, recentCaptions, recentHashtags } = params;

  const prompt = `You are an expert Instagram content strategist. Generate 5 high-performing Instagram post ideas for this brand.

Brand: ${brandName}
Description: ${brandDescription || "Not provided"}
Instagram Bio: ${instagramBio || "Not provided"}
Recent Post Samples: ${recentCaptions.slice(0, 3).join(" | ") || "None"}
Common Hashtags: ${recentHashtags.slice(0, 10).join(", ") || "None"}

Return ONLY a valid JSON array with exactly 5 objects. Each object must have:
- "id": unique string like "idea_1"
- "type": one of "educational", "promotional", "engagement", "story", "product"
- "hook": a powerful opening line (max 15 words)
- "caption": full Instagram caption (150-300 chars, engaging, with emojis)
- "hashtags": array of 15-20 relevant hashtags (without # symbol)
- "imagePrompt": a detailed visual description for image generation (describe the scene, style, colors)

Make captions authentic, engaging, and platform-native. Mix the types across the 5 posts.`;

  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.functions.invoke("generate-social-post", {
      body: { action: "ideas", ...params },
    });

    if (error) throw error;
    if (data && Array.isArray(data)) {
      return data.map((idea, i) => ({
        id: String(idea.id || `idea_${i + 1}`),
        type: (idea.type || "educational") as PostIdea["type"],
        hook: String(idea.hook || ""),
        caption: String(idea.caption || ""),
        hashtags: normalizeHashtags(idea.hashtags),
        imagePrompt: String(idea.imagePrompt || idea.image_prompt || ""),
      }));
    }

    // Fallback to Pollinations if Edge Function doesn't return data
    const encodedPrompt = encodeURIComponent(prompt);
    const res = await fetch(
      `https://text.pollinations.ai/${encodedPrompt}?model=openai&json=true`,
      { method: "GET" }
    );
    const text = await res.text();

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found");

    const ideas: PostIdea[] = JSON.parse(jsonMatch[0]);
    return ideas.map((idea, i) => ({
      ...idea,
      id: idea.id || `idea_${i + 1}`,
    }));
  } catch (e) {
    console.error("AI generation error:", e);
    // Fallback ideas
    return [
      {
        id: "idea_1",
        type: "educational",
        hook: "Did you know this about your industry?",
        caption: `🧠 Here's something most people don't know about ${brandName}...\n\nWe believe in sharing knowledge that helps you grow. Drop a 💡 if this was helpful!`,
        hashtags: ["tips", "didyouknow", "knowledge", "growth", "business"],
        imagePrompt: `Clean, minimalist flat lay with text overlay, professional lighting, brand colors`,
      },
      {
        id: "idea_2",
        type: "engagement",
        hook: "Which one would you choose?",
        caption: `🤔 This or that? Tell us in the comments below!\n\nWe love hearing from our community. Your opinion matters to us 💬`,
        hashtags: ["poll", "community", "thisorthat", "engagement", "share"],
        imagePrompt: `Split image showing two contrasting options, vibrant colors, bold typography`,
      },
    ];
  }
}


// ────────────────────────────────────────────────────────────────────────────
// Image generation via Pollinations AI
// ────────────────────────────────────────────────────────────────────────────

export async function generatePollinationsImageUrl(prompt: string, width = 1080, height = 1080): Promise<string> {
  // Kept for backward compatibility with callers; now routed to edge/OpenRouter image generation.
  void width;
  void height;
  return generateHighQualityImage(prompt);
}

export async function generateHighQualityImage(
  prompt: string, 
  projectId?: string, 
  platform?: string, 
  addLogo?: boolean,
  brandName?: string,
  logoUrl?: string
): Promise<string> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.functions.invoke("generate-social-post", {
      body: { 
        type: "image", 
        prompt, 
        projectId, 
        platform, 
        addLogo,
        brandName,
        logoUrl
      },
    });

    if (!error && data && data.imageUrl) {
      return data.imageUrl;
    }
    
    const message = (error as any)?.message || "Edge function returned no image URL.";
    throw new Error(message);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edge function invocation failed.";
    throw new Error(`Image generation failed via Supabase Edge: ${message}`);
  }
}

export async function generateSocialPostDraft(params: {
  brandName: string;
  brandDescription?: string;
  platform?: "instagram";
  goal?: string;
  tone?: string;
  prompt?: string;
  includeHashtags?: boolean;
}): Promise<GeneratedSocialPost> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.functions.invoke("generate-social-post", {
      body: {
        action: "single_post",
        platform: params.platform || "instagram",
        brandName: params.brandName,
        brandDescription: params.brandDescription || "",
        goal: params.goal || "",
        tone: params.tone || "engaging",
        prompt: params.prompt || "",
        includeHashtags: params.includeHashtags ?? true,
      },
    });

    if (!error && data && typeof data === "object") {
      return {
        hook: String(data.hook || ""),
        caption: String(data.caption || ""),
        hashtags: normalizeHashtags(data.hashtags),
        imagePrompt: String(data.imagePrompt || data.image_prompt || params.prompt || ""),
      };
    }
    
    console.warn("Edge function call failed, using static local fallback draft:", error);
  } catch (e) {
    console.warn("Edge function invocation exception, using static local fallback draft:", e);
  }

  // Final absolute fallback (edge unavailable/misconfigured)
  return {
    hook: `Welcome to ${params.brandName}`,
    caption: `Discover the difference with ${params.brandName}. We're dedicated to delivering the best solutions for our community! 🌟`,
    hashtags: ["innovation", "excellence", "branding", "community"],
    imagePrompt: params.prompt || "Vibrant office workspace illustration"
  };
}
