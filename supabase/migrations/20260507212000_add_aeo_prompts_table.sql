CREATE TABLE IF NOT EXISTS public.aeo_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  prompt TEXT NOT NULL,
  rationale TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.aeo_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own AEO prompts"
ON public.aeo_prompts FOR ALL
USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS update_aeo_prompts_updated_at ON public.aeo_prompts;
CREATE TRIGGER update_aeo_prompts_updated_at
BEFORE UPDATE ON public.aeo_prompts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.aeo_prompts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

