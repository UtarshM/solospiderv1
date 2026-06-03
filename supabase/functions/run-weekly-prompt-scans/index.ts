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
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRole) throw new Error("Missing Supabase env");

    const supabase = createClient(supabaseUrl, serviceRole);
    const now = new Date();
    const day = now.getUTCDay();
    const hour = now.getUTCHours();

    const { data: schedules, error: schedulesError } = await supabase
      .from("aeo_scan_schedules")
      .select("*")
      .eq("is_enabled", true)
      .eq("week_day_utc", day)
      .eq("hour_utc", hour);
    if (schedulesError) throw schedulesError;

    const queued: Array<{ project_id: string; ok: boolean; message?: string }> = [];

    for (const schedule of schedules || []) {
      const { data: project } = await supabase
        .from("projects")
        .select("id, name, brand_name")
        .eq("id", schedule.project_id)
        .maybeSingle();
      if (!project) continue;

      const models = Array.isArray(schedule.models) && schedule.models.length > 0
        ? schedule.models
        : ["chatgpt", "gemini", "perplexity", "claude"];

      const { error: invokeError } = await supabase.functions.invoke("run-prompt-scan", {
        body: {
          project_id: project.id,
          brand_name: project.brand_name || project.name,
          models,
        },
      });

      if (invokeError) {
        const message = invokeError.message || "Failed to invoke run-prompt-scan";
        queued.push({ project_id: project.id, ok: false, message });
        continue;
      }

      await supabase
        .from("aeo_scan_schedules")
        .update({ last_run_at: now.toISOString() })
        .eq("id", schedule.id);

      queued.push({ project_id: project.id, ok: true });
    }

    return new Response(JSON.stringify({ ok: true, scheduled: queued.length, queued }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, error: error.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
