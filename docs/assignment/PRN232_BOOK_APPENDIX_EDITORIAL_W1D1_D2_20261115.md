# Appendix A — week 1, days 1–2: source-page editorial cross-check

Date: 2026-11-15. Source: the user-owned 306-page PDF of Valter Longo's 2018 book, SHA256 c4e762039b877d185ae1f44035cace4ba95f1791adbafb8097a0764dd26757d6. Source pages were visually inspected and compared with their machine-readable text layers: PDF pages 215, 216, 217 and 218. The original copyrighted PDF is NOT copied to GitHub.

## Findings and repairs
- Week 1, day 1, breakfast (PDF 215): **20 g / 1 tbsp was mistranslated as "mật" (honey)**. The source actually specifies *blueberry jam with no added sugar*. Corrected both fact labels and the meal title. The 60 g focaccia-with-extra-virgin-olive-oil value remains a COMPOSITE accompaniment, not 60 g of oil. The source additionally requires a fortified unsweetened plant milk; optional coffee/barley drinks are not converted to ingredient weights.
- Week 1, day 1, snack (215): 240 mL unsweetened coconut milk and the snack-bar conditions were checked. The bar's less-than-8-g sugar is a COMPOSITION CEILING, not a serving size; approximately 150 kcal and at least 70% dark chocolate, with no milk, are additional original-source conditions.
- Week 1, day 1, dinner (216): checked black beans (boiled, wet/drained), broccoli, whole-grain pasta, olive oil, garlic, Parmesan; corrected four misleading generic labels. Walnuts and dried unsweetened cranberries are SUGGESTED dessert, not compulsory dish ingredients. Supplement mentions in the book MUST NOT become automatic prescriptions.
- Week 1, day 2, breakfast (217): checked cereal and almond-milk amounts; two tea bags and fresh lemon are unquantified in the parser.
- Week 1, day 2, lunch (217): corrected generic wild-rice and olive-oil labels. Side leafy greens are distinct from rice/beans; lemon, basil, pepper and optional seasoning are not assigned invented amounts.
- Week 1, day 2, snack (217): confirmed hazelnut milk and the non-additive snack-bar composition requirements.
- Week 1, day 2, dinner (218): checked wild-caught salmon, asparagus, oil, side whole-wheat bread, optional salad and suggested dessert; clarified olive-oil and fish-origin labels. Salt/lemon and steam/bake preparation are context, not new numeric quantities.

## New audit totals
- Seven additional meal slots were source-page-crosschecked (12 numeric fact labels corrected).
- **9 of 56** slots now source-page-crosschecked at a SOURCE-IDENTITY level, containing **55** of 350 numeric/unit tokens. The remaining **47 of 56** slots still require this level of source-page review. The 350 PDF-derived numeric/unit signatures remain UNCHANGED and continue to match 56/56.
- The inventory metadata intentionally remains `unverified-machine-extraction` for the whole 56-slot dataset: this is an AI-assisted comparison, NOT independent human editorial approval, medical safety certification, proven nutrition amounts for an individual, or permission to feed recipes into Gemini.
- The displayed reference page shows the new source-context notes, dynamic reviewed/unreviewed counts, and existing explicit safety warnings. No recipe is promoted to BookExact or added to an AI meal-plan pool by this change.

## Further acceptance gates
Independent editorial review is still needed for all clinical use; 47 slots have not yet had full page-context comparison, and Appendix B plus main chapters are outside this batch. Keep the original source private, preserve all SQL volumes, and do not claim 100% book extraction.
