# PRN232 — Living Garden visual-impact refresh

**Date:** 13 November 2026
**Scope:** React frontend content, presentation, readability and responsive layout.
**Branch:** `ui/prn232-ui-ux-pro-max-refresh-20261113`

## Design rationale
Previous UI v2 was readable at desk distance, but the overall beige-green
background lacked visual rhythm and large screens presented several passages
in 13–16px text. The revised direction is **Living Garden**: practical daily
wellness made welcoming through stronger hierarchy and distinct warm,
nature-inspired chapters. This is not a medical device dashboard.

## What changed
- `src/LongevityDiet.Web/src/visual-impact.css` is imported last,
  following `typography-readable.css`. No API code is changed.
- Hero messaging simplified to direct Vietnamese language:
  “Ăn uống tốt hơn. Sống khỏe mỗi ngày.” with a larger 68px desktop title
  at 1440px and approximately 40px at 390px, 18–22px description text.
- Stronger legibility across buttons, form fields, meal cards, headings,
  numeric metrics, activity tracking, catalog and admin pages.
- Multicolor section hierarchy:
  **mint + honey** hero, **warm cream** meal overview,
  **deep teal + lemon** journey, **soft lilac + peach** guidance,
  and four gentle but distinct pastel principle tiles.
- Demo metrics stay prominently tagged **BẢN MINH HỌA**;
  no fake real-time API values, diagnoses or fabricated recommendations.
- Reduced-motion focus, keyboard focus ring, and real input/CTA semantics
  remain intact. Existing React routes and behavior are unchanged.

## Browser and code checks
- `npm run lint`: PASS, 0 warnings and errors.
- `npm run build`: PASS, Vite production build.
- `npm run test`: PASS (13 React/Vitest tests + 6 Node API-error tests).
- Chromium visual QA at 320, 390, 768 and 1440px, plus login at 390
  and 1440px: no horizontal overflow. Browser loaded locally bundled
  Be Vietnam Pro. Desktop screenshots reviewed at hero, plan, journey
  and principles; mobile hero and menu reviewed.
- Local screenshots:
  `.local-backups/ui-home-390-cdp.png`,
  `.local-backups/ui-home-1440-cdp.png`,
  `.local-backups/ui-desktop-sections-v3.jpg`.
  These are intentionally not committed.

## Remaining acceptance boundaries
- No formal WCAG certification. Keyboard-only navigation, screen reader
  inspection, 200% browser zoom, reduced-motion behavior, full-page text
  clipping checks and actual authenticated journey UX still need manual
  product-owner acceptance.
- The frontend preview is not live back-end evidence. Keep security,
  business rules, authentication, services, brokers and deployment unchanged.
