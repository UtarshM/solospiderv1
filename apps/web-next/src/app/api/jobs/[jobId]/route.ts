import { NextResponse, type NextRequest } from "next/server";
import { requireWorkerSecret } from "@/server/api";
import { getQueues } from "@/server/queues";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const unauthorized = requireWorkerSecret(request);
  if (unauthorized) return unauthorized;

  const { jobId } = await params;
  const { crawlQueue, promptScanQueue, scoringQueue, publishQueue } = getQueues();
  const queues = [crawlQueue, promptScanQueue, scoringQueue, publishQueue];

  for (const queue of queues) {
    const job = await queue.getJob(jobId);
    if (job) {
      const state = await job.getState();
      return NextResponse.json({
        job_id: job.id,
        queue: queue.name,
        state,
        progress: job.progress,
        result: job.returnvalue,
        failed_reason: job.failedReason,
        created_at: new Date(job.timestamp).toISOString(),
      });
    }
  }

  return NextResponse.json({ error: "Job not found" }, { status: 404 });
}
