-- ─────────────────────────────────────────────────────────────────────────
-- PIECE 2: Prompt Runner — prompt_scan_results table
-- Stores the REAL results from querying AI models with your tracked prompts
-- ─────────────────────────────────────────────────────────────────────────

-- Individual scan result: one prompt × one AI model = one row
CREATE TABLE IF NOT EXISTS public.prompt_scan_results (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  prompt_id       UUID        REFERENCES public.aeo_prompts(id) ON DELETE SET NULL,
  -- The actual prompt text used (snapshot in case prompt is later edited)
  prompt_text     TEXT        NOT NULL,
  -- AI model queried (chatgpt | gemini | perplexity | claude | grok | deepseek)
  model           TEXT        NOT NULL,
  -- Full AI response text
  response_text   TEXT,
  -- Was the brand mentioned in the response?
  brand_mentioned BOOLEAN     NOT NULL DEFAULT false,
  -- Position of first brand mention (1 = first sentence, NULL = not mentioned)
  mention_position INTEGER,
  -- The sentence/snippet where the brand was mentioned
  mention_context TEXT,
  -- Sentiment of the brand mention (positive | neutral | negative | not_mentioned)
  mention_sentiment TEXT       NOT NULL DEFAULT 'not_mentioned',
  -- How many times the brand was mentioned total
  mention_count   INTEGER     NOT NULL DEFAULT 0,
  -- Were any competitor brands also mentioned?
  competitors_mentioned TEXT[] NOT NULL DEFAULT '{}',
  -- HTTP status / error from the model API
  status          TEXT        NOT NULL DEFAULT 'pending', -- pending | success | error
  error_message   TEXT,
  -- How long the API call took (ms)
  latency_ms      INTEGER,
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompt_scan_project_model
  ON public.prompt_scan_results(project_id, model, scanned_at DESC);

CREATE INDEX IF NOT EXISTS idx_prompt_scan_project_prompt
  ON public.prompt_scan_results(project_id, prompt_id, scanned_at DESC);

-- Scan runs: tracks a full "scan all prompts across all models" job
CREATE TABLE IF NOT EXISTS public.prompt_scan_runs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  brand_name      TEXT        NOT NULL,
  models          TEXT[]      NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'pending', -- pending|running|done|failed
  total_prompts   INTEGER     NOT NULL DEFAULT 0,
  completed       INTEGER     NOT NULL DEFAULT 0,
  brand_mentioned_count INTEGER NOT NULL DEFAULT 0,
  error           TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompt_scan_runs_project
  ON public.prompt_scan_runs(project_id, created_at DESC);

-- RLS
ALTER TABLE public.prompt_scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_scan_runs    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own prompt scan results" ON public.prompt_scan_results;
CREATE POLICY "Users manage own prompt scan results"
  ON public.prompt_scan_results FOR ALL
  USING  (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users manage own prompt scan runs" ON public.prompt_scan_runs;
CREATE POLICY "Users manage own prompt scan runs"
  ON public.prompt_scan_runs FOR ALL
  USING  (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

-- Realtime for live dashboard updates
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.prompt_scan_results;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.prompt_scan_runs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
