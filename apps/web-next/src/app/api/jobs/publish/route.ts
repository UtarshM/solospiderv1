import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { readJson, requireWorkerSecret } from "@/server/api";
import { getQueues } from "@/server/queues";

export const runtime = "nodejs";

const PublishSchema = z.object({
  post_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const unauthorized = requireWorkerSecret(request);
  if (unauthorized) return unauthorized;

  const parsed = PublishSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { publishQueue } = getQueues();
  const job = await publishQueue.add("publish", parsed.data, {
    jobId: `publish-${parsed.data.post_id}-${Date.now()}`,
  });

  return NextResponse.json({ ok: true, job_id: job.id, queue: "publish" });
}
