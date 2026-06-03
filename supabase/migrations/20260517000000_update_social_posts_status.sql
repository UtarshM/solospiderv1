-- Update social_posts status constraint to include 'failed'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'social_posts_status_check'
  ) THEN
    ALTER TABLE public.social_posts DROP CONSTRAINT social_posts_status_check;
  END IF;
END $$;

ALTER TABLE public.social_posts
  ADD CONSTRAINT social_posts_status_check
  CHECK (status IN ('draft', 'scheduled', 'published', 'failed'));
