# ADR-005 Catalog Rule Governance — acceptance matrix (11/11/2026)

## Release boundary

This is an opt-in Catalog-owned `LongevityCatalogDb` service. Its default Gateway/Web routing is NOT cut over. PR #29 depends on Food/Recipe owner changes in PR #28. Do not merge PR #29 ahead of PR #28. Neither PR authorizes a main release, clinical approval, or team-reviewer sign-off.

## Executable verification

Run from the repository root against an isolated `prn232-acceptance` Docker Compose project with localhost ports and synthetic QA accounts:

```powershell
node scripts/Test-Catalog-Service-Http.mjs
node scripts/Test-Catalog-Admin-Http.mjs
dotnet test LongevityDiet.sln -c Release --no-build
node scripts/Validate-Prn232-Final-PDF.cjs
```

## Critical invariants covered in the Docker Admin test

- Admin JWT is required to write Food, Recipe or DietRule data; Member is denied by role, and unauthenticated requests return 401
- Synthetic QA promotion affects exactly one account registered for the current run; other accounts remain untouched
- Food/Recipe CRUD persists in CatalogDb, validates owned Food/Allergen IDs and refuses deleting an ingredient still used by an active recipe
- New DietRule and RuleVersion require valid provenance and unique JSON parameters, with a unique rule key
- RuleVersion state transitions Draft → InReview → Published → Retired reject illegal transitions
- Publication requires a second, distinct Admin from the last submitter
- Published rule content and rule metadata remain immutable
- Version history is append-only, records the authenticated Admin ID with fixed non-sensitive action strings, and survives retirement
- Member endpoints do not expose Draft or Retired rules
- Verification checks actual SQL rows, not just API status codes
- Existing Gateway/legacy API remains ready and untouched

## What this does not prove

- No approval from a lecturer, independent nutrition specialist or assigned team reviewer
- No ownership transfer of default Gateway/Web endpoints, RuleSet activation, historical plan impact, downstream event/outbox propagation, or six-DB Target cutover
- No production access or public HTTPS443 readiness
- No validation of the medical suitability of synthetic rule parameters

CI must run the full Docker smoke through GitHub Actions for the new PR head commit; do not infer pass status from local green tests.
