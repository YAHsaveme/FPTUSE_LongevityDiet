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

**Typography:** Cormorant Garamond for editorial hero/headings, Manrope
for dense app content, numbers, forms and controls; both fonts already bundled
locally. Avoid novel remote font requests. Minimum practical text size 11–12px
for secondary metadata, 12–14px for controls, 14–16px for body.

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
- Use warm backgrounds, limited ambient gradients, restrained shadows.
  Avoid low contrast pills, 8px text, large unreadable labels and
  hidden controls on mobile.
- Keep all API routes, JWT, auth guards, permissions, payloads,
  domain validation and background processes unchanged.

## QA gates
- `npm --prefix src/LongevityDiet.Web run build`
- `npm --prefix src/LongevityDiet.Web run lint`
- `npm --prefix src/LongevityDiet.Web run test`
- Browser check 390px + 1440px for horizontal overflow, page errors,
  typographic clipping and readability.
- For interactive data flows, use existing Docker QA and Playwright
  acceptance; a static preview is not proof of connected services.

## Scope of UI refresh
The refreshed CSS affects landing, auth/profile, catalog, planner, progress,
activity, notifications, reports and admin controls. The new dock is
only rendered for users who completed onboarding and are in the app.
No API, migration, broker or other .NET code was edited.
