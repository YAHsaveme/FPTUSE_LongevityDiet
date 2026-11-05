# LongevityDiet — Documentation for PRN232

Start with [PRN232 assignment summary](assignment/00-ASSIGNMENT-DOCUMENT.md).

## Minimal reading path

1. [Assignment requirements, scope and demo](assignment/README.md).
2. [Four official-scale diagrams](assignment/one-page/README.md):
   C0 System Context, C1 Containers, C2 REST API components and Draw.io core ERD (with DBML source).
3. [Real runtime connectivity and limits](assignment/04-RUNTIME-CONNECTIVITY.md).
4. [Docker, asynchronous workflow and demo supporting diagrams](architecture/README.md).
4. [Project status](PROJECT-STATUS.md) and [four-week team tasks](task/README.md).
5. [API/gRPC/event contracts](07-API-GRPC-EVENTS.md).
6. [Database and test/deployment notes](06-DATABASE-DESIGN.md),
   [09-TEST-DEPLOY-DEMO.md](09-TEST-DEPLOY-DEMO.md).

Source code is under ../src and ../tests; Docker Compose is at the repository root.
Database migrations in the source projects, not the ten-table teaching ERD,
remain authoritative.

The original larger planning designs have been backed up outside the repository
rather than presented as deployed coursework features.
