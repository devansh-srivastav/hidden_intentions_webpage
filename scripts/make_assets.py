"""Build the site's image assets from the sources in sources/.

Run once after changing a source:  .venv/bin/python scripts/make_assets.py
Needs: Pillow, numpy, scipy. Outputs are committed, so the
site build itself (npm run build) does not need any of these tools.
"""
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FIG = ROOT / "src" / "assets" / "figures"
PUBLIC = ROOT / "public"
FIRA = Path.home() / "Library/texmf/fonts/opentype/public/fira"

FIG.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)

INK = (27, 31, 36)
BG = (250, 248, 243)
MUTED = (74, 80, 88)
ACCENT = (168, 50, 31)


# 1. Teaser: light and dark transparent versions from sources/teaser-hq.png
subprocess.run(
    [str(ROOT / ".venv" / "bin" / "python"), str(ROOT / "scripts" / "teaser_variants.py")], check=True)
teaser = Image.open(next(p for p in FIG.glob("hidden-intentions-llm-conceptual-model.*.png") if p.name.count(".") == 2)).convert("RGBA")

# 2. Results charts and the testbed diagram are drawn in the page itself (src/components/charts/).

# 3. Social card: Open Graph 1200x630
def card(w, h, out):
    img = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(img)
    title_font = ImageFont.truetype(str(FIRA / "FiraSans-SemiBold.otf"), int(h * 0.085))
    meta_font = ImageFont.truetype(str(FIRA / "FiraSans-Regular.otf"), int(h * 0.04))
    x, y = int(w * 0.06), int(h * 0.11)
    for line in ["Unknown Unknowns: Do Hidden", "Intentions in LLMs Evade Detection?"]:
        d.text((x, y), line, font=title_font, fill=INK)
        y += int(h * 0.105)
    y += int(h * 0.02)
    d.text((x, y), "Devansh Srivastav · David Pape · Lea Schönherr", font=meta_font, fill=MUTED)
    y += int(h * 0.06)
    d.text((x, y), "Findings of ACL: EMNLP 2026 · CISPA", font=meta_font, fill=ACCENT)
    # teaser figure in the lower part
    fig = teaser.copy()
    box_w, box_h = int(w * 0.88), int(h * 0.44)
    fig.thumbnail((box_w, box_h), Image.LANCZOS)
    img.paste(fig, ((w - fig.width) // 2, h - fig.height - int(h * 0.05)), fig)
    d.line([(x, int(h * 0.08)), (w - x, int(h * 0.08))], fill=(216, 211, 199), width=2)
    img.save(out, optimize=True)


card(1200, 630, PUBLIC / "og-image.png")

# 4. Favicons: a plain serif "H?" mark would need a font at runtime; a PNG keeps it simple
for size, name in [(180, "apple-touch-icon.png"), (32, "favicon-32.png")]:
    ico = Image.new("RGB", (size, size), INK)
    f = ImageFont.truetype(str(FIRA / "FiraSans-SemiBold.otf"), int(size * 0.62))
    dd = ImageDraw.Draw(ico)
    dd.text((size / 2, size / 2), "?", font=f, fill=BG, anchor="mm")
    dd.rectangle([0, size - max(2, size // 12), size, size], fill=ACCENT)
    ico.save(PUBLIC / name)

print("assets written:")
for p in sorted(FIG.iterdir()) + [PUBLIC / "og-image.png"]:
    if p.suffix == ".png":
        print(f"  {p.relative_to(ROOT)}  {Image.open(p).size}")
    else:
        print(f"  {p.relative_to(ROOT)}  {p.stat().st_size // 1024} KB")
