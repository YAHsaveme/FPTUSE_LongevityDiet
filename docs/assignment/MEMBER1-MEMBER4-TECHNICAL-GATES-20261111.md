# Báo cáo nghiệm thu kỹ thuật Member 1 + Member 4 — 11/11/2026

Phiên này kiểm tra trực tiếp trên nhánh `feature/w3-t4-rule-governance-20261109`, với Docker Desktop WSL2 trên ổ D, các volume QA riêng biệt, tài khoản giả và dữ liệu SQL Server thật.

## Các hạng mục có bằng chứng PASS

| Tiêu chí | Bằng chứng |
| --- | --- |
| .NET | 91/91 unit và **81/81 integration**, tổng **172/172** |
| Web | Lint 0 lỗi, test 12/12, production build PASS, production npm audit 0 vulnerability |
| Kiến trúc | C0/C1/C2/ERD PASS; C2 có 22 controller, ERD có 56 bảng vật lý và 23 SQL FKs |
| Triển khai | Compose QA sáu container, 3 SQL databases, health và readiness 200, Redis PONG |
| Người dùng & nghiệp vụ | API JWT, profile, screening dị ứng, 14 ngày/42 bữa, check-in Baseline/During/FollowUp, 2 user tách dữ liệu, Member API bị chặn ở Admin |
| gRPC | REST -> độc lập ActivityCoach gRPC qua HTTP/2 thành công; lỗi `Unimplemented` trước đó đã sửa |
| Nhắc nhở & broker | SQL outbox -> Redis Streams -> Worker ACK; scheduled due -> notification quay về SQL, unread/read/IDOR PASS |
| Worker bổ trợ | Script Redis + SQLite độc lập PASS, dọn container tạm; integration tests bao phủ replay, idempotency, dead-letter |
| LDAS Member 1 tuần 2 | Main DB read-only adapter đo số meal slots đã ghi và EatingWindowSnapshot có ≥2 bữa; chỉ tính điểm đủ khi cả 3 dimension hiện diện; xóa log hoặc thay đổi window làm LDAS tính lại, không dùng giá trị giả |
| LDAS trực tiếp trên Docker | `-VerifyMealLdas` PASS, đầy đủ ba bữa/coverage 100% và quay lại trạng thái missing sau khi xóa |
| Hiệu năng | Bảng số đo dưới đây; máy thử nghiệm, chỉ client tuần tự |

### Benchmark thực tế tại localhost, không phải SLA

| Endpoint | Số yêu cầu | p50 | p95 | Lỗi |
| --- | ---: | ---: | ---: | ---: |
| GET /health | 100 | 0.95 ms | 1.25 ms | 0 |
| GET /ready | 100 | 6.80 ms | 10.43 ms | 0 |
| GET /api/v1/activities (JWT) | 30 | 5.43 ms | 6.34 ms | 0 |
| GET /api/v1/notifications (JWT) | 30 | 5.00 ms | 12.26 ms | 0 |

Dữ liệu máy chạy được lưu ở bốn tệp `docs/task/member1-*-benchmark-20261111.json`. Script đo gốc `scripts/Benchmark-Member1Api.ps1` đã được sửa cho Windows PowerShell 5.1.

## Lệnh tái kiểm tra trên QA độc lập

```powershell
Set-Location 'D:\PRN232\FPTUSE_LongevityDiet'
dotnet test LongevityDiet.sln -c Release --nologo -v:q
npm --prefix src\LongevityDiet.Web run lint
npm --prefix src\LongevityDiet.Web test
npm --prefix src\LongevityDiet.Web run build
npm --prefix src\LongevityDiet.Web audit --omit=dev --audit-level=high
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\Test-Live-Docker-Acceptance.ps1 -VerifyMealLdas -VerifyPerformance
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\Test-Live-Docker-Acceptance.ps1 -VerifyTimedNotification
.\scripts\Run-Member1RedisSmoke.ps1
```

QA script tạo tài khoản giả và ghi SQL; **chỉ chạy vào Compose project `prn232-acceptance` trên loopback:8080** và dữ liệu giả riêng. Không dùng trong production hoặc database dùng chung.

## Những điểm chưa tự động coi là 100%

- Giá trị LDAS là chỉ báo hành vi **không lâm sàng**. Adapter đọc trực tiếp owner trong **Current Runtime**, chưa phải read model cập nhật bằng event tách service trong Target Architecture. Không được quảng cáo một bộ microservice biệt lập đã triển khai khi hiện tại các phần vẫn chung REST API.
- Chưa kiểm tra đủ UI thủ công bằng trình duyệt (keyboard/mobile/accessibility), các kịch bản concurrent load/chaos và trace phân tán thực tế.
- Nguồn recipe, định lượng dinh dưỡng và tương tác dị ứng chéo chưa có chứng nhận của chuyên gia. Các chỉ số meal coverage không xác nhận đủ chất, đáp ứng khuyến nghị y học hay tăng tuổi thọ.
- Kiểm thử 2 Admin rule approval đã đạt integration SQLite, nhưng cần xác nhận live SQL Server và review/CI nhánh đích trước khi merge.
- Không tự công bố đủ 100% hoặc merge khi các gate trên chưa được đóng có bằng chứng.

Mốc: tài liệu này cập nhật, thay thế trạng thái “LDAS chưa có meal/window” và “migration chưa chạy SQL” ghi trong audit ngày 10/11. Các runtime kiểm thử đã chạy trên SQL thật; kiểm nghiệm y khoa vẫn chưa đạt.
