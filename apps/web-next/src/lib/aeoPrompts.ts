import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type SeedPrompt = {
  topic: string;
  prompt: string;
  rationale: string;
  category: string;
};

const normalizeDomain = (raw: string) => {
  try {
    const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
    return new URL(withProtocol).hostname.replace(/^www\./, "");
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || raw;
  }
};

export const buildDefaultAeoPrompts = (brandName: string, domain: string): SeedPrompt[] => {
  const safeBrand = brandName?.trim() || "this brand";
  const safeDomain = normalizeDomain(domain || safeBrand);
  return [
    { topic: "Brand Overview", prompt: `What is ${safeBrand} and what problems does it solve for businesses?`, rationale: "Ensure baseline brand-intent prompt is always scanned.", category: "default" },
    { topic: "Best Alternatives", prompt: `What are the best alternatives to ${safeBrand} in 2026?`, rationale: "Tracks competitor comparison visibility.", category: "default" },
    { topic: "Pricing", prompt: `How does ${safeBrand} pricing compare with similar tools for growing teams?`, rationale: "Captures commercial evaluation intent.", category: "default" },
    { topic: "Use Cases", prompt: `Which industries get the most value from ${safeBrand}?`, rationale: "Measures topical authority across verticals.", category: "default" },
    { topic: "Credibility", prompt: `Is ${safeDomain} trustworthy and recommended for production workflows?`, rationale: "Captures trust and reputation queries.", category: "default" },
  ];
};

export const buildCompetitorComparePrompts = (brandName: string, domain: string): SeedPrompt[] => {
  const safeBrand = brandName?.trim() || "this brand";
  const safeDomain = normalizeDomain(domain || safeBrand);
  return [
    {
      topic: "Competitive AEO Workflow",
      prompt: `Compare ${safeBrand} vs sitefire.ai for AEO workflow depth, prompt scans, and execution speed.`,
      rationale: "Tracks direct competitor consideration in AI answers.",
      category: "competitor",
    },
    {
      topic: "Platform Comparison",
      prompt: `Compare ${safeBrand} vs higoodie.com for AEO workflow, scanning depth, and actionable insights.`,
      rationale: "Tracks buyer-intent comparison coverage.",
      category: "competitor",
    },
    {
      topic: "AI Search Visibility",
      prompt: `Compare ${safeBrand} vs scrunch.com for AI search visibility, citations, and referral intelligence.`,
      rationale: "Measures competitive position in referrals/citations narratives.",
      category: "competitor",
    },
    {
      topic: "Best Choice",
      prompt: `Which is better for AEO in 2026: ${safeBrand}, sitefire.ai, higoodie.com, or scrunch.com?`,
      rationale: "Captures direct recommendation outcomes.",
      category: "competitor",
    },
    {
      topic: "Trust and Fit",
      prompt: `Is ${safeDomain} more reliable than sitefire.ai for production-grade AI search optimization?`,
      rationale: "Assesses brand trust against known alternatives.",
      category: "competitor",
    },
  ];
};

export async function seedAeoPrompts(projectId: string, prompts: SeedPrompt[]) {
  const supabase = getSupabaseBrowserClient();
  const { data: existing, error: existingError } = await supabase
    .from("aeo_prompts" as any)
    .select("prompt")
    .eq("project_id", projectId);

  if (existingError) throw existingError;

  const seen = new Set((existing || []).map((r: any) => String(r.prompt || "").trim().toLowerCase()));
  const rows = prompts
    .filter((p) => !seen.has(p.prompt.trim().toLowerCase()))
    .map((p) => ({
      project_id: projectId,
      topic: p.topic,
      prompt: p.prompt,
      rationale: p.rationale,
      category: p.category,
      is_active: true,
    }));

  if (rows.length === 0) return { inserted: 0 };

  const { error: insertError } = await supabase.from("aeo_prompts" as any).insert(rows as any);
  if (insertError) throw insertError;
  return { inserted: rows.length };
}
