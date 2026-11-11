# Longevity Diet Companion

> **2026-11-10 — Current scope and acceptance status.** The member 1/4 branch now contains reviewed-allergy screening, conservative audience grouping, 14-day rolling meal coverage, Baseline/During/FollowUp self-reported health check-ins, and conditional daily reminders. See [the current implementation and Final Assignment audit](docs/assignment/WELLNESS-JOURNEY-FINAL-AUDIT-20261110.md). **Automated tests passing does not establish medical safety or 100% final acceptance.** The current EF migration snapshots include **56 tables** (45 main + 7 tracking + 4 worker). All four [current C0/C1/C2/Database diagrams](docs/assignment/one-page/README.md) now use the current source, including **22 API controllers and the 56-table physical ERD**. Both Draw.io and one-page PDF exist. Rendered SVG validation passes with **zero label cuts or connector crossings** across all four. The old 32-table diagrams are archived under `docs/assignment/legacy-diagrams`. The 400-day daily rolling continuity test passes. **Production-equivalent Docker/SQL/Redis/gRPC/Worker demos, nutrition safety validation and clinical review remain open.**

**Member 1 + Member 4 acceptance:** [Eight-task completion matrix and remaining live verification](docs/assignment/MEMBER1-MEMBER4-COMPLETION-CHECKLIST-20261110.md). Admin Rule Governance now includes independent two-admin publication review, a paginated safety queue and read-only historical plan-impact counts.

## Project description

PRN232 Final Assignment: distributed .NET application hỗ trợ người dùng xây dựng và theo dõi thói quen longevity diet/lifestyle theo hướng giải thích được, truy vết được rule/source và có distributed architecture rõ ràng.

## Product boundary

Đây là ứng dụng **wellness / education / adherence**, không phải medical device.

Hệ thống không:
- chẩn đoán bệnh;
- dự đoán tuổi thọ hoặc biological age;
- kê thuốc;
- tự tạo phác đồ điều trị;
- cho AI override allergy, exclusion hoặc safety rule.

## Technology stack

- Frontend: React 19 + TypeScript + Vite.
- REST API: ASP.NET Core .NET 9.
- Layering: API -> Services -> Repository -> EF Core -> SQL Server.
- Authentication: JWT access token + rotating refresh token.
- Internal service: gRPC Recommendation Service.
- Async messaging: Redis Streams.
- Background processing: .NET Worker Service.
- Database: SQL Server 2022.
- Containerization: Docker + Docker Compose.
- API documentation: OpenAPI + Swagger UI.
- Logging: Serilog.
- Optional local AI: explanation rewrite only; never safety/ranking authority.

## Repository structure

```text
PRN232_LongevityDiet/
├─ .agents/
│  └─ skills/
├─ docs/
│  ├─ adr/
│  ├─ architecture/
│  └─ task/
│     ├─ Week 1/
│     ├─ ...
│     └─ Week 4/
├─ scripts/
├─ src/
│  ├─ LongevityDiet.API/
│  ├─ LongevityDiet.Domain/
│  ├─ LongevityDiet.Repositories/
│  ├─ LongevityDiet.Services/
│  ├─ LongevityDiet.Recommendation.Grpc/
│  ├─ LongevityDiet.Worker/
│  └─ LongevityDiet.Web/
├─ tests/
│  ├─ LongevityDiet.UnitTests/
│  ├─ LongevityDiet.IntegrationTests/
│  └─ LongevityDiet.E2ETests/
├─ .editorconfig
├─ .github/
│  ├─ pull_request_template.md
│  └─ workflows/project-quality.yml
├─ CONTRIBUTING.md
├─ Directory.Build.props
├─ docker-compose.yml
├─ docker-compose.dcproj
├─ .env.example
├─ LongevityDiet.slnLaunch
└─ LongevityDiet.sln
```

`LongevityDiet.Web` is a Visual Studio JavaScript Project System (`.esproj`) project. Frontend and backend remain separate deployable applications. Generated folders such as `bin/`, `obj/`, `node_modules/` and `dist/` are not source and are ignored.

## System architecture

**Only four overall diagrams are canonical:** [C0](docs/assignment/one-page/C0.drawio), [C1](docs/assignment/one-page/C1.drawio), [C2](docs/assignment/one-page/C2.drawio), and [Database Diagram](docs/assignment/one-page/Database%20Diagram.drawio). All include one-page PDFs; see the [four-diagram index](docs/assignment/one-page/README.md). The full physical diagram shows 32 mapped EF Core tables and nine local SQL FKs. No separate teaching subset or redundant supplement is needed.

See the [assignment evidence](docs/assignment/00-ASSIGNMENT-DOCUMENT.md) and [traceability](docs/10-PRN232-TRACEABILITY.md).

## Current implementation status

### Completed engineering baseline

- research, scope, business/functional/non-functional requirements;
- safety/privacy/AI guardrails;
- PRN232 and book-to-software traceability;
- 10 canonical architecture diagrams with geometry/export QA;
- .NET 9 solution with separate ASP.NET Core backend and React/TypeScript/Vite `.esproj` frontend;
- Visual Studio multi-project startup profile for Web + API;
- separate development ports: Web `5173`, API HTTPS `7110` / HTTP `5110`;
- Visual Studio Docker Compose project for Web/API/gRPC/Worker/SQL/Redis;
- OpenAPI/Swagger and health baseline;
- EF Core/JWT/gRPC/Redis/Serilog dependencies;
- repository-wide `.editorconfig` + .NET analyzer/build policy.

### Week 1 Task 1 completed

- User, UserProfile and RefreshToken domain/persistence;
- EF Core DbContext + IdentityFoundation migration;
- register/login/refresh/revoke;
- JWT access token;
- rotating refresh token with SHA-256 hash persisted in SQL;
- HttpOnly refresh cookie;
- profile read/update and onboarding foundation;
- React AuthProvider, protected routes, login/register/onboarding/profile;
- premium landing page integrated with auth-aware navigation;
- 8 unit tests;
- 7 HTTP integration tests using `WebApplicationFactory<Program>` + SQLite in-memory.
- 1 Playwright + Chrome browser E2E test covering Register -> Onboarding -> App -> session restore -> Profile persistence -> Logout -> protected redirect.

Week 1 Task 1 is complete. The remaining Week 1 Task 2-4 work is documented under `docs/task/Week 1/`.

## Task planning

Canonical planning location:

- `docs/task/ROADMAP-4-WEEKS.md`
- `docs/task/Week 1/README.md` through `docs/task/Week 4/README.md`
- each week contains `Task 1.md` through `Task 4.md`

Week 1 Task 1 was assigned to Thành viên 1 (bạn) and is complete. All tasks are end-to-end Full-Stack tasks and include reviewer, dependencies, testing, deliverables and Definition of Done.

## Team Member Responsibilities

The team has four Full-Stack Developers. Ownership is organized by end-to-end task, not by a permanent frontend/backend silo. Each Owner is responsible for the complete vertical slice required by the task and each task has a different Reviewer.

| Member | Primary responsibility | Week 1 ownership | Review responsibility |
|---|---|---|---|
| Thành viên 1 | Identity/authentication foundation, profile/onboarding, integration quality and project consistency | Task 1 - Identity, Authentication, Profile & Onboarding | Reviews Task 3 |
| Thành viên 2 | Catalog/data-query foundation and business data quality | Task 2 - Food, Recipe, Diet Rule Catalog & Query Foundation | Reviews Task 4 |
| Thành viên 3 | Core planning/tracking workflow and deterministic business behavior | Task 3 - Meal Planning, Meal Logging & Eating Window | Reviews Task 1 |
| Thành viên 4 | Distributed-service thin slice and asynchronous processing | Task 4 - gRPC Recommendation + Outbox + Redis Streams + Worker | Reviews Task 2 |

Shared responsibilities for every member:
- follow the active `docs/task/Week N/Task N.md` scope and Definition of Done;
- preserve the canonical architecture and dependency direction;
- implement the full vertical slice where the task requires Domain/Data -> Repository/Service -> API -> Web -> Tests;
- add/update tests, migrations, API contracts and documentation affected by the change;
- run project-structure validation, build and relevant tests before requesting review;
- never commit secrets or generated build artifacts;
- review AI-generated code before merge and verify it runs in the real project;
- perform cross-review before feature -> `develop` merge.

Detailed contribution and architecture rules are defined in `CONTRIBUTING.md` and reinforced by `AGENTS.md`, `.editorconfig`, the pull-request template and `scripts/Validate-ProjectStructure.ps1`.

## Installation guide

Open `LongevityDiet.sln` in Visual Studio 2022. The solution contains separate backend (`.csproj`) and frontend (`.esproj`) projects.

For normal development, select **Development - Full Stack** and press F5. Visual Studio starts SQL Server and Redis through Docker Compose, while Web, REST API, Recommendation gRPC and Worker run as native development projects for fast debugging.

```text
Frontend UI:         http://localhost:5173
Backend API HTTPS:   https://localhost:7110
Backend API HTTP:    http://localhost:5110
Recommendation gRPC http://localhost:5010
SQL Server:          localhost:14330
Redis:               localhost:6379
Swagger:             https://localhost:7110/swagger/index.html
Health:              https://localhost:7110/health
```

During native development, Vite proxies `/api/*` from port `5173` to the backend at `https://localhost:7110`. Frontend and backend therefore remain separate processes and separate ports while browser requests keep a simple same-origin development flow.

Use **Development - Web + API** only when SQL Server/Redis are already running and you only need the UI/API pair. For a fully containerized runtime, select **Docker Compose - Full Stack**. Visual Studio uses `docker-compose.dcproj` to start Web, API, Recommendation gRPC, Worker, SQL Server and Redis. Docker ports are Web `5173`, API `8080`, gRPC `8081`, SQL Server `14330`, and Redis `6379`.

## Local development configuration

Secrets are not stored in `appsettings.Development.json`.

For the current developer machine, the API SQL connection string/JWT signing key and the Worker SQL connection string are stored with .NET User Secrets.

For a new machine, run the repository initializer once before the first F5:

```powershell
.\scripts\Initialize-LocalDevelopment.ps1
```

It creates a local ignored `.env` with generated development secrets when needed and synchronizes the API/Worker .NET User Secrets. Do not commit `.env`.

## Build and test

Build/cache folders (`bin`, `obj`, `node_modules`, and `dist`) are **generated files**, not source code. They may be safely removed to save disk space for this school project. Restore them with the commands below when building or running again. Never delete `src` code, EF migrations, `*.csproj`, `package-lock.json`, or any diagrams to achieve a similar cleanup.

```powershell
cd D:\PRN232\FPTUSE_LongevityDiet
dotnet restore
dotnet build .\LongevityDiet.sln
dotnet test .\LongevityDiet.sln --no-build
```

Frontend:
```powershell
cd .\src\LongevityDiet.Web
npm ci
npm run build
```

Browser E2E:
```powershell
cd .\tests\LongevityDiet.E2ETests
npm ci
npm test
```

Against an already running Docker Compose full stack:
```powershell
npm run test:docker
```

**Current verification (11/11/2026, merged into develop PR #22):**
- Current Runtime QA and GitHub PR quality gates **PASS**: 172/172 .NET tests (91 unit + 81 integration), 12/12 Web tests, lint/build PASS, 0 high/production npm vulnerabilities.
- Full Docker QA across 6 containers and 3 SQL databases: JWT/REST/catalog/challenge/dashboard/FMD, 14-day / 42-meal planning, wellness, LDAS MealLog/EatingWindow, independent gRPC, Redis Streams, Worker scheduled notification and weekly-report result all exercised with synthetic accounts.
- Playwright 10/10 browser E2E, Edge CDP responsive 6/6, canonical four one-page Draw.io/PDF diagrams PASS (56 physical tables).
- **Not 100% of the team's ADR-005 Target Architecture:** standalone YARP Gateway, 4 independent REST domain services and six service-owned DBs, public TLS :443, full target service communication matrix and reviewer/presentation sign-off are still missing. Do not call Target Architecture deployed or automatically merge into main.
- [Four-member/official-PDF acceptance audit](docs/assignment/FOUR-MEMBER-PDF-100PCT-ACCEPTANCE-AUDIT-20261111.md).

Historical verification (09/11/2026, earlier feature branch):
- .NET solution build: **0 errors, 0 warnings**.
- Unit tests: **66/66 pass**; integration tests: **70/70 pass** (including 3 new Rule Governance cases).
- Frontend: **12/12 tests pass**, lint/build PASS.
- Project-structure, C0/C1/C2/baseline ERD geometry, Compose static config, static release readiness, EF pending-model-change detection: PASS.
- **Not reverified on this branch:** live Docker/SQL Server stack, fresh real SQL migration, E2E broker/gRPC demo, reviewer approval. The new `RuleAudits` table still requires updating the 32-table baseline ERD and PDF export.
- Detailed official assignment audit: `docs/assignment/FINAL-ASSIGNMENT-COMPLIANCE-AUDIT-20261109.md`.

Historical release baseline (2026-11-05; not the latest test status):
- UnitTests: 51/51 pass.
- IntegrationTests: 35/38 pass. The 3 failures are a pre-existing MealLog-create HTTP 500 baseline defect reproduced on clean `origin/develop` commit `474b475`; see `docs/operations/RELEASE-RUNBOOK.md`.
- Member 2 Week 2 targeted integration tests: 5/5 pass.
- Member 2 Week 3 targeted integration tests: 5/5 pass.
- Frontend tests: 6/6 pass; lint/build PASS.
- Docker E2E: 1/1 previously verified against the current Compose runtime; release CI reruns it on pushes to `main`.
- Full .NET build: 0 warnings, 0 errors.
- Docker Compose build/runtime, Redis Stream Worker smoke, backup verification and named-volume persistence: PASS.

The complete current-runtime operations and release evidence is documented in `docs/operations/RELEASE-RUNBOOK.md`. ADR-005 Gateway/domain-service/TLS topology remains **Target Architecture** until those deployables and service-owned databases exist.

## Optional target-architecture Gateway migration slice

A separate **.NET 9 / YARP API Gateway** is now available without replacing the verified Current Runtime. With `docker-compose.gateway.yml`, Browser → Web/Nginx → Gateway → existing API is exercised in real Docker; the default Compose remains Browser → Web/Nginx → API. Gateway readiness checks the actual backend and intentionally returns HTTP 503 if it is unavailable. This does **not** yet implement four independent REST domain services, six service-owned databases or public TLS443.

[Gateway setup, API routing, local E2E, outage recovery and remaining architecture gaps](docs/architecture/TARGET-GATEWAY-MIGRATION-20261111.md).

## Deployment instructions

For the verified current demo runtime, follow `docs/operations/RELEASE-RUNBOOK.md`.

```powershell
Copy-Item .env.example .env
# Replace every CHANGE_ME value in .env before startup.
docker compose up -d --build
docker compose ps
.\scripts\Test-ReleaseReadiness.ps1 -RequireRunningStack
```

The checked-in Compose file binds published ports to `127.0.0.1` for local/demo safety. It is not the target public HTTPS :443 deployment.

Core containers:
- web;
- api;
- recommendation-grpc;
- worker;
- sqlserver;
- redis.

## Official PRN232 Final Assignment technical acceptance

The original Final Assignment PDF (see the [seven-step demo mapped to its requirements](docs/assignment/PRN232-FINAL-DEMO-7-STEPS.md)) asks for REST/JWT/CRUD/layers/search/filter/sort/pagination, background processing, **Redis or Kafka**, an independent gRPC service, Docker Compose or cloud, EF Core/SQL, migrations, API documentation, a six-section README and a seven-step demo. It does **not** require four independent domain REST services or six databases; those are the team's **additional ADR-005 targets** and remain separately tracked.

- Official-PDF source/deliverables verification (works in Windows, Linux and GitHub CI): `node scripts/Validate-Prn232-Final-PDF.cjs`.
- Isolated Windows Docker end-to-end full acceptance (creates only synthetic QA users and a JSON evidence report): `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Prn232-Final-Acceptance.ps1 -IncludeGatewayOutage -IncludeIndependentRedisSmoke`.
- [Seven-step demonstration and explicit human review checklist](docs/assignment/PRN232-FINAL-DEMO-7-STEPS.md).

**Scope:** green automated QA proves technical criteria on the tested environment. It does not certify a lecturer-observed presentation, a 100/100 grade, clinical nutrition safety, or all ADR-005 Target Architecture tasks. `main` must not be merged on those unsupported claims.

## PRN232 mandatory mapping

- REST API: `LongevityDiet.API`.
- Layering: API -> Services -> Repository.
- CRUD + search/filter/sort/pagination: Week 1 Task 2.
- JWT: Week 1 Task 1.
- Dependency Injection: ASP.NET Core/Generic Host DI with scoped DbContext and centralized service registration.
- Configuration management: appsettings + environment variables + .NET User Secrets/local ignored .env.
- Logging & exception handling: structured logging + RFC7807/ProblemDetails.
- Background Service: `LongevityDiet.Worker`.
- Redis Streams producer/consumer: Week 1 Task 4.
- gRPC Recommendation: Week 1 Task 4.
- Docker: Compose + Dockerfiles.
- Database: SQL Server + EF Core.
- Swagger/OpenAPI: API baseline.
- Full rubric/evidence matrix: docs/10-PRN232-TRACEABILITY.md.
- Test/deploy/final-demo plan: docs/09-TEST-DEPLOY-DEMO.md.

## Research basis

The project distinguishes:
1. PRN232 assignment requirements;
2. book/official longevity-diet principles;
3. peer-reviewed evidence;
4. project-defined software heuristics such as LDAS.

See `docs/01-BOOK-RESEARCH.md` and `docs/11-BOOK-TO-SOFTWARE-TRACEABILITY.md`.


## Architecture diagrams — PRN232 course-size views (2026-11-05)

**Canonical assignment**: [four editable one-page diagrams and validation](docs/assignment/one-page/README.md).

- [C0 System Context (Draw.io)](docs/assignment/one-page/C0.drawio) and [PDF](docs/assignment/one-page/C0.pdf)
- [C1 Container (Draw.io)](docs/assignment/one-page/C1.drawio) and [PDF](docs/assignment/one-page/C1.pdf)
- [C2 REST API Components (Draw.io)](docs/assignment/one-page/C2.drawio) and [PDF](docs/assignment/one-page/C2.pdf)
- [Database Diagram (Draw.io)](docs/assignment/one-page/Database%20Diagram.drawio) and [one-page PDF](docs/assignment/one-page/Database%20Diagram.pdf)

The complete Database Diagram shows all **32 mapped EF Core tables and 9 real foreign keys**, while C2 shows all **10 current API controller modules**. The independent ActivityCoach gRPC connection has an HTTP/2 integration test; full live Docker/SQL Server E2E is still unverified.
To opt in *after provisioning and verifying* a Cloudflare Worker + D1, set secret environment variables `CloudflareSessions__Enabled=true`, `CloudflareSessions__BaseUrl=https://YOUR_PRIVATE_WORKER_HOST/` and `CloudflareSessions__ServiceBearer=<FROM_SECURE_SECRET_MANAGER>`; do **not** put credentials into Git or `appsettings.json`. See the migration guide before switching live sessions.
