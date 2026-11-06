# Database Diagram — Full current physical model

[Database Diagram (Draw.io)](one-page/Database%20Diagram.drawio) | [PDF](one-page/Database%20Diagram.pdf)

**One diagram** contains all 32 EF Core-mapped tables and all 9 real SQL foreign keys. Three real catalogs are represented:

| Catalog | Mapped tables | Local enforced FKs |
| --- | ---: | ---: |
| LongevityDietDb: Identity, Planning, Recommendation, FMD | 21 | 8 |
| LongevityTrackingDb: Activity + Adherence | 7 | 1 |
| LongevityWorkerDb: Reminder Worker | 4 | 0 |
| **Total** | **32** | **9** |

The 32 table cards are grouped by database; the 9 real SQL FK arrows connect directly between the corresponding parent and child table cards within the SAME drawing. Cross-database UserId values and Redis event IDs are application-level references, not physical SQL FKs.

Sources: src/LongevityDiet.Repositories/LongevityDietDbContext.cs; src/LongevityDiet.Tracking/TrackingDbContext.cs; src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs.

The separate [future longitudinal nutrition target](05-LONGITUDINAL-NUTRITION-TARGET.md) and [52-table DBML](nutrition-target-52-tables.dbml) are research artifacts and are NOT included as currently deployed tables.
