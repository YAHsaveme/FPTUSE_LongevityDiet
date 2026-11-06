# Database Model — Verified Current Source and Future Nutrition Target

The course uses EF Core, SQL Server and migrations. This file distinguishes the implemented model from the separately proposed longitudinal nutrition schema. Passing source-model checks is not proof of live SQL deployment or clinical safety.

## 1. Teaching ERD (10 representative tables)

- [Editable Draw.io](one-page/04-database-core.drawio)
- [Editable DBML](one-page/04-database-core.dbml)
- [One-page PDF](one-page/04-database-core.pdf)
- [Vector SVG](one-page/04-database-core.svg)

The teaching diagram includes 10 of the **32 real EF Core mapped entity tables** and **five** of the **nine** locally enforced SQL foreign keys. It is intentionally a simplified view, not an exhaustive physical SQL schema.

## 2. Complete merged physical model (current code)

- [All 32 mapped EF Core tables — editable catalog](one-page/06-full-physical-database.drawio) | [PDF](one-page/06-full-physical-database.pdf)
- [All 9 locally enforced SQL foreign keys — individual connected arrows](one-page/17-physical-sql-fk-audit.drawio) | [PDF](one-page/17-physical-sql-fk-audit.pdf)
- [Machine-checkable model manifest](one-page/physical-model-manifest.json)

The three logical SQL database catalogs are:

| Database | Real EF Core mapped tables | Physical foreign keys |
| --- | ---: | ---: |
| LongevityDietDb (Identity, Planning, Recommendation, FMD) | 21 | 8 |
| LongevityTrackingDb (activity, goals, LDAS) | 7 | 1 |
| LongevityWorkerDb (reminder processing) | 4 | 0 |
| **Total** | **32** | **9** |

The merged source now includes MealPlans, MealPlanDays, PlannedMeals, MealLogs, MealLogItems, eating-window snapshots, recommendation feedback and FMD cycle tracking. Tables intentionally lacking SQL foreign keys remain represented in the complete catalog; cross-database user references and Redis event correlations are **logical**, not enforced SQL FKs.

Use these EF Core DbContexts and their migrations as the source of truth:

- `src/LongevityDiet.Repositories/LongevityDietDbContext.cs`
- `src/LongevityDiet.Tracking/TrackingDbContext.cs`
- `src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs`

The **TeamIntegrationModelSnapshot** bridge migration contains intentionally empty Up/Down methods because both teams' earlier migrations already define the tables. Its regenerated model snapshot includes all merged entities, without repeated CREATE TABLE operations.

## 3. Future nutrition target — not migrated

The separate [longitudinal nutrition target](05-LONGITUDINAL-NUTRITION-TARGET.md) proposes **52 additional logical table models and 74 relationships** for long-horizon daily meal plans, sourced allergen checks, check-ins and longitudinal health signals. These are architecture/specification artifacts, **not the current physical SQL schema** and not clinician-validated dietary recommendations. No live database was migrated when generating the diagrams.

Generate/verify the actual physical views from current mapped source:

```powershell
node scripts/Generate-FullPhysicalDatabase.js
node scripts/Validate-ArchitectureTopology.js
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Export-CourseDiagrams.ps1
```

DBML reference: https://dbml.dbdiagram.io/docs/
