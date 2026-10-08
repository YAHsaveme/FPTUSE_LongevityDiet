# 02 — Business Requirements

## Business objectives
- BR-01: Translate book principles into actionable daily workflows.
- BR-02: Give explainable feedback rather than opaque “AI advice”.
- BR-03: Make safety-sensitive fasting content gated and auditable.
- BR-04: Demonstrate every mandatory PRN232 distributed-system capability.
- BR-05: Keep MVP feasible for 4 Full-Stack members in 4 weeks.
- BR-06: Preserve source provenance and rule-version history.
- BR-07: Allow future localization to Vietnamese foods without changing core architecture.

## Core business flow
1. User registers/logs in.
2. Completes onboarding profile, preferences, allergies and safety flags.
3. System resolves applicable rules from the active Rule Catalog.
4. User generates a 7- or 14-day plan.
5. User logs meals and activities.
6. API commits business data and an OutboxMessage in the same SQL transaction.
7. Worker publishes pending Outbox events to Redis Streams, then consumes events for async/scheduled work.
8. API calls gRPC Recommendation Service for ranked substitutes/suggestions.
9. User sees LDAS breakdown and weekly progress.
10. Worker creates weekly reports/reminders.
11. Admin manages catalog/rules and audits changes.

## Business rules
- BRULE-01: Every recommendation must expose at least one reason code/rule.
- BRULE-02: Allergens and explicitly excluded foods are **hard constraints**, never soft ranking preferences.
- BRULE-03: A medical-sensitive rule cannot be silently auto-enabled.
- BRULE-04: FMD tracking requires safety acknowledgement and eligibility gate.
- BRULE-05: LDAS cannot be labelled “medical score”, “biological age” or “life expectancy”.
- BRULE-06: Admin rule changes are versioned and audited.
- BRULE-07: Historical scores retain the rule-set version used at calculation time.
- BRULE-08: Meal plans can be regenerated, but prior versions remain traceable.
- BRULE-09: User logs use soft-delete where auditability matters.
- BRULE-10: Recommendation feedback can adjust future ranking signals but cannot override hard safety constraints.
- BRULE-11: Optional AI-generated explanation may paraphrase reason codes but cannot add unsupported medical claims.
- BRULE-12: If required profile data is missing, the system returns a partial score/recommendation with a missing-data warning.
- BRULE-13: Plan generation excludes allergens before nutritional scoring.
- BRULE-14: Rule activation requires source metadata.
- BRULE-15: Admin cannot retroactively mutate an already-published RuleVersion; publish a new version instead.

## Major use cases
- UC-01 Register/Login/Refresh/Revoke token.
- UC-02 Complete/update profile.
- UC-03 Browse/search/filter/sort/paginate foods and recipes.
- UC-04 Generate meal plan.
- UC-05 View daily plan and substitute meal.
- UC-06 Log food/meal.
- UC-07 Track eating window.
- UC-08 Log exercise.
- UC-09 View LDAS score and breakdown.
- UC-10 Request meal recommendation through REST → gRPC.
- UC-11 Start/complete 14-day challenge.
- UC-12 Configure reminders.
- UC-13 View weekly progress report.
- UC-14 View FMD education and pass safety gate.
- UC-15 Track approved FMD cycle metadata.
- UC-16 Admin CRUD food/recipe/rule catalog.
- UC-17 Admin inspect event/job/dead-letter status.
- UC-18 Admin review audit log.

## Permission matrix
| Capability | Guest | Member | Admin |
|---|---:|---:|---:|
| Public principles | Yes | Yes | Yes |
| Register/login | Yes | Yes | Yes |
| Own profile/logs/plans | No | Yes | Yes (audited support) |
| Recommendations | No | Yes | Yes |
| FMD education | Summary | Yes | Yes |
| Track FMD cycle | No | Safety-gated | Yes |
| Catalog CRUD | No | No | Yes |
| Rule publish/version | No | No | Yes |
| Event/job dashboard | No | No | Yes |
| Audit log | No | No | Yes |

## Business entities
User, RefreshToken, UserProfile, DietaryPreference, Allergy, Food, Nutrient, Recipe, RecipeIngredient, DietRule, RuleVersion, MealPlan, MealPlanDay, PlannedMeal, MealLog, MealLogItem, ActivityLog, EatingWindowSnapshot, AdherenceScore, ScoreDimension, RecommendationFeedback, Challenge, ChallengeDay, Reminder, WeeklyReport, FmdSafetyAssessment, FmdCycle, DomainEvent, ProcessedEvent, AuditLog.

## Business value for final demo
The demo shows one coherent story rather than disconnected technologies:
**User action → REST API → SQL + Outbox → Worker publish → Redis Streams → Worker consume → gRPC recommendation → progress dashboard**.
