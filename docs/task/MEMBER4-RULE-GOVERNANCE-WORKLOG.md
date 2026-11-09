# Member 4 W3-T4 — Rule Governance Worklog (09/11/2026)

**Current status: PARTIAL — feature branch implementation, not a production acceptance certificate.**

- Base: `origin/develop` at `21e72bb`.
- Working branch: `feature/w3-t4-rule-governance-20261109`.
- Task owner: Thành viên 4; expected independent reviewer: Thành viên 2.
- Only code verified locally; no push/PR/merge/reviewer sign-off is asserted.

## Source changes

- Rule-version lifecycle: `Draft -> InReview -> Published -> Retired`; rejection returns `InReview -> Draft`.
- Admin-only REST endpoints: `/rule-versions/{id}/review`, `/rejection`, `/publication`, `/retirement`, and paged/filterable `/history`.
- Published/retired versions remain immutable. Invalid transitions return 409; invalid JSON and missing/invalid provenance return 400; Member access to Admin endpoints is forbidden.
- Append-only `RuleAudit` records action, version, actor, timestamp and generic safe details; EF Core `RuleGovernanceAudit` migration generated using canonical DbContext, adding an audit table and a version concurrency token.
- Admin Web shows state-specific actions, provenance, parameters, history pagination/filter and error states.
- Additional `RuleGovernanceApiTests` cover end-to-end state transitions, actor/audit history, authorization and malformed input.
- SQLite test-provider DateTimeOffset sort limitation was fixed in the repository using a provider-specific in-memory sort; SQL Server retains server-side ordering and pagination.

## Verified local gates

| Verification | Result |
|---|---|
| `dotnet build LongevityDiet.sln -c Debug` | PASS, 0 warnings, 0 errors |
| `dotnet test ...` | 66/66 Unit + 70/70 Integration PASS |
| `npm test`, `npm run lint`, `npm run build` | 12/12 PASS, no lint warnings, production build PASS |
| `dotnet-ef migrations has-pending-model-changes` | PASS, no model drift |
| Project structure and static release readiness | PASS |
| `git diff --check` | PASS |
| Docker Compose config | PASS |
| Current live SQL Server migration | NOT VERIFIED |
| Current Docker/Redis/gRPC E2E | NOT VERIFIED |
| Reviewer approval and feature merge | NOT DONE |

## Open gates before release

1. Run a **fresh SQL Server migration** with a disposable database and verify `RuleAudits`, concurrency behavior and API CRUD; SQLite tests do not prove SQL Server-specific schema behavior.
2. Extend C2 + Database Diagram from the **32-table baseline** to include `RuleAudits` and the physical FK, then regenerate and visually verify one-page PDFs and update diagram validation expectations.
3. Complete admin **safety review queue, version-to-result impact view, cross-review controls**, any required API history filtering and concurrent-publish failure/retry tests against SQL Server. Do not imply that a role named Admin by itself constitutes independent approval.
4. Run real browser admin/member/mobile/keyboard scenarios and E2E Worker/Redis/gRPC, capture evidence and have Member 2 review this branch.
5. Keep the **Current Runtime** distinct from ADR-005 **Target Architecture**; Gateway and separate service databases are not part of this feature implementation.
6. Complete all original Final Assignment demo items (see `docs/assignment/FINAL-ASSIGNMENT-COMPLIANCE-AUDIT-20261109.md`).

Do not mark this task DONE until the above gates have passed. Commit only to the feature branch, and do not merge directly to stable branches without team review.
