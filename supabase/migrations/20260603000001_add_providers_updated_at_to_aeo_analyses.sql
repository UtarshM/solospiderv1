-- Add missing columns to aeo_analyses that the scoring worker upserts into.
-- The original migration (20260423300000_add_aeo_analyses.sql) did not include
-- `providers` or `updated_at`, causing the scoring worker upsert to silently
-- drop those fields (or error on strict mode).

ALTER TABLE public.aeo_analyses
  ADD COLUMN IF NOT EXISTS providers   JSONB    NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT now();

-- Keep updated_at current on every row change
CREATE OR REPLACE FUNCTION public.set_aeo_analyses_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aeo_analyses_updated_at ON public.aeo_analyses;
CREATE TRIGGER trg_aeo_analyses_updated_at
  BEFORE UPDATE ON public.aeo_analyses
  FOR EACH ROW EXECUTE FUNCTION public.set_aeo_analyses_updated_at();

-- The scoring worker uses ON CONFLICT (project_id) DO UPDATE, so we need a
-- unique constraint on project_id if it doesn't already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.aeo_analyses'::regclass
      AND contype = 'u'
      AND conname = 'aeo_analyses_project_id_key'
  ) THEN
    ALTER TABLE public.aeo_analyses
      ADD CONSTRAINT aeo_analyses_project_id_key UNIQUE (project_id);
  END IF;
END $$;
