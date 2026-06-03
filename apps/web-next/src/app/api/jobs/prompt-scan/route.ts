import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { readJson, requireWorkerSecret } from "@/server/api";
import { getQueues } from "@/server/queues";

export const runtime = "nodejs";

const PromptScanSchema = z.object({
  project_id: z.string().uuid(),
  brand_name: z.string().min(1),
  models: z.array(z.string()).min(1).default(["chatgpt", "gemini", "perplexity", "claude"]),
  competitors: z.array(z.string()).optional().default([]),
  prompt_ids: z.array(z.string().uuid()).optional(),
});

export async function POST(request: NextRequest) {
  const unauthorized = requireWorkerSecret(request);
  if (unauthorized) return unauthorized;

  const parsed = PromptScanSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { promptScanQueue } = getQueues();
  const job = await promptScanQueue.add("prompt-scan", parsed.data, {
    jobId: `scan-${parsed.data.project_id}-${Date.now()}`,
  });

  return NextResponse.json({ ok: true, job_id: job.id, queue: "prompt-scan" });
}
