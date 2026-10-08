# 10 — PRN232 Final Assignment Traceability

This document is the canonical mapping between the user-provided **PRN232 – Final Assignment** and the Longevity Diet Companion implementation, tests, deployment evidence and 4-week delivery plan.

## 1. Source authority and status language

The assignment PDF is the authority for mandatory grading requirements.

Status language used here:
- **Done**: implemented and already verified in the repository/runtime.
- **Planned**: explicitly owned by a 4-week task but not yet claimed as complete.
- **Release evidence required**: implementation may exist, but final submission must still capture repeatable proof.
- **Optional/bonus**: may add value but must never displace a mandatory rubric item.

The project intentionally uses **Docker Desktop + Docker Compose** as the required deployment path. Public cloud remains optional because the assignment accepts either approach.

## 2. Assignment objective

The assignment requires a distributed .NET application demonstrating:
- RESTful API;
- asynchronous messaging;
- background processing;
- inter-service communication;
- containerization;
- deployable behavior.

**Project mapping:** React Web + ASP.NET Core REST API + SQL Server/EF Core + independent gRPC Recommendation Service + Redis Streams + .NET Worker + Docker Compose.

## 3. Functional requirements

### 3.1 REST API Service

| Assignment requirement | Project implementation | Owner/evidence path | Release proof |
|---|---|---|---|
| At least one ASP.NET Core REST API | `LongevityDiet.API` on .NET 9 | Week 1 Tasks 1-3 | Swagger + runtime HTTP calls |
| RESTful design principles and naming conventions | Resource-oriented `/api/v1` routes, HTTP verbs/status semantics, RFC7807 errors | Week 1 Task 2 + Week 4 Task 1 | OpenAPI review + contract tests |
| CRUD for core business entities | Profile, Food/Recipe, MealLog, Activity, Challenge, Rule administration | Week 1-3 | Swagger/UI CRUD demo |
| Layered architecture | API -> Services -> Repository -> EF Core -> SQL Server | `AGENTS.md`, `CONTRIBUTING.md`, structure validator | Code path + architecture diagram |
| JWT authentication | Access token + rotating refresh token + HttpOnly cookie | Week 1 Task 1 — **Done** | Login/protected endpoint evidence |
| Search/filter/sort/pagination | Food/Recipe/Admin collection queries | Week 1 Task 2 | Query combinations in Swagger/tests |

REST acceptance rules:
- use nouns/resources for normal routes;
- use HTTP methods for CRUD semantics rather than action verbs where practical;
- POST create returns a correct success status and resource location when applicable;
- missing resource -> 404;
- validation -> 400 ProblemDetails;
- authentication -> 401;
- authorization -> 403;
- state/version conflict -> 409 where appropriate;
- collection endpoints are bounded and server-side paginated;
- Swagger/OpenAPI documents request/response/status contracts.

### 3.2 Background Job

The assignment requires at least one scheduled or asynchronous background process.

**Project service:** `LongevityDiet.Worker`.

Planned business jobs:
- Transactional Outbox publication;
- Redis Streams consumption;
- reminder scheduling;
- notification creation;
- weekly report generation;
- retry/recovery/dead-letter handling;
- bounded cleanup/retention where appropriate.

Release proof:
- a real business job changes persisted state;
- the job is executed by Worker/BackgroundService, not the HTTP request thread;
- restart/retry behavior is demonstrated without duplicate side effects.

### 3.3 Message Broker

The assignment allows Apache Kafka or Redis Pub/Sub/Streams and requires at least one producer and one consumer.

**Project choice:** Redis Streams.

Required flow:
1. API commits business data + `OutboxMessage` in one SQL transaction.
2. Worker publisher sends pending events with `XADD`.
3. Worker consumer group reads using `XREADGROUP`.
4. Business side effect is persisted.
5. Successful processing is acknowledged with `XACK`.
6. `ProcessedEvent` prevents duplicate side effects.
7. Pending/stale entries have a recovery path.
8. Exhausted/poison messages have a dead-letter/recovery path.

Release proof:
- producer evidence;
- consumer evidence;
- stream/consumer-group evidence;
- persisted business side effect;
- duplicate/retry test;
- recovery after controlled Worker/Redis interruption.

### 3.4 gRPC Service

The assignment requires an independent gRPC service and interaction between REST API and gRPC.

**Project service:** `LongevityDiet.Recommendation.Grpc`.

Required flow:
`React -> REST API -> typed gRPC client -> Recommendation gRPC service -> ranked result/reason codes -> REST DTO -> React`.

Contract/quality requirements:
- real `.proto` contract;
- independent process/container;
- typed gRPC client registered through DI;
- deadline/timeout and cancellation propagation;
- deterministic hard-constraint filtering and ranking;
- controlled unavailable/failure response;
- REST API remains the browser-facing boundary.

## 4. Deployment requirements

Assignment requirement: **Docker Desktop with Docker Compose OR public cloud**.

**Chosen mandatory path:** Docker Desktop + Docker Compose.

Required services:
- `web`;
- `api`;
- `recommendation-grpc`;
- `worker`;
- `sqlserver`;
- `redis`.

Release communication matrix:
- Browser -> Web;
- Web -> REST API;
- REST API -> SQL Server;
- REST API -> Recommendation gRPC;
- Worker -> SQL Server;
- Worker -> Redis Streams;
- Redis Streams -> Worker consumer.

Release proof:
- `docker compose config` passes;
- all required services start;
- readiness/health reflects required dependencies;
- dependency startup uses health/readiness rather than assuming “container running = ready”;
- restart smoke passes;
- the end-to-end business flow works from the composed environment.

## 5. Technical requirements

| PDF technical requirement | Project mapping | Required evidence |
|---|---|---|
| ASP.NET Core (.NET 8+) | .NET 9 REST API/gRPC | build + runtime |
| Entity Framework Core | canonical `LongevityDietDbContext` | migrations + repository integration |
| SQL Server or relational DB | SQL Server 2022 | fresh migration + persisted data |
| Dependency Injection | ASP.NET Core DI/Generic Host | registration/lifetime review + runtime |
| Configuration management | appsettings + environment + User Secrets/local `.env` | no real secret in source |
| Logging and exception handling | Serilog/structured logging + RFC7807 ProblemDetails | correlation/error demo |
| JWT Authentication | Week 1 Task 1 | protected endpoint |
| RESTful API design | `/api/v1` resource contracts | Swagger/contract review |
| gRPC communication | Recommendation service | REST -> gRPC trace |
| Message Broker integration | Redis Streams | producer + consumer |
| Background Service | Worker/BackgroundService | scheduled/async job |
| Docker containerization | Dockerfiles + Compose | clean composed runtime |

### DI quality gate

Final review must verify:
- dependencies are constructor-injected rather than resolved through ad-hoc service-locator patterns;
- `DbContext` remains scoped;
- singleton services do not capture scoped services;
- Worker creates scopes for scoped work when required;
- typed gRPC clients and configuration/options are registered centrally;
- service registrations remain compositional and testable.

## 6. Deliverables checklist

The final submission must contain all PDF deliverables:

| Deliverable | Canonical location/evidence | Final gate |
|---|---|---|
| Complete source code | repository | clean tree, no generated junk |
| Database scripts or migrations | EF Core migrations | fresh DB from zero |
| Dockerfile(s) | service Dockerfiles | image build |
| Docker Compose config | `docker-compose.yml` | config + runtime |
| API documentation | Swagger/OpenAPI | current contracts |
| README — Project description | root `README.md` | explicit section |
| README — System architecture | root `README.md` + `docs/05-SYSTEM-ARCHITECTURE.md` | explicit section |
| README — Technology stack | root `README.md` | explicit section |
| README — Installation guide | root `README.md` | clean-machine verified |
| README — Deployment instructions | root `README.md` | Docker Compose verified |
| README — Team member responsibilities | root `README.md` | matches task ownership |

## 7. Final demonstration checklist — 7/7 mandatory items

The presentation is not complete until all seven PDF demonstration items are shown:

1. **System architecture** — C0/C1 + deployment view; identify REST, SQL, Redis, Worker, gRPC and protocols.
2. **REST API functionality** — JWT + CRUD + search/filter/sort/pagination through Swagger/UI.
3. **Background job execution** — real Worker job with persisted result.
4. **Message publishing and consuming** — producer -> Redis Stream -> consumer -> acknowledgment/side effect.
5. **gRPC communication** — REST API calls independent Recommendation service and shows result/reason.
6. **Docker or cloud deployment** — composed services healthy/ready and communicating.
7. **End-to-end business workflow** — user action crosses the real system and returns visible business value.

Canonical rehearsal detail: `docs/09-TEST-DEPLOY-DEMO.md`.

## 8. Assessment rubric — 100% weighted coverage

| Criterion | Weight | Project evidence target | Delivery owner |
|---|---:|---|---|
| System architecture and design | 20% | C0/C1, deployment, ADRs, dependency rules, Outbox rationale | Week 4 Task 4 + shared |
| REST API implementation | 20% | CRUD, layered architecture, JWT, REST semantics, query features, Swagger | Week 1 Tasks 1-3 |
| Background Job | 10% | Worker scheduled/async business job + persistence | Week 3 Tasks 1-2 |
| Message Broker integration | 15% | Redis Streams producer/consumer, idempotency, ACK/recovery | Week 1 Task 4 + Week 3 Task 2 |
| gRPC service | 15% | independent service + REST -> gRPC + typed contract | Week 1 Task 4 + Week 2 Task 3 |
| Docker/Cloud deployment | 10% | clean Docker Compose runtime + health/readiness + communication | Week 4 Task 2 |
| Documentation and presentation | 10% | README, docs, evidence matrix, 7/7 demo rehearsal | Week 4 Tasks 3-4 |
| **Total** | **100%** | no mandatory gap allowed | Team |

Priority rule:
- the 80% combined Architecture + REST + Background + Broker + gRPC must be technically demonstrable before optional polish;
- Docker/deployment must be repeatable, not only screenshots;
- documentation must describe the implementation that actually exists;
- optional AI/cloud/extra UI never replaces a rubric requirement.

## 9. Four-week delivery gate

| Week | Mandatory grading outcome |
|---|---|
| Week 1 | REST foundation + Catalog/CRUD/query + Meal core + independent gRPC + Redis producer/consumer + Worker thin slice |
| Week 2 | Business value built on real data: Activity/LDAS/Challenge/Dashboard + stronger recommendation/UX |
| Week 3 | Real scheduled/background value + reliability + FMD safety + rule governance/audit |
| Week 4 | Security/resilience/observability + clean deployment + full regression + 100% rubric evidence + 7/7 demo + submission |

If time slips, cut or simplify **optional AI, cloud deployment, advanced animation, nonessential admin polish and bonus analytics first**. Do not cut REST, JWT, query features, BackgroundService, Redis producer/consumer, independent gRPC, Docker Compose, README deliverables or demo evidence.

## 10. Release evidence pack

Before submission, collect repeatable evidence for:
- project/architecture structure validation;
- full .NET build;
- .NET tests;
- frontend lint/build;
- fresh SQL Server migration;
- Swagger/OpenAPI;
- JWT protected resource;
- REST CRUD/query behavior;
- REST -> gRPC;
- SQL + Outbox -> Redis -> Worker -> persisted result;
- Worker scheduled job;
- Docker Compose health/readiness and restart;
- seven demonstration items;
- rubric matrix with links to code/test/demo evidence;
- clean Git status and no committed secrets/generated artifacts.

## 11. Research-backed engineering baseline

These sources inform engineering quality; they do **not** add new assignment requirements:

- Microsoft Learn — ASP.NET Core API error handling/ProblemDetails:
  https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis/handle-errors
- Microsoft Learn — ASP.NET Core dependency injection:
  https://learn.microsoft.com/aspnet/core/fundamentals/dependency-injection
- Microsoft Learn — gRPC client factory, deadlines and cancellation:
  https://learn.microsoft.com/aspnet/core/grpc/clientfactory
- Microsoft Learn — ASP.NET Core integration tests / `WebApplicationFactory`:
  https://learn.microsoft.com/aspnet/core/testing/integration-testing
- Microsoft Learn — .NET Generic Host / BackgroundService:
  https://learn.microsoft.com/dotnet/core/extensions/generic-host
- Microsoft Learn — EF Core efficient querying:
  https://learn.microsoft.com/ef/core/performance/efficient-querying
- Redis official docs — Streams/consumer groups/`XREADGROUP`/`XACK`/pending recovery:
  https://redis.io/docs/latest/develop/data-types/streams/
- Docker Docs — Compose startup order and health conditions:
  https://docs.docker.com/compose/how-tos/startup-order/
- GitHub Docs — build and test .NET with GitHub Actions:
  https://docs.github.com/actions/tutorials/build-and-test-code/net
- OWASP API Security Top 10 — object/function authorization and resource-abuse risks:
  https://owasp.org/www-project-api-security/
- .NET eShop reference app:
  https://github.com/dotnet/eShop
- Testcontainers for .NET — targeted real infrastructure integration tests:
  https://github.com/testcontainers/testcontainers-dotnet

Research adoption rule:
- adopt a pattern only when it directly improves grading evidence, correctness, reliability, security or maintainability;
- do not add Aspire, Dapr, Kafka, Kubernetes or extra microservices merely because a reference architecture uses them;
- prefer the smallest architecture that fully demonstrates the PRN232 rubric.

## 12. Source basis

This traceability preserves the mandatory terminology and criteria from the user-provided **PRN232 – Final Assignment**. Additional engineering practices above are clearly separated as quality guidance rather than silently replacing or expanding the course requirements.
