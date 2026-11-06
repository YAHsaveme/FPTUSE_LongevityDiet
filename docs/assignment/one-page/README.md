# LongevityDiet — bốn sơ đồ tổng thể

Chỉ giữ **4 sơ đồ chính**, không thêm tiền tố số hoặc các bản vẽ trùng lặp: **C0**, **C1**, **C2** và **Database Diagram**. Tất cả chỉ dùng nét đen–trắng, có tệp Draw.io sửa được và PDF một trang.

| Sơ đồ | Tệp Draw.io | PDF | Cách đọc |
| --- | --- | --- | --- |
| C0 | [C0.drawio](C0.drawio) | [C0.pdf](C0.pdf) | Member / Admin → hệ thống LongevityDiet |
| C1 | [C1.drawio](C1.drawio) | [C1.pdf](C1.pdf) | Web, REST API, gRPC, Redis, Worker, **3 SQL catalogs**, cổng/giao thức thật |
| **C2 mở rộng** | [C2.drawio](C2.drawio) | [C2.pdf](C2.pdf) | **10 tuyến Controller → Service → Persistence → tham chiếu bảng; đầy đủ 32 bảng nối bằng 31 quan hệ** |
| Database Diagram | [Database Diagram.drawio](Database%20Diagram.drawio) | [Database Diagram.pdf](Database%20Diagram.pdf) | ERD độc lập: **32 bảng, 9 FK SQL, 16 APP và 6 EVENT** |

**C2 mới không chỉ dừng ở tên database.** Mỗi repository có điểm tham chiếu tới **tên bảng cụ thể**, sau đó đọc mạng 32 bảng ở cùng bản vẽ. Có **một mũi tên nối trực tiếp** từ một tham chiếu tới bảng thật để liên thông hai phần; 9 quan hệ FK thật dùng Crow's Foot, 16 liên hệ logic dùng nét đứt và 6 luồng sự kiện dùng nét chấm. Tham chiếu bảng **không tạo ra bảng SQL mới**.

Trong code hiện tại, `LongevityDietDb` có **21 bảng**, `LongevityTrackingDb` có **7**, `LongevityWorkerDb` có **4**. Recommendation gRPC là dịch vụ **stateless**, không có database riêng. Các đề xuất dinh dưỡng 52 bảng thuộc thiết kế tương lai, không nằm trong sơ đồ hiện tại.

**Cổng Docker Compose:** Web host 5173 → Nginx container 80; REST API 8080; gRPC HTTP/2 8081; Redis TCP 6379; SQL Server host 14330 → container 1433; Worker không mở HTTP port.

**Đọc chi tiết:** [Kiến trúc C0/C1/C2, liên kết từng component và bảng dữ liệu](../02-SYSTEM-ARCHITECTURE-C4.md) · [Giải thích các quan hệ trong Database Diagram](../03-DATA-MODEL.md).

**Tái tạo và kiểm tra:**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Export-OverallDiagrams.ps1
node scripts/Validate-OverallDiagrams.js
```

Các kiểm tra tự động bao gồm đối chiếu EF Core DbContext và Docker Compose, số lượng bảng, chính xác 9 FK SQL, độ liên thông của C2, màu đen–trắng, đầu mũi tên, đường cắt chữ và giao cắt thực tế trên SVG xuất từ Draw.io. Điều này không đồng nghĩa đã kiểm thử E2E với SQL Server chạy thật.
