# Assignment Foundation Pack

This folder is the **basic PRN232 Assignment documentation pack** for Longevity Diet Companion (LDC).

It is intentionally smaller than the internal engineering documentation under `docs/`.

## Required reading order

0. `00-ASSIGNMENT-DOCUMENT.md` **(recommended submission entry point)**
   - Context -> Problems -> Solutions
   - Main Actors -> Main Features
   - C0 System Context -> C1 Container Architecture
   - Technology -> Conceptual ERD -> Physical Database
   - PRN232 mandatory requirements, deliverables, demo evidence and assessment mapping
   - Scope and implementation status

1. `01-ASSIGNMENT-FOUNDATION.md`
   - Detailed product foundation and technology summary

2. `02-SYSTEM-ARCHITECTURE-C4.md`
   - Assignment C0: System Context
   - Assignment C1: Container Architecture
   - Relationships and architecture rules

3. `03-DATA-MODEL.md`
   - Conceptual ERD
   - Physical database design
   - Implemented-vs-target status

4. `04-DIAGRAM-QA-REPORT.md`
   - Geometry/arrow/text quality gates
   - Visual polish summary
   - Final validation criteria

5. `05-C4-COMPLIANCE-CHECKLIST.md`
   - Official C4 review checklist mapping
   - Correct C0/C1 abstraction rules
   - Queue/topic modelling rule for Redis Streams
   - Automated quality-gate summary

## Diagrams

Editable draw.io:
- `diagrams/01-c0-system-context.drawio`
- `diagrams/02-c1-container-architecture.drawio`
- `diagrams/03-conceptual-erd.drawio`
- `diagrams/04-physical-database.drawio`

Canonical PNG:
- `previews/01-c0-system-context.png`
- `previews/02-c1-container-architecture.png`
- `previews/03-conceptual-erd.png`
- `previews/04-physical-database.png`

Vector SVG (recommended for zooming/printing):
- `vector/01-c0-system-context.svg`
- `vector/02-c1-container-architecture.svg`
- `vector/03-conceptual-erd.svg`
- `vector/04-physical-database.svg`

Physical DB readable section previews:
- `previews/physical-db-sections/01-identity-profile.png`
- `previews/physical-db-sections/02-catalog-rules.png`
- `previews/physical-db-sections/03-planning-tracking.png`
- `previews/physical-db-sections/04-progress-engagement-safety.png`
- `previews/physical-db-sections/05-messaging-reliability-operations.png`

C4 semantic source:
- `c4/workspace.dsl`

## C4 naming note

The Assignment asks for two levels named **C0** and **C1**. In this pack:
- **C0 = System Context** for the Assignment.
- **C1 = Container Architecture** for the Assignment.

The official C4 model normally names these views **System Context** and **Container** rather than relying on C0/C1 numbering. This note removes ambiguity while preserving the Assignment terminology.

## Sources used

- Official C4 Model: https://c4model.com/
- C4 skill: https://github.com/bitsmuggler/c4-skill
- Vendored C4 skill snapshot: `.agents/vendor/c4-skill` at commit `d9dd48987054d6633da031fe3624afc2cb1da4eb`
- BMAD Explore and Validate: https://docs.bmad-method.org/plan/explore-and-validate-an-idea/
- Project code, Docker Compose and existing Longevity Diet Companion requirements are the implementation source of truth.

## Visual-reference rule

The team-supplied architecture image is used only as a composition reference for spacing, hierarchy and readability. The submitted diagrams are original to Longevity Diet Companion and intentionally do **not** copy the other team's Mobile App, Cloudinary, Google AI, RabbitMQ, Brevo, Diet/Identity/Progress microservices, or split databases. The target project remains web-only.
