# LongevityDiet — official architecture submission

The group has exactly five official system-wide, one-page views:

- [C0 Context](one-page/C0.drawio)
- [C1 Container Architecture](one-page/C1.drawio)
- [C2 Component Architecture](one-page/C2.drawio)
- [Database Diagram Overall](one-page/Database%20Diagram.drawio)
- [Business Flow Overall](one-page/Business%20Flow.drawio)

Every diagram is editable in Draw.io, has one single-page PDF, uses
top-to-bottom flow, native connected arrows and clean labels positioned
apart from arrow strokes. No duplicate FULL/old drawing is present.
See the [official diagram index](one-page/README.md) and
[system architecture explanation](02-SYSTEM-ARCHITECTURE-C4.md).

C1/C2 model six ADR-005 service owners and six SQL catalogs. The overall
ERD represents 50 source-confirmed physical target owner tables, grouped by
catalog ownership (not invented SQL foreign keys).

Redis Streams remains the primary business event transport. RabbitMQ
is implemented and QA-tested as an **optional metadata-only event audit
mirror** with persistent durable queue and SQL-backed receipt dedupe.
See the [RabbitMQ guide](../architecture/RABBITMQ-INTEGRATION-20261112.md).
The target architecture is not yet an approved production migration.
