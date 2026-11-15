# E2E hardening after PR #78 Docker failure (2026-11-15)

## Evidence
- PR #78, GitHub run 43739468051: 28 passing Chromium E2E cases; `meal-plan-crud.spec.ts` failed because an accessible "Sửa {recipe name}" selector matched **two different rows** with the same recipe title. `member-journey.spec.ts` failed because `/profile` navigated to `/login` in the final journey step. Both are genuine E2E failures and must not be skipped/ignored.
- A previous PR #79 made the logout control available while profile GET is loading/errored, but this does not solve a **missing browser authentication session** at ProtectedRoute.

## Fix to the test harness without changing production API
- `meal-plan-crud`: scope edit/delete controls to the **specific visible Snack row** added in the journey, not a non-unique recipe title or a global "last" action. Keep readback assertion by actual meal ID and schedule. This tests the correct member operation without assuming unique recipe titles.
- In both E2E workflows, **capture the bearer access token from the browser's real /auth/register response**, instead of calling /auth/login a second time using `page.request`. The second login could rotate/mutate the shared browser context refresh cookie and destabilize the UI session. This is a strong potential cause of the prior redirect, but root cause is only proven after successful independent Docker E2E.
- Keep explicit /profile route verification, real logout button click and access-protected redirect assertions. Do not inject login state, disable auth checks, or convert failures to skips.
- This only adjusts E2E test targeting and authentication setup; it does not bypass the real auth API or change actual user account session rules.

## Gates
- Playwright test discovery/TypeScript parse: 33 tests discovered, 0 parse errors.
- Full `validate` AND `current-runtime-release-smoke` must pass before merging PR #78 or dependent PR #80. If future CI still fails, inspect full job logs and fail closed.
