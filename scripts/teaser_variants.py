"""Make light and dark transparent versions of the teaser (sources/teaser-hq.png).

Light: the white background that connects to the image border (including the faint
off-white squares behind some icons) becomes transparent, with soft edges; enclosed white
areas (thought cloud, "LLM" bubble, document pages) stay opaque.
Dark: the same, plus free-standing black text and black dashed arrows are recoloured to the
page's light ink. Black text inside shapes and large dark shapes are left alone.

Run: .venv/bin/python scripts/teaser_variants.py
"""
import hashlib
import os
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "sources" / "teaser-hq.png"
OUT = ROOT / "src" / "assets" / "figures"
LIGHT_INK = np.array([236, 232, 223], dtype=np.float32)   # --ink in dark mode (#ECE8DF)
MAX_W = 2400

rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
h, w, _ = rgb.shape

# 1. Background = near-white region connected to the border.
mn, mx = rgb.min(axis=2), rgb.max(axis=2)
near_white = (mn > 228) & ((mx - mn) < 22)
lab, _ = ndi.label(near_white)
border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
bg = np.isin(lab, border[border > 0])
# Small white gaps between shapes that are enclosed, so the border flood misses them, but
# are background, not part of the drawing. Each is picked by a point inside it (source
# pixel coordinates, x, y): between the auditor's magnifier and shoulder, between the
# monitor stand and the shadow, and below the stand's base.
BACKGROUND_GAPS = [(3270, 1490), (1450, 2296), (1357, 2375)]
gaps = np.zeros_like(bg)
whitish = (mn > 212) & ((mx - mn) < 25)          # looser: some gaps are slightly grey
R = 90                                           # each gap is searched only near its point,
for gx, gy in BACKGROUND_GAPS:                   # so it can never leak into the whole page
    y0, y1, x0, x1 = gy - R, gy + R, gx - R, gx + R
    win, _ = ndi.label(whitish[y0:y1, x0:x1])
    l = win[gy - y0, gx - x0]
    if l:
        gaps[y0:y1, x0:x1] |= (win == l) & ~bg[y0:y1, x0:x1]
gaps = ndi.binary_dilation(gaps, iterations=2) & (mn > 200)   # include their soft edges
bg |= gaps

# 2. Colour-to-alpha against white, applied on the background and a thin edge band
#    around it (anti-aliased edges), so interiors stay fully opaque.
band = ndi.binary_dilation(bg, iterations=3)
alpha = np.ones((h, w), dtype=np.float32)
a_c2a = ((255.0 - mn) / 255.0).clip(0, 1)               # how far from white
alpha[band] = a_c2a[band]
alpha[bg & (mn > 243)] = 0.0                            # faint tints behind icons vanish entirely
alpha[gaps & (mn > 225)] = 0.0
# un-blend colour from white where partially transparent
safe = np.maximum(alpha, 1e-3)[..., None]
col = np.where(band[..., None], ((rgb - (1 - alpha[..., None]) * 255.0) / safe).clip(0, 255), rgb)


def save(color, a, name):
    img = Image.fromarray(np.dstack([color, a * 255.0]).round().astype(np.uint8), "RGBA")
    bbox = img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    pad = 40
    img = img.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad)))
    img.thumbnail((MAX_W, MAX_W), Image.LANCZOS)
    # Content hash in the file name: any change gets a new URL, so no browser or dev server
    # can show a stale copy. Written to a temp file first, then renamed (never half-written).
    stem = name[:-4]
    tmp_path = OUT / f".{stem}.tmp.png"
    img.save(tmp_path, optimize=True)
    digest = hashlib.sha256(tmp_path.read_bytes()).hexdigest()[:8]
    for old in OUT.glob(f"{stem}.*.png"):
        if old.name.count(".") == 2:      # stem.<hash>.png
            old.unlink()
    (OUT / name).unlink(missing_ok=True)
    os.replace(tmp_path, OUT / f"{stem}.{digest}.png")
    return img.size, f"{stem}.{digest}.png"


# 3. Dark variant: recolour free-standing black ink (text, dashed arrows).
lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
ink = (lum < 110) & ((mx - mn) < 40) & (alpha > 0.02)
lab, n = ndi.label(ink, structure=np.ones((3, 3)))
sizes = ndi.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
recolour = np.zeros_like(ink)
objs = ndi.find_objects(lab)
for i, sl in enumerate(objs, start=1):
    if sizes[i - 1] > 16000:          # large dark shapes: shadow, hoodie, monitor
        continue
    y0, y1 = max(0, sl[0].start - 6), min(h, sl[0].stop + 6)
    x0, x1 = max(0, sl[1].start - 6), min(w, sl[1].stop + 6)
    comp = lab[y0:y1, x0:x1] == i
    ring = ndi.binary_dilation(comp, iterations=5) & ~ndi.binary_dilation(comp, iterations=1)
    if not ring.any():
        continue
    free = (alpha[y0:y1, x0:x1][ring] < 0.5).mean()
    if free > 0.55:                   # mostly surrounded by (now transparent) background
        recolour[y0:y1, x0:x1] |= comp
# Letter counters (inside o, e, a, d, ...) are enclosed by the glyph, so the border flood
# never reaches them: make them transparent too, with soft edges.
counters = ndi.binary_fill_holes(recolour) & ~recolour & near_white
cband = ndi.binary_dilation(counters, iterations=3) & ~recolour
alpha[cband] = a_c2a[cband]
alpha[counters & (mn > 243)] = 0.0
cs = np.maximum(alpha, 1e-3)[..., None]
col[cband] = ((rgb - (1 - alpha[..., None]) * 255.0) / cs).clip(0, 255)[cband]
bg |= counters
band |= cband

# 4. Restore nearly enclosed white areas inside icons (e.g. document pages) that the border
#    flood reached through small gaps. Text and arrows are excluded so letter holes stay open.
text_zone = ndi.binary_dilation(recolour, iterations=6)
objects = (~bg) & ~text_zone
closed = ndi.binary_closing(objects, structure=np.ones((3, 3)), iterations=10)
filled = ndi.binary_fill_holes(closed)
holes = filled & bg & ~text_zone
hl, hn = ndi.label(holes)
hs = ndi.sum(np.ones_like(hl), hl, index=np.arange(1, hn + 1))
keep = np.isin(hl, 1 + np.flatnonzero(hs > 400)) & ~ndi.binary_dilation(gaps, iterations=4)
alpha[keep] = 1.0
col[keep] = rgb[keep]
print(f"restored enclosed areas: {int(keep.any() and ndi.label(keep)[1])}")

print("light", save(col, alpha, "hidden-intentions-llm-conceptual-model.png"))

# 5. Dark variant: recoloured ink is light, with alpha taken from its darkness on white,
#    which gives clean anti-aliased edges with no dark fringe.
target = ndi.binary_dilation(recolour, iterations=6) & ~keep & ~(alpha > 0.98) | recolour
darkness = (1.0 - lum / 255.0).clip(0, 1)
dcol = col.copy()
dalpha = alpha.copy()
dcol[target] = LIGHT_INK
dalpha[target] = darkness[target]
print("dark ", save(dcol, dalpha, "hidden-intentions-llm-conceptual-model-dark.png"), f"recoloured components: {int(ndi.label(recolour)[1])}")
