import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const accessToken = String(body.access_token || "").trim();
    const igUserId = String(body.meta_ig_user_id || "").trim();

    if (!accessToken || !igUserId) {
      throw new Error("access_token and meta_ig_user_id are required");
    }

    const meRes = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`);
    const meJson = await meRes.json();
    if (!meRes.ok || !meJson?.id) {
      throw new Error(`Meta token validation failed: ${JSON.stringify(meJson)}`);
    }

    const igRes = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(igUserId)}?fields=id,username&access_token=${encodeURIComponent(accessToken)}`);
    const igJson = await igRes.json();
    if (!igRes.ok || !igJson?.id) {
      throw new Error(`Instagram user validation failed: ${JSON.stringify(igJson)}`);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        meta_user: { id: String(meJson.id), name: String(meJson.name || "") },
        instagram_user: { id: String(igJson.id), username: String(igJson.username || "") },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message || "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

