# PRN232 — MealLogItem Non-Destructive Edit Audit (2026-11-15)

## Actual defect
Before this change, editing a meal log triggered `MealLogItems.RemoveRange(...)` in both the legacy REST-backed repository and independent Tracking-owned service. This **hard-deleted historical ingredient rows** and prevented reconstructing older meal revisions, despite the parent `MealLog` already being soft-deleted on delete.

## Change and semantics
- Add `IsDeleted` and `DeletedAt` to the shared `MealLogItem` entity; both initial SQL defaults keep existing items active.
- The legacy repository and Tracking owner both mark existing active items archived and INSERT new items during an edit. They do not delete old rows.
- EF Core query filters in **both** DbContexts hide archived children from ordinary reads; use `IgnoreQueryFilters()` only in controlled audit/testing.
- DTO projection, response snapshots and Tracking owner nutritional aggregation include active entries only; archived meals are not added to totals.
- Current meal item entry IDs are new GUIDs for each revision. The log's own ID is stable. This retains a minimal revision history without exposing it to ordinary users.
- EF Core migration files generated from real DbContexts with local `dotnet-ef 9.0.20`, not handcrafted; both migrations are additive. Rollback drops of `IsDeleted`/`DeletedAt` are blocked because they would destroy history.

## Acceptance checks
1. Legacy HTTP POST → PUT → GET/list preserves the original ingredient, visible only through explicit forensic query; edited DTO contains one current item and its new nutrient aggregate.
2. Tracking-owned database persists one archived and one current child and query filters hide archived entries.
3. Unit test of legacy service fake verifies original child archived with deterministic `TimeProvider` timestamp.
4. `dotnet build LongevityDiet.sln -c Debug --no-restore`: 0 warning, 0 error.
5. `dotnet test LongevityDiet.sln -c Debug --no-build --no-restore`: 107 unit + 115 integration (222), all green.
6. `scripts/Validate-ProjectStructure.ps1` PASS.
7. GitHub Action `validate` and Docker release smoke must pass on PR before any merge.

## No data loss / isolation
The original user Docker SQL volume `longevity-gemini-demo-sql-data` is **not** reset, dropped or rebuilt as an empty volume. Do not run `docker compose down -v`. CI/isolated QA uses separate SQL instances and synthetic accounts. New columns default to active, retaining existing history.

## Not yet covered
- Every CRUD entity across the product has not been separately certified by this targeted change.
- Physical deletion of a parent directly by administrative SQL could still cascade; ordinary API delete uses soft deletion. Wider policy and database retention rules need separate review.
- The completeness of original book recipes, AI menu provenance and the video of every UI user journey remain independent acceptance gates.
