# Task 1 - Reminder Preferences & Scheduling Engine

**Owner:** Thành viên 1  
**Reviewer:** Thành viên 3  
**Branch:** `feature/w4-t1-reminders`

## Mục tiêu
Tạo reminder system theo timezone và user preference, chạy bằng BackgroundService/Worker thay vì polling từ frontend.

## Domain & Data
Tạo:
- ReminderPreference;
- ReminderSchedule;
- ReminderDispatchRecord.

Reminder categories có thể gồm:
- meal logging;
- activity;
- challenge;
- weekly summary.

## Business rules
- User opt-in/opt-out từng reminder type.
- Timezone-aware.
- Quiet hours.
- Không gửi duplicate cùng reminder window.
- Disabled account không dispatch.
- Schedule recalculated khi timezone/preference thay đổi.

## Worker
- Scheduled scan với bounded batch.
- Idempotency key.
- Emit NotificationRequested event.
- Retry transient failure.
- Không block worker loop bằng unbounded task.

## API/UI
- GET/PUT reminder preferences.
- UI setting.
- Preview next scheduled reminder.
- Enable/disable controls.

## Testing
- timezone DST/offset cases;
- quiet hours;
- duplicate prevention;
- disabled reminder;
- preference change;
- scheduler restart;
- concurrent workers.

## Definition of Done
Reminder được schedule đúng theo user setting và restart/retry không tạo duplicate dispatch.
