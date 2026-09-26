# Task 3 - 14-Day Challenge, Streak & Completion

**Owner:** Thành viên 3  
**Reviewer:** Thành viên 1  
**Branch:** `feature/w2-t3-challenge`

## Mục tiêu
Tạo habit challenge 14 ngày nguyên bản của project để biến principles thành hành vi nhỏ, có thể theo dõi và hoàn thành.

## Domain & Data
Tạo:
- ChallengeTemplate;
- ChallengeDayTemplate;
- UserChallenge;
- UserChallengeDay;
- ChallengeCompletionEvent.

## Business rules
- Template content là original project content, không copy sample meal plan có bản quyền.
- User chỉ có một active instance của cùng challenge nếu product rule yêu cầu.
- Day completion idempotent.
- Streak dựa trên local date/timezone.
- Missed day policy phải rõ: không backfill tự động nếu không có user action.
- Challenge progress không thay đổi LDAS trực tiếp ngoài rule đã cấu hình.

## Service/API
- List challenge templates.
- Start challenge.
- Get active challenge.
- Complete/uncomplete day.
- Get history.
- Calculate streak/progress.
- Admin template publish/deactivate nếu cần.

## Frontend
- Challenge overview.
- 14-day timeline.
- Current-day card.
- Complete action.
- Streak/progress.
- Completed-state summary.

## Testing
- Start duplicate.
- Completion idempotency.
- Timezone day boundary.
- Streak break/continue.
- 14/14 completion.
- Deactivated template behavior.
- Ownership.

## Deliverables
- Schema + migration.
- Challenge service/API.
- Challenge UI.
- Unit/integration tests.

## Definition of Done
User start/complete challenge 14 ngày, progress/streak persist chính xác và flow vẫn đúng qua reload/timezone boundaries.
