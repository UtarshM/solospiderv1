-- Weekly scheduler for prompt scans (UTC-based)
-- Runs hourly and triggers the edge function for projects matching current UTC day/hour.

CREATE TABLE IF NOT EXISTS public.aeo_scan_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  week_day_utc SMALLINT NOT NULL DEFAULT 1, -- 0=Sun,1=Mon,...6=Sat
  hour_utc SMALLINT NOT NULL DEFAULT 4,     -- 0..23
  models TEXT[] NOT NULL DEFAULT ARRAY['chatgpt','gemini','perplexity','claude']::TEXT[],
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_aeo_scan_schedules_enabled_slot
  ON public.aeo_scan_schedules(is_enabled, week_day_utc, hour_utc);

ALTER TABLE public.aeo_scan_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own aeo scan schedules" ON public.aeo_scan_schedules;
CREATE POLICY "Users manage own aeo scan schedules"
  ON public.aeo_scan_schedules FOR ALL
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

-- Seed default weekly schedule for all existing projects
INSERT INTO public.aeo_scan_schedules (project_id)
SELECT p.id
FROM public.projects p
ON CONFLICT (project_id) DO NOTHING;

-- Auto-create schedule for future projects
CREATE OR REPLACE FUNCTION public.create_default_aeo_scan_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.aeo_scan_schedules (project_id)
  VALUES (NEW.id)
  ON CONFLICT (project_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_default_aeo_scan_schedule ON public.projects;
CREATE TRIGGER trg_create_default_aeo_scan_schedule
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.create_default_aeo_scan_schedule();

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Hourly trigger calls the weekly scan edge function.
DO $$
DECLARE
  existing_job_id integer;
  project_ref text := current_setting('app.settings.project_ref', true);
  service_role_key text := current_setting('app.settings.service_role_key', true);
  function_url text;
BEGIN
  IF project_ref IS NULL OR project_ref = '' THEN
    RETURN;
  END IF;

  function_url := format('https://%s.supabase.co/functions/v1/run-weekly-prompt-scans', project_ref);

  SELECT jobid INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'run_weekly_prompt_scans_hourly'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'run_weekly_prompt_scans_hourly',
    '0 * * * *',
    format(
      $cron$SELECT net.http_post(
        url:='%s',
        headers:=jsonb_build_object(
          'Content-Type','application/json',
          'Authorization','Bearer %s'
        ),
        body:='{}'::jsonb
      );$cron$,
      function_url,
      COALESCE(service_role_key, '')
    )
  );
END $$;

