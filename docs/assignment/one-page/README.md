# PRN232 | LongevityDiet — Four diagrams for the final assignment

This is a **student course project**, not a production-scale microservice architecture.
The original three-page PRN232 Final Assignment PDF requires a layered REST API,
an independent gRPC service, a background worker, Redis/Kafka messaging and Docker/cloud.

## Submission diagrams — one page each

| View | Editable source | Vector export | Scope |
| --- | --- | --- | --- |
| C0 · System Context | [Draw.io](01-c0-system-context.drawio) | [PDF](01-c0-system-context.pdf) | Member, administrator and LongevityDiet |
| C1 · Containers | [Draw.io](02-c1-container-architecture.drawio) | [PDF](02-c1-container-architecture.pdf) | Web, REST API, gRPC, Worker, Redis and SQL |
| C2 · REST API Components | [Draw.io](03-c2-api-components.drawio) | [PDF](03-c2-api-components.pdf) | Controllers → services → EF Core and Redis bridge |
| Core Database ERD | [DBML](04-database-core.dbml) | [SVG](04-database-core.svg) / [PDF](04-database-core.pdf) | 10 selected real tables and their local PK/FK |

C2 is a true single-container component view of LongevityDiet.API.
It no longer mixes six proposed microservices into a pseudo-C2 atlas.

The core ERD shows **10 selected tables from 18 mapped EF Core entity tables**.
It is a teaching / representative-fields diagram, not exhaustive SQL DDL.
Technical outbox/inbox, score-versioning and replay bookkeeping remain in the
source code and EF Core migrations. Identity, tracking and worker DBML namespaces
are logical ownership groups, NOT a single physical SQL schema. Cross-database
UserId values are not SQL foreign keys.

## Implementation honesty

The independent Recommendation.Grpc service implements ActivityCoach.Recommend
over HTTP/2 from a shared .proto contract. The JWT-protected REST endpoint
GET /api/v1/recommendations/activity obtains the signed-in member's real
weekly activity summary and invokes the typed gRPC client (3-second deadline).
The Web Activity screen displays the response; failures return HTTP 503 rather
than made-up advice. A real HTTP/2 Kestrel ↔ REST API integration test passed
using SQLite test databases; deployment on SQL Server/Docker Compose is a
separate unverified acceptance gate.

## Edit and reproduce

Open the editable .drawio in Draw.io Desktop.
Open 04-database-core.dbml in VS Code with installed dbdiagram.dbdiagram-vscode
(v0.5.4), then Ctrl+Shift+P → DBML: Open Preview to the Side.
You can also paste the DBML into https://dbdiagram.io.

Recreate all PDF/Draw.io/SVG files from the project root:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Export-CourseDiagrams.ps1

Validate the layouts and one-page PDFs:

    node .\scripts\Validate-CourseDiagrams.js

PDFs are one-page monochrome vector handouts. Preview PNGs are generated
outside this repository to avoid adding redundant large images.
Detailed historical 33-table/18-table ERDs and six-service C2 atlas are
recoverable from Git history and the verified external backup.

## References

- C4 System Context: https://c4model.com/diagrams/system-context
- C4 Container: https://c4model.com/diagrams/container
- C4 Component: https://c4model.com/diagrams/component
- Draw.io consistency: https://www.drawio.com/docs/best-practice/consistent-diagrams/
- DBML source documentation: https://dbml.dbdiagram.io/docs/
- Official open-source DBML: https://github.com/holistics/dbml
- Official Structurizr C4 examples: https://github.com/structurizr/structurizr
