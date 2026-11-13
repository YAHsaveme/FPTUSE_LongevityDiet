# Longevity Diet — UI design system

## Provenance
Generated as a project-specific implementation from the open-source
[UI UX Pro Max skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
(product match: **Biohacking/Longevity App**, with supplemental **Calorie & Nutrition Counter**
and **Habit Tracker** categories). The installed original skill remains under
`.agents/skills/ui-ux-pro-max` and `.claude/skills/ui-ux-pro-max`;
both carry the MIT license from Next Level Builder.

## Design direction: Verdant, Organic 2.0
Everyday wellness, not a medical device. Calm, optimistic, editorial and
grounded in observable habits. Avoid clinical diagnosis and fabricated live
metrics. Public landing figures are explicitly labelled **illustration**.

**Color tokens (implemented in `src/LongevityDiet.Web/src/ui-refresh.css`):**

| Purpose | Hex | Intent |
| --- | --- | --- |
| Primary ink | `#173B31` | Heading, text, accessible depth |
| Primary actions | `#1A4E3B` | High-contrast affirmative actions |
| Primary green | `#27634E` | Interactive accents and positive signals |
| Lime accent | `#DEF19C` | Active state, optimistic focal point |
| Light canvas | `#F4F6EE` | Reduced visual fatigue |
| Elevated paper | `#FFFEF9` | Forms and content surfaces |
| Coral warmth | `#BC6F43` | Editorial emphasis; not an error state |
| Border | `rgba(26,67,51,.13)` | Gentle information separation |

**Typography (v2, 13 Nov 2026):** Be Vietnam Pro (open source, OFL)
for all Vietnamese text, brand, hero, dashboard, labels, numbers, forms and controls.
It replaces the ornamental Cormorant Garamond + Manrope pairing after readability
review. The typeface was designed with Vietnamese diacritics as a first-class
concern. Bundle via local `@fontsource/be-vietnam-pro` imports (400/500/600/700/800),
not third-party runtime Google Fonts requests. Body 16–17px, forms 16px, secondary
content 14–15px, low-priority chips 12–13px, compact mobile nav 11–12px.
Headings use 600–700 weight rather than tall italic display serif. Readable
line-height and responsive reflow matter more than stylized large lettering.

**Pattern:** editorial hero + high-contrast wellness metric preview,
card-based activity/meal summaries, long-form progressive sections and
a cross-feature navigation dock for authenticated members. Show only
real data from existing APIs on protected routes; landing examples must
remain visibly labelled as examples.

## Layout & interaction
- Max-width 1376px reading canvas, sticky top navigation, 44px pointer targets,
  and 70px persistent route-aware member dock.
- Breakpoints at 560/800/1120px. Mobile dock shows icons+labels and stays
  keyboard reachable; keep footer space so the dock does not cover content.
- Strong visible `:focus-visible`, native semantics and labels,
  semantic `nav`, `aria-current` from React Router's NavLink.
- Respect `prefers-reduced-motion` and avoid animation as a sole feedback cue.
- No emoji as interface icons; Lucide icons already installed.
- Typeface contrast goal: practical Vietnamese readability without the common
  exaggerated editorial serif and microscopic dashboard metadata patterns.
- W3C WCAG 2.2 text resizing 200% and text spacing guide:
  https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html and
  https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html.
  Responsive visual checks are not a claim of formal WCAG certification.
- Use warm backgrounds, limited ambient gradients, restrained shadows.
  Avoid low contrast pills, 8px text, large unreadable labels and
  hidden controls on mobile.
- Keep all API routes, JWT, auth guards, permissions, payloads,
  domain validation and background processes unchanged.

## QA gates
- `npm --prefix src/LongevityDiet.Web run build`
- `npm --prefix src/LongevityDiet.Web run lint`
- `npm --prefix src/LongevityDiet.Web run test`
- Browser check 320/390/768/1440px for horizontal overflow, page errors,
  typographic clipping, font load and readability. Check at 200% zoom manually
  before final accessibility sign-off.
- For interactive data flows, use existing Docker QA and Playwright
  acceptance; a static preview is not proof of connected services.

## Scope of UI refresh
The refreshed CSS and later `typography-readable.css` affect landing,
auth/profile, catalog, planner, progress, activity, notifications, reports
and admin controls. The new dock is
only rendered for users who completed onboarding and are in the app.
No API, migration, broker or other .NET code was edited.

## Living Garden impact layer (13 November 2026)
- The final loaded stylesheet is `src/LongevityDiet.Web/src/visual-impact.css`.
  It overrides the earlier Verdant and readability layers without modifying
  the app's data, authentication, routes or APIs.
- Large-screen heading at 1440px: ~68px. Mobile 390px: ~40px.
  Standard app body: 18px; leading description ~20–22px; CTA ~18px.
  Compact secondary labels may be smaller where unavoidable.
- Palette chapters: bright mint/honey (#dff0da / #fff5df), teal (#124e44),
  cream (#fff4d9), lavender (#eeebff), peach (#fdf0ef), lemon (#e9f99c).
  Text remains dark green on light surfaces or ivory on deep green.
- Never imply hero score 82 or journey dates come from an account:
  public marketing cards are examples, visibly marked as such.
- Screenshot and code QA recorded in
  `docs/assignment/PRN232_VISUAL_IMPACT_20261113.md`.
- Avoid further one-off inline styles; add new project rules to the final
  visual-impact layer and test both compact and wide layouts.
