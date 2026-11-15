# PRN232 — Catalog recipe association history and soft deletion (16 Nov 2026)

## Scope and guarantees implemented
- Both the transitional API and independently owned Catalog service now mark removed ingredient/allergen associations with `IsDeleted=true` and `DeletedAt`, preserving each composite key and enabling restoration.
- EF Core query filters exclude archived child links from member recipe details, Planner candidate reads and normal catalog reads; mutation paths use `IgnoreQueryFilters()` to locate and reactivate existing links.
- SaveChanges guards in both catalog DbContexts reject physical deletes of recipes or association rows and reject edits/deletes of `RecipeCompositionRevision` audit records.
- An append-only composition snapshot is added atomically to create/update/deactivation transactions. New built-in seed recipes also receive an initial `Seeded` snapshot exactly once; existing pre-migration recipes retain their `Imported` baseline. Captures active `foodId/amount/unit/isOptional`, active allergen IDs, recipe activity state, UTC timestamp, action, and the authenticated actor when present.
- Admin-only history APIs: `GET /api/v1/admin/recipes/{id}/history?page=1&pageSize=20` (transitional API and independent Catalog) with server-side pagination, stable order and validation.
- Migrations `20261116020000_RecipeCompositionSoftHistory` exist separately in legacy and independent Catalog owners. They add archive flags, indexes and a revision table without deleting current rows. On SQL Server, each pre-existing recipe receives one `Imported` baseline of its composition with the **migration-time UTC timestamp**, not an invented time for earlier recipe edits. Changes made *before* migration cannot be reconstructed beyond this baseline.
- Automatic downgrade is intentionally blocked to avoid discarding archived rows or immutable revisions.

## Validation already performed
- A new integration test covers create -> amount edit -> remove both ingredient and allergen -> inspect archived rows -> pagination and immutable prior snapshot -> restore -> no duplicate composite keys -> soft-deactivate and member invisibility; also rejects explicit hard delete and modification of a revision.
- Full .NET Release tests PASS: 108 unit + 125 integration = 233, zero failures. Independent Catalog builds with zero warnings.
- New seeded-recipe integration regression verifies two initial immutable baselines and idempotent reseeding.
- New SQL Server model snapshot regression creates both legacy and independent Catalog EF migration metadata without opening a DB, verifies the dictionary-compatible soft-delete filters, and asserts `HasPendingModelChanges() == false`. This directly catches the previous CI startup error.
- Independent Catalog Docker HTTP QA now also checks admin-only paginated composition history, retained quantities across edits, and deactivation snapshots. Live SQL Server migration and full Docker runtime remain release gates.

## Release and data safety
- **Do not apply migrations to the user's Docker demo SQL volumes until a verified backup and separate SQL Server migration rehearsal exist.** Do not use `docker compose down -v` on user containers.
- Verify both migration baselines against a populated SQL Server test Catalog database (including `FOR JSON PATH`, indexes and pre-existing recipe rows), and verify independent owner update/restore/readback.
- Ensure no accidental cross-owner table migrations. Planner/history reads must not surface archived associations.
- Data is user-entered/AI-assisted; snapshots are audit records, not independent nutrition or medical validation. No Gemini keys, original source PDF, DietRule versions or personal wellness data are changed.

## Known work still open
- Add end-to-end concurrency/optimistic revision checks for concurrent Admin updates and verify expected HTTP conflict handling.
- Include any other independently identified child-table retention gaps in separate reviews; this patch does not certify universal soft-deletion.
- Validate full Docker/Gateway smoke on the exact pull-request commit before merge. Full runtime UI verification and domain acceptance remain distinct gates.
