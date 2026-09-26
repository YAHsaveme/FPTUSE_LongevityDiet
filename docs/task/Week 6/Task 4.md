# Task 4 - Performance, Load Testing & Database Optimization

**Owner:** Thành viên 4  
**Reviewer:** Thành viên 2  
**Branch:** `feature/w6-t4-performance`

## Mục tiêu
Thiết lập performance baseline có số đo và sửa bottleneck thật trước release.

## Baseline scenarios
- login/profile read;
- catalog paginated query;
- plan load;
- dashboard load;
- recommendation call;
- event processing throughput.

## Database
- Inspect generated SQL.
- Find N+1/over-fetching.
- Add index theo query evidence.
- Projection query tối ưu.
- Pagination bounded.
- Avoid loading full history khi chỉ cần summary.

## API/gRPC
- Measure p50/p95/p99 ở sample load.
- Response payload size.
- Cancellation.
- Avoid synchronous blocking.
- Configure connection reuse/client factory đúng.

## Frontend
- bundle size;
- route/code splitting nếu cần;
- query caching;
- avoid duplicate API calls;
- render performance cho list/dashboard.

## Load test
- Reproducible script/config.
- Không chỉ chạy một lần thủ công.
- Capture baseline before/after.
- Define acceptable threshold cho course demo, không giả production SLA vô căn cứ.

## Testing
- correctness under concurrent read/write;
- rate limit interaction;
- DB connection pressure;
- worker throughput;
- memory/resource observation.

## Definition of Done
Có baseline document/test script và ít nhất các bottleneck được xác nhận bằng measurement đã được fix hoặc ghi rõ accepted trade-off.
