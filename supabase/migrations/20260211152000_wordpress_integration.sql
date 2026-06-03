-- Create workspace_integrations table
CREATE TABLE public.workspace_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('wordpress')),
  credentials JSONB NOT NULL, -- Stores { url, username, app_password }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- RLS Policies
ALTER TABLE public.workspace_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own integrations" ON public.workspace_integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own integrations" ON public.workspace_integrations
  FOR ALL USING (auth.uid() = user_id);

-- TEMPORARY: Disable RLS for development testing (consistent with previous migration)
ALTER TABLE public.workspace_integrations DISABLE ROW LEVEL SECURITY;

-- Add published columns to content_items if not exists (already added in base migration, but ensuring)
-- ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS published_url TEXT;
