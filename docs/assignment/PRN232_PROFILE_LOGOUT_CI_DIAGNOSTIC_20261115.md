# PRN232 CI repair: logout available when profile GET is pending or fails (2026-11-15)

## Repro evidence
PR #78, GitHub Actions run 43733234433, `current-runtime-release-smoke` failed twice in independent attempts. Both runs passed 29 Chromium E2E cases and timed out during `member-journey.spec.ts` after opening `/profile`, while waiting for the accessible `Đăng xuất` button. GitHub `validate` passed. Failure is not in `/book` and is NOT silently waived by retrying.

## Defect and remediation
- The existing `ProfileEditorPage` rendered **no logout control at all** in `useQuery(/profile)` loading and error states, even if the member had an authenticated browser session.
- Render the same logout control from all **three non-onboarding** states: loading, error and successful profile. Reuse the existing session-clearing/revocation `handleLogout`; do not fake authentication state or bypass authorization.
- Keep the onboarding setup page free of the logout button, preserving its existing behavior.
- Add React/Vitest coverage for loading, error, success, onboarding; each non-onboarding test clicks the real UI control and asserts logout handler and redirect.
- Strengthen E2E final step to confirm profile route and visible logout separately before clicking, improving failure diagnostics.
- This is a UI resilient logout fix, not proof of why the profile GET failed in CI; further E2E on the exact PR head is mandatory.

## Validation and merge gate
- Web lint, full Vitest/Node and production build, full .NET tests and GitHub `validate` must pass.
- GitHub Docker `current-runtime-release-smoke` including member journey must pass before merge.
- After merge, PR #78 must be rebased on new main and its Docker E2E rerun. Do NOT merge PR #78 with a failed CI report.
- No SQL volume, Docker user data, Gemini secret or copyrighted book source changed.
