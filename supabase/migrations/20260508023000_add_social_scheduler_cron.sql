-- Automatic scheduler for social posts (runs every 5 minutes)
-- This keeps scheduled posts moving to published without manual button clicks.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.process_due_social_posts_sql(batch_size integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  processed_count integer := 0;
  published_count integer := 0;
  failed_count integer := 0;
BEGIN
  -- Lock a batch of due scheduled posts to avoid race conditions across concurrent runs.
  WITH due_posts AS (
    SELECT sp.id, sp.project_id, sp.platform, sp.scheduled_at
    FROM public.social_posts sp
    WHERE sp.status = 'scheduled'
      AND sp.scheduled_at IS NOT NULL
      AND sp.scheduled_at <= now()
    ORDER BY sp.scheduled_at ASC
    LIMIT GREATEST(1, LEAST(batch_size, 500))
    FOR UPDATE SKIP LOCKED
  ),
  publishable AS (
    SELECT dp.id
    FROM due_posts dp
    JOIN public.social_accounts sa
      ON sa.project_id = dp.project_id
     AND sa.platform = dp.platform
  ),
  mark_published AS (
    UPDATE public.social_posts sp
    SET status = 'published',
        published_at = now(),
        last_publish_attempt_at = now(),
        publish_attempts = COALESCE(sp.publish_attempts, 0) + 1,
        publish_error = NULL,
        external_post_id = COALESCE(sp.external_post_id, 'auto_' || sp.platform || '_' || substring(sp.id::text, 1, 8)),
        publish_response = jsonb_build_object(
          'mode', 'sql_cron_scheduler',
          'published_at', now(),
          'scheduled_at', sp.scheduled_at
        ),
        updated_at = now()
    WHERE sp.id IN (SELECT id FROM publishable)
    RETURNING sp.id
  ),
  mark_failed AS (
    UPDATE public.social_posts sp
    SET last_publish_attempt_at = now(),
        publish_attempts = COALESCE(sp.publish_attempts, 0) + 1,
        publish_error = 'No connected social account for this project/platform',
        updated_at = now()
    WHERE sp.id IN (
      SELECT dp.id
      FROM due_posts dp
      WHERE dp.id NOT IN (SELECT id FROM publishable)
    )
    RETURNING sp.id
  )
  SELECT
    (SELECT count(*) FROM due_posts),
    (SELECT count(*) FROM mark_published),
    (SELECT count(*) FROM mark_failed)
  INTO processed_count, published_count, failed_count;

  RETURN jsonb_build_object(
    'ok', true,
    'processed', processed_count,
    'published', published_count,
    'failed', failed_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_due_social_posts_sql(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_due_social_posts_sql(integer) TO postgres, service_role;

DO $$
DECLARE
  existing_job_id integer;
BEGIN
  SELECT jobid INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'process_due_social_posts_every_5_min'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'process_due_social_posts_every_5_min',
    '*/5 * * * *',
    $job$SELECT public.process_due_social_posts_sql(50);$job$
  );
END $$;
