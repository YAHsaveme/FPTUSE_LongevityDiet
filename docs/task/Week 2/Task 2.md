# Task 2 - 14-Day Challenge + Progress Dashboard

**Owner:** Thành viên 2
**Reviewer:** Thành viên 4
**Branch:** `feature/w2-t2-challenge-dashboard`
**Status:** Planned

## Mục tiêu

Biến meal/activity/LDAS thành vòng lặp hành vi 14 ngày và dashboard tổng hợp dùng dữ liệu thật.

## Phạm vi chính

- ChallengeTemplate, ChallengeDayTemplate, UserChallenge, UserChallengeDay.
- Start/complete/uncomplete challenge, progress và streak theo local date.
- Completion idempotent; không tự backfill ngày đã bỏ lỡ.
- DailyWellnessSummary/WeeklyProgressSummary hoặc projection tương đương.
- Dashboard aggregate: latest LDAS, activity, eating-window, challenge, logging consistency.
- Projection update idempotent, có rebuild strategy.
- Event replay không được double count.

## API/UI

- List/start/current/history challenge.
- Complete/uncomplete day.
- Dashboard summary + trend series.
- 14-day timeline, current-day card, progress/streak.
- Dashboard cards/trend có loading, empty, stale/update state.

## Testing bắt buộc

- Duplicate challenge start.
- 14/14 completion.
- Timezone/streak boundary.
- Ownership.
- Projection idempotency.
- Event replay.
- Empty/new user.
- Date-range aggregation.

## Deliverables

- Schema/migration.
- Challenge service/API/UI.
- Projection service + dashboard API/UI.
- Unit/integration tests.

## Definition of Done

User có thể chạy challenge 14 ngày và xem dashboard từ dữ liệu persist thật; reload/event replay không làm sai streak hoặc aggregate.
