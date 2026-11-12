# LongevityDiet — Five official diagrams (12/11/2026)

This folder is the only handover location for architecture drawings.
Exactly five official editable Draw.io files are provided, each paired with
one single-page PDF. All drawings use black and white only, a consistent
orthogonal connector style, high-level labels and UML stick-figure actors.

| Diagram | Native source | PDF | Scope |
|---|---|---|---|
| C0 — System Context | [C0.drawio](C0.drawio) | [C0.pdf](C0.pdf) | Member, Admin, LongevityDiet boundary |
| C1 — Container Architecture | [C1.drawio](C1.drawio) | [C1.pdf](C1.pdf) | Web, YARP, six service owners, six SQL DBs, Redis Streams and planned RabbitMQ |
| C2 — Component Architecture | [C2.drawio](C2.drawio) | [C2.pdf](C2.pdf) | Endpoint, application service, owner DB/Outbox per domain |
| Database Diagram — Overall | [Database Diagram.drawio](Database%20Diagram.drawio) | [Database Diagram.pdf](Database%20Diagram.pdf) | All 49 target-owner tables, six distinct catalogs, only source-confirmed within-catalog FKs |
| Business Flow — Overall | [Business Flow.drawio](Business%20Flow.drawio) | [Business Flow.pdf](Business%20Flow.pdf) | Member, FMD safety, async event delivery and admin governance |

## Important implementation distinction

- Redis Streams TCP 6379: implemented and exercised in current Docker QA.
- RabbitMQ AMQP TCP 5672: planned messaging option, not an implemented
  producer/consumer. It is marked **PLANNED / NOT DEPLOYED** in C1, C2
  and Business Flow; it is intentionally absent from the DB Diagram and C0.
- The six domain databases are the ADR-005 target migration layout. Existing
  production-style Web and some legacy API flows still use the legacy
  database; the target Gateway is opt-in. Never mistake the target drawing
  for verified production cutover.
- Cross-domain UUID/event references are not physical SQL foreign keys.
- C0, C1 and C2 are overall views, not separate diagrams for each service.

## Regenerate and verify

```powershell
Set-Location D:\PRN232\FPTUSE_LongevityDiet
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Export-OverallDiagrams.ps1
node scripts/Validate-OverallDiagrams.js
node scripts/Validate-CourseLinks.js
```

The previous FULL, 32-table, and experimental drawing variants were removed
from Git. Their binary source files were backed up **outside** the repository
before removal at
`D:\PRN232\_architecture_diagram_backup_before_cleanup_20261112.zip`.
They are no longer part of project submission.
