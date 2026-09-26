# 08 — Safety, Privacy & AI Guardrails

## 1. Product classification
This project is a wellness/education/adherence application for coursework.
It must not present itself as a medical device, physician, dietitian or disease-treatment system.

## 2. Safety-sensitive areas
- Multi-day fasting / FMD.
- Diabetes or glucose-lowering medication.
- Pregnancy/breastfeeding.
- Eating-disorder history/risk.
- Underweight/frailty.
- Serious cardiovascular, cancer, autoimmune or neurodegenerative illness.
- Children/adolescents.
- Elderly users with muscle-loss risk.

The app should route these scenarios to appropriate professional guidance instead of autonomous prescriptive plans.

## 3. FMD gate
State machine:
`EducationViewed → AssessmentRequired → AssessmentSubmitted → EligibleForTracking | ProfessionalReviewRequired`.

If `ProfessionalReviewRequired`:
- Disable self-generated FMD cycle plan.
- Allow education/source viewing.
- Show concise professional-review guidance.
- Do not ask AI to “find a workaround”.

## 4. Normal meal-plan boundary
Normal meal planning can use dietary preferences and book-inspired rules, but:
- No disease-specific therapeutic targets.
- No medication changes.
- No supplement megadose recommendations.
- No life-expectancy predictions.
- No claim that a score means lower disease probability.

## 5. LDAS guardrail
Label: **Longevity Diet Adherence Score**.
Required UI text:
- “Measures adherence to the app’s configured diet/lifestyle rules.”
- “Not a clinical score and not a prediction of lifespan or disease.”

Do not call it:
- Longevity Score
- Biological Age Score
- Health Risk Score
unless a validated clinical method and governance are added in future.

## 6. AI usage
### Allowed
- Rewrite structured recommendation reasons into friendly Vietnamese/English.
- Explain application features.
- Summarize the user's own logged trends using already-computed metrics.
- Suggest recipe wording from an approved candidate set.

### Not allowed
- Override allergy/safety hard constraints.
- Diagnose disease.
- Generate disease treatment.
- Invent evidence/source links.
- Generate autonomous FMD therapeutic protocol.
- Calculate medication/supplement dosage.
- Modify deterministic LDAS score.

## 7. AI architecture
Preferred MVP:
`Rule Engine → Structured Reasons → optional Local LLM/Ollama rewrite → Output Validator → User`.

If local AI is not available, UI displays structured templated explanation.
This makes AI optional and free for the project.

## 8. Prompt construction
Send only minimum data:
- recommendation reason codes,
- selected recipe name/features,
- user preference labels necessary for explanation.
Do not send password/token/full medical questionnaire.

System prompt requires:
- no diagnosis,
- no new nutrition rule,
- no unsupported benefit claim,
- explain only supplied reasons.

## 9. Output validation
Before returning AI explanation:
- length limit,
- prohibited medical-claim keywords check,
- verify referenced recipe IDs/reason codes exist,
- fallback to deterministic template on failure.

## 10. Privacy
- Synthetic seed/demo data only.
- JWT/refresh tokens never logged.
- Password never logged.
- User-sensitive profile fields excluded from generic analytics logs.
- Admin access to another user's data is audited.
- Soft deletion and retention policy are documented.
- Optional AI context is minimized.

## 11. Security checklist
- Hash passwords and refresh tokens.
- HTTPS outside local development.
- Role + ownership authorization.
- DTO validation.
- Rate limiting.
- CORS allowlist.
- Environment secrets.
- SQL query parameterization via EF Core.
- Dependency/container updates.
- Health endpoints without leaking secrets.

## 12. Evidence communication
Distinguish three layers in UI/docs:
1. **Book/official principle** — what Longo-related sources state.
2. **Peer-reviewed evidence** — what a specific human study actually measured.
3. **Project heuristic** — LDAS weights/ranking choices created by the team.

Never present layer 3 as proven by layer 2.

## 13. Supporting public sources
- Adult diet guidance: https://www.fondazionevalterlongo.org/en/longevity-diet-for-adults/
- Exercise guidance: https://valterlongo.com/exercise-and-longevity/
- Serious-disease/FMD caution: https://www.fondazionevalterlongo.org/en/diabetes-obesity/
- 2017 randomized trial: https://pubmed.ncbi.nlm.nih.gov/28202779/
- 2024 analysis: https://pubmed.ncbi.nlm.nih.gov/38378685/
