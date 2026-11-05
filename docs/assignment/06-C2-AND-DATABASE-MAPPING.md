# C2 Component Architecture & Complete Database Map

**Historical target design snapshot:** `main` commit `1962735` (2026-10-26). **Current implemented model reconciled:** 2026-11-05, branch `feature/member1-weeks2-4-implementation`. Target semantics are proposals, not production migration claims.

## Canonical files — one page per diagram

- [C0 editable Draw.io](one-page/01-c0-system-context.drawio) — **one page**, official C4 System Context.
- [C1 editable Draw.io](one-page/02-c1-container-architecture.drawio) — **one page**, target container diagram.
- [C2 editable Draw.io](one-page/05-c2-component-architecture.drawio) — **one page**, explicit six-service component **atlas**; formal C4 Level-3 scope normally covers one container per diagram, so this is a consolidated assignment-specific overview.
- [Target database source in DBML](one-page/06-database-target.dbml) — **33 entity types / 6 logical target databases**, [one-page ERD PDF](one-page/06-database-target-one-page.pdf).
- [Current mapped database source in DBML](one-page/06-database-current.dbml) — **18 mapped tables / 3 EF DbContexts**, [one-page ERD PDF](one-page/06-database-current-one-page.pdf).
- [Full file index and editing guidance](one-page/README.md). Superseded 8-page C2 and 9-page Draw.io ERD were archived out of the project, never mixed with new editable DBML sources.

## Distinguish implementation and design

| Area | In current source and Compose | In Target ADR-005 |
| --- | --- | --- |
| Runtime REST | One ASP.NET Core 9 API with Auth, Profile, Tracking and Reminder/Notification controllers | YARP Gateway + independent Identity, Catalog, Planning and Tracking services |
| SQL storage | 3 EF Core DbContexts and **18 mapped entity tables** (Identity, Tracking, Reminder Worker); SQL Server live E2E still pending | Six **logical** service-owned SQL databases; may share one SQL Server instance |
| Recommendation | Separate gRPC host skeleton | Safety filter, ranking, local read models, service-owned database |
| Worker | Separate Worker with implemented timezone-aware reminder scheduling, consumer group and outbox/inbox, tested against Redis + SQLite | Extended target workflows, retries and independent service operations |
| Messaging | Redis Streams + Identity/Tracking Outbox and Worker notification return path tested in a Redis E2E smoke (SQLite DBs) | Integration event contracts across six service owners |
| Cloudflare | Optional .NET adapter + Worker prototype built, feature flag OFF; **no live D1 configured** | Cloudflare D1 session-hash store; requires real deployment, migration and E2E |

The C2 Target diagrams are **logical component proposals**, not claims of implemented controllers, repositories, migrations, network ports or APIs.

## Canonical 33 target entity definitions and ownership

| Target SQL database | Documented entity definitions | Count |
| --- | --- | ---: |
| `LongevityIdentityDb` | Users, UserProfiles, RefreshTokens (legacy / until D1 cutover), Allergies, UserAllergies, UserExcludedFoods, Reminders | 7 |
| `LongevityCatalogDb` | Foods, Recipes, RecipeIngredients, RecipeAllergens, DietRules, RuleVersions, RuleSetVersions, RuleSetVersionItems | 8 |
| `LongevityPlanningDb` | MealPlans, MealPlanDays, PlannedMeals, Challenges, ChallengeDays, FmdSafetyAssessments, FmdCycles | 7 |
| `LongevityTrackingDb` | MealLogs, MealLogItems, ActivityLogs, EatingWindowSnapshots, AdherenceScores, ScoreDimensions, WeeklyReports | 7 |
| `LongevityRecommendationDb` | RecommendationFeedback | 1 |
| `LongevityWorkerDb` | ProcessedEvents, OutboxMessages, AuditLogs (operational representation only) | 3 |
| **Distinct logical entity types** | **All 33 documented names covered** | **33** |

**Important nuance:** This is an **ownership proposal** reconciled with the target service responsibility matrix, not an existing database migration. `OutboxMessages` is a *template replicated into every producing service's own DB*, `ProcessedEvents` into each consuming boundary, and domain `AuditLogs` into the relevant domain database. It is incorrect to centralize all publishers' outboxes inside `LongevityWorkerDb`. Therefore physical table *instances* across the six databases can exceed 33 even though the canonical distinct entity-type list is 33.

The target schema for Recommendation snapshots and Worker job state is not yet specified as full EF migrations. The dedicated ERD pages mark `CatalogSnapshots`, `RuleSnapshots`, `RankingRequests`, `WorkerJobs` and `DeadLetterEvents` **[PROPOSED]**, outside the canonical 33 definitions, rather than portraying them as implemented.

## Database integrity rules

1. Only local FKs inside one service-owned SQL database. Cross-service `UserId`, `RecipeId`, `RuleSetVersionId` and `AllergyId` are immutable/stable reference identifiers and must be resolved through APIs or versioned event read models.
2. Preserve unique indexes on `Users.NormalizedEmail`, `RefreshTokens.TokenHash`, `RuleVersions(DietRuleId,VersionNumber)`, `MealPlanDays(MealPlanId,Date)`, plus `ProcessedEvents(EventId,ConsumerName)`.
3. `MealLogItems` requires `FoodId XOR RecipeId`; `UserExcludedFoods` requires `FoodId OR FreeText`.
4. Prefer soft delete for historical Food/Recipe references. Keep audit and published rule versions immutable.
5. Domain messages use transactional Outbox within producer DB. Workers read Redis Streams instead of querying another service DB directly.
6. Cloudflare D1 is an additional optional database **outside** the six target SQL ownership boundaries. Only migrate refresh-token hashes after API changes, credential setup, consistency and replay tests, and a safe rollback plan.

## Visual / structural verification

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Validate-OnePageDiagrams.ps1` from the project root; this checks single-page Draw.io, DBML, local FKs and one-page PDFs.

This verifies XML parsing, page counts, valid edge references and canvas bounds. It does **not** assert pixel-perfect typography or that proposed target features already run; open both diagrams in diagrams.net or draw.io Desktop for visual proof. The four canonical *submission* pages are now C0, C1, C2 and Target Database ERD under `one-page/`. Historical assignment diagrams were retired to an external backup and Git history.

## Grounding

- `docker-compose.yml` and current `LongevityDietDbContext`, `AuthenticationService`, `AuthController`.
- `docs/05-SYSTEM-ARCHITECTURE.md` / `docs/06-DATABASE-DESIGN.md`.
- `docs/assignment/02-SYSTEM-ARCHITECTURE-C4.md` / `03-DATA-MODEL.md`.
- `docs/task/ARCHITECTURE-ALIGNMENT-MATRIX.md` and ADR-005.
- Cloudflare D1 Worker API / transaction and Workers Secrets docs (see security guide).
