# Thành viên 4 — bảng kiểm tra nhiệm vụ dựa trên mã nguồn (09/11/2026)

**Phạm vi:** toàn bộ `docs/task/Week 1/Task 4.md` đến `Week 4/Task 4.md`. Tài liệu này phân biệt **đã kiểm chứng**, **mới thực hiện một phần**, và **chưa có bằng chứng**. Không thay đổi người Owner/Reviewer: **Owner Thành viên 4, Reviewer Thành viên 2**.

**Quy tắc đánh giá:** một task chỉ DONE sau khi toàn bộ Definition of Done của task có bằng chứng trong runtime, tests, SQL, UI và tài liệu; không suy ra DONE chỉ từ việc build thành công.

| Tuần/task | Trạng thái xác thực | Đã có trong `develop` / nhánh Member 4 này | Chưa đạt điều kiện nghiệm thu |
| --- | --- | --- | --- |
| **W1–T4** gRPC + Outbox + Redis + Worker | **PARTIAL** | `recommendation.proto`, gRPC độc lập, REST gRPC test; Identity/Tracking/Worker Outbox, Redis Streams and Worker reminder processing; bổ sung dead-letter metadata và graceful cancellation trong nhánh này | Chưa có bằng chứng E2E Redis/SQL với sự cố/restart đầy đủ; chưa chứng minh pending ownership recovery bằng XAUTOCLAIM; Target Gateway :8085 + RecommendationDb riêng vẫn chưa triển khai |
| **W2–T4** App Shell + UX | **PARTIAL** | Lazy routes, login/protected routes, error utilities; nhánh này thêm 404 thật, skip-link/focus, thống nhất 401/403/404/408/429/5xx, sáu test API errors | Chưa có Admin route group, shared Admin/Member shell hoàn chỉnh, test bàn phím + mobile/tablet/desktop bằng browser |
| **W3–T4** Rule Governance + Audit | **NOT IMPLEMENTED AS SPECIFIED** | Hiện có `PlanningCatalogSnapshotProvider` và một số rule/scoring snapshots; không có module quản trị phiên bản quy tắc với phê duyệt | Cần Catalog/Rules service sở hữu DB, Draft→InReview→Published→Retired, source provenance, role guards, admin UI, append-only audit, concurrency và lịch sử version |
| **W4–T4** Release / Submission | **PARTIAL** | README, Dockerfiles/Compose, EF migrations, sơ đồ và CI; nhánh này có regression tests/code sửa lỗi | Cần fresh SQL migration + runtime Docker smoke, Swagger endpoints live, 7/7 demo và xác nhận reviewer; phải phân biệt Current Runtime vs Target ADR-005 |

## Thay đổi thực tế của nhánh Member 4

1. **Worker reliability:** sự kiện không nhận diện được không còn biến mất sau ACK: ghi metadata `source`, `entryId`, `eventType`, `reason` vào `ldc:dead-letter` **trước ACK**. Không sao chép payload chứa thông tin người dùng. Bổ sung graceful shutdown khi đang chờ reconnect.
2. **UX:** URL không tồn tại hiển thị trang 404 thực thay vì chuyển âm thầm về `/`; có link về trang chủ và kế hoạch; thêm skip-link và focus-visible cho bàn phím.
3. **Error safety:** thống nhất thông báo cho network timeout, 403, 404, 408, 429 và lỗi 5xx; chi tiết exception nội bộ không được hiện cho người dùng.
4. **Regression:** 2 C# integration tests về metadata dead-letter; 6 Node tests về API errors; thêm `npm test` vào workflow GitHub Actions.

## Cần xác minh trước khi được gọi là 100%

- W1: chạy Redis & SQL thực, thí nghiệm disconnect/reconnect, dead-letter/ACK, replay, duplicate event, stale pending claim; kiểm chứng REST→gRPC→Web; kiểm tra database/service ownership theo Current Runtime.
- W2: E2E anonymous/Member/Admin và return-path sau login; kiểm tra bàn phím, screen reader, focus, 320px/mobile/tablet/desktop; không dùng mock thay dữ liệu chạy thật.
- W3: triển khai Catalog/Rules service + DB ownership và API/admin workflow; migration và kiểm thử toàn bộ transition, provenance, audit. **Không được tự tuyên bố module này tồn tại chỉ vì đã có snapshot tĩnh.**
- W4: kiểm chứng database migration fresh, startup/restart Docker, health, Swagger, broker message, screenshots/video demo và submission bundle; có reviewer khác Owner xác nhận.

## Lệnh tái kiểm tra

```powershell
dotnet test .\LongevityDiet.sln -c Release
cd .\src\LongevityDiet.Web
npm ci
npm test
npm run lint
npm run build
cd ..\..
docker compose --env-file .env.example config --quiet
```

**Không có thay đổi migration, dữ liệu production, credential hoặc schema** trong nhánh hardening này. Tất cả những mục chưa có bằng chứng là **OPEN**; báo cáo này không phải giấy xác nhận hoàn thành 100%.
