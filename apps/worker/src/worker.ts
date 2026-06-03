import "dotenv/config";
import cron from "node-cron";
import { env } from "./config.js";
import { scoringQueue } from "./queues.js";
import { supabase } from "./lib/supabase.js";
import { startCrawlWorker } from "./workers/crawl.worker.js";
import { startPromptScanWorker } from "./workers/prompt-scan.worker.js";
import { startScoringWorker } from "./workers/scoring.worker.js";
import { startPublishWorker } from "./workers/publish.worker.js";
import { processDueSocialPosts } from "./services/social.js";

const crawlWorker = startCrawlWorker();
const promptScanWorker = startPromptScanWorker();
const scoringWorker = startScoringWorker();
const publishWorker = startPublishWorker();

cron.schedule("0 */6 * * *", async () => {
  console.log("[Cron] Triggering GEO score recompute for all projects...");
  try {
    const { data: projects } = await supabase.from("projects").select("id, name").limit(100);

    for (const project of projects ?? []) {
      await scoringQueue.add(
        "score",
        {
          project_id: project.id,
          brand_name: project.name,
        },
        { jobId: `score-cron-${project.id}-${Date.now()}` },
      );
    }

    console.log(`[Cron] Queued scoring for ${projects?.length ?? 0} projects`);
  } catch (error) {
    console.error("[Cron] Score cron error:", error);
  }
});

cron.schedule("* * * * *", async () => {
  await processDueSocialPosts();
});

console.log("SoloSpider worker process ready");
console.log(`ENV: ${env.NODE_ENV}`);
console.log("Workers: CrawlWorker | PromptScanWorker | ScoringWorker | PublishWorker");
console.log("Cron: GEO score recompute every 6h; social publish check every minute");

async function shutdown(signal: string) {
  console.log(`\n[Worker] ${signal} received, shutting down gracefully...`);
  await Promise.all([crawlWorker.close(), promptScanWorker.close(), scoringWorker.close(), publishWorker.close()]);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
