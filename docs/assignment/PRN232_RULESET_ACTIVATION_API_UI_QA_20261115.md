# PRN232 — Dynamic Admin RuleSet Activation QA (2026-11-15)

Depends on PR #72, which replaced unconditional hardcoded Planner RuleSets with the persisted, active, published catalog.

## End-to-end wiring
1. Admin creates a DietRule and a source-cited draft RuleVersion using existing UI/API.
2. A different administrator must review and publish the version. Published versions are immutable, preserving historical plans.
3. In /admin/catalog → Quy tắc → Kích hoạt bộ quy tắc đã xuất bản, Admin sees the currently active RuleSet and only published versions, at most one per rule.
4. Admin enters a unique 5–80-character version label, selects eligible versions, explicitly confirms and invokes POST /api/v1/admin/rule-sets/activate.
5. Server validates Admin authorization, publication and effective dates, parent active rule, source citation, per-rule uniqueness and optional baseWeight range 0–100.
6. Repository stages a new active RuleSet and per-version ActivatedInRuleSet audit events in a SERIALIZABLE SQL transaction, marking old RuleSets inactive. It does not delete old RuleSets, published versions or historical user plans.
7. GET /api/v1/diet-rules/active-set and Planner IPlanningInputProvider.GetActiveRuleSetAsync now read the new active label and versions.

## Verified acceptance
- HTTP integration test covers Member 403, unpublished draft 400, no active RuleSet 404, independent Admin reviewer, successful activation 201, duplicate label 409, duplicate IDs 400, second version activation 201, historical RuleSet retention, exactly one active RuleSet, two audit records, and Planner receiving the new version.
- React Vitest test verifies current version display, draft excluded from selection, activation disabled until label + published version + confirmation and mutation payload.
- Full .NET tests, frontend lint/Vitest/Node/build, project-structure check and GitHub CI Docker release smoke are merge gates.
- Real user Docker SQL volumes, keys and copyrighted PDF are untouched; test DB is isolated.

## Honest remaining limits
- Independent clinical validation of nutritional policies is NOT proven; human Admin publication is not equivalent to qualified clinical review.
- Legacy seed RuleVersions use old JSON keys, not numeric baseWeight. Those default to zero rather than invent values.
- Planner fixed safety thresholds and Recommendation V2 ranking weights still exist. They are distinct from database-managed rule-weight versions and need separate versioning.
- Development/Testing explicitly enable synthetic candidates; production defaults DB-only, and no demo dish is BookExact.
- Book verification remains 2/56 fully source-page-checked meals, with 54 requiring full editorial review. No 100% original-book coverage is claimed.
- End-to-end Docker Desktop UI acceptance is blocked by lack of free C: drive capacity; GitHub Docker CI is separate evidence.
