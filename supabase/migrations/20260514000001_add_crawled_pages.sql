-- ─────────────────────────────────────────────────────────────
-- PIECE 1: Site Crawler — crawled_pages table
-- Stores every page discovered from a project's website/sitemap
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.crawled_pages (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  url            TEXT        NOT NULL,
  title          TEXT,
  meta_desc      TEXT,
  h1             TEXT,
  word_count     INTEGER,
  -- Schema.org types detected on the page (e.g. ["FAQPage","Article"])
  schema_types   TEXT[]      NOT NULL DEFAULT '{}',
  -- Whether the page has structured FAQ/HowTo schema (important for AEO)
  has_faq_schema BOOLEAN     NOT NULL DEFAULT false,
  has_howto      BOOLEAN     NOT NULL DEFAULT false,
  -- HTTP status returned when we fetched the page
  status_code    INTEGER,
  -- Where was this URL discovered from?
  source         TEXT        NOT NULL DEFAULT 'sitemap', -- 'sitemap' | 'crawl' | 'manual'
  crawled_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One URL per project (upsert-safe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_crawled_pages_project_url
  ON public.crawled_pages(project_id, url);

CREATE INDEX IF NOT EXISTS idx_crawled_pages_project_crawled
  ON public.crawled_pages(project_id, crawled_at DESC);

-- crawl_runs tracks each full crawl job
CREATE TABLE IF NOT EXISTS public.crawl_runs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'pending',  -- pending | running | done | failed
  pages_found   INTEGER     NOT NULL DEFAULT 0,
  pages_crawled INTEGER     NOT NULL DEFAULT 0,
  error         TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_runs_project_created
  ON public.crawl_runs(project_id, created_at DESC);

-- RLS
ALTER TABLE public.crawled_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_runs    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own crawled pages" ON public.crawled_pages;
CREATE POLICY "Users manage own crawled pages"
  ON public.crawled_pages FOR ALL
  USING  (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users manage own crawl runs" ON public.crawl_runs;
CREATE POLICY "Users manage own crawl runs"
  ON public.crawl_runs FOR ALL
  USING  (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

-- Realtime so the frontend can watch crawl progress live
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.crawled_pages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.crawl_runs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
