# PRN232 — Source Semantic Audit & Fraction Repair (2026-11-15)

**Source authority:** user-provided original English PDF, *The Longevity Diet* (2018), 306 pages, fingerprint `c4e762039b877d185ae1f44035cace4ba95f1791adbafb8097a0764dd26757d6`. All source references below are **PDF page numbers**. No book PDF, full recipe directions, or copyrighted sample meal-plan transcript is committed.

## Root cause: independent token agreement was necessary but insufficient

The earlier text-layer extraction matched 350 quantity/unit **tokens** in 56 meal slots, yet its regex failed to recognize a fraction. On PDF page **239**, the source states **red onion (1/2 medium)**, while the existing regex silently matched only **2 medium**. This is a source-semantic error despite the initial 350/350 raw token signatures passing.

**Correction:** The raw source parser now recognizes `numerator/denominator` before integer/decimal matches; the stored onion value is **`1/2`**, unit `medium`. A re-run against the book confirms 56 slots and 350 amount/unit mentions, with exactly one fraction. The independent per-meal source digest witness for week 2/day 6/lunch is updated accordingly. The UI renders **1/2 cỡ vừa**, rather than 2.

## Other manual spot-check corrections

The source list is not a fully approved meal plan, but **57 fact/context entries** have been corrected or annotated against nearby text on PDF pages 215–242.

| Example | PDF page | Defect removed |
|---|---:|---|
| Mixed green salad / vegetables on the side | 217, 218, 219, 223, 224, 227, 239 | Previously mislabelled as lemon, vinegar, salt or bread |
| Dessert fruit, nuts and permitted alternatives | 216, 218, 220, 224, 228, 230, 232, 234, 240, 242 | Wrong fruit/nut name or distinct options treated as one |
| Pumpkin seeds | 231 | Mislabelled as pumpkin flesh |
| Whole-wheat cereal bar | 237 | Mislabelled as uncooked rice |
| Pizza sweet pepper | 242 | Mislabelled as 100 g of pepper spice |
| Source duplicate | 223 | Same 90 g oat mention appears twice; must not be added together |
| Chickpea flatbread recipe ingredients | 219–220 | Whole-recipe batch amounts must not be described as personal portions |
| Alternative snack paths | 219–220, 231–232 | Options must not be summed or portrayed as simultaneously required |
| Composite bread with olive oil | 215, 240 | Combined quantity must not be assigned wholly to the oil |

Each corrected value was asserted against the previous key/index/value/unit to guard against silently patching the wrong item. The reference page now displays labels for composite, alternative, batch, duplicate, fraction and sugar-limit facts rather than implying that all items represent unique serving quantities.

## Tests and boundaries

- `bookAppendixPdfAudit.test.ts` has new regression assertions for the fraction, mismatched ingredient identities, alternatives, batch quantities and duplicate source mentions.
- `verify_book_appendix_pdf.py` supports PDF fractions, all 56 slots and all 350 text-layer quantity mentions.
- `book-reference-ui.spec.ts` adds actual browser acceptance for **1/2 onion**, other ingredients on page 239, option/batch note and duplicate-value note.
- Frontend lint, 38 Vitest tests, 10 Node tests, production build, isolated QA Playwright and GitHub CI must all pass before merge.
- **Review status is deliberately unchanged:** 2/56 source-page-checked and 54/56 requiring full editorial recipe review. These repairs are **not** medical or clinical certification and are **not** AI diet generation inputs.

## Remaining hard gates for any claim of 100% content compliance

1. Full independent ingredient/recipe editorial verification for 54 meal slots, all instructions, notes and recipe-batch yields. Source line matching alone does not establish household measurements, nutrient composition, appropriate servings or cooking safety.
2. Source traceability for Appendix B and chapters 1–12; health claims require evidence review and contraindication handling, not direct conversion into a personal prescription.
3. Provenance-aware AI generation: distinguish `BookExact` vs `Adapted` vs `Demo` after actual expert/editorial approval; never auto-upgrade an unreviewed reference.
4. Separate final CRUD/soft-delete and all-roles UI acceptance including one continuous submission demo video. GitHub CI green is an engineering gate, not proof every user journey was operated manually.
