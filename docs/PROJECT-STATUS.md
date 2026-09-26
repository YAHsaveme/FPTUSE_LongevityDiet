# Project Status - 2026-09-25

## Current phase

**Week 1 Task 1 is complete. Tasks 2-4 remain for the rest of the Week 1 product foundation.**

## Completed foundation

- Research, scope, business/functional/non-functional requirements.
- Safety/privacy/AI guardrails.
- Database and API/gRPC/event design documents.
- PRN232 and book-to-software traceability.
- Final 9-diagram architecture set.
- Geometry lint + XML/encoding validation + canonical PNG export pipeline.
- .NET 9 solution structure.
- React + TypeScript + Vite frontend.
- Premium responsive landing page with scroll reveal.
- ASP.NET Core HTTPS hosting of the React build.
- OpenAPI/Swagger and health baseline.
- Docker Compose baseline.
- EF Core/JWT/gRPC/Redis/Serilog dependencies.
- Repository-wide .editorconfig and analyzer/build policy.
- Local development secrets moved to .NET User Secrets.
- Unit and integration test projects separated.
- Route-level frontend code splitting; main JS chunk reduced from ~611 kB to ~338 kB.

## Week 1 Task 1 - completed

Implemented:
- User, UserProfile, RefreshToken.
- LongevityDietDbContext + IdentityFoundation migration.
- User/RefreshToken repositories.
- password hashing.
- JWT access token.
- rotating refresh token + SHA-256 hash persistence.
- HttpOnly refresh cookie.
- Register/Login/Refresh/Revoke.
- reusable ICurrentUser abstraction.
- Member/Admin authorization policy foundation.
- centralized RFC7807 ProblemDetails mapping.
- OpenAPI Bearer security scheme for protected operations.
- Profile GET/PUT.
- React AuthProvider, protected routes, Login/Register/Onboarding/Profile.
- auth-aware landing page navigation.
- test-only appsettings excluded from publish artifact.

Verified:
- Full solution build: PASS, 0 warnings, 0 errors.
- LongevityDiet.UnitTests: 8/8 PASS.
- LongevityDiet.IntegrationTests: 7/7 PASS.
- LongevityDiet.E2ETests: 1/1 Playwright + Chrome PASS.
- npm/Vite production build: PASS; no >500 kB chunk warning.
- Docker Compose static config: PASS.
- Fresh SQL Server database migration from zero: PASS.
- Fresh verification DB contained Users, UserProfiles, RefreshTokens and migration history.
- Verification DB was removed after test.
- HTTPS runtime: /health 200, SPA root 200, /openapi/v1.json 200.
- OpenAPI runtime includes Bearer security scheme.
- API publish excludes appsettings.Testing.json.
- Architecture validation: GEOMETRY_LINT=PASS + 9/9 diagrams PASS.

## Week 1 Task 1 status

**DONE.** Browser E2E, Unit/Integration tests, fresh SQL migration, HTTPS runtime, Docker build/runtime and restart smoke all pass.

## Remaining Week 1 product work

- Task 2: Food/Recipe/Diet Rule catalog and query foundation.
- Task 3: Meal Plan/Meal Log/Eating Window.
- Task 4: gRPC Recommendation + Transactional Outbox + Redis Streams + Worker.

Canonical task documentation:
- `task/ROADMAP-9-WEEKS.md`
- `task/Week 1/` through `task/Week 9/`
- every week contains README + four major Full-Stack tasks.

## Clean-tree rules

Generated directories are not source:
- `bin/`
- `obj/`
- `node_modules/`
- `dist/`
- `src/LongevityDiet.API/wwwroot/`
- `.vs/`
- `TestResults/`
- `coverage/`

They are ignored and are removed from the final clean source tree after verification.

## Configuration

- `appsettings.Development.json` contains no SQL password/JWT signing secret.
- Local development secrets use .NET User Secrets.
- Docker runtime uses local `.env` based on root `.env.example`.
- `.env` is ignored.
- Web has no separate .env.example because same-origin `/api/v1` is the canonical frontend API path.

## Architecture validation

```powershell
pwsh .\scripts\Validate-ArchitectureDiagrams.ps1
```

This command now runs geometry lint first, then validates XML/encoding and exports all 9 canonical PNG previews.

## Next action

Continue Week 1 Tasks 2-4. Do not re-add completed architecture/scaffold work as new tasks.
