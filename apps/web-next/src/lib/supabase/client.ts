"use client";

import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseEnv, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;
  assertSupabaseEnv();
  client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
