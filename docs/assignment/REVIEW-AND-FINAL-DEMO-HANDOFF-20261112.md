# PRN232 — Handover nghiệm thu kỹ thuật và checklist review (12/11/2026)

**Repository:** `YAHsaveme/FPTUSE_LongevityDiet`
**PR tổng hợp:** https://github.com/YAHsaveme/FPTUSE_LongevityDiet/pull/39
**CI xanh đã xác minh:** https://github.com/YAHsaveme/FPTUSE_LongevityDiet/actions/runs/43229276894 (commit `33e4118`)
**Nguồn chuẩn:** `PRN232 - Final Assignment.pdf` (3 trang), mục 2–7. Đây là bằng chứng **QA kỹ thuật**, không phải điểm giảng viên hoặc chứng nhận production.

## 1. Bằng chứng thực thi 12/11/2026

| Phạm vi | Kết quả quan sát | Cách tái lập |
| --- | --- | --- |
| GitHub CI `validate` và `current-runtime-release-smoke` | SUCCESS / SUCCESS trên `33e4118` | Xem workflow liên kết trên |
| PRN232 official static rubric | 22/22 PASS | `node scripts/Validate-Prn232-Final-PDF.cjs` |
| Final local acceptance | **18/18 gate PASS**, trong Docker Compose QA `prn232-acceptance`; chạy cả gateway outage và Redis independent smoke | `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Prn232-Final-Acceptance.ps1 -IncludeGatewayOutage -IncludeIndependentRedisSmoke -EvidenceFile .local-backups/prn232-final-acceptance-20261112.json` |
| .NET và frontend | 91 unit + 81 integration, 12 web tests, lint/build và npm production audit PASS | Có trong 18-gate acceptance |
| Browser Playwright | **12/12 PASS**: identity/onboarding, full member journey across catalog/recipes/meal planning/meal logs/LDAS/FMD safety/activity/challenge/report/reminder/logout, keyboard skip-navigation accessibility, and 320px/390px/1365px responsive cases | `npm --prefix tests/LongevityDiet.E2ETests run test:docker` |
| 5 sơ đồ chính thức | 5 Draw.io + 5 PDF đơn trang, 0 lỗi hình học | `node scripts/Validate-OfficialArchitecture.js`; `node scripts/Validate-OfficialDiagram-Geometry.js --strict` |
| ADR-005 six-owner Gateway | 27/27 PASS với JWT, routing, ownership và IDOR | `node scripts/Test-Target-Gateway-Http.mjs` (chỉ khi overlay target QA chạy) |
| SQL vật lý 6 owner | 50/50 bảng và 20/20 FK nội bộ, đối chiếu trực tiếp SQL Server | `node scripts/Test-Physical-ERD-Sql.mjs` |
| RabbitMQ metadata-only audit | 13/13 PASS, Redis→Rabbit→SQL, replay/idempotency, malformed envelope, broker outage/recovery | `node scripts/Test-RabbitMq-Domain-Events.mjs --outage` (chỉ QA) |
| Cutover guard | 10/10 PASS — chặn migration chưa được đối soát/phê duyệt | `node scripts/Test-ADR005-Cutover-Readiness.mjs` |

**Local evidence:** `.local-backups/prn232-final-acceptance-20261112.json` (bị Git ignore để tránh đưa bằng chứng runtime giả định thành cam kết phát hành). Dữ liệu kiểm thử sử dụng tài khoản và events tổng hợp; không chạy những script có thay đổi dữ liệu trên production.

## 2. Checklist bảy nội dung demo chính thức theo PDF

- [x] **Architecture:** C0/C1/C2/Database Diagram/Business Flow; phân biệt Current Runtime, Target QA và production chưa cutover.
- [x] **REST:** JWT register/login, CRUD, tìm kiếm/lọc/sắp xếp/phân trang, RBAC và ProblemDetails — quan sát qua API Docker QA.
- [x] **Background Job:** Worker reminder tạo notification, weekly report được lưu và chuyển Ready.
- [x] **Message Broker:** Redis Streams producer XADD, consumer XREADGROUP và ACK, chống xử lý trùng. RabbitMQ chỉ là phần thưởng mở rộng tùy chọn.
- [x] **gRPC:** REST → gRPC Recommendation container riêng, xử lý thành công qua HTTP/2.
- [x] **Deployment:** Docker Compose localhost, EF migration 3 database của Current Runtime, Gateway health/503/recovery, thêm target sáu owner qua overlay QA.
- [x] **End-to-End:** synthetic member → profile → allergy gate → meal plan → meal/activity logs → LDAS → Challenge/Dashboard → FMD high-risk block → weekly report; 12 Playwright tests.

Các ô [x] là **bài demo tự động/QA đã tái hiện**, **không chứng minh giảng viên đã trực tiếp xem**. Ngày 12/11 đã bổ sung `tests/LongevityDiet.E2ETests/specs/member-journey.spec.ts` chạy qua UI thật và API/SQL/Worker; gồm kiểm tra hard constraint dị ứng và FMD high-risk HTTP 422. Bài full journey và bài keyboard accessibility mới chạy thành công cùng 10 bài hiện có (**12/12**). Kịch bản nói và lệnh tái hiện: `docs/assignment/PRN232-FINAL-DEMO-7-STEPS.md`.

## 3. Chưa có quyền tự xác nhận

- [ ] **GitHub reviewer thực sự phê duyệt** PR #39. Đã yêu cầu review tới `Hieu080304`, `DuongHoaBinh`, `ThanLeThanhVinh` vào 12/11/2026. Review request != review APPROVED.
- [ ] **Nhóm nghiệm thu 16 task** theo phân công thực tế và ký nhận; CI không thay thế chữ ký đó.
- [ ] **Giảng viên xem demo và chấm điểm**. Không ghi 100/100 khi chưa có bảng điểm được xác nhận.
- [ ] **Production cutover ADR-005:** cần đối soát định danh/quyền/refresh-token với legacy, chiến lược concurrent writes, backup khôi phục kiểm thử, dữ liệu migration, audit rollback, review bảo mật và phê duyệt owner. Bài kiểm tra cutover cố tình FAIL-CLOSED; tuyệt đối không bypass.
- [ ] **Public HTTPS :443**: cần domain/DNS/ingress và TLS certificate hợp lệ do nhóm sở hữu; hiện target chỉ chạy localhost QA. Không coi chứng chỉ self-signed hoặc mở cổng máy local là production TLS.
- [ ] **Kiểm định dinh dưỡng / dữ liệu tham chiếu** nếu nhóm đặt tiêu chuẩn này; không có bằng chứng chuyên gia cấp chứng nhận. Đây không phải điều kiện bắt buộc trong PDF PRN232.

## 4. Quyết định sẵn sàng và trách nhiệm

**ĐẠT NGHIỆM THU KỸ THUẬT theo yêu cầu PDF trong môi trường QA tái hiện.** **CHƯA ĐỦ ĐIỀU KIỆN khẳng định toàn bộ 16 task nội bộ, production migration, review và điểm số hoàn tất 100%.**

Người duyệt nên mở PR #39, kiểm tra các diff và CI mới nhất, yêu cầu chỉnh sửa nếu cần và gửi review **APPROVED** theo đúng vai trò. Chỉ khi đáp ứng chính sách nhóm mới merge `feature/...` → `develop`; `develop` → `main` cần kiểm tra hồi quy tích hợp và quyết định phát hành riêng. Không commit trực tiếp `main`, không upload `.env`, mật khẩu, token, PII hoặc video lộ thông tin nhạy cảm.
