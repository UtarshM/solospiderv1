import { NextResponse, type NextRequest } from "next/server";

export function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJson(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function requireWorkerSecret(request: NextRequest) {
  const expectedSecret = process.env.WORKER_SECRET ?? "dev-secret";
  const secret = request.headers.get("x-worker-secret") ?? request.nextUrl.searchParams.get("secret");

  if (secret !== expectedSecret) {
    return jsonError("Unauthorized", 401);
  }

  return null;
}
