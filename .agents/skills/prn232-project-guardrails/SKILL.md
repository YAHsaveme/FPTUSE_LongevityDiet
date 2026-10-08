# Skill — PRN232 Project Guardrails

## Primary objective

Maximize mandatory PRN232 grading coverage, implementation quality and repeatable evidence within **4 weeks for 4 Full-Stack members**.

The assignment PDF is the authority for mandatory requirements. Do not replace its requirements with a generic architecture checklist.

## Rubric priority — 100%

1. System architecture and design — 20%.
2. REST API implementation — 20%.
3. Message Broker integration — 15%.
4. gRPC service — 15%.
5. Background Job — 10%.
6. Docker/Cloud deployment — 10%.
7. Documentation and presentation — 10%.

Priority consequence:
- architecture + REST + broker + gRPC + background = 80% and must be demonstrable early;
- optional AI/cloud/polish cannot displace any mandatory rubric item.

## Mandatory technology guardrails

Do not remove or bypass:
- ASP.NET Core REST API (.NET 8+; project uses .NET 9);
- API -> Services -> Repository layering;
- JWT authentication;
- CRUD on core entities;
- search/filter/sort/pagination;
- Entity Framework Core + relational database;
- dependency injection;
- configuration management;
- logging + exception handling;
- independent gRPC service;
- REST API -> gRPC interaction;
- Redis Streams producer + consumer;
- BackgroundService/Worker;
- Docker containerization and Docker Compose deployment;
- Swagger/OpenAPI.

## Four-week delivery gate

### Week 1
Prove mandatory distributed thin slice:
- REST CRUD/query;
- JWT baseline;
- gRPC;
- Redis producer/consumer;
- Worker;
- SQL/Outbox.

### Week 2
Add business value on real data:
- Activity/LDAS;
- Challenge/Dashboard;
- Recommendation v2/replace/feedback;
- integrated UX.

### Week 3
Add real background/safety/governance value:
- reminders/notifications;
- weekly report;
- Worker retry/recovery;
- FMD safety;
- rule governance/audit.

### Week 4
Feature freeze:
- security/DI/resilience/observability/performance;
- clean DB/Docker/config/CI deployment;
- release regression;
- 100% rubric evidence;
- final demo 7/7;
- final README/deliverables/submission cleanup.

## REST contract rule

Every REST feature must identify:
- resource route;
- HTTP method;
- expected success status;
- validation/error statuses;
- authentication/authorization;
- request/response DTO;
- service/repository ownership;
- OpenAPI impact;
- integration test evidence.

Prefer resource-oriented URLs and standard HTTP semantics. Do not hide business logic in controllers.

## DI rule

- Constructor injection over service locator.
- DbContext scoped.
- Singleton must not capture scoped dependency.
- Worker creates scopes for scoped work.
- gRPC typed client/configuration registered centrally.
- Infrastructure dependency must not be instantiated inside business service logic.

## Message/Worker rule

A broker feature is not done until:
- producer publishes a real event;
- consumer group reads it;
- business side effect persists;
- successful processing is acknowledged;
- duplicate delivery is safe;
- pending/retry/recovery path exists;
- logs/correlation allow the flow to be demonstrated.

## gRPC rule

The Recommendation service must remain an independent host/process.
REST is its client.
Browser must not call gRPC directly.
Use typed client registration, deadline/timeout and cancellation propagation.

## Deployment rule

Docker Compose is the mandatory deployment path unless the team explicitly chooses cloud instead.

A deployment claim requires:
- clean config/build;
- six required services;
- readiness/health where relevant;
- Web -> API;
- API -> SQL;
- API -> gRPC;
- Outbox -> Redis -> Worker;
- restart smoke.

“Container is running” is not sufficient proof of successful system communication.

## Final demo rule — 7/7

The presentation must explicitly show:
1. System architecture.
2. REST API functionality.
3. Background job execution.
4. Message publishing and consuming.
5. gRPC communication.
6. Docker or cloud deployment.
7. End-to-end business workflow.

## Deliverables rule

Before submission verify:
- complete source;
- EF migrations/database scripts;
- Dockerfiles;
- Docker Compose;
- Swagger/OpenAPI;
- root README with:
  - Project description;
  - System architecture;
  - Technology stack;
  - Installation guide;
  - Deployment instructions;
  - Team member responsibilities.

## Scope rule

If schedule slips, cut in this order:
1. optional AI;
2. optional cloud deployment;
3. advanced animations/polish;
4. bonus analytics/admin polish.

Never cut mandatory REST/JWT/query, BackgroundService, Redis producer/consumer, gRPC, Docker Compose, README deliverables or demo evidence.

## Contract rule

Every feature change must identify:
- API/contract impact;
- data model/migration impact;
- frontend impact;
- tests;
- configuration/security impact;
- observability/demo evidence.

## Evidence rule

A mandatory technology is not “done” until it can be demonstrated through repeatable evidence such as:
- automated test;
- Swagger/API response;
- runtime log/trace;
- persisted state;
- Docker Compose output;
- browser E2E;
- architecture/document link.

Do not claim planned work as implemented.

## Clean-project rule

Delete only when a file/folder is:
- generated and reproducible;
- obsolete and replaced by a named canonical source;
- duplicate and verified unused.

Safe final-cleanup examples:
- .vs;
- bin/obj;
- node_modules/dist;
- TestResults/coverage;
- Playwright reports;
- temporary logs.

Do not delete migrations, lock files, canonical docs, ADRs, scripts with real value, Docker files, source, or unknown files without evidence.

## Health-domain rule

Keep the product in wellness/education scope.
Do not convert project heuristics into clinical claims.
Allergy/exclusion remains a hard constraint.
FMD remains safety-gated.
AI cannot override deterministic safety/ranking.
