# PRN232 Final Assignment — trình bày và nghiệm thu đủ 7 bước

**Phiên bản:** 11/11/2026. **Nguồn:** PDF PRN232 – Final Assignment, mục 2–7.
**Phạm vi:** QA only, dữ liệu/tài khoản giả, Docker Desktop localhost. Đây là quy trình chứng minh kỹ thuật **not a lecturer sign-off**. Giảng viên và reviewer của nhóm vẫn phải trực tiếp xem, chấm và phê duyệt. Dự án không đưa ra chẩn đoán hay điều trị y khoa.

## Chuẩn bị trước demo

Máy cần có Docker Desktop, .NET 9, Node 24. Đường dẫn repository: D:\PRN232\FPTUSE_LongevityDiet. Không tiết lộ nội dung .env/JWT/SA password, không chạy các script QA trên production. Các container chỉ truy cập từ localhost.

    cd D:\PRN232\FPTUSE_LongevityDiet
    git status -sb
    docker ps --filter name=prn232-acceptance
    Invoke-WebRequest http://127.0.0.1:8080/ready -UseBasicParsing
    Invoke-WebRequest http://127.0.0.1:18080/gateway/ready -UseBasicParsing

Kỳ vọng: SQL Server và Redis healthy, API và Gateway ready 200. Docker QA có sáu container Current Runtime, bảy container khi bật Gateway, tám container khi bật Catalog Service, hoặc chín container khi bật thêm Tracking REST read-only. Hai service tùy chọn chưa được Gateway/Web chuyển tuyến vào production. Catalog dùng database riêng, chưa chuyển đường Web/Planning sang service mới.

## 01. System architecture

Mở các tệp PDF và Draw.io: docs/assignment/one-page/C0, C1, C2 và Database Diagram. Trình bày actors, REST/gRPC, database, Redis Streams, Worker; nói rõ **Current Runtime** và **Target ADR-005** là hai mức khác nhau. ERD xác nhận 56 bảng vật lý và 23 FK thực trong ba database hiện tại; Target bổ sung dịch vụ và database riêng vẫn chưa hoàn thiện.

    node scripts/Validate-OverallDiagrams.js
    node scripts/Validate-CourseLinks.js
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Validate-ProjectStructure.ps1

Kỳ vọng: PASS. Không gọi sơ đồ kiến trúc mục tiêu là đã triển khai nếu không có container tương ứng.

## 02. REST API

ASP.NET Core .NET 9, CRUD Admin Foods/Recipes, authentication JWT, query tìm kiếm/lọc/sắp xếp/phân trang, EF Core + SQL Server, phân lớp API–Services–Repository. Mở http://127.0.0.1:18080/openapi/v1.json để trình diễn OpenAPI và Bearer Scheme.

    # PowerShell: không đăng nhập phải trả 401
    try { Invoke-WebRequest http://127.0.0.1:18080/api/v1/foods -UseBasicParsing }
    catch { [int]$_.Exception.Response.StatusCode }
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Live-Docker-Acceptance.ps1 -VerifyMealLdas
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Live-Rest-Query-Features.ps1

Kỳ vọng: không có JWT = 401; tài khoản QA sinh mới được lưu SQL, plan 14 ngày/42 bữa, LDAS dựa trên meal/window, user khác không truy cập dữ liệu người thứ nhất, Member không truy cập được Admin endpoint (403).

## 03. Background job

Mở code src/LongevityDiet.Worker/Reminders/ReminderWorkerHostedService.cs và src/LongevityDiet.Worker/RedisWeeklyReportStreamWorker.cs. Chỉ cách scheduled reminder tạo notification và cách background worker sinh weekly report. Đây là tác vụ chạy ở container Worker riêng, không phải lời gọi đồng bộ từ API.

    docker logs --tail 45 prn232-acceptance-worker-1
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Live-Docker-Acceptance.ps1 -VerifyTimedNotification
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Live-Member2-Member3.ps1

Kỳ vọng: scheduled notification vào inbox SQL và weekly report chuyển Ready bởi Worker có lịch sử trong DB.

## 04. Message broker

PDF cho phép **Kafka hoặc Redis**. Dự án sử dụng **Redis Streams**, có producer StreamAddAsync ở API/Outbox và consumer group StreamReadGroupAsync + StreamAcknowledgeAsync ở Worker. Redis XADD/XREADGROUP/XACK thực sự chạy chứ không chỉ là message class.

    docker exec prn232-acceptance-redis-1 redis-cli PING
    docker exec prn232-acceptance-redis-1 redis-cli XINFO GROUPS longevity:weekly-report-events
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Run-Member1RedisSmoke.ps1

Kỳ vọng: PONG, có stream/consumer group, worker ACK và xử lý idempotent. Script smoke dùng Redis tạm + SQLite, không chạm dữ liệu người dùng.

## 05. gRPC interaction

Mở Protos/activity_coach.proto và Protos/recommendation.proto tại src/LongevityDiet.Recommendation.Grpc, cùng Docker container recommendation-grpc. Chứng minh REST gọi gRPC qua HTTP/2 đến process khác.

    docker ps --filter name=prn232-acceptance-recommendation-grpc
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Live-Docker-Acceptance.ps1

Kỳ vọng: REST_TO_GRPC_LIVE=PASS. Không tính lời gọi phương thức C# cùng process là gRPC.

## 06. Docker deployment

Hiển thị Dockerfile API, Worker, gRPC, Web và gateway tùy chọn; file docker-compose.yml, named volumes SQL Server/Redis và migration EF. PDF cho phép **Docker Desktop/Compose hoặc public Cloud**, không yêu cầu cả hai. Mở readiness endpoints và cho thấy các container kết nối.

    docker compose --env-file .env.example config --quiet
    docker compose -f docker-compose.yml -f docker-compose.gateway.yml --env-file .env.example config --quiet
    docker ps --filter name=prn232-acceptance
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Live-Gateway.ps1 -TestUpstreamOutage

Kỳ vọng: cả hai Compose config hợp lệ. Script outage giới hạn ở Compose project prn232-acceptance, Gateway 503 khi API dừng, trở lại 200 sau restart. Tuyệt đối không chạy outage test trên production.

## 07. End-to-end workflow

Demo Web tiếng Việt tại http://127.0.0.1:5173: đăng ký → profile → screening dị ứng → kế hoạch 14 ngày → log bữa ăn → LDAS → Challenge/Dashboard → Weekly Report → notification. Bổ sung Admin Rule Governance yêu cầu hai Admin độc lập; FMD chặn khởi tạo chu kỳ nếu nguy cơ cao.

    npm --prefix tests/LongevityDiet.E2ETests run test:docker
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Live-Docker-Acceptance.ps1 -VerifyMealLdas -VerifyTimedNotification
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Live-Admin-Rule-Governance.ps1
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Live-Member2-Member3.ps1

Kỳ vọng: Playwright đăng ký/onboard/logout qua browser đạt, tất cả Docker smoke kết thúc PASS. Chỉ sử dụng tài khoản/dữ liệu giả.

## Thang đánh giá gốc từ PDF — KHÔNG tự chấm 100 điểm

| Tiêu chí | Trọng số | Bằng chứng |
| --- | ---: | --- |
| System architecture and design | 20% | C0/C1/C2/ERD, ADR, validator |
| REST API implementation | 20% | JWT, CRUD, SQL/query, API & E2E |
| Background Job | 10% | Worker notification/report |
| Message Broker integration | 15% | Redis Streams producer/consumer/ACK |
| gRPC service | 15% | REST → HTTP/2 gRPC independent service |
| Docker/Cloud deployment | 10% | Compose/SQL/Redis/health/migrations |
| Documentation and presentation | 10% | README/OpenAPI/source/7-step demo |

CI xanh không chứng minh đã bảo vệ trước giảng viên hoặc đã được chấm 100/100. Target Gateway/4 REST services/6 domain DB/TLS443 là tiêu chuẩn nội bộ **cao hơn** PDF; hiện chưa được triển khai đầy đủ.

## Checklist người duyệt ký sau buổi demo

- [ ] Đã trình bày đúng bốn sơ đồ C0/C1/C2/ERD và mô tả Current vs Target.
- [ ] Đã xem REST API, JWT, CRUD, lọc, sắp xếp và phân trang.
- [ ] Đã xem tác vụ nền scheduled/asynchronous thực sự chạy.
- [ ] Đã thấy Redis producer, consumer group và ACK.
- [ ] Đã xem REST gọi gRPC độc lập.
- [ ] Đã thấy toàn bộ Docker deployment và liên lạc liên dịch vụ.
- [ ] Đã chạy end-to-end business workflow với SQL thật.
- [ ] Reviewer của thành viên 1–4 xác nhận các task nội bộ còn thiếu hoặc đã hoàn thành.
- [ ] Giảng viên xác nhận buổi demo và điểm số.

**Nguồn bằng chứng:** báo cáo docs/assignment/FOUR-MEMBER-PDF-100PCT-ACCEPTANCE-AUDIT-20261111.md. Lệnh rà đầy đủ mã nguồn và deliverables từ PDF (static only):

    node scripts/Validate-Prn232-Final-PDF.cjs

**Chú ý:** bài kiểm tra static này không thay cho Docker QA, buổi demo trực tiếp hay reviewer sign-off.
