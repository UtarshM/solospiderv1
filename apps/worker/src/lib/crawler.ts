// ── Site crawler library ────────────────────────────────────────────────────
// Discovers URLs via sitemap.xml (multiple candidates), falls back to
// crawling homepage links. Returns crawled page metadata.

export interface CrawledPageData {
  url:            string;
  title:          string | null;
  meta_desc:      string | null;
  h1:             string | null;
  word_count:     number;
  schema_types:   string[];
  has_faq_schema: boolean;
  has_howto:      boolean;
  status_code:    number | null;
  source:         "sitemap" | "crawl" | "manual";
}

const CRAWL_UA = "SoloSpider-Crawler/1.0 (+https://solospider.ai/bot)";
const TIMEOUT  = 8_000; // ms

async function fetchPage(url: string): Promise<{ html: string; status: number } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": CRAWL_UA, Accept: "text/html,application/xml,*/*" },
      redirect: "follow",
    });
    const html = await res.text();
    return { html, status: res.status };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractSitemapUrls(xml: string): string[] {
  const urls: string[] = [];
  const re = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const u = m[1].trim();
    if (u.startsWith("http")) urls.push(u);
  }
  return [...new Set(urls)];
}

function extractLinks(html: string, base: string, origin: string): string[] {
  const urls: string[] = [];
  const re = /href=["']([^"'#?]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const abs = new URL(m[1], base).href;
      if (abs.startsWith(origin)) urls.push(abs.split("?")[0].replace(/\/$/, ""));
    } catch { /* skip */ }
  }
  return [...new Set(urls)];
}

function parseMeta(html: string): Omit<CrawledPageData, "url" | "status_code" | "source"> {
  const titleM  = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  const title   = titleM ? titleM[1].trim().slice(0, 250) : null;

  const metaM   = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i.exec(html)
               ?? /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i.exec(html);
  const meta_desc = metaM ? metaM[1].trim().slice(0, 500) : null;

  const h1M = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const h1  = h1M ? h1M[1].replace(/<[^>]+>/g, "").trim().slice(0, 250) : null;

  const text       = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const word_count = text.trim().split(" ").filter(Boolean).length;

  const schemaRe   = /"@type"\s*:\s*"([^"]+)"/g;
  const schemaTypes: string[] = [];
  let sm: RegExpExecArray | null;
  while ((sm = schemaRe.exec(html)) !== null) schemaTypes.push(sm[1]);
  const schema_types   = [...new Set(schemaTypes)];
  const has_faq_schema = schema_types.some(s => s.toLowerCase().includes("faq"));
  const has_howto      = schema_types.some(s => s.toLowerCase().includes("howto"));

  return { title, meta_desc, h1, word_count, schema_types, has_faq_schema, has_howto };
}

export async function discoverUrls(
  website: string,
  maxPages: number
): Promise<Array<{ url: string; source: "sitemap" | "crawl" }>> {
  const origin = new URL(website).origin;
  const queue: Array<{ url: string; source: "sitemap" | "crawl" }> = [];

  // Try common sitemap locations
  const sitemapCandidates = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap.txt`,
    `${origin}/sitemap`,
  ];

  let found = false;
  for (const sm of sitemapCandidates) {
    const page = await fetchPage(sm);
    if (page && page.status < 400) {
      const urls = extractSitemapUrls(page.html)
        .filter(u => u.startsWith(origin))
        .map(u => u.replace(/\/$/, ""));
      if (urls.length > 0) {
        urls.forEach(u => queue.push({ url: u, source: "sitemap" }));
        found = true;
        break;
      }
    }
  }

  // Fallback: crawl homepage
  if (!found || queue.length === 0) {
    const page = await fetchPage(website);
    if (page) {
      const links = extractLinks(page.html, website, origin).slice(0, maxPages);
      links.forEach(u => queue.push({ url: u, source: "crawl" }));
      queue.unshift({ url: website.replace(/\/$/, ""), source: "crawl" });
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return queue.filter(item => {
    const norm = item.url.replace(/\/$/, "");
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  }).slice(0, maxPages);
}

export async function crawlPage(
  url: string,
  source: "sitemap" | "crawl"
): Promise<CrawledPageData> {
  const page = await fetchPage(url);
  if (!page) {
    return {
      url, title: null, meta_desc: null, h1: null,
      word_count: 0, schema_types: [], has_faq_schema: false,
      has_howto: false, status_code: null, source,
    };
  }

  if (page.status >= 400) {
    return {
      url, title: null, meta_desc: null, h1: null,
      word_count: 0, schema_types: [], has_faq_schema: false,
      has_howto: false, status_code: page.status, source,
    };
  }

  return { url, ...parseMeta(page.html), status_code: page.status, source };
}
