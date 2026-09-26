# Roadmap 9 Weeks - Longevity Diet Companion

## Baseline đã hoàn thành và không được lặp lại
- Research, business analysis và scope.
- Functional/non-functional requirements.
- Safety/privacy/AI guardrails.
- Database design ở mức architecture.
- PRN232 traceability.
- 9 architecture diagrams + diagram QA.
- .NET 9 solution scaffold.
- React + TypeScript + Vite scaffold.
- Premium landing page baseline.
- ASP.NET Core HTTPS hosting của frontend.
- Swagger/OpenAPI + health baseline.
- Docker Compose, SQL Server và Redis baseline.
- Dependency setup cho EF Core, JWT, gRPC, Redis, Serilog và frontend.

## Roadmap

| Week | Theme | Kết quả bắt buộc |
|---|---|---|
| 1 | Core Product Foundation + Distributed Thin Slice | Auth/Profile, Catalog/Rules, Meal Plan/Log, REST->gRPC và Outbox->Redis->Worker có vertical slice thật |
| 2 | Adherence, Activity & 14-Day Habit System | Activity tracking, LDAS, progress analytics và 14-day challenge |
| 3 | Recommendation & Planning Intelligence | Ranking v2, explainability, feedback, planner quality và replacement |
| 4 | Background Business Features | Reminder, notification, weekly report, retry/DLQ và scheduled processing |
| 5 | FMD Safety Module & Rule Governance | FMD education/safety gate, cycle tracking, rule governance và audit |
| 6 | Security, Reliability & Observability | Authorization hardening, resilience, observability và performance baseline |
| 7 | Product Integration & UX Quality | Full integration, responsive/accessibility, UX consistency và frontend performance |
| 8 | Release Candidate & Deployment Readiness | Clean deployment, migration/seed reliability, CI/RC và regression |
| 9 | Stabilization, Evidence & Final Presentation | Bug fixing, evidence pack, demo rehearsal và final submission |

## Task folders

- `Week 1/` - 4 task chi tiết.
- `Week 2/` - 4 task chi tiết.
- `Week 3/` - 4 task chi tiết.
- `Week 4/` - 4 task chi tiết.
- `Week 5/` - 4 task chi tiết.
- `Week 6/` - 4 task chi tiết.
- `Week 7/` - 4 task chi tiết.
- `Week 8/` - 4 task chi tiết.
- `Week 9/` - 4 task chi tiết.

## Branch convention

`feature/w{week}-t{task}-{short-name}`

Ví dụ:
`feature/w1-t1-auth-profile`

## Planning rule
- Mỗi tuần chỉ có 4 major task.
- Nếu hoàn thành sớm nhờ AI, ưu tiên test coverage, edge case, reliability và business value.
- Không tạo module ngoài scope chỉ để lấp thời gian.
- Không đổi architecture chỉ vì một task muốn code nhanh hơn; thay đổi lớn phải cập nhật ADR/diagram tương ứng.
