# Skill - Assignment Diagram Polish

## Purpose
Final visual-quality gate for the Longevity Diet Companion Assignment diagrams.

## Applies to
- C0 System Context
- C1 Container Architecture
- Conceptual ERD
- Physical Database

## Geometry rules
- Orthogonal connectors only; curved or diagonal routing is a failure.
- One connector = one semantic relationship.
- Arrowheads must be filled block arrows, consistent size, and clearly visible.
- No connector may pass through a text cell or unrelated box.
- No label may touch, cover, or sit on a connector stroke.
- Parallel async flows must use separate lanes.
- Keep at least 20-30 px visual clearance between labels and lines where practical.
## Typography rules
- Arial only.
- Diagram title: 26-28 px.
- Section/group heading: 17-18 px.
- Container/entity/table title: 15-16 px minimum.
- Descriptive body text: 13-14 px minimum.
- Relationship labels: 12-14 px minimum.
- Never reduce font size to make content fit; simplify text or enlarge the box instead.

## Layout rules
- Use a visible grid and align peer elements.
- Prefer a small number of clear rows/columns.
- Keep meaningful whitespace between responsibilities.
- System/group boundaries use empty values; titles are separate text cells.
- Do not place text on a boundary stroke.
- C0 contains people + one software system only.
- C1 contains deployable/runtime containers only.
- Conceptual ERD contains business concepts, not SQL implementation details.
- Physical DB shows core PK/FK fields and only enough relationships to stay readable.
## QA workflow
1. Generate draw.io XML from the canonical generator.
2. Run geometry lint against all Assignment draw.io files.
3. Reject any diagonal segment or text/connector intersection.
4. Export with draw.io Desktop using full-page mode at 4200 px width.
5. Inspect the exported PNGs, not only the XML.
6. Check arrowheads, clipping, font readability, whitespace, and boundary integrity.
7. Re-run geometry lint and export after every layout change.
8. Completion requires zero geometry-lint findings and successful export of all four PNGs.

## Visual target
Clean academic/enterprise architecture style inspired by the supplied reference:
- warm light system/group boundaries;
- white cards;
- dark charcoal text/strokes;
- restrained color;
- no decorative icons beyond the C4 person shape;
- no visual clutter;
- relationship labels placed in dedicated whitespace.
