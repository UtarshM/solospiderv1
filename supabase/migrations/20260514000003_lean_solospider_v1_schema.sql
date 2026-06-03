-- ====================================================================
-- LEAN SOLOSPIDER V1 CORE DATABASE SCHEMA
-- Purpose: Event-driven AI Visibility Operating System
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROJECTS TABLE (Ensuring domain, brand_name, industry exist)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    brand_name TEXT,
    industry TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add columns if table already existed
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS industry TEXT;

-- 3. PAGES TABLE (Sitemap Crawler output)
CREATE TABLE IF NOT EXISTS public.pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    content TEXT,
    embedding TEXT, -- Text representation of vector embedding
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PROMPTS TABLE (Generated Prompt Universe)
CREATE TABLE IF NOT EXISTS public.prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    topic TEXT,
    intent TEXT,
    priority TEXT DEFAULT 'medium', -- high, medium, low
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. AI_RUNS TABLE (Monitoring execution logs)
CREATE TABLE IF NOT EXISTS public.ai_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_id UUID REFERENCES public.prompts(id) ON DELETE CASCADE,
    model TEXT NOT NULL, -- openai, gemini, perplexity
    response TEXT NOT NULL,
    latency NUMERIC,
    tokens NUMERIC,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. CITATIONS TABLE (Extracted model citations)
CREATE TABLE IF NOT EXISTS public.citations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES public.ai_runs(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    domain TEXT NOT NULL,
    type TEXT NOT NULL, -- direct_link, brand_mention, recommendation
    position NUMERIC,
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. VISIBILITY_SCORES TABLE (Calculated executive telemetry)
CREATE TABLE IF NOT EXISTS public.visibility_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    mention_rate NUMERIC NOT NULL DEFAULT 0,
    citation_rate NUMERIC NOT NULL DEFAULT 0,
    share_of_voice NUMERIC NOT NULL DEFAULT 0,
    competitor_gaps JSONB DEFAULT '[]'::jsonb,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visibility_scores ENABLE ROW LEVEL SECURITY;

-- Standard Policies for user data access
CREATE POLICY "Users can manage their own projects" ON public.projects
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access pages of their projects" ON public.pages
    FOR ALL USING (EXISTS (SELECT 1 FROM public.projects WHERE id = pages.project_id AND user_id = auth.uid()));

CREATE POLICY "Users can access prompts of their projects" ON public.prompts
    FOR ALL USING (EXISTS (SELECT 1 FROM public.projects WHERE id = prompts.project_id AND user_id = auth.uid()));

CREATE POLICY "Users can access ai_runs of their prompts" ON public.ai_runs
    FOR ALL USING (EXISTS (SELECT 1 FROM public.prompts p JOIN public.projects pr ON p.project_id = pr.id WHERE p.id = ai_runs.prompt_id AND pr.user_id = auth.uid()));

CREATE POLICY "Users can access citations of their ai_runs" ON public.citations
    FOR ALL USING (EXISTS (SELECT 1 FROM public.ai_runs r JOIN public.prompts p ON r.prompt_id = p.id JOIN public.projects pr ON p.project_id = pr.id WHERE r.id = citations.run_id AND pr.user_id = auth.uid()));

CREATE POLICY "Users can access visibility_scores of their projects" ON public.visibility_scores
    FOR ALL USING (EXISTS (SELECT 1 FROM public.projects WHERE id = visibility_scores.project_id AND user_id = auth.uid()));
