# LongevityDiet – Daily Nutrition & Longitudinal Health (TARGET SPEC)
**Status:** Proposed architecture / research-backed target, NOT currently implemented. Date: 2026-11-05.
**Baseline:** The real running code contains 18 mapped EF Core tables across Identity (7), Tracking (7), and Worker (4), plus an activity-focused gRPC recommendation. It does **not** implement a verified multi-day menu, structured allergy catalog, daily symptom questionnaires, or clinician-reviewed nutrition pathway.
**Intended scope:** Adults; special populations and clinical dietary therapy require clinician or licensed dietitian review. Do not promise life extension or diagnose diseases from check-ins.

## A. Daily longitudinal user journey
1. **Before participation (baseline, with consent).** Ask year of birth/age band, timezone, pregnancy/lactation where relevant, dietary objective, daily routine, available budget, preferred cuisine, food allergies vs intolerances vs dislikes (record separately), reaction severity/uncertainty, conditions self-reported vs clinician-confirmed, relevant medications, weight and measurements if volunteered, physical activity, eating pattern, appetite, GI symptoms, sleep and energy. Record unknown/declined explicitly; user can edit and withdraw consent.
2. **Risk classification (multi-label, never a diagnosis).** Separate (a) safety restrictions: confirmed or suspected allergy; (b) nutritional vulnerability: malnutrition risk, low appetite, chewing/swallowing difficulties; (c) conditions: diabetes, kidney disease, hypertension, pregnancy/lactation, medications with food interactions; (d) dietary pattern/cultural preferences; (e) goal and logistics. Keep provenance, dated updates, rule version, and clinician review status. Unknown allergen data = candidate excluded until verified.
3. **Daily program, not one recipe.** User chooses a 7/14/30-day duration (or flexible rolling plan). Materialize **one ProgramDay per local calendar date** with multiple ScheduledMeals (breakfast/lunch/dinner and optional snacks), named recipes, portions, ingredient breakdown, nutrients, sourced nutrition data, substitution options and shopping guidance. Include hydration guidance as appropriate. All dates and unique keys are evaluated in the user's timezone.
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
- **39 proposed tables**, **50 proposed same-database FKs**, split into three clear table-catalog Draw.io views and four separate Draw.io FK audit views (9 + 14 + 14 + 13 arrows). Each arrow has explicit source FK and target PK; the single editable DBML remains the authoritative proposed schema. All referenced PKs and FK columns exist in DBML.
- Baseline & safety 10: NutritionProfiles, Allergens, UserAllergies, HealthConditions, UserConditions, MedicationContexts, DietPreferences, NutritionGoals, RiskAssessments, HealthConsents.
- Food & plan 14: Foods, Nutrients, FoodNutrients, FoodAllergens, Recipes, RecipeIngredients, RecipeAllergens, DietPrograms, ProgramVersions, ProgramDays, ScheduledMeals, ScheduledMealItems, MealReplacements, PlanSafetyChecks.
- Feedback & review 15: MealIntakes, MealIntakeItems, QuestionnaireTemplates, QuestionnaireQuestions, QuestionOptions, CheckinSchedules, CheckinSubmissions, CheckinAnswers, HealthObservations, SymptomReports, NutritionReviews, PlanChangeHistory, PromptDeliveries, SafetyIncidents, NutritionOutbox.
- Identity `Users.Id` lives in `LongevityDietDb`; `NutritionProfiles.UserId` and `MealIntakes.UserId` are **logical cross-database IDs, not enforceable SQL Server FKs**. Prefer authenticated ownership checking in services. No phantom FK lines.
- Suggested DB constraints: UNIQUE (NutritionProfiles.UserId); UNIQUE (ProgramDays.ProgramVersionId, LocalDate); UNIQUE (ScheduledMeals.ProgramDayId, MealType, LocalTime) where applicable; CHECK amounts nonnegative and severity in an enumerated domain; referential integrity in same database; retention and delete cascade rules must be privacy-reviewed.
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
- KDIGO 2024 CKD nutrition clinical tailoring: https://doi.org/10.1016/j.kint.2023.10.016
- NCI NIH ASA24 dietary records and multiple day recall methodology: https://epi.grants.cancer.gov/asa24/respondent/methodology.html
- WHO digital health intervention taxonomy (self-monitoring, targeted prompts, consent): https://smart.who.int/base/CodeSystem-CDHIv2.html

## H. Deliverables and implementation status
- `one-page/07-c2-daily-nutrition-target.drawio` – PROPOSED C2 components and data ownership.
- `one-page/08-nutrition-target-39-tables.dbml` – source-of-truth candidate FK graph.
- `one-page/08-erd-nutrition-profile-safety-target.drawio` – onboarding, restrictions, consent.
- `one-page/09-erd-food-daily-plans-target.drawio` – food, allergens, recipe, calendar days, multiple meals.
- `one-page/10-erd-checkins-trends-target.drawio` – intake, questionnaires, symptoms, assessments and reminders.
- `one-page/11-daily-care-loop-target.drawio` – explicit baseline → schedule → meal → feedback → next day.
- `one-page/12-erd-cross-domain-foreign-keys-target.drawio` – 13 explicit cross-sheet SQL FK arrows (not cross-database).
- `one-page/13-fk-profile-safety-target.drawio`, `14-fk-food-daily-plans-target.drawio`, `15-fk-checkins-trends-target.drawio` – 9 + 14 + 14 clear local FK rows. Together with 12, these show **all 50 FKs, one arrow per relationship**, without a tangled connector network.
- Existing 01–06 as-is current-code architectural diagrams are intentionally **not overwritten**.
- **No source API endpoints, EF migrations, food database, clinical rule engine, recommendation model or UI implementation are implied by these new diagrams.**
