# Week 3 - Recommendation & Planning Intelligence

## Mục tiêu tuần
Nâng recommendation/planning từ thin slice Week 1 thành một hệ thống có chất lượng, explainability, feedback loop và replacement workflow rõ ràng.

## Phân công
| Task | Owner | Reviewer |
|---|---|---|
| Task 1 - Recommendation Ranking v2 & Explainability | Thành viên 1 | Thành viên 3 |
| Task 2 - Meal Replacement, Preference & Feedback Loop | Thành viên 2 | Thành viên 4 |
| Task 3 - Plan Quality Evaluation & Constraint Scenario Engine | Thành viên 3 | Thành viên 1 |
| Task 4 - Explanation Adapter, Feedback Intelligence & Recommendation UX | Thành viên 4 | Thành viên 2 |

## Dependency
- Week 1 catalog/rule/planner/gRPC phải hoạt động.
- Week 2 profile/activity/LDAS data có thể dùng làm soft signal nếu contract đã ổn định.
- Hard constraints luôn có priority cao hơn preference/feedback.

## Exit criteria
- Ranking v2 deterministic và explainable.
- Replace-meal flow không phá constraint.
- Có evaluation harness cho plan quality.
- Optional local-AI explanation có fallback deterministic.
- Recommendation UI không phụ thuộc text do AI tự quyết định.
