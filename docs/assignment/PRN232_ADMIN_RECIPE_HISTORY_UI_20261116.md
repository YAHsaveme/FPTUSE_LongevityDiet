# PRN232 – Read-only Admin Recipe Composition History (2026-11-16)

## User journey
1. Sign in with an Admin account (the server enforces Admin-only authorization).
2. Open **Quản trị → Công thức** (`/admin/catalog`).
3. Choose **Lịch sử** on any recipe, including an inactive recipe.
4. Browse saved revisions in server-side pages of five; see action type, Vietnam-local timestamp, optional actor ID, recipe activity state at that revision, ingredient IDs with historic quantities/units/optional flags, and recorded allergen IDs.
5. Close the read-only panel without changing catalog records.

## Correctness and scope
- Fetches only the existing Admin endpoint `GET /api/v1/admin/recipes/{id}/history?page=N&pageSize=5`, authenticated using the existing API client.
- The component parses snapshots defensively. Malformed JSON or unexpected structures produce a visible error, not a page crash.
- React Query uses the recipe ID and page in its cache key; switching recipes mounts a new panel with page 1. After recipe updates/deactivation the Admin history cache is invalidated.
- Times are displayed in `Asia/Ho_Chi_Minh` with the full year; UTC `datetime2` values without an offset are normalized to UTC before display.
- Historical Food/Allergen **IDs** are displayed accurately rather than pretending currently active names are immutable historic labels. This UI does not perform nutrition evaluation, rollback, or data mutation.
- Backend database migrations, service APIs, Gemini secrets, Docker named volumes, user SQL records, and book provenance are unchanged.

## Local verification
- `npm test`: **78/78 Vitest and 10/10 Node tests PASS**, including four new history UI tests (readback, pagination, corrupt JSON, retry and Admin page integration).
- `npm run lint`: 0 errors and warnings.
- `npm run build`: TypeScript and production Vite build PASS.

## Merge acceptance
- Merge only after `validate` and `current-runtime-release-smoke` pass on the exact PR head. Verify the panel in an authorized real browser and across desktop/mobile sizes before claiming complete UI acceptance.
- Optimistic locking for two Admins updating a recipe and populated SQL migration rehearsal remain outstanding in Issue #81.
