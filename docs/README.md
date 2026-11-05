# LongevityDiet — PRN232 documentation

Start with the [PRN232 assignment](assignment/00-ASSIGNMENT-DOCUMENT.md).

## Quick navigation

1. [Assignment guide](assignment/README.md)
2. [C0/C1/C2, DBML ERD and end-to-end sequences](assignment/one-page/README.md)
3. [Live connectivity evidence and limitations](assignment/04-RUNTIME-CONNECTIVITY.md)
4. [Docker and Redis supporting views](architecture/README.md)
5. [Project status](PROJECT-STATUS.md) and [team task evidence](task/README.md)
6. [API/gRPC/event contracts](07-API-GRPC-EVENTS.md)
7. [Database notes](06-DATABASE-DESIGN.md) and [test/deployment plan](09-TEST-DEPLOY-DEMO.md)

The simplified ERD is educational; EF Core migrations under src are the
source of truth for the physical database. The complete runtime sequence
is separate from C4 to avoid overloaded architecture diagrams.
