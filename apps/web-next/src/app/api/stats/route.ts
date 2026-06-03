import { NextResponse } from "next/server";
import { jsonError } from "@/server/api";
import { getQueues } from "@/server/queues";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { crawlQueue, promptScanQueue, scoringQueue } = getQueues();
    const [crawl, scan, score] = await Promise.all([
      crawlQueue.getJobCounts(),
      promptScanQueue.getJobCounts(),
      scoringQueue.getJobCounts(),
    ]);

    return NextResponse.json({ crawl, scan, score });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : String(error));
  }
}
