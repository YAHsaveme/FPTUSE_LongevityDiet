# Week 1 - Core Product Foundation + Distributed Thin Slice

## Mục tiêu tuần
Chuyển project từ architecture/scaffold baseline thành hệ thống có business implementation thật và chứng minh sớm các technology bắt buộc của PRN232.

## Phân công

| Task | Owner | Reviewer | Trạng thái |
|---|---|---|---|
| Task 1 - Identity, Authentication, Profile & Onboarding | Thành viên 1 (bạn) | Thành viên 3 | Done |
| Task 2 - Food, Recipe, Diet Rule Catalog & Query Foundation | Thành viên 2 | Thành viên 4 | Not Started |
| Task 3 - Deterministic Meal Planning, Meal Logging & Eating Window | Thành viên 3 | Thành viên 1 | Not Started |
| Task 4 - gRPC Recommendation + Outbox + Redis Streams + Worker | Thành viên 4 | Thành viên 2 | Not Started |

## Dependency chính
- Task 1 cung cấp User/Profile/current-user foundation.
- Task 2 cung cấp Food/Recipe/Rule data.
- Task 3 phụ thuộc contract từ Task 1 + Task 2.
- Task 4 dùng business event/recommendation contract từ Task 2 + Task 3.

## Integration order
1. Freeze shared contracts.
2. Merge Task 1 foundation.
3. Merge Task 2 catalog/rules.
4. Merge Task 3 planning/logging.
5. Merge Task 4 distributed thin slice.
6. Chạy fresh DB migration + full E2E.

## Week exit criteria
- Auth/Profile E2E pass.
- Catalog CRUD/query pass.
- Plan -> Log -> Eating Window pass.
- REST -> gRPC pass.
- Outbox -> Redis -> Worker pass.
- dotnet build/test pass.
- npm build pass.
- Docker Compose vẫn chạy đủ required services.
