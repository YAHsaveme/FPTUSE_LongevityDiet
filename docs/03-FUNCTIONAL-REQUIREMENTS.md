# 03 — Functional Requirements

## A. Identity & Profile
- FR-001 Register with email/password; enforce uniqueness and password policy.
- FR-002 Login returns JWT access token + refresh token.
- FR-003 Refresh access token and revoke session.
- FR-004 Role authorization: Member/Admin.
- FR-005 Read/update own profile.
- FR-006 Profile stores age band/date of birth as policy permits, height/weight, dietary preference, allergies, exclusions, activity, meal and sleep schedule.
- FR-007 BMI may be calculated as an informational metric; no diagnosis.
- FR-008 User can opt in/out of reminders.
- FR-009 Authentication endpoints are rate-limited.

## B. Catalog & Rules
- FR-010 Admin CRUD foods.
- FR-011 Food fields: name, category, serving unit, energy/macros, optional micronutrients, tags, isActive.
- FR-012 Admin CRUD recipes and ingredients.
- FR-013 Member can search/filter/sort/paginate food and recipe collections.
- FR-014 Diet rules are versioned with source URL, source type, evidence level and safety class.
- FR-015 Admin can publish/deactivate rule versions without deleting history.
- FR-016 Rule resolver returns only rules applicable to user/profile context.
- FR-017 Catalog records support soft delete where referenced by historical logs.

## C. Planning
- FR-020 Generate a 7-day or 14-day meal plan from active rules and user constraints.
- FR-021 Plan generation applies hard constraints before scoring candidates.
- FR-022 User can request a replacement meal.
- FR-023 Replacement uses gRPC Recommendation Service.
- FR-024 Plan stores rule-set version and generation timestamp.
- FR-025 User can regenerate future days while preserving previous plan revision.
- FR-026 Planner never generates medical treatment/FMD protocol.

## D. Food & Eating-window Tracking
- FR-030 Log meal/food with timestamp and serving amount.
- FR-031 Edit/soft-delete own meal logs.
- FR-032 Auto-calculate first/last caloric intake per day.
- FR-033 Calculate eating-window duration.
- FR-034 Compare last meal with configured sleep time and create a late-eating flag.
- FR-035 Dashboard shows meal-log consistency and food-pattern signals.
- FR-036 Food log endpoint accepts search-assisted food selection and custom text notes.

## E. Exercise
- FR-040 Log walking, moderate, vigorous and strength activity.
- FR-041 Activity contains date/time, minutes, type and optional note.
- FR-042 Weekly progress aggregates active minutes and strength sessions.
- FR-043 Targets are configurable; the system does not force unsafe activity.
- FR-044 ActivityLogged event is published asynchronously.

## F. LDAS & Progress
- FR-050 Calculate daily and weekly Longevity Diet Adherence Score (LDAS).
- FR-051 Return score breakdown by dimension.
- FR-052 Return triggered positive/negative rules and missing-data list.
- FR-053 Persist score snapshot with RuleSetVersion.
- FR-054 Dashboard displays score trend, activity, eating-window and logging trend.
- FR-055 Weekly summary is generated asynchronously.
- FR-056 Score endpoint always includes `isClinical=false` and disclaimer metadata.

## G. Recommendation / gRPC
- FR-060 REST API invokes independent gRPC Recommendation Service.
- FR-061 Request contains user constraints + candidate recipe features, not credentials.
- FR-062 Service first removes allergens/exclusions.
- FR-063 Service then calculates weighted ranking.
- FR-064 Response contains RecipeId, score, reason codes and score components.
- FR-065 API enriches IDs into human-readable DTOs.
- FR-066 Optional local-AI rewrite may explain existing reasons only.
- FR-067 User can submit recommendation feedback.

## H. Challenge
- FR-070 User can start the original 14-day adherence challenge.
- FR-071 Only one active challenge of the same type per user.
- FR-072 Each day has one or more completion criteria.
- FR-073 Completion may derive from logs or explicit confirmation.
- FR-074 Challenge stores streak and completion percentage.
- FR-075 Challenge content links to source/rule explanations where relevant.

## I. Background / Message Broker
- FR-080 API persists domain events as Outbox records in the same SQL transaction as business state; Worker publishes pending Outbox events to Redis Streams.
- FR-081 Worker uses consumer group and idempotency record.
- FR-082 Events: UserProfileUpdated, MealLogged, ActivityLogged, PlanGenerated, ReminderDue, ScoreRecalculationRequested.
- FR-083 Worker schedules/processes reminder notifications.
- FR-084 Worker produces weekly report.
- FR-085 Failed events retry with capped attempts.
- FR-086 Exhausted events move to dead-letter stream.
- FR-087 Admin can inspect event/job status.
- FR-088 Consumer handles duplicate EventId safely.

## J. FMD safety module
- FR-090 FMD is presented separately from normal meal planning.
- FR-091 User completes safety questionnaire/acknowledgement before FMD tracking.
- FR-092 High-risk answers return `ProfessionalReviewRequired`.
- FR-093 MVP stores cycle dates/status/notes only.
- FR-094 No disease-treatment protocol generation.
- FR-095 FMD screens carry safety disclaimer.
- FR-096 Admin can manage FMD education resources/source links.

## K. Admin & Audit
- FR-100 Admin dashboard shows counts for active users/catalog/rules/events/jobs.
- FR-101 Admin changes create AuditLog.
- FR-102 Audit contains actor, action, entity, entityId, UTC timestamp and safe diff metadata.
- FR-103 Admin endpoints require Admin role.
- FR-104 Audit logs are read-only through public application services.

## Collection endpoint standard
Every appropriate collection supports:
`page`, `pageSize`, `search`, documented filters and allow-listed `sortBy/sortDirection`.
Response returns `items`, `page`, `pageSize`, `totalItems`, `totalPages`.

## Error contract
Use RFC 7807 ProblemDetails with:
`type`, `title`, `status`, `detail`, `instance`, `traceId`, optional validation errors.
