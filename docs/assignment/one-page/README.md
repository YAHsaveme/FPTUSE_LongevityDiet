# LongevityDiet PRN232 - Seven current Draw.io views and future nutrition target

The primary coursework views are C0, C1, C2 and a 10-table core ERD.
Current-code appendices cover the runtime sequence, all **32 mapped EF Core tables**, and a separate audit of the **9 actual SQL foreign keys**. Future nutrition schemas are documented separately and have not been migrated.

| Diagram | Editable file | PDF | Content |
| --- | --- | --- | --- |
| C0 System Context | [Draw.io](01-c0-system-context.drawio) | [PDF](01-c0-system-context.pdf) | Member and Administrator UML actors |
| C1 Containers | [Draw.io](02-c1-container-architecture.drawio) | [PDF](02-c1-container-architecture.pdf) | Web, REST, stateless gRPC, Redis, Worker, three SQL catalogs |
| C2 Components | [Draw.io](03-c2-api-components.drawio) | [PDF](03-c2-api-components.pdf) | 19 API components, no orphan module, two-way Redis |
| Core ERD | [Draw.io](04-database-core.drawio) | [PDF](04-database-core.pdf) | 10 essential tables and five local SQL FKs |
| Runtime sequence | [Draw.io](05-runtime-end-to-end.drawio) | [PDF](05-runtime-end-to-end.pdf) | Ten REST/gRPC steps, nineteen reminder steps |
| Complete physical table catalog | [Draw.io](06-full-physical-database.drawio) | [PDF](06-full-physical-database.pdf) | All 32 mapped EF Core tables; no crossing arrows |
| Actual SQL FK audit | [Draw.io](17-physical-sql-fk-audit.drawio) | [PDF](17-physical-sql-fk-audit.pdf) | All 9 real local SQL FKs, each with explicit endpoints |

The core ERD also has [editable DBML](04-database-core.dbml). The full ERD
is a source-verified appendix, not a change to the actual database migrations.

## C1: ports and real database ownership

| Container | Docker/internal | Host mapping or responsibility |
| --- | --- | --- |
| Web / Nginx | web:80 | localhost:5173 (WEB_PORT); /api proxies to api:8080 |
| REST API | api:8080 | localhost:8080 (API_PORT); Identity DB + Tracking DB |
| Recommendation gRPC | recommendation-grpc:8081 HTTP/2 | localhost:8081 (GRPC_PORT); **stateless, no SQL database** |
| Redis Streams | redis:6379 | localhost:6379 (REDIS_PORT); identity events + worker results |
| Worker | No inbound listener | Redis consumer / producer; Worker SQL database |
| SQL Server | sqlserver:1433 | localhost:14330 (SQLSERVER_PORT); three separate databases |

The SQL Server host contains LongevityDietDb, LongevityTrackingDb and
LongevityWorkerDb. The API derives its Tracking database connection and
the Worker derives its Worker database connection when no specific
override is supplied. The Web accesses REST through its Nginx proxy.

These are Docker Compose configuration defaults, not a claim that the
services are currently running. Every C1 functional container and
database has an actual dependency arrow. A request arrow implies
the synchronous response; the runtime sequence shows explicit returns.

## C2: modules, not database tables

The foundational C2 view focuses on the **identity, activity and reminder slice** of LongevityDiet.API: five controllers, their services, Identity Persistence, Tracking Persistence, a Redis Bridge and the typed ActivityCoach gRPC client. The merged API **also implements** MealPlansController, MealLogsController, EatingWindowController, RecommendationsController (V2) and FmdController, with planning/tracking/recommendation/FMD services. The C2 diagram remains a scoped educational view, **not a full inventory of all merged controllers**. Auth endpoints are anonymous; member endpoints require JWT.

The Recommendation Controller reads the user's weekly activity summary
through Tracking Service before invoking ActivityCoach gRPC. The gRPC
service is a stateless calculation host and **should not own SQL data**.

Reminder Service writes preferences + IdentityOutbox. The Bridge polls
the outbox and publishes to Redis Streams; it also consumes Worker result
events and invokes Reminder Service to persist IdentityInbox and the
notification. Two separate dashed arrows depict both event directions.
C2 is not supposed to enumerate physical SQL tables; use the ERDs.

## ERD: not every table should have a foreign key

The **10-table teaching ERD** highlights five real SQL-enforced relationships:
- UserProfiles.UserId → Users.Id (1:1).
- RefreshTokens.UserId → Users.Id (1:N).
- ReminderPreferences.UserId → Users.Id (1:1).
- UserNotifications.UserId → Users.Id (1:N).
- ScoreDimensions.AdherenceScoreId → AdherenceScores.Id (1:N).

The **current physical model** contains **21 Identity/Planning/Recommendation/FMD + 7 Tracking + 4 Worker = 32 mapped EF Core tables** across three SQL databases, with **9 enforced local SQL FKs**. The four additional FKs are MealPlanDays.MealPlanId -> MealPlans.Id, PlannedMeals.MealPlanDayId -> MealPlanDays.Id, MealLogItems.MealLogId -> MealLogs.Id and FmdCycleDays.FmdCycleId -> FmdCycles.Id. All nine appear in [the physical FK audit](17-physical-sql-fk-audit.drawio).

Some tables intentionally have **zero physical FKs**. For example,
Tracking and Worker hold UserId as a logical identity reference;
they are in separate SQL catalogs, so no SQL foreign key is enforced.
Identity/Worker/Tracking outbox and inbox tables correlate through
Redis event identifiers and application logic, not foreign keys.
Do not add fictional FK arrows merely to connect every table visually.
The C1/C2/runtime sequence shows those process-level links.

## Reproduce and verify

Run from the project root in PowerShell:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Export-CourseDiagrams.ps1
    node .\scripts\Validate-ArchitectureTopology.js
    node .\scripts\Validate-CourseLinks.js

Draw.io Desktop exports seven current-code one-page editable source/PDF pairs (01-06 and 17). PNG/SVG
inspection previews stay outside Git under
D:\PRN232\_diagram_toolkit_sources\course-c4-previews.

Checks cover every C1/C2 module and directed dependency, port labels,
actual Compose mappings, all 32 DbContext tables, the nine current local SQL FKs,
text clearance, rendered SVG paths and the 29-step execution sequence.

The local gRPC HTTP/2 and Redis smoke tests used test databases.
A full Docker Compose + live SQL Server end-to-end acceptance test is
still unverified. See [runtime evidence](../04-RUNTIME-CONNECTIVITY.md).

Pre-edit sources and Git history are safely backed up at
D:\PRN232\_LongevityDiet_C1C2_ERD_Audit_2026-11-05.

## Research-backed daily nutrition design — PROPOSAL, NOT RUNNING CODE

**Do not confuse these files with the implemented 01–06 views.** The actual EF Core
model now contains **32 mapped EF Core tables** including existing basic multi-day meal planning, logging, Recommendation V2 and FMD features; the following **52 proposed normalized nutrition tables**,
**74 proposed FKs** and seven REST feature areas are design targets requiring code, migrations,
food-source verification, user testing and professional review before use.

| Proposed artifact | Editable Draw.io | Printable PDF |
| --- | --- | --- |
| Nutrition C2 (7 API feature lanes, data ownership) | [07 C2 target](07-c2-daily-nutrition-target.drawio) | [PDF](07-c2-daily-nutrition-target.pdf) |
| Baseline, allergy, safety & consent (14 table models) | [08 Table Catalog](08-erd-nutrition-profile-safety-target.drawio) | [PDF](08-erd-nutrition-profile-safety-target.pdf) |
| Foods, recipes & every-day plan (20 table models) | [09 Table Catalog](09-erd-food-daily-plans-target.drawio) | [PDF](09-erd-food-daily-plans-target.pdf) |
| Meal logs, questionnaires & trends (18 table models) | [10 Table Catalog](10-erd-checkins-trends-target.drawio) | [PDF](10-erd-checkins-trends-target.pdf) |
| Baseline → every day → feedback → future plan loop | [11 Daily Care Loop](11-daily-care-loop-target.drawio) | [PDF](11-daily-care-loop-target.pdf) |
| Cross-sheet FK audit, 21 arrows | [12 Cross-sheet FKs](12-erd-cross-domain-foreign-keys-target.drawio) | [PDF](12-erd-cross-domain-foreign-keys-target.pdf) |
| Profile/safety local FK audit, 14 arrows | [13 Profile FKs](13-fk-profile-safety-target.drawio) | [PDF](13-fk-profile-safety-target.pdf) |
| Food/plan local FK audit, 22 arrows | [14 Food FKs](14-fk-food-daily-plans-target.drawio) | [PDF](14-fk-food-daily-plans-target.pdf) |
| Check-in/trend local FK audit, 17 arrows | [15 Tracking FKs](15-fk-checkins-trends-target.drawio) | [PDF](15-fk-checkins-trends-target.pdf) |
| C2 service-to-service call contracts (13 arrows) | [16 Dependencies](16-c2-service-dependencies-target.drawio) | [PDF](16-c2-service-dependencies-target.pdf) |

The **[52-table target DBML](08-nutrition-target-52-tables.dbml)** is the single
complete FK reference (74 proposed FKs). Detailed table catalogs deliberately
have no crossing connector spaghetti. Instead, 12–15 enumerate **all 74 FK arrows**
with explicit, attached child and parent endpoints, one relationship per row. The official DBML CLI successfully exported a **52-table / 74-FK** SQL Server preview (20 UNIQUE, 14 CHECK) without executing SQL.
`UserId` pointing to Identity is a logical reference, not a cross-database FK.

The full research, clinical-safety safeguards, patient-reported check-in schedule,
data dictionary, daily coverage rules and acceptance tests are in
[Longitudinal Nutrition Target](../05-LONGITUDINAL-NUTRITION-TARGET.md).
Run `powershell -ExecutionPolicy Bypass -File .\scripts\Export-LongevityNutritionTarget.ps1`
from the repository root to regenerate/validate all editable designs. Run `node scripts/Validate-NutritionPlanContract.js` for **20 synthetic contract scenarios**; these verify the target design, **not** the currently deployed meal planning feature.
