# ADR-003 — Rules-First Recommendation, AI Optional
Status: Accepted

## Context
Diet and FMD recommendations are explainability/safety sensitive and the project should not require paid AI.

## Decision
Hard safety filters + deterministic weighted ranking produce recommendations and reason codes.
Optional local AI may only rewrite those reasons into natural language.

## Consequences
- Free/offline-capable core.
- Easy unit testing and grading.
- AI outage cannot break recommendations.
- AI cannot override allergen or FMD safety constraints.
