# Task Documentation

Thư mục này là nơi quản lý task chính thức của dự án theo tuần.

## Cấu trúc

- `ROADMAP-9-WEEKS.md` - roadmap cấp cao 9 tuần.
- `Week 1/` -> `Week 9/` - task chi tiết từng tuần.
- Mỗi thư mục tuần gồm:
  - `README.md`: mục tiêu tuần, dependency, integration order và bảng phân công.
  - `Task 1.md`
  - `Task 2.md`
  - `Task 3.md`
  - `Task 4.md`

## Quy tắc phân công

- Nhóm có 4 thành viên, tất cả đều là Full-Stack Developer.
- Mỗi task có một Owner chịu trách nhiệm end-to-end.
- Mỗi task có một Reviewer khác Owner.
- Owner không chỉ làm Backend hoặc Frontend; task phải đi xuyên suốt Domain/Data -> Repository/Service -> API -> Frontend -> Test nếu phạm vi cần.
- AI được phép dùng để tăng tốc nhưng mọi output phải được review, build, test và chạy thật trước khi merge.
- Không đưa lại việc đã hoàn thành vào task mới.
- Không tạo task chỉ để làm boilerplate, folder hoặc tài liệu không tạo giá trị.

## Week 1 assignment đã chốt

- Task 1: Thành viên 1 - bạn.
- Task 2: Thành viên 2.
- Task 3: Thành viên 3.
- Task 4: Thành viên 4.

Các tuần sau hiện là phân công đề xuất; nhóm có thể đổi Owner khi tuần bắt đầu nếu workload thực tế thay đổi.

## Definition of Done chung

Task chỉ hoàn thành khi:
1. build pass;
2. chức năng chạy thật end-to-end trong phạm vi task;
3. validation, authorization và error handling đúng;
4. business rule quan trọng có test;
5. migration/API contract/docs liên quan được cập nhật;
6. không hardcode secret;
7. không duplicate code/schema;
8. có review chéo;
9. không còn mock/template giả làm implementation;
10. có evidence đủ để demo hoặc kiểm chứng.
