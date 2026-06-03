-- Scheduler/publish tracking fields for social_posts
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS publish_error TEXT,
  ADD COLUMN IF NOT EXISTS publish_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_publish_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS external_post_id TEXT,
  ADD COLUMN IF NOT EXISTS publish_response JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_social_posts_status_scheduled_at
  ON public.social_posts(status, scheduled_at);

