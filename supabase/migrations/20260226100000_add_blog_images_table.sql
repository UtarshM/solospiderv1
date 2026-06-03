-- Blog Images table: stores separately generated images for blog posts
CREATE TABLE IF NOT EXISTS public.blog_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT,
  image_type TEXT NOT NULL DEFAULT 'section' CHECK (image_type IN ('featured', 'section')),
  section_heading TEXT,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Disable RLS for dev (consistent with existing tables)
ALTER TABLE public.blog_images DISABLE ROW LEVEL SECURITY;

-- Enable realtime for blog_images
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_images;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
