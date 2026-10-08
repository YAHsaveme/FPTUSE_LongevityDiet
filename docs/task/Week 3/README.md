# Week 3 - Background Features + FMD Safety + Governance

## Mục tiêu tuần

Hoàn thiện các feature nền chạy bất đồng bộ, safety workflow và admin governance trước khi bước vào release hardening.

## Phân công

| Task | Owner | Reviewer |
|---|---|---|
| Task 1 - Reminder Scheduling + Notification Center | Thành viên 1 | Thành viên 3 |
| Task 2 - Weekly Report + Worker Reliability & Recovery | Thành viên 2 | Thành viên 4 |
| Task 3 - FMD Education, Safety Gate & Cycle Tracking | Thành viên 3 | Thành viên 1 |
| Task 4 - Rule Governance, Safety Audit & Admin Review | Thành viên 4 | Thành viên 2 |

## Dependency

- Redis Streams/Worker từ Week 1 phải hoạt động.
- Activity/LDAS/Challenge/Dashboard từ Week 2 cung cấp dữ liệu summary.
- FMD không được nhập chung với normal meal planner.
- Published rule/version phải có provenance và không sửa âm thầm.

## Integration order

1. Reminder + NotificationRequested contract.
2. Weekly report + retry/recovery.
3. FMD safety state machine + cycle tracking.
4. Rule governance + audit/read model.
5. Regression background/safety/admin flows.

## Week exit criteria

- Reminder/notification chạy theo timezone và idempotent.
- Weekly report được Worker tạo đúng một lần theo version/week.
- Worker restart/retry không làm mất hoặc double side effect.
- High-risk FMD case bị backend chặn.
- Admin truy vết được rule/safety changes và historical version.
