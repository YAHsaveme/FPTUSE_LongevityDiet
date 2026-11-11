# ADR-005 — Independent Tracking & Progress REST: read-only migration slice

Ngày: 11/11/2026. **Hiện trạng: dịch vụ đọc dữ liệu độc lập, chưa phải full Tracking domain cutover.**

## Triển khai

- `src/LongevityDiet.Tracking.Api` là Web API .NET 9 chạy như process/container riêng trên internal :8084 (QA localhost :18084), xác thực JWT bằng issuer/audience/key giống Identity transitional API.
- Dùng **duy nhất** `TrackingDbContext` với `LongevityTrackingDb` và 2 migrations đã triển khai từ trước. Không có `LongevityDietDbContext`, không gọi SQL database Identity/Catalog/Planning hay Worker.
- `GET /api/v1/activities` (pagination, from/to), `GET /api/v1/activities/{id}`, `GET /api/v1/activities/goal`, `GET /api/v1/ldas/latest`, `GET /api/v1/ldas/history`; readiness `/ready` chỉ 200 khi TrackingDb đọc được, liveness `/health` độc lập.
- Mọi truy vấn dữ liệu riêng tư đều lọc theo UserId **từ JWT đã xác thực**, không từ query/header không đáng tin. Soft-deleted Activity bị ẩn; LDAS chỉ đọc snapshot đã tồn tại, **không tự bịa điểm khi thiếu dữ liệu**.
- Có `docker-compose.tracking.yml` tùy chọn, không ảnh hưởng default Web → Gateway → legacy REST.

## Test thực tế

`node scripts/Test-Tracking-Service-Http.mjs` trên QA Docker: **27/27 PASS**: đăng ký hai tài khoản giả qua Gateway, cập nhật Profile, ghi Activity qua **owner transitional API** vào TrackingDb; Tracking REST riêng đọc đúng bản ghi, Activity Goal và lịch sử LDAS; JWT 401 (gồm token sai), cross-user IDOR 404 và lịch sử dữ liệu cách ly, lọc từ/ngày đến, chặn khoảng ngày đảo ngược, chặn page/pageSize không hợp lệ hoặc gây tràn 32-bit SQL OFFSET; snapshot LDAS thực và không bịa điểm khi chưa có dữ liệu; POST chưa an toàn vẫn 405.

Các trường hợp này chứng minh **tái sử dụng cùng TrackingDb đã được tách logic**, không tạo bản sao dữ liệu/SQL join chéo domain.

## Chưa xong

- Để chuyển các **write endpoints** sang Tracking service phải chuyển timezone/active-profile thành **Identity copied read model** bằng event, sau đó bảo đảm Recalculate LDAS dùng Meal/Window signals được Planning đẩy theo version, hoạt động các `TrackingOutbox` và phiên bản hóa đúng.
- Không bật POST/PUT/DELETE trực tiếp ở service mới khi chưa bảo toàn tính toán điểm/outbox; làm vậy sẽ âm thầm hỏng nghiệp vụ. Các thao tác ghi hiện vẫn ở legacy REST qua Gateway.
- Catalog process có DB riêng nhưng chưa cutover toàn bộ CRUD/Rule Governance; Identity/Planning processes và 6 logical target DBs/TLS443 chưa hoàn tất.
- Test E2E, Database migration, multi-user data isolation phải được xác nhận lại trên runner GitHub Linux. Không gọi target hoàn thành 100%, chưa có reviewer/giảng viên ký nghiệm thu.

## Chạy thử trên QA

```powershell
cd D:\PRN232\FPTUSE_LongevityDiet
docker compose -p prn232-acceptance -f docker-compose.yml -f D:\PRN232\DockerRuntime\prn232-acceptance.volumes.yml -f docker-compose.gateway.yml -f docker-compose.catalog.yml -f docker-compose.tracking.yml --env-file .env up -d --build tracking-api
node scripts/Test-Tracking-Service-Http.mjs
```

Các cổng chỉ bind **127.0.0.1** trên Docker QA. Đừng chạy dữ liệu tổng hợp hay câu lệnh dừng container lên production.
