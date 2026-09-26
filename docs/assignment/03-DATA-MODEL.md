# Data Model - Conceptual ERD and Physical Database

## 1. Modelling rule

Two data views are provided:

- **Conceptual ERD:** business concepts and their main relationships; no SQL types.
- **Physical Database:** target MVP relational schema with PK/FK and implementation-oriented fields.

The conceptual view is intentionally much smaller so it can be understood in one glance.

---

## 2. Conceptual ERD

### Core concepts

| Concept | Meaning |
|---|---|
| User | Account owner or administrator |
| User Profile | Personal schedule/preferences used for planning |
| Food | Reusable food reference |
| Recipe | Meal composed from foods |
| Diet Rule | Versioned longevity-diet rule |
| Meal Plan | Generated plan owned by a user |
| Planned Meal | Meal slot inside a plan |
| Meal Log | What a user actually consumed |
| Activity Log | User activity record |
| Adherence Score | Daily/weekly adherence result |

### Main conceptual relationships

- User **has one** User Profile.
- User **has many** Meal Plans.
- Meal Plan **contains many** Planned Meals.
- Planned Meal **references one** Recipe.
- Recipe **uses many** Foods.
- User **creates many** Meal Logs.
- Meal Log **references food/recipe content**.
- User **creates many** Activity Logs.
- User **receives many** Adherence Scores.
- Diet Rules **govern** plan generation and adherence scoring.

### Conceptual boundary
Messaging tables, refresh tokens, audit logs and technical idempotency records are intentionally omitted from the conceptual ERD because they are implementation infrastructure rather than primary business concepts.

---

## 3. Physical Database - Core Field Detail

### Identity

#### Users
- `Id uniqueidentifier PK`
- `Email nvarchar(320)`
- `NormalizedEmail nvarchar(320) UNIQUE`
- `PasswordHash nvarchar(512)`
- `DisplayName nvarchar(120)`
- `Role nvarchar(24)`
- `Status nvarchar(24)`
- `CreatedAt datetimeoffset`
- `UpdatedAt datetimeoffset`

#### UserProfiles
- `UserId uniqueidentifier PK/FK -> Users.Id`
- `BirthYear int NULL`
- `TimeZone nvarchar(100)`
- `WakeTime time NULL`
- `SleepTime time NULL`
- `PreferredMealFrequency int`
- `FoodPreference nvarchar(500) NULL`
- `ProfileCompleted bit`
- `UpdatedAt datetimeoffset`

#### RefreshTokens
- `Id uniqueidentifier PK`
- `UserId uniqueidentifier FK -> Users.Id`
- `TokenHash nvarchar(64) UNIQUE`
- `CreatedAt datetimeoffset`
- `ExpiresAt datetimeoffset`
- `RevokedAt datetimeoffset NULL`
- `ReplacedByTokenId uniqueidentifier NULL`

### Catalog

#### Foods
- `Id uniqueidentifier PK`
- `Name nvarchar(200)`
- `NormalizedName nvarchar(200)`
- `Category nvarchar(80)`
- `Calories decimal`
- `ProteinG decimal`
- `CarbohydrateG decimal`
- `FatG decimal`
- `IsPlantBased bit`
- `IsWholeGrain bit`
- `IsLegume bit`
- `IsFish bit`
- `IsActive bit`

#### Recipes
- `Id uniqueidentifier PK`
- `Name nvarchar(200)`
- `MealType nvarchar(40)`
- `Description nvarchar(1000) NULL`
- `PrepMinutes int NULL`
- `IsPlantForward bit`
- `IsActive bit`

#### RecipeIngredients
- `RecipeId uniqueidentifier PK/FK -> Recipes.Id`
- `FoodId uniqueidentifier PK/FK -> Foods.Id`
- `Amount decimal`
- `Unit nvarchar(40)`
- `IsOptional bit`

### Rules

#### DietRules
- `Id uniqueidentifier PK`
- `Code nvarchar(80) UNIQUE`
- `Name nvarchar(200)`
- `Category nvarchar(80)`
- `IsMedicalSensitive bit`
- `IsActive bit`

#### RuleVersions
- `Id uniqueidentifier PK`
- `DietRuleId uniqueidentifier FK -> DietRules.Id`
- `VersionNumber int`
- `ParametersJson nvarchar(max)`
- `SourceUrl nvarchar(1000)`
- `EvidenceLevel nvarchar(40)`
- `PublishedAtUtc datetime2 NULL`
- `IsCurrent bit`
- UNIQUE(`DietRuleId`, `VersionNumber`)

### Planning

#### MealPlans
- `Id uniqueidentifier PK`
- `UserId uniqueidentifier FK -> Users.Id`
- `StartDate date`
- `EndDate date`
- `Revision int`
- `Status nvarchar(40)`
- `GeneratedAtUtc datetime2`

#### MealPlanDays
- `Id uniqueidentifier PK`
- `MealPlanId uniqueidentifier FK -> MealPlans.Id`
- `Date date`
- UNIQUE(`MealPlanId`, `Date`)

#### PlannedMeals
- `Id uniqueidentifier PK`
- `MealPlanDayId uniqueidentifier FK -> MealPlanDays.Id`
- `RecipeId uniqueidentifier FK -> Recipes.Id`
- `MealType nvarchar(40)`
- `ScheduledTime time NULL`
- `Position int`
- `ReasonJson nvarchar(max) NULL`

### Tracking and progress

#### MealLogs
- `Id uniqueidentifier PK`
- `UserId uniqueidentifier FK -> Users.Id`
- `ConsumedAtUtc datetime2`
- `MealType nvarchar(40)`
- `Note nvarchar(1000) NULL`
- `IsDeleted bit`

#### ActivityLogs
- `Id uniqueidentifier PK`
- `UserId uniqueidentifier FK -> Users.Id`
- `ActivityType nvarchar(40)`
- `StartedAtUtc datetime2`
- `DurationMinutes int`
- `Intensity nvarchar(40) NULL`
- `IsDeleted bit`

#### AdherenceScores
- `Id uniqueidentifier PK`
- `UserId uniqueidentifier FK -> Users.Id`
- `LocalDate date`
- `Score decimal(5,2)`
- `IsPartial bit`
- `CalculatedAtUtc datetime2`

### Messaging

#### OutboxMessages
- `Id uniqueidentifier PK`
- `EventType nvarchar(120)`
- `PayloadJson nvarchar(max)`
- `OccurredAtUtc datetime2`
- `PublishedAtUtc datetime2 NULL`
- `AttemptCount int`
- `LastError nvarchar(max) NULL`

#### ProcessedEvents
- `EventId uniqueidentifier PK`
- `ConsumerName nvarchar(100)`
- `ProcessedAtUtc datetime2`

---

## 4. Physical Database - Full Target Coverage

The final Assignment Physical DB diagram now shows the **full 33-table Target MVP**. Tables are grouped by domain so the page stays readable, and cross-domain foreign keys are written inside the table cards rather than creating long spaghetti connectors.

### Identity & Profile
- Users
- UserProfiles
- RefreshTokens
- Allergies
- UserAllergies
- UserExcludedFoods

### Catalog & Versioned Rules
- Foods
- Recipes
- RecipeIngredients
- RecipeAllergens
- DietRules
- RuleVersions
- RuleSetVersions
- RuleSetVersionItems

### Planning & Tracking
- MealPlans
- MealPlanDays
- PlannedMeals
- MealLogs
- MealLogItems
- ActivityLogs
- EatingWindowSnapshots

### Progress, Engagement & Safety
- AdherenceScores
- ScoreDimensions
- Challenges
- ChallengeDays
- RecommendationFeedback
- FmdSafetyAssessments
- FmdCycles
- Reminders
- WeeklyReports

### Messaging, Reliability & Operations
- OutboxMessages
- ProcessedEvents
- AuditLogs

The detailed field-level specification for all of these tables remains in `../06-DATABASE-DESIGN.md`; the Assignment diagram deliberately shows only PK/FK and the important fields required to understand implementation.

---

## 5. Important Physical Constraints

1. `Users.NormalizedEmail` unique.
2. `RefreshTokens.TokenHash` unique.
3. Recipe ingredient pair `RecipeId + FoodId` unique/composite key.
4. `RuleVersions(DietRuleId, VersionNumber)` unique.
5. `MealPlanDays(MealPlanId, Date)` unique.
6. User-owned records always carry `UserId`.
7. Referenced Food/Recipe history should use soft-delete/deactivation instead of destructive delete.
8. Published rule versions are immutable.
9. Outbox unpublished rows are indexed by publish/time fields.
10. Event consumers are idempotent through ProcessedEvents.

## 6. Current Implementation vs Target

### Implemented now
- Users
- UserProfiles
- RefreshTokens

### Target Assignment MVP
The remaining core tables in this document are introduced by Week 1 Tasks 2-4 and later roadmap tasks.

This distinction is deliberate: the Assignment diagrams describe the agreed target architecture/data design, while the implementation status stays truthful.
