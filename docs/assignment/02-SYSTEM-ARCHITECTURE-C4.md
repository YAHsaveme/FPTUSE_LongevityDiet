# C0, C1, C2 — Kiến trúc tổng thể LongevityDiet hiện tại

Đây là **ba mức C4 chính thức khác nhau**, không trộn lẫn: **C0 (System Context)** cho người dùng/hệ thống; **C1 (Container)** cho tiến trình, cổng, giao thức và database; **C2 (Component)** cho toàn bộ 10 luồng Controller → Service → Persistence → database **trong một REST API container**. Bản vẽ **chỉ đen và trắng**; các đường nối native Draw.io đều có đầu mũi tên và nhãn. Không tạo thêm microservice hoặc database để khiến sơ đồ trông đầy đủ giả.

| Sơ đồ | Draw.io | PDF (một trang) | Phạm vi |
| --- | --- | --- | --- |
| **C0** | [C0.drawio](one-page/C0.drawio) | [C0.pdf](one-page/C0.pdf) | Member/Admin → LongevityDiet; không chứa chi tiết cổng vì đây là *context level* |
| **C1** | [C1.drawio](one-page/C1.drawio) | [C1.pdf](one-page/C1.pdf) | Web, API, gRPC, Redis, Worker, SQL Server và **3 catalog thật**, có port/protocol |
| **C2** | [C2.drawio](one-page/C2.drawio) | [C2.pdf](one-page/C2.pdf) | 10 controller, service, persistence, database-target của REST API :8080 |

## C1 — Kết nối thật (source: docker-compose.yml)

| Nguồn → Đích | Giao tiếp / cổng | Ý nghĩa |
| --- | --- | --- |
| Member/Admin → Web | HTTP, **host :5173 → Nginx :80** | Đăng nhập, quản lý tài khoản và sử dụng các tính năng |
| Nginx Web → REST API | **HTTP, `http://api:8080/api/`** | `/api/` reverse proxy qua Nginx |
| REST API → Recommendation gRPC | **HTTP/2 :8081** | Gọi đề xuất, không truy cập DB từ gRPC |
| REST API ↔ Redis | **TCP :6379**, XADD / XREAD | `IdentityRedisBridge` phát/nhận sự kiện nhắc lịch |
| Redis ↔ Reminder Worker | **TCP :6379**, XREAD / XADD | Worker nhận preference event và trả notification event |
| REST API → `LongevityDietDb` | SQL Server **TCP :1433** | Auth, Profile, Meal Planning, Meal Logging, Recommendation, FMD và Outbox/Inbox |
| REST API → `LongevityTrackingDb` | SQL Server **TCP :1433** | Activity Tracking, adherence, score |
| Reminder Worker → `LongevityWorkerDb` | SQL Server **TCP :1433** | Schedules, dispatch records, idempotency, worker outbox |

**Cổng SQL :14330** là cổng được publish ra host và chuyển tới **container sqlserver:1433**. Ba database là **ba catalog trong cùng SQL Server**: `LongevityDietDb` (21 bảng), `LongevityTrackingDb` (7 bảng), `LongevityWorkerDb` (4 bảng). **Reminder Worker không mở HTTP listener**.

**Đặc biệt:** Recommendation gRPC là *stateless computation service*, **không sở hữu database riêng trong mã nguồn/Compose**. Vẽ thêm database cho service này sẽ sai thực tế. `CloudflareSessions` chỉ là tính năng **có điều kiện khi cấu hình** chứ không phải một container mặc định trong Compose; không được coi là hệ thống triển khai sẵn.

## C2 — Toàn bộ component của REST API

C2 chứa **10 tuyến HTTP**, mỗi tuyến gồm **4 đường kết nối thật có mũi tên**: API router → Controller → Service → Persistence → DB target. Điểm nhận DB được **lặp như một reference trên từng hàng để người đọc dễ đối chiếu**, chứ **không phải có 10 SQL instance hoặc 10 database mới**.

| Controller | Service / dependency | Persistence & DB |
| --- | --- | --- |
| `AuthController` | `AuthenticationService` | User & RefreshToken repositories → `LongevityDietDb` |
| `ProfileController` | `ProfileService` | User/profile persistence → `LongevityDietDb` |
| `ReminderNotificationsController` | `ReminderService` / `IdentityRedisBridge` | Identity Outbox/Inbox → `LongevityDietDb`; async Redis :6379 ở C1 |
| `MealPlansController` | `MealPlanningService` | `MealPlanRepository` → `LongevityDietDb` |
| `MealLogsController` | `MealTrackingService` | `MealLogRepository` → `LongevityDietDb` |
| `EatingWindowController` | `MealTrackingService` | `EatingWindowRepository` → `LongevityDietDb` |
| `RecommendationsController` | `RecommendationService` / gRPC adapter | `RecommendationRepository` → `LongevityDietDb`; gRPC :8081 |
| `FmdController` | `FmdService` | `FmdRepository` → `LongevityDietDb` |
| `TrackingController` | `TrackingService` | `TrackingDbContext` → `LongevityTrackingDb` |
| `RecommendationController` | `TrackingService` + `ActivityCoachClient` | `TrackingDbContext` → `LongevityTrackingDb`; gRPC :8081 |

Dấu mũi tên thể hiện phụ thuộc/call theo chiều được ghi. Phản hồi HTTP/gRPC đi trên cùng kênh, không phải một service hoặc database khác. **Worker** là một container riêng ở C1 và lưu dữ liệu trong **Worker DB riêng**.

## Đối chiếu, tiêu chí kiểm tra

Mỗi lần xuất tự động kiểm tra: đúng cổng Compose, đúng 10 controllers, đủ 3 DB catalog, kết nối native đầu–cuối, hướng mũi tên, **chỉ đen–trắng**, một PDF mỗi sơ đồ, khung không chồng lấn và kiểm tra đường/nội dung qua SVG đã render. Có thể tái xuất:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Export-OverallDiagrams.ps1
node scripts/Validate-OverallDiagrams.js
```

**Nguồn thiết kế chuyên môn:** [C4 System Context](https://c4model.com/diagrams/system-context), [C4 Component Diagram](https://c4model.com/diagrams/component), [C4 notation (labeled directed relationships/protocols)](https://c4model.com/diagrams/notation), [draw.io C4 diagrams](https://www.drawio.com/docs/diagram-types/c4-modelling/) và [draw.io connectors](https://www.drawio.com/docs/manual/connectors/).

**Giới hạn phạm vi:** Bản này phản ánh mã đã triển khai trên `develop`, không khẳng định bản thiết kế dinh dưỡng 52 bảng tương lai đã thành code hay đã chạy E2E với Docker/SQL Server thật.
