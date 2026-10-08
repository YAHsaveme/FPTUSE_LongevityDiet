---
name: drawio-architecture-diagrams
description: Produce editable draw.io (.drawio / diagrams.net) architecture, system connection, wiring, network, deployment, sequence and data flow drawings by writing a small Python generator with absolute coordinates, linting the layout, rendering PNGs headlessly with the draw.io desktop CLI and visually inspecting them until the drawing is clean. Use this whenever the user asks for a draw.io, drawio or diagrams.net drawing, an architecture diagram, a cloud, network or system connection diagram, a topology or wiring drawing, or asks to redraw, drill down, or replace a part of an existing drawing, and whenever a diagram must be precise, monochrome, loosely spaced, free of overlapping lines and delivered as an editable file rather than a picture. Also use it to render or visually check an existing .drawio file.
---

# draw.io architecture drawings

Engineering drawings are read by people who were not in the room. They must be exact, calm to look at and editable. This workflow gets there by treating a drawing like code: decide the layout, generate the XML from a script, lint it, render it, look at it, fix, repeat.

Bundled:
- `scripts/drawio_writer.py` Page/save API, monochrome styles, connected edges, a layout linter
- `scripts/render.py` renders every page of a .drawio to PNG through the draw.io desktop CLI
- `examples/aws_web_app.py` complete two page drawing (AWS web application, existing and proposed) using every pattern below; read it before writing a new generator

## Workflow

1. **Pin down content before geometry.** List the boxes, the containers they sit in, and every link with its type (data, power, by others, thick trunk) and a two or three word label. If the user supplied a reference picture or an agreed topology, follow it exactly and write down anything you add or assume, so you can tell the user.

2. **Decide the frame.** Page size, column grid, row order. If the drawing must fit into part of an existing drawing, match that region's width and height (for example "600 wide, replaces the right-hand column"). Flow reads top to bottom or left to right; keep one direction.

3. **Write a generator** (a throwaway script is fine) that imports the writer:
   ```python
   import sys; sys.path.insert(0, "<skill dir>/scripts")
   from drawio_writer import Page, save
   ```
   Use absolute page coordinates for everything. Containers first (`zone`, style `zone` or `sub`), then boxes, then links, then labels, then the legend.

4. **Lint, then render.**
   ```bash
   python3 my_generator.py out.drawio        # prints LINT lines from page.lint()
   python3 <skill dir>/scripts/render.py out.drawio <png dir>
   ```
   Fix every lint warning before looking at pictures; each one is a defect a reader would see.

5. **Look at every PNG with the Read tool.** The linter estimates text sizes and cannot judge meaning or balance. Check the list in "Inspection" below, fix the coordinates, regenerate, render, look again. Two or three rounds is normal. Only stop when a page is clean.

6. **Deliver the .drawio as the source of truth**, PNGs as previews. Say what you checked (lint clean, pages inspected) and what you assumed.

## Layout rules

These keep drawings readable; the linter enforces most of them.

- **Every edge is connected** (`link(key, src, dst, p0, p1, ...)`) with `p0`/`p1` on the borders of its boxes, so people can move boxes in draw.io and lines follow.
- **Route explicitly, orthogonally.** Give waypoints so every segment is horizontal or vertical. The writer uses `edgeStyle=none` (straight segments through your points): draw.io's automatic orthogonal routing combined with waypoints can make the CLI exporter attach an edge to the wrong box.
- **Reserve corridors.** Before placing boxes, keep empty lanes (gaps between columns, a strip down one side) for long vertical or horizontal runs. Lines then never pass through boxes.
- **Bus bars instead of fans.** When several boxes share one connection (tasks behind a load balancer target group, hosts on a shared switch), draw a thin `bar` box with short stubs rather than many long converging lines.
- **Spacing:** at least 20 px between boxes and between parallel lines (the linter flags lines closer than 6 px), 30 to 50 px gaps between rows, container padding of about 15 to 20 px. Loose is better than cramped.
- **Labels are separate `text` cells** placed beside the line, not on it, and never on a container border or title. Use edge labels (`label=`) only for very short text on long straight segments.
- **Lines entering a container avoid its title** (top left corner). Shift the line or the box.
- **Loose ends** (an arrow that continues into a larger drawing) end at an invisible `anchor` just outside the frame.
- **Legend** goes outside the main frame so it can be dropped when the drawing is pasted elsewhere.

## Visual language

- Monochrome. Meaning comes from line style and weight, not colour: solid for data, `dotted` for power, `dashed` for things owned or cabled by others, `thick` for trunks and uplinks. Grey fill (`key` style) marks the one or two components the drawing is about.
- Box styles: `box` normal, `key` emphasis, `ext` dashed (external or by others), `heavy` thick border (termination or boundary objects), `store` cylinder, `note`.
- Labels: concise English, two to five words, the component's real name. No sentences on the drawing, no clause or section numbers, no decorative dashes or emoji. Explanations belong in the accompanying text, not in boxes.
- Mark proposals in the title, e.g. "Web application with cache and standby (proposed)", so a reader never mistakes a proposal for an agreed design.

## Inspection

Look for each of these on every rendered page:

- a line passing through a box, a label or a container title
- a line lying on top of another line, or two lines so close they read as one
- text on a border, text clipped by its box, a label ambiguous about which line it belongs to
- a connection drawn to the wrong box (compare with your content list from step 1)
- large empty areas or cramped corners; unbalanced columns
- arrows pointing the wrong way; legend styles that do not match the lines

Fix by moving coordinates in the generator, never by hand editing the generated XML.

## Pitfalls that break the export

- Cell ids equal to JavaScript prototype names (`push`, `map`, `filter`) make export fail with a bare "Export failed". The writer prefixes every id with the page id.
- Editors such as VS Code set `ELECTRON_RUN_AS_NODE=1`; the draw.io binary then rejects `--export` with "bad option". `render.py` removes it. If you call the CLI yourself use `env -u ELECTRON_RUN_AS_NODE`.
- PNG export renders one page per call (`--page-index`); `render.py` loops over pages.
- Exported PNGs are cropped to the content, so pixel positions in the image are offset from page coordinates.
- On Linux the CLI needs `--no-sandbox` and usually `xvfb-run`; set `DRAWIO_BIN` if the binary is not on the default paths.

## Working with existing drawings

A .drawio file the user has edited by hand is the baseline. Do not regenerate over it. Write new output to a new file (or a temporary folder), compare, and let the user merge, unless they explicitly ask you to replace it. When asked to redraw part of an existing drawing, read the original first (its XML gives exact coordinates and sizes) so the new part fits.
