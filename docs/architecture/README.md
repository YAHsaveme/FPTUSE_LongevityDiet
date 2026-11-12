# Official LongevityDiet architecture

There are exactly five system-wide official diagrams in
[docs/assignment/one-page](../assignment/one-page/README.md):

- [C0 Context](../assignment/one-page/C0.drawio)
- [C1 Container Architecture](../assignment/one-page/C1.drawio)
- [C2 Component Architecture](../assignment/one-page/C2.drawio)
- [Database Diagram Overall](../assignment/one-page/Database%20Diagram.drawio)
- [Business Flow Overall](../assignment/one-page/Business%20Flow.drawio)

Each has one editable Draw.io source and one-page PDF, centered top to bottom,
orthogonal edges and detached arrow-label text. A strict geometry test
checks label/node collisions, and a SQL-backed test verifies 50 physical
tables and 20 within-owner FKs against the actual databases. In C1/C2 the six independent
service/database owners are ADR-005 **target** boundaries; the existing Web
continues to use transitional legacy routes and data until audited cutover.

RabbitMQ is now an actual **opt-in, metadata-only audit event mirror**, not
a planned, non-working icon. A real publisher/consumer runs in Worker Ops
with a durable queue/exchange and SQL-backed deduplication, while Redis
Streams remains the actual primary business transport. See
[the RabbitMQ integration guide](RABBITMQ-INTEGRATION-20261112.md).
