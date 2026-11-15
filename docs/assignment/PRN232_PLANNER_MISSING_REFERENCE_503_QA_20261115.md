# PRN232 — Planner missing reference data: fail-closed API/UI audit (15 Nov 2026)

## Confirmed defect before this change
The persisted RuleSet integration introduced in PR #72 intentionally rejected a missing or invalid published RuleSet, but did so with ordinary InvalidOperationException. ASP.NET Core's generic exception handler produced an unhelpful HTTP 500. Similarly, when production DB contained no eligible active recipes, the Planner would eventually report no-safe-candidates, hiding an administrative catalog deficiency among user-allergen safety failures.

## Implemented
- A typed PlanningCatalogUnavailableException, carrying one of four allowlisted codes: planning_rules_unavailable, planning_rules_not_effective, planning_rules_invalid, planning_catalog_empty.
- Database-provider I/O exceptions and unrelated programming exceptions remain ordinary server faults; they are never reclassified as business-precondition errors.
- A scoped ASP.NET exception handler renders safe HTTP 503 RFC 7807 ProblemDetails, includes machine-readable code and correlation traceId, and disables caching. No raw parameters, SQL or stack traces are included.
- Missing/premature/invalid persisted published rules or malformed parameters use this handler. The production recipe source also fails closed if no eligible recipes exist and no demo fixture is enabled.
- The frontend displays specific Vietnamese administrator-action messages only for four recognized HTTP 503 codes. All other 5xx retain generic messaging to avoid leaking internal exception details.
- Existing synthetic Development/Testing fixture opt-ins stay unchanged. Real non-demo mode never invents substitute recipes or weights.

## Validation on synthetic isolated SQLite and frontend
- Two real authenticated POST /api/v1/meal-plans/generate integration tests use production-style flags with no demo candidates and no RuleSet fallback; assert 503, problem+json, exact code and zero persisted meal plans (missing RuleSet and no eligible active recipes).
- Existing DB-only rule/recipe integration tests adapted to check the typed exception without weakening safety gates.
- Frontend tests cover four actionable 503 codes and ensure arbitrary 503 / standard 500 details remain hidden.
- Full local .NET 108 unit + 121 integration = 229 PASS, frontend Vitest 46 PASS, Node 10 PASS, lint 0 errors, Vite build PASS, .NET build 0 errors/0 warnings.
- Merge condition: GitHub validate and current-runtime-release-smoke must both succeed on the exact PR commit.

## Evidence limits
This is not proof of 100% book fidelity, medical correctness, or a complete Docker Desktop acceptance. The separate source audit still lists 54 of 56 Appendix A meals requiring editorial confirmation; the separate dynamic Recommendation WeightProfile V2 remains a future migration. Preserve actual SQL volumes and secrets; low Windows C: storage must be addressed safely before attempting a new Docker Desktop live demo.
