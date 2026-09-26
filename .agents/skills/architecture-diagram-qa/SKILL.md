# Skill - Architecture Diagram QA

## Purpose
Quality-gate all draw.io architecture diagrams before they are considered final.

## Sources of truth
1. PRN232 Final Assignment PDF for mandatory technologies and demonstration requirements.
2. Current code and docker-compose.yml for implemented runtime reality.
3. ADRs and architecture documents for accepted design decisions.
4. C4 notation rules for abstraction and relationship semantics.
5. draw.io exported PNG for visual truth.

## Layout rules
- Use a strict grid.
- Align peer nodes to common x/y baselines.
- Distribute peer nodes evenly.
- Prefer straight horizontal/vertical connectors.
- A connector may use one deliberate orthogonal detour when necessary.
- Avoid serpentine/U-shaped return paths when paired straight request/response lanes are possible.
- Never use curved connectors.
- Never allow a connector to run through a box.
- Avoid connector-to-connector intersections.
- If two directions connect the same pair, use separated parallel lanes.
- Async producer/consumer lanes must be visually distinct.
- Keep relationship labels at least 24 px away from connector strokes.
- Keep titles and notes at least 28 px away from frames.

## Typography rules
- Arial only for portability.
- Diagram title: 26-28 px.
- Section heading: 17-18 px.
- Box heading: 14-15 px bold.
- Box body: 13-14 px.
- Relationship label: 12 px minimum.
- Reflow long prose into short lines or bullets.
- Never shrink text just to make a box fit.
- Increase page/box size instead.

## Boundary rules
- Boundary cells must have empty values.
- Boundary titles are separate text cells.
- No title sits on the boundary stroke.
- Deployment view contains topology only.
- Container/Dynamic views contain runtime relationships.
- Dynamic views may omit container boundaries if those boundaries make connector routing less clear, provided component/responsibility ownership is explicit.

## C4 relationship rules
- Every relationship is unidirectional.
- Every relationship is labelled.
- Container-level cross-process relationships include protocol/technology.
- Context labels describe business intent, not protocol.
- Solid = synchronous.
- Dashed = async or optional.

## PRN232 checks
Verify the final set clearly covers:
- ASP.NET Core REST API.
- CRUD.
- API -> Services -> Repository.
- JWT.
- Search/filter/sort/pagination.
- Background Service.
- Redis producer and consumer.
- Independent gRPC service and REST interaction.
- Docker Compose topology.
- EF Core + SQL Server.
- DI/configuration/logging/exception handling.
- Swagger/OpenAPI.
- End-to-end demo flow.

## Export QA
1. Parse every .drawio as XML.
2. Reject mojibake/non-ASCII punctuation artifacts.
3. Export every final file using draw.io Desktop.
4. Use full-page PNG at 4200 px width.
5. Visually inspect all exported PNGs.
6. Reject any diagram with:
   - clipped text;
   - hidden text;
   - boundary gaps caused by labels;
   - arrows through boxes;
   - confusing U-shaped/serpentine arrows;
   - overlapping connectors;
   - labels touching lines;
   - tiny unreadable text at fit-to-page.
7. Open every final .drawio in draw.io Desktop and verify the filename.

## Completion rule
Do not report architecture diagrams as complete until the exported PNGs, not just the XML, pass review.
