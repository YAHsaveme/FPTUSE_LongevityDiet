# Task 1 - Security, DI, Resilience, Observability & Performance

**Owner:** Thành viên 1
**Reviewer:** Thành viên 3
**Branch:** `feature/w4-t1-hardening`
**Status:** Planned

## Mục tiêu

Hardening toàn hệ thống trước release để auth/ownership, DI lifetime, dependency failure, error contract, tracing và performance có behavior rõ ràng và có evidence.

## Security & authorization

- Audit Member/Admin policies và mọi user-owned resource.
- Không tin UserId từ request body khi có current-user context.
- Review JWT lifetime, refresh rotation/replay, revoke/logout, disabled account.
- Test object-level authorization/IDOR theo hướng OWASP API1.
- Test function-level authorization cho Admin surface theo hướng OWASP API5.
- DTO validation, over-posting prevention, bounded pagination.
- Rate limit auth/recommendation endpoint phù hợp.
- ProblemDetails production không leak stack trace.
- Log redaction: không password/JWT/raw refresh token/sensitive answer không cần thiết.

## Dependency Injection quality gate

- Dependency được constructor-inject, không service-locator tùy tiện.
- `LongevityDietDbContext` là scoped.
- Singleton không capture scoped dependency.
- Worker tạo DI scope cho scoped unit-of-work.
- Typed gRPC client đăng ký tập trung.
- Options/config registration có validation phù hợp.
- Không `new` infrastructure dependency bên trong business service.
- Service registration rõ responsibility, không tạo god composition extension.

## Resilience & health

- gRPC deadline/timeout + CancellationToken.
- Bounded retry/backoff chỉ cho transient/idempotent operation.
- Không retry business validation/authorization failure.
- Circuit-breaker chỉ thêm khi có measurable value; không over-engineer.
- Liveness/readiness phản ánh SQL/Redis/gRPC/Worker dependency thật.
- Degraded/unavailable behavior được frontend/API biểu diễn rõ.

## Logging & exception handling

- RFC7807/ProblemDetails nhất quán.
- 400/401/403/404/409/429/5xx semantics rõ.
- Correlation/Trace ID có trong log/error context phù hợp.
- Production response không leak exception internals.
- Structured logging dùng field, không chỉ ghép chuỗi message.

## Observability & performance

- CorrelationId/TraceId/EventId propagation REST -> gRPC và Outbox -> Redis -> Worker.
- Structured logs + metrics cho request/gRPC/outbox/worker.
- Baseline login, catalog, plan, dashboard, recommendation, event throughput.
- Kiểm tra N+1/over-fetching/index/query.
- EF Core list query project đúng fields và bounded.
- Frontend kiểm tra duplicate request/bundle.
- Chỉ tối ưu bottleneck có measurement/evidence.

## Testing bắt buộc

- IDOR/object ownership.
- Member gọi Admin API.
- Invalid/revoked/expired auth.
- Over-posting/malformed input.
- Dependency unavailable + retry limit.
- Rate limit threshold/429.
- DI lifetime/startup validation.
- Health state transition.
- One E2E correlation trace.
- No-secret/no-sensitive-log scan.
- Reproducible performance baseline.

## Definition of Done

Critical security regression pass; DI composition/lifetime hợp lệ; exception contract nhất quán; dependency failure predictable; một business action trace được end-to-end; bottleneck quan trọng được fix hoặc ghi accepted trade-off có số đo.
