# 07 — REST API, gRPC & Event Contracts

## REST conventions
Base: `/api/v1`
- JSON camelCase.
- UTC timestamps ISO-8601.
- ProblemDetails for errors.
- JWT Bearer auth.
- Pagination metadata in body.
- Idempotency key recommended for plan generation if UI may retry.

## Auth
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/revoke

## Profile
- GET /api/v1/me/profile
- PUT /api/v1/me/profile
- GET /api/v1/me/allergies
- PUT /api/v1/me/allergies
- GET /api/v1/me/excluded-foods
- POST /api/v1/me/excluded-foods
- DELETE /api/v1/me/excluded-foods/{id}

## Catalog
- GET /api/v1/foods?page=1&pageSize=20&search=&category=&sortBy=name&sortDirection=asc
- GET /api/v1/foods/{id}
- GET /api/v1/recipes?...filters
- GET /api/v1/recipes/{id}

## Meal plans
- POST /api/v1/meal-plans
  Body: { startDate, durationDays: 7|14 }
- GET /api/v1/meal-plans
- GET /api/v1/meal-plans/{id}
- POST /api/v1/meal-plans/{id}/regenerate
- POST /api/v1/meal-plans/{id}/meals/{plannedMealId}/replacement

## Tracking
- POST /api/v1/meal-logs
- GET /api/v1/meal-logs?from=&to=&page=&pageSize=
- PUT /api/v1/meal-logs/{id}
- DELETE /api/v1/meal-logs/{id}
- POST /api/v1/activity-logs
- GET /api/v1/activity-logs?from=&to=
- PUT /api/v1/activity-logs/{id}
- DELETE /api/v1/activity-logs/{id}
- GET /api/v1/eating-windows?from=&to=

## Score/progress
- GET /api/v1/adherence/daily?date=
- GET /api/v1/adherence/weekly?weekStart=
- GET /api/v1/progress?from=&to=
- GET /api/v1/weekly-reports
- GET /api/v1/weekly-reports/{id}

## Recommendation
- POST /api/v1/recommendations/meals
- POST /api/v1/recommendations/{requestId}/feedback

Example response:
```json
{
  "requestId": "uuid",
  "items": [
    {
      "recipeId": "uuid",
      "rank": 1,
      "score": 87.5,
      "reasonCodes": ["PLANT_FORWARD", "LEGUME_SOURCE", "FITS_PREFERENCE"],
      "explanation": "..."
    }
  ],
  "isAiGeneratedExplanation": false
}
```

## Challenge/reminders
- POST /api/v1/challenges/14-day/start
- GET /api/v1/challenges/current
- POST /api/v1/challenges/{id}/days/{day}/complete
- GET /api/v1/reminders
- PUT /api/v1/reminders

## FMD safety
- GET /api/v1/fmd/education
- POST /api/v1/fmd/safety-assessments
- GET /api/v1/fmd/safety-assessments/latest
- POST /api/v1/fmd/cycles
- GET /api/v1/fmd/cycles
Creation allowed only if latest assessment result permits tracking.

## Admin
- /api/v1/admin/foods
- /api/v1/admin/recipes
- /api/v1/admin/rules
- /api/v1/admin/rule-sets
- /api/v1/admin/jobs
- /api/v1/admin/events
- /api/v1/admin/dead-letter
- /api/v1/admin/audit-logs

## gRPC service
Service name: `RecommendationService`.

Recommended proto:
```proto
syntax = "proto3";
option csharp_namespace = "LongevityDiet.Recommendation.Contracts";
package recommendation.v1;

service RecommendationService {
  rpc RankMeals (RankMealsRequest) returns (RankMealsReply);
}

message RankMealsRequest {
  string request_id = 1;
  string user_id = 2;
  repeated string allergy_codes = 3;
  repeated string excluded_food_ids = 4;
  string dietary_pattern = 5;
  repeated CandidateMeal candidates = 6;
}

message CandidateMeal {
  string recipe_id = 1;
  bool is_plant_forward = 2;
  bool has_legume = 3;
  bool has_whole_grain = 4;
  bool has_fish = 5;
  double saturated_fat_g = 6;
  double sugar_g = 7;
  repeated string allergen_codes = 8;
  double preference_score = 9;
  double variety_score = 10;
}

message RankedMeal {
  string recipe_id = 1;
  double score = 2;
  repeated string reason_codes = 3;
}

message RankMealsReply {
  string request_id = 1;
  repeated RankedMeal items = 2;
}
```

## gRPC ranking pipeline
1. Validate request.
2. Hard filter allergies.
3. Hard filter exclusions/diet pattern.
4. Calculate feature score.
5. Apply variety/preference.
6. Stable sort descending.
7. Return top N + reason codes.
8. No natural-language generation inside core ranking.

## Redis Streams
### Streams
- `ldc.domain-events`
- `ldc.notification-events`
- `ldc.dead-letter`

### Consumer groups
- `ldc-workers`
- Optional future: `ldc-analytics`

### Event types
- UserProfileUpdated.v1
- MealLogged.v1
- MealLogChanged.v1
- ActivityLogged.v1
- MealPlanGenerated.v1
- ScoreRecalculationRequested.v1
- ReminderDue.v1
- WeeklyReportRequested.v1

### Envelope
