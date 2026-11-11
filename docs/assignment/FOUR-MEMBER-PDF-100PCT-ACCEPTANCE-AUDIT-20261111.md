# PRN232 Final Assignment — kiểm toán 4 thành viên, 16 task và PDF gốc

Ngày xác minh: **11/11/2026 (Asia/Ho_Chi_Minh)**
Repository: **YAHsaveme/FPTUSE_LongevityDiet**
Nhánh kiểm tra: **audit/prn232-four-members-final-20261111**, tách từ develop tại **4d2cb9c**.
**Kết luận phát hành: CHƯA THỂ XÁC NHẬN 100% TẤT CẢ TASK, KHÔNG MERGE MAIN.**

## 1. Phạm vi và chuẩn chứng cứ

Nguồn yêu cầu chính thức: **PRN232 - Final Assignment.pdf**, bản 3 trang do người dùng cung cấp, gồm mục 2.1–2.4, 3–6 và bảng đánh giá mục 7. Nguồn yêu cầu nội bộ: **docs/task/Week 1–4/Task 1–4.md**, **docs/task/ARCHITECTURE-ALIGNMENT-MATRIX.md** (ADR-005), **README.md** và runbook.

Phân biệt bốn mức: **Đạt code/test** = có automated test; **Đạt live** = đã chạy trên SQL/Redis/gRPC/Docker QA; **Chưa đạt target** = hiện chỉ là Current Runtime khác Target ADR-005; **Chờ người duyệt** = không tự xác nhận chữ ký giảng viên/reviewer hoặc tính an toàn thực đơn.

### Bằng chứng được quan sát trên máy và GitHub

- Pull Request **#22** merged vào develop; merge SHA **4d2cb9cbe91a6bc8f53c810e11f97e6b0537c103**.
- GitHub Actions PR: hai job **validate** và **current-runtime-release-smoke** đều SUCCESS; push develop sau merge cũng validate SUCCESS.
- **172/172 .NET tests** (91 Unit + 81 Integration), **12/12 Web tests**, 0 lint errors, production build PASS, npm audit production 0 vulnerabilities.
- **10/10 Playwright E2E**, Edge CDP layout **6/6** (320, 390, 1365 px).
- Docker QA project **prn232-acceptance**, sáu container chạy; SQL Server và Redis healthy; Web/API /health /ready HTTP 200.
- EF applied migrations: database chính **11**, Tracking **2**, Worker **1**. Tổng thực tế **3 database**, không phải 6 database của Target.
- Live test **scripts/Test-Live-Docker-Acceptance.ps1**: JWT, profile, allergy screening, 14-day / 42 meals, three wellness phases, isolation, LDAS from MealLog/EatingWindow, REST→gRPC, SQL Outbox→Redis→Worker ACK, timed inbox + IDOR blocking PASS.
- Live test **scripts/Test-Live-Admin-Rule-Governance.ps1**: 2 Admin QA khác nhau, lifecycle, queue, provenance, impact, audit và self-approval blocking PASS.
- **scripts/Test-Live-Member2-Member3.ps1** (11/11): Catalog Foods/Recipes/Rules, search/pagination sample, challenge 14-day/duplicate/idempotency, dashboard, meal plan/recommendation, FMD education/assessment/high-risk blocking, weekly report Redis→Worker→SQL Ready + history PASS.
- C0/C1/C2/ERD: Draw.io + PDF one-page; source validator PASS; 22 controllers, 56 physical tables across 3 DBs, 23 SQL FKs, 32 selected visual application associations, 0 label-line cuts/crossing according to SVG geometry QA.
- Các bài live là **QA với tài khoản giả**, không phải chứng nhận production, dinh dưỡng lâm sàng hay buổi trình bày trước giảng viên.

## 2. Nghiệm thu đủ 16 task (4 thành viên × 4 tuần)

| Tuần | Thành viên 1 | Thành viên 2 | Thành viên 3 | Thành viên 4 |
| --- | --- | --- | --- | --- |
| W1 | Auth, JWT, profile, refresh/revoke — **PASS live + E2E Current Runtime** | Food/Recipe/DietRule CRUD/catalog/query/seed — **PASS code + live query; reviewer pending, Catalog service riêng chưa triển khai** | Deterministic plan/log/eating window — **PASS code, live plan + log, chỉ là Current Runtime** | Recommendation gRPC/outbox/Redis/Worker — **PASS live + replay tests; target Gateway/Outbox mỗi owner chưa đầy đủ** |
| W2 | Activity/LDAS thực đọc log/window — **PASS live + missing-data policy** | Challenge 14 ngày/progress/dashboard — **PASS live; dashboard vẫn ở shared API, target projections tách service chưa có** | Recommendation v2, replacement, feedback — **PASS integration tests; live recommendation PASS, chưa chứng minh mọi lựa chọn thay món/feedback trên browser** | App Shell, lỗi API, responsive, auth — **PASS lint/build/Edge CDP 6/6/Playwright 10/10; accessibility review toàn diện chưa ký duyệt** |
| W3 | Reminder/notification — **PASS live SQL Outbox→Redis→Worker, scheduled inbox, unread/IDOR; chaos/failover đầy đủ chưa đo độc lập** | Weekly report/retry/DLQ — **PASS live job→Ready, integration replay; chưa có Tracking service tách riêng nhận Worker result** | FMD education/safety/cycle — **PASS integration state machine + live high-risk blocking; không xác nhận y khoa** | Rule Governance, 2 Admin, audit — **PASS live SQL + integration; Catalog owner service tách riêng chưa tồn tại, reviewer chuyên môn chưa ký** |
| W4 | Security/DI/Resilience/Perf — **PASS JWT/RBAC/IDOR/health, benchmark tuần tự; chưa có full-service distributed trace và concurrent load assurance** | DB/Docker/CI/deploy — **PASS Current Runtime; CHƯA ĐẠT Definition of Done về Target Gateway, 4 domain services, 6 logical DBs, TLS443** | Regression, PDF evidence, rehearsal — **PASS automated QA/docs; chưa có bằng chứng thuyết trình/giám khảo xác nhận trực tiếp và Target runtime** | Critical fixes, diagrams, final packaging — **PASS sơ đồ/CI/runbook; hiện trạng Target chưa triển khai, một số docs/task cũ ghi trạng thái Planned/Ready for Review, chưa có sign-off nhóm** |

**Chú thích:** Cột PASS live không đồng nghĩa task đạt 100% nếu Definition of Done ghi rõ Target Architecture hoặc yêu cầu duyệt bên ngoài. Các trạng thái Ready for Review/Planned/Not Started trong task gốc là tài liệu cũ; chúng không thay thế kết quả kiểm thử hiện tại, nhưng cũng không được tự đổi thành Done khi chưa có chữ ký phê duyệt.

### Bốn nhóm việc chưa đóng được

1. **Target Architecture ADR-005:** chưa có Gateway YARP độc lập, chưa có các project và container Identity, Catalog, Planning, Tracking REST :8081–8084, chưa có RecommendationDb và các DB riêng đầy đủ, Worker Ops :8086 độc lập, TLS public :443; target communication matrix chưa có demo. Hiện là 6 container Current Runtime, API đang dùng chung LongevityDietDbContext cho nhiều domain.
2. **Quy trình nghiệm thu nhóm:** nhiều task thành viên 2 ghi Ready for Review và reviewer tương ứng chưa có phê duyệt được kiểm chứng; một số task của thành viên 1/4 ghi Planned hoặc Not Started do tài liệu chưa được cập nhật.
3. **Bằng chứng cuối:** chưa trực tiếp quan sát demo 7 phần **trước giảng viên**, review accessibility đầy đủ, stress/concurrency/correlation trace xuyên mọi service mục tiêu, khôi phục backup theo phiên bản mới nhất. Các test tương ứng ở Current Runtime không thay thế mọi trường hợp.
4. **An toàn thực đơn:** giá trị dinh dưỡng/ingredient hiện mang tính minh họa; chưa có chuyên gia dinh dưỡng duyệt toàn bộ recipe, nguy cơ tiếp xúc chéo và tính phù hợp lâm sàng theo từng người. Đây là yêu cầu chất lượng dự án tự đặt thêm, không phải tuyên bố chẩn đoán/điều trị từ PDF PRN232.

## 3. Đối chiếu chính xác 100% yêu cầu kỹ thuật PDF Final Assignment

| Điều khoản PDF | Bằng chứng được xác minh | Kết quả |
| --- | --- | --- |
| 2.1 REST API ASP.NET Core | .NET 9 API; 22 controllers; CRUD foods/recipes/meals/challenges; theo lớp API/Services/Repositories | **ĐẠT KỸ THUẬT** |
| 2.1 JWT + searching/filtering/sorting/pagination | Identity API E2E; Catalog/Rules query & tests; REST HTTP 401/403/404/409 | **ĐẠT KỸ THUẬT** |
| 2.2 Background Service | Worker reminders chạy theo lịch thực, báo cáo tuần Ready và notification/inbox | **ĐẠT KỸ THUẬT** |
| 2.3 Kafka HOẶC Redis | Redis Streams producer + consumer group + ACK, side effect SQL, replay tests | **ĐẠT KỸ THUẬT** |
| 2.4 independent gRPC | Recommendation gRPC host độc lập; API gọi gRPC ActivityCoach qua HTTP/2, live PASS | **ĐẠT KỸ THUẬT** |
| 3 Docker Compose HOẶC cloud | Docker Compose 6 container trên Docker Desktop; gRPC/SQL/Redis/Worker live; GitHub runner Docker E2E PASS | **ĐẠT KỸ THUẬT (CURRENT RUNTIME)** |
| 4 .NET≥8, EF Core, relational DB, DI, config, logging, JWT, REST, gRPC, broker, Worker, Docker | .NET 9 + EF SQL Server 3 DB / migrations + scoped DI + error RFC7807 + tracing/logging, các công nghệ trên | **ĐẠT PHẦN CHỨC NĂNG; quan sát logging/correlation đầy đủ cần kiểm tra riêng** |
| 5 Complete source code | Repo develop, CI, 16 task docs, source and tests | **ĐỦ TỆP CHO CURRENT RUNTIME** |
| 5 Database scripts/migrations | EF migrations 11+2+1 trên 3 DB QA; seed Catalog; không phải 6 DB Target | **ĐẠT PDF** |
| 5 Dockerfile/Compose | Dockerfiles API/Web/gRPC/Worker và docker-compose.yml, bản chạy GitHub Linux + Windows | **ĐẠT PDF** |
| 5 API documentation | /openapi/v1.json HTTP 200, JWT security metadata, Swagger docs | **ĐẠT PDF** |
| 5 README sáu nhóm nội dung | Project, architecture, stack, installation, deployment, team responsibilities | **ĐẠT VỀ CẤU TRÚC; cần cập nhật bằng chứng cũ** |
| 6 Demo 7 bước | Các script live/CI cho architecture, API, background, publish/consume, gRPC, Docker, E2E | **CÓ BẰNG CHỨNG TÁI HIỆN; CHƯA QUAN SÁT TRÌNH BÀY VỚI GIẢNG VIÊN** |
| 7 Assessment criteria (20/20/10/15/15/10/10) | Mapping trong tài liệu; không được tự chấm điểm thật khi giảng viên chưa chấm | **KHÔNG THỂ TỰ XÁC NHẬN 100 ĐIỂM** |

Lưu ý: PDF **không bắt buộc** Kafka khi đã chọn Redis và **không bắt buộc** Cloud khi đã chọn Docker Compose. PDF cũng **không yêu cầu** 6 service-owned DB hay public HTTPS443; đó là mục tiêu cao hơn do nhóm tự ghi trong ADR-005 và task W4-T2.

### Xác minh bổ sung sau lần chạy lại

- Docker Engine có một lần thay đổi phiên hoạt động: **cả 6 container QA cùng Exited (255)** nên các HTTP endpoint tạm thời không truy cập được. Không đủ log để xác định nguyên nhân gốc (không tự quy thành lỗi ứng dụng). Khởi động lại **đúng các volume cũ**, SQL Server và Redis trở về healthy, API /ready = HTTP 200; chạy lại trọn bài Member 2 + 3 **PASS** và kiểm tra lại các validator C0/C1/C2/ERD, links, 20 nutrition contract tests **PASS**. Điều này chứng minh khả năng phục hồi thủ công, không chứng minh automatic failover.
- GitHub PR #22 đã merge với CI SUCCESS nhưng API GitHub trả **reviews: []**, reviewDecision rỗng. Do đó không có bằng chứng reviewer chính thức ký duyệt từng task trong PR đó; CI xanh không thay thế quy trình duyệt của nhóm.
- Kiểm tra báo cáo và README vẫn là bằng chứng kỹ thuật QA. Không tự tuyên bố trạng thái DONE cho các task còn thiếu target/referee gate.

## 4. Quyết định phát hành

- **Đủ điều kiện CI của Current Runtime:** CÓ, dựa trên GitHub CI, Windows Edge/Playwright và Docker live QA.
- **Đủ bằng chứng gọi toàn bộ 16 task DONE 100% theo Definition of Done:** **CHƯA** (Target Architecture + reviewer + presentation).
- **Merge develop → main theo yêu cầu điều kiện “nếu xong hết 100%”:** **KHÔNG MERGE**. Main giữ nguyên.
- Cần ưu tiên: quyết định chính thức phạm vi giao bài (Current Runtime hay toàn Target), triển khai/điều chỉnh task theo quyết định đó; hoàn thành service boundary nếu giữ nguyên ADR-005; reviewer sign-off; chụp/checklist buổi demo và kiểm định dữ liệu trước khẳng định đủ 100%.

## 5. Lệnh kiểm tra có thể tái lập

- .NET: dotnet test LongevityDiet.sln -c Release --no-build
- Web: npm --prefix src/LongevityDiet.Web test; npm --prefix src/LongevityDiet.Web run lint; npm --prefix src/LongevityDiet.Web run build
- Đồ án: node scripts/Validate-OverallDiagrams.js; node scripts/Validate-CourseLinks.js; node scripts/Validate-NutritionPlanContract.js
- API + gRPC + Redis + Worker: powershell -ExecutionPolicy Bypass -File scripts/Test-Live-Docker-Acceptance.ps1 -VerifyMealLdas
- Admin rule lifecycle: powershell -ExecutionPolicy Bypass -File scripts/Test-Live-Admin-Rule-Governance.ps1
- Catalog/Challenge/Dashboard/FMD/Weekly Report: powershell -ExecutionPolicy Bypass -File scripts/Test-Live-Member2-Member3.ps1
- Browser: node scripts/Validate-Mobile-Layout.cjs; npm --prefix tests/LongevityDiet.E2ETests run test:docker
- GitHub evidence: PR #22, Project Quality Gate SUCCESS; protected main should remain unchanged until full gating.

**Phạm vi các script live:** chỉ chạy trên Docker QA project prn232-acceptance, localhost, dữ liệu giả. Không chạy các script có dữ liệu thay đổi trên production.

## 6. Cập nhật sau kiểm toán: Gateway YARP (11/11/2026)

Nhóm đã có **bước dịch chuyển đầu tiên** của ADR-005: một project Gateway .NET 9/YARP độc lập, có Compose overlay tùy chọn và Web Nginx chuyển tiếp qua Gateway. Đã kiểm tra trực tiếp JWT/RBAC, route 404, OpenAPI, readiness 503 khi API ngừng, khôi phục và 10/10 Playwright E2E; .NET 172/172. Đây là tiến triển kỹ thuật sau bản kiểm toán ban đầu, **không phải** một tuyên bố toàn bộ Target Architecture đã triển khai. Bốn domain REST service riêng, các DB ownership và public TLS443 vẫn thiếu. Xem [tài liệu Gateway](../architecture/TARGET-GATEWAY-MIGRATION-20261111.md).

## 9. Independent Tracking REST read-only checkpoint (11/11/2026)

- Tracking REST .NET 9 now runs in a separate process at :8084 and only connects to pre-existing LongevityTrackingDb. Its read paths consume the actual legacy TrackingService writes in the same owned DB. A cross-platform 27-case QA proves two-member JWT isolation, read-your-own Activity/Goal, IDOR 404, persisted LDAS history without fabricated scores, date filtering, invalid JWT and overflow-safe pagination.
- Not a full Target Tracking cutover: write/recompute remains in transitional API pending copied user timezone, versioned meal/window signals and event Outbox ownership. See docs/architecture/TARGET-TRACKING-READ-MIGRATION-20261111.md.

## 8. Independent Catalog Service migration checkpoint (11/11/2026)

- CatalogDbContext :8082 owns LongevityCatalogDb, EF migrated 10 tables in independent Docker process. Default current runtime remains unchanged; 4 Foods, 2 Recipes, 2 Rules seed; 11-case HTTP/JWT/role QA plus direct SQL ownership and migration verification PASS.
- This new fourth logical DB is **opt-in**; existing 3 databases remain for Current Runtime. Full ADR-005 still lacks independent Identity/Planning/Tracking REST services, writer migration, domain events/Outbox and TLS443. Do **not** mark 16 tasks complete.
- See docs/architecture/TARGET-CATALOG-SERVICE-MIGRATION-20261111.md and scripts/Test-Live-Catalog-Service.ps1.

## 7. Final Assignment PDF dedicated acceptance (11/11/2026)

- Official original three-page PDF clauses 2–7 are checked by 22 static source/artifact assertions in scripts/Validate-Prn232-Final-PDF.cjs, and a repeatable all-domain Docker suite in scripts/Test-Prn232-Final-Acceptance.ps1. This includes scheduled notification, SQL Outbox/Redis Streams worker ACK, independent gRPC, two Admin approvals, real SQL Catalog/Challenge/Planner/LDAS/FMD and Playwright, plus optional Gateway failure recovery and independent Redis smoke. Static checks and the full 16-gate QA run passed on 11/11; an additional live search/filter/sort/page test now also passes (13 checks).
- Seven instructor-facing demonstrations are scripted in docs/assignment/PRN232-FINAL-DEMO-7-STEPS.md, with checklist intentionally unsigned. **This is technical QA evidence, not a lecturer-observed presentation or 100/100 grade.** ADR-005 full target services and reviewer approval remain pending; main must not be merged solely on automated QA.
