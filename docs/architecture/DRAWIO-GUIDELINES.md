# Draw.io Quality Rules - Five Official Overall Views

The official deliverables are C0, C1, C2, Database Diagram, and
Business Flow. Exactly one Draw.io plus one single-page PDF per view,
stored at `docs/assignment/one-page/`.

Design requirements:
- Strict black/white only; no decorations or color-coded node states.
- Left-to-right business/request flow and top-to-bottom data ownership.
- UML stick-figure actors for end users/administrator.
- Native editable connectors, short explicit edge labels, square-corner
  lines, consistent typography, no labels overlapping arrows.
- Every service has its own database in target C1 and C2.
- Database table groups must come from owned EF DbContexts; no invented
  cross-database FK to Identity.
- Redis Streams shown as ACTIVE; RabbitMQ AMQP:5672 is visibly
  PLANNED / NOT DEPLOYED in C1, C2 and Business Flow.
- Business Flow's FMD safety YES/NO branches must have correct semantics.
- Render all five to PNG/PDF, inspect visually and validate one-page
  PDFs using `scripts/Validate-OfficialArchitecture.js`.

Regenerate with `scripts/Export-OverallDiagrams.ps1`.
Old draft and FULL generators must not be restored.
