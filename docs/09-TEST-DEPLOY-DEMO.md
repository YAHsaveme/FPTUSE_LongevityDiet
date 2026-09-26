# 09 — Test, Deployment & Final Demo Plan

## Test pyramid
### Unit tests
- Rule applicability.
- Allergy hard filter.
- LDAS dimension calculations.
- Eating-window calculation.
- Late-meal calculation.
- Recommendation feature scoring.
- Challenge completion rules.
- FMD safety-state transitions.

### Integration tests
Use test DB/container when practical:
- Repository CRUD/filter/pagination.
- JWT auth + protected endpoint.
- MealLog transaction + Outbox row.
- Outbox publisher → Redis.
- Worker consumes event idempotently.
- API gRPC client → Recommendation service.
- Weekly report persistence.

### Contract tests
- OpenAPI schema/basic validation.
- gRPC proto compatibility.
- Event envelope deserialization/version.

### E2E smoke
1. Register/login.
2. Complete profile.
3. Generate plan.
4. Log meal/activity.
5. Get recommendation.
6. Verify worker processed event.
7. View updated progress/weekly state.
8. Admin updates catalog/rule with audit.

## Definition of Done
A task is done only when:
- code compiles,
- tests for changed critical behavior pass,
- no secrets committed,
- API/DTO documented when public,
- branch merged through PR,
- docs updated if architecture/contract changed.

## Docker Compose target
Services:
1. web
2. api
3. recommendation-grpc
4. worker
5. sqlserver
6. redis

## Local ports (proposal)
- Web: 5173
- REST API: 8080
- Swagger: http://localhost:8080/swagger
- gRPC: 8081 internal/exposed for testing if needed
- SQL Server: 1433
- Redis: 6379

## Environment variables
- ConnectionStrings__Default
- Redis__ConnectionString
- Grpc__RecommendationUrl
- Jwt__Issuer
- Jwt__Audience
- Jwt__SigningKey
- ASPNETCORE_ENVIRONMENT
- OptionalAI__Enabled
- OptionalAI__Endpoint

Commit only `.env.example`, never real secrets.

## Local startup
1. Copy .env.example → .env and set local secrets.
2. `docker compose up -d --build`.
3. Apply migration using documented command or dev migrator.
4. Seed deterministic demo data.
5. Check `/health/ready`.
6. Open Swagger and Web.

## CI proposal — GitHub Actions
On pull request:
- dotnet restore
- dotnet build --no-restore
- dotnet test
- npm ci
- npm run build
- docker compose config validation

On main:
- repeat verification,
- build container images,
- optional deployment after Week 7.

## Final demo script (8–12 minutes)
### Part 1 — Architecture (1–2 min)
Show draw.io container/deployment diagram.
Point out REST, gRPC, Redis Streams, Worker, SQL and Docker.

### Part 2 — REST + JWT (2 min)
Login in Swagger/Web.
Show profile/catalog search/filter/pagination.
Generate meal plan.

### Part 3 — gRPC (1 min)
Request meal replacement.
Show API log calling Recommendation gRPC and reason codes.

### Part 4 — Message broker + Worker (2 min)
Create meal/activity log.
Show Outbox row/message.
Show Redis consumer log and ProcessedEvent.
Show score/report/reminder update.

### Part 5 — Safety/business logic (1 min)
Show allergy exclusion.
Show LDAS explanation.
Show FMD safety gate blocking high-risk scenario.

### Part 6 — Docker (1 min)
Run `docker compose ps`.
Show all services healthy.

### Part 7 — Testing/docs (1 min)
Run selected tests.
Show Swagger + docs + team ownership.

## Demo fallback strategy
- Deterministic seed data.
- Pre-pull Docker images before presentation.
- One `demo-reset` script.
- No dependency on external paid AI/API.
- Optional local AI disabled during grading unless already validated.
- Keep screenshots/log examples only as backup, not primary demo.

## Exit criteria before final submission
- All required services build.
- Docker Compose clean-start tested on another teammate machine.
- Migration from empty DB works.
- Swagger covers all critical endpoints.
- Redis producer/consumer visible.
- gRPC call visible.
- Worker scheduled job visible.
- README installation instructions verified by a teammate who did not write them.
- No committed secrets/default production passwords.
- Documentation and team responsibilities match actual implementation.
