# 09 — Test, Deployment & Final Demo Plan

This document defines the release-quality path for the 4-week PRN232 delivery. It is designed to produce repeatable evidence, not only screenshots or manual claims.

## 1. Test strategy

### Unit tests

Use unit tests for deterministic business logic:
- rule applicability;
- allergy/exclusion hard filters;
- LDAS dimensions and score versioning;
- eating-window calculations;
- recommendation scoring/tie-breaks;
- challenge/streak rules;
- FMD safety state transitions;
- retry/backoff decision logic where isolated testing is practical.

### HTTP/API integration tests

Use `WebApplicationFactory<Program>` for focused API/auth/contract scenarios:
- JWT authentication and protected resources;
- ownership/authorization;
- Profile CRUD;
- Catalog CRUD + search/filter/sort/pagination;
- validation and RFC7807 ProblemDetails;
- status-code semantics;
- concurrency/state conflicts where applicable.

Do not attempt to replace all behavior with mocks. Integration tests should validate the real ASP.NET Core request pipeline.

### Infrastructure integration tests

Use real infrastructure for the small number of scenarios where provider behavior matters:
- SQL Server migration from zero;
- EF Core relational constraints/query behavior;
- Redis Streams producer/consumer-group behavior;
- gRPC API-to-service communication;
- Outbox -> Redis -> Worker persisted side effect.

**Recommended optimization:** use targeted Testcontainers for SQL Server/Redis integration tests when it reduces manual environment assumptions. Do not migrate every test to containers if `WebApplicationFactory`/SQLite remains sufficient for routine HTTP behavior.

### Contract tests

- OpenAPI critical endpoint/status validation.
- gRPC proto compatibility.
- event-envelope deserialization/schema version.
- public DTOs do not accidentally expose EF Core entities/internal fields.

### Browser E2E

Critical journey:
1. Register/login.
2. Complete onboarding/profile.
3. Browse/search catalog.
4. Generate plan.
5. Log meal/activity.
6. View LDAS/challenge/dashboard.
7. Request recommendation/replacement.
8. Verify async Worker result becomes visible.
9. Admin performs one governed catalog/rule action.

Keep E2E focused on high-value cross-boundary flows; do not duplicate every unit/integration case in the browser.

## 2. PRN232 regression matrix

Release regression must prove:

| Requirement | Minimum automated/runtime proof |
|---|---|
| ASP.NET Core REST | API integration test + Swagger/runtime |
| CRUD | create/read/update/delete on a core entity |
| Layered architecture | structure validator + code review |
| JWT | login + protected route + unauthorized test |
| Search/filter/sort/pagination | combination integration tests |
| Background Job | Worker executes a real business job |
| Message Broker | Redis producer + consumer + persisted side effect |
| gRPC | REST API calls independent gRPC service |
| EF Core/SQL | fresh migration + relational persistence |
| DI | lifetime/registration review + runtime composition |
| Configuration | clean environment + missing-config behavior |
| Logging/exception | structured error/log evidence |
| Docker | clean Compose runtime |
| Swagger/OpenAPI | accessible and current |

## 3. Docker Compose target

Required services:
1. `web`
2. `api`
3. `recommendation-grpc`
4. `worker`
5. `sqlserver`
6. `redis`

Canonical host ports:
- Web: `5173`
- REST API: `8080`
- Recommendation gRPC: `8081`
- SQL Server: `14330 -> 1433`
- Redis: `6379`

Native Visual Studio development remains separate:
- Web: `5173`
- API HTTPS: `7110`
- API HTTP: `5110`
- gRPC: `5010`
- SQL Server: `14330`
- Redis: `6379`

## 4. Health/readiness and startup order

A running container is not necessarily ready.

Release Compose verification should:
- give SQL Server a readiness/health check;
- give API/gRPC/Web appropriate health or smoke probes;
- use `depends_on` health conditions where the dependency truly must be ready;
- keep Redis/Worker failure behavior observable;
- distinguish process liveness from dependency readiness in application health endpoints;
- prove restart does not corrupt state or lose recoverable events.

Expected dependency behavior:
- SQL unavailable -> data operations fail in a controlled way and readiness is unhealthy;
- Redis unavailable -> core SQL transaction can still commit with Outbox; publisher retries later;
- gRPC unavailable -> recommendation flow returns controlled unavailable/fallback behavior;
- Worker unavailable -> events remain recoverable for later processing.

## 5. Configuration and secret handling

Canonical configuration inputs:
- `ConnectionStrings__Default`
- `Redis__ConnectionString`
- `Grpc__RecommendationUrl`
- `Jwt__Issuer`
- `Jwt__Audience`
- `Jwt__SigningKey`
- `ASPNETCORE_ENVIRONMENT`
- optional local AI settings only if that feature is enabled.

Rules:
- commit only placeholders/reference values such as `.env.example`;
- never commit a real signing key/password/token;
- native development secrets use .NET User Secrets/local ignored configuration;
- Docker receives runtime configuration through environment variables;
- required configuration should fail clearly rather than silently default to insecure values.

## 6. Local deployment verification

Clean Docker path:
1. start from a clean source tree;
2. create local `.env` from `.env.example` without committing it;
3. run `docker compose --env-file .env config`;
4. build images;
5. start Compose;
6. migrate/seed the SQL database using the documented path;
7. verify health/readiness;
8. verify Swagger;
9. verify Web -> REST API;
10. verify REST API -> SQL;
11. verify REST API -> gRPC;
12. verify Outbox -> Redis -> Worker;
13. restart the stack and repeat critical smoke checks.

A release candidate is not “deployable” merely because images build.

## 7. CI quality gate

Current GitHub Actions quality gate must continue to validate:
- frozen project/task structure;
- Docker Compose configuration;
- .NET restore;
- .NET Release build;
- .NET tests;
- frontend `npm ci`;
- frontend lint;
- frontend production build.

Release verification additionally runs:
- fresh database migration;
- targeted infrastructure integration tests;
- browser E2E;
- Docker runtime/restart smoke;
- secret/generated-artifact check.

Do not add a new CI tool unless it provides clear signal and the current baseline can support it reliably.

## 8. Final demo — exact PRN232 7/7 checklist

Target duration: about 8–12 minutes.

### 1. System architecture

Show:
- C0/System Context;
- C1/Container Architecture;
- Docker deployment view.

Explain:
- Browser/Web;
- REST API;
- API -> Services -> Repository;
- SQL Server;
- independent Recommendation gRPC;
- Redis Streams;
- Worker;
- synchronous vs asynchronous communication.

### 2. REST API functionality

Show through Swagger/UI:
- login/JWT;
- protected endpoint;
- core CRUD;
- search;
- filtering;
- sorting;
- pagination;
- correct validation/error response.

### 3. Background job execution

Trigger/show a real Worker business job:
- reminder;
- weekly report;
- or another persisted asynchronous result.

Evidence must show that the work is executed outside the request thread.

### 4. Message publishing and consuming

Show:
1. business action creates Outbox row;
2. publisher sends Redis Stream entry;
3. consumer group processes it;
4. business side effect persists;
5. message is acknowledged;
6. duplicate/retry behavior remains safe.

### 5. gRPC communication

Show:
- REST recommendation/replacement request;
- API calling the independent gRPC service;
- ranked result/reason codes returned to API/UI;
- service boundary visible in logs/trace.

### 6. Docker or cloud deployment

Chosen path: Docker Compose.

Show:
- `docker compose ps`;
- required services healthy/running;
- browser/API reachability;
- cross-service communication.

### 7. End-to-end business workflow

Recommended coherent story:
`Register -> Onboarding -> Browse Catalog -> Generate Plan -> Log Meal/Activity -> Recommendation -> Async Event/Worker -> Dashboard/Report`.

Do not demonstrate seven disconnected technology snippets when one integrated story can prove the same rubric more clearly.

## 9. Controlled failure/recovery demo

Prepare one safe case:
- stop gRPC or Redis;
- show controlled application/health behavior;
- restore the service;
- show recovery and no duplicate side effect.

Do not intentionally corrupt the primary demo database.

## 10. Demo reliability

- deterministic synthetic seed data;
- no real personal/sensitive data;
- pre-pull/build container images before presentation;
- prepare commands and browser tabs in advance;
- optional AI disabled unless already proven stable;
- screenshots/log snapshots are backup evidence only, not the primary demonstration;
- run the full demo at least twice consecutively without manual DB repair.

## 11. Release Definition of Done

A task/release is Done only when the relevant items below have fresh evidence:
- code compiles;
- changed critical tests pass;
- API/DTO/OpenAPI contracts are current;
- migrations are valid;
- no secret is committed;
- no generated artifact is committed;
- architecture/task structure validation passes;
- Docker path still works if runtime boundaries changed;
- docs match the implementation;
- reviewer verifies the change.

Final release additionally requires:
- all six required services build/start;
- fresh SQL database migration works;
- Swagger covers critical endpoints;
- REST CRUD/query/JWT evidence exists;
- Redis producer/consumer evidence exists;
- gRPC interaction evidence exists;
- a real Worker job is visible;
- clean Compose communication works;
- README installation instructions are followed successfully by someone other than the author;
- 7/7 final demo items are rehearsed;
- 100% rubric matrix in `docs/10-PRN232-TRACEABILITY.md` is populated with real evidence;
- zero known Critical/High blocker without an explicit mitigation.

## 12. Repository cleanup policy

Safe to remove before final submission because they are reproducible/generated:
- `.vs/`;
- `bin/`;
- `obj/`;
- `node_modules/`;
- `dist/`;
- `TestResults/`;
- `coverage/`;
- Playwright reports/test-results;
- temporary logs;
- local verification databases/backups not required by the assignment.

Keep:
- source code;
- migrations;
- package lock files;
- Dockerfiles/Compose;
- `.env.example`;
- architecture sources/previews;
- ADRs;
- meaningful scripts;
- assignment/task/traceability docs.

Never delete a file merely because it is unfamiliar. Delete only when it is generated, obsolete/duplicated with a canonical replacement, or proven unused.
