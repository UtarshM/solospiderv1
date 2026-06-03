# SoloSpider End-to-End Test Checklist

## 1) Auth + Project Bootstrapping
- Sign in with a valid user.
- Create a new project from dashboard.
- Confirm toast indicates project created.
- Confirm default AEO prompts are auto-seeded.
- Open project dropdown and verify project appears immediately.

## 2) AEO Prompt Lab + Scanner
- Open `/app/en/aeo/prompt-generation`.
- Verify prompt list is non-empty on first run.
- Click `Run scan` from AEO Health Panel.
- Open `Prompt Scanner` tab and confirm:
  - run status changes to `running` then `done`
  - rows appear in prompt scan results
  - per-model breakdown cards populate
  - trend charts render:
    - Visibility Trend by Model (%)
    - Citation Share Trend by Model (mentions)

## 3) AEO Route Mapping
- Open all pages directly:
  - `/app/en/aeo/citations`
  - `/app/en/aeo/heatmap`
  - `/app/en/aeo/fanouts`
  - `/app/en/aeo/referrals`
- Confirm each opens AEO workspace content (not Coming Soon).

## 4) Competitor Compare Pack
- In AEO Health Panel click `Add competitor pack`.
- Confirm prompts added for:
  - `sitefire.ai`
  - `higoodie.com`
  - `scrunch.com`
- Re-run scan and verify competitor-oriented prompts are scanned.

## 5) Weekly Scheduler (Supabase Cron)
- Confirm migration applied successfully.
- Verify row exists in `aeo_scan_schedules` for each project.
- Ensure schedule defaults are set (`week_day_utc`, `hour_utc`, `is_enabled=true`).
- Trigger `run-weekly-prompt-scans` edge function manually once and confirm it queues/runs scans.
- Confirm `last_run_at` updates for projects processed in matching slot.

## 6) Media Studio (Image + Save Path)
- Open `/app/en/media-studio`.
- Generate one image with prompt enhancement.
- Confirm asset URL is returned and image previews in UI.
- Confirm DB insert succeeds and generated asset appears in library.
- Confirm logo-aware generation path works when project logo is present.

## 7) Error/Recovery Scenarios
- Expire session intentionally or sign out/sign in; verify no infinite loading.
- If prompt scan fails due to missing prompts:
  - click `Seed prompts`
  - click `Run scan`
  - confirm recovery without manual DB edits.

## 8) Deployment Smoke (Vercel + Supabase + Railway)
- Frontend deploy healthy on Vercel.
- Supabase edge functions reachable:
  - `run-prompt-scan`
  - `run-weekly-prompt-scans`
  - `generate-social-post`
- Railway worker health endpoint returns OK (if enabled).
- One full scan + one media generation succeeds in production environment.

