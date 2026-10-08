# Task 2 - Database, Docker, Configuration, CI & Deployment Readiness

**Owner:** Thành viên 2
**Reviewer:** Thành viên 4
**Branch:** `feature/w4-t2-release-readiness`
**Status:** Planned

## Mục tiêu

Bảo đảm project có thể build, migrate, seed và chạy từ clean environment mà không phụ thuộc trạng thái máy developer; đồng thời chứng minh toàn bộ service bắt buộc giao tiếp thành công trong Docker Compose.

## Database readiness

- Audit migration order + ModelSnapshot.
- Fresh database migrate từ zero.
- Seed idempotent, chỉ reference/demo data cần thiết.
- FK/index/unique/orphan/reference integrity.
- Query/index review dựa trên evidence.
- Verify backup/restore approach cho demo/local environment.
- Không commit database dump/backup binary.

## Docker & configuration

- Audit multi-stage build, `.dockerignore`, health checks, volume/ports.
- Không bake development secret vào image.
- `.env.example` chỉ placeholder.
- JWT/SQL/Redis/gRPC config có environment override và fail-fast hợp lý.
- Compose dependency dùng health/readiness khi service thật sự phải ready.
- Compose restart giữ đúng persistence cần thiết.
- Không expose SQL/Redis/gRPC public hơn mức demo cần thiết.

## Required service communication matrix

Phải verify trong composed environment:
1. Browser -> Web.
2. Web -> REST API.
3. REST API -> SQL Server.
4. REST API -> Recommendation gRPC.
5. API business transaction -> SQL + Outbox.
6. Worker -> SQL Server.
7. Worker publisher -> Redis Streams.
8. Redis consumer group -> Worker.
9. Worker -> persisted async result.
10. UI/API đọc được kết quả cuối.

## CI quality gates

1. structure/task validation;
2. Docker Compose config validation;
3. `dotnet restore`;
4. `dotnet build`;
5. `dotnet test`;
6. frontend `npm ci`;
7. frontend lint;
8. frontend build;
9. release-only infra/E2E/Docker smoke phù hợp.

Không add thêm CI/security scanner nếu nó tạo noise hoặc yêu cầu paid feature mà team không dùng. Ưu tiên signal ổn định, repeatable.

## Deployment/runbook

Document và verify:
- prerequisites;
- start/stop/restart;
- logs;
- liveness/readiness;
- migration/seed;
- backup/restore;
- Redis inspection;
- Worker failure recovery;
- common troubleshooting;
- config/secrets;
- recovery/rollback policy thực tế;
- RC version/known issues/environment assumptions.

## Testing bắt buộc

- Fresh migrate.
- Seed twice/idempotent.
- Clean Docker image build.
- `docker compose config`.
- Full six-service Compose start.
- Missing required config fail-fast.
- Health/readiness transition.
- Required communication matrix pass.
- Restart persistence.
- Redis/gRPC controlled failure + restore.
- Secret/generated-artifact scan.
- Clean setup theo README/runbook.

## Definition of Done

Một clean environment có thể dựng hệ thống bằng documented commands; migration/seed/Docker/config không phụ thuộc secret hoặc state ngầm trên máy developer; sáu service bắt buộc giao tiếp thành công và có runtime evidence.
