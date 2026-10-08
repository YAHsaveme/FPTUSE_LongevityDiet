# Task 4 - Critical Fixes, Final Deliverables, README & Submission Integrity

**Owner:** Thành viên 4
**Reviewer:** Thành viên 2
**Branch:** `release/w4-final`
**Status:** Planned

## Mục tiêu

Đóng release dưới feature freeze: sửa blocker có kiểm soát, hoàn tất đúng deliverables PDF, đồng bộ tài liệu với implementation và tạo clean submission.

## Bug triage

- Critical: data loss, auth bypass, app không chạy, mandatory PRN232 flow hỏng.
- High: major feature unusable, Worker/message loss, gRPC/Docker/demo blocker.
- Medium/Low: chỉ sửa nếu risk regression thấp.
- Reproduce trước khi fix.
- Thêm regression test khi phù hợp.
- Không refactor lớn trong bug fix cuối kỳ.

## PDF deliverables checklist

Submission bắt buộc có:
- complete source code;
- database scripts hoặc EF Core migrations;
- Dockerfile(s);
- Docker Compose configuration;
- Swagger/OpenAPI;
- root README đầy đủ.

## README mandatory checklist

Root `README.md` phải có nội dung rõ ràng cho đúng PDF:
1. **Project description**.
2. **System architecture**.
3. **Technology stack**.
4. **Installation guide**.
5. **Deployment instructions**.
6. **Team member responsibilities**.

Các command trong README phải chạy được; không để instruction stale.

## Documentation final

- Root README.
- `docs/05-SYSTEM-ARCHITECTURE.md`.
- Architecture C0/C1/deployment diagrams.
- ADRs.
- API/gRPC/events.
- DB design.
- `docs/09-TEST-DEPLOY-DEMO.md`.
- `docs/10-PRN232-TRACEABILITY.md`.
- Task/team responsibility docs.
- Diagram/document links phải khớp implementation cuối.

## Submission cleanup

Có thể xóa nếu generated/reproducible:
- `.vs/`;
- `bin/`;
- `obj/`;
- `node_modules/`;
- `dist/`;
- TestResults/coverage;
- Playwright report/test-results;
- temp logs;
- local verification DB/backup không yêu cầu.

Phải giữ:
- source;
- migrations;
- package lock files;
- Dockerfiles/Compose;
- docs/diagrams;
- ADR;
- scripts có giá trị;
- `.env.example`.

Không xóa:
- file chỉ vì không hiểu;
- migration đã dùng/shared;
- docs canonical;
- generated source bắt buộc bởi framework/tooling;
- cấu hình cần để build/run.

## Final verification

- project structure/task validator.
- fresh .NET build/test.
- frontend lint/build.
- fresh SQL migration.
- Swagger/OpenAPI.
- Docker Compose config/runtime smoke.
- 6-service communication matrix.
- 7/7 demo checklist.
- file links/diagram export.
- no-secret scan.
- no retired-timeline references.
- source tree sạch.

## Definition of Done

Không còn Critical/High blocker chưa có mitigation chấp nhận được; toàn bộ deliverables PDF hiện diện; README đủ 6 mục; submission từ clean tree build/run được và không chứa secret, generated junk hoặc tài liệu mâu thuẫn.
