"""Cut Dewy's portraits out of the sheet and the two single portraits.

Inputs (art/raw/): sheet-up4.png (4x2 sheet, 4x upscaled: Lanczos-free, two Topaz 2x passes; sheet-up.png is the first pass, white paper), and the two
single portraits, which the generator returned already transparent: tired-1k.png (alpha,
enlarged 2x here with Lanczos: its Topaz upscale was blocked) and hurt-up.png (Topaz 2x,
flattened on black) + hurt-1k.png (its alpha).
Output: art/dewy/<key>.png, transparent, trimmed.
Run: python3 cut.py   (from this folder). Needs Pillow + numpy.

The white paper is keyed by flood-fill from the border over near-white pixels,
so the cream muzzle and white ear fur inside the outline stay. A soft alpha
ramp on the colour distance keeps the watercolour edge.
"""
import os
import numpy as np
from PIL import Image
from PIL import ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
OUT = os.path.join(HERE, "dewy")
SHEET_KEYS = ["neutral", "proud", None, "frustrated", "moved", "laughing", "kid-wonder", "kid-typing"]  # cell 3 = coffee, skipped
LO, HI = 14, 40  # distance from paper white: <=LO background, >=HI solid


def _flood(mask, seeds):
    """Pixels of `mask` (bool) connected to any seed that is set. Uses PIL's flood fill."""
    im = Image.fromarray((mask * 255).astype(np.uint8)).copy()  # copy: fromarray is read-only
    for x, y in seeds:
        if im.getpixel((x, y)) == 255:
            ImageDraw.floodfill(im, (x, y), 128)
    return np.asarray(im) == 128


def cut(im, pad=6):
    rgb = np.asarray(im.convert("RGB")).astype(np.float32)
    h, w = rgb.shape[:2]
    dist = np.sqrt(((255 - rgb) ** 2).sum(axis=2)) / 1.732  # 0..255
    cand = dist < HI
    step = max(1, min(w, h) // 200)
    seeds = [(x, 0) for x in range(0, w, step)] + [(x, h - 1) for x in range(0, w, step)]
    seeds += [(0, y) for y in range(0, h, step)] + [(w - 1, y) for y in range(0, h, step)]
    bg = _flood(cand, seeds)
    alpha = np.where(bg, np.clip((dist - LO) / (HI - LO), 0, 1), 1.0)
    # keep only the blob around the centre (drops stray specks)
    solid = Image.fromarray(((alpha > 0.05) * 255).astype(np.uint8))
    bridged = np.asarray(solid.filter(ImageFilter.MaxFilter(17))) > 0
    keep = _flood(bridged, [(w // 2, h // 2), (w // 2, h // 3), (w // 2, 2 * h // 3)])
    alpha = alpha * keep
    return _finish(rgb, alpha, pad)


def _finish(rgb, alpha, pad=6):
    h, w = alpha.shape
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    im2 = Image.fromarray(out)
    x0, y0, x1, y1 = im2.getchannel("A").point(lambda v: 255 if v > 12 else 0).getbbox()
    return im2.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)))


def cut_alpha(rgb_im, alpha_im, unpremultiply=False):
    """Portrait that already has an alpha mask (resized to the colour image)."""
    rgb = np.asarray(rgb_im.convert("RGB")).astype(np.float32)
    a = np.asarray(alpha_im.convert("RGBA").getchannel("A").resize(rgb_im.size, Image.LANCZOS)).astype(np.float32) / 255
    a = np.where(a < 0.04, 0, a)
    if unpremultiply:  # colours were flattened on black
        rgb = np.clip(rgb / np.maximum(a, 0.05)[..., None], 0, 255)
    h, w = a.shape
    solid = Image.fromarray(((a > 0.05) * 255).astype(np.uint8))
    bridged = np.asarray(solid.filter(ImageFilter.MaxFilter(9))) > 0
    a = a * _flood(bridged, [(w // 2, h // 2), (w // 2, h // 3), (w // 2, 2 * h // 3)])
    return _finish(rgb, a)


def main():
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.open(os.path.join(RAW, "sheet-up4.png")).convert("RGB")
    cw, ch = sheet.width / 4, sheet.height / 2
    for i, key in enumerate(SHEET_KEYS):
        if key is None:
            continue
        r, c = divmod(i, 4)
        m = 48  # margin: a few ears touch the grid line; the centre-blob keep drops neighbours' bits
        cell = sheet.crop((max(0, round(c * cw) - m), round(r * ch), min(sheet.width, round((c + 1) * cw) + m), round((r + 1) * ch)))
        cut(cell).save(os.path.join(OUT, key + ".png"))
    t1 = Image.open(os.path.join(RAW, "tired-1k.png"))
    cut_alpha(t1.resize((t1.width * 2, t1.height * 2), Image.LANCZOS), t1).save(os.path.join(OUT, "tired.png"))
    cut_alpha(Image.open(os.path.join(RAW, "hurt-up.png")), Image.open(os.path.join(RAW, "hurt-1k.png")), True).save(os.path.join(OUT, "hurt.png"))
    for f in sorted(os.listdir(OUT)):
        print(f, Image.open(os.path.join(OUT, f)).size)


if __name__ == "__main__":
    main()
