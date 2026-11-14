# LongevityDiet — Gemini demo on Docker Desktop (Windows)

This is a **local-only demonstration**. No cloud deployment, domain, public
exposure, paid hosting or nutrition-expert account is required.

## Prerequisites

- Docker Desktop is running with the Linux container engine.
- The repository is at `D:\PRN232\FPTUSE_LongevityDiet`.
- Local `.env` exists (see `scripts/Initialize-LocalDevelopment.ps1`)
  and contains SQL Server and JWT development credentials. It is Git-ignored.
- In Visual Studio, `LongevityDiet.API` -> **Manage User Secrets**
  contains `"Gemini:ApiKey": "<your API key>"`.
  Do NOT paste a key into this README, Compose files or ChatGPT.

## Start (one PowerShell command)

From the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Start-Gemini-Docker-Demo.ps1
```

The script reads the Gemini key from your existing local ASP.NET Core
**User Secrets**, temporarily passes it to Docker Compose as a process
variable, and deletes that process variable when the command finishes.
It does **not** create an API-key file or edit `.env`.

The optional overlay `docker-compose.gemini-demo.yml` is the only place
that maps `GEMINI_API_KEY` to the **API** container's `Gemini__ApiKey`.
No other service (including React/Nginx) receives it.

The overlay intentionally uses **isolated SQL and Redis Docker volumes**:

- `longevity-gemini-demo-sql-data`
- `longevity-gemini-demo-redis-data`

This avoids modifying or destroying old project data when historical SQL
volumes and the current `.env` have different passwords. **Do not run
`docker compose down -v`** unless you explicitly intend to delete data.

The key is visible to anyone with local Docker administrator/container
inspection access because it is stored in the API container environment.
That is an accepted **local demo compromise**, not production secret
management. For deployment, use platform secrets or Docker Secrets.

## Access

- Web: http://127.0.0.1:5173
- API: http://127.0.0.1:8080
- Only localhost ports are exposed by the normal Compose file.
- Gemini is optional. In the planner, you must deliberately enable
  **Use AI to choose from the safe recipe catalog**. Without AI selected,
  the deterministic rule-based menu generator still works.

## Verify live Gemini + database

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Test-Gemini-Docker-Demo.ps1
```

The live QA script creates a **synthetic account** (never uses the real
user's credentials), reviews allergies, generates a seven-day plan with
`useAi=true`, checks that Gemini's actual choices were accepted, reads
the persisted plan from SQL through the API, adds/updates/deletes a
scheduled snack, and verifies 7 days / 21 meals remain. One execution
uses one real Gemini `generateContent` request; check your AI Studio
quota and billing settings before repeating it unnecessarily.

A positive result includes:

```text
GEMINI_PROVIDER_RESULT=AI_CHOICES_VERIFIED
DOCKER_GEMINI_E2E=PASS DAYS=7 MEALS=21
```

If Gemini is unavailable, the backend **safely falls back** to the
rule-based generator. The QA script deliberately marks that as NOT
passing live Gemini acceptance.

## Real Gemini browser UI acceptance (opt-in)

To verify the actual React UI flow after starting Docker Desktop,
navigate to `tests/LongevityDiet.E2ETests` and run:

```powershell
$env:GEMINI_LIVE_UI = "1"
npx playwright test --config playwright.docker.config.ts gemini-live-ui.spec.ts
Remove-Item Env:GEMINI_LIVE_UI
```

This uses a separate synthetic account, opens the planner in Edge,
checks Gemini availability, enables the AI checkbox, creates a seven-day
menu, verifies AI usage in the explanation, and reads 21 saved meals via
the API. **PASS: 1/1 real browser E2E** on the local Docker Desktop demo,
with a real Gemini call. The test is skipped by default in GitHub CI
to avoid external AI calls and API secret requirements.

## Stop (preserve all Docker volumes)

From the repository root:

```powershell
docker compose down
```

**Do not add `-v`.** To restart the isolated Gemini demo later, always
use the dedicated Start script with the overlay. Running plain
`docker compose up` points SQL to the normal project volume, which may
have different credentials.

## Nutrition safety and scope

The Gemini model receives only prefiltered recipe codes/names, dates,
meal slots and general food-category tags. It does not receive user
accounts, the medical questionnaire, allergy profile or diary. The
backend remains responsible for safety screening, allergen and
restriction checks, candidate existence, and fish-frequency rules.
Admin-entered nutrient data and the underlying book correspondence
remain subject to independent verification. This demo is not a
clinical dietary prescription.

General author-published principles:
https://www.fondazionevalterlongo.org/en/longevity-diet-for-adults/

## Verification (14 November 2026)

- Gemini key discovered safely in User Secrets.
- Google model-list request returned HTTP 200; model
  `gemini-3.5-flash-lite` was available.
- Docker Desktop: SQL/Redis healthy, all six core containers running.
- API container key matches User Secrets (comparison only, value never logged).
- Real Gemini completion returned **21 accepted choices from 21**.
- Full synthetic-account menu creation/readback/CRUD QA finished
  **PASS: 7 days, 21 persisted meals**.
- Local Docker demo is currently intentionally scoped to the device;
  nothing was deployed publicly.
