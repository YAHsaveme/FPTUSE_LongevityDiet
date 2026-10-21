# Architecture Alignment Matrix - 4 Weeks / 4 Members

> Source of truth: ADR-005 + `docs/assignment/02-SYSTEM-ARCHITECTURE-C4.md`. Architecture element names remain English. New feature work must respect target ownership even while transitional Current Runtime code still exists.

## Cross-task rules

1. Browser/Web never calls domain services directly; target API traffic goes through **API Gateway**.
2. Each service reads/writes only its owned logical database. No cross-service SQL join, FK, shared DbContext or transaction.
3. Cross-service synchronous calls use REST through the Gateway or private gRPC where explicitly defined; copied/read-model data moves by versioned events.
4. Every domain Outbox publisher belongs to the same service boundary as the Outbox it reads. **Background Worker must not poll another service database.**
5. Background Worker owns job/idempotency/retry/dead-letter state in **LongevityWorkerDb**. Domain results are returned by event and persisted by the owning service.
6. `Event Streams` = Redis Streams :6379. Kafka is allowed by the Assignment but is not selected by this project.
7. Target Docker deployment exposes only HTTPS :443 publicly. :8080-:8086, :1433 and :6379 stay on the **private Docker network**; containers discover one another by Docker Compose **service DNS**.
8. One physical SQL Server may host the six logical target databases for assignment cost efficiency; logical ownership remains strict.
9. Transitional Current Runtime adapters may exist only while migrating. Do not add new cross-domain coupling to the old shared API/DbContext.

## 16-task ownership matrix

| Week / Task | Owner | Target container(s) | Owned data | Primary communication / architecture rule |
|---|---|---|---|---|
| W1-T1 Identity/Auth/Profile | Member 1 | Identity & Profile Service | LongevityIdentityDb | Gateway -> REST :8081; publish `UserProfileUpdated.v1`; migrate completed baseline without changing public behavior |
| W1-T2 Catalog/Rules | Member 2 | Catalog & Rules Service | LongevityCatalogDb | Gateway -> REST :8082; publish catalog/rule version events; no Planning/Recommendation DB access |
| W1-T3 Plan/Log/Window | Member 3 | Planning Service + Tracking & Progress Service | LongevityPlanningDb + LongevityTrackingDb | REST :8083/:8084; stable IDs/API/events across the boundary; never one cross-service transaction |
| W1-T4 Distributed Slice | Member 4 | API Gateway + Recommendation Service + Background Worker + Event Streams | LongevityRecommendationDb + LongevityWorkerDb | Planning -> gRPC/HTTP2 :8085; service-owned Outbox -> XADD; Worker XREADGROUP/XACK; no central Outbox DB polling |
| W2-T1 Activity/LDAS | Member 1 | Tracking & Progress Service | LongevityTrackingDb | REST :8084; consume copied profile/rule inputs by API/event; deterministic scoring |
| W2-T2 Challenge/Dashboard | Member 2 | Planning Service + Tracking & Progress Service | LongevityPlanningDb + LongevityTrackingDb | Challenge owned by Planning; Dashboard projection owned by Tracking; event-driven projection, idempotent replay |
| W2-T3 Recommendation v2 | Member 3 | Planning Service + Recommendation Service | LongevityPlanningDb + LongevityRecommendationDb | Planning owns replacement transaction; Recommendation owns ranking/read model/feedback; private gRPC :8085 |
| W2-T4 App Shell/UX | Member 4 | Web Application + API Gateway | None | HTTPS :443; all backend calls via Gateway; no browser access to gRPC/SQL/Redis/internal ports |
| W3-T1 Reminder/Notification | Member 1 | Identity & Profile Service + Background Worker | LongevityIdentityDb + LongevityWorkerDb | Identity owns user preference/inbox state; Worker owns execution/idempotency; event result returns to Identity |
| W3-T2 Weekly Report/Reliability | Member 2 | Tracking & Progress Service + Background Worker | LongevityTrackingDb + LongevityWorkerDb | Worker computes asynchronously; Tracking persists WeeklyReport after result event; Worker never writes TrackingDb |
| W3-T3 FMD Safety/Tracking | Member 3 | Planning Service | LongevityPlanningDb | Gateway -> REST :8083; backend-enforced safety state machine; no autonomous therapeutic AI |
| W3-T4 Rule Governance/Audit | Member 4 | Catalog & Rules Service + owning domain services + Worker ops | CatalogDb + owning DB + WorkerDb ops | Rule lifecycle in Catalog; domain audit remains with owner; cross-domain operational evidence by events, not foreign DB writes |
| W4-T1 Hardening | Member 1 | Gateway + all target services + Worker | Each service-owned DB | Per-service DI/authorization/health/trace; no shared DbContext assumption in target architecture |
| W4-T2 DB/Docker/Deploy | Member 2 | Entire Cloud Docker Target | six logical SQL DBs + Redis persistence | VM -> Docker Engine -> Compose -> `ldc-network`; `sql-data` + `redis-data` on persistent disk; target communication matrix |
| W4-T3 Regression/Evidence | Member 3 | Entire system | N/A | Evidence must trace C0 -> C1 -> Deployment -> Dynamic flows and actual ports/protocols; no false implementation claims |
| W4-T4 Final Submission | Member 4 | Documentation/release integrity | N/A | Remove stale shared-API/shared-DB architecture claims; keep diagrams, ADRs, README, Compose and task docs consistent |

## Week 1 architecture bootstrap

Before feature branches diverge, freeze target contracts and project ownership:
- Member 4 creates/owns the **YARP API Gateway** skeleton and shared routing convention.
- Member 1 owns Identity service migration contract.
- Member 2 creates Catalog service/database boundary.
- Member 3 creates Planning + Tracking service/database boundaries needed by the core loop.
- Member 4 keeps Recommendation, Worker and Redis distributed slice independent.
- Public route compatibility is preserved at the Gateway; internal service implementations can evolve independently.

## Release architecture gate

Week 4 cannot claim the Target Architecture is deployed until the target Gateway/services/databases are represented by real projects/config/Compose and the target communication matrix passes. If the team intentionally ships the simpler Current Runtime instead, C1 must be relabelled/currentized rather than falsely presenting the target split as implemented.
