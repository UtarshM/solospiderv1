# Next.js Migration Status Board

Last updated: 2026-05-21

## Summary
- React (Vite) to Next.js migration is complete for the migrated app surface.
- Next app compiles and builds cleanly.
- Automated smoke validates auth, project bootstrap, prompt seeding, prompt scan, media generation/save, and scheduler table presence.
- Local dev, CI, Docker, root build/typecheck commands, and HTTP APIs now target the Next app.

## Completed in Next.js
- Auth + protected routing (`/login`, `/signup`, `/app/*`) with redirect protection.
- Dashboard project creation + active-project continuity.
- AEO workspace routes:
  - `/app/en/aeo/overview`
  - `/app/en/aeo/prompt-generation`
  - `/app/en/aeo/citations`
  - `/app/en/aeo/heatmap`
  - `/app/en/aeo/fanouts`
  - `/app/en/aeo/referrals`
- Prompt scanner workflows:
  - default prompt seed
  - competitor pack seed
  - run-state panel
  - per-model breakdown
  - visibility trend by model
  - citation share trend by model
  - missing-prompt recovery auto-seed + retry
- Media Studio:
  - generation draft + image generation call
  - asset persistence to `media_assets`
  - asset library rendering
  - auth/network recovery UX
  - retry-last-generation path
- Content, SEO, ads, backlink, and settings routes now resolve to migrated project-aware Next pages instead of placeholder screens.
- HTTP endpoints are available as Next route handlers under `/api/*`.
- `apps/worker` runs BullMQ jobs and cron tasks as a background worker service.
- Weekly scheduler table and trigger path are present on the connected Supabase project.

## Automated Smoke Result
Script: `apps/web-next/scripts/next-migration-smoke.mjs`

Latest verified result:
- `auth`: true
- `project_created`: true
- `default_prompts_seeded`: 4
- `competitor_prompts_seeded`: 4
- `prompt_scan.triggered`: true
- `prompt_scan.status`: done
- `prompt_scan.completed`: 24
- `prompt_scan.total`: 24
- `prompt_scan.rows`: 24
- `media_studio.generated`: true
- `media_studio.saved`: true
- `scheduler.function_deployed`: true
- `scheduler.table_present`: true

## Remaining Non-Code Work
- Run a final human browser pass on the deployed Next URL.
- Remove the archived `frontend` source folder after the rollback window, if no one needs it for reference.
- Keep external callers on the Next `/api/*` URLs.

## Operational Commands
- `npm run typecheck --prefix apps/web-next`
- `npm run typecheck --prefix apps/worker`
- `npm run build --prefix apps/web-next`
- `npm run build --prefix apps/worker`
- `npm run dev`
- `docker compose up --build`
- `curl http://localhost:3000/api/health`
- `cd apps/web-next && npm run smoke:migration`
