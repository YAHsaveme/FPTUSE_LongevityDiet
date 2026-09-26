# Task 2 - Docker, Configuration, Secrets & CI Quality Gates

**Owner:** Thành viên 2  
**Reviewer:** Thành viên 4  
**Branch:** `feature/w8-t2-ci-docker-release`

## Mục tiêu
Chuẩn hóa build/deploy pipeline và loại bỏ khác biệt "chạy máy tôi được" trước RC.

## Docker
Audit:
- multi-stage builds;
- minimal build context;
- .dockerignore;
- non-essential generated files;
- health checks;
- service dependencies;
- persistent volumes;
- internal vs host ports;
- no development-only secret baked in image.

## Configuration
- appsettings base/development.
- environment variables.
- .env.example chỉ chứa placeholder.
- JWT/SQL/Redis/gRPC config documented.
- production-like secret injection strategy.

## CI quality gates
Pipeline tối thiểu:
1. restore;
2. dotnet build;
3. dotnet test;
4. npm ci;
5. npm build;
6. optional lint/type check;
7. compose/config validation;
8. artifact/image build nếu environment cho phép.

## Versioning
- RC identifier.
- build metadata/version visible.
- migration/version correlation nếu cần.

## Testing
- clean Docker build.
- missing config fail-fast.
- health check.
- compose restart.
- no secret scan.
- CI failure on test/build failure.

## Definition of Done
Clean CI-style command sequence dựng được solution và Docker config không chứa secret hoặc dependency ngầm từ developer machine.
