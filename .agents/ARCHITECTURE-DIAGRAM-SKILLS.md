# Architecture Diagram Skill Set

This repository uses a small, reviewed architecture-diagram skill set instead of installing every duplicate skill found online. The goal is maximum value with minimum repository noise.

## Project-local skills
- `c4-drawio-assignment-production` - teacher-specific C0/C1 production rules and minimal-text constraints.
- `drawio-system-architecture` - LongevityDiet draw.io rules.
- `architecture-diagram-qa` - geometry/export quality gate.
- `assignment-diagram-polish` - assignment presentation cleanup.
- `c4-architecture` - existing bitsmuggler C4/Structurizr skill.

## Reviewed upstream skills added on 2026-10-05
- `drawio-studio` - Agents365-ai/drawio-skill @ `88fd9236bc532aac4c25cb008a8bd59bc650b904`.
- `drawio-architecture-diagrams` - wangchongyu/drawio-architecture-diagrams @ `19f14da1a520c245a515c2bba45b6dd0d631e05d`.
- `c4-model` - cheriftj/c4-model-skill @ `5b24dda00b38a402da59237a8b8685aaa588a07e`.
- `architecture-diagrams-as-code` - relux-works/skill-architecture-diagrams @ `12703831f58e35a2d8267e72d16cad157f5b48ac`.

Upstream setup scripts were not executed. Only reviewed skill/reference/script content was copied into `.agents/skills/`.

## Public references used
- Official C4 Model: context, container, component, deployment, notation, and diagram review checklist.
- draw.io/diagrams.net: connector routing and export documentation.
- Architecture Decision Studio: System / Sub-system / Software decision separation and context-sensitive pattern selection.

## Precedence
1. Real code and Docker Compose.
2. Accepted ADRs and project architecture documents.
3. Lecturer assignment requirements.
4. Project-local production/QA skills.
5. Official C4/draw.io guidance.
6. Upstream general-purpose skills.

If an upstream example conflicts with LongevityDiet reality, do not copy it into the diagram.
