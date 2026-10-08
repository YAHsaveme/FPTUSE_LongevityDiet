# Architecture Diagram Skill Set

This repository uses a reviewed architecture-diagram skill set. Project reality and the approved architecture spec take precedence over generic examples.

## Project-local skills
- `c4-architecture` - C4/Structurizr modelling guidance.
- `drawio-system-architecture` - project-specific draw.io rules.
- `architecture-diagram-qa` - geometry/export quality gate.
- `assignment-diagram-polish` - assignment presentation cleanup.
- `bmad-assignment-foundation` - assignment foundation guidance.

## Reviewed upstream skills
- `architecture-diagrams-as-code` - relux-works/skill-architecture-diagrams @ `5675017c81d28bf75274cf5bf9de90918d595d9b`.
- `drawio-advanced-qa` - Sunwood-ai-labs/draw-io-skill @ `131921b2039b02fc8ee16b23bdb951b1fbb59594`.

Upstream setup scripts are not executed. Reviewed skill/reference/script content is vendored only when it improves C4 correctness, diagram geometry, collision detection, validation, or export quality.

## Precedence
1. Real code and Docker Compose for Current Runtime.
2. Approved target-architecture spec/ADR for Target Architecture.
3. Lecturer requirements.
4. Project-local architecture/QA rules.
5. Official C4, diagrams.net, Microsoft architecture, Redis and YARP guidance.
6. Vendored general-purpose skills.

If a generic skill example conflicts with LongevityDiet, do not copy it.
