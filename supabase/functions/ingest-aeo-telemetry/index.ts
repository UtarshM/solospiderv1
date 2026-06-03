import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase env");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const type = String(body.type || "");
    const projectId = String(body.project_id || "");
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!projectId || !type || rows.length === 0) {
      throw new Error("type, project_id, rows[] are required");
    }

    if (type === "ai_referrals") {
      const payload = rows.map((r: any) => ({
        project_id: projectId,
        source: String(r.source || "unknown"),
        medium: String(r.medium || "ai"),
        landing_path: r.landing_path ? String(r.landing_path) : null,
        sessions: Number(r.sessions || 1),
        conversions: Number(r.conversions || 0),
        event_date: r.event_date ? String(r.event_date) : new Date().toISOString().slice(0, 10),
        metadata: typeof r.metadata === "object" && r.metadata ? r.metadata : {},
      }));
      const { error } = await supabase.from("ai_referrals").insert(payload as any);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, inserted: payload.length, table: "ai_referrals" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "bot_analytics") {
      const payload = rows.map((r: any) => ({
        project_id: projectId,
        bot_name: String(r.bot_name || "unknown_bot"),
        user_agent: r.user_agent ? String(r.user_agent) : null,
        path: r.path ? String(r.path) : null,
        status_code: r.status_code != null ? Number(r.status_code) : null,
        response_time_ms: r.response_time_ms != null ? Number(r.response_time_ms) : null,
        event_at: r.event_at ? String(r.event_at) : new Date().toISOString(),
        metadata: typeof r.metadata === "object" && r.metadata ? r.metadata : {},
      }));
      const { error } = await supabase.from("bot_analytics_events").insert(payload as any);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, inserted: payload.length, table: "bot_analytics_events" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unsupported type. Use ai_referrals or bot_analytics");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

