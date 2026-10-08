# Roadmap 4 Weeks - Longevity Diet Companion

## Baseline đã hoàn thành và không được lặp lại

- Research, scope, business/functional/non-functional requirements.
- Safety/privacy/AI guardrails.
- Database/API/gRPC/event design ở mức architecture.
- PRN232 và book-to-software traceability.
- 9 architecture diagrams + diagram QA.
- .NET 9 solution scaffold.
- React + TypeScript + Vite scaffold.
- Docker Compose, SQL Server, Redis, gRPC, Worker baseline.
- OpenAPI/Swagger, health checks, test projects và CI-quality foundation.
- Week 1 Task 1: Identity/Auth/Profile/Onboarding đã hoàn thành và nghiệm thu.

## Roadmap 4 tuần

| Week | Theme | Kết quả bắt buộc |
|---|---|---|
| 1 | Core Product Foundation + Distributed Thin Slice | Catalog/Rules, Meal Plan/Log, gRPC recommendation, Outbox -> Redis -> Worker hoạt động thật; Auth/Profile giữ nguyên baseline đã Done |
| 2 | Core Product Value + Recommendation + UX | Activity, LDAS, 14-day challenge, dashboard, recommendation v2/replace/feedback và application UX tích hợp |
| 3 | Background Features + FMD Safety + Governance | Reminder, notification, weekly report, worker reliability, FMD safety/cycle, rule governance và admin audit |
| 4 | Hardening + Release + Demo + Submission | Security/resilience/observability/performance, DB/Docker/CI/deploy readiness, regression/E2E, PRN232 evidence, demo và final submission |

## Integration strategy

1. Không phá baseline Week 1 Task 1 đã pass.
2. Ưu tiên dependency theo vertical slice thay vì làm từng layer rời rạc.
3. Contract dùng chung phải freeze sớm trong tuần.
4. Mỗi task merge qua review chéo trước khi integration cuối tuần.
5. Cuối mỗi tuần chạy build/test + frontend build + Docker smoke phù hợp.
6. Week 4 là feature freeze: chỉ hoàn thiện blocker, hardening, regression và submission.

## Success criteria sau 4 tuần

- Main user journey: Register -> Onboarding -> Plan -> Log -> Activity -> LDAS -> Challenge -> Dashboard.
- Recommendation: REST -> gRPC -> ranked/explainable result -> replace/feedback.
- Async flow: SQL + Outbox -> Redis Streams -> Worker -> persisted side effect.
- Background feature: reminder/notification/weekly report chạy thật và idempotent.
- FMD chỉ ở phạm vi education/tracking, có safety gate backend.
- Admin quản lý catalog/rules/version/audit có authorization rõ.
- Search/filter/sort/pagination, JWT, gRPC, Redis, Worker, SQL Server, Docker và Swagger đều có runtime evidence.
- Clean environment build/migrate/run được.
- Regression/E2E và demo rehearsal pass.
- Final docs/traceability khớp implementation, không chứa secret hoặc generated junk.


## PRN232 grading gate

| Criterion | Weight | Deadline for working evidence |
|---|---:|---|
| System architecture and design | 20% | Architecture baseline already exists; final evidence Week 4 |
| REST API implementation | 20% | Core evidence Week 1 |
| Background Job | 10% | Thin slice Week 1; business job/reliability Week 3 |
| Message Broker integration | 15% | Producer/consumer thin slice Week 1; recovery Week 3 |
| gRPC service | 15% | Independent REST -> gRPC thin slice Week 1; recommendation quality Week 2 |
| Docker/Cloud deployment | 10% | Baseline exists; clean deployment evidence Week 4 |
| Documentation and presentation | 10% | Maintained weekly; final evidence/demo Week 4 |
| **Total** | **100%** | No mandatory gap accepted |

## Scope discipline

If schedule slips, cut in this order:
1. optional local AI;
2. optional public-cloud deployment;
3. advanced animation/visual polish;
4. bonus analytics/admin polish.

Do **not** cut:
- REST CRUD + layered architecture;
- JWT;
- search/filter/sort/pagination;
- EF Core + relational DB;
- Dependency Injection/configuration/logging/exception handling;
- BackgroundService;
- Redis producer + consumer;
- independent gRPC + REST interaction;
- Docker Compose;
- Swagger/OpenAPI;
- README deliverables;
- final demo 7/7.

Canonical rubric/evidence matrix: `../10-PRN232-TRACEABILITY.md`.
Canonical test/deploy/demo plan: `../09-TEST-DEPLOY-DEMO.md`.
