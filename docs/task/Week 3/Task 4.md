# Task 4 - Explanation Adapter, Feedback Intelligence & Recommendation UX

**Owner:** Thành viên 4  
**Reviewer:** Thành viên 2  
**Branch:** `feature/w3-t4-explanation-ux`

## Mục tiêu
Tạo lớp giải thích thân thiện và recommendation UX hoàn chỉnh mà không giao quyền quyết định cho generative AI.

## Deterministic explanation
- Map reason code -> localized explanation template.
- Luôn có deterministic fallback.
- Không phụ thuộc AI để render recommendation.

## Optional local AI adapter
Nếu dùng:
- chạy local/free model;
- input chỉ gồm structured reason data cần thiết;
- không gửi secret/raw health-sensitive content không cần thiết;
- output chỉ rewrite cách diễn đạt;
- validate length/tone;
- timeout + fallback template;
- không được thêm claim mới;
- không được thay đổi rank/score/constraint.

## Feedback intelligence
- Aggregate feedback statistics.
- Không tự động sửa production weight.
- Cung cấp signal cho admin/team review.
- Detect excessive repetition/dislike trend.

## Frontend UX
- Recommendation list/card.
- Reason panel.
- Replace flow.
- Feedback actions.
- Loading/error/service-unavailable states.
- Clearly distinguish recommendation from medical advice.

## Testing
- fallback khi AI unavailable;
- output validation;
- reason code coverage;
- no rank mutation;
- timeout behavior;
- feedback aggregation;
- accessibility keyboard/focus.

## Definition of Done
Recommendation UX hoạt động ngay cả khi optional AI tắt; mọi quyết định vẫn đến từ deterministic engine.
