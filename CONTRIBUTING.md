# Contributing to Longevity Diet Companion

This repository has a **frozen project architecture** for the PRN232 assignment. Feature work must extend the existing structure instead of redesigning it.

## 1. Source of truth

Before coding, read in this order:

1. `AGENTS.md`
2. `.agents/project-context.md`
3. `docs/05-SYSTEM-ARCHITECTURE.md`
4. `docs/03-FUNCTIONAL-REQUIREMENTS.md`
5. `docs/08-SAFETY-PRIVACY-AI.md`
6. `docs/task/ROADMAP-9-WEEKS.md`
7. the active `docs/task/Week N/Task N.md`

If a task conflicts with these documents, stop and resolve the conflict before implementing.

## 2. Architecture freeze

Do **not** change the solution/project structure for ordinary feature work.

Canonical projects:

```text
src/
├─ LongevityDiet.Domain
├─ LongevityDiet.Repositories
├─ LongevityDiet.Services
├─ LongevityDiet.API
├─ LongevityDiet.Recommendation.Grpc
├─ LongevityDiet.Worker
└─ LongevityDiet.Web
```

Do not add, rename, move, merge, split, or delete projects without an explicit architecture decision approved by the team and reflected in the ADR/architecture documentation.

Do not turn the current modular distributed application into unrelated microservices.

### Allowed dependency direction

```text
Web -> REST API over HTTP
API -> Services -> Repositories -> Domain
API -> Recommendation gRPC over gRPC/HTTP2
Worker -> Services/Repositories -> Domain
Repositories -> Domain
Recommendation gRPC -> Domain
```

Rules:

- Domain must not reference infrastructure, API, Worker, Web, or gRPC host projects.
- Controllers must not call `DbContext` or repositories directly for business workflows.
- Business rules belong in Services/domain-oriented code, not Controllers.
- Repository code owns persistence/query concerns.
- Browser code never connects directly to SQL Server, Redis, Worker, or gRPC.
- Worker owns asynchronous/scheduled processing.
- REST API commits business state + Outbox in one SQL transaction for event-producing workflows.
- Worker publishes/consumes Redis Streams and consumers must be idempotent.
- Recommendation remains an independent gRPC service.
- Frontend and backend remain separate applications and separate ports.

## 3. Fixed development/runtime boundaries

Native Visual Studio development:

- Web: `http://localhost:5173`
- REST API HTTPS: `https://localhost:7110`
- REST API HTTP: `http://localhost:5110`
- Recommendation gRPC: `http://localhost:5010`
- SQL Server: `localhost:14330`
- Redis: `localhost:6379`

Docker Compose:

- Web: `5173`
- REST API: `8080`
- Recommendation gRPC: `8081`
- SQL Server: `14330`
- Redis: `6379`

Do not hardcode backend URLs in React feature code. Use the existing same-origin `/api/v1` client/proxy convention.

## 4. C# clean-code rules

All owned C# code must follow `.editorconfig` and these rules:

- Use clear PascalCase public names and `I` prefix for interfaces.
- Keep classes focused on one responsibility.
- Prefer small methods with explicit intent over long procedural methods.
- Use dependency injection; do not create infrastructure dependencies with `new` inside business services.
- Use async APIs for I/O and suffix asynchronous methods with `Async`.
- Accept/propagate `CancellationToken` for request and I/O operations where practical.
- Validate at system boundaries and return consistent RFC7807/ProblemDetails errors.
- Never expose EF Core entities as public API contracts when a request/response DTO is appropriate.
- Avoid duplicated business rules and duplicated query logic.
- Avoid static mutable state and hidden global dependencies.
- Use `TimeProvider` for testable time-dependent logic.
- Do not introduce generic `Helpers`, `Utils`, or god-service classes as dumping grounds.
- Do not suppress analyzers globally to hide defects.
- No commented-out production code, placeholder implementations, fake success paths, or TODOs presented as completed work.

## 5. API rules

- Version application endpoints under `/api/v1`.
- Follow REST naming and HTTP semantics.
- Controllers: HTTP/auth/validation boundary only.
- Services: business workflow/orchestration.
- Repositories: EF Core persistence/query.
- Searching/filtering/sorting/pagination must be server-side where required by the assignment.
- Protected resources require authorization and ownership checks.
- Swagger/OpenAPI must stay accurate after contract changes.

## 6. EF Core and SQL rules

- `LongevityDietDbContext` is the canonical DbContext.
- Generate migrations from the Repositories project.
- Do not create a second application database/DbContext for convenience.
- Do not hand-edit generated migrations merely for style.
- Do not delete/rewrite a migration that may already be shared/applied.
- Add indexes/constraints intentionally for query and integrity needs.
- Prefer `AsNoTracking()` for read-only queries where appropriate.
- Avoid unbounded list endpoints; use pagination where the requirement applies.
- Verify migrations against a fresh database before milestone/release merges.

## 7. Redis, Worker and gRPC rules

- Redis Streams is the project message-broker mechanism; do not replace it with RabbitMQ/Kafka without an approved architecture change.
- At least one real producer and consumer must remain demonstrable.
- Use Transactional Outbox for reliable event publication.
- Consumers must be idempotent and use retry/dead-letter behavior for the designed flows.
- gRPC Recommendation is an independent service and REST API is its client.
- Do not move recommendation logic into the Controller just to simplify a task.
- Optional AI may rewrite explanations only; it cannot alter deterministic safety/ranking/LDAS decisions.

## 8. Frontend rules

- Keep React code under `src/LongevityDiet.Web/src`.
- Reuse the existing API client/auth conventions.
- Do not call SQL/Redis/gRPC directly from the browser.
- Use React Query for server-state patterns where appropriate.
- Use React Hook Form + Zod for non-trivial forms/validation where appropriate.
- Keep pages orchestration-focused; extract reusable UI/business presentation pieces when they become meaningful.
- Do not duplicate API base URLs, authentication logic, or error parsing across pages.
- Preserve responsive behavior and accessible labels/states.

## 9. Security and configuration

- Never commit `.env`, passwords, tokens, connection strings with real secrets, private keys, or credentials.
- Local secrets belong in ignored `.env` and .NET User Secrets.
- Docker secrets/config come from environment variables.
- Do not weaken JWT validation, authorization policies, refresh-token security, or HttpOnly cookie behavior to make tests pass.
- Do not log passwords, refresh tokens, JWT signing keys, or sensitive personal data.

## 10. Testing requirements

Every task owner is responsible for tests appropriate to the change:

- deterministic business rules -> unit tests;
- API/auth/DB/contracts -> integration tests;
- critical user flow -> E2E where appropriate.

Before opening a PR:

```powershell
pwsh .\scripts\Validate-ProjectStructure.ps1
dotnet build .\LongevityDiet.sln -c Debug
dotnet test .\LongevityDiet.sln -c Debug --no-build

cd .\src\LongevityDiet.Web
npm run lint
npm run build
```

For changes affecting the complete runtime, also verify Docker Compose and the relevant E2E flow.

GitHub Actions runs `.github/workflows/project-quality.yml` on pushes and pull requests to `develop` and `main`. It re-validates the frozen structure, Docker Compose configuration, .NET build/tests, frontend lint and frontend build. CI treats .NET warnings as errors so new owned-code warnings must be fixed rather than ignored.

## 11. Git workflow

- `main` = stable weekly milestone.
- `develop` = integration branch.
- Create feature branches from `develop`.
- Naming: `feature/w{week}-t{task}-{short-name}`.
- Merge feature -> `develop` only after review and quality gates pass.
- Merge `develop` -> `main` after the week's agreed scope is complete and regression-tested.
- Do not commit directly to `main`.
- Keep commits focused; do not mix architecture refactors with unrelated feature work.

## 12. Architecture changes

The following require explicit team approval before implementation:

- adding/removing/renaming a project or deployable service;
- changing FE/BE/service ports or runtime boundaries;
- changing database/message-broker technology;
- bypassing API -> Services -> Repository;
- changing REST <-> gRPC responsibilities;
- changing Outbox/Worker/Redis ownership;
- introducing a new external service;
- changing authentication/security model.

If approved, update the affected ADR, C4/architecture diagrams, README and validation rules in the same change.

## 13. Definition of Done

A task is not Done until:

1. code follows the frozen architecture;
2. build passes with no owned-code warnings/errors;
3. tests for changed behavior pass;
4. validation/auth/error handling are correct;
5. migrations/contracts/docs are updated when affected;
6. no secret or generated artifact is committed;
7. no duplicate or placeholder implementation remains;
8. reviewer verifies the change;
9. `scripts/Validate-ProjectStructure.ps1` passes;
10. the feature runs end-to-end in the scope promised by the task.
