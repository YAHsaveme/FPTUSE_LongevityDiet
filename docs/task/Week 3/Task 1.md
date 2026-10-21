# Task 1 - Reminder Scheduling + Notification Center

**Owner:** Thành viên 1
**Reviewer:** Thành viên 3
**Branch:** `feature/w3-t1-reminder-notification`
**Status:** Planned

## Architecture alignment (ADR-005)

- **Target owners:** Identity & Profile Service owns reminder preferences/notification inbox state in `LongevityIdentityDb`; Background Worker owns execution/idempotency in `LongevityWorkerDb`.
- **Async flow:** Identity event -> Event Streams -> Worker dispatch -> result event -> Identity persists user-visible notification state.
- **Guardrail:** Worker must not write IdentityDb directly.


## Mục tiêu

Tạo reminder/notification flow chạy bằng Worker, theo timezone và user preference, không phụ thuộc frontend polling.

## Phạm vi chính

- `ReminderPreference` và user-visible `Notification`/unread-read state thuộc Identity & Profile Service / `LongevityIdentityDb`.
- `ReminderSchedule`, `ReminderDispatchRecord`, retry/idempotency execution state thuộc Background Worker / `LongevityWorkerDb`.
- Reminder type: meal logging, activity, challenge, weekly summary.
- Opt-in/opt-out, quiet hours, timezone-aware schedule.
- Disabled account không dispatch.
- Idempotency key để tránh gửi duplicate cùng reminder window.
- Identity publish scheduling/preference event -> Worker xử lý -> Worker publish `NotificationReady`/result event -> Identity consumer persist Notification đúng một lần.
- Worker không query hoặc write `LongevityIdentityDb` trực tiếp.

## API/UI

- GET/PUT reminder preferences.
- Preview next scheduled reminder.
- Notification list + pagination.
- Unread count.
- Mark one/all read.
- Bell badge + notification panel/page + deep-link hợp lệ.

## Testing bắt buộc

- Timezone/offset boundary.
- Quiet hours.
- Duplicate prevention.
- Disabled reminder/account.
- Worker restart/concurrent workers.
- Duplicate source event.
- Notification ownership/read transition.

## Definition of Done

Reminder được schedule đúng theo preference và tạo notification đúng một lần; restart/retry không tạo duplicate và user quản lý read state qua UI thật.
