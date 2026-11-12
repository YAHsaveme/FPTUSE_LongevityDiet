# LongevityDiet — Official architecture

There is exactly one editable Draw.io + single-page PDF for each of the five
official system-wide views. All are housed in
[docs/assignment/one-page](../assignment/one-page/README.md):

- [C0 — System Context](../assignment/one-page/C0.drawio)
- [C1 — Container Architecture](../assignment/one-page/C1.drawio)
- [C2 — Component Architecture](../assignment/one-page/C2.drawio)
- [Database Diagram — Overall](../assignment/one-page/Database%20Diagram.drawio)
- [Business Flow — Overall](../assignment/one-page/Business%20Flow.drawio)

C1, C2 and Business Flow mark **RabbitMQ** as a planned AMQP broker,
distinct from active Redis Streams. No RabbitMQ code has been deployed.
The six database owners are an ADR-005 target architecture and do not
prove the legacy data migration is complete. See the [handover guide](../assignment/one-page/README.md).
