from pathlib import Path
from PIL import Image

ROOT = Path(r"D:\PRN232\PRN232_LongevityDiet")
source = ROOT / "docs" / "assignment" / "previews" / "04-physical-database.png"
out_dir = ROOT / "docs" / "assignment" / "previews" / "physical-db-sections"
out_dir.mkdir(parents=True, exist_ok=True)

CANVAS_W = 5650
CANVAS_H = 3600

sections = {
    "01-identity-profile.png": (60, 180, 1200, 1380),
    "02-catalog-rules.png": (1220, 180, 2760, 2240),
    "03-planning-tracking.png": (2780, 180, 4320, 1880),
    "04-progress-engagement-safety.png": (4340, 180, 5590, 2220),
    "05-messaging-reliability-operations.png": (680, 2570, 4920, 3260),
}

image = Image.open(source).convert("RGB")
sx = image.width / CANVAS_W
sy = image.height / CANVAS_H

for filename, (x1, y1, x2, y2) in sections.items():
    crop = image.crop((
        round(x1 * sx),
        round(y1 * sy),
        round(x2 * sx),
        round(y2 * sy),
    ))
    crop.save(out_dir / filename, "PNG", optimize=True)

print(f"Generated {len(sections)} physical DB section previews in {out_dir}")
