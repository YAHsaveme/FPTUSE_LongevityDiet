# Task 1 - Activity Tracking & Personal Goal Progress

**Owner:** Thành viên 1  
**Reviewer:** Thành viên 3  
**Branch:** `feature/w2-t1-activity-tracking`

## Mục tiêu
Tạo activity vertical slice hoàn chỉnh để hệ thống theo dõi vận động mà không biến dữ liệu wellness thành chẩn đoán y khoa.

## Domain & Data
Tạo:
- ActivityLog;
- ActivityType;
- ActivityGoal hoặc UserActivityTarget;
- ActivityDailySummary.

ActivityLog cần:
- UserId;
- occurred date/time;
- duration;
- activity type;
- optional distance/steps/intensity;
- source/manual flag;
- created/updated timestamps.

## Business rules
- Ownership theo UserId.
- Duration phải hợp lệ và có upper bound hợp lý để chặn input lỗi.
- Không suy diễn calories/medical outcome nếu không có nguồn và contract rõ.
- Daily summary dùng timezone của UserProfile.
- Edit/delete activity phải trigger recalculation projection.

## Repository & Service
- CRUD repository.
- Date-range query.
- Daily/weekly aggregation.
- Goal comparison.
- Idempotent recalculation service.

## REST API
- POST activity.
- GET activity list theo date range.
- GET activity detail.
- PUT activity.
- DELETE activity.
- GET daily/weekly activity summary.
- GET/PUT personal activity goal.

## Frontend
- Activity log form.
- Activity history.
- Weekly progress card.
- Goal editor.
- Edit/delete confirmation.
- Empty/loading/error states.

## Testing
- Ownership.
- Invalid duration.
- Timezone date boundary.
- Daily/weekly aggregation.
- Edit/delete recalculation.
- Goal progress percentage bounds.
- Unauthorized access.

## Deliverables
- Migration.
- CRUD + aggregation services/API.
- Activity UI.
- Unit/integration tests.
- Swagger examples.

## Definition of Done
User có thể log/edit/delete activity và thấy daily/weekly progress đúng theo timezone, với dữ liệu persist trong SQL và không phụ thuộc mock.
