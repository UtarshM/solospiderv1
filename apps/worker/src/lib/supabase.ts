import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { env } from "../config.js";

// Service-role client — full DB access, bypass RLS
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    global: {
      headers: { "X-Client-Info": "solospider-worker/1.0" },
    },
    realtime: {
      transport: WebSocket as any,
    },
  }
);
