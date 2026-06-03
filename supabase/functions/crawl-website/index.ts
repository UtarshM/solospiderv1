import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    // remove trailing slash for consistency
    return u.href.replace(/\/$/, "");
  } catch {
    return raw;
  }
}

function extractLinks(html: string, base: string): string[] {
  const urls: string[] = [];
  const hrefRe = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    try {
      const abs = new URL(m[1], base).href;
      if (abs.startsWith("http")) urls.push(abs);
    } catch { /* skip */ }
  }
  return [...new Set(urls)];
}

function extractSitemapUrls(xml: string): string[] {
  const urls: string[] = [];
  // <loc> tags in sitemap
  const locRe = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = locRe.exec(xml)) !== null) {
    const u = m[1].trim();
    if (u.startsWith("http")) urls.push(u);
  }
  return [...new Set(urls)];
}

function extractMeta(html: string): {
  title: string | null;
  metaDesc: string | null;
  h1: string | null;
  wordCount: number;
  schemaTypes: string[];
  hasFaqSchema: boolean;
  hasHowTo: boolean;
} {
  // Title
  const titleM = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  const title = titleM ? titleM[1].trim().slice(0, 250) : null;

  // Meta description
  const metaM = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i.exec(html)
    || /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i.exec(html);
  const metaDesc = metaM ? metaM[1].trim().slice(0, 500) : null;

  // H1
  const h1M = /<h1[^>]*>([^<]+)<\/h1>/i.exec(html);
  const h1 = h1M ? h1M[1].replace(/<[^>]+>/g, "").trim().slice(0, 250) : null;

  // Word count (rough: strip tags, count words)
  const textOnly = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const wordCount = textOnly.trim().split(" ").filter(Boolean).length;

  // Schema.org types
  const schemaTypes: string[] = [];
  const schemaRe = /"@type"\s*:\s*"([^"]+)"/g;
  let sm: RegExpExecArray | null;
  while ((sm = schemaRe.exec(html)) !== null) {
    schemaTypes.push(sm[1]);
  }
  const uniqueSchemas = [...new Set(schemaTypes)];
  const hasFaqSchema = uniqueSchemas.some(s => s.toLowerCase().includes("faq"));
  const hasHowTo = uniqueSchemas.some(s => s.toLowerCase().includes("howto") || s.toLowerCase().includes("how-to"));

  return { title, metaDesc, h1, wordCount, schemaTypes: uniqueSchemas, hasFaqSchema, hasHowTo };
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SoloSpider-Crawler/1.0 (+https://solospider.ai/bot)",
        "Accept": "text/html,application/xml,text/xml,*/*",
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl  = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase     = createClient(supabaseUrl, serviceKey);

  try {
    const body       = await req.json();
    const projectId  = String(body.project_id || "").trim();
    const rawWebsite = String(body.website || "").trim();
    const maxPages   = Math.min(Number(body.max_pages || 50), 200); // cap at 200

    if (!projectId || !rawWebsite) {
      throw new Error("project_id and website are required");
    }

    // Normalise website to have a protocol
    const website = rawWebsite.startsWith("http") ? rawWebsite : `https://${rawWebsite}`;
    const origin  = new URL(website).origin;

    // ── 1. Create crawl_run record ──────────────────────────────────────────
    const { data: runRow, error: runErr } = await supabase
      .from("crawl_runs")
      .insert({ project_id: projectId, status: "running" })
      .select("id")
      .single();
    if (runErr) throw runErr;
    const runId = runRow.id as string;

    // ── 2. Discover URLs from sitemaps ──────────────────────────────────────
    const urlQueue: Array<{ url: string; source: "sitemap" | "crawl" }> = [];
    const sitemapCandidates = [
      `${origin}/sitemap.xml`,
      `${origin}/sitemap_index.xml`,
      `${origin}/sitemap.txt`,
      `${origin}/sitemap`,
    ];

    let sitemapFound = false;
    for (const sitemapUrl of sitemapCandidates) {
      try {
        const res = await fetchWithTimeout(sitemapUrl, 6000);
        if (res.ok) {
          const text = await res.text();
          const found = extractSitemapUrls(text);
          if (found.length > 0) {
            console.log(`Sitemap found at ${sitemapUrl}: ${found.length} URLs`);
            // Filter to same origin only
            found
              .filter(u => u.startsWith(origin))
              .forEach(u => urlQueue.push({ url: normalizeUrl(u), source: "sitemap" }));
            sitemapFound = true;
            break; // use first working sitemap
          }
        }
      } catch { /* try next */ }
    }

    // ── 3. Fallback: crawl homepage if no sitemap found ─────────────────────
    if (!sitemapFound || urlQueue.length === 0) {
      console.log("No sitemap found, crawling homepage for links...");
      try {
        const res = await fetchWithTimeout(website, 8000);
        if (res.ok) {
          const html = await res.text();
          const links = extractLinks(html, website)
            .filter(u => u.startsWith(origin))
            .slice(0, maxPages);
          links.forEach(u => urlQueue.push({ url: normalizeUrl(u), source: "crawl" }));
          // always include homepage itself
          urlQueue.unshift({ url: normalizeUrl(website), source: "crawl" });
        }
      } catch (e) {
        console.warn("Homepage crawl failed:", e);
      }
    }

    // Deduplicate URL queue
    const seen = new Set<string>();
    const dedupedQueue = urlQueue.filter(item => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    }).slice(0, maxPages);

    console.log(`Total URLs to crawl: ${dedupedQueue.length}`);

    // Update run with pages_found
    await supabase
      .from("crawl_runs")
      .update({ pages_found: dedupedQueue.length })
      .eq("id", runId);

    // ── 4. Crawl each page and extract metadata ─────────────────────────────
    const batchSize = 5; // concurrent requests
    let pagesCrawled = 0;
    const results: Array<{
      project_id: string;
      url: string;
      title: string | null;
      meta_desc: string | null;
      h1: string | null;
      word_count: number;
      schema_types: string[];
      has_faq_schema: boolean;
      has_howto: boolean;
      status_code: number | null;
      source: string;
    }> = [];

    for (let i = 0; i < dedupedQueue.length; i += batchSize) {
      const batch = dedupedQueue.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async ({ url, source }) => {
          try {
            const res = await fetchWithTimeout(url, 7000);
            const statusCode = res.status;
            if (!res.ok) {
              return {
                project_id: projectId,
                url,
                title: null,
                meta_desc: null,
                h1: null,
                word_count: 0,
                schema_types: [] as string[],
                has_faq_schema: false,
                has_howto: false,
                status_code: statusCode,
                source,
              };
            }
            const html = await res.text();
            const meta = extractMeta(html);
            return {
              project_id: projectId,
              url,
              title: meta.title,
              meta_desc: meta.metaDesc,
              h1: meta.h1,
              word_count: meta.wordCount,
              schema_types: meta.schemaTypes,
              has_faq_schema: meta.hasFaqSchema,
              has_howto: meta.hasHowTo,
              status_code: statusCode,
              source,
            };
          } catch (e) {
            console.warn(`Failed to crawl ${url}:`, e);
            return {
              project_id: projectId,
              url,
              title: null,
              meta_desc: null,
              h1: null,
              word_count: 0,
              schema_types: [] as string[],
              has_faq_schema: false,
              has_howto: false,
              status_code: null,
              source,
            };
          }
        })
      );
      results.push(...batchResults);
      pagesCrawled += batch.length;

      // Upsert batch to DB immediately so frontend gets live updates
      const { error: upsertErr } = await supabase
        .from("crawled_pages")
        .upsert(batchResults, { onConflict: "project_id,url", ignoreDuplicates: false });
      if (upsertErr) console.warn("Upsert error:", upsertErr.message);

      // Update progress on crawl_run
      await supabase
        .from("crawl_runs")
        .update({ pages_crawled: pagesCrawled })
        .eq("id", runId);
    }

    // ── 5. Mark run as complete ─────────────────────────────────────────────
    const faqCount   = results.filter(r => r.has_faq_schema).length;
    const howToCount = results.filter(r => r.has_howto).length;

    await supabase
      .from("crawl_runs")
      .update({
        status: "done",
        pages_crawled: pagesCrawled,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return new Response(JSON.stringify({
      ok: true,
      run_id: runId,
      pages_found: dedupedQueue.length,
      pages_crawled: pagesCrawled,
      faq_pages: faqCount,
      howto_pages: howToCount,
      sitemap_found: sitemapFound,
      sample: results.slice(0, 5).map(r => ({
        url: r.url,
        title: r.title,
        status_code: r.status_code,
        schema_types: r.schema_types,
      })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("crawl-website fatal error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
