# Task 3 - Automated Regression & End-to-End Release Test

**Owner:** Thành viên 3  
**Reviewer:** Thành viên 1  
**Branch:** `feature/w8-t3-release-regression`

## Mục tiêu
Tạo release regression suite đủ bắt lỗi integration giữa các module trước RC.

## Test layers
- Unit tests: business rules.
- Integration tests: ASP.NET Core API với WebApplicationFactory/TestServer hoặc fixture phù hợp.
- Infrastructure integration: SQL/Redis/gRPC khi cần.
- E2E/smoke: critical product journeys.

ASP.NET Core integration testing chuẩn dùng `WebApplicationFactory<TEntryPoint>` để boot SUT và tạo HttpClient test.

## Critical scenarios
1. Register/login/profile.
2. Catalog/rule read/admin mutation.
3. Generate plan + replace.
4. Meal/activity log.
5. LDAS/challenge/dashboard.
6. REST -> gRPC.
7. Outbox -> Redis -> Worker.
8. Notifications/report.
9. FMD safety block.
10. Admin rule/audit flow.

## Test data
- deterministic fixtures.
- isolated user/data.
- cleanup/reset strategy.
- no dependency on manual DB state.

## Quality gates
- flaky test = defect.
- no order-dependent tests.
- async operations bounded by timeout.
- failures produce useful diagnostics.

## Deliverables
- Release regression suite.
- One-command test path.
- Test matrix.
- Known limitations documented.

## Definition of Done
Release candidate chỉ được chấp nhận khi regression suite chạy repeatable trên clean test environment.
