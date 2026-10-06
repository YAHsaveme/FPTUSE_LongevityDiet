# C1 Target Microservices Architecture Design

Date: 2026-10-06
Project: Longevity Diet Companion
Status: Approved by user on 2026-10-06

## 1. Purpose
This specification defines the new **C1 Target Architecture** requested for the PRN232 LongevityDiet project. The target moves the current modular-distributed design toward explicit service ownership while keeping the assignment understandable, demoable, and visually clean.

The diagram must be understandable by a lecturer at a glance: English component names, minimal text, explicit communication paths, explicit ports, no isolated infrastructure, and one owned database per business service.

## 2. Architecture decision
Adopt **Database-per-Service + YARP API Gateway + Redis Streams** as the target architecture.

The target architecture is documentation/design first. It must not be presented as the current runtime until the corresponding code, Docker Compose, migrations, tests, and deployment configuration are implemented.

## 3. Non-negotiable principles
- Browser traffic enters through one public HTTPS edge.
- The Web Application does not call internal services directly.
- API Gateway is the public API routing boundary.
- Each business service owns its database and no other service reads that database directly.
- Cross-service data exchange uses synchronous APIs/gRPC or asynchronous events.
- Redis Streams must have explicit producers and consumers; it cannot appear as an isolated box.
- Recommendation Service remains an independent gRPC service.
- Optional Local AI may rewrite explanations only; it never changes safety filters or ranking.
- C1 remains a Container-level view; controllers, repositories, classes, tables, and deployment nodes do not appear on C1.
- The C1 image must remain low-text and use orthogonal connectors with dedicated label corridors.

## 4. Target containers and ports

| Container | Technology | Port | Data ownership | Responsibility |
|---|---|---:|---|---|
| Web Application | React 19 + TypeScript | 443 public | None | Browser UI |
| API Gateway | YARP + ASP.NET Core .NET 9 | 443 public / 8080 internal listener | None | Routing, auth edge, rate limiting |
| Identity & Profile Service | ASP.NET Core .NET 9 | 8081 | LongevityIdentityDb | Auth, JWT, profile, allergies, exclusions |
| Catalog & Rules Service | ASP.NET Core .NET 9 | 8082 | LongevityCatalogDb | Foods, recipes, diet rules |
| Planning Service | ASP.NET Core .NET 9 | 8083 | LongevityPlanningDb | Meal plans, challenge, FMD tracking |
| Tracking & Progress Service | ASP.NET Core .NET 9 | 8084 | LongevityTrackingDb | Meal/activity logs, LDAS, progress |
| Recommendation Service | gRPC + .NET 9 | 8085 | LongevityRecommendationDb | Safety filtering and meal ranking |
| Background Worker | .NET 9 Worker + internal operations API | 8086 internal ops/health | LongevityWorkerDb | Reminders, reports, retries, async jobs |
| Event Streams | Redis 7 Streams | 6379 internal | Redis persistence | Asynchronous event transport |
| Local AI Runtime | External HTTP API | 11434 optional | External | Explanation rewrite only |

Public exposure is limited to HTTPS :443. Internal ports are shown on C1 because the lecturer explicitly requested clear communication choices; they are still runtime contracts, not host-port deployment details.

## 5. Database ownership
Each business service owns exactly one logical database:

- Identity & Profile Service -> `LongevityIdentityDb`
- Catalog & Rules Service -> `LongevityCatalogDb`
- Planning Service -> `LongevityPlanningDb`
- Tracking & Progress Service -> `LongevityTrackingDb`
- Recommendation Service -> `LongevityRecommendationDb`
- Background Worker -> `LongevityWorkerDb`

API Gateway, Web Application, Event Streams, and Local AI Runtime do not own domain SQL databases.

For local/demo resource efficiency, these logical databases may share one SQL Server 2022 instance. Ownership remains strict: a service connects only to its own database. Production may place databases on separate physical servers later without changing the C1 ownership model.

## 6. API Gateway routing
YARP is the only public API routing container. The SPA uses the same public HTTPS origin; YARP forwards to private service ports.

| Route prefix | Target |
|---|---|
| `/api/v1/auth/**`, `/api/v1/me/**` | Identity & Profile Service :8081 |
| `/api/v1/foods/**`, `/api/v1/recipes/**`, catalog/rule admin routes | Catalog & Rules Service :8082 |
| `/api/v1/meal-plans/**`, `/api/v1/challenges/**`, `/api/v1/fmd/**`, `/api/v1/recommendations/**` | Planning Service :8083 |
| `/api/v1/meal-logs/**`, `/api/v1/activity-logs/**`, `/api/v1/eating-windows/**`, `/api/v1/adherence/**`, `/api/v1/progress/**`, `/api/v1/weekly-reports/**` | Tracking & Progress Service :8084 |
| `/api/v1/admin/jobs/**`, `/api/v1/admin/events/**`, `/api/v1/admin/dead-letter/**` | Background Worker operations endpoint :8086 |

Gateway responsibilities are limited to edge concerns: routing, JWT validation/policy enforcement, rate limiting, correlation headers, and forwarding. Business rules remain inside the owning service.

## 7. Synchronous communication
- Browser -> Web Application: `HTTPS :443`.
- Web Application -> API Gateway: `HTTPS/REST :443` public origin.
- API Gateway -> Identity Service: `HTTPS/REST :8081`.
- API Gateway -> Catalog Service: `HTTPS/REST :8082`.
- API Gateway -> Planning Service: `HTTPS/REST :8083`.
- API Gateway -> Tracking Service: `HTTPS/REST :8084`.
- API Gateway -> Background Worker operations endpoint: `HTTPS/REST :8086`, Admin only.
- Planning Service -> Recommendation Service: `gRPC / HTTP/2 :8085`.
- Recommendation Service -> Local AI Runtime: `HTTP/JSON :11434`, optional and explanation-only.
- Each service -> its own logical SQL database: `EF Core / TDS :1433`.

Target production uses TLS for HTTP/gRPC service traffic. Local Docker development may use HTTP/h2c internally when certificate management would add no assignment value; the Deployment view must state that difference explicitly.

## 8. Asynchronous communication
Each domain service writes its own Outbox record in the same transaction as its business change. The publisher for that outbox belongs to the same service boundary; no central worker may read another service's database.

Primary producers:
- Identity Service -> `UserProfileUpdated.v1`.
- Catalog Service -> catalog/rule publication events.
- Planning Service -> `MealPlanGenerated.v1` and planning workflow events.
- Tracking Service -> `MealLogged.v1`, `MealLogChanged.v1`, `ActivityLogged.v1`, `ScoreRecalculationRequested.v1`.
- Background Worker -> reminder/report completion or retry/dead-letter events when required.

Primary consumers:
- Background Worker uses consumer group `ldc-workers` for reminders, weekly reports, recalculation requests, retry and dead-letter workflows.
- Recommendation Service may consume approved catalog/rule snapshot events to maintain its own local read model in `LongevityRecommendationDb`; it never reads `LongevityCatalogDb` directly.

Background Worker never writes another service's database. When it computes a result owned by another domain (for example a weekly report), it publishes a result event; the owning service consumes that event and persists the result in its own database.

Redis operations shown only where useful: producers use `XADD`; consumers use `XREADGROUP` and `XACK`; failed events may be `XADD`ed to the dead-letter stream.

## 9. C1 visual composition
The final C1 must stay visually simple despite the larger target architecture.

Layout direction: top-to-bottom for user traffic, left-to-right for service/database ownership.

Recommended bands:
1. Actors at the top.
2. Web Application and API Gateway below the actors.
3. Four REST domain services in one row.
4. One database directly beneath each domain service.
5. Recommendation Service with its database in a separate internal lane connected from Planning by gRPC.
6. Background Worker with WorkerDb in an async lane.
7. Event Streams centered between async producers/consumers so every Redis relationship is visible.
8. Local AI Runtime outside the system boundary, connected only to Recommendation Service.

Each container box is limited to four short lines: Name, C4 type, technology/port, one short responsibility. Relationship labels must be short protocol/port labels rather than sentences.

No connector may cross a box, overlap another connector, or pass through a label. Labels must use reserved whitespace corridors. All connectors are orthogonal.

## 10. Data consistency and ownership
Cross-service transactions are not implemented with shared SQL transactions. Each service commits locally and publishes integration events through its own transactional outbox.

Required rules:
- No foreign key crosses service database boundaries.
- Cross-service references use stable IDs only.
- Read models are copied by API/event contracts, not SQL joins across service databases.
- Consumers are idempotent by EventId.
- Event contracts are versioned.
- Eventual consistency is expected for copied read models and background-derived data.

## 11. Security and failure behavior
- Only the public HTTPS edge is internet-facing.
- SQL Server and Redis remain private infrastructure.
- Gateway validates JWT and applies edge policies; services still enforce authorization relevant to their owned resource.
- Browser never calls gRPC, Redis, or SQL directly.
- Recommendation gRPC is private.
- Local AI is optional; failure falls back to deterministic reason codes.
- Redis failure must not roll back an already committed service transaction; unpublished Outbox rows retry later.
- Recommendation failure returns a controlled fallback/service-unavailable path without bypassing safety rules.
- Worker failure leaves events pending for later processing.

## 12. Current runtime versus target architecture
The current repository still contains one primary REST API, one Recommendation gRPC service, one Worker, one SQL database, Redis Streams, and Web/Nginx. Therefore all newly split services/databases/gateway are **Target Architecture** until implementation is completed.

The documentation must preserve this distinction:
- C0 remains current business/system context unless external systems change.
- C1 becomes `Target Architecture` and must say so in its title.
- Local Deployment view continues to document the actual Docker Compose topology until Compose is migrated.
- Production Target view documents the intended secure target topology.
- ADR-001 must be superseded or amended before code/runtime boundaries are changed.

## 13. Implementation impact
When implementation begins, the change will require coordinated updates to:
- service projects and solution structure;
- YARP Gateway configuration;
- service-specific DbContexts, migrations, connection strings, and databases;
- Docker Compose services, ports, health checks, dependencies, and private networking;
- REST routing and internal contracts;
- gRPC endpoint configuration;
- per-service transactional outbox publishers;
- Redis Streams producers/consumers and idempotency;
- tests, CI validators, architecture docs, ADRs, C4 DSL, Draw.io sources, PNG/SVG exports, and README/project guardrails.

No existing business behavior should be silently removed during the split. Endpoint compatibility at the public Gateway boundary should be preserved wherever practical.

## 14. Architecture skill and reference policy
Use the project-local architecture skill chain plus current upstream sources. Official C4, Microsoft .NET microservices/data-ownership/API Gateway guidance, Redis Streams documentation, YARP documentation, diagrams.net conventions, and the lecturer's Architecture Decision Studio requirements take precedence over decorative examples.

Skill updates must be reviewed before copying. Duplicate or low-value repositories must not be added merely to increase the number of skills. Architecture tools must improve C4 correctness, Draw.io geometry, collision detection, source-backed relationships, validation, or export quality.

## 15. Acceptance criteria
The architecture work is accepted only when all of the following are true:

1. C1 title clearly says `Target Architecture` or `Target MVP`.
2. Every business service has exactly one owned logical database shown directly beneath/adjacent to it.
3. No service has a direct arrow to another service's database.
4. Web Application reaches backend services only through API Gateway.
5. Gateway route ownership is documented and public endpoint compatibility is preserved.
6. Ports are explicit and consistent: 443, 8080, 8081, 8082, 8083, 8084, 8085, 8086, 6379, 1433, and optional 11434.
7. Planning -> Recommendation is explicit gRPC/HTTP2 on :8085.
8. Event Streams has explicit producer and consumer relationships; Redis is not isolated.
9. Background Worker owns WorkerDb and communicates with Event Streams; it does not directly query another service database.
10. Recommendation Service owns RecommendationDb and does not query Identity/Catalog/Planning/Tracking databases.
11. Local AI Runtime is external, optional, and explanation-only.
12. No C1 box contains controller/repository/table/class details.
13. English names are used for architecture elements.
14. Text is minimal and no label touches/crosses a connector.
15. Draw.io geometry lint reports no diagonal, text intersection, box intersection, connector crossing, or connector overlap issues.
16. Structurizr DSL and Draw.io represent the same C1 elements and relationship directions.
17. Documentation explicitly distinguishes current runtime from target architecture.
18. Updated ADR documents the change from the previously accepted modular-distributed architecture.
19. Architecture validators and project-structure validation pass after implementation.
20. C0 remains focused on actors, the system, and direct external systems; microservice internals do not leak into C0.

## 16. Out of scope for this architecture revision
- Kubernetes, service mesh, Kafka, event sourcing, CQRS infrastructure, distributed transactions, and separate physical SQL Server hosts are not required.
- Splitting services more finely than the four REST domain services plus Recommendation and Worker is not required.
- Local AI is not a ranking engine and is not mandatory for core operation.

These exclusions keep the target architecture teachable and achievable while satisfying the lecturer's service/database/gateway/communication requirements.
