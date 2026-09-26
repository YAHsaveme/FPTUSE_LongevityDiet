# Task 2 - Meal Replacement, Preference & Feedback Loop

**Owner:** Thành viên 2  
**Reviewer:** Thành viên 4  
**Branch:** `feature/w3-t2-replacement-feedback`

## Mục tiêu
Cho phép user thay món hoặc phản hồi recommendation mà không phá meal-plan consistency và safety constraints.

## Domain & Data
Tạo hoặc hoàn thiện:
- RecommendationFeedback;
- MealReplacementHistory;
- UserFoodPreference;
- optional preference strength/value.

Feedback type ví dụ:
- Like;
- Dislike;
- NotRelevant;
- TooRepetitive;
- PreferLater;
- PreferEarlier.

## Replacement flow
1. Load current plan context.
2. Preserve meal slot/date requirements.
3. Reapply hard constraints.
4. Exclude current candidate nếu user yêu cầu.
5. Rank alternatives.
6. Save replacement history.
7. Update plan atomically.

## Business rules
- Feedback không trực tiếp chỉnh weight production nếu chưa qua policy.
- Không học từ một feedback đơn lẻ thành hard exclusion.
- Explicit exclusion khác với dislike.
- Replacement history phải audit được.
- User A không tác động preference User B.

## API
- POST recommendation feedback.
- POST planned meal replacement.
- GET replacement history.
- GET/PUT explicit food preferences/exclusions.

## Frontend
- Replace action.
- Alternative list.
- Like/dislike/not relevant.
- Preference settings.
- Explanation trước khi confirm replace.
- Undo chỉ khi state còn hợp lệ.

## Testing
- replacement preserves constraints;
- explicit exclusion;
- dislike vs exclusion;
- repeated replacement;
- concurrency/version conflict;
- ownership;
- feedback persistence.

## Definition of Done
User thay món và gửi feedback qua UI; plan cập nhật an toàn, có history và recommendation tiếp theo đọc đúng preference contract.
