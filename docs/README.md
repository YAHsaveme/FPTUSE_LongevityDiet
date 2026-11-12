# LongevityDiet documentation

1. [Assignment guide](assignment/README.md)
2. [Five official top-down diagrams: C0, C1, C2, Overall ERD, Business Flow](assignment/one-page/README.md)
3. [RabbitMQ publisher/consumer implementation and QA](architecture/RABBITMQ-INTEGRATION-20261112.md)
4. [Runtime connectivity evidence and limitations](assignment/04-RUNTIME-CONNECTIVITY.md)
5. [ADR-005 architecture notes](architecture/README.md)
6. [Project status](PROJECT-STATUS.md) and [team task evidence](task/README.md)

The editable diagrams are monochrome, connected, centered top-to-bottom
views. EF Core DbContexts and SQL migrations under src/ remain the
physical schema source of truth. Redis Streams is the current primary
business transport; RabbitMQ is an opt-in, QA-verified event audit
publisher/consumer, not a completed replacement. Historical
legacy-data migration and review are still required.
