# PRN232 – List Query & UX Audit (2026-11-15)

Scope: `feature/prn232-list-query-ux-20261115`, built on `feature/prn232-soft-delete-book-extraction-20261114` (#66). Only bounded list querying and UI; no migrations, medical rules, book data, Gemini prompts, JWT, broker, services topology or user-owned records changed.

## API contract and exposure

| Module | Endpoint | Pagination | Search | Filters | Sort | Data protection |
|---|---|---|---|---|---|---|
| Member Food/Recipe | `/api/v1/foods`, `/api/v1/recipes` | SQL `page/pageSize` | name | category and food/recipe traits | name/category/energy or prep, created | inactive excluded, even with `isActive=false` |
| Admin Food/Recipe | `/api/v1/admin/foods`, `/api/v1/admin/recipes` | SQL; 1–100 page size | name | category, traits, isActive | existing allowlisted fields | Admin authorization required; inactive visible for legitimate management |
| Rule governance | `/api/v1/admin/rule-reviews/queue`, version history | existing SQL paging | history search | medical-sensitive or action | existing order | Admin authorization |
| Meal plans | `/api/v1/meal-plans/page` | SQL count + stable skip/take | dietary pattern | dates, Active/Superseded/Archived | generatedAt/startDate/revisionNumber | current user only; immutable historical revisions preserved |
| Meal logs | `/api/v1/meal-logs/page` | SQL count + stable skip/take | title | dates, breakfast/lunch/dinner/snack | eatenAt/localDate/calories/title | current user only; soft-deleted entries hidden |
| Challenges | `/api/v1/challenges/history/page` | SQL count + stable skip/take | template title | dates, Active/Completed/Abandoned | startDate/endDate/updatedAt | current user only |
| Weekly reports | `/api/v1/weekly-reports/page` | SQL count + stable skip/take | report summary | dates, Pending/Ready/Failed | weekStart/generatedAt/reportVersion | current user only |
| Activities | `/api/v1/activities` | existing SQL page + enhanced list | note | kind, timestamp range | startedAt/durationMinutes/kind | current user only; deleted hidden |
| Notifications | `/api/v1/notifications` | existing SQL page + enhanced list | title/body | category, read/unread | createdAt/category/title | current user only; browser foreground feed remains unfiltered |

All new history APIs use allowlisted sort fields, stable `ThenBy(Id)`, and 1–100 `pageSize` upper bound. New history endpoints do not replace legacy list endpoints. The SQLite-only `DateTimeOffset` test compatibility path sorts in memory when SQLite cannot translate `ORDER BY`; deployed SQL Server retains database-side sorting/pagination.

## UI coverage
- Food and Recipe Admin: status/category/trait filters, sort and direction, 300 ms search debounce, 10/20/50/100 rows, total count, first/previous/next/last, reset, empty state, page repair after last-page deletion.
- Planner history: collapsible meal plan and meal log browsers, searchable filter/sort/date/pageSize controls.
- Challenge history: collapsible, searchable, filters by date/status, sort + pagination.
- Weekly Reports: list/search/status/sort/pagination with direct server calls.
- Activity: note search/kind filter/sort/page-size and bounded navigation.
- Notifications: read/category/search/sort/page-size; foreground alert stream intentionally fetched separately to avoid missed alerts when visual filters change.
- Single-record detail and finite overview panels intentionally do not get artificial pagination.

## QA methodology and unresolved gates
- Run `scripts/Validate-ProjectStructure.ps1`, `dotnet build LongevityDiet.sln -c Release --no-restore`, `dotnet test LongevityDiet.sln -c Release --no-build --no-restore`; run Web `npm run lint`, `npm test`, `npm run build`.
- New integration tests: owner isolation / status / invalid queries / backward compatibility on four history endpoints; Food Admin inactive visibility; activity note/kind sort/page/owner; filtered in-app notifications with consent and idempotence.
- New React tests: admin state/filter/page controls and history query/date safety.
- No SQL schema changes or volume destruction.
- IMPORTANT: green .NET/React tests are **not** complete real-browser Docker acceptance. Pending: rebuild and launch the branch's actual source in isolated Docker QA without touching Gemini demo volumes, verify SQL Server sorting and 10/20/50/100 page navigation, screenshot/video evidence across mobile/desktop, session expiry/rate limits and browser back/refresh, representative large datasets, and independent code review.
- Out-of-scope for this list-query slice: FMD cycle listing (currently bounded `limit`), comprehensive rule catalog paging (low-volume + dependent versions), food picker autocomplete over 100 results, book-exact nutritional provenance, all child-table soft deletion, and medical/safety acceptance. These must not be presented as 100% complete.

The quality status of this document applies to the committed branch only after final tests/CI. Never conflate a code change or a passing synthetic integration test with signed-off 100% live user-journey evidence.

## Isolated Docker Desktop live acceptance — 15/11/2026

Test environment: `prn232-list-qa` with its **own** SQL Server and Redis named Docker volumes (`prn232-list-qa-sqlserver-data`, `prn232-list-qa-redis-data`), Web `127.0.0.1:55173`, API `127.0.0.1:58080`, and independent gRPC/Worker; production/default Docker demo volumes untouched. This QA is synthetically populated only. The optional Gemini key is not copied into the isolated QA stack.

- Fresh Docker Compose build and start: PASS. SQL Server and Redis healthy, API `/ready` healthy.
- Playwright Edge **real browser** (first local run): meal-plan CRUD/archive PASS; member journey initially failed because a newly added passive total-count paragraph used `role="status"`, colliding with a precise existing status locator. Removed that role from passive counts in activity/notification screens; no API changes.
- Playwright Edge retry after rebuilding **only QA Web**: 3/3 PASS (meal plan CRUD, complete member journey, keyboard navigation).
- New `list-query-ui.spec.ts`: 1/1 PASS. Actual registration/onboarding, SQL-backed plan history search/status/page-size/reset, log history empty state/slot filter, activity creation and filtering, notification filters.
- Isolated SQL Server authenticated read-only smoke: `meal-plans/page` archived 1/1 and second page 1/1 across 2 plan revisions, `meal-logs/page`, `challenges/history/page`, `weekly-reports/page`, `activities`, `notifications`, `foods` all HTTP 200 and valid `items/page/pageSize/totalItems/totalPages`; five invalid query samples returned HTTP 400. Output: `ISOLATED_DOCKER_SQLSERVER_LIST_QUERY_QA=PASS no data writes`. The synthetic account came from the QA-only meal-plan CRUD E2E.
- E2E harness now honors `PRN232_QA_WEB_BASE_URL` (default unchanged) and optional `PRN232_QA_CAPTURE_VIDEO=1`. Saved browser videos remain on the Windows development machine only, outside Git; do not commit fixtures with passwords or logs containing auth tokens.
- Initial GitHub Actions run `43627557967` on commit `74a18d5`: validate PASS; Docker E2E failed at the same pre-fix `role="status"` strict-mode ambiguity reproduced and fixed locally. New CI run is required after the fix is pushed; no claim of green CI until confirmed.
- Local QA being isolated and green does **not** prove every Admin role/large-data/mobile state or complete diet-book provenance. Those acceptance gates are separate.

### Final local browser acceptance and preserved evidence
- **Combined Playwright Edge regression: 4/4 PASS** in a single sequential QA run (`list-query-ui`, `meal-plan-crud`, `member-journey`, keyboard skip navigation). Videos were copied to `D:\\PRN232\\FPTUSE_LongevityDiet\\.local-backups\\list-qa-playwright-evidence-20261115`.
- **Opt-in isolated Admin Playwright: 1/1 PASS**. Project and volume identity verified *before* promoting exactly one newly registered synthetic account. Food status filter, search/sort/page controls, create and deactivate, re-query inactive item, Recipe sort controls were exercised on the real UI. Video and two screenshots were saved to `D:\\PRN232\\FPTUSE_LongevityDiet\\.local-backups\\list-qa-admin-playwright-evidence-20261115`.
- The new admin E2E is intentionally skipped unless `PRN232_LIST_QA_ADMIN=1`, because it writes a synthetic role directly into the **isolated QA** database only. Never enable it against the default Docker demo or another project.
- The live QA environment remained on `http://127.0.0.1:55173` to allow inspection without replacing the existing `localhost:5173` demo. These are independent Compose projects with independent named SQL/Redis volumes.
- GitHub Actions PR #67's first run `43627557967` failed at the exact status-role ambiguity found locally; the fix must receive a new successful CI run before merge. The QA project is not the user's production system.
