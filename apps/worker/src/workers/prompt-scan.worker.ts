import { Worker, Job } from "bullmq";
import { redis } from "../config.js";
import { supabase } from "../lib/supabase.js";
import { queryModel, MODEL_MAP } from "../lib/openrouter.js";
import { parseCitations } from "../lib/citation-parser.js";
import { generateFanouts } from "../lib/fanout-generator.js";
import { persistGapsForRun } from "../lib/gap-detector.js";
import type { PromptScanJobData } from "../queues.js";

async function processPromptScanJob(job: Job<PromptScanJobData>): Promise<object> {
  const {
    project_id, brand_name,
    models = ["chatgpt", "gemini", "perplexity", "claude"],
    competitors = [],
    prompt_ids = null,
    run_id,
  } = job.data;

  console.log(`[PromptScanWorker] Job ${job.id} — project=${project_id} models=${models.join(",")}`);

  // ── 1. Load prompts ─────────────────────────────────────────────────────────
  let query = supabase
    .from("aeo_prompts")
    .select("id, prompt, topic")
    .eq("project_id", project_id)
    .eq("is_active", true);

  if (prompt_ids && prompt_ids.length > 0) query = query.in("id", prompt_ids);

  const { data: prompts, error: promptsErr } = await query.limit(20);
  if (promptsErr) throw promptsErr;
  if (!prompts || prompts.length === 0) {
    throw new Error("No active prompts found. Add prompts in the Prompt Lab tab first.");
  }

  const totalOps = prompts.length * models.length;

  // ── 2. Create or reuse scan_run record ──────────────────────────────────────
  let runId = run_id;
  if (!runId) {
    const { data, error } = await supabase
      .from("prompt_scan_runs")
      .insert({
        project_id, brand_name, models,
        status: "running", total_prompts: totalOps, completed: 0,
      })
      .select("id").single();
    if (error) throw error;
    runId = data.id as string;
  } else {
    await supabase.from("prompt_scan_runs")
      .update({ status: "running", total_prompts: totalOps })
      .eq("id", runId);
  }

  await job.updateProgress(5);

  // ── 3. Run each prompt × model ───────────────────────────────────────────────
  let completed = 0;
  let brandMentionedCount = 0;
  // Track which prompts we've already generated fanouts for (once per prompt, not per model)
  const fanoutsDone = new Set<string>();

  for (const prompt of prompts as Array<{ id: string; prompt: string; topic: string }>) {
    for (const modelKey of models) {
      // Skip unknown model keys
      if (!MODEL_MAP[modelKey]) {
        console.warn(`[PromptScanWorker] Unknown model: ${modelKey}, skipping`);
        continue;
      }

      let responseText = "";
      let latencyMs    = 0;
      let status       = "success";
      let errorMessage: string | null = null;

      try {
        console.log(`[PromptScanWorker] ${modelKey} ← "${prompt.prompt.slice(0, 70)}…"`);
        const res = await queryModel(modelKey, prompt.prompt);
        responseText = res.text;
        latencyMs    = res.latencyMs;
      } catch (e) {
        status       = "error";
        errorMessage = e instanceof Error ? e.message : String(e);
        console.error(`[PromptScanWorker] ${modelKey} error: ${errorMessage}`);
      }

      const citations = parseCitations(responseText, brand_name, competitors);
      if (citations.brandMentioned) brandMentionedCount++;

      // Save result
      await supabase.from("prompt_scan_results").insert({
        project_id,
        prompt_id:            prompt.id,
        prompt_text:          prompt.prompt,
        model:                modelKey,
        response_text:        responseText,
        brand_mentioned:      citations.brandMentioned,
        mention_position:     citations.mentionPosition,
        mention_context:      citations.mentionContext,
        mention_sentiment:    citations.mentionSentiment,
        mention_count:        citations.mentionCount,
        competitors_mentioned:citations.competitorsMentioned,
        status,
        error_message:        errorMessage,
        latency_ms:           latencyMs,
      });

      // Back-fill aeo_citations for backward compatibility
      if (citations.brandMentioned) {
        await supabase.from("aeo_citations").insert({
          project_id,
          provider:    modelKey,
          query:       prompt.prompt,
          cited_title: brand_name,
          position:    citations.mentionPosition,
          metadata: {
            context:   citations.mentionContext,
            sentiment: citations.mentionSentiment,
            run_id:    runId,
            source:    "prompt_scan_worker",
          },
        });
      }

      completed++;
      await supabase.from("prompt_scan_runs")
        .update({ completed, brand_mentioned_count: brandMentionedCount })
        .eq("id", runId);

      // Progress: 5%–85% (leaving 85–100 for fanout + gap steps)
      const pct = 5 + Math.round((completed / totalOps) * 80);
      await job.updateProgress(pct);

      // Small back-off between API calls to avoid rate limits
      await new Promise(r => setTimeout(r, 300));
    }

    // ── Fanout generation — once per prompt, fire-and-forget ─────────────────
    // Intentionally outside the model loop so we only call the LLM once per
    // unique prompt regardless of how many models were scanned.
    if (!fanoutsDone.has(prompt.id)) {
      fanoutsDone.add(prompt.id);
      generateFanouts(project_id, runId!, prompt.prompt, brand_name).catch(e =>
        console.warn(`[PromptScanWorker] Fanout generation failed silently: ${e?.message}`),
      );
    }
  }

  // ── 4. Mark complete ─────────────────────────────────────────────────────────
  await supabase.from("prompt_scan_runs").update({
    status: "done",
    completed,
    brand_mentioned_count: brandMentionedCount,
    finished_at: new Date().toISOString(),
  }).eq("id", runId);

  await job.updateProgress(90);

  // ── 5. Persist gap analysis (after run is marked done) ───────────────────────
  const { gaps_upserted } = await persistGapsForRun(project_id, runId!, brand_name).catch(e => {
    console.warn(`[PromptScanWorker] Gap persistence failed silently: ${e?.message}`);
    return { gaps_upserted: 0 };
  });

  await job.updateProgress(100);

  const mentionRate = totalOps > 0 ? Math.round((brandMentionedCount / completed) * 100) : 0;
  const summary = {
    run_id: runId, prompts_scanned: prompts.length,
    total_queries: completed, brand_mentioned: brandMentionedCount,
    mention_rate_pct: mentionRate, gaps_upserted,
  };
  console.log(`[PromptScanWorker] Done:`, summary);
  return summary;
}

export function startPromptScanWorker() {
  const worker = new Worker<PromptScanJobData>(
    "prompt-scan",
    processPromptScanJob,
    { connection: redis, concurrency: 1 } // serial — AI calls are expensive
  );

  worker.on("completed", (job) => console.log(`[PromptScanWorker] ✅ Job ${job.id} done`));
  worker.on("failed", async (job, err) => {
    console.error(`[PromptScanWorker] ❌ Job ${job?.id} failed: ${err.message}`);
    if (job?.data?.run_id) {
      await supabase.from("prompt_scan_runs")
        .update({ status: "failed", error: err.message, finished_at: new Date().toISOString() })
        .eq("id", job.data.run_id);
    }
  });
  worker.on("error", (err) => console.error("[PromptScanWorker] Worker error:", err));

  console.log("🤖 PromptScanWorker started (concurrency: 1)");
  return worker;
}
