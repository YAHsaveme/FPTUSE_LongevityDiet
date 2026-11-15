# PRN232 — Appendix A PDF source audit (2026-11-15)

**Source:** User-supplied `The Longevity Diet` by Valter Longo (2018), ISBN 9780525534075, 306 PDF pages. SHA-256: `c4e762039b877d185ae1f44035cace4ba95f1791adbafb8097a0764dd26757d6`. The book PDF is **not** distributed or committed to Git.

**Later source-page update, 2026-11-15:** The 2/56 and 54/56 figures below describe the original machine-token audit baseline. An additional seven slots on PDF pages 215–218 were subsequently checked against the rendered PDF and text. The current counts are **9/56 source-page-crosschecked** and **47/56 still awaiting that review**, with 55 checked numeric facts. See `PRN232_BOOK_APPENDIX_EDITORIAL_W1D1_D2_20261115.md`. The whole dataset remains unverified for independent human/medical purposes.

## Verified technical evidence, not medical/recipe approval

1. The original PDF text layer was independently parsed on pages **215–242** with PyMuPDF, splitting by **week / day / breakfast / lunch / snack / dinner**. All **56** meal slots were recovered; the parser found exactly **350** ordered amount/unit tokens.
2. The imported `bookAppendixQuantities.json` has matching amount, unit, sequence, source page and slot for **350/350** tokens across **56/56** slots. Independent per-meal SHA-256 prefix witnesses are in `bookAppendixPdfAudit.test.ts` and are validated in CI. This detects amount/page/sequence drift; it does **not** independently validate culinary semantics or nutrition.
3. The 42 previously null `labelVi` values were repaired from nearby **PDF source context**, with special care for split lines, dessert alternatives and composite servings. E.g., the **60 g** on page 240 refers to a combined focaccia-with-olive-oil accompaniment, **not** 60 g pure olive oil.
4. The **13** occurrences of **less than 8 g sugar** for a snack bar are now typed `composition-limit` plus `comparison=less-than`; one previously misleading chocolate ingredient label was corrected. The UI displays **< 8 g** and explicitly describes this as a sugar limit rather than a serving quantity.
5. `bookAppendixQuantities.metadata.status` remains `unverified-machine-extraction`. Exactly **2/56** meals remain `source-page-checked` (20 facts); **54/56** remain `needs-human-review`. No nutrition or recipe is newly allowed into the AI menu because of this audit.

## What still needs independent editorial and safety review

- Read all **54** remaining meals against original pages **215–242**, checking not just quantities but **ingredient identity, optional alternatives, preparation, units, nutritional context, allergies and referenced notes**. Automated text matching alone cannot complete this review.
- Audit the book's full chapter content and Appendix B separately, including health claims and nutritional tables. Neither 350 matched tokens nor zero missing labels proves all 306 pages have been extracted.
- Maintain explicit `BookExact` / `Adapted` / `Demo` status for recipe catalog items. Never advertise sample diets as universally suitable, or switch unreviewed source material into Gemini generation.
- Confirm any broader soft-delete/versioning policies and UI CRUD acceptance separately. This branch only changes the book source-reference presentation and its evidence, not diet rules or clinical decisions.

## Reproducibility and QA

- `python scripts/verify_book_appendix_pdf.py --pdf "path/to/user-owned.pdf" --report "local-audit.json"` checks source SHA, all 56 ordered meal signatures, missing labels and sugar-limit typing. Requires optional `pymupdf`; the source PDF remains outside the public repository. This tool reports raw source-token agreement **only**, not human certification.
- `cd src/LongevityDiet.Web && npm test && npm run build && npm run lint` checks 56 separate source signatures, review invariants, book metadata, frontend and unit/Node tests.
- `tests/LongevityDiet.E2ETests/specs/book-reference-ui.spec.ts` tests the actual reference UI, snack sugar ceiling, absence of unlabeled records, unverified-review warning and mobile layout on an isolated Docker QA deployment.
- Only synthetic QA data and isolated Docker volumes may be used for E2E tests. No user account, Gemini API key or live health information should enter this validation.

**Outcome:** Structural source-token audit completed, 42 missing labels resolved, 13 non-ingredient restrictions correctly typed. **Not 100% source-edited**: 54 meals still need recipe-level human/editorial review, and this result is not a clinical endorsement.

### CI / portability note
The default Windows development machine does not currently have the `python` command installed. The independent per-meal SHA witness test runs using existing Node/Vitest dependencies without Python; the optional PyMuPDF verifier is provided for an environment where the **user-owned PDF** is locally available. The source file is not uploaded to GitHub. GitHub Actions for this repository only trigger PR checks against `main` or `develop`, so this stacked series targets `main` for CI while retaining the prerequisite order #66 → #67 → #68 for reviewer coordination.
