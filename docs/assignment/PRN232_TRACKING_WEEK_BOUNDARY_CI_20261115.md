# Regression: weekly activity summary across Asia/Ho_Chi_Minh Monday boundary (2026-11-15)

## CI evidence
- PR #78 commit ac8c497, Actions run 43738851485: `validate` failed on xUnit `ActivityLdasApiTests.WeeklySummaryAndGoal_UsePersistedActivity`, line 228, with `summary.EquivalentMinutes >= 40` false; 120/121 integration tests passed.
- Runner: Sunday 2026-11-15 approx 17:03 UTC, which is **Monday 2026-11-16 00:03 Asia/Ho_Chi_Minh**. The test created an activity at `UtcNow.AddHours(-1)`, within local Sunday (previous reporting week), but fetched `/activities/summary` without a weekStart parameter, thereby requesting the **new current local week**. Correct production behavior returned zero, so the test's assertion was logically invalid across Monday midnight.

## Fix
- In this **test only**, use `TrackingService.LocalDate(startedAt, Asia/Ho_Chi_Minh)` and calculate its actual Monday start. Fetch `/api/v1/activities/summary?weekStart=yyyy-MM-dd` and assert that the API response's WeekStart matches the activity week.
- Keep the real prior-hour activity timestamp and the expected vigorous exercise equivalence: 20 vigorous minutes = at least 40 equivalent minutes.
- No production week aggregation or date/time zone implementation changed; this regression fix checks the correct calendar-week contract rather than masking a correct empty current-week summary.
- Must pass full .NET Release and both GitHub validate/Docker smoke gates before merging PR #78. No user databases or Docker volumes changed.
