# 10 — PRN232 Final Assignment Traceability

This document maps the user-provided **PRN232 – Final Assignment** to concrete project artifacts.

## Objective
The assignment requires a distributed .NET application demonstrating RESTful API, asynchronous messaging, background processing, inter-service communication, containerization and deployable behavior.

**Project mapping:** REST API + Redis Streams + Worker + gRPC Recommendation + Docker Compose.

## 2.1 REST API Service
| Assignment requirement | Implementation |
|---|---|
| At least one ASP.NET Core REST API | LongevityDiet.API |
| RESTful design/naming | /api/v1 resources, proper methods/status |
| CRUD core entities | Profile/log/catalog/plan/rules |
| Layered architecture | API → Services → Repository |
| JWT | Access + refresh token |
| Search/filter/sort/pagination | Food, Recipe, Admin collections |

## 2.2 Background Job
The assignment accepts notifications, data synchronization, reports, cleanup and other business background work.

**Implementation:**
- Reminder scheduling.
- Weekly progress report generation.
- Outbox publishing.
- Event retry/dead-letter handling.

Service: `LongevityDiet.Worker`.

## 2.3 Message Broker
The assignment allows Apache Kafka or Redis Pub/Sub/Streams and requires at least one producer + consumer.

**Implementation:** Redis Streams.
- Producer: Outbox Publisher / API-originated domain event.
- Consumer: Worker consumer group `ldc-workers`.
- DLQ: `ldc.dead-letter`.

## 2.4 gRPC Service
The assignment requires an independent gRPC service and REST↔gRPC interaction; recommendation is listed as a typical use case.

**Implementation:** `LongevityDiet.Recommendation.Grpc`.
Flow: REST API → gRPC RankMeals → ranked candidates/reason codes.

## 3. Deployment
Assignment: Docker Desktop with Docker Compose OR public cloud.

**Implementation:** Docker Compose as mandatory deliverable.
Potential bonus/later: deploy containerized stack to supported cloud.

## 4. Technical requirements
| Required | Project |
|---|---|
| ASP.NET Core .NET 8+ | .NET 9 |
| Entity Framework Core | Repositories/DbContext |
| SQL Server/relational | SQL Server |
| DI | ASP.NET Core DI |
| Configuration | appsettings + environment |
| Logging/exception | structured logging + ProblemDetails |
| JWT | Identity/Auth module |
| REST | LongevityDiet.API |
| gRPC | Recommendation service |
| Message Broker | Redis Streams |
| Background Service | Worker |
| Docker | Dockerfiles + compose |

## 5. Deliverables
- Complete source code: repository root.
- DB scripts/migrations: EF Core migrations.
- Dockerfile(s): web/api/grpc/worker as needed.
- `docker-compose.yml`.
- Swagger/OpenAPI.
- `README.md` with project description, system architecture, technology stack, installation, deployment and responsibilities.
- `docs/` provides detailed evidence beyond README.

## 6. Demonstration mapping
- System architecture → `docs/architecture/*.drawio`.
- REST → Swagger + Web.
- Background job → Worker logs/report.
- Message publish/consume → Redis + logs.
- gRPC → recommendation replacement flow.
- Docker → `docker compose ps`.
- E2E business workflow → profile → plan → logs → recommendation → score/report.

## 7. Assessment strategy
The assignment weights architecture 20%, REST 20%, Background 10%, Message Broker 15%, gRPC 15%, Docker/Cloud 10%, Documentation/presentation 10%.

**Team implication:** do not spend most of 9 weeks on frontend polish. By end of Week 5 every rubric technology must already work in a thin vertical slice. Weeks 6–9 deepen business logic, integration, reliability, docs and presentation.

## 8. Evidence checklist for instructor
- Architecture diagram with service boundaries and protocols.
- Swagger CRUD + JWT + query capabilities.
- Redis XADD/XREADGROUP flow.
- Worker log and processed-event evidence.
- gRPC client/server logs.
- Docker Compose all healthy.
- End-to-end trace/correlation ID.
- README + docs + member responsibility mapping.

## Source basis
This mapping follows the user-provided `PRN232 – Final Assignment` and preserves its mandatory technologies instead of replacing them with a generic architecture.
