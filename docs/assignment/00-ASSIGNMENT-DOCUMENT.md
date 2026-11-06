# PRN232 Final Assignment — LongevityDiet Companion

**Source:** the user-supplied three-page PRN232 - Final Assignment.pdf.
**Goal:** build and demonstrate a distributed .NET application in a manageable
student-project scope. This document reports evidence, not production claims.

## Product scope

LongevityDiet helps members register, maintain profiles, record activities,
view educational adherence information, configure reminders and read notifications.
Administrators are authorized system users.

## Required technical deliverables

| PDF requirement | Project implementation / demonstration evidence |
| --- | --- |
| ASP.NET Core REST API, CRUD and layered code | LongevityDiet.API + Services + Repositories + Tracking |
| JWT authentication, search/filter/sort/pagination | Identity/Auth and activity endpoints; verify each in Swagger |
| Background job | LongevityDiet.Worker schedules reminders |
| Redis or Kafka: producer AND consumer | Redis Streams; Identity Outbox and Worker consumer/notification result |
| Independent gRPC service and API interaction | ActivityCoach.Recommend called by JWT-protected REST endpoint; real HTTP/2 Kestrel-to-REST integration PASS (SQLite test DB). Docker/SQL Server E2E still outstanding |
| EF Core / relational database | SQL Server; Identity, Tracking and Worker DbContexts; migrations retained |
| Docker Compose or public cloud | docker-compose.yml and Dockerfiles; full live SQL Server deployment validation still pending |
| API documentation | OpenAPI/Swagger |
| README, architecture, testing and demo | Root README + these assignment diagrams and tests |

## Grading focus

System architecture/design **20%**; REST API **20%**; background job **10%**;
message broker **15%**; gRPC **15%**; Docker/cloud **10%**;
documentation and presentation **10%**.

## Four canonical one-page diagrams

- [C0 Context (Draw.io)](one-page/C0.drawio)
- [C1 Containers (Draw.io)](one-page/C1.drawio)
- [C2 REST API Components (Draw.io)](one-page/C2.drawio)
- [Database Diagram (Draw.io)](one-page/Database%20Diagram.drawio)

[One-page PDFs, editing/QA instructions](one-page/README.md).

Only implemented business tables are represented. The ERD is a 10-table
**teaching subset** of the 32 EF Core mapped tables after team integration; the actual migration
history is authoritative. Omitted outbox and bookkeeping tables still exist.

## Presentation notes

Demo register/login → profile → activity tracking → reminder preference →
Redis event → Worker → notification read. Show JWT, Swagger, Redis streams
and Docker evidence; the REST→gRPC interaction is now implemented and
covered by a real HTTP/2 integration test, while live Docker/SQL Server
deployment still requires separate verification.
