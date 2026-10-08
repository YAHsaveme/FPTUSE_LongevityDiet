# Draw.io Architecture Guidelines

## Purpose
Create architecture diagrams that remain technically accurate and visually intact after PNG export.

## Source priority
When the assignment specification changes, use this order:
1. PRN232 Final Assignment PDF for mandatory course requirements.
2. Current code and docker-compose.yml for implemented/runtime reality.
3. ADRs and architecture docs for accepted design decisions.
4. Planned components only when explicitly marked Planned/Target.

Never present a planned component as implemented.

## Diagram set and abstraction
Use separate views instead of mixing abstraction levels:
- 01 System Context: people + whole software system + direct external systems.
- 02 Container: runtime/deployable applications and data stores.
- 03 Deployment: physical/runtime placement only.
- 04 Component: internal structure of LongevityDiet.API only.
- 05 Dynamic: **target** synchronous recommendation flow.
- 06 Dynamic: **target** transactional-outbox and Redis flow.
- 07 Requirements Coverage: PDF sections 1-4.
- 08 Requirements Coverage: PDF sections 5-8.
- 09 End-to-End Demo Flow: presentation evidence.

## C4 official numbering vs course labels
- Official C4 core levels: System Context = Level 1, Container = Level 2, Component = Level 3, Code = Level 4.
- The Assignment names Context as C0 and Container as C1; treat these as course labels, not official C4 level numbers.
- Do not add System Landscape or Code views merely to make the set look more complete; add a view only when it communicates useful architecture information.

## Monochrome visual grammar
- White background and white box fill.
- Black text and black strokes only.
- No gradients, shadows, decorative icons, emoji, or color semantics.
- Arial for portability.
- Solid rounded rectangle: current person/system/container/component.
- Dashed rounded rectangle: optional external dependency or Planned/Target element.
- Cylinder: relational database.
- Dashed large rectangle: system/deployment/container boundary.
- Solid arrow: synchronous dependency/call.
- Dashed arrow: asynchronous stream operation or optional relationship.

## Boundary integrity rule
This rule is mandatory because PNG export is part of QA:
- Boundary cells MUST have an empty value.
- Boundary titles MUST be separate text cells placed inside the frame.
- Never place title text on top of a boundary stroke.
- Never place an opaque text background on a boundary.
- Keep at least 25 px between boundary titles and the border.
- Keep at least 35 px between unrelated text and a boundary line.

## Connector integrity rule
- Orthogonal/elbow connectors only.
- No diagonal connectors.
- Do not route a connector through a box.
- Avoid connector-to-connector crossings.
- If two async flows use the same area, give each a separate vertical/horizontal lane.
- Relationship labels MUST be separate text cells in whitespace.
- A relationship label must not overlap its connector.
- Keep at least 25-30 px between label text and the nearest line.
- Do not use a white-filled label to hide a line behind text.
- One connector = one semantic relationship.

## C4 relationship labels
- System Context: describe business intent, not protocols.
- Container/Dynamic: label cross-process relationships with useful protocol/technology.
- Examples:
  - HTTPS / JSON
  - gRPC / HTTP2
  - EF Core / TDS
  - Redis Streams XADD
  - Redis Streams XREADGROUP / XACK

## Deployment rule
Deployment is topology, not a duplicate Container diagram. The browser-hosted React SPA is the Web Application container instance; Nginx is deployment infrastructure/static hosting. The logical SQL Server database and Application Event Streams remain C4 data-store containers, while the SQL Server/Redis server processes are deployment nodes/infrastructure.
Show:
- Developer Workstation
- Docker Desktop
- Docker Compose project
- ldc-network
- container instances
- Docker volumes
- published/internal ports

Do not draw all business-flow arrows in Deployment. Refer to Container/Dynamic views instead.

## Assignment-specific architecture invariants
- ASP.NET Core REST API exists as the public application boundary.
- Layered target: API -> Services -> Repository.
- JWT protects authenticated API operations.
- Search/filter/sort/pagination belong in repository/query responsibilities.
- Recommendation service is an independent gRPC service.
- Browser never calls SQL/Redis/gRPC directly.
- Business state + OutboxMessage are committed in one SQL transaction.
- No API-request dual write to SQL + Redis.
- Worker performs outbox publication.
- Redis Streams has producer and consumer evidence.
- Consumer processing is idempotent using ProcessedEvent.
- Delivery is at-least-once.
- Optional AI cannot override deterministic ranking or safety rules.

## Export-first QA
Every final diagram must pass all steps:
1. Validate mxfile XML.
2. Check UTF-8/ASCII punctuation and no mojibake.
3. Export with draw.io Desktop, not another renderer.
4. Use full-page PNG export, not crop-to-content.
5. Export canonical previews at width 4200 px.
6. Visually inspect the exported PNG.
7. Verify every boundary is continuous.
8. Verify no label touches a line.
9. Verify no text is clipped.
10. Verify arrows remain unambiguous at fit-to-page.
11. Open the final .drawio in draw.io Desktop and verify the correct filename.

Canonical preview directory:
docs/architecture/previews/

## Review checklist
- Correct diagram type and scope?
- Title and legend present?
- Every element named and typed?
- Technology shown where appropriate?
- Planned elements explicitly dashed/marked?
- Every arrow direction correct?
- Every relationship label readable?
- No missing frame segments?
- No label hides a boundary/connector?
- No connector cuts through another box?
- No text clipping?
- PDF requirements represented across 07-09?
- Diagram matches current code, docker-compose and ADRs?
