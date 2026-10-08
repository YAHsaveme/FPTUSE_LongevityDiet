# C4 Compliance Checklist - Longevity Diet Companion

This checklist is based on the official C4 Model review checklist, notation guidance, System Context guidance, Container guidance, and queues/topics guidance.

## 1. Diagram Identity

| Check | C0 | C1 |
|---|---|---|
| Clear title | PASS | PASS |
| Diagram type obvious | PASS - System Context | PASS - Container |
| Scope obvious | PASS - one software system | PASS - one software system boundary |
| Key / legend present | PASS | PASS |
| Consistent naming between diagrams | PASS | PASS |

## 2. Elements

| Check | Result |
|---|---|
| Every element has a name | PASS |
| Every element type is explicit | PASS |
| Every element has a short responsibility | PASS |
| Every C1 container has technology stated | PASS |
| External/optional dependency is visually distinct | PASS |
| Shapes/border styles have meaning documented in legend | PASS |
## 3. Relationships

| Check | Result |
|---|---|
| Every relationship is directional | PASS |
| Every relationship has an intent label that matches arrow direction | PASS |
| C1 inter-process relationships show technology/protocol | PASS |
| Synchronous vs asynchronous communication is visually distinct | PASS |
| No connector passes through unrelated text | PASS |
| No connector passes through unrelated boxes | PASS |
| Curved/diagonal connectors are rejected by automated geometry lint | PASS |
| Arrowhead style is consistent | PASS |

## 4. Level-of-Abstraction Rules

### C0 - System Context
- Shows Guest, Member, Administrator, Longevity Diet Companion, and the direct optional Local AI dependency.
- Hides React, API, SQL Server, Redis, gRPC, Worker, Controllers, Services, and Repositories.
- Technology/protocol detail is intentionally omitted except the external dependency description.

### C1 - Container
- Shows runnable applications/data stores only for the target web-only MVP; no Mobile App is in scope.
- API internal Controller -> Service -> Repository layers are not modelled as C1 containers.
- The Web Application container is the browser SPA; Nginx is deployment infrastructure/static hosting and belongs in the Deployment view.
- Sample-image-only Cloudinary, RabbitMQ, Brevo, Google AI, and split Diet/Identity/Progress services are intentionally excluded.
## 4.1 Deployment separation
The browser SPA is modelled as the C4 Web Application container. Nginx is deployment infrastructure/static hosting, not an additional C4 application container. SQL Server and Application Event Streams are logical C4 data-store containers; their SQL Server/Redis server processes are deployment topology.

## 5. Message-Based Architecture Correction

The official C4 queues/topics guidance recommends modelling each logical queue/topic as a C4 container (a data store), rather than modelling the message bus/broker itself as a C4 container.

Therefore C1 uses:

- **Application Event Streams** = logical queue/topic-style C4 container.
- **Technology:** Redis 7 Streams.
- Worker -> Application Event Streams = `XADD`.
- C1 reverse data-flow relationship = Application Event Streams -> Background Worker, labelled as queued entries being available for processing.
- Dynamic view shows the command direction explicitly: Worker -> Application Event Streams for `XREADGROUP` and `XACK`.
- Redis server/broker deployment topology is left to deployment documentation.

This keeps the Assignment requirement "Redis message broker integration" while preserving correct C4 abstraction.

## 6. Automated Quality Gates

The final validator checks:
- draw.io XML validity;
- orthogonal routing and `curved=0`;
- consistent filled block arrowheads;
- connector/text intersections;
- connector/unrelated-box intersections;
- required Assignment document sections and technologies;
- all 33 target physical database tables;
- required Structurizr model relationships and course-vs-official C4 terminology guards;
- Structurizr CLI validation when Docker daemon/image is available; otherwise the validator reports a truthful skip after static DSL checks.
## 7. Source Grounding

BMAD rule applied: because this is an existing project, repository code/configuration and agreed project documents are the source of truth. The supplied architecture image is used for visual composition only; sample-only services are not copied into LDC.

- Official C4 Model: https://c4model.com/
- System Context: https://c4model.com/diagrams/system-context
- Container: https://c4model.com/diagrams/container
- Notation: https://c4model.com/diagrams/notation
- Review checklist: https://c4model.com/diagrams/checklist
- Queues and topics: https://c4model.com/abstractions/queues-and-topics
- C4 skill: https://github.com/bitsmuggler/c4-skill
- BMAD Explore and Validate: https://docs.bmad-method.org/plan/explore-and-validate-an-idea/
- PRN232 Final Assignment PDF supplied by the team.

## 8. Final Status

The four master diagrams are generated from one canonical script, exported as high-resolution PNGs, and must pass the validator before they are treated as submission-ready.
