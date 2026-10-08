"""Minimal draw.io (mxGraph XML) writer with absolute coordinates and a layout linter.

Why absolute coordinates: the author decides every position, so the result is
predictable, reviewable in a diff and reproducible. Edges stay *connected* to
their boxes (source/target set), so a human can still move boxes in draw.io.

Usage (see examples/aws_web_app.py for a complete drawing):

    import sys; sys.path.insert(0, "<skill>/scripts")
    from drawio_writer import Page, save

    p = Page("Overview", width=1200, height=800)
    p.zone("vpc", 40, 40, 600, 700, "VPC")
    p.box("gw", 80, 120, 200, 80, "<b>Gateway</b>", "key")
    p.box("rtr", 80, 300, 200, 80, "Router")
    p.link("gw_rtr", "gw", "rtr", (180, 200), (180, 300))
    p.text("l_eth", 188, 240, 80, 20, "Ethernet")
    for w in p.lint(): print("LINT", w)
    save("out.drawio", [p])
"""
import re
from xml.sax.saxutils import escape

FONT = "fontFamily=Helvetica;"
INK = "#1A1A1A"

# Monochrome palette: meaning comes from line style and weight, not colour.
STYLES = {
    # containers (excluded from overlap checks)
    "zone": "rounded=1;arcSize=3;whiteSpace=wrap;html=1;fillColor=#F4F4F4;strokeColor=#8C8C8C;verticalAlign=top;align=left;"
            "spacingLeft=10;spacingTop=4;fontStyle=1;fontSize=14;fontColor=#1A1A1A;" + FONT,
    "sub":  "rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#A6A6A6;dashed=1;dashPattern=5 3;verticalAlign=top;"
            "align=left;spacingLeft=8;spacingTop=2;fontStyle=1;fontSize=12;fontColor=#1A1A1A;" + FONT,
    # components
    "box":  "rounded=1;arcSize=10;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#1A1A1A;strokeWidth=1.2;fontSize=12;fontColor=#1A1A1A;" + FONT,
    "key":  "rounded=1;arcSize=10;whiteSpace=wrap;html=1;fillColor=#DADADA;strokeColor=#1A1A1A;strokeWidth=1.2;fontSize=13;fontStyle=1;fontColor=#1A1A1A;" + FONT,
    "ext":  "rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#1A1A1A;strokeWidth=1.2;dashed=1;dashPattern=6 3;fontSize=12;fontColor=#1A1A1A;" + FONT,
    "heavy":"rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#1A1A1A;strokeWidth=2.2;fontSize=13;fontStyle=1;fontColor=#1A1A1A;" + FONT,
    "store":"shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=10;fillColor=#FFFFFF;strokeColor=#1A1A1A;strokeWidth=1.2;fontSize=12;fontColor=#1A1A1A;" + FONT,
    "bar":  "rounded=0;whiteSpace=wrap;html=1;fillColor=#1A1A1A;strokeColor=#1A1A1A;" + FONT,
    "note": "shape=note;size=12;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#8C8C8C;align=left;verticalAlign=top;spacingLeft=6;fontSize=11;fontColor=#333333;" + FONT,
    # text and invisible helpers
    "text": "text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;fontSize=11;fontColor=#1A1A1A;" + FONT,
    "title":"text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=top;whiteSpace=wrap;fontSize=20;fontStyle=1;fontColor=#1A1A1A;" + FONT,
    "anchor":"text;html=1;strokeColor=none;fillColor=none;" + FONT,
}
CONTAINERS = {"zone", "sub"}
INVISIBLE = {"anchor"}
TEXTLIKE = {"text", "title"}

# edgeStyle=none: straight segments through the waypoints you give.
# Orthogonal auto-routing plus waypoints can make the CLI exporter attach the
# edge to the wrong terminal, so routing is always explicit here.
EDGE = ("edgeStyle=none;html=1;rounded=0;endArrow=none;startArrow=none;strokeColor=#1A1A1A;strokeWidth=1.3;"
        "jumpStyle=arc;jumpSize=8;fontSize=11;fontColor=#1A1A1A;labelBackgroundColor=#FFFFFF;" + FONT)
KINDS = {
    "data":   "",
    "thick":  "strokeWidth=2.2;",
    "dashed": "dashed=1;dashPattern=6 4;",
    "dotted": "dashed=1;dashPattern=2 3;",
}


def _esc(s):
    return escape(s, {'"': "&quot;"})


class Page:
    def __init__(self, name, width=1600, height=1000, pid=None):
        self.name, self.w, self.h = name, width, height
        # ids are prefixed: an id equal to a JS prototype name ("push", "map") breaks the exporter
        self.pid = pid or "p" + "".join(c for c in name.lower() if c.isalnum())[:12]
        self.cells, self.r, self.kind, self.edges = [], {}, {}, []
        self._label, self._extra = {}, {}

    # ---------- vertices ----------
    def _v(self, key, x, y, w, h, text, style, extra=""):
        if key in self.r:
            raise ValueError(f"duplicate key {key}")
        self.r[key], self.kind[key] = (x, y, w, h), style
        self._label[key], self._extra[key] = text, extra
        self.cells.append(f'<mxCell id="{self.pid}_{key}" value="{_esc(text)}" style="{STYLES[style]}{extra}" vertex="1" parent="1">'
                          f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
        return key

    def box(self, key, x, y, w, h, text="", style="box", extra=""):
        return self._v(key, x, y, w, h, text, style, extra)

    def zone(self, key, x, y, w, h, title="", style="zone", extra=""):
        return self._v(key, x, y, w, h, title, style, extra)

    def text(self, key, x, y, w, h, text, extra=""):
        return self._v(key, x, y, w, h, text, "text", extra)

    def title(self, text, x=40, y=10, w=1200, h=36):
        return self._v("title", x, y, w, h, text, "title")

    def anchor(self, key, x, y):
        """Invisible 2x2 point, e.g. the loose end of an arrow that leaves the drawing."""
        return self._v(key, x - 1, y - 1, 2, 2, "", "anchor")

    # geometry helpers (absolute page coordinates)
    def left(self, k):   return self.r[k][0]
    def right(self, k):  return self.r[k][0] + self.r[k][2]
    def top(self, k):    return self.r[k][1]
    def bottom(self, k): return self.r[k][1] + self.r[k][3]
    def cx(self, k):     return self.r[k][0] + self.r[k][2] / 2
    def cy(self, k):     return self.r[k][1] + self.r[k][3] / 2

    def _frac(self, key, p):
        x, y, w, h = self.r[key]
        return round((p[0] - x) / w, 4), round((p[1] - y) / h, 4)

    # ---------- edges ----------
    def link(self, key, src, dst, p0, p1, points=None, kind="data", arrow=None, label=None, label_offset=(0, 0), extra=""):
        """Connected edge. p0/p1 are absolute points ON the border of src/dst.
        points: absolute waypoints; keep every segment horizontal or vertical.
        arrow: None | "end" | "start" | "both".  label: short text only (prefer text() for anything long)."""
        st = EDGE + KINDS[kind] + extra
        if arrow in ("end", "both"):
            st += "endArrow=block;endFill=1;"
        if arrow in ("start", "both"):
            st += "startArrow=block;startFill=1;"
        ex, ey = self._frac(src, p0)
        nx, ny = self._frac(dst, p1)
        st += f"exitX={ex};exitY={ey};exitDx=0;exitDy=0;entryX={nx};entryY={ny};entryDx=0;entryDy=0;"
        geo = '<mxGeometry relative="1" as="geometry">'
        if points:
            geo += '<Array as="points">' + "".join(f'<mxPoint x="{a}" y="{b}"/>' for a, b in points) + "</Array>"
        if label and label_offset != (0, 0):
            geo += f'<mxPoint x="{label_offset[0]}" y="{label_offset[1]}" as="offset"/>'
        geo += "</mxGeometry>"
        self.cells.append(f'<mxCell id="{self.pid}_e_{key}" value="{_esc(label or "")}" style="{st}" edge="1" parent="1" '
                          f'source="{self.pid}_{src}" target="{self.pid}_{dst}">{geo}</mxCell>')
        self.edges.append((key, src, dst, [tuple(p0)] + [tuple(q) for q in (points or [])] + [tuple(p1)]))
        return key

    def legend(self, key, x, y, w, rows, title=None):
        """rows: [(kind, label, arrow)]  kind as in link()."""
        h = 20 + 24 * len(rows) + (22 if title else 0)
        self.zone(key, x, y, w, h, title or "", "sub")
        yy = y + (32 if title else 18)
        for i, row in enumerate(rows):
            kind, label = row[0], row[1]
            arrow = row[2] if len(row) > 2 else None
            a = self.anchor(f"{key}_a{i}", x + 20, yy); b = self.anchor(f"{key}_b{i}", x + 80, yy)
            self.link(f"{key}_l{i}", a, b, (x + 19, yy), (x + 81, yy), kind=kind, arrow=arrow)
            self.text(f"{key}_t{i}", x + 95, yy - 11, w - 110, 22, label)
            yy += 24

    # ---------- text size estimates (Helvetica, good enough for layout checks) ----------
    def _font(self, key, default=12):
        m = re.search(r"fontSize=(\d+)", STYLES[self.kind[key]] + self._extra.get(key, ""))
        return int(m.group(1)) if m else default

    def _plain(self, key):
        return re.sub(r"<[^>]+>", "\n", self._label.get(key, "")).replace("&amp;", "&")

    def _glyph_band(self, key):
        """Vertical extent of the rendered glyphs of a middle-aligned text cell."""
        x, y, w, h = self.r[key]
        fs = self._font(key, 11)
        lines = max(1, len([l for l in self._plain(key).split("\n") if l.strip()]))
        gh = lines * fs * 1.25
        cy = y + h / 2
        return cy - gh / 2, cy + gh / 2

    def _title_box(self, key):
        """Estimated box of a container's top-left title."""
        x, y, w, h = self.r[key]
        fs = self._font(key, 12)
        text = self._plain(key).strip()
        if not text:
            return (x, y, 0, 0)
        tw = min(w, 10 + len(text) * fs * 0.62 + 6)
        return (x, y, tw, fs + 12)

    # ---------- linter ----------
    def lint(self, near=6):
        """Deterministic checks that catch most layout defects before rendering.
        Returns a list of human-readable warnings; empty means 'nothing obvious'.
        It does not replace looking at the PNG (text overflow, balance, meaning)."""
        W = []
        solids = [k for k, s in self.kind.items() if s not in CONTAINERS | INVISIBLE | TEXTLIKE]
        texts = [k for k, s in self.kind.items() if s in TEXTLIKE and k != "title"]
        conts = [k for k, s in self.kind.items() if s in CONTAINERS]

        def inter(a, b, pad=0):
            ax, ay, aw, ah = a; bx, by, bw, bh = b
            return ax < bx + bw - pad and bx < ax + aw - pad and ay < by + bh - pad and by < ay + ah - pad

        def seg_hits_rect(p, q, rect, shrink=2):
            x, y, w, h = rect
            x0, y0, x1, y1 = x + shrink, y + shrink, x + w - shrink, y + h - shrink
            if x1 <= x0 or y1 <= y0:
                return False
            (ax, ay), (bx, by) = p, q
            if ax == bx:   # vertical
                return x0 < ax < x1 and max(min(ay, by), y0) < min(max(ay, by), y1)
            if ay == by:   # horizontal
                return y0 < ay < y1 and max(min(ax, bx), x0) < min(max(ax, bx), x1)
            # diagonal: sample
            for i in range(1, 50):
                t = i / 50; px, py = ax + (bx - ax) * t, ay + (by - ay) * t
                if x0 < px < x1 and y0 < py < y1:
                    return True
            return False

        # 1. boxes overlapping boxes
        for i, a in enumerate(solids):
            for b in solids[i + 1:]:
                if inter(self.r[a], self.r[b], pad=1):
                    W.append(f"boxes overlap: {a} / {b}")
        # 2. text cells overlapping boxes or each other
        for t in texts:
            for b in solids:
                if inter(self.r[t], self.r[b], pad=1):
                    W.append(f"text '{t}' overlaps box {b}")
            for t2 in texts:
                if t < t2 and inter(self.r[t], self.r[t2], pad=1):
                    W.append(f"texts overlap: {t} / {t2}")
        # 3. text whose glyphs sit on a container border (the text cell may be taller than its glyphs)
        for t in texts:
            tx, ty, tw, th = self.r[t]
            gy0, gy1 = self._glyph_band(t)
            for c in conts:
                cx, cy, cw, ch = self.r[c]
                if not (cx < tx + tw and tx < cx + cw):
                    continue
                for edge_y, where in ((cy, "top"), (cy + ch, "bottom")):
                    if gy0 - 2 < edge_y < gy1 + 2:
                        W.append(f"text '{t}' sits on the {where} border of {c}")
        # 4. edges crossing boxes, texts, container titles; ends not on borders
        for key, src, dst, pts in self.edges:
            if self.kind[src] in INVISIBLE and self.kind[dst] in INVISIBLE:
                continue  # legend sample lines
            for k, (p, q) in enumerate(zip(pts, pts[1:])):
                if p[0] != q[0] and p[1] != q[1]:
                    W.append(f"edge {key} segment {k} is diagonal {p}->{q}")
                for b in solids:
                    if b in (src, dst):
                        continue
                    if seg_hits_rect(p, q, self.r[b]):
                        W.append(f"edge {key} passes through box {b}")
                for t in texts:
                    if seg_hits_rect(p, q, self.r[t], shrink=1):
                        W.append(f"edge {key} passes through text '{t}'")
                for c in conts:   # container title: estimated glyph box of the title text
                    if seg_hits_rect(p, q, self._title_box(c), shrink=0):
                        W.append(f"edge {key} crosses the title of container {c}")
            for end, k in ((pts[0], src), (pts[-1], dst)):
                x, y, w, h = self.r[k]
                on = (abs(end[0] - x) < 1 or abs(end[0] - x - w) < 1) and y - 1 <= end[1] <= y + h + 1 or \
                     (abs(end[1] - y) < 1 or abs(end[1] - y - h) < 1) and x - 1 <= end[0] <= x + w + 1
                if not on and self.kind[k] not in INVISIBLE:
                    W.append(f"edge {key}: endpoint {end} is not on the border of {k}")
        # 5. parallel segments that overlap or run too close
        segs = []
        for key, src, dst, pts in self.edges:
            if self.kind[src] in INVISIBLE and self.kind[dst] in INVISIBLE:
                continue
            for p, q in zip(pts, pts[1:]):
                segs.append((key, p, q))
        for i, (ka, a0, a1) in enumerate(segs):
            for kb, b0, b1 in segs[i + 1:]:
                if ka == kb:
                    continue
                if a0[0] == a1[0] and b0[0] == b1[0]:          # both vertical
                    ov = min(max(a0[1], a1[1]), max(b0[1], b1[1])) - max(min(a0[1], a1[1]), min(b0[1], b1[1]))
                    d = abs(a0[0] - b0[0])
                    if ov > 4 and d == 0:
                        W.append(f"edges overlap (same x={a0[0]}): {ka} / {kb}")
                    elif ov > 20 and 0 < d < near:
                        W.append(f"edges run {d}px apart: {ka} / {kb}")
                elif a0[1] == a1[1] and b0[1] == b1[1]:        # both horizontal
                    ov = min(max(a0[0], a1[0]), max(b0[0], b1[0])) - max(min(a0[0], a1[0]), min(b0[0], b1[0]))
                    d = abs(a0[1] - b0[1])
                    if ov > 4 and d == 0:
                        W.append(f"edges overlap (same y={a0[1]}): {ka} / {kb}")
                    elif ov > 20 and 0 < d < near:
                        W.append(f"edges run {d}px apart: {ka} / {kb}")
        # 6. content outside the page
        for k, (x, y, w, h) in self.r.items():
            if x < 0 or y < 0 or x + w > self.w or y + h > self.h:
                W.append(f"{k} extends beyond the page {self.w}x{self.h}")
        return list(dict.fromkeys(W))

    def xml(self):
        return (f'<diagram id="{self.pid}" name="{_esc(self.name)}"><mxGraphModel dx="1200" dy="900" grid="1" gridSize="10" guides="1" '
                f'tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{self.w}" pageHeight="{self.h}" '
                f'math="0" shadow="0" background="#FFFFFF"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'
                f'{"".join(self.cells)}</root></mxGraphModel></diagram>')


def save(path, pages):
    """Write one .drawio file; each Page becomes one tab."""
    ids = [p.pid for p in pages]
    if len(set(ids)) != len(ids):
        raise ValueError("page ids must be unique; pass pid= explicitly")
    with open(path, "w", encoding="utf-8") as f:
        f.write('<mxfile host="drawio_writer" version="21.3.7">' + "".join(p.xml() for p in pages) + "</mxfile>")
    return path
