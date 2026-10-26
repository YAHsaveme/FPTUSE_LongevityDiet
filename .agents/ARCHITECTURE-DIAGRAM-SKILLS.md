# Architecture Diagram Skill Set

This repository uses a reviewed architecture-diagram skill set. Project reality and the approved architecture spec take precedence over generic examples. Only skills that add distinct value are kept; duplicate or obsolete material should not be added.

## Project-local skills
- `c4-drawio-assignment-production` - teacher-specific C0/C1 production rules and minimal-text constraints.
- `diagram-design-architecture-layout` - one-glance layout/readability rules distilled from diagram-design without vendoring its runtime.
- `academic-assignment-diagram-qa` - print/A4/slide readability, grayscale and export gates distilled from drawio-academic-skills for assignment figures.
- `c4-architecture` - project C4/Structurizr modelling guidance.
- `drawio-system-architecture` - project-specific draw.io rules.
- `architecture-diagram-qa` - geometry/export quality gate.
- `assignment-diagram-polish` - assignment presentation cleanup.
- `bmad-assignment-foundation` - assignment foundation guidance.

## Reviewed upstream skills
- `diagram-design` - cathrynlavery/diagram-design @ `7a12007b5a4246894f342a2e52e78facbc62eca3` (release `2.6.119`); principles only, no bulk vendoring.
- `c4-skill` - bitsmuggler/c4-skill @ `d9dd48987054d6633da031fe3624afc2cb1da4eb`; current vendored C4 material verified against this HEAD.
- `drawio-studio` - Agents365-ai/drawio-skill @ `57270820d3cd71cbdf4fb6b2f7091d4fb37bb019` (skill `3.4.3`).
- `drawio-architecture-diagrams` - wangchongyu/drawio-architecture-diagrams @ `19f14da1a520c245a515c2bba45b6dd0d631e05d`.
- `drawio-academic-skills` - bahayonghang/drawio-skills @ `2aa612ef9d5b65179eeebe7ab33f97f39d2315b4` (overlay `2.8.0`); academic readability principles distilled locally, runtime not vendored.
- `c4-model` - cheriftj/c4-model-skill @ `5b24dda00b38a402da59237a8b8685aaa588a07e`.
- `architecture-diagrams-as-code` - relux-works/skill-architecture-diagrams @ `aff60f88d763606b91e0ddb97a2dd3a66a7ec73a`.
- `drawio-advanced-qa` - Sunwood-ai-labs/draw-io-skill @ `131921b2039b02fc8ee16b23bdb951b1fbb59594`.

Upstream setup scripts are not executed. Reviewed skill/reference/script content is vendored only when it improves C4 correctness, diagram generation, geometry/collision detection, validation, or export quality.

`sapientinc/PRAXIST` was reviewed as a research/agent workflow reference but is intentionally not installed or vendored: its takeover/runtime path centers on Claude/Codex and does not add a diagram-specific capability needed by this project. BMAD Explore/Validate and ADR Studio remain reference material rather than runtime dependencies.

## Public references used
- Official C4 Model.
- diagrams.net / draw.io documentation.
- Architecture Decision Studio for decision-context separation.
- Microsoft architecture guidance, Redis documentation and YARP guidance where relevant.

## Precedence
1. Real code and Docker Compose for Current Runtime.
2. Approved target-architecture spec/ADR for Target Architecture.
3. Lecturer/assignment requirements.
4. Project-local architecture/QA rules.
5. Official C4, diagrams.net and platform documentation.
6. Reviewed vendored general-purpose skills.

If a generic skill example conflicts with LongevityDiet, do not copy it.
