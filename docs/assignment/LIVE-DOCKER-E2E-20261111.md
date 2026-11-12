# PRN232 — Kiểm chứng đầu-cuối trên Docker thật (11/11/2026)

Repo: `D:\PRN232\FPTUSE_LongevityDiet`. Nhánh kiểm thử: `feature/w3-t4-rule-governance-20261109`. Môi trường: Windows + Docker Desktop WSL2 ở ổ D, profile Compose QA `prn232-acceptance`, hai volume riêng (SQL/Redis). Dữ liệu kiểm thử là **tài khoản giả**, không chứa thông tin người thật.

## Kết quả tự động có thể chạy lại

```powershell
Set-Location D:\PRN232\FPTUSE_LongevityDiet
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\Test-Live-Docker-Acceptance.ps1
# Full scheduled-notification test (takes approximately one local due-time window):
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\Test-Live-Docker-Acceptance.ps1 -VerifyTimedNotification
```

Bài kiểm thử chỉ cho phép `localhost`/`127.0.0.1`/`::1`; tạo account và ghi bản ghi vào SQL Server QA, **không được chạy vào môi trường production hoặc database dùng chung**.

| Kiểm tra thực tế | Trạng thái |
| --- | --- |
| JWT register trên SQL Server | PASS |
| Hồ sơ/onboarding, kiểm tra thiếu screening | PASS |
| Xác minh dị ứng, nhóm AdultGeneral | PASS |
| 14 ngày / 42 bữa ăn, loại trừ dị ứng peanut đã nhận diện | PASS |
| Ensure-current không nhân bản plan đang active | PASS |
| Baseline/During/FollowUp lưu trong SQL | PASS |
| Tài khoản khác không xem được nhật ký sức khỏe | PASS |
| Ghi nhận Activity vào TrackingDb | PASS |
| REST API -> gRPC ActivityCoach HTTP/2 -> 35 phút từ activity | PASS |
| Thành viên thường không thể mở admin rule queue (403) | PASS |
| PUT reminder preferences tạo identity SQL outbox | PASS |
| API outbox -> Redis identity stream -> Worker đọc & ACK, pending 0 | PASS |
| Lịch nhắc đúng giờ, Worker tạo notification thật trên SQL | PASS |
| Unread count, mark-read, chống IDOR giữa hai tài khoản | PASS |
| Redis worker event đi ngược về API notifications | PASS |

**Lỗi thực tế đã tìm ra và sửa:** API gọi `ActivityCoach.Recommend` nhưng server gRPC chỉ map `RecommendationProtoGrpcService`, dẫn đến HTTP 500 `Unimplemented` khi gọi `GET /api/v1/recommendations/activity`. Sửa `src/LongevityDiet.Recommendation.Grpc/Program.cs` map cả `ActivityCoachEndpoint`; API chuyển lỗi `Unimplemented` thành 503 có kiểm soát. Sau build lại API+gRPC và chạy lại cùng test trên SQL thật, **REST_TO_GRPC_LIVE=PASS**.

**Test suite hiện tại:** `dotnet test LongevityDiet.sln -c Release` đạt 91 unit + 80 integration = 171/171. Build Docker API + gRPC đã qua; SQL Server có ba database, xác nhận lịch sử migrations 11 chính / 2 Tracking / 1 Worker. Redis consumer group đọc và ACK được event reminder cập nhật tùy chọn. Endpoint `/ready` được xác nhận HTTP 200 sau thời gian khởi động.

## Những phần chưa thể ghi 100% nghiệm thu

- Worker **đã thực sự gửi thông báo theo lịch** và API nhận về qua Redis rồi lưu SQL, test unread/mark read/IDOR đạt. **Chưa kiểm chứng riêng** restart/replay, xử lý dead-letter và nhiều Worker cạnh tranh.
- Tracking LDAS: chưa có bằng chứng meal/eating-window signals từ owner chạy vào TrackingDb; không được tự gán điểm hoặc khẳng định đủ mọi dữ liệu.
- Benchmark p50/p95, browser/manual accessibility và kịch bản full release (đặc biệt trên trình duyệt di động) chưa kiểm chứng.
- Công thức nấu ăn, chất dinh dưỡng và các nguy cơ dị ứng chéo chưa được chuyên gia kiểm định; không tuyên bố cá nhân hóa y khoa hoặc kéo dài tuổi thọ chắc chắn.
- Runtime đang ở Development, cổng chỉ bind `127.0.0.1`, không phải hệ thống production.
- Trước khi đưa lên `develop` cần kiểm tra CI, tác động với code nhóm, tránh đè thay đổi nhóm và có bằng chứng hạng mục bắt buộc.

**Không đưa** `.env`, JWT, password, volume backup, file SQL hay dữ liệu thật vào Git.
