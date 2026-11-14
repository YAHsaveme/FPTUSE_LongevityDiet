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
