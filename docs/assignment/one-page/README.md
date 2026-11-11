# PRN232 — Sơ đồ C0 / C1 / C2 / Database Diagram (10/11/2026)

Bốn sơ đồ chính trong thư mục này được xây dựng từ **mã nguồn đang triển khai**, không phải thiết kế dự kiến. Mỗi sơ đồ có bản `.drawio` chỉnh sửa được và PDF một trang; tất cả dùng đen trắng.

| Sơ đồ | Nội dung |
|---|---|
| [C0.pdf](C0.pdf) / [C0.drawio](C0.drawio) | System Context: actor MEMBER, ADMIN và hệ thống |
| [C1.pdf](C1.pdf) / [C1.drawio](C1.drawio) | Container: Web/Nginx, REST API, gRPC, Redis Streams, Worker và ba SQL catalogs, chiều liên lạc, cổng |
| [C2.pdf](C2.pdf) / [C2.drawio](C2.drawio) | Component: **22 controller hiện có**, phân thành 4 nhóm, đầy đủ HTTP -> Controller -> Service -> Repository, các nhóm DB và các luồng Redis/gRPC/Worker |
| [Database Diagram.pdf](Database%20Diagram.pdf) / [Database Diagram.drawio](Database%20Diagram.drawio) | **56 bảng vật lý** (45 main, 7 tracking, 4 worker), **23 khóa ngoại SQL**, **32 quan hệ ứng dụng tối thiểu** giúp toàn bộ đồ thị kết nối; các quan hệ APP được vẽ nét đứt, không nhầm với FK |

## Phạm vi và bằng chứng kiểm tra

- `full-schema-manifest.json` liệt kê **đầy đủ 50 quan hệ APP nguồn-backed**. Trong bản ERD một trang chỉ chọn 32 quan hệ để không rối và giữ tất cả 56 bảng kết nối; 18 liên kết còn lại vẫn truy xuất được trong manifest.
- `c2-current-manifest.json`: nguồn controller, nhóm và số mũi tên C2.
- `full-schema-layout-geometry.json`: vị trí các bảng và đường đi trong ERD để kiểm tra bố cục.
- Bản ERD `Database Diagram FULL.drawio/pdf` là bản sao đồng nội dung của hai file ERD chính ở trên.
- Bản sơ đồ **32 bảng cũ** đã được lưu sang `../legacy-diagrams/` chỉ để đối chiếu lịch sử; không phải bản bàn giao hiện tại.
- Test được thực hiện bằng: `node scripts/Validate-OverallDiagrams.js`, `node scripts/Validate-CompleteSchemaDiagram.js`, và `.\scripts\Export-OverallDiagrams.ps1`.
- Kết quả xuất và kiểm tra SVG thực tế tại checkpoint: **C0, C1, C2, Database Diagram đều 0 đường cắt nhãn và 0 giao cắt connector**. PDF một trang, hình người UML actor, lối nối trực giao và giữ nguyên mã nguồn quan hệ.

## Ghi chú quan trọng

Sơ đồ là bằng chứng về **thiết kế/tĩnh**. Để chứng minh yêu cầu Final Assignment, vẫn cần chạy chứng minh thực tế Worker, Redis producer/consumer, gRPC, triển khai Docker + migration SQL, API có JWT và kịch bản end-to-end. Không đồng nhất việc pass sơ đồ với việc đã chạy toàn bộ hệ thống.

Đọc chi tiết trong [báo cáo nghiệm thu](../WELLNESS-JOURNEY-FINAL-AUDIT-20261110.md).
