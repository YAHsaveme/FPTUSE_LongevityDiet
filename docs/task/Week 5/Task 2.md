# Task 2 - FMD Cycle Tracking & Safety-State Enforcement

**Owner:** Thành viên 2  
**Reviewer:** Thành viên 4  
**Branch:** `feature/w5-t2-fmd-cycle-tracking`

## Mục tiêu
Cho phép user đủ điều kiện theo safety gate theo dõi một cycle như nhật ký, không tạo protocol điều trị.

## Domain & Data
Tạo:
- FmdCycle;
- FmdCycleDay;
- FmdCycleStatus;
- FmdStopReason;
- safety-assessment reference/version.

## Business rules
- Chỉ EligibleForTracking mới start được cycle.
- Cycle luôn reference assessment/version đã dùng.
- Không generate meal/menu therapeutic protocol.
- User có thể stop cycle bất kỳ lúc nào.
- Safety warning/stop state có priority cao.
- Không cho backdate tùy tiện làm sai audit trail.
- Completed cycle immutable ở core fields; correction qua controlled path.

## API
- Start tracking cycle.
- Get active cycle.
- Update daily tracking fields cho phép.
- Stop cycle.
- Complete cycle.
- List history.

## Frontend
- Cycle tracker.
- Day status.
- Safety reminder.
- Stop action prominent.
- History.
- Professional review banner nếu state thay đổi.

## Testing
- start without eligibility;
- eligibility revoked;
- duplicate active cycle;
- stop/complete;
- ownership;
- invalid transition;
- history immutability.

## Definition of Done
User đủ điều kiện có thể track cycle state/history mà hệ thống không tạo fasting prescription hoặc therapeutic menu.
