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
    if (!saEmail || !saPrivateKeyRaw) throw new Error("Missing GA4 service account env");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const projectId = String(body.project_id || "");
    const propertyId = String(body.ga4_property_id || "").replace(/^properties\//, "");
    const days = Math.max(1, Math.min(90, Number(body.days || 30)));
    if (!projectId || !propertyId) throw new Error("project_id and ga4_property_id are required");

    const now = Math.floor(Date.now() / 1000);
    const jwt = await signJwt({
      iss: saEmail,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
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
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new Error(`Google auth failed: ${JSON.stringify(tokenJson)}`);
    }

    const reportRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "date" }, { name: "sessionSource" }, { name: "landingPagePlusQueryString" }],
        metrics: [{ name: "sessions" }, { name: "conversions" }],
        limit: 1000,
      }),
    });
    const reportJson = await reportRes.json();
    if (!reportRes.ok) {
      throw new Error(`GA4 report failed: ${JSON.stringify(reportJson)}`);
    }

    const aiSources = ["chatgpt", "openai", "perplexity", "gemini", "bard", "claude", "copilot", "you.com", "poe"];
    const rows = (reportJson.rows || []).map((r: any) => {
      const d = r.dimensionValues || [];
      const m = r.metricValues || [];
      const rawDate = String(d[0]?.value || "");
      const eventDate = rawDate.length === 8
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
        : new Date().toISOString().slice(0, 10);
      return {
        event_date: eventDate,
        source: String(d[1]?.value || "").toLowerCase(),
        landing_path: String(d[2]?.value || ""),
        sessions: Number(m[0]?.value || 0),
        conversions: Number(m[1]?.value || 0),
      };
    }).filter((r: any) => aiSources.some((s) => r.source.includes(s)) && r.sessions > 0);

    if (rows.length > 0) {
      const payload = rows.map((r: any) => ({
        project_id: projectId,
        source: r.source,
        medium: "ai",
        landing_path: r.landing_path,
        sessions: r.sessions,
        conversions: r.conversions,
        event_date: r.event_date,
        metadata: { imported_from: "ga4" },
      }));
      const { error } = await supabase.from("ai_referrals").insert(payload as any);
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

