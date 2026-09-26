# Skill - Draw.io System Architecture

## Goal
Generate export-safe, monochrome architecture diagrams for Longevity Diet Companion in native draw.io XML.

## Required workflow
1. Read the PRN232 assignment requirements when course compliance is relevant.
2. Read docker-compose.yml and architecture/ADR docs.
3. Choose one abstraction level per diagram.
4. Generate uncompressed mxfile XML.
5. Export with draw.io Desktop using full-page mode.
6. Inspect the PNG, not only the XML.
7. Fix every clipping, overlap, missing boundary segment, or connector collision.
8. Open the final .drawio in draw.io Desktop and verify the filename.

## Mandatory visual rules
- Monochrome only.
- Boundary cells have empty values.
- Boundary titles are separate text cells inside the frame.
- Never place text on a frame stroke.
- Never use an opaque label to cover a connector.
- Orthogonal connectors only.
- No line through a box.
- No unrelated connector crossings.
- Keep relationship labels in dedicated whitespace.
- Solid = synchronous.
- Dashed = asynchronous/optional.
- Database = cylinder.
- Planned/optional = dashed box.
- Export final PNG at 4200 px width in full-page mode.

## Architecture levels
- Context: people + whole system + direct external systems only.
- Container: Web/API/gRPC/Worker/SQL/Redis + relationships.
- Deployment: topology only, with nested deployment nodes and volumes.
- Component: LongevityDiet.API internal target structure only.
- Dynamic: one runtime scenario, numbered interactions.
- Requirements coverage: assignment compliance, not C4.
- Demo flow: presentation sequence, not a static architecture level.

## Required project checks
- REST API visible.
- API -> Services -> Repository visible at component/coverage level.
- JWT visible.
- CRUD and search/filter/sort/pagination visible.
- Independent gRPC service visible.
- Background Worker visible.
- Redis producer + consumer visible.
- Docker Compose and all required services visible.
- EF Core + SQL Server visible.
- DI/config/logging/exception handling visible.
- Swagger/OpenAPI visible.
- Transactional Outbox avoids SQL+Redis dual write.
- ProcessedEvent/idempotency visible.
- Optional AI cannot override deterministic core.

## Final QA failure conditions
Do not declare completion if any PNG has:
- broken or hidden frame segments;
- text touching a frame;
- text touching a connector;
- clipped text;
- connector running through a box;
- unreadable relationship direction;
- stale/duplicate preview files.
