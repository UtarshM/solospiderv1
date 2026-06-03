import { Worker, Job } from "bullmq";
import { redis } from "../config.js";
import { supabase } from "../lib/supabase.js";
import { discoverUrls, crawlPage, type CrawledPageData } from "../lib/crawler.js";
import type { CrawlJobData } from "../queues.js";

const BATCH_SIZE = 5;

async function processCrawlJob(job: Job<CrawlJobData>): Promise<object> {
  const { project_id, website, max_pages = 50, run_id } = job.data;
  console.log(`[CrawlWorker] Job ${job.id} — project=${project_id} website=${website}`);

  // ── 1. Create or reuse crawl_run record ────────────────────────────────────
  let runId = run_id;
  if (!runId) {
    const { data, error } = await supabase
      .from("crawl_runs")
      .insert({ project_id, status: "running" })
      .select("id").single();
    if (error) throw error;
    runId = data.id as string;
  } else {
    await supabase.from("crawl_runs").update({ status: "running" }).eq("id", runId);
  }

  await job.updateProgress(5);

  // ── 2. Discover URLs ────────────────────────────────────────────────────────
  const urlQueue = await discoverUrls(website, max_pages);
  console.log(`[CrawlWorker] Discovered ${urlQueue.length} URLs`);

  await supabase.from("crawl_runs").update({ pages_found: urlQueue.length }).eq("id", runId);
  await job.updateProgress(15);

  // ── 3. Crawl in batches ─────────────────────────────────────────────────────
  let pagesCrawled = 0;
  let faqCount = 0;
  let howToCount = 0;
  let noSchema = 0;

  for (let i = 0; i < urlQueue.length; i += BATCH_SIZE) {
    const batch = urlQueue.slice(i, i + BATCH_SIZE);
    const batchData = await Promise.all(
      batch.map(({ url, source }) => crawlPage(url, source))
    );

    const rows = batchData.map(p => ({ ...p, project_id }));

    // Accumulate metrics incrementally to avoid keeping raw pages in RAM
    for (const row of rows) {
      if (row.has_faq_schema) faqCount++;
      if (row.has_howto) howToCount++;
      if (row.schema_types.length === 0) noSchema++;
    }

    // Upsert this batch immediately for live dashboard updates
    const { error } = await supabase
      .from("crawled_pages")
      .upsert(rows, { onConflict: "project_id,url", ignoreDuplicates: false });
    if (error) console.warn(`[CrawlWorker] Upsert error: ${error.message}`);

    pagesCrawled += batch.length;
    await supabase.from("crawl_runs")
      .update({ pages_crawled: pagesCrawled })
      .eq("id", runId);

    // Report progress (15%–95% range)
    const pct = 15 + Math.round((pagesCrawled / urlQueue.length) * 80);
    await job.updateProgress(pct);
  }

  // ── 4. Mark complete ────────────────────────────────────────────────────────
  await supabase.from("crawl_runs").update({
    status: "done",
    pages_crawled: pagesCrawled,
    finished_at: new Date().toISOString(),
  }).eq("id", runId);

  await job.updateProgress(100);

  const summary = {
    run_id: runId,
    pages_found: urlQueue.length,
    pages_crawled: pagesCrawled,
    faq_pages: faqCount,
    howto_pages: howToCount,
    no_schema_pages: noSchema,
  };
  console.log(`[CrawlWorker] Done:`, summary);
  return summary;
}

export function startCrawlWorker() {
  const worker = new Worker<CrawlJobData>("crawl", processCrawlJob, {
    connection: redis,
    concurrency: 2, // max 2 simultaneous crawl jobs
  });

  worker.on("completed", (job) => console.log(`[CrawlWorker] ✅ Job ${job.id} completed`));
  worker.on("failed", async (job, err) => {
    console.error(`[CrawlWorker] ❌ Job ${job?.id} failed: ${err.message}`);
    // Mark crawl_run as failed if we have the run_id
    if (job?.data?.run_id) {
      await supabase.from("crawl_runs")
        .update({ status: "failed", error: err.message, finished_at: new Date().toISOString() })
        .eq("id", job.data.run_id);
    }
  });
  worker.on("error", (err) => console.error("[CrawlWorker] Worker error:", err));

  console.log("🕷️  CrawlWorker started (concurrency: 2)");
  return worker;
}
