# LongevityDiet typography review — Vietnamese readability refresh

**Date:** 13 November 2026
**Scope:** Frontend visual typography only. No API, business-rule, permissions, database, worker, or routing changes.
**Branch:** `ui/prn232-ui-ux-pro-max-refresh-20261113`

## Problem found in the previous UI

The previous combination of **Cormorant Garamond** editorial serif and **Manrope**
created large ornamental headlines but left much of the real application hard to scan.
Older CSS had labels, nutritional metadata, rule version text and administrative
controls at **8–11px**. The typographic voice was inconsistent between the marketing
landing and the workflow pages, and some Vietnamese diacritics were harder to scan
in the ornate headings.

## Reviewed type families

| Candidate | Positive factors | Limitation for this application | Decision |
| --- | --- | --- | --- |
| **Be Vietnam Pro** | Specifically engineered Vietnamese letterforms and stacked tone marks; broad range of weights; OFL; straightforward UI geometry | Can look ordinary if paired with too much heavy type | **Selected as single type family** |
| **IBM Plex Sans** | Distinct technical, systematic design; IBM confirms Vietnamese is covered in extended Latin | Feels a little technical/enterprise for daily food and wellness coaching | Backup alternative |
| **Atkinson Hyperlegible Next** | Strong emphasis on differentiating character shapes and legibility; open license | Vietnamese diacritic aesthetics and specific glyph coverage need additional review against project specimens | Worth reviewing for accessibility variants |
| **Cormorant Garamond + Manrope** | Delicate editorial contrast | Decorative serif dominates the wellbeing UI; too much typography contrast for dense, practical data | Retired from this application |

**Primary source references:**

- Be Vietnam Pro maintainers (Vietnamese diacritics): https://github.com/bettergui/BeVietnamPro
- Google Fonts family description: https://github.com/google/fonts/blob/main/ofl/bevietnampro/DESCRIPTION.en_us.html
- IBM Plex language coverage: https://www.ibm.com/design/language/typography/typeface/
- Atkinson Hyperlegible Next: https://github.com/googlefonts/atkinson-hyperlegible-next
- W3C WCAG 2.2 text resizing: https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html
- W3C WCAG 2.2 text spacing: https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html

## Implemented

1. Replaced the two old font packages with **`@fontsource/be-vietnam-pro`**;
   400, 500, 600, 700, 800 weights are bundled **locally**, with no runtime
   dependency on Google Fonts servers.
2. Removed explicit old families from `index.css`, `ui-refresh.css`, and
   the activity/notification stylesheet. All fallbacks now prefer sans-serif.
3. Added `typography-readable.css` after existing global overrides, so
   type scale remains cohesive without changing feature components or data.
4. Increased body text to **16px**, hero description to **17px** (16px mobile),
   form fields to **16px**, visible secondary info to **14–15px**. Compact
   navigation and decorative labels retain approximately **11–13px** where
   space is constrained. The heading uses a readable 600 weight, not italics.
5. Rebalanced line heights, form control heights, date labels, nutrition cards,
   admin details, and small-screen two-column descriptions.

## Acceptance evidence

- Frontend: `npm run lint`, `npm run build`, `npm run test`.
- Browser: real Chromium font-load check, screenshot inspection at
  **320 / 390 / 768 / 1440px**, login check at 390 / 1440px, and horizontal
  overflow check. Browser evidence is stored locally under
  `.local-backups/ui-*-cdp.png` and not checked into Git.
- The browser checks target public surfaces. Protected dashboard views
  still require a real authenticated usability pass; source-level CSS
  coverage is not equivalent to end-to-end user testing.
- **Accessibility note:** 200% zoom and text-spacing overrides should be
  manually checked on all authenticated routes before claiming WCAG 2.2 AA
  compliance. This update is **not** a formal accessibility certification.

## Design rule going forward

Use Be Vietnam Pro as a single primary family, keep native Vietnamese marks,
avoid combining tiny metadata with oversized ornamental serif headings, and
prioritize readable hierarchy over decorative effects. Do not introduce
new font CDNs or duplicate font packages without evidence of user benefit.
