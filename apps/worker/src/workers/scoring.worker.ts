import { Worker, Job } from "bullmq";
import { redis } from "../config.js";
import { supabase } from "../lib/supabase.js";
import type { ScoringJobData } from "../queues.js";

// Compute a GEO score for a project based on recent prompt scan results
async function processScoringJob(job: Job<ScoringJobData>): Promise<object> {
  const { project_id, brand_name } = job.data;
  console.log(`[ScoringWorker] Job ${job.id} — project=${project_id}`);

  await job.updateProgress(10);

  // Load recent scan results (last 7 days)
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: results } = await supabase
    .from("prompt_scan_results")
    .select("model, brand_mentioned, mention_sentiment, mention_count")
    .eq("project_id", project_id)
    .eq("status", "success")
    .gte("scanned_at", since);

  if (!results || results.length === 0) {
    console.log(`[ScoringWorker] No recent results for project ${project_id}`);
    return { project_id, score: null, reason: "No scan data in last 7 days" };
  }

  await job.updateProgress(40);

  // ── GEO Score algorithm ────────────────────────────────────────────────────
  const totalQueries     = results.length;
  const mentionedCount   = results.filter(r => r.brand_mentioned).length;
  const positiveCount    = results.filter(r => r.mention_sentiment === "positive").length;
  const baseRate         = mentionedCount / totalQueries;
  const sentimentBonus   = mentionedCount > 0 ? (positiveCount / mentionedCount) * 0.2 : 0;
  const rawScore         = Math.round((baseRate + sentimentBonus) * 100);
  const geoScore         = Math.min(100, Math.max(0, rawScore));

  // Per-model breakdown
  const modelKeys = ["chatgpt", "gemini", "perplexity", "claude", "grok", "deepseek"];
  const modelBreakdown = modelKeys.map(model => {
    const modelResults = results.filter(r => r.model === model);
    if (modelResults.length === 0) return null;
    const mentioned = modelResults.filter(r => r.brand_mentioned).length;
    return {
      model,
      total: modelResults.length,
      mentioned,
      rate: Math.round((mentioned / modelResults.length) * 100),
    };
  }).filter(Boolean);

  await job.updateProgress(70);

  // Upsert GEO score into aeo_analyses table (reuse existing schema)
  const { error } = await supabase.from("aeo_analyses").upsert({
    project_id,
    overall_score: geoScore,
    website: brand_name,
    brand_name,
    providers:         modelBreakdown,
    category_scores:   [],
    recommendations:   [],
    prompt_suggestions:[],
    updated_at:        new Date().toISOString(),
  }, { onConflict: "project_id" });

  if (error) console.warn(`[ScoringWorker] Upsert error: ${error.message}`);

  await job.updateProgress(100);

  const summary = {
    project_id, geo_score: geoScore,
    total_queries: totalQueries,
    mention_rate_pct: Math.round(baseRate * 100),
    model_breakdown: modelBreakdown,
  };
  console.log(`[ScoringWorker] Done:`, summary);
  return summary;
}

export function startScoringWorker() {
  const worker = new Worker<ScoringJobData>("scoring", processScoringJob, {
    connection: redis,
    concurrency: 5,
  });

  worker.on("completed", (job) => console.log(`[ScoringWorker] ✅ Job ${job.id} done`));
  worker.on("failed",    (job, err) => console.error(`[ScoringWorker] ❌ Job ${job?.id}: ${err.message}`));
  worker.on("error",     (err) => console.error("[ScoringWorker] Error:", err));

  console.log("📊 ScoringWorker started (concurrency: 5)");
  return worker;
}
