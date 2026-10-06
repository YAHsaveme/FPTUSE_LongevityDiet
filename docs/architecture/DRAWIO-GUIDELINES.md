# Draw.io Architecture Guidelines

## Core rules
- Native .drawio XML is the editable source of truth.
- English architecture element names.
- One abstraction level per view.
- Orthogonal connectors only; curved/diagonal lines are rejected.
- Never route a connector through a box, label, frame title or another connector.
- Reserve whitespace corridors for relationship labels; labels must not sit directly on lines.
- Prefer short protocol/port labels to sentences.

## C1 Target layout
Use horizontal bands: actors; Web + API Gateway; four REST domain services; owned DB row; Recommendation lane; async Worker/Event Streams lane; external Local AI outside boundary. Every service/database ownership pair must be immediately recognizable.

Each C1 box should contain at most four short lines: element name, C4 type, technology/port, one short responsibility. Do not put route tables, controllers, repositories, classes or table lists inside C1.

## Relationship labels
Preferred target labels: `HTTPS :443`, `REST :8081`, `REST :8082`, `REST :8083`, `REST :8084`, `gRPC :8085`, `Ops :8086`, `TDS :1433`, `Redis :6379`, optional `HTTP :11434`.

## Messaging
Event Streams must not float alone. Show explicit domain producers and Worker/Recommendation consumers. Use supporting Dynamic views for XADD/XREADGROUP/XACK/dead-letter command order if adding those command names to C1 would make it dense.

## QA gates
1. Generate/update .drawio.
2. Run `scripts/Lint-ArchitectureGeometry.ps1`.
3. Export SVG/PNG.
4. Run `.agents/skills/drawio-advanced-qa/scripts/check-drawio-svg-overlaps.mjs` on changed SVGs.
5. Inspect PNG at normal zoom for edge-label, line-box, connector crossing, text overflow and ownership readability.
6. Fix and rerun until both automated and visual QA are clean.
