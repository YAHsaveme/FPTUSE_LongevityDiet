# Database Diagram — ERD tổng thể LongevityDiet

[Xem Database Diagram trên Draw.io](one-page/Database%20Diagram.drawio) | [Xem PDF một trang](one-page/Database%20Diagram.pdf)

Sơ đồ sử dụng ký pháp **Crow's Foot** để thể hiện rõ bảng cha/bảng con, khóa chính và khóa ngoại. Đây là mô hình **dựa trên code hiện có**, kết hợp quan hệ vật lý với liên kết logic được phân biệt bằng màu/nét, không phải thiết kế các FK mới.

| Phân loại | Cách thể hiện trên sơ đồ | Ý nghĩa |
| --- | --- | --- |
| **FK SQL thật** | **Đường xanh đậm liền**, hai đầu ký pháp Crow's Foot | FK đang có trong EF Core, SQL Server bảo đảm tính toàn vẹn tham chiếu |
| **Liên kết logic** | **Đường vàng nét đứt**, đầu mũi tên rỗng | Trường dùng chung hoặc mã tham chiếu có trong code, **không có** ràng buộc FK |
| **Bảng sự kiện độc lập** | Bảng được đặt trong nhóm dữ liệu tương ứng | Không tự tạo FK giả để nối Outbox/Inbox hoặc bảng log không có quan hệ |

**Cấu trúc đang triển khai:** 21 bảng ở `LongevityDietDb` (Identity, Meal Planning, Meal Logging, Recommendation và FMD), 7 bảng ở `LongevityTrackingDb`, 4 bảng ở `LongevityWorkerDb`: tổng **32 bảng, 9 FK SQL thật, 9 đường liên hệ logic được kiểm chứng** trong cùng một sơ đồ.

Các luồng FK có thể đọc trực tiếp: `Users` → `UserProfiles`, `RefreshTokens`, `ReminderPreferences`, `UserNotifications`; `MealPlans` → `MealPlanDays` → `PlannedMeals`; `MealLogs` → `MealLogItems`; `FmdCycles` → `FmdCycleDays`; `AdherenceScores` → `ScoreDimensions`.

**Đối chiếu source:** `src/LongevityDiet.Repositories/LongevityDietDbContext.cs`, `src/LongevityDiet.Tracking/TrackingDbContext.cs`, `src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs`. Mỗi bảng xuất hiện một lần. Thông tin người dùng tham chiếu chéo database theo `UserId` là **logic**, không phải SQL FK chéo database.

**Nguồn tham khảo chính thức về cách vẽ ERD:**
- Microsoft: https://learn.microsoft.com/en-us/ssms/visual-db-tools/design-database-diagrams-visual-database-tools
- Microsoft Crow's Foot: https://support.microsoft.com/en-us/visio/create-a-diagram-with-crow-s-foot-database-notation
- draw.io: https://www.drawio.com/docs/tutorials/crows-foot-notation/
- Lucidchart: https://lucid.co/diagram/erd/symbols-and-notation

Sơ đồ khác với [mô hình dinh dưỡng tương lai](05-LONGITUDINAL-NUTRITION-TARGET.md) và [DBML đề xuất 52 bảng](nutrition-target-52-tables.dbml); những bảng dự kiến này **chưa được migrate**.

Tái tạo bằng `scripts/Export-OverallDiagrams.ps1` và kiểm thử bằng `scripts/Validate-OverallDiagrams.js`. Các kiểm tra không thay thế cho việc chạy migration thực tế trên SQL Server.
