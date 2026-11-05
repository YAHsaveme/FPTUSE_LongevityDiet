# Architecture and Diagram Skills — PRN232 only

Keep only these four small, complementary local skill folders:

- skills/prn232-project-guardrails — rubric and course constraints
- skills/c4-model — C4 context/container/component semantics
- skills/drawio-studio — editable Draw.io conventions
- skills/drawio-advanced-qa — shape/connector and readability checks

The source of truth is the original three-page PRN232 Final Assignment
rubric, followed by actual project code, Docker Compose and EF Core migrations.
Do not design six standalone business REST services or 33 fake deployed tables
when the coursework asks only for one REST API, one independent gRPC service,
one background job and one producer/consumer broker.

Canonical diagrams: docs/assignment/one-page/README.md.
Regeneration: scripts/Export-CourseDiagrams.ps1.
Validation: scripts/Validate-CourseDiagrams.js.

References:
- https://c4model.com/diagrams
- https://www.drawio.com/docs/best-practice/consistent-diagrams/
- https://dbml.dbdiagram.io/docs/
- https://github.com/structurizr/structurizr
- https://github.com/holistics/dbml

Extra reviewed GitHub skill snapshots, old plans and target architecture assets
are stored outside the Git repository in the dated verified backup.
