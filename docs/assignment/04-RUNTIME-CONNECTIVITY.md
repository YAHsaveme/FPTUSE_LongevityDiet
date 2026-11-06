# Kiểm tra kết nối thực tế — LongevityDiet PRN232

**Phạm vi:** bài tập PRN232, không phải cam kết sản phẩm y tế hoặc hệ thống production. Các sơ đồ chuẩn ở [one-page](one-page/README.md).

| Luồng | Kết nối thật trong code | Bằng chứng / giới hạn |
| --- | --- | --- |
| Đăng nhập | Web → AuthController → AuthenticationService → Identity EF Core → JWT | Unit + integration auth tests. |
| Vận động | Web → TrackingController → TrackingService → TrackingDbContext → SQL Tracking | Activity CRUD, phân quyền theo người dùng, goal và weekly summary được kiểm thử bằng SQLite. |
| Đề xuất | Web Activity → `GET /api/v1/recommendations/activity` (JWT) → TrackingService → typed gRPC `ActivityCoach.Recommend` (HTTP/2) → REST response → Web | **Kiểm thử Kestrel HTTP/2 thật PASS** với SQLite test DB; dữ liệu của người dùng thứ hai được cách ly. Ngắt gRPC thì REST trả HTTP 503. Không gửi email, token hay thông tin nhận diện vào gRPC. |
| Đăng ký nhắc nhở | REST ReminderService → lưu Preferences + IdentityOutbox **cùng giao dịch SQL** → IdentityRedisBridge → Redis `ldc:identity-events` | Dùng outbox; Redis smoke E2E đã chạy với Redis thật và SQLite (chưa phải SQL Server). |
| Phát nhắc nhở | Redis → Background Worker → Worker database/schedule → WorkerOutbox → Redis `ldc:worker-events` → IdentityRedisBridge → IdentityInbox + UserNotification → REST Notifications → Web | Worker/notification integration tests + Redis smoke; có idempotency và kiểm tra opt-in/disabled khi ghi kết quả. |
| Theo dõi LDAS | Activity log → TrackingService → ScoreDimension, AdherenceScore | Điểm tổng **null** khi thiếu Meal/Eating Window; không tạo tín hiệu dữ liệu giả. |

## Các điều kiện chưa được chứng nhận hoàn tất

- **Chưa xác nhận Docker Compose toàn bộ chạy cùng SQL Server thật** và tất cả migration trên môi trường đó. Test API/Worker mặc định dùng SQLite cách ly.
- **Chưa đủ dữ liệu thật từ Meal Log / Eating Window** để cấp một điểm LDAS tổng hoàn chỉnh.
- Hiện các luồng đã có code và kiểm thử nêu trên, **không được đồng nhất với việc đã nghiệm thu toàn hệ thống production**.
- Các mũi tên C1/C2 mô tả quan hệ thực tế và chiều chạy nghiệp vụ. C2 đi sâu đúng **một** container ASP.NET Core REST API; còn Worker là container riêng, được thể hiện ở C1.

## Cách xác thực lại

```powershell
dotnet test tests/LongevityDiet.UnitTests/LongevityDiet.UnitTests.csproj -c Release
dotnet test tests/LongevityDiet.IntegrationTests/LongevityDiet.IntegrationTests.csproj -c Release
npm --prefix src/LongevityDiet.Web run lint
npm --prefix src/LongevityDiet.Web run build
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Export-OverallDiagrams.ps1
node scripts/Validate-CourseLinks.js
```

Với Redis smoke sử dụng container tạm và dọn sau chạy:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Run-Member1RedisSmoke.ps1
```

Chỉ chạy nếu Docker đã sẵn sàng và ổ hệ thống đủ dung lượng. Không xóa volume hoặc database thật để đạt kết quả kiểm thử.

## Complete request/response and asynchronous sequence

The canonical [C2 component diagram](one-page/C2.drawio) is an overall controller/service/persistence view, NOT a sequence chart. The written runtime paths and tests above remain the authoritative evidence of request-response and asynchronous Redis/Worker processing.

Key implementation distinction: IdentityRedisBridge consumes Worker results
and calls ReminderService.PersistNotificationResultAsync. ReminderService
then writes IdentityInbox and UserNotification in the Identity database.
The bridge does not write those EF Core entities directly.

For the member's activity advice, Auth register/login are anonymous;
GET /api/v1/recommendations/activity requires JWT. Only numeric activity
aggregates are forwarded via HTTP/2 to ActivityCoach.Recommend. Responses
return to the same Web user, with HTTP 503 when gRPC is unavailable.

Full Docker Compose + SQL Server runtime remains outside the currently
verified test evidence; no architecture diagram can replace that check.
