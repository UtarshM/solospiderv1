import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, readJson, requireWorkerSecret } from "@/server/api";
import { getQueues } from "@/server/queues";

export const runtime = "nodejs";

const CrawlSchema = z.object({
  project_id: z.string().uuid(),
  website: z.string().url(),
  max_pages: z.number().int().min(1).max(200).optional().default(50),
});

export async function POST(request: NextRequest) {
  const unauthorized = requireWorkerSecret(request);
  if (unauthorized) return unauthorized;

  const parsed = CrawlSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { crawlQueue } = getQueues();
  const job = await crawlQueue.add("crawl", parsed.data, {
    jobId: `crawl-${parsed.data.project_id}-${Date.now()}`,
  });

  return NextResponse.json({ ok: true, job_id: job.id, queue: "crawl" });
}
