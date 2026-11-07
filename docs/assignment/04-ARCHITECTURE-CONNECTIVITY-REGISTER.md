# C1, C2 và Database Diagram — bảng kiểm tra liên thông

Tài liệu này được **sinh tự động từ mô hình EF Core và các quan hệ có căn cứ trong repository**, nhằm kiểm tra từng thành phần thay vì chỉ nhìn hình vẽ. Đây không phải sơ đồ thứ năm.

## Kết luận theo cấp độ kiến trúc

- **C1:** 10 thành phần/người dùng/database có liên hệ và có thể lần đường từ người dùng tới REST API, gRPC, Redis, Worker và cả ba database.
- **C2 mở rộng:** 10 tuyến Controller → Service → Repository → Table Reference; 10 mã A01–A10 giúp tìm đúng bảng bên phải; mạng 32 bảng truy vết được từ phía Web/API.
- **Database Diagram:** 32/32 bảng được ánh xạ EF Core đều có ít nhất một liên hệ và thuộc cùng mạng liên thông trong **sơ đồ tài liệu**.
- **Không đồng nhất liên thông logic với FK vật lý.** Chỉ 9 quan hệ được khai báo SQL FK trong ba DbContext; 16 quan hệ ở tầng ứng dụng (APP), 6 luồng sự kiện (EVENT).

## Ký pháp (chỉ đen–trắng)

| Nét / đầu nối | Ý nghĩa |
| --- | --- |
| Liền, Crow’s Foot | FK SQL thật (có bội số 1–1 hoặc 1–nhiều) |
| Đứt, APP | Cùng khóa/ngữ cảnh nghiệp vụ; **không phải FK** |
| Chấm, EVENT | Sự kiện bất đồng bộ / Outbox / Inbox; **không phải FK** |
| Đứt, TABLE REF | Dùng để tra từ repository sang bảng; **không tạo bảng hoặc FK mới** |

## Kiểm tra C1: thành phần, DB và cổng

| Thành phần | Kết nối có ý nghĩa |
| --- | --- |
| Member và Admin | → Web/Nginx, host :5173 → HTTP :80 |
| Web/Nginx | → REST API qua /api, HTTP :8080 |
| REST API | → Recommendation gRPC HTTP/2 :8081; ↔ Redis TCP :6379; → Identity/Tracking SQL :1433 |
| Recommendation gRPC | Xử lý không trạng thái, **không có database riêng** trong Compose |
| Redis Streams | ↔ Reminder Worker, trao đổi sự kiện TCP :6379 |
| Reminder Worker | → LongevityWorkerDb SQL :1433; **không mở HTTP listener** |
| LongevityDietDb | 21 bảng, truy cập từ REST API |
| LongevityTrackingDb | 7 bảng, truy cập từ REST API |
| LongevityWorkerDb | 4 bảng, truy cập từ Worker |

SQL Server trên host publish **14330 → 1433** trong container; ba database là ba catalog riêng. C1 không nối gRPC tới SQL giả.

## C2: mười dấu tham chiếu chéo service → bảng

Mỗi mã xuất hiện **hai lần trên C2**: bên ô TABLE REFERENCE của repository và ngay cạnh tên bảng thật bên ERD. Tìm bằng mã là cách lần bảng không phải kéo 10 dây chéo phá hỏng bố cục.

| Mã | Controller | Bảng thật | Database |
| --- | --- | --- | --- |
| **A04** | AuthController | Users | identity |
| **A02** | ProfileController | UserProfiles | identity |
| **A05** | ReminderNotificationsController | ReminderPreferences | identity |
| **A03** | MealPlansController | MealPlans | identity |
| **A06** | MealLogsController | MealLogs | identity |
| **A07** | EatingWindowController | EatingWindowSnapshots | identity |
| **A01** | RecommendationsController | UserFoodPreferences | identity |
| **A08** | FmdController | FmdSafetyAssessments | identity |
| **A10** | TrackingController | ActivityLogs | tracking |
| **A09** | RecommendationController | ActivityGoals | tracking |

Các bảng đích trên là **điểm vào tiêu biểu**, không có nghĩa một service chỉ đọc/ghi duy nhất một bảng. Bản vẽ C2 có một nối native giữa phần API và mạng bảng, cho phép lần toàn bộ hệ thống mà không thêm các liên hệ DB giả.

## Đối chiếu đủ 32 bảng và mọi liên hệ trực tiếp

| Bảng EF Core | Database | Bảng liên hệ ngay bên cạnh (loại) | Số liên hệ |
| --- | --- | --- | ---: |
| Users | identity | ActivityGoals (LOGICAL); FmdSafetyAssessments (LOGICAL); IdentityOutbox (LOGICAL); MealLogs (LOGICAL); RefreshTokens (SQL); ReminderPreferences (SQL); UserNotifications (SQL); UserProfiles (SQL) | 8 |
| UserProfiles | identity | UserDietaryPreferences (LOGICAL); UserFoodPreferences (LOGICAL); Users (SQL) | 3 |
| RefreshTokens | identity | Users (SQL) | 1 |
| ReminderPreferences | identity | Users (SQL) | 1 |
| UserNotifications | identity | Users (SQL) | 1 |
| IdentityOutbox | identity | ReminderSchedules (EVENT); Users (LOGICAL); WorkerProcessedEvents (EVENT) | 3 |
| IdentityInbox | identity | WorkerOutbox (EVENT) | 1 |
| UserDietaryPreferences | identity | MealPlans (LOGICAL); UserProfiles (LOGICAL) | 2 |
| MealPlans | identity | MealPlanDays (SQL); UserDietaryPreferences (LOGICAL) | 2 |
| MealPlanDays | identity | MealPlans (SQL); PlannedMeals (SQL) | 2 |
| PlannedMeals | identity | MealPlanDays (SQL); MealReplacementHistories (LOGICAL); RecommendationFeedbacks (LOGICAL) | 3 |
| MealLogs | identity | EatingWindowSnapshots (LOGICAL); MealLogItems (SQL); Users (LOGICAL) | 3 |
| MealLogItems | identity | MealLogs (SQL) | 1 |
| EatingWindowSnapshots | identity | MealLogs (LOGICAL) | 1 |
| RecommendationFeedbacks | identity | PlannedMeals (LOGICAL) | 1 |
| MealReplacementHistories | identity | PlannedMeals (LOGICAL) | 1 |
| UserFoodPreferences | identity | UserProfiles (LOGICAL) | 1 |
| FmdEducationAcknowledgements | identity | FmdSafetyAssessments (LOGICAL) | 1 |
| FmdSafetyAssessments | identity | FmdCycles (LOGICAL); FmdEducationAcknowledgements (LOGICAL); Users (LOGICAL) | 3 |
| FmdCycles | identity | FmdCycleDays (SQL); FmdSafetyAssessments (LOGICAL) | 2 |
| FmdCycleDays | identity | FmdCycles (SQL) | 1 |
| ActivityLogs | tracking | ActivityGoals (LOGICAL); TrackingOutbox (EVENT) | 2 |
| ActivityGoals | tracking | ActivityLogs (LOGICAL); Users (LOGICAL) | 2 |
| AdherenceScores | tracking | ScoreConfigurationVersions (LOGICAL); ScoreDimensions (SQL); TrackingScoreSignals (LOGICAL) | 3 |
| ScoreDimensions | tracking | AdherenceScores (SQL) | 1 |
| ScoreConfigurationVersions | tracking | AdherenceScores (LOGICAL) | 1 |
| TrackingScoreSignals | tracking | AdherenceScores (LOGICAL); TrackingOutbox (EVENT) | 2 |
| TrackingOutbox | tracking | ActivityLogs (EVENT); TrackingScoreSignals (EVENT) | 2 |
| ReminderSchedules | worker | IdentityOutbox (EVENT); ReminderDispatchRecords (LOGICAL) | 2 |
| ReminderDispatchRecords | worker | ReminderSchedules (LOGICAL); WorkerOutbox (EVENT) | 2 |
| WorkerProcessedEvents | worker | IdentityOutbox (EVENT) | 1 |
| WorkerOutbox | worker | IdentityInbox (EVENT); ReminderDispatchRecords (EVENT) | 2 |

Đây là **mạng các liên hệ được mô tả**, không phải bằng chứng rằng mọi đường APP/EVENT được SQL Server ràng buộc. Không bổ sung FK hoặc thay đổi migration chỉ để mọi bảng trông có dây nối.

## Nguồn và cách kiểm tra

Nguồn bảng/FK: các DbContext trong src/LongevityDiet.Repositories, src/LongevityDiet.Tracking và src/LongevityDiet.Worker. Nguồn liên hệ C2: các controllers, services và manifests hiện tại. Nguồn cổng: docker-compose.yml.

Kiểm tra tự động: node scripts/Validate-OverallDiagrams.js (bao gồm Validate-DiagramConnectivity.js). Xem bản có thể chỉnh sửa: [C1](one-page/C1.drawio), [C2](one-page/C2.drawio), [Database Diagram](one-page/Database%20Diagram.drawio).

Mô hình dinh dưỡng 52 bảng đang đề xuất **không** nằm trong 32 bảng đã triển khai.
