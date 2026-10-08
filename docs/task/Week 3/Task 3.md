# Task 3 - FMD Education, Safety Gate & Cycle Tracking

**Owner:** Thành viên 3
**Reviewer:** Thành viên 1
**Branch:** `feature/w3-t3-fmd-safety-tracking`
**Status:** Planned

## Mục tiêu

Implement FMD trong phạm vi **education + safety assessment + tracking**, không tạo therapeutic protocol và không biến ứng dụng thành medical device.

## Safety workflow

State tối thiểu:
1. EducationNotViewed
2. EducationViewed
3. AssessmentRequired
4. AssessmentSubmitted
5. EligibleForTracking
6. ProfessionalReviewRequired

Backend phải enforce transition; UI không phải security boundary.

## Phạm vi chính

- FmdEducationAcknowledgement.
- FmdSafetyAssessment/FmdSafetyAnswer/FmdEligibilityResult.
- FmdCycle/FmdCycleDay/FmdCycleStatus.
- Assessment/version/source metadata.
- High-risk flag route sang professional review.
- Chỉ EligibleForTracking mới start cycle.
- User có thể stop cycle bất kỳ lúc nào.
- Không generate fasting prescription hoặc therapeutic menu.

## API/UI

- Education metadata + acknowledgement.
- Assessment submit/current state.
- Eligibility/tracking state.
- Start/get/update/stop/complete cycle + history.
- Education, questionnaire, result, cycle tracker, warning/stop UI.

## Testing bắt buộc

- Blocking/high-risk flags.
- Invalid state transition/direct API bypass.
- Start without eligibility.
- Eligibility revoked.
- Duplicate active cycle.
- Stop/complete/history immutability.
- Ownership.

## Definition of Done

High-risk user bị backend chặn khỏi self-directed cycle; eligible user chỉ được track cycle state/history và toàn bộ wording giữ đúng wellness/education scope.
