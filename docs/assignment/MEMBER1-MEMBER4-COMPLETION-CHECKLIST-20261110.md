# PRN232 — Bàn giao tiến độ Member 1 + Member 4 (10/11/2026)

**Repository:** `YAHsaveme/FPTUSE_LongevityDiet`
**Local:** `D:\PRN232\FPTUSE_LongevityDiet`
**Feature branch:** `feature/w3-t4-rule-governance-20261109`
**Trạng thái:** Code + kiểm thử tự động phần lớn đạt; **chưa nghiệm thu toàn bộ 100%** vì thiếu thử nghiệm hệ thống thực trên SQL/Docker/Redis/gRPC, kiểm duyệt dữ liệu dinh dưỡng và reviewer ký duyệt. Không dùng Claude/Codex để triển khai PRN232 trong giai đoạn này.

## Bảng kiểm đầy đủ theo tám task gốc

| Người, tuần | File phân công | Phần đã có trong source và bài test | Việc còn cần bằng chứng |
| --- | --- | --- | --- |
| Member 1 W1 Identity/Auth/Profile | `docs/task/Week 1/Task 1.md` | JWT, refresh rotation, logout/revoke, disabled user, UserProfile/onboarding, member/admin auth, SQLite API tests; lịch sử dự án có Chrome và SQL Server smoke ở nhánh trước | Chạy lại Chrome/SQL/Compose với commit hiện tại, quyền truy cập IDOR và session restore |
| Member 1 W2 Activity/LDAS | `docs/task/Week 2/Task 1.md` | Activity CRUD/goal/timezone/weekly, LDAS version + breakdown, missing-data policy, history; client UI và unit/integration tests | **Meal/eating-window score signals chưa có bằng chứng được phát event từ owner và ingest vào TrackingDb**. Không tự bịa phần điểm thiếu; cần demo tiến trình event end-to-end |
| Member 1 W3 Reminder/Notification | `docs/task/Week 3/Task 1.md` | Opt-in, quiet hours, timezone/DST, WorkerDb idempotency, Redis Streams/outbox, inbox/read state, UI; có lịch sử Redis 7 + SQLite smoke ở nhánh cũ | Re-run trên Docker + SQL hiện tại, restart/replay, concurrency nhiều Worker, message DLQ có dấu vết |
| Member 1 W4 Security/DI/Perf | `docs/task/Week 4/Task 1.md` | Member/Admin policy, JWT, rate-limit, 429/ProblemDetails, health/readiness, request correlation, scoped DI, static release/tests | Live p50/p95/429/auth/IDOR, trace HTTP→gRPC→Redis→Worker, secret scan, stress/benchmark trên hệ thống chạy thật |
| Member 4 W1 gRPC/Outbox/Redis | `docs/task/Week 1/Task 4.md` | Typed gRPC client and standalone service, deterministic ranking, SQL outbox + Redis stream, Worker consume/ACK and integration tests | Demo independent HTTP2 gRPC + SQL outbox→Redis XADD→XREADGROUP→XACK + restart/replay trên stack hiện tại |
| Member 4 W2 App UX | `docs/task/Week 2/Task 4.md` | React Shell/Admin/Member protected routes, common API errors, responsive CSS, lazy routes, lint/build/tests | Browser keyboard/mobile/tablet/desktop, focus/reduced-motion and offline/API-error screenshots |
| Member 4 W3 Rule Governance | `docs/task/Week 3/Task 4.md` | Draft→InReview→Published→Retired, provenance, immutable published versions, append-only RuleAudits, audit history. **Mới**: admin queue lọc medically sensitive, API/UI impact aggregates phiên bản→rule sets→plans, two-admin submission/publication gate, 409 self-approval, API integration tests. | SQL Server-specific migration and concurrency stress, external reviewer sign-off, clinical review of medically-sensitive rules |
| Member 4 W4 Release & Docs | `docs/task/Week 4/Task 4.md` | README six sections, EF migrations, Dockerfiles/Compose, Swagger, source-linked C0/C1/C2/ERD (56 tables), PDF/Drawio; SVG layout test 0 crossing/0 label cut; 400-day meal continuity | Fresh Docker deploy, traceable 7/7 live demonstration, full service checklist, external review and merge after gates |

## Tính năng dinh dưỡng yêu cầu thêm

- **Thực đơn mỗi ngày:** lộ trình rolling 14 ngày, tái tạo trước khi hết hạn và giữ các ngày chưa đổi ràng buộc; bài test mô phỏng **400 ngày liên tục qua năm mới**. Đây không phải chứng minh server tự chạy khi offline.
- **Sàng lọc an toàn:** xác nhận dị ứng; phân loại theo tuổi và cờ sức khỏe tự khai; chặn nhóm có nguy cơ hoặc tên dị ứng không xác minh được.
- **Nhật ký trước–trong–sau:** `Baseline`, `During`, `FollowUp` theo ngày, năng lượng/ngủ/tâm trạng/tiêu hóa, triệu chứng, cân nặng, ghi chú; phân quyền người dùng.
- **Phản hồi xấu:** cảnh báo triệu chứng khẩn và hai ngày tự đánh giá rất kém trong tuần; cần chuyên gia thay vì tự chỉ định chế độ ăn.
- **Chưa đạt chuẩn lâm sàng:** không đủ nguồn dữ liệu được duyệt cho mọi recipe, kiểm tra tiếp xúc chéo chất gây dị ứng, cân bằng năng lượng/protein/micronutrient theo người, tương tác thuốc. Không có bảo đảm tăng tuổi thọ.

## Tiêu chí Final Assignment (PDF gốc, tổng 100%)

| Tiêu chí | Trọng số | Bằng chứng hiện có / điểm còn thiếu |
| --- | --- | --- |
| Kiến trúc | 20% | C0/C1/C2/ERD hiện tại 56 bảng, 23 FK SQL; 22 controllers; bốn PDF một trang 0 giao cắt; source-backed. **Static pass** |
| REST API | 20% | JWT, CRUD, pagination, layer Service/Repository, API/role integration tests. **Live Swagger demo pending** |
| Background Job | 10% | Worker/opt-in reminders source and tests. **Live schedule/restart pending** |
| Broker | 15% | Redis Streams producer/consumer/idempotency, historical smoke. **Current branch runtime pending** |
| gRPC | 15% | Standalone gRPC + API typed client and tests. **Current branch independent host demo pending** |
| Docker/cloud | 10% | Docker Compose/Dockerfiles, configuration checks. **Actual fresh Compose + SQL migration pending** |
| Tài liệu/demo | 10% | README, migrations, diagrams, docs, scripts. **Seven observed demonstrations pending** |

**Rubric cho phép Redis Streams hoặc Kafka; Docker Compose hoặc cloud. Không bắt buộc cả hai.**

### Môi trường và các rào cản

- Trong phiên kiểm tra hôm 10/11, ổ **C: chỉ khoảng 344 MB trống**; ổ D: khoảng 108 GB. **Không tự xóa/move dữ liệu ngoài dự án hoặc chạy SQL Server/Docker nặng** trên C trong trạng thái này.
- Thiếu môi trường deployment và reviewer thực tế. API tests chủ yếu chạy SQLite; không được nói migration SQL đã pass nếu chưa chạy.
- Task của các thành viên khác (ví dụ nguồn MealLog/EatingWindow event từ Member 3) cần contract và dữ liệu thật; tránh hardcode, tạo điểm số không có chứng cứ.
- Trạng thái merge: làm ở feature branch; **không push/merge** khi chưa đủ thử nghiệm production-equivalent và đồng thuận của nhóm.

## Các lệnh tái kiểm tra

```powershell
Set-Location D:\PRN232\FPTUSE_LongevityDiet
dotnet build LongevityDiet.sln -c Release --nologo -v:q
dotnet test LongevityDiet.sln -c Release --nologo -v:q
npm --prefix src\LongevityDiet.Web run lint
npm --prefix src\LongevityDiet.Web run build
npm --prefix src\LongevityDiet.Web test
.\scripts\Export-OverallDiagrams.ps1
.\scripts\Validate-ProjectStructure.ps1
.\scripts\Test-ReleaseReadiness.ps1
docker compose --env-file .env.example config --quiet
```

## Bộ demo 7 bước bắt buộc

1. Giải thích hệ thống và 4 sơ đồ thật, phân biệt current runtime/target ADR.
2. Swagger với JWT: auth/profile/screening/plan/WL check-in/admin rule queue/impact.
3. Worker schedule đúng giờ và lưu trạng thái/không gửi trùng.
4. Redis publish→consume→ACK, retry, dead letter, restart.
5. API→Recommendation gRPC process độc lập, có fallback khi unavailable.
6. Full Compose + SQL migration/health + inter-service routing.
7. User từ onboarding → xác nhận dị ứng → lộ trình nhiều ngày → ghi bữa ăn/hoạt động/sức khỏe → thay đổi dị ứng → khóa/tái tạo hợp lệ → thống kê lịch sử.

## Cập nhật nghiệm thu runtime 11/11/2026

Xem [LIVE-DOCKER-E2E-20261111.md](LIVE-DOCKER-E2E-20261111.md). Đã chứng minh trên Docker/SQL Server thực tế: 14 ngày/42 bữa ăn, nhật ký Baseline/During/FollowUp, hai user tách dữ liệu, Tracking activity, REST → gRPC độc lập, Member → Admin 403, SQL Outbox → Redis Streams → Worker ACK. Lỗi 500 do dịch vụ gRPC ActivityCoach chưa map đã được khắc phục và kiểm chứng lại thành công. Test script có thể chạy lại trong QA độc lập; không chạy trên production.

**Còn cần nghiệm thu:** lịch gửi thông báo đúng hạn và notification đầu-cuối, event meal/eating-window vào LDAS, hiệu năng p95 và UI/accessibility, dữ liệu recipe/dị ứng được chuyên gia xác minh và kiểm tra CI trước merge. Không đánh đồng test pass với hoàn thành 100% mọi nhiệm vụ.

**Đề nghị nghiệm thu:** chỉ khi có bằng chứng vận hành thật, thực đơn được thẩm định, không có lỗi quan trọng và reviewer đồng ý thì mới nâng trạng thái lên 100%.
