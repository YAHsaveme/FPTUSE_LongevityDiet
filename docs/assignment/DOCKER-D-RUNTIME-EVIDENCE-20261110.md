# PRN232 — Docker Desktop trên ổ D và triển khai kiểm chứng thực tế

Ngày kiểm tra: 10/11/2026 (giờ Việt Nam). Máy Windows: DoVietHoang. Dự án: `D:\PRN232\FPTUSE_LongevityDiet`.

## Trạng thái kiểm chứng

- **Docker Desktop Engine: RUNNING** (WSL2, Linux).
- Docker Desktop `CustomWslDistroDir = D:\DockerData\DockerDesktopWSL` và registry `docker-desktop` xác nhận `BasePath` trên D.
- Disk đang hoạt động: `D:\DockerData\DockerDesktopWSL\disk\docker_data.vhdx` ~123,19 GB. Không di chuyển hoặc chỉnh sửa file VHDX đang hoạt động.
- Disk Docker cũ, không hoạt động từ 01/10/2026 tại `C:\Users\ASUS\AppData\Local\Docker\wsl\disk\docker_data.vhdx` (~1,54 GB) được sao lưu vào `D:\PRN232\DockerRuntime\archive\docker_data-C-stale-20261001.vhdx`. Kiểm tra kích thước và SHA-256 source/destination trùng nhau trước khi xóa file cũ trên C.
- Ổ C từ ~0,35 GB lên **1,90 GB trống**, ổ D còn **106,59 GB trống**.
- Cấu hình Development `.env` được sinh với mật khẩu SQL và JWT signing key ngẫu nhiên, **không commit** (`git check-ignore .env` PASS).
- Compose override lưu riêng tại `D:\PRN232\DockerRuntime\prn232-acceptance.volumes.yml`. Tạo **hai volume độc lập**: `prn232-acceptance-sql-20261110` và `prn232-acceptance-redis-20261110`, không ghi đè volume Docker hiện có của các dự án khác.
- Sửa `src/LongevityDiet.API/Dockerfile`: thêm COPY project `LongevityDiet.Tracking.csproj` trước `dotnet restore`. Build đầu tiên lỗi NETSDK1004, build lại toàn bộ sau sửa **PASS**.

## Sáu dịch vụ RUNNING

- Web: localhost:5173 — HTTP 200 trang chủ.
- API: localhost:8080 — `/health` **200**, `/ready` **200**, `/openapi/v1.json` **200**.
- Recommendation gRPC: localhost:8081 — container Up (chưa làm live request gRPC độc lập).
- SQL Server 2022: localhost:14330 — healthy, migrations đã chạy: **11** trên `LongevityDietDb`, **2** trên `LongevityTrackingDb`, **1** trên `LongevityWorkerDb`.
- Redis 7: localhost:6379 — healthy, `redis-cli PING` = **PONG**.
- Worker: container Up và đang truy vấn các bảng work queue.

Đầu khởi động SQL Server có lỗi đăng nhập vào database chưa tồn tại; sau khởi tạo/migration, ba database tồn tại và `/ready` trả về 200. Không có bằng chứng run production hoặc độ chính xác dinh dưỡng 100% từ các health check này.

## Khởi động lại / kiểm tra / dừng an toàn

Trong PowerShell:

```powershell
Set-Location 'D:\PRN232\FPTUSE_LongevityDiet'
$override = 'D:\PRN232\DockerRuntime\prn232-acceptance.volumes.yml'
docker desktop status
docker compose -p prn232-acceptance -f docker-compose.yml -f $override --env-file .env ps
docker compose -p prn232-acceptance -f docker-compose.yml -f $override --env-file .env up -d
# Khi có cập nhật code và cần build:
docker compose -p prn232-acceptance -f docker-compose.yml -f $override --env-file .env up -d --build
# Dừng tạm không xóa dữ liệu:
docker compose -p prn232-acceptance -f docker-compose.yml -f $override --env-file .env stop
# Chỉ xóa container/mạng, GIỮ volume dữ liệu: tuyệt đối không thêm -v
docker compose -p prn232-acceptance -f docker-compose.yml -f $override --env-file .env down
```

Lưu ý: Cấu hình này là Development chỉ mở các cổng trên `127.0.0.1`; **không dùng cho production**. Không đưa mật khẩu SQL/JWT, `.env`, dữ liệu sức khỏe thực hoặc token vào Git.

## Phạm vi nghiệm thu còn thiếu

Kiểm tra triển khai thực tế đã xác minh build image Docker, start stack, SQL migrations, Redis PING, API/Web HTTP status. Những nội dung Final Assignment khác (gRPC request thật xuyên API, Worker hoàn thành scheduled job và Redis ACK, UI E2E nghiệp vụ nhiều ngày với dữ liệu giả, browser accessibility, kiểm định dinh dưỡng) **chưa được chứng minh trong phiên kiểm tra này**. Không suy diễn 100% từ kết quả build/health.
