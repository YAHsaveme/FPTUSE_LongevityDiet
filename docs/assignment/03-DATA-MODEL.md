# Database Diagram - sơ đồ CSDL tổng thể đen trắng

[Xem PDF một trang](one-page/Database%20Diagram.pdf) | [Mở Draw.io để phóng to và chỉnh sửa](one-page/Database%20Diagram.drawio)

Database Diagram được thiết kế trên **một trang, chỉ có nét đen và nền trắng**. Mọi kết nối đều gắn trực tiếp vào **bảng nguồn và bảng đích thật**, không có vách ngăn năm cột, trục giả hay đường nối trang trí.

## Quy ước xem kết nối

| Ký hiệu đen trắng | Loại kết nối | Ý nghĩa |
| --- | --- | --- |
| **Nét liền đậm + Crow's Foot** | **9 FK SQL** | Quan hệ thật có ràng buộc trong EF Core, thể hiện 1–1 hoặc 1–N. |
| **Nét đứt dài + nhãn APP** | **16 liên hệ logic** | Khóa dùng chung/quan hệ theo nghiệp vụ (ví dụ UserId, PlannedMealId, Version hoặc cùng ngày). **Không phải FK SQL**. |
| **Nét chấm + nhãn EVENT** | **6 luồng sự kiện** | Trao đổi sự kiện/trạng thái Outbox/Inbox/Worker. **Không phải FK SQL**. |

**Mọi nhãn APP chỉ biểu thị liên hệ theo khóa hoặc ngữ cảnh nghiệp vụ.** Hai bảng cùng `UserId` không đồng nghĩa một bản ghi ở bảng A có một bản ghi cha ở bảng B. Các liên hệ EVENT thể hiện định danh sự kiện hoặc luồng xử lý, không phải kết nối vật lý trong SQL Server.

## Cách đọc bản bố cục tối ưu

Thay vì lặp lại tên database dài trong mỗi ô, tiêu đề bảng sử dụng mã ngắn **[I] = LongevityDietDb**, **[T] = LongevityTrackingDb**, và **[W] = LongevityWorkerDb**. Cả ba tên database, số bảng và ý nghĩa đường nối được ghi trong hàng chú giải ở đầu trang.

Font các trường PK/FK và tên bảng được tăng tỷ lệ hiển thị so với chiều rộng trang; bố cục được thu gọn đồng bộ, không để đường nối hoặc kích thước ô lệch nhau. Nhãn đường **APP: UserId**, **APP: PlannedMealId**, **APP: Version**, **EVENT: EventId**, **EVENT: Notification** v.v. cho biết chính xác khóa hoặc ngữ cảnh sự kiện, thay vì ghi chung chung "business key" hoặc "EVENT".

File PDF vẫn chỉ có **một trang chứa toàn bộ 32 bảng**. Khi cần đọc tất cả thuộc tính, hãy phóng to ở mức 150–200% hoặc dùng Draw.io; đây là giới hạn thực tế của một ERD 32 bảng trên màn hình nhỏ.

## Dữ liệu đã triển khai

| Database | Số bảng | FK SQL thật |
| --- | ---: | ---: |
| `LongevityDietDb` - Identity, Planning, Meal Logging, Recommendation và FMD | 21 | 8 |
| `LongevityTrackingDb` - Activity và Adherence | 7 | 1 |
| `LongevityWorkerDb` - Reminder Worker | 4 | 0 |
| **Tổng** | **32** | **9** |

**Chín FK thật có tên cột rõ ràng:**

| Bảng cha | Bảng con | Bội số |
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

Bảng nào không có FK SQL nhưng có mã dùng chung hoặc tạo/nhận sự kiện sẽ được nối bằng kiểu nét tương ứng. **Không tạo thêm FK, migration hay bảng giả** để làm hình ảnh có nhiều dây.

**Độ đầy đủ:** Sơ đồ có **32/32 bảng hiện tại** và **31 đường nối native** (9 SQL, 16 APP, 6 EVENT). Mỗi bảng chỉ xuất hiện một lần, trong cùng một đồ thị liên thông. Các ô ưu tiên cột PK/FK và cột liên hệ quan trọng để đọc được ở mức phóng to hợp lý; các thuộc tính còn lại vẫn nằm trong source.

**Nguồn đối chiếu:** `src/LongevityDiet.Repositories/LongevityDietDbContext.cs`, `src/LongevityDiet.Tracking/TrackingDbContext.cs`, `src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs`. Danh sách và lý do của tất cả 31 kết nối được lưu trong [manifest](../../scripts/unified-erd-manifest.json). Cách thể hiện Crow's Foot tham khảo [Microsoft](https://support.microsoft.com/en-us/visio/create-a-diagram-with-crow-s-foot-database-notation), [draw.io](https://www.drawio.com/docs/diagram-types/entity-relationship-tables/) và [dbdiagram](https://docs.dbdiagram.io/relationships/).

Bộ 52 bảng dinh dưỡng tương lai là **đề xuất**, không thuộc schema đang chạy: [đặc tả](05-LONGITUDINAL-NUTRITION-TARGET.md).
