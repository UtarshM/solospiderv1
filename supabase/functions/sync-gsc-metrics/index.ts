import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toBase64Url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signJwt(claims: Record<string, unknown>, privateKeyPem: string): Promise<string> {
  const enc = new TextEncoder();
  const header = { alg: "RS256", typ: "JWT" };
  const sanitize = privateKeyPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(sanitize), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const encodedHeader = toBase64Url(enc.encode(JSON.stringify(header)));
  const encodedPayload = toBase64Url(enc.encode(JSON.stringify(claims)));
  const input = `${encodedHeader}.${encodedPayload}`;
  const sigBuffer = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(input));
  const signature = toBase64Url(new Uint8Array(sigBuffer));
  return `${input}.${signature}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const saEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") ?? "";
    const saPrivateKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase env");
    if (!saEmail || !saPrivateKeyRaw) throw new Error("Missing GSC service account env");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const projectId = String(body.project_id || "");
    const siteUrl = String(body.site_url || "").trim();
    const days = Math.max(1, Math.min(90, Number(body.days || 30)));
    if (!projectId || !siteUrl) throw new Error("project_id and site_url required");

    const now = Math.floor(Date.now() / 1000);
    const jwt = await signJwt({
      iss: saEmail,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }, saPrivateKeyRaw.replace(/\\n/g, "\n"));

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) throw new Error(`Google auth failed: ${JSON.stringify(tokenJson)}`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const gscRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: fmt(startDate),
          endDate: fmt(endDate),
          dimensions: ["query", "page", "date"],
          rowLimit: 250,
        }),
      },
    );
    const gscJson = await gscRes.json();
    if (!gscRes.ok) throw new Error(`GSC query failed: ${JSON.stringify(gscJson)}`);

    const rows = (gscJson.rows || []).map((r: any) => ({
      project_id: projectId,
      query: String(r.keys?.[0] || ""),
      page: String(r.keys?.[1] || ""),
      metric_date: String(r.keys?.[2] || fmt(endDate)),
      clicks: Number(r.clicks || 0),
      impressions: Number(r.impressions || 0),
      ctr: Number(r.ctr || 0),
      position: Number(r.position || 0),
    })).filter((r: any) => r.query);

    if (rows.length > 0) {
      const { error } = await supabase.from("gsc_query_metrics").insert(rows as any);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ ok: true, imported: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

