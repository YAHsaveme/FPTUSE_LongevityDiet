# 11 - Book Principle -> Software Requirement Traceability

## Purpose
This matrix makes the transformation from source material to software explicit.
It distinguishes **source-backed principles** from **project-created implementation heuristics**.

## Legend
- **Book/Official** = principle described by Alpha Books or Longo/Foundation public material.
- **Peer-reviewed** = claim limited to what a cited human study measured.
- **Project** = software/product design choice; not claimed as a scientific fact.
- **Target phase** = roadmap timing only; it does not assign ownership to a specific team member.

| # | Principle / Evidence | Source layer | Business rule | Functional requirements | Data | API / Service | UI | Tests | Target phase |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Five Pillars/evidence synthesis | Book/Official | Every diet rule must be traceable to a source/version | FR-014..016 | DietRule, RuleVersion, RuleSetVersion | RuleCatalogService | Rule detail/source panel, Admin rules | Rule without source cannot publish | W1 Task 2 / W5 |
| 2 | Mostly plant-forward, limited fish | Book/Official | Plant-forward features influence ranking | FR-020..023, FR-060..065 | Food tags, Recipe features | Planner + Recommendation gRPC | Plan/recommendation reasons | Plant-forward candidate ranks higher when constraints equal | W1 Tasks 2-4 / W3 |
| 3 | Legumes as major plant protein source | Book/Official | Legume feature contributes to adherence/ranking | FR-050..052, FR-063 | Food.IsLegume | LDAS + gRPC | LDAS breakdown / reason code | Legume feature affects configured dimension | W1 Task 2 / W2-W3 |
| 4 | Protein guidance varies by age/context | Book/Official | Protein targets are informational/configurable and age-aware | FR-005..007, FR-016, FR-020 | UserProfile, RuleVersion.Parameters | RuleResolver | Profile/plan explanation | Rules change by configured age band | W1 Tasks 1-3 / W3 |
| 5 | Minimize saturated fat and sugar | Book/Official | High values can reduce meal/rule score | FR-011, FR-050..052, FR-063 | Food.SaturatedFatG, SugarG | LDAS + gRPC | Why this score? | Penalty applied at configured threshold | W2-W3 |
| 6 | Prefer complex carbs / vegetables / whole grains | Book/Official | Whole-grain/vegetable features are positive signals | FR-010..013, FR-020, FR-063 | Food.Category, IsWholeGrain | Planner + gRPC | Catalog tags, plan reasons | Feature mapping/ranking tests | W1 Tasks 2-4 / W3 |
| 7 | Healthy fats / olive oil / nuts / appropriate fish | Book/Official | Healthy-fat tags support ranking/adherence | FR-010..013, FR-050 | Food/Recipe tags | Rule engine | Catalog/score explanation | Tag mapping tests | W1 Task 2 / W2-W3 |
| 8 | 12-hour eating window | Book/Official | Track daily first/last caloric intake and adherence | FR-032..034 | MealLog, EatingWindowSnapshot | EatingWindowService | Dashboard window card | Same-day/timezone/midnight cases | W1 Task 3 / W2 |
| 9 | Avoid eating 3-4h near bedtime | Book/Official | Compare last meal with configured sleep time | FR-006, FR-034 | UserProfile.SleepTime, EatingWindowSnapshot | EatingWindowService | Late-meal flag | Boundary tests | W1 Task 3 / W2 |
| 10 | Meal frequency can vary by age/weight tendency | Book/Official | Planner supports configurable 2/3-meal templates | FR-020..026 | UserProfile + RuleVersion | PlanGenerator | Plan configuration/explanation | Template selection tests | W1 Tasks 1-3 / W3 |
| 11 | Traditional/ancestral foods are encouraged in Longo guidance | Book/Official | Cultural/cuisine preferences may affect candidate preference, not safety | FR-006, FR-064 | UserProfile preference, Recipe tags | Recommendation | Preference controls | Preference never overrides allergy | W1 Tasks 1-4 / W3 |
| 12 | Exercise/walking/strength is part of lifestyle | Book/Official | Track activity and compare with configured targets | FR-040..044, FR-054 | ActivityLog | ProgressService | Activity log + trend | Aggregation and duration tests | W2 |
| 13 | FMD is a periodic, distinct intervention | Book/Official + Peer-reviewed | Keep FMD outside normal meal planner | FR-090..096 | FmdSafetyAssessment, FmdCycle | FmdSafetyService | Separate FMD module | Normal planner cannot create FMD protocol | W5 |
| 14 | Serious disease requires professional involvement in Longo Foundation material | Official safety | High-risk flags block self-directed FMD cycle generation | FR-091..094 | Safety answers/result | FmdSafetyService | ProfessionalReviewRequired state | Every blocking flag tested | W5 |
| 15 | 2017 FMD trial measured risk-factor/marker changes after cycles | Peer-reviewed | App may cite study education, but cannot claim personal treatment outcome | FR-090, FR-095 | Education source metadata | FMD education API | Evidence/source page | Content review/manual review | W5 |
| 16 | 2024 analysis reported changes in markers/biological-age measure | Peer-reviewed | Do not turn the study into individual biological-age prediction | BRULE-05, FR-056 | None required | LDAS contract | Explicit non-clinical disclaimer | API/UI text test | W2 |
| 17 | User needs actionable behavior, not only reading | Project | Convert principles into daily plan/log/progress loop | UC-04..13 | Plan/log/score/challenge tables | Core application services | Planner/dashboard/challenge | E2E flow | W1-W4 |
| 18 | LDAS 0-100 weighting | Project heuristic | Measures configured adherence only | FR-050..056 | AdherenceScore, ScoreDimension | AdherenceService | Breakdown + disclaimer | Bounds/missing-data/version tests | W2 |
| 19 | 14-day challenge | Project feature | Original habit sequence; not copied book sample menu | FR-070..075 | Challenge, ChallengeDay | ChallengeService | Daily challenge UX | Completion/streak tests | W2 |
| 20 | Recommendation reason codes | Project design | Every recommendation must be explainable | BRULE-01, FR-064..067 | Feedback + optional reason snapshot | gRPC ranking | Why-this recommendation | Reason-code coverage | W1 Task 4 / W3 |
| 21 | Optional local AI explanation | Project design | AI may rewrite reasons only; no rule creation/override | FR-066 | No clinical data required | Explanation adapter | Friendly explanation | Fallback/output validation | Optional after W7 |
| 22 | Reliable asynchronous updates | PRN232 + Project design | SQL transaction must not lose event | FR-080..088 | OutboxMessage, ProcessedEvent | Outbox/Worker | Admin event status | Failure/retry/idempotency tests | W1 Task 4 / W4 / W6 |
| 23 | Weekly reminder/report behavior | PRN232 background-job fit | Generate async summaries/reminders | FR-083..087 | Reminder, WeeklyReport | Worker | Reminder/report pages | Duplicate job tests | W4 |

## Source references used

### Vietnamese edition / book framing
https://shop.alphabooks.vn/che-do-an-truong-tho-toi-uu-can-nang-day-lui-benh-tat-keo-dai-tuoi-tho-p28835578.html

### Longo/Foundation adult diet principles
https://www.fondazionevalterlongo.org/en/longevity-diet-for-adults/

### Exercise
https://valterlongo.com/exercise-and-longevity/

### FMD / serious-condition caution
https://www.fondazionevalterlongo.org/en/diabetes-obesity/

### FMD randomized trial (2017)
https://pubmed.ncbi.nlm.nih.gov/28202779/

### FMD secondary/exploratory analysis (2024)
https://pubmed.ncbi.nlm.nih.gov/38378685/

## Implementation rule
If a developer adds a new nutrition/safety rule, update this matrix or document why it is purely a project UX/business rule.
