# Draw.io Architecture Guidelines

## Core rules
- Native .drawio XML is the editable source of truth.
- English architecture element names.
- One abstraction level per view.
- Orthogonal connectors only; curved/diagonal lines are rejected.
- Never route a connector through a box, label, frame title or another connector.
- Reserve whitespace corridors for relationship labels; labels must not sit directly on lines.
- Prefer short protocol/port labels to sentences.

## One-glance presentation contract
- C0/C1 must remain understandable as complete full-frame images at normal presentation scale; no local zoom should be needed to identify names, ports, owned databases or arrow direction.
- Prefer a compact landscape frame near 16:9. Automated limits are C0 <= `1900x1100` and C1 <= `3000x1800`.
- Minimum explicit typography floor: C0 `13px`; C1 `12px`. Do not bypass the gate by omitting explicit font sizes.
- Compact wording and geometry before considering a larger page. If extra runtime/deployment detail is needed, create a supporting Dynamic or Deployment view instead of expanding C1 indefinitely.
- Keep safe whitespace around title, actors, system-boundary title and legend.
- Peer containers use aligned grid positions and consistent dimensions where practical.
- Pair each service with its owned database in the same visual ownership column/lane.
- Reserve connector corridors before placing labels; labels may not overlap boxes, frames, titles or other connectors.

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
