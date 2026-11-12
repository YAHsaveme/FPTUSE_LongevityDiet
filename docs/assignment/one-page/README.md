# LongevityDiet — five official top-down architecture diagrams (12/11/2026)

Exactly five official, editable Draw.io files, each with one single-page PDF,
are provided here. There are no secondary FULL, 32-table or sketch variants.

| Official diagram | Editable source | Printable one-page PDF | Purpose |
|---|---|---|---|
| C0 System Context | [C0.drawio](C0.drawio) | [C0.pdf](C0.pdf) | Member + Admin → one system boundary |
| C1 Container Architecture | [C1.drawio](C1.drawio) | [C1.pdf](C1.pdf) | Web → YARP → six service owners and databases → event brokers → Worker Ops |
| C2 Component Architecture | [C2.drawio](C2.drawio) | [C2.pdf](C2.pdf) | REST endpoint → application service → DbContext/owner event per domain |
| Database Diagram Overall | [Database Diagram.drawio](Database%20Diagram.drawio) | [Database Diagram.pdf](Database%20Diagram.pdf) | All 50 physical tables grouped by six SQL databases |
| Business Flow Overall | [Business Flow.drawio](Business%20Flow.drawio) | [Business Flow.pdf](Business%20Flow.pdf) | Member onboarding → plan → tracking → LDAS → outbox → Worker → report |

## Direction and readability

All views have a centered top-to-bottom narrative and uniformly spaced rows.
Each functional node has at least one native directed connection; branch
labels are separate white text blocks ABOVE horizontal or BESIDE vertical
arrows, not on the lines. Edges are orthogonal (no curves), the actors
are human UML stick figures and all drawings are black and white.

In C1 and C2, the left routing spine distributes API calls to six independently
owned domain REST APIs; the right event spine brings owner domain events to
asynchronous processing. **Those six owners are the ADR-005 target**, not
proof that the legacy Web/database migration has been completed.

In the Database Diagram, short horizontal links to the central vertical
spine mean **ownership by a database**, NOT physical FK relations. All **20
SQL-verified local foreign keys** are annotated at the foot of their owner
panels (Identity 4, Catalog 8, Planning 6, Tracking 2). The 50 physical
tables include Catalog's implicit many-to-many join table. Cross-owner
UUID/DomainEvent references never become SQL foreign keys.

The Business Flow keeps Admin (publishing RuleVersion) connected to
Catalog; FMD requests branch from Planning through an eligibility gate;
a failed FMD gate stops only FMD, not ordinary meal logging; a
successful FMD safety gate explicitly rejoins Tracking.

## Redis Streams and actual RabbitMQ integration

- Redis Streams TCP 6379 is the existing/primary domain event transport.
- RabbitMQ AMQP 5672 is **implemented in code and tested in isolated Docker
  QA**, but remains opt-in. The feature requires
  `RabbitMq:Enabled=true` and an explicitly configured broker.
- Source: `src/LongevityDiet.Worker.Ops/RabbitMqDomainAudit.cs`.
  The RabbitMQ audit mirror uses a separate Redis consumer group, persistent
  topic exchange, a durable queue, publisher confirmations, manual ACK
  **after** Worker-owned SQL commit, unique SQL source/EventId deduplication,
  and a durable dead-letter queue.
- It mirrors event metadata only (source/EventId/eventType/streamId), not
  personal or nutritional payloads. It does not yet replace the business
  reminder or weekly-report Worker.
- It is enabled only with `docker-compose.rabbitmq.yml`; default Compose
  continues to operate using Redis. There is no public AMQP/management port.

## Regenerate and verify

```powershell
Set-Location D:\PRN232\FPTUSE_LongevityDiet
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Export-OverallDiagrams.ps1
node scripts/Validate-OfficialArchitecture.js
node scripts/Validate-OfficialDiagram-Geometry.js --strict
node scripts/Validate-CourseLinks.js
# Real six-database SQL reconciliation (isolated QA Docker services running):
node scripts/Test-Physical-ERD-Sql.mjs
```

QA RabbitMQ test (synthetic data only; requires isolated QA Docker Compose
stack with SQL, Redis, Worker Ops and RabbitMQ):

```powershell
node scripts/Test-RabbitMq-Domain-Events.mjs
```

The superseded diagrams and their binary sources were saved outside the
repository at:
`D:\PRN232\_architecture_diagram_backup_before_cleanup_20261112.zip`.
