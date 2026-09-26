# 01 — Book Research & Rule Extraction

## 1. Book identification
- Vietnamese title: **Chế Độ Ăn Trường Thọ: Tối ưu cân nặng, đẩy lùi bệnh tật, kéo dài tuổi thọ**.
- Author: Valter Longo, Ph.D.
- Vietnamese publisher: NXB Dân Trí; Alpha Books/MedInsights distribution.
- Translator: Nguyễn Khánh Chi.
- Alpha Books lists 300 pages.
- Original title: *The Longevity Diet*.

## 2. What comes from the Alpha Books material
Alpha Books presents the book as combining longevity, diet, exercise and the fasting-mimicking diet (FMD). It also describes the book's “Five Pillars” framing through Longo-related material.
Source: https://shop.alphabooks.vn/che-do-an-truong-tho-toi-uu-can-nang-day-lui-benh-tat-keo-dai-tuoi-tho-p28835578.html

## 3. Five Pillars → software provenance
The Five Pillars described by Longo-related sources are:
1. Basic/“juventology” research.
2. Epidemiology.
3. Clinical studies.
4. Studies of centenarians/long-lived populations.
5. Complex-systems reasoning.

**Requirement implication:** every `DietRule` stores `SourceType`, `SourceUrl`, `EvidenceLevel`, `RuleVersion`, `IsMedicalSensitive`, `EffectiveFrom`.
This lets the team explain where each recommendation came from.

Official reference:
https://www.fondazionevalterlongo.org/wp-content/uploads/2024/02/2024-01_fondazione-longo_digiuno-e-longevita-EN-libro.pdf

## 4. Adult everyday-diet principles → software rules
Official Longo Foundation material describes a mostly plant-based/pescatarian pattern, legumes as a major protein source, complex carbohydrates and healthy fats, moderation of sugar/saturated fat, age-sensitive protein guidance, and a daily eating window.
Reference: https://www.fondazionevalterlongo.org/en/longevity-diet-for-adults/

| Principle | Software transformation |
|---|---|
| Mostly plant-forward, some fish | Meal ranking boosts vegetables, legumes, whole grains, nuts/healthy oils; fish is configurable |
| Protein is sufficient but moderated and age-aware | Informational target band configured by age/profile; never “prescribe treatment” |
| Prefer complex carbohydrates | Food taxonomy rewards whole grains/legumes/vegetables |
| Minimize refined sugar/saturated fat | Ranking penalty + dashboard metric |
| Healthy fats | Positive feature for olive oil/nuts/appropriate fish |
| Eat within about 12 hours | Eating-window tracker |
| Avoid eating close to bedtime | Compare LastMealAt vs SleepTime |
| Meal frequency varies with profile | Planner supports safe 2- or 3-meal templates |
| Traditional foods can be preferred | Cuisine/cultural preference field |
| Exercise is part of the lifestyle | Weekly activity goals and strength-session tracking |

## 5. Exercise principles
Longo's public exercise guidance emphasizes daily activity, walking, moderate exercise and muscle-strengthening.
Reference: https://valterlongo.com/exercise-and-longevity/

**Requirements:**
- Track walking/moderate/vigorous minutes.
- Track strength sessions.
- Weekly target/progress dashboard.
- Activity reminder is configurable, not coercive.
- App supports limitations/accessibility through customized target values.

## 6. FMD evidence and limits
A 2017 randomized clinical trial in 100 generally healthy participants tested three monthly 5-day FMD cycles. Reported changes included weight/body fat, blood pressure and IGF-1; post-hoc analyses suggested larger changes for some at-risk participants.
PubMed: https://pubmed.ncbi.nlm.nih.gov/28202779/

A 2024 secondary/exploratory analysis reported changes in insulin resistance/prediabetes-related markers, hepatic fat, immune-related markers and a validated biological-age measure after three cycles.
PubMed: https://pubmed.ncbi.nlm.nih.gov/38378685/

**Important interpretation:** these studies do not justify an app predicting individual lifespan or independently treating disease.

## 7. FMD safety requirement
Longo Foundation material says serious conditions such as cancer, diabetes, cardiovascular, autoimmune or neurodegenerative disease require specialist/dietitian involvement; disease-treatment use is not something the app should autonomously prescribe.
Reference: https://www.fondazionevalterlongo.org/en/diabetes-obesity/

Therefore:
- FMD is a **separate module** from normal meal planning.
- MVP can educate and track a clinician-approved/self-acknowledged cycle.
- High-risk answers route to `ProfessionalReviewRequired`.
- No disease-specific protocol generation.
- No medication modification.
- Multi-day fasting recommendation is never generated solely by AI.

## 8. 14-day plan
The app's “14-day challenge” is **original product logic**, not a reproduction of the book's sample menu.
Suggested progression:
1. Baseline profile/logging.
2. Plant-forward meal adoption.
3. Vegetable/legume consistency.
4. Whole-grain focus.
5. Healthy-fat awareness.
6. Sugar/saturated-fat reduction.
7. Eating-window consistency.
8. Bedtime-spacing check.
9. Walking/activity habit.
10. Strength session.
11. Meal substitution practice.
12. Review score breakdown.
13. Improve weakest dimension.
14. Final review + sustainable next actions.

## 9. Longevity Diet Adherence Score (LDAS)
LDAS is a **project-defined adherence heuristic (0–100)** and is not clinically validated.
Suggested dimensions:
- 25% food-pattern quality.
- 15% vegetable/whole-grain/legume consistency.
- 10% refined sugar/saturated-fat avoidance.
- 15% eating-window adherence.
- 15% activity adherence.
- 10% logging/challenge consistency.
- 10% personalized-rule adherence.

Every score response returns dimension breakdown, triggered rules, missing-data indicator and disclaimer.

## 10. Copyright boundary
The project may summarize principles and cite sources. It should not ship copied chapters, long passages, or the book's exact sample meal plan. Seed recipes should be original/public-domain/team-authored.

## 11. Source hierarchy for implementation
1. User-provided PRN232 PDF = grading/technical contract.
2. Alpha Books page = Vietnamese edition/product framing.
3. Longo/Foundation official pages = public principle definitions.
4. Peer-reviewed PubMed papers = evidence/limitations.
5. Team design decisions = clearly marked as project-specific.
