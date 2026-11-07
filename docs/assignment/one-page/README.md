# LongevityDiet — bộ sơ đồ kiến trúc hiện tại

**Bộ bàn giao chính thức chỉ có bốn sơ đồ:** `C0`, `C1`, `C2` và `Database Diagram`. Đây là bản thiết kế lại với cùng một ngôn ngữ hình học: **nền trắng, đường đen, chữ đen, căn hàng theo lưới, nhãn ngắn và khoảng cách nhất quán**. Mỗi sơ đồ là một trang PDF có thể phóng to, kèm file Draw.io chứa các shape và connector native để chỉnh sửa.

| Sơ đồ | PDF | Draw.io | Cách đọc |
| --- | --- | --- | --- |
| **C0** | [C0.pdf](C0.pdf) | [C0.drawio](C0.drawio) | Member và Admin tương tác với hệ thống LongevityDiet; mức System Context nên không nhồi cổng hoặc database |
| **C1** | [C1.pdf](C1.pdf) | [C1.drawio](C1.drawio) | Client → Web/Nginx → REST API → gRPC, Redis, Worker và **3 SQL catalogs**; tất cả đường giao tiếp đều có chiều |
| **C2 mở rộng** | [C2.pdf](C2.pdf) | [C2.drawio](C2.drawio) | Trái: 10 tuyến Controller → Service → Persistence → DATA REFERENCE; phải: 32 bảng và 31 quan hệ; mã A01–A10 đối chiếu hai bên |
| **Database Diagram** | [Database Diagram.pdf](Database%20Diagram.pdf) | [Database Diagram.drawio](Database%20Diagram.drawio) | ERD tổng thể 32 bảng, 9 FK SQL thật và các liên hệ APP/EVENT có phân biệt |

## Thiết kế và kiểm chứng

- **Đủ 32 bảng đã triển khai qua EF Core**, gồm `LongevityDietDb` (21), `LongevityTrackingDb` (7) và `LongevityWorkerDb` (4).
- **9 SQL FK có thật** được vẽ bằng nét liền và Crow's Foot. **16 liên hệ APP** là nét đứt; **6 luồng EVENT** là nét chấm. APP/EVENT **không phải SQL FK**.
- C1 thể hiện cổng đã đối chiếu với Docker Compose: Web **5173 → 80**, REST API **8080**, gRPC HTTP/2 **8081**, Redis **6379**, SQL Server **14330 → 1433**. Worker không có HTTP listener; gRPC là dịch vụ **stateless không sở hữu database riêng**.
- C2 là **bản C2 mở rộng để cùng lúc xem component và các bảng**, không phải một Component Diagram C4 thuần túy. Những ô DATA REFERENCE là điểm tra cứu, **không phải bảng SQL mới**.
- **31 đường nối bảng–bảng được gắn thật vào hai bảng**, có thể lần theo từ Users qua các chuỗi meal planning, meal logs, FMD, tracking và reminder events. Mọi bảng đều nằm trong một mạng **quan hệ nghiệp vụ/sự kiện**, nhưng chỉ 9 đường được khai báo là FK ở tầng CSDL.
- Trong sơ đồ nhiều thành phần, chỉ hiển thị **một số trường quan trọng** để bảng không biến thành khối chữ. Trường còn lại xem trực tiếp ở DbContext trong source. Không nhập các bảng thuộc **mô hình dinh dưỡng 52 bảng dự kiến** vào sơ đồ hiện hành.

## Cách mở và kiểm tra

**Xem toàn cảnh trước, rồi phóng to từng nhánh**, đặc biệt là C2. Bản PDF là vector, chữ và nét nối vẫn sắc khi phóng to. Có thể mở file `.drawio` bằng diagrams.net để chỉnh sửa từng shape, nhãn và đầu mũi tên.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Export-OverallDiagrams.ps1
node scripts/Validate-OverallDiagrams.js
```

Pipeline kiểm tra: bốn tên canonical, **source EF Core**, Docker Compose, 10 Controller hiện có, 32 bảng, đúng 9 FK và bội số, liên thông của C1/C2/ERD, độ vừa khung chữ của C1/C2, số trang PDF, quan hệ native và giao cắt/đường cắt chữ từ SVG được render.

Chi tiết theo component và các bảng xem [tài liệu kiến trúc](../02-SYSTEM-ARCHITECTURE-C4.md), [bảng kiểm tra toàn bộ 32 bảng và đường đi](../04-ARCHITECTURE-CONNECTIVITY-REGISTER.md), và [giải thích Database Diagram](../03-DATA-MODEL.md).

**Nguồn quy chuẩn:** [C4 Model — Notation](https://c4model.com/diagrams/notation) · [C4 Model — Component](https://c4model.com/diagrams/component) · [draw.io — Consistency](https://www.drawio.com/docs/best-practice/consistent-diagrams/) · [draw.io — Diagram layouts](https://www.drawio.com/docs/manual/layouts/).

> Giới hạn kiểm chứng: các phép kiểm tra tự động và kiểm tra trực quan PDF có thể phát hiện những lỗi đã định nghĩa, nhưng không chứng minh hoàn hảo trên mọi màn hình/mức zoom hoặc chứng minh dữ liệu đã chạy E2E trên SQL Server thật. Không thay đổi migration hoặc code nghiệp vụ khi vẽ lại.
