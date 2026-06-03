import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Model → OpenRouter model ID mapping ─────────────────────────────────────
const MODEL_MAP: Record<string, string> = {
  chatgpt:   "openai/gpt-4o-mini",
  gemini:    "google/gemini-2.0-flash-001",
  claude:    "anthropic/claude-3-haiku",
  perplexity:"perplexity/sonar", // has web access!
  grok:      "x-ai/grok-3-mini-beta",
  deepseek:  "deepseek/deepseek-chat",
};

// ─── Citation Parser ──────────────────────────────────────────────────────────
function parseCitations(
  responseText: string,
  brandName: string,
  competitors: string[]
): {
  brandMentioned: boolean;
  mentionPosition: number | null;
  mentionContext: string | null;
  mentionSentiment: string;
  mentionCount: number;
  competitorsMentioned: string[];
} {
  const lower = responseText.toLowerCase();
  const brandLower = brandName.toLowerCase();

  // Count all brand mentions
  const mentionCount = (lower.match(new RegExp(brandLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  const brandMentioned = mentionCount > 0;

  // Find first mention position (which sentence)
  let mentionPosition: number | null = null;
  let mentionContext: string | null = null;

  if (brandMentioned) {
    // Split into sentences
    const sentences = responseText.split(/(?<=[.!?])\s+/);
    for (let i = 0; i < sentences.length; i++) {
      if (sentences[i].toLowerCase().includes(brandLower)) {
        mentionPosition = i + 1; // 1-indexed
        mentionContext = sentences[i].trim().slice(0, 400);
        break;
      }
    }
  }

  // Sentiment detection (simple keyword scoring)
  let mentionSentiment = "not_mentioned";
  if (brandMentioned) {
    const positiveWords = ["best", "top", "recommended", "excellent", "great", "leading", "trusted", "popular", "powerful", "innovative", "perfect"];
    const negativeWords = ["avoid", "bad", "poor", "limited", "expensive", "problematic", "disappointing", "worst", "lacking", "buggy"];
    const ctx = mentionContext?.toLowerCase() || lower;
    const posScore = positiveWords.filter(w => ctx.includes(w)).length;
    const negScore = negativeWords.filter(w => ctx.includes(w)).length;
    if (posScore > negScore) mentionSentiment = "positive";
    else if (negScore > posScore) mentionSentiment = "negative";
    else mentionSentiment = "neutral";
  }

  // Which competitors are mentioned?
  const competitorsMentioned = competitors.filter(c =>
    lower.includes(c.toLowerCase())
  );

  return { brandMentioned, mentionPosition, mentionContext, mentionSentiment, mentionCount, competitorsMentioned };
}

// ─── Query a single AI model via OpenRouter ───────────────────────────────────
async function queryModel(
  openrouterKey: string,
  modelId: string,
  promptText: string,
  brandName: string
): Promise<{ text: string; latencyMs: number }> {
  const start = Date.now();

  const systemPrompt = `You are a helpful assistant. Answer the following question naturally and comprehensively. If you know of any products, tools, services, or brands that are relevant to the question, mention them by name. Be specific and mention actual company/product names where relevant.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openrouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://solospider.ai",
      "X-Title": "SoloSpider AEO Prompt Scanner",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: promptText },
      ],
      max_tokens: 800,
      temperature: 0.3, // lower temp = more consistent/factual
    }),
  });

  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter ${modelId} returned ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return { text, latencyMs };
}

// ─── Fanout Generator ─────────────────────────────────────────────────────────
// Calls GPT-4o-mini once per source prompt to generate 3 related sub-queries,
// then inserts them into query_fanouts.  Fire-and-forget — errors are swallowed.
async function generateFanouts(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  openrouterKey: string,
  projectId: string,
  runId: string,
  sourcePrompt: string,
  brandName: string,
): Promise<void> {
  const systemPrompt = `You are a search-intent analyst specialising in generative/conversational AI search engines.
Expand a given brand research query into 3 related sub-queries an AI search engine would likely generate.
Return ONLY a valid JSON array of exactly 3 objects with keys:
- "branch_query": string (max 120 chars)
- "intent": one of informational|commercial|navigational|transactional|comparison
- "score": number 0.0–1.0
No markdown, no prose, only the JSON array.`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://solospider.ai",
        "X-Title": "SoloSpider FanoutGenerator",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Original query: "${sourcePrompt}"\nBrand context: ${brandName}` },
        ],
        max_tokens: 400,
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) return;

    const data = await res.json();
    const rawText: string = data?.choices?.[0]?.message?.content ?? "";
    const cleaned = rawText.replace(/```json|```/gi, "").trim();
    const parsed = JSON.parse(cleaned);
    const items: Array<{ branch_query: string; intent: string; score: number }> =
      Array.isArray(parsed) ? parsed : (Array.isArray(parsed.fanouts) ? parsed.fanouts :
      (Object.values(parsed).find(v => Array.isArray(v)) as typeof items ?? []));

    if (!items.length) return;

    const rows = items
      .filter(f => f && typeof f.branch_query === "string" && f.branch_query.trim())
      .slice(0, 5)
      .map(f => ({
        project_id:   projectId,
        root_query:   sourcePrompt,
        branch_query: f.branch_query.trim().slice(0, 500),
        engine:       "openai/gpt-4o-mini",
        intent:       typeof f.intent === "string" ? f.intent.trim() : "informational",
        score:        typeof f.score === "number" ? Math.min(1, Math.max(0, f.score)) : 0.5,
        metadata:     { run_id: runId, brand: brandName, source: "prompt_scan_edge" },
      }));

    if (rows.length) {
      await supabase.from("query_fanouts").insert(rows);
    }
  } catch (e) {
    console.warn(`generateFanouts error: ${e}`);
  }
}

// ─── Gap Detector ─────────────────────────────────────────────────────────────
// After the scan run completes, reads brand-miss results, clusters by prompt,
// generates AI content briefs, and upserts into aeo_content_gaps.
async function persistGapsForRun(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  openrouterKey: string,
  projectId: string,
  runId: string,
  brandName: string,
): Promise<number> {
  const { data: results, error } = await supabase
    .from("prompt_scan_results")
    .select("prompt_text, model, brand_mentioned, competitors_mentioned")
    .eq("project_id", projectId)
    .eq("status", "success")
    .eq("brand_mentioned", false)
    .not("competitors_mentioned", "eq", "{}");

  if (error || !results || results.length === 0) return 0;

  // Cluster by prompt_text
  const clusterMap = new Map<string, { competitors: Set<string>; models: Set<string>; missCount: number }>();
  for (const row of results) {
    const comps: string[] = Array.isArray(row.competitors_mentioned) ? row.competitors_mentioned : [];
    if (!comps.length) continue;
    const cur = clusterMap.get(row.prompt_text) ?? { competitors: new Set<string>(), models: new Set<string>(), missCount: 0 };
    comps.forEach(c => cur.competitors.add(c));
    cur.models.add(row.model);
    cur.missCount += 1;
    clusterMap.set(row.prompt_text, cur);
  }

  let upserted = 0;
  for (const [promptText, cluster] of clusterMap.entries()) {
    const score = Math.min(100, cluster.competitors.size * 25 + cluster.models.size * 20);
    const priority = score > 70 ? "high" : score > 40 ? "medium" : "low";
    const topic = promptText.replace(/^(what|which|how|why|is|compare|does|can)\s+/i, "").split("?")[0].trim().slice(0, 80);
    const competitors = Array.from(cluster.competitors);
    const models = Array.from(cluster.models);

    // Check if crawled page covers this topic
    const keywords = promptText.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4).slice(0, 5);
    let contentExists = false;
    if (keywords.length) {
      const filters = keywords.map((k: string) => `title.ilike.%${k}%,url.ilike.%${k}%`).join(",");
      const { data: pages } = await supabase.from("crawled_pages").select("id").eq("project_id", projectId).or(filters).limit(1);
      contentExists = Boolean(pages && pages.length > 0);
    }

    // Generate brief via LLM (best-effort, fall back to template)
    let briefTitle = promptText.replace(/^compare\s+/i, "The Ultimate Guide to ").replace(/\bvs\b/gi, "and").replace(/^which is better for\s+/i, "Why You Should Choose ").trim().slice(0, 120);
    let briefOutline: Array<{ h2: string; keyPoints: string[] }> = [
      { h2: "Why conversational AI engines favour structured authority", keyPoints: ["Cite specific benchmarks", "Link to primary research"] },
      { h2: `${brandName} vs the competition — feature comparison`, keyPoints: ["Visual comparison matrix", "Unique differentiators"] },
      { h2: "AEO implementation guide", keyPoints: ["Add FAQPage JSON-LD schema", "Answer-first H2 structure"] },
    ];

    if (openrouterKey) {
      try {
        const briefRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://solospider.ai",
            "X-Title": "SoloSpider GapDetector",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [
              { role: "system", content: `You are an AEO content strategist. Generate a content brief for a brand that was absent from AI search results. Return ONLY JSON: {"title":"<max 90 chars>","outline":[{"h2":"<heading>","keyPoints":["<p1>","<p2>"]}]}` },
              { role: "user", content: `Brand: ${brandName}\nCompetitors cited: ${competitors.join(", ")}\nGap query: "${promptText}"` },
            ],
            max_tokens: 500,
            temperature: 0.4,
            response_format: { type: "json_object" },
          }),
        });
        if (briefRes.ok) {
          const bd = await briefRes.json();
          const raw = bd?.choices?.[0]?.message?.content ?? "";
          const bp = JSON.parse(raw.replace(/```json|```/gi, "").trim());
          if (typeof bp.title === "string" && Array.isArray(bp.outline) && bp.outline.length) {
            briefTitle = bp.title;
            briefOutline = bp.outline;
          }
        }
      } catch { /* use template fallback */ }
    }

    const { error: upsertErr } = await supabase.from("aeo_content_gaps").upsert({
      project_id:       projectId,
      prompt_text:      promptText,
      topic,
      competitors,
      models,
      score,
      priority,
      content_exists:   contentExists,
      brief_title:      briefTitle,
      brief_outline:    briefOutline,
      scan_run_id:      runId,
      miss_count:       cluster.missCount,
      last_detected_at: new Date().toISOString(),
    }, { onConflict: "project_id,prompt_text" });

    if (!upsertErr) upserted++;
  }

  return upserted;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  const supabase    = createClient(supabaseUrl, serviceKey);

  if (!openrouterKey) {
    return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const projectId  = String(body.project_id || "").trim();
    const brandName  = String(body.brand_name || "").trim();
    const requestedModels = Array.isArray(body.models) ? body.models : ["chatgpt", "gemini", "perplexity", "claude"];
    const competitors = Array.isArray(body.competitors) ? body.competitors : [];
    // Optional: specific prompt IDs to run, or run all active prompts
    const promptIds: string[] | null = Array.isArray(body.prompt_ids) ? body.prompt_ids : null;
    const maxOpsRequested = Number.isFinite(Number(body.max_ops)) ? Number(body.max_ops) : 24;
    const maxOps = Math.max(4, Math.min(60, maxOpsRequested));

    if (!projectId || !brandName) {
      throw new Error("project_id and brand_name are required");
    }

    // ── 1. Load prompts from DB ───────────────────────────────────────────────
    let promptQuery = supabase
      .from("aeo_prompts")
      .select("id, prompt, topic")
      .eq("project_id", projectId)
      .eq("is_active", true);

    if (promptIds && promptIds.length > 0) {
      promptQuery = promptQuery.in("id", promptIds);
    }

    const { data: allPrompts, error: promptsErr } = await promptQuery.limit(20);
    if (promptsErr) throw promptsErr;

    if (!allPrompts || allPrompts.length === 0) {
      throw new Error("No active prompts found for this project. Add prompts in the Prompt Lab tab first.");
    }

    // Keep invocation within stable compute bounds to avoid Edge worker resource limits.
    const validModels = requestedModels.filter((m: string) => Boolean(MODEL_MAP[m]));
    const models = (validModels.length ? validModels : ["chatgpt", "gemini", "perplexity", "claude"]).slice(0, 4);
    const maxPromptCount = Math.max(1, Math.floor(maxOps / Math.max(models.length, 1)));
    const prompts = allPrompts.slice(0, maxPromptCount);

    // ── 2. Create scan run record ─────────────────────────────────────────────
    const totalOps = prompts.length * models.length;
    const { data: runRow, error: runErr } = await supabase
      .from("prompt_scan_runs")
      .insert({
        project_id: projectId,
        brand_name: brandName,
        models,
        status: "running",
        total_prompts: totalOps,
        completed: 0,
      })
      .select("id")
      .single();
    if (runErr) throw runErr;
    const runId = runRow.id as string;

    console.log(`Scan run ${runId}: ${prompts.length} prompts × ${models.length} models = ${totalOps} queries (max_ops=${maxOps})`);

    // ── 3. Run each prompt × model combination ────────────────────────────────
    let completed = 0;
    let brandMentionedCount = 0;
    // Track prompts we've already scheduled a fanout call for (once per prompt, not per model)
    const fanoutsDone = new Set<string>();

    for (const prompt of prompts) {
      for (const modelKey of models) {
        const openrouterModelId = MODEL_MAP[modelKey];
        if (!openrouterModelId) {
          console.warn(`Unknown model key: ${modelKey}, skipping`);
          continue;
        }

        let responseText = "";
        let latencyMs = 0;
        let status = "success";
        let errorMessage: string | null = null;

        try {
          console.log(`Querying ${modelKey} (${openrouterModelId}) with: "${prompt.prompt.slice(0, 80)}..."`);
          const result = await queryModel(openrouterKey, openrouterModelId, prompt.prompt, brandName);
          responseText = result.text;
          latencyMs = result.latencyMs;
        } catch (e: unknown) {
          status = "error";
          errorMessage = e instanceof Error ? e.message : String(e);
          console.error(`Model ${modelKey} error:`, errorMessage);
        }

        // Parse citations from the response
        const citations = parseCitations(responseText, brandName, competitors);
        if (citations.brandMentioned) brandMentionedCount++;

        // Save result to DB
        const { error: insertErr } = await supabase.from("prompt_scan_results").insert({
          project_id:           projectId,
          prompt_id:            prompt.id,
          prompt_text:          prompt.prompt,
          model:                modelKey,
          response_text:        responseText,
          brand_mentioned:      citations.brandMentioned,
          mention_position:     citations.mentionPosition,
          mention_context:      citations.mentionContext,
          mention_sentiment:    citations.mentionSentiment,
          mention_count:        citations.mentionCount,
          competitors_mentioned: citations.competitorsMentioned,
          status,
          error_message:        errorMessage,
          latency_ms:           latencyMs,
        });
        if (insertErr) console.warn("Insert error:", insertErr.message);

        // Also upsert into aeo_citations table (the existing one) for backward compat
        if (citations.brandMentioned) {
          await supabase.from("aeo_citations").insert({
            project_id:    projectId,
            provider:      modelKey,
            query:         prompt.prompt,
            cited_title:   brandName,
            position:      citations.mentionPosition,
            metadata: {
              context:     citations.mentionContext,
              sentiment:   citations.mentionSentiment,
              source:      "prompt_scan",
              run_id:      runId,
            },
          }).then(() => {});
        }

        completed++;
        // Update progress on run
        await supabase
          .from("prompt_scan_runs")
          .update({ completed, brand_mentioned_count: brandMentionedCount })
          .eq("id", runId);

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 200));
      }

      // ── Fanout generation — once per prompt, non-blocking ─────────────────
      if (!fanoutsDone.has(prompt.id)) {
        fanoutsDone.add(prompt.id);
        generateFanouts(supabase, openrouterKey, projectId, runId, prompt.prompt, brandName)
          .catch(e => console.warn(`Fanout generation silently failed: ${e?.message}`));
      }
    }

    // ── 4. Mark run complete ───────────────────────────────────────────────────
    await supabase
      .from("prompt_scan_runs")
      .update({
        status: "done",
        completed,
        brand_mentioned_count: brandMentionedCount,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    // ── 5. Persist gap analysis briefs ────────────────────────────────────────
    const gapsUpserted = await persistGapsForRun(supabase, openrouterKey, projectId, runId, brandName)
      .catch(e => { console.warn(`Gap persistence silently failed: ${e?.message}`); return 0; });

    // ── 6. Return summary ──────────────────────────────────────────────────────
    const mentionRate = totalOps > 0 ? Math.round((brandMentionedCount / completed) * 100) : 0;

    return new Response(JSON.stringify({
      ok: true,
      run_id: runId,
      prompts_scanned: prompts.length,
      models_scanned: models.length,
      total_queries: completed,
      brand_mentioned: brandMentionedCount,
      mention_rate_pct: mentionRate,
      gaps_upserted: gapsUpserted,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("run-prompt-scan fatal error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
