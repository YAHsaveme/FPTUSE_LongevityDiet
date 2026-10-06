# 06 — Database Design

## Target service database ownership
This section describes **Target Architecture** ownership only. The current implementation still uses the canonical shared DbContext/database until a later runtime migration.

| Target owner | Logical database | Domain data |
|---|---|---|
| Identity & Profile Service | LongevityIdentityDb | User, RefreshToken, UserProfile, Allergy/UserAllergy, exclusions |
| Catalog & Rules Service | LongevityCatalogDb | Food, Recipe, ingredients/allergens, DietRule/RuleVersion/RuleSetVersion |
| Planning Service | LongevityPlanningDb | MealPlan/Day/PlannedMeal, Challenge/Day, FMD safety/cycle, recommendation feedback request ownership where applicable |
| Tracking & Progress Service | LongevityTrackingDb | MealLog/Item, ActivityLog, EatingWindowSnapshot, AdherenceScore/Dimension, weekly-report read ownership |
| Recommendation Service | LongevityRecommendationDb | recommendation-local catalog/rule snapshots, ranking request/result metadata needed by the service |
| Background Worker | LongevityWorkerDb | worker job state, ProcessedEvent/idempotency, retry/dead-letter operational state |

Rules: no cross-database foreign keys, no service reads another service database, integration references use stable IDs, and copied read models arrive through versioned API/event contracts. Each service owns its own Outbox when it publishes domain events.

## Conventions
- PK: `uniqueidentifier` / Guid unless lookup table needs small integer.
- Timestamps: UTC `datetime2`.
- Soft-delete fields where required: `IsDeleted`, `DeletedAtUtc`.
- Concurrency-sensitive admin records may use `rowversion`.
- All user-owned rows carry `UserId`.
- Use normalized tables for core data; JSON only for bounded metadata/audit snapshots.

## Identity
### User
- Id PK
- Email unique
- PasswordHash
- Role
- IsActive
- CreatedAtUtc
- UpdatedAtUtc

### RefreshToken
- Id PK
- UserId FK
- TokenHash unique
- ExpiresAtUtc
- RevokedAtUtc nullable
- CreatedAtUtc
Index: UserId, ExpiresAtUtc.

## Profile & constraints
### UserProfile
- UserId PK/FK
- DateOfBirth or AgeBand (choose policy during implementation)
- HeightCm
- WeightKg
- WaistCm nullable
- DietaryPattern
- TypicalSleepTime
- TypicalWakeTime
- TimeZoneId
- ReminderOptIn
- UpdatedAtUtc

### Allergy
- Id
- Code unique
- Name
### UserAllergy
- UserId + AllergyId composite PK
- Severity enum optional
- Note optional

### UserExcludedFood
- Id
- UserId
- FoodId nullable
- FreeText nullable
- Reason
Constraint: FoodId or FreeText must be present.

## Food and recipe catalog
### Food
- Id
- Name
- NormalizedName
- Category
- DefaultServingAmount
- ServingUnit
- Calories
- ProteinG
- CarbohydrateG
- FatG
- SaturatedFatG nullable
- SugarG nullable
- FiberG nullable
- IsPlantBased
- IsWholeGrain
- IsLegume
- IsFish
- IsActive
- IsDeleted
Indexes: NormalizedName, Category+IsActive.

### Recipe
- Id
- Name
- Description
- MealType
- InstructionsSummary (team-authored)
- PrepMinutes
- IsPlantForward
- IsActive
- IsDeleted

### RecipeIngredient
- RecipeId + FoodId
- Amount
- Unit
- IsOptional
Index: FoodId.

### RecipeAllergen
Derived during save or stored cache:
- RecipeId + AllergyId

## Rules & provenance
### DietRule
- Id
- Code unique
- Name
- Category
- IsMedicalSensitive
- IsActive

### RuleVersion
- Id
- DietRuleId
- VersionNumber
- RuleType
- ParametersJson
- SourceType
- SourceTitle
- SourceUrl
- EvidenceLevel
- EffectiveFromUtc
- PublishedAtUtc
- PublishedByUserId
- IsCurrent
Unique: DietRuleId + VersionNumber.

### RuleSetVersion
- Id
- VersionLabel
- PublishedAtUtc
- PublishedByUserId
### RuleSetVersionItem
- RuleSetVersionId + RuleVersionId

## Planning
### MealPlan
- Id
- UserId
- StartDate
- EndDate
- Revision
- RuleSetVersionId
- Status
- GeneratedAtUtc

### MealPlanDay
- Id
- MealPlanId
- Date
Unique: MealPlanId + Date.

### PlannedMeal
- Id
- MealPlanDayId
- MealType
- RecipeId nullable
- ScheduledTime nullable
- Position
- RecommendationReasonJson
- IsReplaced

## Tracking
### MealLog
- Id
- UserId
- ConsumedAtUtc
- MealType
- Note
- IsDeleted
- CreatedAtUtc
Index: UserId + ConsumedAtUtc.

### MealLogItem
- Id
- MealLogId
- FoodId nullable
- RecipeId nullable
- Amount
- Unit
Constraint: FoodId XOR RecipeId.

### ActivityLog
- Id
- UserId
- ActivityType
- StartedAtUtc
- DurationMinutes
- Intensity
- Note
- IsDeleted
Index: UserId + StartedAtUtc.

### EatingWindowSnapshot
- Id
- UserId
- LocalDate
- FirstMealAtUtc
- LastMealAtUtc
- WindowMinutes
- MinutesBeforeSleep nullable
Unique: UserId + LocalDate.

## Adherence & challenge
### AdherenceScore
- Id
- UserId
- LocalDate
- Score decimal(5,2)
- RuleSetVersionId
- IsPartial
- MissingDataJson
- CalculatedAtUtc
Unique: UserId + LocalDate + RuleSetVersionId.

### ScoreDimension
- Id
- AdherenceScoreId
- DimensionCode
- Weight
- RawScore
- WeightedScore
- ExplanationJson

### Challenge
- Id
- UserId
- ChallengeType
- StartedOn
- EndsOn
- Status
- CurrentStreak

### ChallengeDay
- Id
- ChallengeId
- DayNumber
- TemplateCode
- CompletionRuleJson
- CompletedAtUtc nullable
Unique: ChallengeId + DayNumber.

## Recommendation
### RecommendationFeedback
- Id
- UserId
- RequestId
- RecipeId
- FeedbackType
- Comment nullable
- CreatedAtUtc

## FMD safety
### FmdSafetyAssessment
- Id
- UserId
- SubmittedAtUtc
- AnswersJson
- Result enum: EligibleForTracking / ProfessionalReviewRequired
- AcknowledgedAtUtc

### FmdCycle
- Id
- UserId
- SafetyAssessmentId
- PlannedStartDate
- PlannedEndDate
- Status
- ClinicianApproved boolean nullable
- Note
No therapeutic menu stored in MVP.

## Messaging / background
### OutboxMessage
- Id/EventId
- EventType
- PayloadJson
- OccurredAtUtc
- PublishedAtUtc nullable
- AttemptCount
- LastError
Index: PublishedAtUtc + OccurredAtUtc.

### ProcessedEvent
- EventId PK
- ConsumerName
- ProcessedAtUtc
Unique: EventId + ConsumerName if composite implementation.

### Reminder
- Id
- UserId
- ReminderType
- ScheduleLocalTime
- DaysOfWeekJson
- IsEnabled
- NextDueAtUtc

### WeeklyReport
- Id
- UserId
- WeekStartDate
- SummaryJson
- GeneratedAtUtc
Unique: UserId + WeekStartDate.

### AuditLog
- Id
- ActorUserId
- Action
- EntityType
- EntityId
- SafeDiffJson
- CorrelationId
- OccurredAtUtc
Index: EntityType+EntityId, ActorUserId+OccurredAtUtc.

## Important indexes
1. MealLog(UserId, ConsumedAtUtc DESC)
2. ActivityLog(UserId, StartedAtUtc DESC)
3. AdherenceScore(UserId, LocalDate DESC)
4. MealPlan(UserId, StartDate DESC, Status)
5. Food(NormalizedName), Food(Category, IsActive)
6. Recipe(MealType, IsActive)
7. RuleVersion(DietRuleId, IsCurrent)
8. OutboxMessage(PublishedAtUtc, OccurredAtUtc)
9. Reminder(IsEnabled, NextDueAtUtc)

## Data integrity
- Cascade only for true owned children such as MealPlan → MealPlanDay → PlannedMeal.
- Restrict deletes for Food/Recipe referenced by historical logs; use soft delete.
- RuleVersion is immutable after publish.
- Store user local timezone to correctly build daily/weekly boundaries.
