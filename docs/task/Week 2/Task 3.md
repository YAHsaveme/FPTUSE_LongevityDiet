# Task 3 - Recommendation v2 + Replacement + Feedback

**Owner:** Thành viên 3
**Reviewer:** Thành viên 1
**Branch:** `feature/w2-t3-recommendation-v2`
**Status:** Planned

## Mục tiêu

Nâng gRPC recommendation từ thin slice Week 1 thành engine deterministic, explainable và hỗ trợ replace/feedback mà không phá safety constraints.

## Ranking pipeline

1. Validate request.
2. Apply hard constraints: allergen, exclusion, inactive data, unsupported/safety state.
3. Normalize candidate features.
4. Apply versioned soft weights.
5. Calculate score components.
6. Stable sort/tie-break.
7. Return accepted/rejected candidates + reason codes.

## Replacement & feedback

- RecommendationFeedback, MealReplacementHistory, UserFoodPreference/Exclusion.
- Replace meal phải reapply hard constraints và update plan atomically.
- Dislike khác explicit exclusion.
- Feedback không tự sửa production weight.
- History phải audit được.

## API/UI

- Recommendation DTO sạch từ gRPC response.
- POST feedback.
- POST planned-meal replacement.
- Preference/exclusion settings.
- “Vì sao gợi ý này?” từ deterministic reason code.
- AI nếu có chỉ rewrite explanation; timeout phải fallback, không được đổi rank/score.

## Testing bắt buộc

- Hard constraint precedence.
- Stable tie-break/reproducibility.
- Replace preserves constraints.
- Dislike vs exclusion.
- Ownership/concurrency conflict.
- AI unavailable fallback.
- No rank mutation by explanation layer.

## Definition of Done

User nhận recommendation có lý do, thay món và gửi feedback qua UI; kết quả deterministic, an toàn và audit được.
