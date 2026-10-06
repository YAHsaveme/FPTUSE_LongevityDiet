# 05 — System Architecture

## 1. Architecture states
This document deliberately separates **Current Runtime** from **Target Architecture**.

### Current Runtime
The code and Docker Compose currently run:
- Web/Nginx container.
- One ASP.NET Core REST API on internal port 8080.
- One Recommendation gRPC process on 8081.
- One .NET Worker.
- One SQL Server application database.
- Redis 7 Streams on 6379.

This current state remains governed by ADR-001 and is the truth for Local Deployment.

### Target Architecture
ADR-005 defines the C1 target requested for architecture review. It is documentation/design until the corresponding service projects, data stores, migrations and Compose topology are implemented.

## 2. Target C1 containers and ports
| Container | Protocol/Port | Owned data | Responsibility |
|---|---|---|---|
| Web Application | HTTPS :443 | — | Browser UI |
| API Gateway (YARP) | public :443 / internal :8080 | — | Routing, JWT edge policy, rate limiting |
| Identity & Profile Service | REST :8081 | LongevityIdentityDb | Auth, profile, constraints |
| Catalog & Rules Service | REST :8082 | LongevityCatalogDb | Foods, recipes, rules |
| Planning Service | REST :8083 | LongevityPlanningDb | Plans, challenge, FMD tracking |
| Tracking & Progress Service | REST :8084 | LongevityTrackingDb | Logs, LDAS, progress |
| Recommendation Service | gRPC/HTTP2 :8085 | LongevityRecommendationDb | Safety filter and ranking |
| Background Worker | Ops/health :8086 | LongevityWorkerDb | Async jobs, reminders, reports |
| Event Streams | Redis :6379 | Redis persistence | Integration events |
| Local AI Runtime | HTTP :11434 optional | external | Explanation rewrite only |

SQL Server TDS is internal :1433. Local/demo may host all six logical databases in one SQL Server 2022 instance, but database ownership remains exclusive.

## 3. Gateway routing
The browser does not call internal services directly. Web Application uses the public HTTPS origin and API Gateway routes:
- auth/me -> Identity :8081
- foods/recipes/rules -> Catalog :8082
- meal-plans/challenges/FMD/recommendations -> Planning :8083
- meal/activity/eating-window/adherence/progress/reports -> Tracking :8084
- admin jobs/events/dead-letter -> Worker ops :8086

## 4. Synchronous communication
- Browser -> Web Application: HTTPS :443.
- Web Application -> API Gateway: HTTPS/REST :443.
- Gateway -> REST domain services: private REST on 8081-8084.
- Gateway -> Worker operations endpoint: private REST :8086, Admin only.
- Planning -> Recommendation: gRPC/HTTP2 :8085.
- Recommendation -> optional Local AI: HTTP/JSON :11434.
- Each service -> its own DB: EF Core/TDS :1433.

Production Target uses TLS for HTTP/gRPC service traffic. Local development may use HTTP/h2c internally where certificate setup has no assignment value; Deployment views must state which state is shown.

## 5. Service-owned data
- Identity & Profile Service -> LongevityIdentityDb.
- Catalog & Rules Service -> LongevityCatalogDb.
- Planning Service -> LongevityPlanningDb.
- Tracking & Progress Service -> LongevityTrackingDb.
- Recommendation Service -> LongevityRecommendationDb.
- Background Worker -> LongevityWorkerDb.

A service never queries another service's database. Cross-service references use stable IDs; copied read models arrive through APIs/events.

## 6. Asynchronous communication
Each domain service owns its transactional Outbox and publisher. Producers use Redis Streams XADD on :6379. Consumers use consumer groups with XREADGROUP/XACK and persist idempotency in their own database.

Primary producers: Identity, Catalog, Planning, Tracking and Worker when a result/retry/dead-letter event is required. Primary consumers: Background Worker; Recommendation may consume approved catalog/rule snapshot events for its own local read model.

Worker never polls another service's Outbox table. When Worker computes data owned by another domain, it publishes a result event and the owning service persists it.

## 7. Recommendation boundary
Recommendation remains deterministic and safety-first: validate, hard-filter allergies/exclusions, score/rank, return IDs/scores/reason codes. Natural-language AI is optional and explanation-only.

## 8. Security boundaries
- Only the public HTTPS edge is internet-facing.
- Browser never accesses SQL, Redis or gRPC directly.
- Gateway validates JWT/edge policies; each service still enforces authorization for its resources.
- SQL Server, Redis, Recommendation and Worker are private.
- No hardcoded secrets.

## 9. Failure behavior
- A service DB failure affects that service boundary rather than granting cross-service DB fallback.
- Redis failure does not roll back a committed local transaction; Outbox publication retries later.
- Recommendation failure returns a controlled unavailable/fallback response without bypassing safety rules.
- Worker failure leaves events pending.
- Local AI failure falls back to deterministic reason codes/templates.

## 10. Consistency strategy
No distributed SQL transaction spans services. Each service commits locally, publishes via its own transactional Outbox, and consumes idempotently by EventId. Eventual consistency is expected for copied read models/background results.

## 11. Deployment
Local Deployment continues to document the actual Docker Compose topology from Current Runtime. Production Target documents the intended Gateway/service/database topology from ADR-005. Updating Target C1 does not silently change docker-compose.yml.

## 12. Architecture principles
- One clear owner per domain service and logical database.
- API Gateway handles edge concerns, not business logic.
- Business rules remain inside owning services.
- Message infrastructure always has explicit producers and consumers.
- C1 stays at Container abstraction; controllers/repositories/tables stay out of C1.
- Current Runtime and Target Architecture are never mixed without explicit labels.
