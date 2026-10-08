# Assignment Diagram QA Report

## Scope
Final visual and geometry QA for:
- 01-c0-system-context.drawio
- 02-c1-container-architecture.drawio
- 03-conceptual-erd.drawio
- 04-physical-database.drawio

## Quality gates
1. Orthogonal connectors only.
2. Curved connectors explicitly disabled.
3. Filled block arrowheads with one consistent size.
4. No connector/text intersections.
5. No diagonal connector segments.
6. No connector routed through unrelated boxes.
7. Relationship labels placed in dedicated whitespace.
8. Boundary titles kept separate from boundary strokes.
9. Arial typography with readable hierarchy.
10. Every master diagram is exported as both a high-resolution PNG and a vector SVG. SVG is the preferred format for deep zoom, printing and Physical DB review.
## Visual polish applied

### C0 - System Context
- Kept Guest, Member, Administrator, the single LDC software system, and the direct optional Local AI external dependency.
- Re-routed all actor relationships using deliberate right-angle lanes.
- Moved labels away from connector strokes.
- Increased arrowhead clarity and kept the warm system card as the focal point.

### C1 - Container Architecture
- Rebuilt the page as a target web-only architecture using the supplied image only as a spacing/hierarchy reference, not as copied content.
- Kept only project-owned deployable/runtime containers: Web, REST API, Recommendation gRPC, SQL Server, Background Worker, and logical Application Event Streams implemented with Redis 7 Streams.
- Explicitly excludes the reference team's Mobile App, Cloudinary, RabbitMQ, Brevo, Google AI, split microservices, and split databases.
- Increased container typography and internal padding while shortening descriptions so the whole view is readable at one glance.
- Separated Guest/Member/Administrator HTTPS lanes and kept every connector orthogonal.
- Separated Worker publish and event-delivery lanes and moved REST, gRPC, EF Core, Redis, and optional-AI labels into dedicated whitespace.
- Relationship labels now match arrow direction; `XREADGROUP`/`XACK` command direction is left to the Dynamic view instead of being mislabeled on a reverse data-flow arrow.
- Preserved SQL Server cylinder notation, a warm system boundary, and an external dashed optional-AI card.
- Corrected the message-based C4 abstraction: logical streams/queues are containers/data stores; the Redis broker/server is not modelled as a C4 container.
### Conceptual ERD
- Increased entity title/body text.
- Simplified the page to business concepts only.
- Re-routed multi-segment relationships with orthogonal waypoints.
- Removed text/connector collisions detected by geometry lint.
- Kept technical messaging/tokens out of the conceptual view.

### Physical Database
- Increased table body and section-heading typography.
- Kept cross-domain FK information inside table fields to avoid spaghetti lines.
- Re-routed local FK connectors orthogonally.
- Shows the full 33-table Target Assignment MVP, grouped into Identity/Profile, Catalog/Rules, Planning/Tracking, Progress/Engagement/Safety, and Messaging/Reliability/Operations.

## Automated checks
The Assignment validator now runs geometry lint before PNG export and also rejects:
- non-orthogonal edge styles;
- curved connectors;
- inconsistent arrowhead style/size;
- malformed XML;
- encoding artifacts;
- missing required C4 DSL relationships;
- connector intersections with unrelated boxes;
- text/connector intersections and diagonal segments;
- missing required Assignment document sections/mandatory technologies;
- missing any of the 33 Target MVP physical database tables;
- missing required C0/C1 project elements/protocol labels;
- accidental leakage of sample-image-only components (Mobile App, Cloudinary, Brevo, RabbitMQ, Google AI, Diet Service, Identity Service, Progress Service).

The canonical `workspace.dsl` now contains System Context, Container, API Component, two Dynamic views, and the Local Demo Deployment model. Static DSL checks pass. A previous validation run had returned Structurizr CLI exit code 0; on the 2026-10-05 audit run, Docker Desktop was not running, so the validator truthfully skipped the live CLI step rather than reporting a false PASS. Physical DB coverage remains **33/33 tables**.

## Completion condition
The Assignment pack is considered final only when geometry lint passes with zero findings, all four PNG previews export successfully, the required documentation/technology checks pass, Physical DB coverage is 33/33, and the static `workspace.dsl` checks pass; live Structurizr CLI validation is additionally required whenever Docker/Structurizr is available.
