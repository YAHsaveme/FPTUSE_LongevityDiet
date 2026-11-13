# PRN232 — Gemini API meal candidate integration (14 November 2026)

## Status

- The application has a server-side Gemini REST adapter at
  `src/LongevityDiet.API/AI/GeminiMealChoiceGenerator.cs`.
- The user's development key is stored under `Gemini:ApiKey` in ASP.NET Core
  User Secrets outside the Git repository. **Never print, commit, share, or put
  the key in React or appsettings.json.** There is no key in this document.
- Default AI provider is `Gemini` using model `gemini-3.5-flash-lite`.
  Access to particular models varies by Google account and region.
- Frontend AI checkbox is **OFF by default**. Opening the page, fetching
  candidate lists, and creating plans in rule-only mode incur no Gemini calls.
- If a key is missing in the API runtime, AI status reports disabled.
  The rules-based planner works without Gemini.
- **Gemini adapter verified with HTTP-stubbed tests, NOT yet verified against
  Google's actual live service using this user's credentials.** A configured
  key is not a successful model response or proof of account quota.

## Architecture and mandatory safety

The request pathway is:

`Web (optional AI checkbox) -> JWT API -> profile/screening and allergies ->
active verified-candidate list -> Gemini code selection -> server-side candidate
allowlist/rule/fish-frequency checks -> database`.

Only candidate codes, titles, dates, meal slots and broad food indicators
(legume/whole-grain/fish) are supplied to Gemini. **Never send real names,
email, age, diagnosis, health diary, allergens, current medications or JWT
tokens to Google.** A filtered list may still reveal food preferences.

Gemini cannot create unknown recipes or supply new calories, ingredient
quantities, medical facts, nutritional guarantees or purported book passages.
The server rejects hallucinated candidate codes, dates, meal slots and
duplicates. It still applies allergy and dietary hard constraints.
If Gemini times out, exceeds quota, is unavailable or returns invalid JSON,
the plan falls back to deterministic generation and the plan explanation
states that the AI selection did not run successfully.

The published principles are linked to:
https://www.fondazionevalterlongo.org/en/longevity-diet-for-adults/

The full copyrighted book has not been ingested or verified. Rules are
project-specific translations of publicly published guidance; the data is
not a clinically validated prescription, and nutrient/ingredient records
added by Admin require independent source verification. **No nutrition expert
account, appointment booking or expert-approval module is required.**

## Development configuration (local ASP.NET Core)

Keep the existing private User Secrets value:

`Gemini:ApiKey` (stored through Visual Studio → API project → Manage User
Secrets). In `src/LongevityDiet.API/appsettings.json` the non-secret defaults:

```json
{
  "MealPlanningAI": { "Enabled": true, "Provider": "Gemini" },
  "Gemini": { "Model": "gemini-3.5-flash-lite" }
}
```

User Secrets are loaded automatically by ASP.NET Core when the API runs with
`ASPNETCORE_ENVIRONMENT=Development`. The frontend displays `Gemini API`
only when the API has registered a configured provider and never receives the
secret. An AI checkbox controls each member request; it is not auto-enabled
just because a key exists.

For another Google-supported model, override `Gemini:Model` **without
hardcoding any key**. For Ollama: configure
`MealPlanningAI:Provider=Ollama`, `MealPlanningAI:Model` and
`MealPlanningAI:OllamaUrl`. Gemini and Ollama are never both registered as
the active provider.

## Docker/deployment

ASP.NET Core *User Secrets are not copied to Docker containers*. To use
Gemini inside the API container, supply the secret to that container using
a secure environment/secret-management mechanism, mapped to configuration
key `Gemini__ApiKey`. Do **not** put the actual value in a tracked Compose
file, `docker build --build-arg`, frontend `VITE_*` variable or log.
A deployment without this secret uses the deterministic fallback.

Google's Free Tier may have separate quota and data-usage policies from
paid usage. Model selection and quota must be reviewed in the user's own
AI Studio project before a real production release. The assistant did not
modify billing settings or create paid subscriptions.

## QA evidence and acceptance boundaries

- .NET unit: **93/93 passed**.
- .NET integration: **109/109 passed**, including 4 Gemini HTTP-stub tests.
- React/Vite: **20/20 passed**, plus lint, build and zero-warning backend build.
- The current 14 Playwright Docker E2E tests still need a CI run on this
  feature branch; they cover the rules-only experience, not a live Gemini key.
- A real one-off Gemini API response and authenticated app journey are needed
  before claiming *live Gemini integration acceptance*.
- Existing technical QA and green CI do not represent medical certification,
  professional approval, or an instructor grade.

Primary API documentation:
https://ai.google.dev/api
https://ai.google.dev/gemini-api/docs/api-key
https://ai.google.dev/gemini-api/docs/models
