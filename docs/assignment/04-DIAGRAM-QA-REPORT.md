# Assignment Diagram QA Report

## Scope
Teacher-facing Assignment views:
- `01-c0-system-context.drawio`
- `02-c1-container-architecture.drawio`
- `03-conceptual-erd.drawio`
- `04-physical-database.drawio`

Engineering supporting views are validated separately, including Current Local Docker, async Outbox/Redis, Production Target, and `11-cloud-docker-deployment.drawio`.

## Current architecture truth

- C0 = C4 System Context: Guest, Member, Administrator, Longevity Diet Companion, optional external Local AI Runtime.
- C1 = **ADR-005 Target Architecture**, not Current Runtime.
- Target C1 includes Web Application, YARP API Gateway, four REST domain services, Recommendation Service, Background Worker, six service-owned logical databases, Event Streams and optional Local AI.
- Current Docker Compose remains a separate Deployment view until the target service/database split is implemented.
- Redis Streams remains the selected message broker. Kafka is permitted by the Assignment but is not part of this project's architecture.

## One-glance presentation gates

- C0 page: `1800x1000`, minimum explicit typography `13px`.
- C1 page: `2800x1600`, minimum explicit typography `12px`.
- Both are compact landscape frames; page size validation rejects a return to the former oversized C1 canvas.
- C1 box copy is limited to name, C4 type, technology/port and one short responsibility.
- Ports/protocols retained: :443, :8080-:8086, :1433, :6379 and optional :11434; Planning -> Recommendation explicitly uses gRPC / HTTP/2 :8085.

## Geometry and semantic QA

Automated gates reject:
1. non-orthogonal/diagonal connector segments;
2. connector/text and connector/unrelated-box intersections;
3. connector crossings/overlaps in canonical geometry;
4. curved connectors or inconsistent arrowheads;
5. malformed XML/encoding artifacts;
6. missing target services, six owned databases, required ports/protocols or Event Streams;
7. C0 implementation-detail leakage;
8. sample-image contamination such as Mobile App, Cloudinary, RabbitMQ, Brevo or Google AI;
9. missing 33-table Target MVP physical-database coverage;
10. Structurizr C0/C1/deployment relationship regressions.

`Validate-AssignmentDiagrams.ps1` currently passes geometry, one-glance readability, PNG/SVG export, 33/33 physical tables, C4 semantics and live Structurizr Docker validation.

## Advanced SVG checker interpretation

The vendored SVG heuristic checker is used as a second opinion, not as a replacement for canonical draw.io geometry lint and rendered-image review. It can report false positives where:
- an exported UML actor's own strokes meet its legitimate connector;
- draw.io renders a short terminal segment immediately before an arrowhead;
- its inferred label rectangle differs from the rendered text position.

Such findings are not silently ignored: each changed PNG is inspected full-frame. Real label/corridor findings were moved in the generator. On the final C1 export, the checker reports 9 heuristic-only findings: 3 actor-stroke contacts and 6 cylinder/terminal-shape findings; there are no remaining `edge-label`, `text-overflow`, or real connector-crossing findings. These known actor/cylinder heuristics are recorded rather than distorting the diagram solely to satisfy the checker.

## Visual review

### C0
- All three actors, the in-scope system and optional Local AI are identifiable without local zoom.
- Relationship labels sit in whitespace and C0 contains no ports/implementation technologies.
- External dependency remains outside the system boundary.

### C1 Target
- Top-to-bottom reading order: actors -> Web -> Gateway -> domain services -> owned databases/support lane -> Event Streams.
- Service/database ownership pairs are visually recognizable.
- Recommendation/Worker have their own owned databases.
- Event Streams visibly has representative publish/read lanes; the full Tracking -> Event Streams relationship remains in Structurizr and `06-outbox-redis-dynamic.drawio`, where XADD/XREADGROUP/XACK ordering is shown without overloading C1.
- Local AI stays external and optional.

## Deployment/async supporting QA

`11-cloud-docker-deployment.drawio` answers the lecturer's deployment questions without overloading C1:
- Cloud Provider / IaaS -> Virtual Machine -> Docker Engine -> Docker Compose -> private `ldc-network`.
- Docker service DNS is the internal discovery mechanism.
- Only HTTPS :443 is public; :8080-:8086, SQL :1433 and Redis :6379 remain private.
- `sql-data` mounts `/var/opt/mssql`; `redis-data` mounts `/data` with AOF.
- Named-volume data is shown on the VM persistent cloud disk rather than the container writable layer.

`06-outbox-redis-dynamic.drawio` shows the async sequence: local business transaction + Outbox -> XADD -> Redis Streams -> XREADGROUP -> Worker idempotency/job state -> XACK/result/dead-letter. Worker does not own or write another service's domain database.

## Completion condition

Architecture documentation is accepted only when Assignment validation, engineering architecture validation, project-structure/task alignment validation, rendered-image review and repository verification all pass, and no document falsely presents Target Architecture as already deployed.