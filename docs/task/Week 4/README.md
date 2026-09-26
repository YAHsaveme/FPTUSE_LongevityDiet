# Week 4 - Background Business Features

## Mục tiêu tuần
Biến Worker/Redis foundation thành các background feature có business value: reminder, notification, weekly report và reliability operations.

## Phân công
| Task | Owner | Reviewer |
|---|---|---|
| Task 1 - Reminder Preferences & Scheduling Engine | Thành viên 1 | Thành viên 3 |
| Task 2 - Notification Center & Event-Driven Delivery | Thành viên 2 | Thành viên 4 |
| Task 3 - Weekly Report Generation & Summary Persistence | Thành viên 3 | Thành viên 1 |
| Task 4 - Worker Reliability, Retry, Recovery & Outbox Operations | Thành viên 4 | Thành viên 2 |

## Dependency
- Redis Streams/Worker baseline Week 1.
- Activity/LDAS/Challenge Week 2.
- Notification/report jobs không được chạy trực tiếp trong request thread.

## Exit criteria
- Scheduled business jobs chạy thật.
- Notification center persist và đọc được.
- Weekly report generated idempotently.
- Retry/recovery/outbox cleanup có test.
