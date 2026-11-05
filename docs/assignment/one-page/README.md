# LongevityDiet PRN232 — Six editable Draw.io diagrams

The primary coursework views are C0, C1, C2 and a 10-table core ERD.
Two appendices cover the complete runtime sequence and all 18 physical tables.

| Diagram | Editable file | PDF | Content |
| --- | --- | --- | --- |
| C0 System Context | [Draw.io](01-c0-system-context.drawio) | [PDF](01-c0-system-context.pdf) | Member and Administrator UML actors |
| C1 Containers | [Draw.io](02-c1-container-architecture.drawio) | [PDF](02-c1-container-architecture.pdf) | Web, REST, stateless gRPC, Redis, Worker, three SQL catalogs |
| C2 Components | [Draw.io](03-c2-api-components.drawio) | [PDF](03-c2-api-components.pdf) | 19 API components, no orphan module, two-way Redis |
| Core ERD | [Draw.io](04-database-core.drawio) | [PDF](04-database-core.pdf) | 10 essential tables and five local SQL FKs |
| Runtime sequence | [Draw.io](05-runtime-end-to-end.drawio) | [PDF](05-runtime-end-to-end.pdf) | Ten REST/gRPC steps, nineteen reminder steps |
| Full physical ERD | [Draw.io](06-full-physical-database.drawio) | [PDF](06-full-physical-database.pdf) | All 18 mapped EF Core tables, five real SQL FKs |

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

C2 correctly expands only LongevityDiet.API: five controllers and their
services, Identity Persistence, Tracking Persistence, a hosted Redis
Bridge, and the typed gRPC client. Auth endpoints are anonymous; member
endpoints require JWT.

The Recommendation Controller reads the user's weekly activity summary
through Tracking Service before invoking ActivityCoach gRPC. The gRPC
service is a stateless calculation host and **should not own SQL data**.

Reminder Service writes preferences + IdentityOutbox. The Bridge polls
the outbox and publishes to Redis Streams; it also consumes Worker result
events and invokes Reminder Service to persist IdentityInbox and the
notification. Two separate dashed arrows depict both event directions.
C2 is not supposed to enumerate physical SQL tables; use the ERDs.

## ERD: not every table should have a foreign key

Exactly five SQL-enforced relationships exist in the current EF models:
- UserProfiles.UserId → Users.Id (1:1).
- RefreshTokens.UserId → Users.Id (1:N).
- ReminderPreferences.UserId → Users.Id (1:1).
- UserNotifications.UserId → Users.Id (1:N).
- ScoreDimensions.AdherenceScoreId → AdherenceScores.Id (1:N).

The full physical ERD contains **7 Identity + 7 Tracking + 4 Worker**
tables, checked against actual DbContext table mappings.

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

Draw.io Desktop exports six one-page editable source/PDF pairs. PNG/SVG
inspection previews stay outside Git under
D:\PRN232\_diagram_toolkit_sources\course-c4-previews.

Checks cover every C1/C2 module and directed dependency, port labels,
actual Compose mappings, all 18 DbContext tables, the five local SQL FKs,
text clearance, rendered SVG paths and the 29-step execution sequence.

The local gRPC HTTP/2 and Redis smoke tests used test databases.
A full Docker Compose + live SQL Server end-to-end acceptance test is
still unverified. See [runtime evidence](../04-RUNTIME-CONNECTIVITY.md).

Pre-edit sources and Git history are safely backed up at
D:\PRN232\_LongevityDiet_C1C2_ERD_Audit_2026-11-05.
