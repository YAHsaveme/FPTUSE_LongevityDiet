# Task Documentation

Thư mục này là kế hoạch triển khai chính thức của **Longevity Diet Companion trong 4 tuần**.

## Cấu trúc

- `ROADMAP-4-WEEKS.md` - roadmap cấp cao 4 tuần.
- `Week 1/` -> `Week 4/` - task chi tiết theo tuần.
- Mỗi tuần gồm:
  - `README.md`: mục tiêu, dependency, integration order, phân công và exit criteria.
  - `Task 1.md` -> `Task 4.md`: 4 major task end-to-end cho 4 thành viên.

## Baseline hiện tại

- Research, requirements, safety/privacy, database/API design, architecture diagrams và solution scaffold đã hoàn thành.
- .NET 9 + ASP.NET Core API + React/TypeScript/Vite + SQL Server + Redis + gRPC + Worker + Docker đã có baseline.
- **Week 1 - Task 1: Identity, Authentication, Profile & Onboarding đã Done.**
- Không đưa các phần đã hoàn thành trở lại thành task mới.

## Quy tắc phân công

- Nhóm có 4 thành viên, tất cả đều là Full-Stack Developer.
- Mỗi tuần có đúng 4 major task; mỗi thành viên Owner một task.
- Mỗi task có Reviewer khác Owner.
- Owner chịu trách nhiệm end-to-end trong phạm vi task: Domain/Data -> Repository/Service -> API -> Frontend -> Tests khi cần.
- AI được phép dùng để tăng tốc nhưng output phải được review, build, test và chạy thật.
- Không tạo task chỉ để lấp lịch; ưu tiên business value, PRN232 requirement và release quality.

## Definition of Done chung

Một task chỉ được xem là hoàn thành khi:
1. build pass, không tạo warning/error mới;
2. flow chính chạy thật end-to-end;
3. validation, authorization, ownership và error handling đúng;
4. business rule quan trọng có test;
5. migration/API contract/docs liên quan được cập nhật;
6. không hardcode secret hoặc production data;
7. không duplicate schema/logic;
8. có review chéo;
9. không dùng mock/template thay cho production implementation;
10. có evidence đủ để demo hoặc kiểm chứng.

## Branch convention

`feature/w{week}-t{task}-{short-name}`

Ví dụ: `feature/w2-t1-activity-ldas`.

## Nguyên tắc 4 tuần

- Week 1: hoàn tất core foundation và distributed thin slice bắt buộc.
- Week 2: hoàn thiện core product value, scoring, recommendation và UX chính.
- Week 3: hoàn thiện background features, FMD safety và governance.
- Week 4: feature freeze, hardening, release, regression, demo và submission.
