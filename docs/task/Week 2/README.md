# Week 2 - Adherence, Activity & 14-Day Habit System

## Mục tiêu tuần
Biến dữ liệu meal/activity thành một vòng lặp theo dõi hành vi có thể đo lường: **Activity -> LDAS -> Challenge -> Progress Dashboard**.

## Phân công
| Task | Owner | Reviewer |
|---|---|---|
| Task 1 - Activity Tracking & Personal Goal Progress | Thành viên 1 | Thành viên 3 |
| Task 2 - LDAS Scoring Engine & Versioned Calculation | Thành viên 2 | Thành viên 4 |
| Task 3 - 14-Day Challenge, Streak & Completion | Thành viên 3 | Thành viên 1 |
| Task 4 - Progress Dashboard, Trend Aggregation & Insight Projection | Thành viên 4 | Thành viên 2 |

## Dependency
- Week 1 Auth/Profile phải ổn định.
- MealLog/EatingWindow từ Week 1 Task 3 là input cho LDAS.
- RuleSetVersion là input cho score versioning.
- Không dùng dữ liệu mock cho dashboard production flow.

## Integration order
1. Activity model + API.
2. LDAS calculator/version.
3. Challenge lifecycle.
4. Aggregate projection/dashboard.
5. E2E: log activity/meal -> recalc -> challenge/progress UI.

## Exit criteria
- Activity CRUD thật.
- LDAS có version, breakdown và disclaimer.
- 14-day challenge có lifecycle/streak đúng.
- Dashboard đọc aggregate thật.
- Unit/integration tests pass.
