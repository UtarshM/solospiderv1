-- ─────────────────────────────────────────────────────────────────────────────
-- aeo_content_gaps  — persists the gap-analysis briefs that were previously
-- computed client-side and lost on every page refresh.
--
-- One row per (project, prompt_text).  Upserted whenever a new scan run
-- finishes and a brand-miss + competitor-mention is detected.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.aeo_content_gaps (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- The prompt where the gap was detected
  prompt_text        TEXT        NOT NULL,
  -- Short topic label derived from the prompt
  topic              TEXT        NOT NULL DEFAULT '',

  -- Competitors that were cited instead of the brand
  competitors        TEXT[]      NOT NULL DEFAULT '{}',
  -- Models that returned a brand-miss for this prompt
  models             TEXT[]      NOT NULL DEFAULT '{}',

  -- Gap urgency score  (0–100)
  score              INTEGER     NOT NULL DEFAULT 0,
  priority           TEXT        NOT NULL DEFAULT 'low'  -- high | medium | low
                       CHECK (priority IN ('high', 'medium', 'low')),

  -- Whether a crawled page already covers this topic
  content_exists     BOOLEAN     NOT NULL DEFAULT false,

  -- AI-generated content brief stored as JSON
  brief_title        TEXT        NOT NULL DEFAULT '',
  brief_outline      JSONB       NOT NULL DEFAULT '[]'::jsonb,

  -- Link to the scan run that detected this gap
  scan_run_id        UUID        REFERENCES public.prompt_scan_runs(id) ON DELETE SET NULL,

  -- Tracking
  miss_count         INTEGER     NOT NULL DEFAULT 1,
  first_detected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_detected_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One gap row per (project, prompt_text) — upsert on conflict
CREATE UNIQUE INDEX IF NOT EXISTS idx_aeo_content_gaps_project_prompt
  ON public.aeo_content_gaps(project_id, prompt_text);

CREATE INDEX IF NOT EXISTS idx_aeo_content_gaps_project_priority
  ON public.aeo_content_gaps(project_id, priority, score DESC);

-- Auto-bump updated_at
CREATE OR REPLACE FUNCTION public.set_aeo_content_gaps_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aeo_content_gaps_updated_at ON public.aeo_content_gaps;
CREATE TRIGGER trg_aeo_content_gaps_updated_at
  BEFORE UPDATE ON public.aeo_content_gaps
  FOR EACH ROW EXECUTE FUNCTION public.set_aeo_content_gaps_updated_at();

-- RLS
ALTER TABLE public.aeo_content_gaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own aeo content gaps" ON public.aeo_content_gaps;
CREATE POLICY "Users manage own aeo content gaps"
  ON public.aeo_content_gaps FOR ALL
  USING  (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

-- Realtime so the Opportunities tab updates live
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.aeo_content_gaps;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
