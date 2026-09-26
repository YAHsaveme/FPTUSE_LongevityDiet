# Task 3 - Plan Quality Evaluation & Constraint Scenario Engine

**Owner:** Thành viên 3  
**Reviewer:** Thành viên 1  
**Branch:** `feature/w3-t3-plan-quality`

## Mục tiêu
Tạo evaluation harness để team đo chất lượng planner/recommendation bằng test scenario thay vì đánh giá cảm tính.

## Scenario model
Tạo test/evaluation scenario có:
- synthetic profile;
- allergens/exclusions;
- preferences;
- active RuleSetVersion;
- candidate catalog;
- expected hard constraints;
- expected quality assertions.

## Quality dimensions
- no hard-constraint violation;
- meal diversity;
- repeated-recipe limit;
- rule coverage;
- preference fit;
- feasible meal frequency;
- deterministic reproducibility.

## Engine
- Evaluate one plan.
- Evaluate batch scenarios.
- Produce structured result.
- Fail clearly khi safety invariant bị vi phạm.
- Không biến quality score thành clinical claim.

## Admin/Developer tooling
Có thể expose development/admin endpoint hoặc command:
- run scenario set;
- inspect failed assertions;
- compare policy versions.

Không expose sensitive internal tooling cho Member role.

## Testing
- golden scenarios;
- regression scenario suite;
- edge case zero candidates;
- conflicting constraints;
- small catalog;
- policy-version comparison.

## Deliverables
- Scenario schema/fixtures.
- Evaluation engine.
- Regression suite.
- Developer/admin result view hoặc report endpoint.
- Baseline quality thresholds.

## Definition of Done
Mỗi thay đổi ranking/planner có thể chạy scenario regression và phát hiện constraint regression trước khi merge.
