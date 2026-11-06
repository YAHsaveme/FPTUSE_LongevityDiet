# C0, C1, C2 — kiến trúc LongevityDiet và bảng dữ liệu

Bộ sơ đồ chỉ dùng **đen–trắng**, được tạo từ source của nhánh `develop`. Để tránh nhầm cấp độ trừu tượng, **C0** là System Context, **C1** là Container Architecture, còn **C2 là bản mở rộng** kết hợp Component Architecture với bản đồ quan hệ database. C2 mở rộng này **không phải C2 thuần chuẩn C4**: tài liệu C4 chuẩn thường để từng bảng và FK trong ERD/code-level. Mục đích mở rộng là cho phép xem cùng lúc luồng controller/service và toàn bộ 32 bảng theo yêu cầu.

| Sơ đồ | Draw.io có thể sửa | PDF một trang | Phạm vi |
| --- | --- | --- | --- |
| C0 | [C0.drawio](one-page/C0.drawio) | [C0.pdf](one-page/C0.pdf) | Thành viên, quản trị viên, ranh giới hệ thống |
| C1 | [C1.drawio](one-page/C1.drawio) | [C1.pdf](one-page/C1.pdf) | Các container, giao thức, cổng, 3 database |
| **C2 mở rộng** | [C2.drawio](one-page/C2.drawio) | [C2.pdf](one-page/C2.pdf) | **10 luồng API + 32 bảng + 31 quan hệ giữa bảng** |
| Database Diagram | [Database Diagram.drawio](one-page/Database%20Diagram.drawio) | [Database Diagram.pdf](one-page/Database%20Diagram.pdf) | ERD độc lập, chỉ tập trung vào cấu trúc database |

## C2 — đọc từ trái sang phải

Ở phía trái, **Nginx / Web → REST API router → Controller → Service → Persistence → TABLE REFERENCE**. Mỗi hàng ghi **tên bảng được đối chiếu theo source**, không dừng lại ở một nhãn chung chung như “Database”. Mỗi tham chiếu ghi rõ database và cổng SQL **1433**.

Phía phải là **32 ô bảng EF Core thật**, gồm `LongevityDietDb` (21), `LongevityTrackingDb` (7) và `LongevityWorkerDb` (4). Mỗi bảng xuất hiện **một lần**. Để tránh 10 dây dài chạy xuyên qua ERD, các hàng API nối vào **10 ô tham chiếu bảng theo tên**; phần API và bản đồ bảng được nối bằng **một liên kết native đến bảng `Users`**. Mọi bảng ở phần ERD nằm trong cùng một mạng quan hệ. Các ô tham chiếu không phải bảng SQL mới và không được đếm vào tổng 32.

| Loại kết nối giữa các bảng | Số lượng | Ký pháp |
| --- | ---: | --- |
| FK SQL thật | **9** | Nét liền, đầu Crow's Foot; bội số 1:1 hoặc 1:N |
| APP / khóa nghiệp vụ | **16** | Nét đứt, không phải FK |
| EVENT / Outbox–Inbox | **6** | Nét chấm, không phải FK |
| **Tổng quan hệ bảng–bảng** | **31** | Kết nối trực tiếp giữa các bảng thực |

**Tổng C2: 73 đường nối native**: 31 mũi tên luồng API, 10 đường repository → bảng tham chiếu, 1 đường nối khu vực API với bảng `Users`, 31 đường giữa các bảng. Các đường APP dựa trên cùng khóa/ngữ cảnh người dùng, **không có nghĩa rằng SQL Server đang kiểm soát tham chiếu**. Sơ đồ ưu tiên tên bảng và các trường PK/FK quan trọng; định nghĩa đầy đủ của cột nằm trong ba DbContext.

### Mười bảng đích được hiển thị theo các tuyến API

| Controller | Bảng tham chiếu trên C2 |
| --- | --- |
| `AuthController` | `Users` |
| `ProfileController` | `UserProfiles` |
| `ReminderNotificationsController` | `ReminderPreferences` |
| `MealPlansController` | `MealPlans` |
| `MealLogsController` | `MealLogs` |
| `EatingWindowController` | `EatingWindowSnapshots` |
| `RecommendationsController` | `UserFoodPreferences` |
| `FmdController` | `FmdSafetyAssessments` |
| `TrackingController` | `ActivityLogs` |
| `RecommendationController` (activity) | `ActivityGoals` |

Các bảng tham chiếu liệt kê **điểm vào tiêu biểu**, không khẳng định mỗi service chỉ sử dụng một bảng. Các repository/service thực tế có thể sử dụng nhiều bảng.

## C1 — hệ thống và cổng xác minh từ Docker Compose

| Giao tiếp | Giao thức / cổng |
| --- | --- |
| Người dùng / Admin → Web | Host 5173 → Nginx HTTP 80 |
| Web → REST API | Proxy `/api/` → `http://api:8080` |
| REST API → Recommendation gRPC | HTTP/2, cổng 8081 |
| REST API ↔ Redis ↔ Worker | Redis Streams, TCP 6379 |
| REST API → `LongevityDietDb`, `LongevityTrackingDb` | SQL Server, TCP 1433 |
| Worker → `LongevityWorkerDb` | SQL Server, TCP 1433 |
| SQL Server từ máy host | 14330 → container 1433 |

**Recommendation gRPC** là dịch vụ stateless, chưa có database riêng trong Compose. **Worker** không mở cổng HTTP. Không được vẽ thêm FK/database không tồn tại để lấp khoảng trống trên sơ đồ.

## Chứng cứ và kiểm thử

Mỗi lần xuất Draw.io và PDF kiểm tra đủ 10 controller, 32 bảng, 9 FK, 16 APP, 6 EVENT; kiểm tra số lượng mũi tên, đầu–cuối native, sự liên thông toàn bộ mạng, sắc độ đen–trắng, một trang PDF và giao cắt/cắt chữ trên SVG render.

Dữ liệu nguồn: `docker-compose.yml`, `src/LongevityDiet.API/Program.cs`, `src/LongevityDiet.API/Controllers`, `src/LongevityDiet.Repositories/LongevityDietDbContext.cs`, `src/LongevityDiet.Tracking/TrackingDbContext.cs` và `src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs`. Các bản kê kiểm tra được: `scripts/c2-extended-manifest.json`, `scripts/unified-erd-manifest.json`.

Tài liệu chuẩn: [C4 Component](https://c4model.com/diagrams/component), [C4 Code Diagram](https://c4model.com/diagrams/code), [draw.io ERD](https://www.drawio.com/docs/diagram-types/entity-relationship-tables/) và [Crow's Foot](https://www.drawio.com/docs/tutorials/crows-foot-notation/).

**Giới hạn:** Các bảng dinh dưỡng mục tiêu 52 bảng là thiết kế tương lai, chưa triển khai trong 3 database hiện tại. Việc kiểm tra sơ đồ và build không thay cho chạy kiểm thử SQL Server Docker E2E.
