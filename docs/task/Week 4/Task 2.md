# Task 2 - Notification Center & Event-Driven Delivery

**Owner:** Thành viên 2  
**Reviewer:** Thành viên 4  
**Branch:** `feature/w4-t2-notifications`

## Mục tiêu
Tạo notification center trong app, nhận event từ worker/business flow và persist trạng thái đọc/chưa đọc.

## Domain & Data
Tạo:
- Notification;
- NotificationType;
- optional NotificationPreference mapping.

Fields:
- UserId;
- title/body/template key;
- createdAt;
- readAt;
- source event id;
- action target;
- priority nếu cần.

## Event flow
- NotificationRequested event.
- Consumer tạo Notification idempotently.
- SourceEventId unique hoặc dedupe key.
- Không nhét presentation-specific HTML tùy tiện vào event.

## API
- List notifications có pagination.
- Unread count.
- Mark one read.
- Mark all read.
- Optional delete/archive nếu business cần.

## Frontend
- Bell unread badge.
- Notification panel/page.
- Mark read.
- Action deep-link.
- Empty/loading/error states.

## Testing
- duplicate source event;
- unread count;
- pagination;
- ownership;
- read transition;
- invalid deep-link payload;
- event replay.

## Definition of Done
Business event tạo notification đúng một lần và user quản lý read state qua UI thật.
