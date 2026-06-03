import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fallbackTitle(keyword: string): string {
  const cleanKeyword = keyword.trim().replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  return `The Ultimate Guide to ${cleanKeyword}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let keyword = "";
  try {
    const body = await req.json();
    keyword = String(body.keyword || "").trim();
    if (!keyword) {
      return new Response(JSON.stringify({ error: "Missing keyword" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const prompt = `Create an SEO title for the keyword: "${keyword}".
STRICT RULES:
- MUST contain the exact keyword "${keyword}" once
- Length: STRICTLY 50-65 characters
- Word count: 6-12 words
- MUST be formatted in strict Title Case (e.g., "The Quick Brown Fox Jumps Over the Lazy Dog")
- Use simple, everyday words only
- Make it specific and valuable (e.g. "How to...", "Why...", "Best...")
- No clickbait, no all-caps, no complex words
- Return ONLY the title text, nothing else, no quotes.`;

    let title = "";

    // 1. Try OpenRouter if key is available
    if (openrouterKey) {
      try {
        console.log("Calling OpenRouter for SEO Title...");
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
            messages: [{ role: "user", content: prompt }],
            max_tokens: 100,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          title = data.choices?.[0]?.message?.content || "";
        } else {
          console.warn("OpenRouter SEO Title failed, status:", response.status);
        }
      } catch (err) {
        console.warn("OpenRouter SEO Title call failed:", err);
      }
    }

    // 2. Try Pollinations AI text endpoint fallback
    if (!title) {
      try {
        console.log("Calling Pollinations AI for SEO Title Fallback...");
        const encodedPrompt = encodeURIComponent(`${prompt}\nReturn ONLY the plain title text.`);
        const pollinationsUrl = `https://text.pollinations.ai/${encodedPrompt}?model=openai`;
        
        const res = await fetch(pollinationsUrl);
        if (res.ok) {
          title = await res.text();
        }
      } catch (err) {
        console.warn("Pollinations AI SEO Title fallback failed:", err);
      }
    }

    // 3. Process or fall back programmatically
    if (title) {
      title = title.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^["']|["']$/g, "").trim();
      title = title.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    } else {
      title = fallbackTitle(keyword);
    }

    return new Response(JSON.stringify({ title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("SEO Title Generation critical error, serving safe fallback:", message);
    const title = fallbackTitle(keyword || "Search Optimization");
    return new Response(JSON.stringify({ title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
