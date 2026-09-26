# Task 1 - FMD Education & Safety Assessment Workflow

**Owner:** Thành viên 1  
**Reviewer:** Thành viên 3  
**Branch:** `feature/w5-t1-fmd-safety`

## Mục tiêu
Implement safety-first FMD workflow chỉ phục vụ education/tracking, không biến ứng dụng thành medical device.

## State machine
Tối thiểu:
1. EducationNotViewed
2. EducationViewed
3. AssessmentRequired
4. AssessmentSubmitted
5. EligibleForTracking
6. ProfessionalReviewRequired

Transition phải được backend enforce, không chỉ ẩn nút ở UI.

## Assessment
Các nhóm risk flag theo product safety design:
- serious illness;
- diabetes/medication-related concern;
- pregnancy/breastfeeding;
- eating-disorder risk;
- underweight/frailty;
- minors;
- serious disease;
- elderly/muscle-loss concern.

Không tự kết luận chẩn đoán; chỉ route sang professional review khi flag được trigger.

## Domain & Data
Tạo:
- FmdEducationAcknowledgement;
- FmdSafetyAssessment;
- FmdSafetyAnswer;
- FmdEligibilityResult;
- assessment version/source metadata.

## API
- GET education metadata.
- POST acknowledgement.
- GET current assessment state.
- POST assessment.
- GET eligibility/tracking state.

## Frontend
- Education screen.
- Explicit acknowledgement.
- Safety questionnaire.
- Result screen.
- Professional-review state rõ ràng.
- Không có CTA gây hiểu nhầm "tự bắt đầu điều trị".

## Testing
- every blocking flag;
- incomplete assessment;
- invalid state transition;
- re-assessment version;
- ownership;
- direct API bypass attempt;
- minor/high-risk state.

## Definition of Done
High-risk user bị backend chặn khỏi self-directed tracking flow; toàn bộ state transition có test và UI wording phù hợp wellness/education scope.
