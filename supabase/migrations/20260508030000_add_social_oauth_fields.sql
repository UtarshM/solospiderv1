-- Add OAuth/token fields for real social publishing integrations
ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS auth_type TEXT NOT NULL DEFAULT 'profile_scrape',
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meta_ig_user_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_page_id TEXT,
  ADD COLUMN IF NOT EXISTS connection_status TEXT NOT NULL DEFAULT 'connected',
  ADD COLUMN IF NOT EXISTS last_publish_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_publish_status TEXT,
  ADD COLUMN IF NOT EXISTS last_publish_error TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'social_accounts_auth_type_check'
  ) THEN
    ALTER TABLE public.social_accounts
      ADD CONSTRAINT social_accounts_auth_type_check
      CHECK (auth_type IN ('profile_scrape', 'manual_token', 'meta_oauth'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'social_accounts_connection_status_check'
  ) THEN
    ALTER TABLE public.social_accounts
      ADD CONSTRAINT social_accounts_connection_status_check
      CHECK (connection_status IN ('connected', 'disconnected', 'expired', 'error'));
  END IF;
END $$;

