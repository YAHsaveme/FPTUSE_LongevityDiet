# PRN232 — Appendix A, week 1 days 3–4: source-page cross-check (2026-11-15)

Original: user-owned The Longevity Diet by Valter Longo, 306-page PDF, SHA256 c4e762039b877d185ae1f44035cace4ba95f1791adbafb8097a0764dd26757d6. PDF pages **219–222** were visually inspected in conjunction with the text layer; the copyrighted source remains outside Git and is not republished.

## Source-identity repairs and semantic distinctions

- Week 1 day 3 breakfast (219): 40 g / 2 tsp is **mixed-berry jam, no sugar added**, not honey. Breakfast uses 60 g toasted whole-wheat bread; optional coffee or tea has no extracted quantity. The two jam units describe one topping, not two portions.
- Day 3 lunch (219): spelt 40 g, zucchini 300 g, garlic 1 clove, cherry tomatoes 100 g, olives 25 g, olive oil 12 mL/1 tbsp; parsley and salt unquantified; 200 g boiled leafy greens is a **side dish**. Source text inconsistently calls the cooked grain “rice” in the instruction although the title/ingredient list says spelt. This contradiction requires independent editorial review: we do not silently substitute rice for spelt.
- Day 3 snack (219–220): the menu offers **garbanzo-bean farinata with raw vegetables OR a berry smoothie** (berries 150 g, hazelnut milk 125 mL). The 240 g chickpea flour + 240 mL water + optional 2 tbsp olive oil apply to **the recipe batch**, never a single person's serving. The source's oven/pan instructions are noted as contextual information but not ingested into automated plans.
- Day 3 dinner (220): chickpea minestrone soup with vegetables, pasta, drained/wet chickpea weight 150 g, oil 25 mL/2 tbsp, Parmesan 5 g/1 tbsp; mixed green salad is a **side dish** without an automatically invented mass. Dessert is **fresh cherries 100 g OR dried cherries 20 g with almonds 25 g**, a suggested option, not mandatory.
- Day 4 breakfast (221): **apricot jam, no sugar added** is 20 g/1 tbsp, **not honey**. Cinnamon-raisin bagel or two slices of toast 80 g are alternatives. The half lemon squeezed into tea/coffee is an unquantified/count item outside the original 350-token extraction.
- Day 4 lunch (221): barley salad with tomatoes, raw mushrooms/peppers, corn, pickled vegetables, pecans, **olive fruits** (12 g/1 tbsp) and distinct **olive oil** (12 mL/1 tbsp); optional seasoning is not assigned invented mass.
- Day 4 snack (221–222): unsweetened coconut milk 240 mL. The snack bar's “under 8 g sugar”, 150 kcal, at least 70% dark chocolate and no milk are **product composition criteria**, NOT ingredient serving weights.
- Day 4 dinner (222): pasta-and-lentil soup with **drained** lentils 150 g, three medium vegetables, garlic, optional rosemary, pasta 40 g and olive oil 25 mL/2 tbsp. Suggested dessert: pineapple 100 g **OR** dried blueberries 20 g **and** walnuts 25 g. A book supplement mention must never become an automatic prescription.

## Proof, invariants, limitation
- 8 newly cross-checked slots, 19 numeric-fact context labels improved; totals now **17/56 page-crosschecked slots, 109/350 numeric-unit mentions**, **39/56 slots still awaiting source-page comparison**.
- SHA256 witnesses for all 56 ordered amount/unit/page sequences remain intact; amounts were not silently changed.
- The metadata `status` remains `unverified-machine-extraction`. The 17 entries have been cross-checked **with AI assistance**, not independently approved by a human editor or qualified clinician. They are reference notes, not user-tailored diet amounts, Gemini prompts or “BookExact”-certified recipes.
- Separate regression tests check jam identity, batch and alternatives; Playwright checks user-facing /book details and notes. The source PDF and protected SQL volumes were not committed or modified.
- The full 306-page book and Appendix B are outside this batch. Do not claim 100% coverage or clinical validation.
