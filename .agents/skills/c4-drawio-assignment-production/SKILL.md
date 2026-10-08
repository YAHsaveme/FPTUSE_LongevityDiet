# Skill - C4 Draw.io Assignment Production

## Purpose
Produce teacher-ready C0/C1 architecture diagrams for Longevity Diet Companion that are correct, minimal, editable in draw.io, and consistent with the real repository.

## Sources of truth, in order
1. Current source code and Docker Compose runtime boundaries.
2. Accepted ADRs and project architecture documents.
3. Lecturer requirements: C0 shows external systems/services; C1 shows internal parts and communication; English component names; no AI-generated text overload.
4. Official C4 Model guidance and review checklist.
5. Architecture Decision Studio patterns as decision support, never as a source for inventing project components.

## C0 contract
- Official C4 level: System Context.
- Show only people, Longevity Diet Companion as one Software System, and directly connected external Software Systems.
- Do not show React, ASP.NET Core, SQL Server, Redis, Docker, gRPC, EF Core, repositories, controllers, workers, or deployment nodes.
- Relationship labels are business intent, not protocols.
- Keep every element to a name, explicit C4 type, and at most one short responsibility line.

## C1 contract
- Official C4 level: Container.
- Show runtime applications and data stores only.
- Current required containers: Web Application, REST API, Recommendation Service, Background Worker, SQL Database, Event Streams.
- Direct external system: Local AI Runtime, optional.
- Show communication technology on inter-container relationships: REST/HTTPS, gRPC/HTTP/2, EF Core/TDS, Redis Streams, HTTP/JSON.
- Do not put Controller, Service, Repository, DbContext, middleware, or classes in C1; those belong in Component/Code views.

## Text budget
- English names only on architecture elements.
- Box target: 3-4 short lines total: Name / Type / Technology / 2-4 word responsibility.
- Relationship labels: 1-4 words plus protocol when needed.
- No paragraphs in boxes.
- No prose notes in the middle of the diagram.
- Use accompanying Markdown for explanations and trade-offs.

## Layout rules
- Decide content before geometry.
- Use a strict grid and one dominant flow direction.
- Reserve connector corridors before placing boxes.
- Orthogonal connectors only; no curves.
- No connector may pass through a box, title, label, or boundary title.
- Use fixed/explicit ports and waypoints for important lines.
- Keep peer nodes aligned and evenly spaced.
- Put labels beside lines in dedicated whitespace.
- Legend stays outside the main system boundary.
- Prefer monochrome; meaning comes from shape, border, and line style.

## Visual semantics
- Solid line: synchronous interaction.
- Dashed line: asynchronous or optional interaction.
- Dashed box: external/optional dependency.
- Cylinder: database.
- Queue/process shape: event stream/message data store.
- System boundary: light/dashed neutral frame with a separate title cell.

## Production workflow
1. Read current C0/C1 source, C4 DSL, Docker Compose, architecture docs, and relevant ADRs.
2. List exact nodes and relationships before changing coordinates.
3. Generate native uncompressed draw.io XML from code; do not hand-edit final XML.
4. Parse XML and run geometry/abstraction validation.
5. Export PNG and SVG with draw.io Desktop.
6. Inspect rendered output for clipping, overlap, ambiguous labels, edge crossings, wrong direction, and unbalanced whitespace.
7. Fix source generator and regenerate; do not patch exported images.
8. Keep assignment and engineering copies synchronized.
9. Validate Structurizr DSL and ensure it tells the same C0/C1 story.

## Failure conditions
Do not declare completion when any of these are true:
- C0 contains internal technology or containers.
- C1 mixes components/classes with containers.
- A relationship is unlabeled or direction is unclear.
- HTTPS or gRPC is missing from the relevant C1 path.
- The diagram contains components that do not exist in the project.
- Labels overlap arrows or frames.
- Text is shrunk to compensate for too much prose.
- Assignment and docs/architecture copies disagree.

## Upstream practices incorporated
- bitsmuggler/c4-skill: C4/Structurizr modelling.
- Agents365-ai/drawio-skill: validation/export/source-backed diagrams.
- wangchongyu/drawio-architecture-diagrams: explicit routing, reserved corridors, lint-render-inspect.
- cheriftj/c4-model-skill: abstraction discipline and C4 review checklist.
- relux-works/skill-architecture-diagrams: architecture-as-code/Structurizr cross-checking.
- Official C4 Model: Context, Container, notation, and checklist rules.
- draw.io documentation: connected orthogonal connectors and export workflow.
- Architecture Decision Studio: System/Sub-system/Software decision separation and context-sensitive pattern selection.
