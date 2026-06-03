CREATE TABLE IF NOT EXISTS public.project_ga4_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  ga4_property_id TEXT NOT NULL,
  connected_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_ga4_connections_project_id
  ON public.project_ga4_connections(project_id);

ALTER TABLE public.project_ga4_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own project ga4 connections" ON public.project_ga4_connections;
CREATE POLICY "Users manage own project ga4 connections"
ON public.project_ga4_connections FOR ALL
USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS update_project_ga4_connections_updated_at ON public.project_ga4_connections;
CREATE TRIGGER update_project_ga4_connections_updated_at
BEFORE UPDATE ON public.project_ga4_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.project_ga4_connections;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

