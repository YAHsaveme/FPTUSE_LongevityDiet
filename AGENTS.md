# AGENTS.md - Longevity Diet Companion

## Read first

Before changing architecture or business logic, read:
0. `.agents/project-context.md`
1. `docs/01-BOOK-RESEARCH.md`
2. `docs/03-FUNCTIONAL-REQUIREMENTS.md`
3. `docs/05-SYSTEM-ARCHITECTURE.md`
4. `docs/08-SAFETY-PRIVACY-AI.md`
5. `docs/10-PRN232-TRACEABILITY.md`
6. `docs/task/ROADMAP-9-WEEKS.md`
7. the active `docs/task/Week N/Task N.md`

## Mandatory PRN232 constraints

Do not remove or bypass:
- ASP.NET Core REST API.
- API -> Services -> Repository.
- JWT authentication.
- CRUD + search/filter/sort/pagination.
- Background Worker.
- Redis Streams producer/consumer.
- independent gRPC service.
- SQL Server/EF Core.
- Docker Compose.

## Architecture rules

- Browser calls REST API only.
- REST API may call gRPC.
- SQL and Redis remain internal infrastructure.
- Worker owns async/scheduled processing.
- Business rules stay out of controllers.
- Controllers do not access repositories directly.
- Use Transactional Outbox for reliable event publication.
- Consumers must be idempotent.
- Architecture changes require docs/diagram/ADR update when the actual system boundary changes.

## Safety rules

- Allergy/exclusion is a hard constraint.
- LDAS is an adherence heuristic, never medical/lifespan prediction.
- FMD is isolated and safety-gated.
- AI cannot override deterministic safety/ranking.
- No diagnosis, treatment or medication advice.
- Do not reproduce copyrighted sample meal plans from the book.

## Engineering rules

- Follow repository `.editorconfig`.
- Keep public C# names readable and conventional.
- One responsibility per class/module where practical.
- Prefer explicit domain/service contracts over controller logic.
- No hardcoded secrets.
- Use `TimeProvider` for testable time-dependent business logic.
- Add unit tests for deterministic business rules.
- Add integration tests for API/DB/auth/contracts.
- Use `WebApplicationFactory<Program>` for ASP.NET Core HTTP integration tests.
- Build and test before merge.
- Do not suppress analyzer rules globally to hide owned-code defects.

## EF Core workflow

- Generate migrations from the canonical DbContext only.
- Avoid parallel migration branches when possible.
- Do not hand-edit generated migration code just to satisfy style analyzers.
- Never delete an applied/shared migration merely for cosmetic cleanup.
- Verify fresh migration/update behavior before release.

## Draw.io rules

Follow:
- `.agents/skills/c4-architecture/SKILL.md`
- `.agents/skills/bmad-assignment-foundation/SKILL.md`
- `.agents/skills/drawio-system-architecture/SKILL.md`
- `.agents/skills/architecture-diagram-qa/SKILL.md`
- `.agents/skills/assignment-diagram-polish/SKILL.md`
- `docs/architecture/DRAWIO-GUIDELINES.md`

## Task workflow

- Work from the active file under `docs/task/Week N/`.
- One owner, one reviewer per major task.
- Task owner is responsible end-to-end where the scope requires it: data/domain -> repository/service -> API -> frontend -> tests.
- Do not re-create work already marked completed.
