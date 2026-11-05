# LongevityDiet PRN232 — Draw.io diagrams (editable)

All FOUR submission diagrams are **native diagrams.net / Draw.io files** in
this folder, on one large page each. Use Draw.io Desktop to open, zoom,
select, edit and reroute the shapes and arrows.

| View | Editable Draw.io | One-page PDF | Content |
| --- | --- | --- | --- |
| C0 — System Context | [01-c0-system-context.drawio](01-c0-system-context.drawio) | [PDF](01-c0-system-context.pdf) | Visible UML stick-figure actors Member + Administrator, and one LongevityDiet system |
| C1 — Container Architecture | [02-c1-container-architecture.drawio](02-c1-container-architecture.drawio) | [PDF](02-c1-container-architecture.pdf) | Web, REST API, gRPC, SQL Server, Redis Streams and Worker; synchronous and asynchronous connections |
| C2 — REST API Components | [03-c2-api-components.drawio](03-c2-api-components.drawio) | [PDF](03-c2-api-components.pdf) | One ASP.NET Core API container, five Controller/Service modules, EF Core and gRPC/Redis adapters |
| Core Database ERD | [04-database-core.drawio](04-database-core.drawio) | [PDF](04-database-core.pdf) | 10 representative entity tables, native editable table cells and only local database relationships |

**DBML source of truth for the ERD:** [04-database-core.dbml](04-database-core.dbml).
You can open it in VS Code using dbdiagram's DBML extension. The separate
[04-database-core.svg](04-database-core.svg) is a vector rendering of that source.

## What makes this different from the previous diagrams?

- Black/white technical notation; square-cornered native Draw.io shapes, no AI-generated flattened image.
- Actual Draw.io UML Actor glyphs are present in C0 and C1.
- Orthogonal arrows are connected to real shapes through fixed ports and explicit routing lanes.
- Arrow labels and explanatory text sit in separate whitespace, not on top of connectors.
- C0 shows only people and the software system.
- C1 shows runtime containers, including a real HTTP/2 REST-to-gRPC call.
- C2 covers **one container** (LongevityDiet.API), not six hypothetical microservices.
- The ERD is a **ten-table teaching view**, not an entire physical SQL migration. The source code has 18 mapped EF Core tables and retains every migration and Outbox/Inbox table. No cross-database UserId foreign keys are claimed.

## Verification

Run from the repository root:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Export-CourseDiagrams.ps1

The command regenerates Draw.io from the vetted project model and the actual
DBML, uses Draw.io Desktop to export all four PDFs, then checks:

- Four native editable Draw.io files, exactly one page each;
- structural shape/arrow references and no unrelated overlapping module/table boxes;
- two native Actor shapes at both C0 and C1;
- clearance of text boxes from explicitly routed orthogonal connector spans;
- 10 modeled core DBML tables, 5 local relationships, no cross-database SQL FKs;
- four one-page vector PDFs.

PNG previews are exported to D:\PRN232\_diagram_toolkit_sources\course-c4-previews
outside the Git repository to avoid duplicate source assets.

## Scope and limits

The REST -> gRPC integration has passed a real Kestrel HTTP/2 integration test
with SQLite test databases and an authenticated user's activity summary. The
Redis Worker notification path was exercised with real Redis and SQLite in the
existing smoke tests. This does not establish a full Docker Compose / production
SQL Server rollout. See [04-RUNTIME-CONNECTIVITY.md](../04-RUNTIME-CONNECTIVITY.md).

For reference: [C4 System Context](https://c4model.com/diagrams/system-context),
[C4 Containers](https://c4model.com/diagrams/container),
[C4 Components](https://c4model.com/diagrams/component) and
[Draw.io connector waypoints](https://www.drawio.com/docs/manual/connectors/waypoints-connectors/).

**Historical originals remain recoverable** from Git and from the verified
external backup at D:\PRN232\_drawio_professional_redesign_2026-11-05_backup.
