import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fallbackDna(brandName: string, brandTagline: string, brandDescription: string) {
  const hash = brandName.length * 13 + (brandTagline || "").length * 7 + (brandDescription || "").length;
  const palettes = [
    ["#0F172A", "#3B82F6", "#10B981", "#F59E0B", "#F8FAFC"], // Elegant Modern / Tech
    ["#1E1B4B", "#6366F1", "#8B5CF6", "#EC4899", "#F8FAFC"], // Vibrant Futuristic
    ["#064E3B", "#10B981", "#059669", "#D1FAE5", "#F0FDF4"], // Eco / Growth / Financial
    ["#450A0A", "#DC2626", "#F87171", "#FEE2E2", "#FEF2F2"], // Passion / Food / Bold
    ["#78350F", "#F59E0B", "#D97706", "#FEF3C7", "#FFFBEB"], // Warm / Resort / Cozy
  ];
  const styles = [
    "Minimalist & Clean",
    "Vibrant & Bold",
    "Professional & Corporate",
    "Dark & Futuristic",
    "Luxury & Elegant"
  ];
  
  const palette = palettes[hash % palettes.length];
  const brandStyle = styles[hash % styles.length];
  
  let industry = "General Marketing & Tech";
  const descLower = (brandDescription || "").toLowerCase();
  if (descLower.includes("resort") || descLower.includes("hotel") || descLower.includes("travel") || descLower.includes("safari")) {
    industry = "Luxury Hospitality & Tourism";
  } else if (descLower.includes("seo") || descLower.includes("marketing") || descLower.includes("saas") || descLower.includes("software")) {
    industry = "B2B SaaS & Digital Marketing";
  } else if (descLower.includes("finance") || descLower.includes("invest") || descLower.includes("crypto") || descLower.includes("money")) {
    industry = "FinTech & Financial Advisory";
  } else if (descLower.includes("health") || descLower.includes("fitness") || descLower.includes("food") || descLower.includes("gym")) {
    industry = "Wellness, Health & Lifestyle";
  }

  return {
    industry,
    brand_palette: palette,
    brand_style: brandStyle,
    rationale: `Derived based on the characteristics of ${brandName}. Harmonized colors selected to maximize audience trust and conversion rate for a ${brandStyle} aesthetic.`
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let brandName = "Wildlife Gir Resort";
  let brandTagline = "";
  let brandDescription = "";

  try {
    const body = await req.json();
    brandName = String(body.brandName || "Wildlife Gir Resort").trim();
    brandTagline = String(body.brandTagline || "").trim();
    brandDescription = String(body.brandDescription || "").trim();

    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    
    const promptSystem = `You are a world-class Brand Strategist and Identity Designer.
Analyze the provided brand information and extract its "Brand DNA".

REQUIRED OUTPUT (JSON ONLY):
{
  "industry": "Specific industry (e.g., Luxury Real Estate, B2B SaaS, Fitness Tech)",
  "brand_palette": ["List of 5 harmonious HEX codes that match the brand's personality"],
  "brand_style": "Visual style direction (e.g., Minimalist & Clean, Vibrant & Bold, Professional & Corporate, Dark & Futuristic, Luxury & Elegant)",
  "rationale": "Briefly explain the choice based on the brand description"
}

Guidelines for Palette:
- Use sophisticated, modern colors.
- Avoid generic high-saturation defaults unless it fits.
- Ensure at least one primary, one accent, and three supporting colors.`;

    const promptUser = `Brand: ${brandName}\nTagline: ${brandTagline}\nDescription: ${brandDescription}`;

    let generatedText = "";

    // 1. Try OpenRouter if key is available
    if (openrouterKey) {
      try {
        console.log("Calling OpenRouter for Brand DNA...");
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://solospider.ai",
            "X-Title": "Solospider AI",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: promptSystem },
              { role: "user", content: promptUser }
            ],
            response_format: { type: "json_object" }
          }),
        });

        if (response.ok) {
          const data = await response.json();
          generatedText = data.choices?.[0]?.message?.content || "";
        } else {
          console.warn("OpenRouter DNA request failed, status:", response.status);
        }
      } catch (err) {
        console.warn("OpenRouter DNA call failed:", err);
      }
    }

    // 2. Try Pollinations AI text endpoint fallback
    if (!generatedText) {
      try {
        console.log("Calling Pollinations AI for DNA Fallback...");
        const fullPrompt = `${promptSystem}\n\nInput Information:\n${promptUser}\n\nReturn ONLY the JSON string. Do not wrap in markdown code blocks.`;
        const encodedPrompt = encodeURIComponent(fullPrompt);
        const pollinationsUrl = `https://text.pollinations.ai/${encodedPrompt}?model=openai&json=true`;
        
        const res = await fetch(pollinationsUrl);
        if (res.ok) {
          generatedText = await res.text();
        }
      } catch (err) {
        console.warn("Pollinations AI DNA fallback failed:", err);
      }
    }

    // 3. Parse JSON or fall back to beautiful deterministic generator
    let finalDna;
    if (generatedText) {
      try {
        const cleanJson = generatedText
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();
        finalDna = JSON.parse(cleanJson);
        if (!finalDna.industry || !Array.isArray(finalDna.brand_palette) || !finalDna.brand_style) {
          throw new Error("Lacks mandatory DNA fields");
        }
      } catch (e) {
        console.warn("Parsing generated DNA JSON failed, using high-fidelity fallback:", e);
        finalDna = fallbackDna(brandName, brandTagline, brandDescription);
      }
    } else {
      finalDna = fallbackDna(brandName, brandTagline, brandDescription);
    }

    return new Response(JSON.stringify(finalDna), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Brand DNA Detection Failure, serving safe fallback:", message);
    const finalDna = fallbackDna(brandName, brandTagline, brandDescription);
    return new Response(JSON.stringify(finalDna), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
