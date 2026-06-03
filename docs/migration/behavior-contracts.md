# Migration Behavior Contracts

## Contract 1: Next App Is Active
- `apps/web-next` is the active frontend and HTTP API server for local dev, CI, Docker, and production cutover.
- `frontend` may remain in the repository as archived legacy source, but active workflows must not depend on it.
- `apps/worker` is the background worker package and does not expose HTTP routes.

## Contract 2: Route Parity
- Preserve existing route paths (`/app/en/...`) during migration.
- Deep links/bookmarks must continue to resolve.

## Contract 3: Error Handling
- Show actionable user-facing errors for auth expiry, network timeout, and edge/worker failures.
- Avoid endless spinner states.

## Contract 4: Data Contracts
- Reuse existing Supabase schema and edge function contracts.
- Migration must not introduce DB schema breaking changes.

## Contract 5: Acceptance per Sprint
- No sprint is complete until typecheck + build + route smoke + one functional happy path pass.
