# PRN232 Final Assignment — LongevityDiet Companion

**Source:** the user-supplied three-page PRN232 - Final Assignment.pdf.
**Goal:** build and demonstrate a distributed .NET application in a manageable
student-project scope. This document reports evidence, not production claims.

## Product scope

LongevityDiet helps members register, maintain profiles, record activities,
view educational adherence information, configure reminders and read notifications.
Administrators are authorized system users.

## Required technical deliverables

| PDF requirement | Project implementation / demonstration evidence |
| --- | --- |
| ASP.NET Core REST API, CRUD and layered code | LongevityDiet.API + Services + Repositories + Tracking |
| JWT authentication, search/filter/sort/pagination | Identity/Auth and activity endpoints; verify each in Swagger |
| Background job | LongevityDiet.Worker schedules reminders |
| Redis or Kafka: producer AND consumer | Redis Streams; Identity Outbox and Worker consumer/notification result |
| Independent gRPC service and API interaction | Recommendation gRPC deployed in its own Docker container; JWT-protected REST calls ActivityCoach.Recommend through HTTP/2; real Docker + SQL Server QA and GitHub Docker E2E PASS (11/11/2026) |
| EF Core / relational database | SQL Server; Identity, Tracking and Worker DbContexts; migrations retained |
| Docker Compose or public cloud | 6-service local/demo Docker Compose with 3 migrated SQL databases and healthy Redis; QA scripts and GitHub Linux Docker E2E PASS. This is Current Runtime, not ADR-005 target Gateway/TLS443 topology |
| API documentation | OpenAPI/Swagger |
| README, architecture, testing and demo | Root README + these assignment diagrams and tests |

## Grading focus

System architecture/design **20%**; REST API **20%**; background job **10%**;
message broker **15%**; gRPC **15%**; Docker/cloud **10%**;
documentation and presentation **10%**.

## Five official overall architecture and business-flow diagrams

- [C0 — System Context](one-page/C0.drawio)
- [C1 — Container Architecture](one-page/C1.drawio)
- [C2 — Component Architecture](one-page/C2.drawio)
- [Database Diagram — Overall](one-page/Database%20Diagram.drawio)
- [Business Flow — Overall](one-page/Business%20Flow.drawio)

[Single-page PDFs and diagram validation guide](one-page/README.md).

The official handover uses one editable Draw.io and one one-page PDF per diagram.
C1/C2 show the ADR-005 target (six domain-owned SQL catalogs); the current legacy
API and data migration remain transitional. The database view covers **50 physical tables in six target databases**:
49 explicit EF Core DbSet tables plus the implicit Catalog many-to-many
`RuleSetVersionItems` table. The diagram annotates **20 source-confirmed,
within-owner SQL foreign keys**; cross-service IDs are not SQL FKs.
Redis Streams is implemented and remains the primary business transport.
RabbitMQ/AMQP is an **optional, QA-tested, metadata-only event-audit mirror**
with a publisher and consumer in Worker Ops; it is not a substitute for the
course-required Redis producer/consumer demonstration. The ADR-005 target
must not be presented as a completed production migration.
## Presentation notes — seven official demo topics

1. System architecture: all five official C0/C1/C2/ERD/Business Flow views; explicitly distinguish **Current Runtime**, opt-in **ADR-005 Target QA**, and planned public **HTTPS :443** (no production cutover).
2. REST: JWT register/login, Food/Recipe queries, Challenge/Planner/Wellness APIs and ProblemDetails responses.
3. Background job: scheduled reminder and persisted notification; generated weekly report.
4. Message broker: Redis Streams XADD → XREADGROUP → XACK with verified Worker state/result; idempotent delivery.
5. gRPC: independent Recommendation process called from REST over HTTP/2, including unavailable handling.
6. Deployment: six-container Compose on Docker Desktop, 3 SQL DB migrations and readiness checks (not public Cloud TLS443).
7. End-to-end business: synthetic account → profile → allergy screening → 14-day meal plan → logs/LDAS → Challenge/Dashboard → FMD high-risk block → weekly report.

Reproduction: scripts/Test-Live-Docker-Acceptance.ps1, scripts/Test-Live-Admin-Rule-Governance.ps1, scripts/Test-Live-Member2-Member3.ps1, GitHub PR #22 Actions. **No instructor-observed presentation or independent dietitian approval has been claimed.** See [four-member/official-PDF audit](FOUR-MEMBER-PDF-100PCT-ACCEPTANCE-AUDIT-20261111.md).