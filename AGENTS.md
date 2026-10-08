# AGENTS.md - Longevity Diet Companion

## Read first

Before changing architecture or business logic, read:
0. `CONTRIBUTING.md`
1. `.agents/project-context.md`
2. `docs/01-BOOK-RESEARCH.md`
3. `docs/03-FUNCTIONAL-REQUIREMENTS.md`
4. `docs/05-SYSTEM-ARCHITECTURE.md`
5. `docs/08-SAFETY-PRIVACY-AI.md`
6. `docs/10-PRN232-TRACEABILITY.md`
7. `docs/task/ROADMAP-4-WEEKS.md`
8. the active `docs/task/Week N/Task N.md`

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
- `.agents/ARCHITECTURE-DIAGRAM-SKILLS.md`
- `.agents/skills/c4-drawio-assignment-production/SKILL.md`
- `.agents/skills/c4-architecture/SKILL.md`
- `.agents/skills/c4-model/SKILL.md`
- `.agents/skills/drawio-studio/SKILL.md`
- `.agents/skills/drawio-architecture-diagrams/SKILL.md`
- `.agents/skills/architecture-diagrams-as-code/SKILL.md`
- `.agents/skills/drawio-advanced-qa/SKILL.md`
- `.agents/skills/bmad-assignment-foundation/SKILL.md`
- `.agents/skills/drawio-system-architecture/SKILL.md`
- `.agents/skills/architecture-diagram-qa/SKILL.md`
- `.agents/skills/assignment-diagram-polish/SKILL.md`
- `docs/architecture/DRAWIO-GUIDELINES.md`

Precedence: current code/Docker for Current Runtime and the approved target architecture spec/ADR for Target Architecture always beat generic skill examples.

## Task workflow

- Work from the active file under `docs/task/Week N/`.
- One owner, one reviewer per major task.
- Task owner is responsible end-to-end where the scope requires it: data/domain -> repository/service -> API -> frontend -> tests.
- Do not re-create work already marked completed.

## Architecture freeze

For ordinary feature work, the current solution structure is frozen.

Canonical projects:
- `LongevityDiet.Domain`
- `LongevityDiet.Repositories`
- `LongevityDiet.Services`
- `LongevityDiet.API`
- `LongevityDiet.Recommendation.Grpc`
- `LongevityDiet.Worker`
- `LongevityDiet.Web`
- `docker-compose.dcproj`

Do not add, rename, move, split, merge, or delete projects/services just to make a task easier.
Do not change the established FE/BE/service ports or runtime boundaries.
Do not introduce direct Browser -> SQL/Redis/gRPC access.
Do not bypass API -> Services -> Repository.
Do not replace Redis Streams, Transactional Outbox, or the independent gRPC Recommendation boundary without explicit team approval.

A real architecture change requires, in the same change:
- explicit team approval;
- affected ADR update;
- affected C4/architecture diagram update;
- README/project-context update;
- project-structure validation update.

## Code placement rules

- Domain: entities/value/domain concepts only; no infrastructure dependency.
- Repositories: EF Core persistence/query and canonical `LongevityDietDbContext`.
- Services: business rules and application workflows.
- API: HTTP/auth/validation boundary, DI composition, OpenAPI; no business-rule dumping.
- Recommendation.Grpc: independent recommendation gRPC host.
- Worker: async/scheduled jobs, Outbox publication, Redis Streams consumption.
- Web: browser UI only; use the existing API client/proxy convention.
- Do not create generic `Helpers`, `Utils`, or god-service folders/classes as dumping grounds.

## Mandatory pre-merge validation

Run:

```powershell
.\scripts\Validate-ProjectStructure.ps1
dotnet build .\LongevityDiet.sln -c Debug
dotnet test .\LongevityDiet.sln -c Debug --no-build

cd .\src\LongevityDiet.Web
npm run lint
npm run build
```

If runtime boundaries changed, also run Docker Compose and the relevant E2E flow.
