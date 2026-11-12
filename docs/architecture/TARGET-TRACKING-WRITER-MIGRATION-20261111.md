# ADR-005 Tracking writer and MealLog owner — QA checkpoint (2026-11-11)

## New opt-in service
- `LongevityDiet.Tracking.Api` (.NET 9 REST process, internal port 8084; loopback QA 127.0.0.1:18084).
- Uses `LongevityTrackingDb` ONLY, with connection catalog name checked on startup. No Users/Plans/Foods/Worker SQL DbSets, cross-DB SQL FK, join or transaction.
- JWT access token validation uses the Identity issuer/audience/signing key. For every owner operation, Tracking forwards that same token to the fixed private Identity REST `GET /api/v1/profile` to verify the active user ID and user time zone. It never reads Identity SQL. Identity failures fail closed.
- Activity and goal REST endpoints: create/update/soft delete/list, **GET /activities/{id} scoped to the JWT owner**, daily + weekly summary, target editing, and LDAS latest/date/history via the existing `TrackingService`. Foreign-user and soft-deleted IDs return HTTP 404; anonymous requests return HTTP 401.
- Newly migrated Tracking-owned `MealLogs`, `MealLogItems`, `EatingWindowSnapshots` tables and source-of-evidence `TrackingScoreSignals`; no Catalog or Planning FK. MealLog CRUD and daily/range Eating Window REST, SQL transactionally recompute windows and signals on edit/delete/date shift. Cross-local-midnight handling is from verified Identity IANA time zone.
- Missing meal/window signals stay missing, not scored as zero. For this isolated educational prototype, meal-count adherence is capped at 100% of the user's reported meal frequency and window compliance is only observed for >=2 caloric meals. This is NOT nutritional validation or clinical advice. Food names/calories/macros are user-submitted estimates, not Catalog-approved data.
- ActivityLogged.v1, ActivityDeleted.v1 and MealLogChanged.v1 produced in the same Tracking SQL transaction as their domain changes; the local Tracking Outbox publisher writes to `ldc:tracking-events` using Redis Streams at-least-once. Consumers MUST deduplicate by eventId.
- Explicitly restrict Docker QA to isolated `prn232-acceptance` and localhost loopback. `scripts/Test-Tracking-Writer-Http.mjs` verifies JWT and IDOR, separate SQL, profile lookup, write/soft-delete, user isolation, goal mutation, LDAS missingness, cross-midnight edits, SQL rollback safety, event persistence and Redis delivery.

## Deliberately unchanged
Current Gateway/Web route to the legacy current runtime, not to this optional owner. No existing user or MealLog is silently migrated, duplicated or overwritten. Production cutover, identity backfill, replay and rollback need separate audit and user approval. `develop` and `main` remain protected from direct changes before CI/PR review.

## ADR-005 still pending
1. Full Planning deterministic generation from **versioned** Identity, Wellness, Catalog and Rules read-model contracts; not yet cut over.
2. Proper event consumers/inbox dedupe/read models for Gateway, Progress, Planning and Weekly Worker; upserts and cross-process retry/dead-letter recovery.
3. Recommendation database `LongevityRecommendationDb`; Worker fully isolated query/read-models; final domain ownership matrix.
4. Safe audited data migration and opt-in Gateway switch for Identity/Catalog/Planning/Tracking; public HTTPS443 deployment and tested rollback.
5. Team reviewer signoff, professor demo and clinical review (not implied by automated QA).
6. Stronger concurrent-write load, race protection and failover drills needed before production deployment.

This PR is an isolated migration slice, **not** a declaration of 100% ADR-005 compliance or a 100/100 course grade.

## Post-merge follow-up — 12 November 2026

The earlier read-only Tracking PR #27 contained `GET /api/v1/activities/{id}`.
The replacement opt-in Tracking writer now implements the same owner-scoped
lookup via `TrackingService.GetByIdAsync` with `AsNoTracking`, strict
`UserId` and `!IsDeleted` predicates. A missing, foreign or deleted record
returns 404, never another user's data; unauthenticated requests return 401.
This completes the missing single-activity read contract without adding a
second parallel Tracking host or cross-database access.

`node scripts/Test-Tracking-Writer-Http.mjs` now includes actual SQL/JWT E2E
checks for owner 200, other-user 404, anonymous 401, unknown ID 404,
and post-delete 404. Verified on the isolated Docker QA project:
**63/63 cases PASS**, .NET Release build **0 warnings/errors**, and
**172/172 .NET unit+integration tests** PASS.

The legacy PR #27 should be treated as a superseded transition prototype;
do not merge a second read-only host into the new writer implementation.
These QA results do not authorize production cutover.
