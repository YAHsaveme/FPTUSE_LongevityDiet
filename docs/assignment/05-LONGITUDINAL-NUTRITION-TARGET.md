# LongevityDiet – Daily Nutrition & Longitudinal Health (TARGET SPEC)
**Status:** Proposed architecture / research-backed target, NOT currently implemented. Updated: 2026-11-06.
**Current merged-code baseline:** The EF Core models contain 32 mapped tables: 21 Identity/Planning/Recommendation/FMD, 7 Tracking and 4 Worker. Basic multi-day meal planning, CSV-based allergy/exclusion screening, meal logging, recommendation feedback, FMD risk screening and an activity-focused gRPC service are implemented and tested using synthetic data. The **52-table normalized nutrition model**, independently sourced per-ingredient allergen/cross-contact validation, continuous structured wellness questionnaires and clinician-reviewed personalized nutrition pathway remain **proposed**, not migrated or clinically validated.
**Intended scope:** Adults; special populations and clinical dietary therapy require clinician or licensed dietitian review. Do not promise life extension or diagnose diseases from check-ins.

## A. Daily longitudinal user journey
1. **Before participation (baseline, with consent).** Ask year of birth/age band, timezone, pregnancy/lactation where relevant, dietary objective, daily routine, available budget, preferred cuisine, food allergies vs intolerances vs dislikes (record separately), reaction severity/uncertainty, conditions self-reported vs clinician-confirmed, relevant medications, weight and measurements if volunteered, physical activity, eating pattern, appetite, GI symptoms, sleep and energy. Record unknown/declined explicitly; user can edit and withdraw consent.
2. **Risk classification (multi-label, never a diagnosis).** Separate (a) safety restrictions: confirmed or suspected allergy; (b) nutritional vulnerability: malnutrition risk, low appetite, chewing/swallowing difficulties; (c) conditions: diabetes, kidney disease, hypertension, pregnancy/lactation, medications with food interactions; (d) dietary pattern/cultural preferences; (e) goal and logistics. Keep provenance, dated updates, rule version, and clinician review status. Unknown allergen data = candidate excluded until verified.
3. **Daily program, not one recipe.** User chooses a 7/14/30-day duration (or flexible rolling plan). Materialize **one ProgramDay per local calendar date, per ProgramVersion** with multiple ScheduledMeals (breakfast/lunch/dinner and optional snacks), named recipes, portions, ingredient breakdown, nutrients, sourced nutrition data, substitution options and shopping guidance. Include hydration guidance as appropriate. All dates and unique keys are evaluated in the user's timezone.
4. **Before meals / during day / after meals.** Log what was actually eaten, time, portion, ingredient substitution and skipped meals. Invite short check-ins for energy, symptoms, mood, GI comfort, satiety, sleep, appetite and optional user-entered measurements. Permit quick tick, scale, single choice, number and free text. Distinguish actual observed health from guesses and from clinical tests.
5. **Daily and periodic review.** Compare observed intake and subjective state against baseline; flag missing data instead of scoring it as poor adherence. Show time-series trends and uncertainty. Offer safe reversible substitutions, then propose a new ProgramVersion effective on upcoming days; do not overwrite historical meals/observations. Weekly summaries aggregate several days and ask what worked, what was difficult and whether user wants to continue or change goals.
6. **Escalation and review.** Severe allergic reaction or acute danger → display emergency guidance, stop automatic food planning, offer urgent professional care. Reported weight loss, persistent distress, possible malnutrition, diabetes/CKD/pregnancy or medication-diet conflicts → pause unsafe adjustments and request qualified dietitian/clinician review. Do not treat an algorithm as the treating clinician.

## B. What the daily check-in should ask
| Timing | Structured questions (examples) | Adaptive behavior |
|---|---|---|
| Baseline | Allergies/reactions, conditions, medication interactions, goals, food preferences, restrictions, initial well-being | Classify multi-label risks; request confirmation |
| Morning (opt-in) | How was sleep? How is energy 0–5? Appetite? Any new symptoms? | Only revise safe future suggestions after review |
| After eating (optional) | Ate / part / skipped? What and how much? Discomfort, rash or other reaction? | Save actual intake; serious symptoms trigger safety hold |
| Evening (brief) | GI comfort, mood, hydration, perceived well-being, changes since morning; optional body weight/BP/glucose if already measured | Compute trends with missing-data markers |
| Weekly | Changes vs baseline, sustained symptoms, ease of following meals, preferences, burden, desired adjustments | Version new future plan, preserve old records |

**Reminder rules:** In-app/push with opt-in, quiet hours, timezone/DST support, configurable cadence, maximum reminders per day, snooze and unsubscribe. "Always asks" means dependable recurring opportunities, **not** constant disruptive notifications.

## C. Nutritional correctness and safety
- The planning algorithm MUST apply **hard constraints before optimization**: no known/suspected allergens, no recipes with unknown ingredients, approved medications and condition restrictions, verified nutrition source, user-specific contraindications and clinician-required approvals. Cross-contact risk must be disclosed; “allergen-free” is not guaranteed by an ingredient list alone.
- Then optimize **soft preferences**: variety across days, local Vietnamese availability, culture, budget, prep time, household size, leftovers and taste. Avoid repeating one day's menu endlessly.
- Store reference/source/version and confidence for each food's ingredient and nutrient data, and an auditable record of why a recipe was selected or rejected.
- Calorie and nutrient targets must be individualised, not fixed from age alone. Do not automatically prescribe strict caloric deficits for older adults or people at risk of disordered eating.
- Any medically therapeutic program (kidney disease, pregnancy, diabetes medication regimes, eating disorders, undernutrition) must be referred to trained professionals. The general WHO dietary pattern is not a universal medical prescription.
- Patient-reported change is **association, not evidence the plan caused a health outcome**. Do not claim to predict lifespan.

## D. C2 – proposed component responsibilities
- **Profile + Intake API** → Nutrition Intake Service → baseline and consent + user goals (existing JWT ownership, sensitive data controls).
- **Safety API** → Risk + Allergen Service → multi-label screening, unknown-ingredient hard-fail, high-risk clinical gate.
- **Food Catalog API** → Food + Nutrient Service → ingredients, recipe versions, nutrient provenance, allergens and cross-contact.
- **Daily Plan API** → Multi-Day Plan Engine → date coverage, daily meals, versioned changes, substitutions, safety checks.
- **Meal Diary API** → Meal Logging Service → actual consumption records distinct from intended servings.
- **Check-in API** → Wellness Questionnaire Service → versioned question templates, selectable answers, surveys before/during/after.
- **Progress API** → Trend + Adaptation Service → compare baseline to history; no imputed wellness claims; clinical review for red flags.
- **Outbox + Redis/Worker** → optional delivery of reminder schedules; retries, deduplication and timestamps. This is NOT a direct SQL FK to external Worker DB.

The C2 target reuses the existing ASP.NET Core REST container at :8080, Nginx UI, Redis and Worker. Proposed nutrition tables live in **nutrition schema within existing LongevityTrackingDb** so no fourth database is assumed in C1. This is an implementation proposal, not a schema migration that has already occurred.

## E. Physical/ERD contract (proposed)
- **52 proposed tables**, **74 proposed same-database FKs**, split into three clear table-catalog Draw.io views and four separate Draw.io FK audit views (14 + 22 + 17 + 21 arrows). Each arrow has explicit source FK and target PK; the single editable DBML remains the authoritative proposed schema. All referenced PKs and FK columns exist in DBML.
- Baseline & safety 14: NutritionProfiles, Allergens, UserAllergies, HealthConditions, UserConditions, MedicationContexts, DietPreferences, NutritionGoals, RiskAssessments, HealthConsents, **UserFoodIntolerances, NutritionRiskFactors, AssessmentRiskFactors, ClinicalReviewCases**. Risk classification is multi-label; food intolerances are not confused with IgE-mediated allergies.
- Food & plan 20: Foods, Nutrients, FoodNutrients, FoodAllergens, Recipes, RecipeIngredients, RecipeAllergens, DietPrograms, ProgramVersions, ProgramDays, ScheduledMeals, ScheduledMealItems, MealReplacements, PlanSafetyChecks, **FoodDataSources, FoodSourceLinks, RecipeCrossContactRisks, NutritionTargetRanges, DayNutrientEstimates, PlanSelectionDecisions**. Each day stores safety/publication status, portions and verified nutrient provenance.
- Feedback & review 18: MealIntakes, MealIntakeItems, QuestionnaireTemplates, QuestionnaireQuestions, QuestionOptions, CheckinSchedules, CheckinSubmissions, CheckinAnswers, HealthObservations, SymptomReports, NutritionReviews, PlanChangeHistory, PromptDeliveries, SafetyIncidents, NutritionOutbox, **CheckinAnswerSelections, HealthDataAuditEvents, WeeklyAssessments**. Multiple checkbox options, missing/declined responses, observed measurements and weekly reviews are distinct.
- Identity `Users.Id` lives in `LongevityDietDb`; `NutritionProfiles.UserId` and `MealIntakes.UserId` are **logical cross-database IDs, not enforceable SQL Server FKs**. Prefer authenticated ownership checking in services. No phantom FK lines.
- The **proposed DBML** now explicitly defines UNIQUE (NutritionProfiles.UserId), UNIQUE (ProgramDays.ProgramVersionId, LocalDate), UNIQUE (ScheduledMeals.ProgramDayId, MealType, LocalTime), idempotent delivery keys, essential NOT NULL columns and CHECK rules on positive portions, nutrient range ordering, dates and symptom severity. The constraint values are **design assumptions** subject to clinical/domain review, not applied migrations. Retention, cascade deletion and protected health information access must be privacy-reviewed.
- Plan a migration strategy, indexes for `(ProfileId,LocalDate)` and `(ProgramVersionId,LocalDate)`, optimistic concurrency, idempotent check-in writes, row ownership checks, encrypted sensitive data, consent audit/versioning and purpose-limited access. **Not yet implemented.**

## F. Acceptance tests before stating it works
- 7/14/30-day plans have exactly one row for **every** local date, including month boundaries, leap days and timezone transitions, with nonempty meals, portion units, verified food source, safety result and no duplicates.
- Strong/unknown allergy → no unsafe recipe or substitution; severe alert → hold all automatic adaptation, show emergency guidance and allow human review.
- One user with overlapping conditions is classified in **multiple dimensions**, not forced into one mutually exclusive “type”; vulnerable/high-risk flows require reviewer approval.
- Baseline/meal/evening/weekly check-ins save option/tick/numeric/free text and can be edited with audit, without overwriting previous-day entries.
- Actual intake vs plan and baseline vs ongoing observations remain separated; trend graphs show missing data and no medical certainty.
- No daily reminder without consent; quiet hours, cadence and snooze work; worker retry doesn't duplicate messages.
- Multi-user isolation tests prevent reading/writing others' private nutrition and health data.
- All diagrams and DBML pass shape coverage, FK validation, path readability and PDF export. Full end-to-end runtime and clinician review still needed.

## G. Research grounding
- WHO (2026), Healthy diet: https://www.who.int/news-room/fact-sheets/detail/healthy-diet
- Viet Nam Ministry of Health (2024), Ten recommendations until 2030: https://baochinhphu.vn/bo-y-te-cong-bo-muoi-loi-khuyen-dinh-duong-hop-ly-den-nam-2030-10224120216512568.htm
- US FDA, Food Allergies and cross-contact: https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies
- ADA, Standards of Care in Diabetes 2026 (medical nutrition therapy, shared decision-making): https://diabetesjournals.org/care/article/49/Supplement_1/S89/163932
- ESPEN 2022 practical guideline on nutrition/hydration in older adults: https://pubmed.ncbi.nlm.nih.gov/35306388/
- NIDDK / NIH, individualized clinical nutrition for chronic kidney disease: https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease
- NCI NIH ASA24 dietary records and multiple day recall methodology: https://epi.grants.cancer.gov/asa24/respondent/methodology.html
- WHO digital health intervention taxonomy (self-monitoring, targeted prompts, consent): https://smart.who.int/base/CodeSystem-CDHIv2.html

## H. Research proposal — not an additional official ERD

The proposed 52-table nutrition research model is a draft design,
not a migrated database or second official architecture diagram.
The five official diagrams are [C0](one-page/C0.drawio),
[C1](one-page/C1.drawio), [C2](one-page/C2.drawio),
[Database Diagram](one-page/Database%20Diagram.drawio) and
[Business Flow](one-page/Business%20Flow.drawio).
The earlier candidate DBML was removed to satisfy the single-source
architecture submission. Research remains in this document.
## I. Rolling every-day plan and timeline invariants (design contract, not runtime)

**Fixed mode** requires an inclusive StartLocalDate/EndLocalDate range. **Rolling mode** keeps EndLocalDate NULL; RollingHorizonDays is 1–90, with 7/14/30 as supported user choices. The proposed Scheduler/Worker must replenish missing **local calendar dates** before the horizon expires and recheck after every profile/allergy/condition change. A generation retry is idempotent by (ProgramVersionId, LocalDate). A day must have a nonempty safe menu; a gap or an incomplete/unverified menu must be reported as UNAVAILABLE, never filled with a guessed meal.

**Version selection** is deterministic: for requested local date choose the latest approved ProgramVersion with EffectiveFromLocalDate <= date; then require exactly one corresponding ProgramDay and SafetyStatus=passed. The new unique candidate index on (ProgramId, EffectiveFromLocalDate) prevents two revisions from taking effect on the same local date. If the chosen version lacks its day, fail closed and request repair rather than silently displaying an older version. Changes are only effective for future dates, preserving historical meal records, symptom responses and original plan revisions.

**Check-in link semantics**: CheckinSubmissions.ProgramDayId and MealIntakeId are optional; baseline and morning check-ins may have neither, post-meal check-ins should reference the actual logged intake. CheckinSchedules.ConsentId points to an explicit HealthConsents record: each delivery additionally requires a matching purpose, active consent (not revoked), notification subscription, quiet-hours validation and deduplication key. FK existence alone does **not** establish current consent. Missed questionnaires are UNKNOWN, not 'healthy' or 'noncompliant'.

**Privacy and safety**: Application-layer ownership must verify that the plan version/day, logged meal, consent and profile belong to the authenticated user, because simple SQL foreign keys do not enforce the entire ownership chain. High-risk reviews require documented clinician approval; no automated menu or daily revision may bypass a warning. A serious symptom should stop automated publication and direct the user to appropriate emergency/clinical care rather than diagnose the cause.

**Reference design tests**: Run `node scripts/Validate-NutritionPlanContract.js` for 20 positive/negative synthetic scenario contracts (including rolling horizon renewal and idempotency); these do not exercise the currently deployed API. The official `@dbml/cli` SQL Server exporter successfully parsed the **current 52-table / 74-FK model** and generated a non-executed SQL preview with 20 UNIQUE and 14 CHECK constraints. Repeat the parser after future schema changes; do not confuse successful DDL generation with running or clinically validating a health system. Do **not** execute the generated DDL on any live database.

Research source alignment:
- Viet Nam National Institute of Nutrition, ten practical recommendations issued under Decision 3594/QD-BYT: https://viendinhduong.vn/vi/professional-activities/nhung-loi-khuyen-dinh-duong-hop-ly/muoi-loi-khuyen-dinh-duong-hop-ly-den-nam-2030-67e955ffd306f8227c02d2c4
- WHO Healthy Diet, updated 26 January 2026 (adequacy, balance, moderation, diversity and safety): https://www.who.int/news-room/fact-sheets/detail/healthy-diet
- ADA Standards of Care 2026, section 5 (individualized medical nutrition therapy and clinician support): https://doi.org/10.2337/dc26-S005
- FDA Food Allergies (advisory cross-contact labeling and manufacturing risk): https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies
- NIDDK Healthy Eating with CKD (individual dietitian assessment): https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease
