# LongevityDiet documentation

1. [Assignment requirements and guide](assignment/README.md)
2. [Five official diagrams: C0, C1, C2, Database Diagram, Business Flow](assignment/one-page/README.md)
3. [Runtime connectivity evidence and limitations](assignment/04-RUNTIME-CONNECTIVITY.md)
4. [Architecture explanation and ADR notes](architecture/README.md)
5. [Project status](PROJECT-STATUS.md) and [team task evidence](task/README.md)

The five official architecture/business views are one-page PDFs plus
editable Draw.io files. The EF Core source and migrations under src/
remain the source of truth for persisted schema. RabbitMQ appears only
as PLANNED in C1, C2 and Business Flow; Redis Streams is implemented.
Do not confuse the ADR-005 target six-database design with completed
legacy-data migration or production cutover.
