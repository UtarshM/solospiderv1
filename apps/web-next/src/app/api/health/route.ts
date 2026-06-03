import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, ts: new Date().toISOString(), env: process.env.NODE_ENV ?? "development" });
}
