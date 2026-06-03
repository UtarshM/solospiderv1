# Next.js Migration Route Mapping Tracker

## Status Key
- `planned`
- `in-progress`
- `migrated`
- `verified`

## Public Routes
| Legacy Route | Next Route | Status | Notes |
|---|---|---|---|
| `/` | `/` | `migrated` | Next public homepage |
| `/features` | `/features` | `migrated` | Public marketing route |
| `/use-cases` | `/use-cases` | `migrated` | Public marketing route |
| `/about` | `/about` | `migrated` | Public marketing route |
| `/contact` | `/contact` | `migrated` | Public marketing route |
| `/blog` | `/blog` | `migrated` | Public marketing route |
| `/seo-audit` | `/seo-audit` | `migrated` | Public marketing route |
| `/pricing` | `/pricing` | `migrated` | Public marketing route |
| `/agents` | `/agents` | `migrated` | Public marketing route |
| `/auth` | `/login` | `migrated` | Legacy auth URL redirects to Next login |
| `/login` | `/login` | `migrated` | Supabase sign-in flow wired; protected redirect handled |
| `/signup` | `/signup` | `migrated` | Supabase sign-up flow wired; auth-route redirect handled |

## App Routes
| Legacy Route | Next Route | Status | Notes |
|---|---|---|---|
| `/app/en/dashboard` | `/app/en/dashboard` | `migrated` | Project list/create flow + active-project continuity |
| `/app/en/aeo/overview` | `/app/en/aeo/overview` | `verified` | Shared AEO workspace with scanner + schedule panel |
| `/app/en/aeo/prompt-generation` | `/app/en/aeo/prompt-generation` | `verified` | Prompt Lab with scanner run-state, model breakdown, and trends |
| `/app/en/media-studio` | `/app/en/media-studio` | `migrated` | Generate + persist assets with `generate-social-post` + `media_assets` |
| `/app/en/aeo/citations` | `/app/en/aeo/citations` | `verified` | Live citations table from Supabase |
| `/app/en/aeo/heatmap` | `/app/en/aeo/heatmap` | `verified` | Model visibility heatmap summary |
| `/app/en/aeo/fanouts` | `/app/en/aeo/fanouts` | `verified` | Live query fanouts data |
| `/app/en/aeo/referrals` | `/app/en/aeo/referrals` | `verified` | Live AI referral metrics list |
