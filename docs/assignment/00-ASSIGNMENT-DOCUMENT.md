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

The **canonical current** database diagram covers **56 actual EF migration-mapped tables** across three catalogs, with **23 SQL foreign keys** and **32 visible application associations** (50 source-backed associations are documented in `one-page/full-schema-manifest.json`). C2 documents all **22 current API controllers**. C0/C1/C2/ERD have native Draw.io and one-page PDF versions, with 0 connector crossings and 0 label cuts in SVG geometry QA. The original 32-table baseline drawings are archived in `legacy-diagrams/`. Diagram correctness does **not** replace a production Docker/SQL/Redis/gRPC/Worker smoke test, nor a dietitian review of recipe data.

## Presentation notes

Demo register/login → profile → activity tracking → reminder preference →
Redis event → Worker → notification read. Show JWT, Swagger, Redis streams
and Docker evidence; the REST→gRPC interaction is now implemented and
covered by a real HTTP/2 integration test, while live Docker/SQL Server
deployment still requires separate verification.
