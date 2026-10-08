#!/usr/bin/env python3
"""Render every page of a .drawio file to PNG with the draw.io desktop CLI.

    python3 render.py diagram.drawio OUT_DIR [--scale 1.5] [--border 24]

Writes OUT_DIR/<file stem>-p<N>-<page name>.png for each page and prints the paths.
Why a wrapper: editors such as VS Code export ELECTRON_RUN_AS_NODE=1, which makes the
Electron binary behave as plain node and reject --export ("bad option"). The wrapper
removes it, finds the binary, and loops over pages (PNG export renders one page per call).
"""
import argparse, os, re, shutil, subprocess, sys, xml.etree.ElementTree as ET

CANDIDATES = [
    "/Applications/draw.io.app/Contents/MacOS/draw.io",          # macOS desktop
    "drawio", "draw.io",                                           # PATH (Linux .deb/.AppImage symlink)
    "/opt/drawio/drawio", "/usr/bin/drawio",
    r"C:\Program Files\draw.io\draw.io.exe",
]


def find_binary():
    env = os.environ.get("DRAWIO_BIN")
    if env:
        return env
    for c in CANDIDATES:
        p = c if os.path.isabs(c) else shutil.which(c)
        if p and os.path.exists(p):
            return p
    sys.exit("draw.io desktop not found. Install it or set DRAWIO_BIN=/path/to/draw.io")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("drawio"); ap.add_argument("outdir")
    ap.add_argument("--scale", default="1.5"); ap.add_argument("--border", default="24")
    a = ap.parse_args()
    names = [d.get("name") or f"page{i}" for i, d in enumerate(ET.parse(a.drawio).getroot().iter("diagram"))]
    os.makedirs(a.outdir, exist_ok=True)
    env = {k: v for k, v in os.environ.items() if k != "ELECTRON_RUN_AS_NODE"}
    extra = ["--no-sandbox"] if sys.platform.startswith("linux") else []
    stem = os.path.splitext(os.path.basename(a.drawio))[0]
    binary = find_binary()
    for i, n in enumerate(names):
        slug = re.sub(r"[^A-Za-z0-9]+", "-", n).strip("-").lower() or f"page{i}"
        out = os.path.join(a.outdir, f"{stem}-p{i + 1}-{slug}.png")
        if os.path.exists(out):
            os.remove(out)
        r = subprocess.run([binary, *extra, "--export", "--format", "png", "--scale", a.scale, "--border", a.border,
                            "--page-index", str(i), "--output", out, a.drawio], env=env, capture_output=True, text=True)
        if not os.path.exists(out):
            sys.exit(f"export failed for page {i} '{n}':\n{r.stdout}\n{r.stderr}\n"
                     "Common causes: a cell id equal to a JS prototype name (push, map), malformed XML, "
                     "or ELECTRON_RUN_AS_NODE still set by a parent process.")
        print(out)


if __name__ == "__main__":
    main()
