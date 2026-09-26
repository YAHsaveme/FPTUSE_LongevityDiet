# Architecture Diagrams

This folder contains the final architecture and assignment-traceability diagram set for Longevity Diet Companion.

## Final diagram set
1. `01-system-context.drawio`
   - C4 System Context.
   - Guest, Member, Administrator, Longevity Diet Companion, optional Local AI Runtime.

2. `02-container-architecture.drawio`
   - C4 Container Architecture.
   - LongevityDiet.Web, LongevityDiet.API, LongevityDiet.Recommendation.Grpc, LongevityDiet.Worker, SQL Server, Redis Streams, optional AI.

3. `03-docker-deployment.drawio`
   - C4 Deployment View for local/demo environment.
   - Developer Workstation -> Docker Desktop -> Docker Compose -> ldc-network.
   - Shows container instances, internal/published ports and volumes.
   - Topology only; runtime relationships are intentionally kept in 02, 05 and 06.

4. `04-api-component.drawio`
   - C4 Component View for LongevityDiet.API.
   - HTTP pipeline, Controllers, Application Services, gRPC Client, Repositories, DbContext, SQL Server and transactional-outbox invariant.
   - Planned components are dashed and marked Planned.

5. `05-recommendation-dynamic.drawio`
   - C4 Dynamic View for synchronous meal recommendation.
   - REST -> SQL -> gRPC -> optional explanation rewrite -> response.

6. `06-outbox-redis-dynamic.drawio`
   - C4 Dynamic View for transactional outbox and Redis Streams.
   - SQL transaction -> outbox publisher -> XADD -> XREADGROUP -> idempotent consumer -> XACK/DLQ.

7. `07-prn232-requirements-core-coverage.drawio`
   - PRN232 PDF sections 1-4.
   - Objective, REST API, Background Job, Message Broker, gRPC, Deployment and Technical Requirements.

8. `08-prn232-deliverables-demo-assessment.drawio`
   - PRN232 PDF sections 5-8.
   - Deliverables, Demonstration, Assessment Criteria and Notes.

9. `09-end-to-end-demo-flow.drawio`
   - Presentation-oriented end-to-end demonstration sequence.
   - Covers Docker, JWT, REST CRUD/query features, SQL/EF Core, gRPC, Outbox, Worker, Redis producer/consumer, background result, Swagger/logs and final UI verification.

## Canonical PNG previews
Final PNG exports are stored only in:
`docs/architecture/previews/`

Export policy:
- draw.io Desktop 31.4.5
- light theme
- full-page export
- 4200 px output width
- no crop-to-content
- PNG visually reviewed after export

## Visual standard
- Monochrome.
- White background/box fill.
- Black strokes/text.
- Arial.
- Orthogonal connectors only.
- Boundary frames are empty-value shapes; titles are separate text inside the frame.
- Solid relationship = synchronous.
- Dashed relationship = asynchronous or optional.
- Dashed component = Planned/Target.
- No label may hide a line.
- No connector may pass through a box.

## Source of truth
Architecture must remain aligned with:
- PRN232 Final Assignment PDF
- `docker-compose.yml`
- `docs/05-SYSTEM-ARCHITECTURE.md`
- `docs/07-API-GRPC-EVENTS.md`
- ADR-002 Redis Streams
- ADR-003 Rules-First Recommendation
- ADR-004 Transactional Outbox


## Historical backups
Superseded diagram backups are stored outside the active project tree so the submission stays clean.
