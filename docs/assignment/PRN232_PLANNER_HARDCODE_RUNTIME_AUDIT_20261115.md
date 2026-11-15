# PRN232: Planner production data-source hardcode reduction (2026-11-15)

Baseline: main `2e6ef823adc402c831a8cb4631e1e0d61acab0e1`. No change to original database volume or Gemini secret.

## Problem confirmed
- Planner's `PlanningCatalogSnapshotProvider` **always** returned a six-rule C# static RuleSet even though Admin already stored `RuleSetVersion` and published `RuleVersion` records in the database.
- It also always mixed **22+** static fixture meals into the live catalog. Their nutrition numbers and recipes were team-authored examples, **not approved exact book recipes**.
- Ranking silently used fixed numeric weights when a RuleSet did not contain a scoring key, and recommendation profile resolver accepted **any** version string as `LDC-WEIGHTS-V2.0`.
- SQLite integration tests could not query active RuleSet because EF Core cannot order by `DateTimeOffset` in SQLite.

## Change implemented
1. The real Planner reads the database's active, published RuleSet via `IRuleCatalogRepository`, preserving its `VersionLabel`, publication time, source URL and version evidence metadata.
2. Only published effective versions with active rules can influence Planner. `baseWeight` is read from versioned `ParametersJson`; it must be in 0..100. Legacy JSON without `baseWeight` maps to **zero**, rather than fabricated values like 25 or 15. Old key aliases `PLANT_FORWARD_PATTERN` and `LIMIT_REFINED_SUGAR` are translated into the legacy scoring feature vocabulary; original source identifiers remain stored in DB.
3. Missing active RuleSet does **not** silently fall back to static constants in the real runtime. Explicitly opted-in synthetic Testing environments retain a fixture fallback.
4. Real-runtime candidates default to **Admin-maintained DB recipes only**, including ingredient validity and allergen filtering. Example C# candidates require `Planning:EnableDemoCandidates=true` (used only in explicit Development/Testing config). These are marked `demo-reference-v1`, with a visible 'CHẾ ĐỘ DEMO' warning on generated meal explanations. They are **not** BookExact or clinically reviewed.
5. Requested recommendation weight versions now fail closed if unknown instead of silently lying about the version used. This does **not** implement dynamic alternative weight profile editing yet; the single registered V2 profile remains explicit.
6. Add integration tests demonstrating DB-only candidates, new active published RuleSet version and `baseWeight` taking effect, and failure on missing active RuleSet; unit tests prove synthetic fixtures are explicit and unknown profile IDs are rejected.
7. SQLite path performs active-set DateTimeOffset ordering in memory, leaving production SQL Server ordering in the query.

## Operator implications / remaining honest gates
- To run without demo fixtures set `Planning:EnableDemoCandidates=false` and ensure the DB has actual eligible active recipes across needed meal slots. If missing, generation must return no-safe-candidates rather than invent dishes.
- Existing seeded RuleVersions use older JSON (`plantForwardBoost`, `rankingPenalty`), **not** explicit `baseWeight`; their baseline scores are zero unless a reviewed new version with explicit weight is published. Never retroactively edit already published versions.
- **Admin RuleSet activation is not fully exposed through CRUD UI/API in the current baseline**. A separately audited, atomic publish/activate workflow is still required; reading DB alone does not prove Admin can publish a replacement end to end.
- Fail-closed RuleSet exceptions currently use the existing ASP.NET API exception-handling path (generic error); an operator-friendly 503 diagnostic should be added separately.
- Source-review gaps remain: 54/56 Appendix A meal slots are pending full editorial review, Appendix B and book chapters are not fully checked. No BookExact / Adapted / Demo certification engine or medical certification is claimed here.
- Windows C: was almost full; validation should run via GitHub CI / isolated Docker runners rather than destroying any user SQL volume.

## Evidence
- Debug .NET build: 0 warning, 0 error.
- Unit tests: 108 passed.
- Integration tests: 117 passed.
- Web build, lint, existing Node/Vitest and two GitHub CI jobs remain merge gates.
- Source and integration tests are committed; no copyrighted PDF or secrets committed.

**Not a claim of 100% completion.** This PR removes production's hidden rule/candidate fallbacks, but an end-to-end Admin-to-Planner publication workflow, full book review and UI acceptance still remain.
