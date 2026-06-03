ALTER TABLE public.project_ga4_connections
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sync_status TEXT,
  ADD COLUMN IF NOT EXISTS last_sync_error TEXT;

ALTER TABLE public.project_gsc_connections
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sync_status TEXT,
  ADD COLUMN IF NOT EXISTS last_sync_error TEXT;

