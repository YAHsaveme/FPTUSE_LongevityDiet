# 12 — Detailed Use Cases

## UC-01 — Register / Login
**Primary actor:** Guest  
**Preconditions:** none.  
**Trigger:** user wants a personal account.

### Main flow
1. User enters email/password.
2. API validates format/password policy.
3. API verifies uniqueness on registration or credentials on login.
4. Password is hashed/verified.
5. API returns access token + refresh token on success.
6. Web stores session according to implementation policy and loads user profile.

### Alternate flows
- Duplicate email → 409/validation-style response.
- Invalid credentials → 401 without revealing which credential is wrong.
- Rate limit reached → 429.

### Postconditions
Authenticated session exists; audit/security logs contain no password/token.

### Acceptance
- Protected endpoint rejects missing/invalid token.
- Refresh/revoke works.
- Admin role cannot be self-selected during public registration.

---

## UC-02 — Complete onboarding/profile
**Primary actor:** Member  
**Preconditions:** authenticated.  
**Trigger:** first login or profile edit.

### Main flow
1. User enters demographic/profile fields needed by rules.
2. User chooses dietary pattern/preferences.
3. User records allergies/excluded foods.
4. User configures typical sleep/eating schedule and timezone.
5. API validates and stores profile.
6. API requests applicable-rule recalculation.
7. Web displays profile completion state.

### Alternate flows
- Required rule input missing → save partial profile but mark personalized planning unavailable/partial as designed.
- Allergy duplicates → normalize/deduplicate.
- Invalid timezone/time input → validation error.

### Acceptance
- User can only modify own profile.
- Allergy is persisted as hard constraint metadata.
- Profile update is traceable through event/audit strategy.

---

## UC-03 — Browse food/recipe catalog
**Primary actor:** Member/Admin  
**Preconditions:** catalog seeded; auth as required.

### Main flow
1. User opens catalog.
2. Web sends page/pageSize/search/filter/sort.
3. API validates allow-listed query parameters.
4. Repository executes paginated query.
5. API returns items + total/page metadata.
6. User opens item detail.

### Acceptance
- Search/filter/sort/pagination demonstrated in Swagger.
- Soft-deleted/inactive records excluded from Member result.
- Admin can view/manage appropriate inactive records.

---

## UC-04 — Generate 7/14-day meal plan
**Primary actor:** Member  
**Preconditions:** authenticated; minimum profile complete; active recipes/rules exist.

### Main flow
1. User selects 7 or 14 days and start date.
2. API loads profile, allergies, exclusions and active RuleSetVersion.
3. Planner removes hard-invalid candidates.
4. Planner scores/selects remaining candidates using configured rules.
5. Plan/Days/Meals and rule-set version are stored.
6. Outbox event is stored in same transaction.
7. API returns plan with reason summaries.
8. Web renders daily plan.

### Alternate flows
- Too few valid recipes → return partial plan plus actionable reason.
- Missing required profile data → return validation/problem response.
- Duplicate retry → idempotency strategy avoids accidental duplicate plan if implemented.

### Acceptance
- Allergen recipe cannot appear.
- Historical plan keeps original RuleSetVersion.
- Plan generation does not generate FMD treatment protocol.

---

## UC-05 — Replace a planned meal
**Primary actor:** Member  
**Preconditions:** active plan and planned meal.

### Main flow
1. User clicks Replace.
2. API loads user constraints and candidate recipes.
3. API calls Recommendation gRPC RankMeals.
4. gRPC hard-filters, ranks and returns reason codes.
5. Web shows alternatives with “Why this?”.
6. User selects one.
7. API creates plan revision/replacement record and outbox event.
8. Updated meal appears in plan.

### Alternate flows
- gRPC unavailable → controlled fallback/service unavailable; current plan remains unchanged.
- No safe candidate → explain no alternative found.
- Candidate conflicts after concurrent catalog change → API revalidates before commit.

### Acceptance
- Browser never calls gRPC directly.
- Allergy/exclusion cannot be overridden by feedback/AI.
- Recommendation request is observable in logs.

---

## UC-06 — Log/edit/delete a meal
**Primary actor:** Member  
**Preconditions:** authenticated.

### Main flow
1. User selects food/recipe and consumed time/amount.
2. API validates ownership/catalog references.
3. MealLog + items saved.
4. Outbox MealLogged event saved.
5. Worker later processes derived recalculation request.
6. Eating-window and adherence views update.

### Alternate flows
- User edits time/items → derived daily metrics recalculated.
- User deletes → soft-delete; normal queries exclude.
- Timezone boundary changes local day → service recalculates correct affected dates.

### Acceptance
- Cross-user modification blocked.
- First/last meal snapshot is consistent after edit/delete.
- Event processing is idempotent.

---

## UC-07 — Log activity
**Primary actor:** Member  
**Preconditions:** authenticated.

### Main flow
1. User records activity type, duration, intensity/time.
2. API validates duration/date.
3. ActivityLog stored.
4. ActivityLogged event generated.
5. Weekly progress/LDAS recalculation occurs.
6. Dashboard shows aggregate minutes/sessions.

### Acceptance
- Duration cannot be negative/invalid.
- Activity targets are configurable and not presented as medical prescription.

---

## UC-08 — View LDAS & progress
**Primary actor:** Member  
**Preconditions:** profile/log data available.

### Main flow
1. User opens dashboard.
2. API loads latest score snapshot/trends.
3. If stale, application may schedule/recalculate per design.
4. Response includes 0–100 adherence score, dimensions, rule explanations, missing data and RuleSetVersion.
5. Web renders breakdown and trends.
6. User expands “Why this score?”.

### Alternate flows
- Insufficient data → partial score with explicit missing-data state.
- No score yet → onboarding/first-log CTA.

### Acceptance
- Response/UI says score is non-clinical.
- No lifespan/biological-age prediction.
- Same input/rule version yields deterministic score.

---

## UC-09 — Start and progress through 14-day challenge
**Primary actor:** Member  
**Preconditions:** authenticated; no same-type active challenge.

### Main flow
1. User starts challenge.
2. System creates 14 ChallengeDay records from original team template.
3. Daily tasks are shown.
4. Log-derived task may auto-complete; explicit task can be confirmed.
5. Streak/progress updates.
6. Day 14 displays review of sustainable behaviors.

### Acceptance
- Exactly one active same-type challenge.
- Challenge contains original project content, not copied sample menu.
- Completion is auditable/deterministic.

---

## UC-10 — Configure reminders & receive weekly report
**Primary actor:** Member / Worker  
**Preconditions:** reminders enabled; worker running.

### Main flow
1. User configures reminder type/time/days.
2. API stores local schedule + timezone.
3. Worker calculates due reminders.
4. Worker processes due job idempotently.
5. Weekly scheduled job aggregates prior week.
6. WeeklyReport stored and notification event/log produced.
7. User views report.

### Acceptance
- Worker restart does not duplicate report.
- Reminder/report is demonstrable with accelerated demo schedule.
- Failure enters retry/DLQ strategy.

---

## UC-11 — FMD education and safety gate
**Primary actor:** Member  
**Preconditions:** authenticated for tracking; education may have public summary.
