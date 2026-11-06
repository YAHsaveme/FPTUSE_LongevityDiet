# Database Diagram — mô hình dữ liệu tổng thể, có kết nối

[**Mở bản vẽ Draw.io để xem và chỉnh sửa**](one-page/Database%20Diagram.drawio) | [**Xem PDF một trang**](one-page/Database%20Diagram.pdf)

Sơ đồ chứa **đúng 32 bảng EF Core của hệ thống hiện tại** trong **3 database**. Tất cả 32 bảng đều có đường nối đi vào hoặc đi ra và đều có đường đi liên tục trong cùng một mạng tổng thể; không còn bảng nào xuất hiện rời rạc khi xem ở mức tổng thể.

## Cách đọc các loại đường

| Kiểu đường | Số đường | Ý nghĩa chính xác |
| --- | ---: | --- |
| **Xanh đậm, Crow's Foot** | **9** | FK thực sự được EF Core khai báo, SQL Server có thể ràng buộc khi migration được áp dụng. Đường nối trực tiếp bảng cha với bảng con. |
| **Vàng, nét đứt** | **4** | Liên hệ trực tiếp bằng khóa/mã nghiệp vụ trong code như `PlannedMealId`, `Version`, `UserId` và lịch nhắc, **không phải FK SQL**. |
| **Tím, nét đứt** | **4** | Quan hệ phát sinh/tiêu thụ sự kiện, như Activity → TrackingOutbox, Schedule → Dispatch → WorkerOutbox. **Không phải FK SQL**. |
| **Xanh lam, trục nhóm/nhánh** | **20** | Đường **định hướng nhóm nghiệp vụ và phạm vi sở hữu dữ liệu**. Các trục này **không phải bảng, không đại diện cho một phép JOIN và không phải FK**. |

Tổng cộng **37 đường nối gắn native vào các thành phần**, nhưng chỉ **9 đường** là quan hệ FK SQL thật. Các đường trục làm người đọc thấy rõ mỗi bảng nằm trong miền nào mà không phải vẽ hàng chục đường UserId chéo nhau qua ba database.

**Các chuỗi FK thực:** `Users → UserProfiles`, `Users → RefreshTokens`, `Users → ReminderPreferences`, `Users → UserNotifications`, `MealPlans → MealPlanDays → PlannedMeals`, `MealLogs → MealLogItems`, `FmdCycles → FmdCycleDays`, `AdherenceScores → ScoreDimensions`.

**Database thực tế:** `LongevityDietDb` có 21 bảng (Identity/Planning/Meal Tracking/Recommendation/FMD), `LongevityTrackingDb` có 7 bảng, `LongevityWorkerDb` có 4 bảng. Không tự thêm FK chéo database.

Các bảng Outbox, Inbox và lịch nhắc tham gia **dòng sự kiện qua Redis Streams** theo code, không có FK xuyên database. Vì vậy, việc trình bày chúng trong một **mạng dữ liệu tổng thể** là hợp lý, nhưng việc tự nối chúng bằng khóa ngoại vật lý là sai kỹ thuật.

## Nguồn chứng cứ nội bộ

- `src/LongevityDiet.Repositories/LongevityDietDbContext.cs`
- `src/LongevityDiet.Tracking/TrackingDbContext.cs`
- `src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs`
- `src/LongevityDiet.Services/Reminders/ReminderService.cs`
- `src/LongevityDiet.Worker/Reminders/ReminderWorkerEngine.cs`
- `src/LongevityDiet.Tracking/TrackingService.cs`
- `scripts/connected-erd-manifest.json` — mọi đường nối và mục đích của chúng.

## Nguyên tắc ERD từ tài liệu chuyên môn

- [Microsoft — Crow's Foot, bội số quan hệ và bảng không có liên kết](https://support.microsoft.com/en-us/visio/create-a-diagram-with-crow-s-foot-database-notation)
- [Microsoft — thiết kế database diagram và quan hệ vật lý](https://learn.microsoft.com/en-us/ssms/visual-db-tools/design-database-diagrams-visual-database-tools)
- [draw.io — Crow's Foot notation và tránh quan hệ dư thừa](https://www.drawio.com/docs/tutorials/crows-foot-notation/)
- [draw.io — nối bảng hoặc cột trong mô hình ER](https://www.drawio.com/docs/diagram-types/entity-relationship-tables/)
- [dbdiagram — phân biệt `Ref` (FK) và `Dep` (data lineage)](https://docs.dbdiagram.io/data-lineage/)
- [Edinburgh Napier — sử dụng đường nối vuông góc, hạn chế giao cắt](https://bdavison.napier.ac.uk/db/Practicals/Drawio/erd/)

Tài liệu nghiên cứu [52 bảng dinh dưỡng tương lai](05-LONGITUDINAL-NUTRITION-TARGET.md) và [DBML mục tiêu](nutrition-target-52-tables.dbml) **không được trộn với schema đã triển khai**. Các kết quả kiểm tra hình học và model không thay thế kiểm thử SQL Server chạy thực tế.
