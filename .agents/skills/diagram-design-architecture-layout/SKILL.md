# Skill - Diagram Design for Architecture Layout

## Purpose
Create compact, presentation-ready architecture diagrams that preserve every approved architectural fact while remaining readable in a normal full-frame view.

## Provenance
- Upstream reviewed: `cathrynlavery/diagram-design`
- Reviewed commit: `69e6138de1627bca669258f51fc28c4d25a9a21b`
- Reviewed release: `2.6.118`
- Review date: 2026-10-22
- Adoption rule: copy principles, not the upstream plugin/runtime. Project source, accepted ADRs and C4 semantics remain authoritative.

## Core rules
1. Preserve meaning before styling. Layout work must never delete an approved container, database, relationship, protocol, ownership rule or Current-vs-Target qualifier.
2. Prefer compacting geometry and wording over shrinking typography. If content cannot remain legible, move detail to a supporting Dynamic/Deployment view rather than making C0/C1 microscopic.
3. Use one dominant reading direction. For this project: top-to-bottom for user traffic and clearly separated horizontal ownership/async lanes.
4. Use a strict grid. Peer elements share alignment, dimensions and spacing unless a semantic difference justifies otherwise.
5. Zone the page deliberately: title/scope, actors, public entry, domain containers, owned data, async/support, external systems, legend.
6. Reserve whitespace corridors before routing connectors. Relationship labels live in those corridors, never on top of shapes or other connectors.
7. Use orthogonal routing only for architecture views. Avoid diagonal lines, unnecessary bends, crossings and parallel-edge ambiguity.
8. Keep relationship labels compact but faithful: protocol/port plus short intent when needed. Direction of text must match arrow direction.
9. Keep C4 boxes concise: name, explicit C4 type, technology/port where applicable, and one short responsibility.
10. Design for a 16:9-like presentation frame when practical. The exact page can vary, but the complete diagram must be understandable without zooming into individual regions.

## Readability floor
- Do not reduce body/relationship typography merely to fit an oversized topology.
- Prefer fewer words, tighter box geometry, better alignment and supporting views.
- A full-frame export fails review if service names, databases, ports or relationship direction cannot be identified at normal presentation scale.

## Faithful layout workflow
1. Freeze the semantic inventory before moving geometry.
2. Place zones and primary nodes on grid.
3. Pair each service with its owned database before routing cross-service relationships.
4. Route primary synchronous flow first, then database ownership, then async/supporting relationships.
5. Place labels only after connector corridors are stable.
6. Export full-page PNG/SVG and inspect the entire image, not isolated zoomed regions.
7. Fix the generator/source, regenerate and re-run geometry/SVG QA.

## Project-specific guardrails
- C0 remains System Context: people, one Longevity Diet Companion system, direct external systems only.
- C1 remains the approved Target Architecture, explicitly labelled as such.
- Deployment and runtime sequencing belong in supporting Deployment/Dynamic views, not inside C1.
- Never copy sample-only Mobile App, Cloudinary, Brevo, RabbitMQ or Google AI elements into LongevityDiet.
