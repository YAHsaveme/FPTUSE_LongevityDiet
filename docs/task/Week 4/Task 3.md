# Task 3 - Weekly Report Generation & Summary Persistence

**Owner:** Thành viên 3  
**Reviewer:** Thành viên 1  
**Branch:** `feature/w4-t3-weekly-report`

## Mục tiêu
Tạo weekly wellness summary phục vụ user review mà không tính toàn bộ dữ liệu raw mỗi lần mở trang.

## Domain & Data
Tạo:
- WeeklyReport;
- WeeklyReportMetric;
- generation version/status.

Report input:
- activity summary;
- LDAS trend;
- eating-window summary;
- challenge progress;
- logging consistency.

## Generation
- Worker scheduled theo local week boundary.
- Idempotent key: User + Week + ReportVersion.
- Snapshot metrics tại thời điểm generation.
- Có rebuild/regenerate controlled path.
- Không tạo diagnosis hoặc medical conclusion.

## API/UI
- List report history.
- Get report detail.
- Current week status.
- Weekly report page/cards.
- Explain metric source/window.

## Optional export
Chỉ nếu cần business/demo:
- lightweight printable view hoặc export artifact.
- Không để export logic làm blocker core report.

## Testing
- week boundary/timezone;
- duplicate job;
- empty/new user;
- historical immutability;
- regeneration version;
- metric consistency.

## Definition of Done
Worker tạo weekly report đúng một lần mỗi version/week và user đọc được report persist qua UI.
