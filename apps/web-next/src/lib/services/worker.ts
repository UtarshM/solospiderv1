import { fetchWithPolicy } from "./http";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? "";
const WORKER_SECRET = process.env.NEXT_PUBLIC_WORKER_SECRET ?? "";

export function workerAvailable() {
  return Boolean(WORKER_URL && WORKER_SECRET);
}

export async function submitPromptScanJob(payload: {
  project_id: string;
  brand_name: string;
  models: string[];
}) {
  if (!workerAvailable()) throw new Error("WORKER_NOT_CONFIGURED");

  return fetchWithPolicy<{ ok: boolean; job_id: string }>(`${WORKER_URL}/api/jobs/prompt-scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-worker-secret": WORKER_SECRET,
    },
    body: JSON.stringify(payload),
  });
}
