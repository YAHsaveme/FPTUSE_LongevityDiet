# Task 1 - Activity Tracking + LDAS Scoring End-to-End

**Owner:** Thành viên 1
**Reviewer:** Thành viên 3
**Branch:** `feature/w2-t1-activity-ldas`
**Status:** Planned

## Mục tiêu

Tạo vertical slice từ activity data đến **Longevity Diet Adherence Score (LDAS)** để user có thể theo dõi hành vi và nhận score giải thích được, không biến score thành clinical claim.

## Phạm vi chính

- Domain/data: ActivityLog, ActivityType/UserActivityTarget, AdherenceScore, ScoreConfigurationVersion, ScoreCalculationSnapshot.
- Activity CRUD + date-range query + daily/weekly aggregation.
- Goal progress theo timezone của UserProfile.
- LDAS 0-100, deterministic, versioned, có dimension breakdown.
- Input LDAS lấy từ MealLog/EatingWindow/Activity và các rule đã publish.
- Missing data có policy rõ; không mặc định missing = bad.
- Không dùng LDAS để dự đoán tuổi thọ, biological age hoặc chẩn đoán.

## API/UI

- Activity create/list/update/delete + summary + goal.
- Calculate/get latest/history/breakdown LDAS.
- Activity form/history/weekly progress.
- LDAS card, breakdown, missing-data state và non-clinical disclaimer.

## Testing bắt buộc

- Ownership/authorization.
- Invalid duration/input bounds.
- Timezone date boundary.
- Edit/delete recalculation.
- Score 0/100 boundaries.
- Same input + same version -> same result.
- Missing-data policy.
- Score version immutability sau publish.

## Deliverables

- Migration + repository/service.
- Activity + LDAS APIs.
- Activity/score UI.
- Unit/integration tests.
- Swagger evidence.

## Definition of Done

User log activity thật, xem progress theo timezone và nhận LDAS từ dữ liệu thật với breakdown/version/disclaimer; build/test pass và không phụ thuộc mock.
