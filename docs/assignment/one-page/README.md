# PRN232 LongevityDiet — four architecture/data views + one end-to-end sequence

Five **native, editable, one-page Draw.io diagrams**. C0/C1/C2 use the
appropriate C4 abstraction levels; the separate sequence view is for
following requests, responses and asynchronous events from beginning to end.

| View | Edit in Draw.io | PDF | Purpose |
| --- | --- | --- | --- |
| C0 context | [01-c0-system-context.drawio](01-c0-system-context.drawio) | [PDF](01-c0-system-context.pdf) | Real UML actor glyphs: Member, Administrator; one system |
| C1 containers | [02-c1-container-architecture.drawio](02-c1-container-architecture.drawio) | [PDF](02-c1-container-architecture.pdf) | Web, REST, gRPC, SQL Server, Redis Streams, Worker |
| C2 components | [03-c2-api-components.drawio](03-c2-api-components.drawio) | [PDF](03-c2-api-components.pdf) | Modules within LongevityDiet.API only; routing, controllers, services, persistence and adapters |
| Core ERD | [04-database-core.drawio](04-database-core.drawio) | [PDF](04-database-core.pdf) | 10 representative real entity tables; 5 local FK relationships |
| **End-to-end execution** | [05-runtime-end-to-end.drawio](05-runtime-end-to-end.drawio) | [PDF](05-runtime-end-to-end.pdf) | **10 explicit synchronous steps + 19 asynchronous steps**, including return paths |

The editable [04-database-core.dbml](04-database-core.dbml) remains the
**source of truth for the simplified ERD**. The complete physical schema comes
from the 18 mapped entity tables and EF Core migrations, **not** this teaching
view. No FK between separate physical databases is claimed.

## How to read the models

**C0:** Member and Administrator use the LongevityDiet software system.
No internal code, Redis or SQL belongs in the context diagram.

**C1:** Solid lines show HTTP, gRPC and SQL requests/dependencies; responses
are implied for synchronous calls. Dashed lines show Redis Streams publish
and consume directions. The Worker is a separate runtime container.

**C2:** Exactly one container (LongevityDiet.API) is decomposed:
- The authentication endpoints are anonymous; protected member endpoints
  require JWT, with rate limits and authorization rules.
- Auth and Profile use Identity persistence.
- ReminderService commits preferences + IdentityOutbox in the Identity DB;
  IdentityRedisBridge publishes events and consumes notification results.
- TrackingService uses Tracking DB.
- RecommendationController reads the authenticated member's weekly summary
  via TrackingService, then uses the typed ActivityCoach gRPC client.

**Execution sequence:** View [05-runtime-end-to-end.drawio](05-runtime-end-to-end.drawio)
for the entire request and return path instead of adding sequencing details
to C4.
- A (10 steps): Member → Web → authenticated REST → TrackingService →
  Tracking DB → REST → gRPC (HTTP/2) → REST → Web → Member.
- B (19 steps): Member → Web → REST → Identity DB (preferences + outbox) →
  Redis → Worker → Worker DB → WorkerOutbox → Redis → IdentityRedisBridge →
  IdentityInbox + notification → Web polls REST → Member.
  It is **asynchronous**, so a reminder can be delivered later.

## Regenerate and check

In a PowerShell window at the repo root:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Export-CourseDiagrams.ps1
    node .\scripts\Validate-CourseLinks.js

The export uses Draw.io Desktop (not an AI-generated raster image), then
checks the five editable sources and their one-page PDFs. Dedicated QA checks:
- Validate-CourseDiagrams.js: geometry, relationships, DBML and monochrome;
- Validate-CourseRouting.js: C0/C1/C2/ERD connected shape clearance;
- Validate-EndToEndFlow.js: 29 explicit directional sequence messages,
  13 lifelines, actor glyphs, text clearance, and covered source-code constructs.
- Validate-RenderedSvg.js: after Draw.io Desktop exports vector SVG previews,
  inspect the **actually rendered** connector segments for connector-to-connector
  crossings, overlapping segments, diagonal bends and contact with text labels.
  This last check runs locally with Export-CourseDiagrams.ps1, not in GitHub CI.

Preview PNGs are generated outside the repo, under
D:\PRN232\_diagram_toolkit_sources\course-c4-previews.

## Scope and evidence

REST → gRPC was exercised in integration tests using a real Kestrel HTTP/2
listener and SQLite test databases. Redis/Worker tests previously used real
Redis + SQLite. These results do **not** prove a complete Docker Compose +
SQL Server deployment or fully populated LDAS meal/eating-window scoring.
See [Runtime Connectivity Evidence](../04-RUNTIME-CONNECTIVITY.md).

Reviewed references: [C4 diagrams](https://c4model.com/diagrams);
[Draw.io connector waypoints](https://www.drawio.com/docs/manual/connectors/waypoints-connectors/);
[DBML documentation](https://dbml.dbdiagram.io/docs/).

Pre-edit backup with original diagrams, scripts and full Git history was
verified at D:\PRN232\_C4_flow_audit_2026-11-05.
