# PRN232 — Appendix A Non-Unit Numeric Exceptions (2026-11-15)

## Why the previous audit was insufficient
The original 350 matched PDF tokens cover **numbers followed by selected recognized units**, not all numerical claims or ingredient counts. This inventory must **not** be marketed as 100% extraction of every ingredient, portion, nutrition fact, food alternative or book recipe.

## Verified against the owner-provided original PDF
Source fingerprint: `c4e762039b877d185ae1f44035cace4ba95f1791adbafb8097a0764dd26757d6`, 306 pages.

- Pages 215–242: **13** snack-bar descriptions specify 150 calories, dark chocolate with minimum 70% cocoa, less than 8 g sugar and no milk. Only the 8 g sugar limit was previously categorized; this adds the other criteria explicitly as **composition criteria**, not portion sizes.
- PDF page 223 (week 1, day 5, breakfast): the fruit example contains **one kiwi** alongside a medium banana. The original 350-token parser detected the medium banana but not the kiwi count.
- PDF page 225 (week 1, day 6, breakfast): the fruit example contains **one apple** alongside strawberries. The original numeric-unit parser did not detect the apple count.
- Five occurrences of the `½` symbol alongside squeezed lemon occur in the source text. Fraction-glyph handling and other count words are still a distinct unreviewed extraction issue, not silently counted as verified.

These are *selected, independently checked exceptions*, not a claim that all unparsed numbers have been found. No supplement dosage, original copyright recipe directions or user-specific meal plans are added.

## Implementation
The supplemental metadata is kept separate from the 350 source number/unit signatures in `bookAppendixQuantities.json` to avoid falsifying their witness audit. The public /book reference UI explains the missing coverage and shows additional snack-composition criteria and the two fruit counts, explicitly labelling both as historical source facts rather than nutrition recommendations.

## QA
- Vitest regression checks source-metadata exact values, 13 bar mentions, two item counts and preserves 54 unverified full-meal editorial statuses.
- Playwright in isolated Docker QA verifies the visible source notes in a real Chromium browser.
- No API or database changes; no original PDF or content transcript committed.
- The long-term editorial requirement remains: independently audit all 56 meal slots for complete ingredient identity, count, quantity, alternatives, source preparation text, and allergy context. Exactly two slots currently have full source-page review flags.
