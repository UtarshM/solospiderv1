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
    const metaAppId = Deno.env.get("META_APP_ID") ?? "";
    const metaAppSecret = Deno.env.get("META_APP_SECRET") ?? "";

    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase env");
    if (!metaAppId || !metaAppSecret) throw new Error("Missing META_APP_ID or META_APP_SECRET");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const projectId = String(body.project_id || "").trim();
    const platform = String(body.platform || "instagram").trim();
    const providedToken = String(body.access_token || "").trim();

    if (!projectId) throw new Error("project_id is required");

    let token = providedToken;
    if (!token) {
      const { data: account, error } = await supabase
        .from("social_accounts")
        .select("access_token")
        .eq("project_id", projectId)
        .eq("platform", platform)
        .maybeSingle();
      if (error) throw error;
      token = String(account?.access_token || "").trim();
    }
    if (!token) throw new Error("No access token found to refresh");

    const exchangeUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
    exchangeUrl.searchParams.set("grant_type", "fb_exchange_token");
    exchangeUrl.searchParams.set("client_id", metaAppId);
    exchangeUrl.searchParams.set("client_secret", metaAppSecret);
    exchangeUrl.searchParams.set("fb_exchange_token", token);

    const refreshRes = await fetch(exchangeUrl.toString());
    const refreshJson = await refreshRes.json();
    if (!refreshRes.ok || !refreshJson?.access_token) {
      throw new Error(`Meta token refresh failed: ${JSON.stringify(refreshJson)}`);
    }

    const refreshedToken = String(refreshJson.access_token);
    const expiresInSec = Number(refreshJson.expires_in || 0);
    const expiresAt = expiresInSec > 0
      ? new Date(Date.now() + (expiresInSec * 1000)).toISOString()
      : null;

    const { error: updateError } = await supabase
      .from("social_accounts")
      .update({
        access_token: refreshedToken,
        token_expires_at: expiresAt,
        connection_status: "connected",
        last_publish_error: null,
      } as never)
      .eq("project_id", projectId)
      .eq("platform", platform);
    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      ok: true,
      platform,
      token_expires_at: expiresAt,
      expires_in: expiresInSec,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message || "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

