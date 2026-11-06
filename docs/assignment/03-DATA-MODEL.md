# Database Diagram — ERD tổng thể LongevityDiet

**[Database Diagram — Draw.io chỉnh sửa được](one-page/Database%20Diagram.drawio)** · **[Xem PDF một trang](one-page/Database%20Diagram.pdf)**

Đây là **một ERD thống nhất**, không còn vách ngăn cột, khung miền dữ liệu lớn, trục giả hoặc một sơ đồ FK tách riêng. Bố cục được tính theo luồng quan hệ: bắt đầu từ `Users`, phân nhánh sang hồ sơ, thực đơn, nhật ký ăn, FMD, hoạt động và hệ thống nhắc lịch. Mỗi bảng xuất hiện **đúng một lần** và có ít nhất một liên kết tới một bảng khác.

## Cấu trúc dữ liệu đã triển khai

| Database vật lý | Bảng EF Core | FK SQL |
| --- | ---: | ---: |
| `LongevityDietDb` — Identity, Planning, Meal Logging, Recommendation, FMD | 21 | 8 |
| `LongevityTrackingDb` — Activity, LDAS, Tracking | 7 | 1 |
| `LongevityWorkerDb` — Reminder Worker, events | 4 | 0 |
| **Tổng** | **32** | **9** |

**31 đường nối trên cùng một ERD** được phân biệt như sau: **9 FK thật** dùng đường xanh đậm và ký hiệu Crow's Foot, **16 liên kết logic** dùng đường vàng nét đứt, **6 luồng sự kiện** dùng đường tím nét đứt. Hai loại nét đứt **không phải** khóa ngoại SQL hoặc cam kết tồn tại một phép JOIN ràng buộc trong database. Những liên kết chỉ dựa trên `UserId` hoặc cùng ngày mang ý nghĩa cùng phạm vi người dùng/nghiệp vụ, không khẳng định hai bản ghi tham chiếu duy nhất tới nhau.

### Toàn bộ chín quan hệ SQL thật

| Bảng cha (PK) | Bảng con (FK) | Bội số |
| --- | --- | --- |
| `Users.Id` | `UserProfiles.UserId` | 1–1 |
| `Users.Id` | `RefreshTokens.UserId` | 1–N |
| `Users.Id` | `ReminderPreferences.UserId` | 1–1 |
| `Users.Id` | `UserNotifications.UserId` | 1–N |
| `MealPlans.Id` | `MealPlanDays.MealPlanId` | 1–N |
| `MealPlanDays.Id` | `PlannedMeals.MealPlanDayId` | 1–N |
| `MealLogs.Id` | `MealLogItems.MealLogId` | 1–N |
| `FmdCycles.Id` | `FmdCycleDays.FmdCycleId` | 1–N |
| `AdherenceScores.Id` | `ScoreDimensions.AdherenceScoreId` | 1–N |

### Tại sao các bảng còn lại vẫn có kết nối?

Các bảng như `UserFoodPreferences`, `MealPlans`, `ActivityGoals` và `FmdSafetyAssessments` lưu `UserId` nhưng chưa khai báo FK tương ứng; sơ đồ thể hiện bằng nét đứt và ghi rõ **APP REF**, không tạo ra ràng buộc SQL giả.

Các bảng `IdentityOutbox`, `TrackingOutbox`, `WorkerOutbox`, `IdentityInbox`, `WorkerProcessedEvents` tham gia luồng event/định danh event, nên dùng **mũi tên sự kiện** thay vì Crow's Foot. Tất cả 31 cặp bảng, loại liên kết và lý do được lưu trong **[manifest máy kiểm tra được](../../scripts/unified-erd-manifest.json)**.

Sơ đồ ưu tiên hiển thị PK, FK và cột liên hệ quan trọng để tránh quá tải chữ. **Các cột không hiện trong ô vẫn tồn tại trong EF Core source**; đây là ERD tổng thể về bảng và quan hệ, không thay thế toàn bộ bảng kê metadata cột. Không có migration hay thay đổi cơ sở dữ liệu nào được thực hiện khi vẽ lại.

## Nguồn đối chiếu

- Source hiện tại: `src/LongevityDiet.Repositories/LongevityDietDbContext.cs`, `src/LongevityDiet.Tracking/TrackingDbContext.cs`, `src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs`.
- [Microsoft — Crow's Foot và bội số quan hệ](https://support.microsoft.com/en-us/visio/create-a-diagram-with-crow-s-foot-database-notation).
- [Microsoft — sơ đồ vật lý, đường liền và đường chấm](https://learn.microsoft.com/en-us/ssms/visual-db-tools/design-database-diagrams-visual-database-tools).
- [draw.io — ER table shapes](https://www.drawio.com/docs/diagram-types/entity-relationship-tables/).
- [dbdiagram — Relationship semantics](https://docs.dbdiagram.io/relationships/).

Mô hình **52 bảng dinh dưỡng đề xuất** là một thiết kế tương lai riêng: [đặc tả nghiên cứu](05-LONGITUDINAL-NUTRITION-TARGET.md) và [DBML mục tiêu](nutrition-target-52-tables.dbml). Những bảng dự kiến này chưa nằm trong database hiện tại.
