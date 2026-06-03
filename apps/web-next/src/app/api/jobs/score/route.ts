import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { readJson, requireWorkerSecret } from "@/server/api";
import { getQueues } from "@/server/queues";

export const runtime = "nodejs";

const ScoringSchema = z.object({
  project_id: z.string().uuid(),
  brand_name: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const unauthorized = requireWorkerSecret(request);
  if (unauthorized) return unauthorized;

  const parsed = ScoringSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { scoringQueue } = getQueues();
  const job = await scoringQueue.add("score", parsed.data, {
    jobId: `score-${parsed.data.project_id}-${Date.now()}`,
  });

  return NextResponse.json({ ok: true, job_id: job.id, queue: "scoring" });
}
