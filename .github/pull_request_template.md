## Summary

Describe the business change and the active Week/Task.

## Architecture check

- [ ] I did not add/rename/move/delete a solution project or deployable service.
- [ ] I kept API -> Services -> Repository boundaries.
- [ ] I did not add direct Browser -> SQL/Redis/gRPC access.
- [ ] I did not change FE/BE/service ports or runtime boundaries.
- [ ] If architecture really changed, the team approved it and I updated ADR/diagrams/docs in this PR.

## Quality check

- [ ] `pwsh .\scripts\Validate-ProjectStructure.ps1` passes.
- [ ] `dotnet build .\LongevityDiet.sln -c Debug` passes.
- [ ] Relevant .NET tests pass.
- [ ] Frontend lint/build passes when frontend code changed.
- [ ] Relevant E2E/Docker flow was tested when runtime behavior changed.
- [ ] No secret, local `.env`, generated `bin/obj/dist/node_modules`, or debug artifact is included.
- [ ] No placeholder/mock path is presented as completed implementation.

## Evidence

Add screenshots, test output, Swagger/API evidence, or a short reproducible verification flow as appropriate.
