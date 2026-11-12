# ADR-005 Planning Service — Independent owner slice (11 Nov 2026)

## Implemented and locally verified
- New optional .NET 9 service `LongevityDiet.Planning` (internal :8083; QA host loopback 127.0.0.1:18083).
- Connection string is **fail-closed** to `LongevityPlanningDb`; an incorrect catalog name aborts startup.
- EF Core migrations and physically separate SQL tables: MealPlans, MealPlanDays, PlannedMeals, UserDietaryPreferences, ChallengeTemplates, ChallengeDayTemplates, UserChallenges, UserChallengeDays, FMD education/assessment/cycle tables, and PlanningOutbox.
- No Users, Foods, MealLogs, Recommendation or Worker DbSets, SQL joins, foreign DB constraints, or cross-service transaction.
- JWT authenticated GET/PUT dietary preferences. Validated mutation emits `DietaryPreferencesUpdated.v1` in the **same SQL transaction**.
- Read-only user-scoped GET meal plans/current/details, with allergy/exclusion stale-plan protection.
- Admin-only Challenge template authoring; authorized member listing, start, detail and completion with local-time future-day guard, owner checks and idempotent day completion.
- `ChallengeStarted.v1`, `ChallengeDayCompleted.v1`, and `ChallengeCompleted.v1` events are written transactionally to the Planning Outbox and published at-least-once to Redis stream `ldc:planning-events`. Consumers must deduplicate by `eventId`.
- CI validates Compose, solution build, regression tests and isolated owner SQL + HTTP/JWT + Redis QA.
- Local QA: `node scripts/Test-Planning-Service-Http.mjs` 34/34 PASS (isolated Docker project `prn232-acceptance`), 2026-11-11.

## Safe deployment boundary

**This is an opt-in slice, not Gateway cutover.** It does not replace the legacy meal-planning writer or automatically migrate users, plans, or templates. Production Gateway/Web continue to route the proven legacy behavior. No user data is silently copied between SQL databases.

## ADR-005 gaps still preventing 100% signoff

1. Deterministic, clinical-safety-screened 7-day plan generation and meal regeneration must be moved to the Planning owner with versioned Identity/Wellness and Catalog/RuleSet snapshots.
2. Existing plan/template data need an idempotent, audited backfill + per-user cutover + rollback plan.
3. Consumers/inbox projections, replay/backfill, event contracts and dead-letter paths are not complete across all owners.
4. Tracking writer and weekly report worker must stop using shared SQL; Recommendation needs its own `LongevityRecommendationDb`.
5. Gateway route ownership and Web/REST internal calls need safe rollout, authenticating internal APIs and final public HTTPS 443 deployment.
6. Run cross-service failure/rollback drills and secure team/lecturer signoff. Passing the official PDF rubric does **not** imply ADR-005's stricter six-service target is fulfilled.

## Verification
`dotnet build LongevityDiet.sln -c Release`, `dotnet test LongevityDiet.sln -c Release`,
`powershell -ExecutionPolicy Bypass -File scripts/Validate-ProjectStructure.ps1`,
`node scripts/Test-Planning-Service-Http.mjs`,
`powershell -ExecutionPolicy Bypass -File scripts/Test-Prn232-Final-Acceptance.ps1 -IncludeGatewayOutage`.
