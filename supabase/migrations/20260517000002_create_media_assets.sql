-- Create media_assets table
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    image_url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    enhanced_prompt TEXT,
    caption TEXT,
    hashtags TEXT[] DEFAULT '{}',
    format TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view assets of their projects" ON public.media_assets;
CREATE POLICY "Users can view assets of their projects" 
ON public.media_assets FOR SELECT 
USING (
    project_id IN (
        SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert assets for their projects" ON public.media_assets;
CREATE POLICY "Users can insert assets for their projects" 
ON public.media_assets FOR INSERT 
WITH CHECK (
    project_id IN (
        SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update assets of their projects" ON public.media_assets;
CREATE POLICY "Users can update assets of their projects" 
ON public.media_assets FOR UPDATE 
USING (
    project_id IN (
        SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete assets of their projects" ON public.media_assets;
CREATE POLICY "Users can delete assets of their projects" 
ON public.media_assets FOR DELETE 
USING (
    project_id IN (
        SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
);
