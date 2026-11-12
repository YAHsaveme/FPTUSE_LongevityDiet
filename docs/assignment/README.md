# LongevityDiet — Five official overall diagrams

The architectural handover consists of exactly five system-wide drawings:

- [C0 — System Context](one-page/C0.drawio)
- [C1 — Container Architecture](one-page/C1.drawio)
- [C2 — Component Architecture](one-page/C2.drawio)
- [Database Diagram — Overall](one-page/Database%20Diagram.drawio)
- [Business Flow — Overall](one-page/Business%20Flow.drawio)

Every drawing has one editable .drawio and one one-page .pdf in the
[official one-page folder](one-page/README.md). No 32-table, FULL or
other duplicate diagram is kept in the repository.

C1 and C2 describe the six-service ADR-005 target, not a fully migrated
production environment. The Database Diagram lists 49 target-owned
tables across six SQL Server catalogs. Active Redis Streams and
planned RabbitMQ/AMQP are clearly distinguished on the relevant diagrams.

Source of truth for physical tables is the EF Core DbContext/migration
files under src/. Existing business/data descriptions and historic
dated audits are prose evidence, not additional official diagrams.
