# Task 2 - LDAS Scoring Engine & Versioned Calculation

**Owner:** Thành viên 2  
**Reviewer:** Thành viên 4  
**Branch:** `feature/w2-t2-ldas-engine`

## Mục tiêu
Implement **Longevity Diet Adherence Score (LDAS)** như một project-defined adherence heuristic, không phải clinical score, biological age hay lifespan prediction.

## Domain & Data
Tạo:
- AdherenceScore;
- ScoreDimension;
- ScoreRuleVersion hoặc ScoreConfigurationVersion;
- ScoreCalculationSnapshot.

Snapshot phải lưu:
- UserId;
- score 0-100;
- dimension scores;
- calculation timestamp;
- source data window;
- score version;
- missing-data flags.

## Calculation
Baseline dimensions:
- food-pattern quality;
- vegetable/whole-grain/legume consistency;
- refined sugar/saturated-fat avoidance;
- eating-window adherence;
- activity adherence;
- logging/challenge consistency;
- personalized-rule adherence.

Weights phải configuration/version driven, không hardcode rải rác.

## Rules
- Tổng score clamp 0-100.
- Missing data phải có policy rõ; không mặc định coi missing = bad.
- Score version immutable sau khi publish.
- Recalculation cùng input/version phải deterministic.
- UI/API bắt buộc disclaimer non-clinical.

## Service/API
- Calculate current score.
- Get latest score.
- Get history/trend.
- Get dimension breakdown.
- Admin get/publish score configuration version.

## Frontend
- Score card.
- Breakdown chart/list.
- Explanation cho từng dimension.
- Missing-data indicator.
- Non-clinical disclaimer.

## Testing
- Weight total validation.
- Boundary 0/100.
- Missing-data cases.
- Version reproducibility.
- Same input -> same output.
- Score history.
- Disclaimer/API contract.

## Deliverables
- Versioned scoring engine.
- Schema + migration.
- API/UI.
- Tests + sample deterministic fixtures.

## Definition of Done
LDAS được tính từ dữ liệu thật, có breakdown/version/explanation, reproducible và không có text nào tuyên bố score là tuổi sinh học hoặc dự đoán tuổi thọ.
