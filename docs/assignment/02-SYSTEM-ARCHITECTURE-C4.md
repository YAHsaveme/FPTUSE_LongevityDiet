# System Architecture - C4

## 1. Modelling rule
- Assignment C0 = official C4 System Context.
- Assignment C1 = official C4 Container view.
- C0 shows people, the whole system, and direct external systems only.
- C1 shows target deployable applications/data stores and their communication.

## 2. C0 - System Context
C0 remains intentionally simple: Guest, Member and Administrator use Longevity Diet Companion; the system may call Optional Local AI Runtime only for explanation rewriting. C0 does not show React, Gateway, services, databases, Redis, gRPC, Worker or ports.

## 3. C1 - Target Architecture
The C1 title must say **Target Architecture**. It is not a claim that the current code/Docker Compose already contains these target services.

### Target containers
| Container | Technology/Port | Data owner | Short responsibility |
|---|---|---|---|
| Web Application | React + TypeScript / HTTPS :443 | — | Browser UI |
| API Gateway | YARP + .NET 9 / :8080 behind :443 | — | Route and edge policy |
| Identity & Profile Service | ASP.NET Core / REST :8081 | LongevityIdentityDb | Auth/profile |
| Catalog & Rules Service | ASP.NET Core / REST :8082 | LongevityCatalogDb | Catalog/rules |
| Planning Service | ASP.NET Core / REST :8083 | LongevityPlanningDb | Plans/challenge/FMD |
| Tracking & Progress Service | ASP.NET Core / REST :8084 | LongevityTrackingDb | Logs/LDAS/progress |
| Recommendation Service | .NET gRPC / HTTP2 :8085 | LongevityRecommendationDb | Safety/ranking |
| Background Worker | .NET Worker + internal ops :8086 | LongevityWorkerDb | Async jobs |
| Event Streams | Redis 7 Streams :6379 | Redis persistence | Integration events |
| Local AI Runtime | external HTTP :11434 optional | external | Explanation rewrite |

All SQL databases use private EF Core/TDS :1433. Multiple logical databases may share one SQL Server instance in local/demo; ownership is still exclusive.

## 4. C1 communication
- Actors -> Web: HTTPS :443.
- Web -> API Gateway: HTTPS/REST :443.
- Gateway -> Identity/Catalog/Planning/Tracking: REST :8081/:8082/:8083/:8084.
- Gateway -> Worker operations endpoint: Ops :8086, Admin only.
- Planning -> Recommendation: gRPC/HTTP2 :8085.
- Recommendation -> optional Local AI: HTTP :11434.
- Each business service -> its own database only: EF Core/TDS :1433.
- Identity/Catalog/Planning/Tracking publish integration events to Event Streams.
- Worker consumes/acknowledges events and may publish result/retry/dead-letter events.
- Recommendation may consume approved catalog/rule snapshot events into its own read model.

Redis Streams is never isolated. Producers use XADD; consumers use XREADGROUP/XACK in supporting Dynamic views.

## 5. Database-per-service rule
Every business service has exactly one owned logical database in C1. No service may connect to another service's database. Cross-service reads use APIs or copied event-driven read models; no cross-database FK or SQL join crosses service boundaries.

## 6. Gateway rule
The Web Application never calls internal services directly. YARP API Gateway is the single public API routing boundary. Gateway performs routing, JWT edge policy, rate limiting and correlation/forwarding only; business rules remain in services.

## 7. Current Runtime versus Target Architecture
Current Local Deployment still contains one primary REST API, one Recommendation gRPC process, one Worker, one shared application database, Redis and Web/Nginx. That remains truthful until code/runtime migration occurs. Target C1 and Production Target show the approved future architecture from ADR-005.

## 8. Diagram presentation standard
- English element names.
- Minimal box text: name, type, technology/port, one short responsibility.
- Orthogonal connectors only.
- Dedicated whitespace corridor around every relationship label.
- No line through text/box; no connector crossing/overlap.
- Database visually paired directly beneath/adjacent to its owning service.
- Event Streams centered in an async lane with explicit producers/consumers.
- No controller/repository/table/class detail in C1.

## 9. Supporting views
Engineering documentation may additionally use Component, Dynamic and Deployment views. These answer different questions and must not be mixed into C1.
