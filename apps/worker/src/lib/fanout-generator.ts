// ── Fanout Generator ──────────────────────────────────────────────────────────
// Given a source prompt, uses a fast/cheap LLM call to generate 3 related
// sub-queries that an AI engine might expand to when answering the original.
// Results are persisted to the query_fanouts table.
//
// This keeps the main scan loop clean — call generateFanouts() once per
// unique prompt (not per model), fire-and-forget, errors are logged but
// never allowed to fail the parent scan job.

import { env } from "../config.js";
import { supabase } from "./supabase.js";

const BASE_URL = "https://openrouter.ai/api/v1";

// Use the cheapest/fastest model for fanout generation — no need for quality here
const FANOUT_MODEL = "openai/gpt-4o-mini";

interface FanoutRow {
  project_id: string;
  root_query: string;
  branch_query: string;
  engine: string;
  intent: string;
  score: number;
  metadata: Record<string, unknown>;
}

/**
 * Calls the LLM once per source prompt to expand it into related sub-queries,
 * then bulk-inserts them into query_fanouts.
 *
 * Idempotent: rows are inserted with ignoreDuplicates = true so re-runs do not
 * create duplicates (requires a unique index on project_id + root_query + branch_query).
 */
export async function generateFanouts(
  projectId: string,
  runId: string,
  sourcePrompt: string,
  brandName: string,
): Promise<void> {
  if (!env.OPENROUTER_API_KEY) {
    console.warn("[FanoutGenerator] OPENROUTER_API_KEY not set, skipping fanout generation");
    return;
  }

  const systemPrompt = `You are a search-intent analyst specialising in generative/conversational AI search engines.
Your job is to expand a given brand research query into 3 related sub-queries that an AI search engine would
likely generate or consider when answering the original question.

Return ONLY a valid JSON array of exactly 3 objects. Each object must have:
- "branch_query": string  — the related sub-query (max 120 chars)
- "intent":       string  — one of: informational | commercial | navigational | transactional | comparison
- "score":        number  — relevance score 0.0–1.0 (how likely an AI engine surfaces this as a follow-up)

No markdown, no prose, only the JSON array.`;

  const userPrompt = `Original query: "${sourcePrompt}"\nBrand context: ${brandName}`;

  let rawText = "";
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://solospider.ai",
        "X-Title": "SoloSpider FanoutGenerator",
      },
      body: JSON.stringify({
        model: FANOUT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 400,
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter ${FANOUT_MODEL} → ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    rawText = data?.choices?.[0]?.message?.content ?? "";
  } catch (e) {
    console.warn(`[FanoutGenerator] API error for "${sourcePrompt.slice(0, 60)}": ${e}`);
    return;
  }

  // Parse — tolerate both array root and {fanouts:[]} wrapper shapes
  let parsed: Array<{ branch_query: string; intent: string; score: number }> = [];
  try {
    const cleaned = rawText.replace(/```json|```/gi, "").trim();
    const obj = JSON.parse(cleaned);
    if (Array.isArray(obj)) {
      parsed = obj;
    } else if (Array.isArray(obj.fanouts)) {
      parsed = obj.fanouts;
    } else {
      // Try any array value in the object
      const arrayVal = Object.values(obj).find(v => Array.isArray(v));
      if (arrayVal) parsed = arrayVal as typeof parsed;
    }
  } catch (e) {
    console.warn(`[FanoutGenerator] JSON parse failed for "${sourcePrompt.slice(0, 60)}": ${e}`);
    return;
  }

  if (!parsed.length) {
    console.warn(`[FanoutGenerator] Empty fanouts returned for "${sourcePrompt.slice(0, 60)}"`);
    return;
  }

  const rows: FanoutRow[] = parsed
    .filter(f => f && typeof f.branch_query === "string" && f.branch_query.trim())
    .slice(0, 5) // safety cap
    .map(f => ({
      project_id:   projectId,
      root_query:   sourcePrompt,
      branch_query: f.branch_query.trim().slice(0, 500),
      engine:       "openai/gpt-4o-mini",
      intent:       typeof f.intent === "string" ? f.intent.trim() : "informational",
      score:        typeof f.score === "number" ? Math.min(1, Math.max(0, f.score)) : 0.5,
      metadata: {
        run_id:    runId,
        brand:     brandName,
        source:    "prompt_scan_worker",
      },
    }));

  if (!rows.length) return;

  const { error } = await supabase
    .from("query_fanouts")
    .insert(rows as any, { ignoreDuplicates: true } as any);

  if (error) {
    console.warn(`[FanoutGenerator] Insert error: ${error.message}`);
  } else {
    console.log(`[FanoutGenerator] Saved ${rows.length} fanouts for "${sourcePrompt.slice(0, 60)}..."`);
  }
}
