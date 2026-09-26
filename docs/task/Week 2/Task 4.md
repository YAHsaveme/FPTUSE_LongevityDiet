# Task 4 - Progress Dashboard, Trend Aggregation & Insight Projection

**Owner:** Thành viên 4  
**Reviewer:** Thành viên 2  
**Branch:** `feature/w2-t4-progress-dashboard`

## Mục tiêu
Tạo dashboard đọc dữ liệu aggregate thật thay vì tính lại toàn bộ raw data mỗi lần render.

## Data Projection
Tạo projection/summary phù hợp:
- DailyWellnessSummary;
- WeeklyProgressSummary;
- latest LDAS;
- activity totals;
- eating-window adherence;
- challenge progress;
- logging consistency.

Projection update phải idempotent và có rebuild strategy.

## Backend
- Aggregation service.
- Date-range trend query.
- Current dashboard query.
- Projection rebuild command/service cho troubleshooting.
- Không để Controller chứa aggregation logic.

## Event integration
Khi MealLog/Activity/Challenge thay đổi:
- emit/reuse domain/business event;
- Worker có thể recalc projection async;
- eventual-consistency UX phải rõ.

## API
- GET dashboard summary.
- GET trend series theo supported range.
- GET insight inputs/explanations.

## Frontend
Thay static dashboard values bằng:
- latest score;
- activity;
- eating window;
- challenge;
- recent trends.

Phải có:
- skeleton/loading;
- empty state;
- stale/update indicator nếu async projection chưa xong;
- responsive cards.

## Testing
- Projection idempotency.
- Event replay không double count.
- Date-range aggregation.
- Empty/new user.
- Eventual consistency.
- Query performance baseline.

## Deliverables
- Projection schema/service.
- Dashboard/trend APIs.
- Dashboard UI dùng data thật.
- Tests + query timing evidence.

## Definition of Done
Dashboard không còn hardcoded business metrics; cùng dữ liệu nguồn tạo cùng projection và event replay không làm sai tổng.
