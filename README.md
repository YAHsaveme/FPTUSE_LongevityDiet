# Longevity Diet Companion

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
│     └─ Week 9/
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
│  └─ LongevityDiet.IntegrationTests/
├─ .editorconfig
├─ Directory.Build.props
├─ docker-compose.yml
├─ .env.example
└─ LongevityDiet.sln
```

Generated folders such as `bin/`, `obj/`, `node_modules/` and API `wwwroot/` are not source and are ignored.

## Architecture references

- `docs/assignment/README.md` - Assignment-facing documentation pack.
- `docs/assignment/00-ASSIGNMENT-DOCUMENT.md` - submission entry point: Context -> Problems -> Solutions -> Actors/Features -> C0/C1 -> Technology -> Conceptual ERD -> Physical DB -> PRN232 coverage.
- `docs/05-SYSTEM-ARCHITECTURE.md` - detailed engineering architecture.
- `docs/architecture/README.md` - extended internal architecture diagram set.
- `docs/architecture/02-container-architecture.drawio`
- `docs/10-PRN232-TRACEABILITY.md`

The canonical diagram set covers:
- System Context;
- Container Architecture;
- Docker Deployment;
- API Component view;
- Recommendation dynamic flow;
- Transactional Outbox + Redis flow;
- PRN232 requirement coverage;
- deliverables/demo assessment;
- end-to-end demo flow.

## Current implementation status

### Completed engineering baseline

- research, scope, business/functional/non-functional requirements;
- safety/privacy/AI guardrails;
- PRN232 and book-to-software traceability;
- 9 canonical architecture diagrams with geometry/export QA;
- .NET 9 solution and React/TypeScript/Vite application;
- ASP.NET Core serving the React production build;
- OpenAPI/Swagger and health baseline;
- Docker Compose baseline for Web/API/gRPC/Worker/SQL/Redis;
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

- `docs/task/ROADMAP-9-WEEKS.md`
- `docs/task/Week 1/README.md` through `docs/task/Week 9/README.md`
- each week contains `Task 1.md` through `Task 4.md`

Week 1 Task 1 was assigned to Thành viên 1 (bạn) and is complete. All tasks are end-to-end Full-Stack tasks and include reviewer, dependencies, testing, deliverables and Definition of Done.

## Visual Studio HTTPS

1. Open `LongevityDiet.sln`.
2. Set `LongevityDiet.API` as Startup Project.
3. Select launch profile `https`.
4. Run with F5.

UI:
```text
https://localhost:7110/
```

Swagger:
```text
https://localhost:7110/swagger/index.html
```

Health:
```text
https://localhost:7110/health
```

The API project builds the React frontend automatically and serves the generated SPA from `wwwroot`.

## Local development configuration

Secrets are not stored in `appsettings.Development.json`.

For the current developer machine, local SQL connection string and JWT signing key are stored with .NET User Secrets for `LongevityDiet.API`.

For a new machine:
```powershell
dotnet user-secrets init --project .\src\LongevityDiet.API\LongevityDiet.API.csproj
dotnet user-secrets set "ConnectionStrings:Default" "<local-connection-string>" --project .\src\LongevityDiet.API\LongevityDiet.API.csproj
dotnet user-secrets set "Jwt:SigningKey" "<at-least-32-character-key>" --project .\src\LongevityDiet.API\LongevityDiet.API.csproj
```

## Build and test

```powershell
cd D:\PRN232\PRN232_LongevityDiet
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

Current verified test baseline:
- UnitTests: 8/8 pass.
- IntegrationTests: 7/7 pass.
- E2ETests: 1/1 pass on Chrome.
- Full .NET build: 0 warnings, 0 errors.

## Docker

```powershell
Copy-Item .env.example .env
docker compose up -d --build
docker compose ps
```

Core containers:
- web;
- api;
- recommendation-grpc;
- worker;
- sqlserver;
- redis.

## PRN232 mandatory mapping

- REST API: `LongevityDiet.API`.
- Layering: API -> Services -> Repository.
- CRUD + search/filter/sort/pagination: Week 1 Task 2.
- JWT: Week 1 Task 1.
- Background Service: `LongevityDiet.Worker`.
- Redis Streams producer/consumer: Week 1 Task 4.
- gRPC Recommendation: Week 1 Task 4.
- Docker: Compose + Dockerfiles.
- Database: SQL Server + EF Core.
- Swagger/OpenAPI: API baseline.

## Research basis

The project distinguishes:
1. PRN232 assignment requirements;
2. book/official longevity-diet principles;
3. peer-reviewed evidence;
4. project-defined software heuristics such as LDAS.

See `docs/01-BOOK-RESEARCH.md` and `docs/11-BOOK-TO-SOFTWARE-TRACEABILITY.md`.
