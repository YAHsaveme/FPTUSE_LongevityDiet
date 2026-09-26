# Longevity Diet Companion - Documentation Index

## Core product and engineering documents

- `00-PROJECT-OVERVIEW.md` - mục tiêu, scope, actors, business value.
- `01-BOOK-RESEARCH.md` - nghiên cứu nguồn, nguyên tắc và giới hạn diễn giải.
- `02-BUSINESS-REQUIREMENTS.md` - business requirements/rules.
- `03-FUNCTIONAL-REQUIREMENTS.md` - functional requirements và acceptance criteria.
- `04-NON-FUNCTIONAL-REQUIREMENTS.md` - security, reliability, performance, accessibility.
- `05-SYSTEM-ARCHITECTURE.md` - architecture, boundaries, data flow, trade-offs.
- `06-DATABASE-DESIGN.md` - entity/data design, constraints, indexes.
- `07-API-GRPC-EVENTS.md` - REST, gRPC, Redis Streams contracts.
- `08-SAFETY-PRIVACY-AI.md` - safety/privacy/AI guardrails.
- `09-TEST-DEPLOY-DEMO.md` - testing, deployment và demo strategy.
- `10-PRN232-TRACEABILITY.md` - mapping với PRN232 Final Assignment.
- `11-BOOK-TO-SOFTWARE-TRACEABILITY.md` - source principle -> software mapping.
- `12-USE-CASES.md` - use cases.
- `PROJECT-STATUS.md` - trạng thái implementation hiện tại.

Dependency/version source-of-truth nằm trong `*.csproj`, `package.json` và `package-lock.json`; không duy trì một bản inventory lặp lại để tránh stale documentation.

## Task planning

- `task/README.md` - task-management conventions.
- `task/ROADMAP-9-WEEKS.md` - high-level roadmap.
- `task/Week 1/` through `task/Week 9/` - detailed weekly planning.
- Mỗi week có `README.md` + `Task 1.md` ... `Task 4.md`.
- Week 1 Task 1 do Thành viên 1 phụ trách và đã hoành thành.

## Architecture

Canonical editable diagrams:
- `architecture/01-system-context.drawio`
- `architecture/02-container-architecture.drawio`
- `architecture/03-docker-deployment.drawio`
- `architecture/04-api-component.drawio`
- `architecture/05-recommendation-dynamic.drawio`
- `architecture/06-outbox-redis-dynamic.drawio`
- `architecture/07-prn232-requirements-core-coverage.drawio`
- `architecture/08-prn232-deliverables-demo-assessment.drawio`
- `architecture/09-end-to-end-demo-flow.drawio`

Supporting architecture docs:
- `architecture/README.md` - diagram index and source-of-truth policy.
- `architecture/DRAWIO-GUIDELINES.md` - visual/connector/export rules.
- `architecture/previews/` - canonical PNG exports only.

Obsolete Mermaid copies are intentionally not kept because they duplicate the canonical draw.io flows and can diverge from the Transactional Outbox architecture.

## ADRs

`adr/` contains architectural decisions that explain important trade-offs. Keep an ADR when the decision still constrains implementation; do not use ADRs as temporary notes.

## Testing structure

- `../tests/LongevityDiet.UnitTests/` - isolated business/service tests.
- `../tests/LongevityDiet.IntegrationTests/` - HTTP/API integration tests using WebApplicationFactory and SQLite in-memory.
- `../tests/LongevityDiet.E2ETests/` - Playwright + Chrome browser E2E tests.

## Engineering standards

- Repository style/naming: `../.editorconfig`.
- Shared .NET build/analyzer policy: `../Directory.Build.props`.
- Agent/project guardrails: `../AGENTS.md`.
- Diagram automation/QA: `../scripts/` and `../.agents/skills/`.

## Product rules

1. Recommendation phải giải thích được lý do.
2. Allergy/exclusion là hard constraint.
3. FMD là module riêng có safety gate.
4. LDAS là adherence score, không phải biological-age/lifespan score.
5. Không copy copyrighted meal plan hoặc đoạn dài từ sách.
6. Diet rule phải có source/version/evidence metadata.
7. Optional AI không được thay đổi deterministic safety/ranking decisions.
