# LongevityDiet - Daily Meal & Wellness Journey acceptance checkpoint

Date: 10 Nov 2026 (Asia/Ho_Chi_Minh)
Branch: feature/w3-t4-rule-governance-20261109
Scope: members 1 + 4; PRN232 Final Assignment; continuous meal journey
Status: PARTIALLY VERIFIED - NOT 100% ACCEPTED.

## 1. Implemented flows and boundaries

| ID | Flow | Status |
|---|---|---|
| W01 | Registration, JWT, member profile, age and time zone | Existing code and API tests |
| W02 | Health screening, allergies reviewed, health risk flags | Implemented. Risk groups require professional review |
| W03 | Grouping: adult, older adult, adolescent, age unknown, professional review, wellbeing review | Implemented rules; NOT medically validated diagnosis |
| W04 | Rolling 14 days with daily meals, no duplicate plan when still covered | API + integration tested. Refreshes on eligible app visits, NOT overnight offline |
| W05 | Manual generate, regenerate, replace meal and current plan all check screening | Implemented. Allergy changes invalidate outdated daily choices |
| W06 | Baseline, During, FollowUp daily check-in: energy, mood, digestion, sleep, symptoms, body changes, notes, optional weight | Implemented EF model + JWT scoped CRUD |
| W07 | Repeated low wellbeing or reported emergency symptoms block self-directed automated planning | Implemented and tested; self-reported ratings are not a clinical assessment |
| W08 | Daily form shown in planner, opt-in MealLogging reminder also asks about wellness | Implemented; reminder requires running Worker/broker and user opt-in |
| W09 | History, 30-day display and 365-day summaries | Implemented; not evidence that diet improved health |
| W10 | Safe recognition of common Vietnamese/English allergens; unknown terms fail closed | Implemented and tested; not safe to infer cross-contact or complete ingredient labels |

Important: menu suggestions use deterministic candidate recipes with illustrative nutrition data. Complete nutrient sufficiency, energy/protein requirements for each individual, clinically validated ingredients, medicine interactions, allergic cross-contact and real lifespan outcomes have NOT been established. High-risk users must consult a qualified dietitian/clinician.

## 2. Physical database and diagrams

The CURRENT EF migration snapshots map 56 physical SQL tables: LongevityDietDb 45, LongevityTrackingDb 7, LongevityWorkerDb 4. There are 23 EF-defined physical SQL foreign keys, plus 50 documented business/operational APP links. Cross-database links are NEVER represented as physical SQL foreign keys.

Additional single-page full diagram:
- docs/assignment/one-page/Database Diagram FULL.drawio (native editable)
- docs/assignment/one-page/Database Diagram FULL.pdf (vector PDF)
- docs/assignment/one-page/full-schema-manifest.json (manifest)
- scripts/Generate-CompleteSchemaDiagram.js (generator)
- scripts/Validate-CompleteSchemaDiagram.js (validation)

Full-diagram QA verified 56/56 represented and connected, 23 SQL FK and 50 APP links, one page, monochrome, 73 native arrows. These checks do not prove that every semantic relationship or caption is ideal.

The original C0/C1/C2/Database Diagram set still reflects a historical 32-table subset. It is NOT an accurate full physical model of the latest implementation. The legacy Validate-OverallDiagrams.js currently FAILS because the EF table count, FK count and number of diagram files increased. This is an OPEN deliverable rather than a passing acceptance gate. Current physical-schema PDF is the new FULL file, not the historical one. Completing a comprehensive updated C2 diagram remains open.

## 3. Automated checks

Run from repository root in PowerShell:

    dotnet build LongevityDiet.sln -c Release --nologo -v:q
    dotnet test LongevityDiet.sln -c Release --nologo -v:q
    npm --prefix src/LongevityDiet.Web run lint
    npm --prefix src/LongevityDiet.Web run build
    npm --prefix src/LongevityDiet.Web test
    node scripts/Validate-CompleteSchemaDiagram.js
    node scripts/Validate-OverallDiagrams.js
    docker compose --env-file .env.example config --quiet

Previous passing checkpoint: 90 unit tests and 79 integration tests. Repeat after final edits and record actual current outputs. EF migration WellnessLongitudinalJourney was generated; model snapshot was checked for no pending changes. It has NOT been applied on a fresh production-equivalent SQL Server at this checkpoint.

Machine had approximately 1.1 GB free on C: during audit. Full Docker SQL Server stack was NOT launched here to avoid filling system disk or deleting unrelated project images.

## 4. PRN232 Final Assignment rubric

| Criterion | Weight | Evidence | Outstanding acceptance proof |
|---|---:|---|---|
| Architecture and design | 20% | C0/C1/C2 baseline + 56-table Full ERD | Update canonical C2 to actual scope; manually inspect rendering |
| REST API | 20% | JWT, layered API/services/repos, CRUD/search/filter/page, wellness endpoints, automated tests | Live Swagger / JWT / roles demonstration |
| Background jobs | 10% | Worker scheduling/outbox + reminders | Real scheduled execution, retry, persisted status |
| Broker | 15% | Redis Streams producer/consumer in source | Live XADD, group consumer, ACK, durable side effect |
| gRPC | 15% | Separate Recommendation.Grpc and API adapter | Live REST -> independent gRPC -> UI response and failure handling |
| Docker or Cloud | 10% | Dockerfiles and Compose validated statically | Fresh full stack, real SQL migrations, readiness, restart test |
| Documents/demo | 10% | README, source, migrations, editable diagrams, evidence | Fresh-machine instructions, all 7 live demonstrations/screenshots |

The original final assignment permits Redis Streams OR Kafka and Docker Compose OR cloud. Both alternatives are not required.

## 5. Seven-step live demo needed

1. Explain architecture and distinguish actual physical SQL constraints from APP links.
2. Swagger: JWT login; profile, allergies, screening, generate/current and check-in API with unauthorized case.
3. Show an actual timed Worker reminder and persisted dispatch.
4. Publish, consume and ACK a Redis Stream event with duplicate suppression.
5. Show API invoking independent Recommendation.Grpc and responding when unavailable.
6. Start Docker stack; run database migrations; confirm healthy interservice connectivity.
7. Walk through register -> screening -> 14-day meals -> daily meal logging -> baseline/during/follow-up check-ins -> allergy/health-change safety response -> ongoing plan.

## 6. Safety and evidence references

WHO Healthy diet (updated 26 January 2026):
https://www.who.int/news-room/fact-sheets/detail/healthy-diet

NIDDK Pregnancy if You Have Diabetes, individual guidance and dietitian care:
https://www.niddk.nih.gov/health-information/diabetes/diabetes-pregnancy

Nutrition principles include adequacy, balance, moderation and diversity. They do not establish a specific life-extending meal prescription for each user.

## 7. Honest release decision

NOT 100% COMPLETE. Remaining blockers: independent dietitian review of candidate recipes, allergy source/cross-contact validation, complete nutrient calculations, full canonical C2 update, running SQL Server migration in real Compose stack, full Redis/gRPC/Worker live demonstrations, privacy/retention review. Commit only the verified work on the feature branch; do not push confidential data or falsely mark production safe. Do not merge into main/develop before full verification.
