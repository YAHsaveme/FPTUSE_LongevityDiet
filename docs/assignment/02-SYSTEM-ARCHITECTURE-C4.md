# LongevityDiet - 5 sơ đồ kiến trúc tổng thể chính thức

Tài liệu dùng duy nhất bộ sơ đồ tại [docs/assignment/one-page](one-page/README.md).
Không còn bản FULL, bản 32 bảng hoặc các bản vẽ nháp song song.

| Sơ đồ | Draw.io chỉnh sửa | PDF một trang | Phạm vi |
|---|---|---|---|
| C0 tổng thể | [C0](one-page/C0.drawio) | [PDF](one-page/C0.pdf) | Thành viên, quản trị viên và ranh giới LongevityDiet |
| C1 tổng thể | [C1](one-page/C1.drawio) | [PDF](one-page/C1.pdf) | React/Nginx, YARP, 6 service độc lập, 6 database SQL, Redis và RabbitMQ dự kiến |
| C2 tổng thể | [C2](one-page/C2.drawio) | [PDF](one-page/C2.pdf) | REST endpoint → application service → DbContext/Outbox |
| Database Diagram tổng thể | [Database Diagram](one-page/Database%20Diagram.drawio) | [PDF](one-page/Database%20Diagram.pdf) | 49 bảng owner mục tiêu trong 6 database, quan hệ FK nội bộ theo source |
| Business Flow | [Business Flow](one-page/Business%20Flow.drawio) | [PDF](one-page/Business%20Flow.pdf) | Luồng người dùng, an toàn FMD, xử lý bất đồng bộ, luồng quản trị |

## Phạm vi triển khai

C1 và C2 mô tả mục tiêu kiến trúc ADR-005. Một số luồng của API và Web
vẫn sử dụng backend/database legacy. Không được coi các sơ đồ mục tiêu là
bằng chứng quá trình migration đã hoàn thành.

Redis Streams đang được dùng cho Outbox, consumers, reminder và background worker.
RabbitMQ được bổ sung ở C1, C2 và Business Flow là một lựa chọn AMQP cho
event queue/fanout về sau; hiện chưa có RabbitMQ publisher/consumer trong source.
Các đường RabbitMQ được vẽ nét đứt, ghi rõ PLANNED / NOT DEPLOYED.

Database Diagram dựa trên 7 DbContext thực của 6 domain owners:
Identity 7 bảng, Catalog 9 bảng, Planning 13 bảng, Tracking 10 bảng,
Recommendation 4 bảng và Worker 6 bảng; tổng 49 bảng.
Worker có hai DbContext chia cùng một database owner.
Quan hệ UserId/DomainEvent xuyên miền không phải FK SQL. Chỉ những
FK nội bộ khớp source code mới được vẽ bằng đường liền.

## Kiểm thử

```powershell
node scripts/Generate-OverallDiagrams.js
powershell -ExecutionPolicy Bypass -File scripts/Export-OverallDiagrams.ps1
node scripts/Validate-OverallDiagrams.js
node scripts/Validate-CourseLinks.js
```

Mỗi bản PDF là một trang, sơ đồ đen trắng và có file Draw.io chỉnh sửa.
Bản backup những sơ đồ cũ nằm ngoài repo tại
`D:\PRN232\_architecture_diagram_backup_before_cleanup_20261112.zip`.
