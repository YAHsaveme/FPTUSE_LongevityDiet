# Task 2 - Database, Docker, Configuration, CI & Deployment Readiness

**Owner:** Thành viên 2
**Reviewer:** Thành viên 4
**Branch:** `feature/w4-t2-release-readiness`
**Status:** Planned

## Architecture alignment (ADR-005)

- **Target deployment:** Cloud VM -> Docker Engine -> Docker Compose -> private `ldc-network`; only HTTPS :443 public.
- **Data placement:** one SQL Server may host six logical service-owned DBs; `sql-data` mounts `/var/opt/mssql`; `redis-data` mounts `/data` (AOF); named volumes persist on the VM cloud disk.
- **Runtime gate:** target Gateway/services/databases must have real projects/config/Compose evidence before C1 may be called deployed.


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

## Required target service communication matrix

Phải verify trong composed target environment:
1. Browser -> Web Edge: `HTTPS :443`.
2. Web Edge -> API Gateway: private `HTTP/REST :8080` sau public TLS edge.
3. API Gateway -> Identity/Catalog/Planning/Tracking: `REST :8081/:8082/:8083/:8084` bằng Docker service DNS.
4. API Gateway -> Worker operations: `Ops/REST :8086`, Admin only.
5. Planning Service -> Recommendation Service: private `gRPC / HTTP/2 :8085`.
6. Mỗi business service -> **database do chính service sở hữu**: `TDS :1433`; không có foreign-service DB access.
7. Owning-service Outbox publisher -> Event Streams: Redis `XADD :6379`.
8. Background Worker -> Event Streams: `XREADGROUP/XACK :6379`.
9. Background Worker -> `LongevityWorkerDb` cho job/idempotency/retry state; domain-owned result quay lại owning service bằng result event.
10. Recommendation -> optional Local AI: `HTTP :11434` nếu bật; failure phải fallback deterministic.
11. Web/API Gateway -> owning service đọc được final persisted result.

### Persistence placement evidence

- `sql-data` là Docker named volume mount vào SQL Server `/var/opt/mssql`.
- `redis-data` là Docker named volume mount vào Redis `/data`; AOF được bật cho persistence phù hợp.
- Stop/start hoặc recreate container không được làm mất dữ liệu nằm trong named volume.
- Cloud Docker Target phải chứng minh named-volume data nằm trên **persistent disk của VM**, không nằm chỉ trong writable container layer.
- SQL :1433, Redis :6379 và :8080-:8086 không public ra Internet; chỉ HTTPS :443 public.

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
- Full **target Compose topology** start: Web Edge, API Gateway, 4 REST domain services, Recommendation, Worker, SQL Server và Redis.
- Missing required config fail-fast.
- Health/readiness transition.
- Required communication matrix pass.
- Restart persistence.
- Redis/gRPC controlled failure + restore.
- Secret/generated-artifact scan.
- Clean setup theo README/runbook.

## Definition of Done

Một clean environment có thể dựng **Target Architecture** bằng documented commands; migration/seed/Docker/config không phụ thuộc secret hoặc state ngầm trên máy developer; target communication matrix pass; `sql-data`/`redis-data` persistence được chứng minh; chỉ :443 public; và mọi target container/database trong C1 có runtime/Compose evidence. Nếu chưa đạt các điều này thì tài liệu phải tiếp tục ghi rõ Target, không được claim đã deploy.
