-- AEO Analyses stored per project
CREATE TABLE IF NOT EXISTS public.aeo_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  website TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  -- Scores per AI provider (0-100)
  chatgpt_score INTEGER,
  gemini_score INTEGER,
  claude_score INTEGER,
  perplexity_score INTEGER,
  overall_score INTEGER,
  -- Category breakdown JSON
  category_scores JSONB DEFAULT '[]',
  -- AI insights per provider JSON
  ai_insights JSONB DEFAULT '{}',
  -- Recommendations JSON
  recommendations JSONB DEFAULT '[]',
  -- Raw prompt suggestions
  prompt_suggestions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.aeo_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own AEO analyses"
ON public.aeo_analyses FOR ALL
USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.aeo_analyses;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
