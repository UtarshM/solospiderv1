-- Sitefire-style AEO telemetry tables

CREATE TABLE IF NOT EXISTS public.aeo_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.aeo_analyses(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  query TEXT,
  cited_url TEXT,
  cited_title TEXT,
  position INTEGER,
  citation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.query_fanouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.aeo_analyses(id) ON DELETE SET NULL,
  root_query TEXT NOT NULL,
  engine TEXT,
  branch_query TEXT NOT NULL,
  intent TEXT,
  score NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  medium TEXT NOT NULL DEFAULT 'ai',
  landing_path TEXT,
  sessions INTEGER NOT NULL DEFAULT 1,
  conversions INTEGER NOT NULL DEFAULT 0,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bot_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  bot_name TEXT NOT NULL,
  user_agent TEXT,
  path TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aeo_citations_project_date ON public.aeo_citations(project_id, citation_date DESC);
CREATE INDEX IF NOT EXISTS idx_query_fanouts_project_created ON public.query_fanouts(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_referrals_project_date ON public.ai_referrals(project_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_bot_analytics_project_event_at ON public.bot_analytics_events(project_id, event_at DESC);

ALTER TABLE public.aeo_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_fanouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own aeo citations" ON public.aeo_citations;
CREATE POLICY "Users manage own aeo citations"
ON public.aeo_citations FOR ALL
USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users manage own query fanouts" ON public.query_fanouts;
CREATE POLICY "Users manage own query fanouts"
ON public.query_fanouts FOR ALL
USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users manage own ai referrals" ON public.ai_referrals;
CREATE POLICY "Users manage own ai referrals"
ON public.ai_referrals FOR ALL
USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users manage own bot analytics events" ON public.bot_analytics_events;
CREATE POLICY "Users manage own bot analytics events"
ON public.bot_analytics_events FOR ALL
USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.aeo_citations;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.query_fanouts;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_referrals;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_analytics_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

