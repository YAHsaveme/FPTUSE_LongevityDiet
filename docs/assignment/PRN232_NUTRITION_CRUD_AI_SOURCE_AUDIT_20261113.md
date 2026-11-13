# PRN232 — Nutrition catalog, menu CRUD and source-grounded generation

> Update 14/11/2026: the default optional AI provider has changed from Ollama to **Gemini API**. This document preserves the 13/11 Ollama audit for historical reference. See [PRN232_GEMINI_MEAL_AI_INTEGRATION_20261114.md](PRN232_GEMINI_MEAL_AI_INTEGRATION_20261114.md) for current settings and verified boundaries.

**Implementation date:** 13–14 November 2026
**Branch:** `feat/prn232-meal-catalog-planner-crud-20261113`
**Scope:** Nutrition CRUD, meal planning, optional local AI, safety and traceability.
**No mandatory expert role or expert-management feature is part of this product.**

## Implementation and permissions

| Domain | Create | Read | Update | Delete/archive | Access |
| --- | --- | --- | --- | --- | --- |
| Food/ingredient catalog | `POST /api/v1/admin/foods` | `GET /api/v1/admin/foods` | `PUT /api/v1/admin/foods/{id}` | `DELETE /api/v1/admin/foods/{id}` deactivates | Admin |
| Composite recipe/food ingredients | `POST /api/v1/admin/recipes` | `GET /api/v1/admin/recipes` | `PUT /api/v1/admin/recipes/{id}` including ingredient amounts and allergen links | `DELETE /api/v1/admin/recipes/{id}` deactivates | Admin |
| Member meal plan | `POST /api/v1/meal-plans/generate` | `GET /api/v1/meal-plans`, `/current`, `/{id}` | `POST /api/v1/meal-plans/{id}/regenerate` | `DELETE /api/v1/meal-plans/{id}` archives | Authenticated owner |
| Scheduled meal within a plan | `POST /api/v1/meal-plans/{id}/days/{dayId}/meals` | Embedded in plan response | `PUT /api/v1/meal-plans/{id}/meals/{mealId}` (candidate, slot, time) | `DELETE /api/v1/meal-plans/{id}/meals/{mealId}` | Authenticated owner |
| Meals actually eaten | `POST /api/v1/meal-logs` | `GET /api/v1/meal-logs` | `PUT /api/v1/meal-logs/{id}` | `DELETE /api/v1/meal-logs/{id}` | Authenticated owner |

Admin recipe records now **feed the live planning candidate pool** as `CAT-{recipeId}` and stop being considered after deactivation. The candidate is blocked if its food reference is inactive, ingredients are missing or nutrition calories are invalid. Its ingredients/allergen tags are considered by the existing ranking/filter engine. Adding a recipe is *not* the same as verifying its nutrient numbers or cross-contact safety. Admin must enter independently evidenced ingredient/nutrient data; never treat unknown tags as a guarantee of no allergy.

The member's menu editor lets them add or edit a scheduled meal, choose the pre-existing recipe, change the planned time, remove individual meals and archive a whole plan. It blocks ownership violations, duplicate standard meal slots, more than four meals/day, removal of the last meal, inactive plans, unsafe/unavailable candidates and changed allergy restrictions. The backend recomputes daily calories from stored meals, rejects manual schedules exceeding a 12-hour eating window or ending within 3 hours of the user's bedtime, and the plan-archive action retains plan history. Manual archive disables silent regeneration until the member starts a new plan.

**Important design choice:** `DELETE` in Admin is a *soft deactivation*. `DELETE` for a whole member plan means *archive*, not historical SQL destruction. Existing meal-log records have their own CRUD and must not be implicitly rewritten when editing a future planned meal.

## Book-faithful rules and limitations

Available authorized public sources:

- Fondazione Valter Longo — adult longevity diet: https://www.fondazionevalterlongo.org/en/longevity-diet-for-adults/
- Valter Longo — The Longevity Diet (author's book page): https://valterlongo.com/the-longevity-diet/
- Background and boundaries of fasting-mimicking diet / health risks: https://www.fondazionevalterlongo.org/en/diabetes-obesity/

Current rule-led generator prioritizes plant-based dishes, legumes, whole grains, low refined sugar/saturated fat and moderate fish. The update adds a guard of at most **three fish-containing meals across overlapping seven-day windows** during generation, per-meal editing, regeneration and recommendation-v2 replacements. Existing patient data and historical plans are not bulk-rewritten.

**Do not claim literal 100% matching with every recipe and quantitative rule in the copyrighted book:** the complete book's pages and exact recipe appendix were *not* supplied. Public author/foundation guidance supports the named general principles, not independently verified numbers for each Admin-created dish. Existing rule weights and candidate nutrition estimates remain project heuristics. Individual food and recipe data must be checked against a legitimate food-composition data source before health-sensitive use.

### No “find a nutrition expert” product workflow

There is **no expert booking, roster, nutritionist account, expert marketplace, expert approval queue or required expert reviewer** implemented or requested. The member can manage normal nutrition data and daily plans without finding an expert. Safety screening and temporary blocking of contraindicated **FMD/restrictive diet** pathways remain necessary. The UI explains the external medical limitation without implying an in-app expert service.

## Actual AI versus deterministic recommendation

The original menu generator is a **deterministic rule/scoring engine**, not a generative large language model.

An **optional, opt-in local Ollama** adapter has been added. It receives only a list of allowed recipe codes/titles for each day and meal slot, and can return suggested codes as strict JSON. It is **not** permitted to create ingredient lists, macro values, clinical claims or recipe/source citations. The C# service rejects hallucinated codes and reruns safe candidate membership checks and fish limits before storing the menu. If the model fails or times out, it falls back to the rule-based plan with an explicit note that AI did not run successfully.

Default `src/LongevityDiet.API/appsettings.json`:
```json
"MealPlanningAI": {
  "Enabled": false,
  "Model": "",
  "OllamaUrl": "http://127.0.0.1:11434/"
}
```

To enable with your **own locally installed model**: install Ollama separately, pull a model you are authorized to use, ensure its HTTP API is reachable from the **API process/container**, then set `MealPlanningAI__Enabled=true`, `MealPlanningAI__Model=<your available model>` and `MealPlanningAI__OllamaUrl=<reachable base URL ending in />` via local environment configuration. **No Ollama model was found on the connected machine in this review.** The UI checks `GET /api/v1/meal-plans/ai-status` and disables AI mode when unconfigured, with the default rule-based generator still working.

AI is **not trained on, guaranteed to have read, or licensed to reproduce the full copyrighted book**. It only selects candidate IDs from an application-controlled list based on published principles, not clinical judgments. Configured-model generation still requires a real, explicit end-to-end deployment smoke test; unit tests with fake model responses are insufficient proof that a specific model is installed.

## Verification

- API and frontend build and lint: verified locally.
- Unit tests: **93/93 PASS** with fake AI candidate generator, rejected hallucinated candidate, and 14-day rolling fish-frequency checks.
- Integration tests: **105/105 PASS**, including CRUD and ownership, live Admin recipe propagation and deactivation, and an HTTP-stubbed Ollama JSON response constrained to allowlisted candidate codes.
- Frontend tests: **20/20 PASS**.
- New Playwright Docker browser E2E test: `tests/LongevityDiet.E2ETests/specs/meal-plan-crud.spec.ts`. It registers a synthetic account, completes safety screening, generates a seven-day plan, adds and edits a snack, verifies SQL/API readbacks, removes the snack, and archives the plan. **Pending its first full Docker run in GitHub CI.**
- GitHub CI and Docker E2E of this new branch must be checked before merging. The QA statements above do not substitute for testing a real Ollama model.
