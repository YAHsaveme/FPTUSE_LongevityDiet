# PRN232 — Appendix A week 1 days 5–6: PDF source-page review (15 Nov 2026)

Source: user-supplied 306-page PDF of Valter Longo's The Longevity Diet, SHA256 c4e762039b877d185ae1f44035cace4ba95f1791adbafb8097a0764dd26757d6. **PDF pages 223–226** were inspected as actual rendered images AND compared against source text. Do not distribute the original copyrighted PDF in the repository.

## Findings
- W1 D5 breakfast, p223: Steel-cut oats **90 g is printed twice** in the source; the second instance is marked `source-duplicate` and MUST NOT be counted as 180 g. Almond milk 240 mL, **real honey** 10 g/2 tsp; do not confuse this genuine honey with jam mistranslations on days 1, 3 and 4. Fruit example includes 1 medium banana and 1 kiwi; a fruit count is not a mass inferred by the parser.
- D5 lunch, p223: escarole, pine nuts 9 g/1 tbsp, distinct olive oil 12 mL/1 tbsp, sun-dried tomatoes 150 g, basil 5 leaves; toasted brown bread 40 g and raw/boiled carrots 150 g are SIDE dishes. Dish title mentions olives but ingredient list has no numeric olives value: quantity must NOT be invented.
- D5 snack, pp223–224: unsweetened hazelnut milk 240 mL. The snack bar’s less-than-8-g sugar, 150 kcal, ≥70% dark chocolate and milk-free attributes are **product composition requirements**, not servings/ingredients.
- D5 dinner, p224: fresh/frozen octopus 60 g, potato, cherry tomatoes, **olive fruits** 20 g vs separate **olive oil** 25 mL/2 tbsp, brown toast 40 g; green salad 200 g is a SIDE. Suggested dessert: fresh cranberries 50 g **OR** dried cranberries 20 g with almonds 25 g. Herbs, lemon, salt lack specified masses.
- D6 breakfast, p225: 60 g is for **dried whole-wheat focaccia with olive oil combined**, not 60 g pure oil. Coffee/tea with half squeezed lemon; 1 apple and strawberries are unquantified/context values, not substituted masses.
- D6 lunch, p225: grilled eggplant 250 g, olive oil 12 mL/1 tbsp, cherry tomatoes 150 g, feta 20 g, **rye crackers** 40 g SIDE; basil/salt/pepper no invented numbers.
- D6 snack, p225: unsweetened almond milk 240 mL; same under-8-g sugar BAR product criterion.
- D6 dinner, pp225–226: navy beans 150 g **wet, drained**, green beans 150 g, two medium carrots, one medium potato, zucchini 150 g, one large tomato, two garlic cloves, five basil leaves, pasta 40 g, olive oil 25 mL/2 tbsp, Parmesan 5 g/1 tbsp. Side salad is unquantified. Hazelnuts 25 g + dried blueberries 20 g are suggested dessert, not mandatory ingredients.

## Audit status and controls
- **8 more meal slots** matched to visual/text source context, **24 context labels adjusted**, totals **25 of 56 meal slots, 161 of 350 numerical-unit mentions** cross-checked; **31 of 56 slots still pending this degree of review**.
- All 56 ordered source amount/unit/page digests are unchanged; context notes and semantic fact type were updated. The parent metadata remains **`unverified-machine-extraction`**, because checking with AI assistance is NOT independent human editorial sign-off, nutrition measurement, clinical approval, or license to feed these rows into Gemini/BookExact recipes.
- Vitest source assertions cover duplicate oats, true honey vs jam, composite focaccia, dessert alternatives, and sugar limits. Playwright checks /book details on days 5/6. No original PDF, protected SQL database, Docker volume, or Gemini credentials were committed/modified.
- Larger remaining work: 31 source-page meal slots, Appendix B/chapter verification and independent clinical/source review. Never advertise complete book compliance or personalized nutrition recommendations from this dataset.
