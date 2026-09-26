# Week 6 - Security, Reliability & Observability

## Mục tiêu tuần
Hardening hệ thống trước khi bước vào integration/release: authorization, resilience, rate limiting, health/readiness, logs/metrics/tracing và performance baseline.

## Phân công
| Task | Owner | Reviewer |
|---|---|---|
| Task 1 - Authorization, Session Security & Privacy Hardening | Thành viên 1 | Thành viên 3 |
| Task 2 - Resilience, Rate Limiting, Health & Readiness | Thành viên 2 | Thành viên 4 |
| Task 3 - Structured Logging, Correlation, Metrics & Tracing | Thành viên 3 | Thành viên 1 |
| Task 4 - Performance, Load Testing & Database Optimization | Thành viên 4 | Thành viên 2 |

## Exit criteria
- Authorization audit pass.
- Rate limiting/resilience policy có test.
- Health/readiness phản ánh dependency thật.
- Trace được request REST -> gRPC -> Worker.
- Có performance baseline và index/query fixes.
