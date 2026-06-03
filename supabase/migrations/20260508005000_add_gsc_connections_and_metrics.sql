CREATE TABLE IF NOT EXISTS public.project_gsc_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  site_url TEXT NOT NULL,
  connected_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gsc_query_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  page TEXT,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC NOT NULL DEFAULT 0,
  position NUMERIC NOT NULL DEFAULT 0,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_gsc_connections_project_id
  ON public.project_gsc_connections(project_id);
CREATE INDEX IF NOT EXISTS idx_gsc_query_metrics_project_date
  ON public.gsc_query_metrics(project_id, metric_date DESC);

ALTER TABLE public.project_gsc_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gsc_query_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own project gsc connections" ON public.project_gsc_connections;
CREATE POLICY "Users manage own project gsc connections"
ON public.project_gsc_connections FOR ALL
USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users manage own gsc query metrics" ON public.gsc_query_metrics;
CREATE POLICY "Users manage own gsc query metrics"
ON public.gsc_query_metrics FOR ALL
USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS update_project_gsc_connections_updated_at ON public.project_gsc_connections;
CREATE TRIGGER update_project_gsc_connections_updated_at
BEFORE UPDATE ON public.project_gsc_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.project_gsc_connections;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.gsc_query_metrics;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

