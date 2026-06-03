-- Social accounts connected per project
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'instagram',
  handle TEXT NOT NULL,
  profile_url TEXT,
  profile_pic_url TEXT,
  bio TEXT,
  followers_count TEXT,
  posts_count TEXT,
  recent_captions TEXT[] DEFAULT '{}',
  recent_hashtags TEXT[] DEFAULT '{}',
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, platform)
);

-- Social posts (drafts + scheduled + published)
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'instagram',
  caption TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  image_prompt TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS for social_accounts
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own social accounts"
ON public.social_accounts FOR ALL
USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

-- RLS for social_posts
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own social posts"
ON public.social_posts FOR ALL
USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

-- Updated_at trigger for social_posts
DROP TRIGGER IF EXISTS update_social_posts_updated_at ON public.social_posts;
CREATE TRIGGER update_social_posts_updated_at
BEFORE UPDATE ON public.social_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.social_accounts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
