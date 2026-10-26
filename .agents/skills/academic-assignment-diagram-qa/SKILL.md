# Skill - Academic Assignment Diagram QA

## Purpose
Apply publication-style readability gates to PRN232 assignment figures without replacing the project's C4/draw.io source of truth.

## Provenance
- Upstream reviewed: `bahayonghang/drawio-skills`, `drawio-academic-skills`
- Reviewed commit: `2aa612ef9d5b65179eeebe7ab33f97f39d2315b4`
- Reviewed release: `2.8.0`
- Review date: 2026-10-23
- Adoption rule: only the academic readability/export principles below are adopted; the sibling runtime and YAML authoring stack are not vendored because the project already has a generator and validators.

## Assignment figure rules
1. The complete C0/C1 figure must remain readable when fitted to one normal screen and when placed on an A4/slide-like page.
2. Do not reduce relationship/body text below the equivalent of about 8 pt in the intended print size; shorten labels or split supporting detail instead.
3. Keep title, legend, labels and callouts away from borders and connector strokes; no text may rely on zoom to become understandable.
4. Use captions/legends only when they explain notation that is not already self-evident; keep them compact and outside the main topology.
5. Do not encode meaning by colour alone. Line style, shape/type text and arrow direction must still work in grayscale.
6. For submission/printing, prefer an editable `.drawio` source plus high-resolution PNG and SVG/PDF when vector review is useful.
7. Visual QA must inspect the exported artifact, not only the XML/source model.
8. If a diagram exceeds its readability budget, move sequence/deployment/message-command detail into a supporting view instead of shrinking C0/C1.

## Project-specific acceptance checks
- C0: actors, system, direct external dependency readable without zoom; no implementation technology.
- C1: service names, owned databases, ports/protocols and Event Streams producer/consumer roles readable without zoom.
- Docker/Cloud: public/private boundary, service DNS, volume mounts and persistent disk visible in one frame.
- Async Dynamic: producer, stream, consumer, acknowledgement/idempotency/result path clearly distinguishable.

## Completion gate
A figure is not final until geometry lint, semantic validation, exported-image visual inspection and this readability check all pass.