# Week 2 - Core Product Value + Recommendation + UX

## Mục tiêu tuần

Biến foundation Week 1 thành sản phẩm có vòng lặp sử dụng rõ ràng: **Track -> Score -> Challenge -> Dashboard -> Recommendation -> Action**.

## Phân công

| Task | Owner | Reviewer |
|---|---|---|
| Task 1 - Activity Tracking + LDAS Scoring | Thành viên 1 | Thành viên 3 |
| Task 2 - 14-Day Challenge + Progress Dashboard | Thành viên 2 | Thành viên 4 |
| Task 3 - Recommendation v2 + Replacement + Feedback | Thành viên 3 | Thành viên 1 |
| Task 4 - App Shell + Design System + Unified UX Quality | Thành viên 4 | Thành viên 2 |

## Dependency

- Week 1 catalog/rules/planner/gRPC phải ổn định.
- MealLog/EatingWindow là input cho LDAS.
- Recommendation luôn ưu tiên hard constraints hơn preference/feedback.
- Dashboard dùng dữ liệu/projection thật, không mock.

## Integration order

1. Activity + score contract.
2. Challenge + dashboard projection.
3. Recommendation v2 + replace/feedback.
4. App shell + shared UX integration.
5. E2E: plan/log/activity -> score/challenge/dashboard -> recommendation/replace.

## Week exit criteria

- Activity CRUD + aggregation thật.
- LDAS deterministic, versioned, có disclaimer.
- 14-day challenge persist đúng.
- Dashboard không còn hardcoded metric.
- Recommendation explainable + replacement an toàn.
- Main Member journeys chạy trong một app shell responsive, error/loading state nhất quán.
