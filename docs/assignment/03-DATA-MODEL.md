# Database Model — Core ERD for PRN232

The course requires EF Core with a relational database and migrations.
It does not demand 33 business tables or six separately deployed databases.

## Core ERD

[Editable DBML](one-page/04-database-core.dbml) |
[one-page PDF](one-page/04-database-core.pdf) |
[vector SVG](one-page/04-database-core.svg).

Ten representative **existing** entity tables are included:
- Identity: Users, UserProfiles, RefreshTokens, ReminderPreferences,
  UserNotifications.
- Tracking: ActivityLogs, ActivityGoals, AdherenceScores, ScoreDimensions.
- Worker: ReminderSchedules.

These represent three existing EF Core database ownership areas, but do
not imply actual foreign keys between databases. Only five relationships
are drawn, each implemented within an owner.

## Honest physical scope

The current source contains **18 EF Core mapped entity tables**. Outbox,
inbox, dispatch, signal and configuration tables omitted from the teaching
view remain in the code and migrations. This ERD intentionally includes
representative columns rather than pretending to be a full SQL DDL export.

Authoritative physical source:
- src/LongevityDiet.Repositories/LongevityDietDbContext.cs
- src/LongevityDiet.Tracking/TrackingDbContext.cs
- src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs

Only use EF Core migrations to apply actual database changes, not the
ten-table teaching diagram. The score is educational; missing upstream
meal/eating-window inputs do not prove a complete LDAS result.

DBML documentation: https://dbml.dbdiagram.io/docs/
