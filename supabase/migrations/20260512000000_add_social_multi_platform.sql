-- Add multi-platform fields to social_accounts
ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS account_label TEXT,
  ADD COLUMN IF NOT EXISTS platform_account_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_meta JSONB DEFAULT '{}'::jsonb;

-- Drop old instagram-only constraint if exists and allow all platforms
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'social_accounts_platform_check'
  ) THEN
    ALTER TABLE public.social_accounts DROP CONSTRAINT social_accounts_platform_check;
  END IF;
END $$;

ALTER TABLE public.social_accounts
  ADD CONSTRAINT social_accounts_platform_check
  CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'twitter'));

-- Update auth_type constraint to include all methods
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'social_accounts_auth_type_check'
  ) THEN
    ALTER TABLE public.social_accounts DROP CONSTRAINT social_accounts_auth_type_check;
  END IF;
END $$;

ALTER TABLE public.social_accounts
  ADD CONSTRAINT social_accounts_auth_type_check
  CHECK (auth_type IN ('profile_scrape', 'manual_token', 'meta_oauth', 'linkedin_token', 'twitter_oauth'));
