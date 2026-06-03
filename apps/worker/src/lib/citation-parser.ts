// ── Brand citation parser ───────────────────────────────────────────────────
// Extracts position, context, sentiment and count of brand mentions
// from an AI model response.

export interface CitationResult {
  brandMentioned:       boolean;
  mentionPosition:      number | null;   // 1-indexed sentence number
  mentionContext:       string | null;   // first sentence containing brand
  mentionSentiment:     "positive" | "negative" | "neutral" | "not_mentioned";
  mentionCount:         number;
  competitorsMentioned: string[];
}

const POSITIVE_WORDS = [
  "best", "top", "recommended", "excellent", "great", "leading",
  "trusted", "popular", "powerful", "innovative", "perfect", "outstanding",
  "industry-leading", "robust", "reliable", "comprehensive", "superior",
];

const NEGATIVE_WORDS = [
  "avoid", "bad", "poor", "limited", "expensive", "problematic",
  "disappointing", "worst", "lacking", "buggy", "unreliable", "complex",
];

export function parseCitations(
  responseText: string,
  brandName: string,
  competitors: string[] = []
): CitationResult {
  if (!responseText || !brandName) {
    return {
      brandMentioned: false, mentionPosition: null, mentionContext: null,
      mentionSentiment: "not_mentioned", mentionCount: 0, competitorsMentioned: [],
    };
  }

  const lower        = responseText.toLowerCase();
  const brandLower   = brandName.toLowerCase();
  const escapedBrand = brandLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const brandRegex   = new RegExp(escapedBrand, "g");

  const mentionCount   = (lower.match(brandRegex) ?? []).length;
  const brandMentioned = mentionCount > 0;

  let mentionPosition: number | null = null;
  let mentionContext:  string | null  = null;

  if (brandMentioned) {
    // Split into sentences (handles . ! ? followed by whitespace or end)
    const sentences = responseText.split(/(?<=[.!?])\s+|(?<=[.!?])$/);
    for (let i = 0; i < sentences.length; i++) {
      if (sentences[i].toLowerCase().includes(brandLower)) {
        mentionPosition = i + 1;
        mentionContext  = sentences[i].trim().slice(0, 500);
        break;
      }
    }
  }

  // Sentiment scoring on the context window (50 words around first mention)
  let mentionSentiment: CitationResult["mentionSentiment"] = "not_mentioned";
  if (brandMentioned) {
    const ctx = (mentionContext ?? lower).toLowerCase();
    const posScore = POSITIVE_WORDS.filter(w => ctx.includes(w)).length;
    const negScore = NEGATIVE_WORDS.filter(w => ctx.includes(w)).length;
    if (posScore > negScore) mentionSentiment = "positive";
    else if (negScore > posScore) mentionSentiment = "negative";
    else mentionSentiment = "neutral";
  }

  // Which competitors are mentioned?
  const competitorsMentioned = competitors.filter(c =>
    c && lower.includes(c.toLowerCase())
  );

  return {
    brandMentioned,
    mentionPosition,
    mentionContext,
    mentionSentiment,
    mentionCount,
    competitorsMentioned,
  };
}
