"""Cut the screen kit's painted art out of the generated images (raw/).

raw/laptop.png, raw/crt.png: a bezel on white paper with a chroma-green screen.
raw/tools.png: a dip pen, an arrow cursor and a pointing hand on white paper.
Output (this folder): laptop.png, crt.png (screen area transparent), pen.png,
arrow.png, hand.png (transparent, trimmed). Prints the screen rectangles and the
hotspots that screen.ts hard-codes (SOURCE_* constants).
Run: python3 cut.py   (from this folder). Needs Pillow + numpy.

Paper white is keyed by a flood fill from the border over near-white pixels, so
white parts inside an outline (the cursors) stay. Green is keyed by how much
greener than red/blue a pixel is, with a soft ramp and despill on the edge.
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
LO, HI = 10, 34  # distance from paper white: <=LO background, >=HI solid
G_LO, G_HI = 40, 110  # greenness: <=G_LO solid, >=G_HI keyed out


def flood(mask, seeds):
    im = Image.fromarray((mask * 255).astype(np.uint8)).copy()
    for x, y in seeds:
        if im.getpixel((x, y)) == 255:
            ImageDraw.floodfill(im, (x, y), 128)
    return np.asarray(im) == 128


def paper_alpha(rgb):
    h, w = rgb.shape[:2]
    dist = np.sqrt(((255 - rgb) ** 2).sum(axis=2)) / 1.732
    step = 4
    seeds = [(x, 0) for x in range(0, w, step)] + [(x, h - 1) for x in range(0, w, step)]
    seeds += [(0, y) for y in range(0, h, step)] + [(w - 1, y) for y in range(0, h, step)]
    bg = flood(dist < HI, seeds)
    return np.where(bg, np.clip((dist - LO) / (HI - LO), 0, 1), 1.0)


def green_key(rgb, alpha):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    greenness = g - np.maximum(r, b)
    # Only the screen: the green area connected to the image centre (spares a green power LED).
    h, w = greenness.shape
    region = flood(greenness > G_LO * 0.5, [(w // 2, h // 2), (w // 2, h // 3)])
    region = np.asarray(Image.fromarray((region * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))) > 0
    greenness = np.where(region, greenness, 0)
    keep = 1 - np.clip((greenness - G_LO) / (G_HI - G_LO), 0, 1)
    out = rgb.copy()
    spill = greenness > 0
    out[..., 1] = np.where(spill, np.maximum(r, b) + np.minimum(greenness, 8), g)
    ys, xs = np.nonzero(greenness > G_HI)
    return out, alpha * keep, (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def save(rgb, alpha, name, crop=None):
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    im = Image.fromarray(out)
    if crop:
        im = im.crop(crop)
    im.save(os.path.join(HERE, name))
    return im


def bezel(name):
    rgb = np.asarray(Image.open(os.path.join(RAW, f"{name}.png")).convert("RGB")).astype(np.float32)
    alpha = paper_alpha(rgb)
    rgb, alpha, screen = green_key(rgb, alpha)
    save(rgb, alpha, f"{name}.png")
    print(name, "screen", screen, "size", rgb.shape[1], rgb.shape[0])


def tools():
    rgb = np.asarray(Image.open(os.path.join(RAW, "tools.png")).convert("RGB")).astype(np.float32)
    alpha = paper_alpha(rgb)
    # The ink drop under the nib: a hanging blob, cut off below the tip.
    tip_y = 582
    alpha[tip_y:, :140] = 0
    for name, (x0, x1) in {"pen": (0, 530), "arrow": (540, 820), "hand": (900, 1260)}.items():
        a = alpha[:, x0:x1]
        ys, xs = np.nonzero(a > 0.05)
        box = (x0 + xs.min() - 4, ys.min() - 4, x0 + xs.max() + 5, ys.max() + 5)
        save(rgb, alpha, f"{name}.png", box)
        print(name, "box", box)
    # Hotspots (in the cut image's px): the pen's lowest-left inked pixel, the arrow's top-left tip, the finger's top.
    pa = alpha[:, :530] > 0.5
    ys, xs = np.nonzero(pa)
    i = np.argmax(ys - xs * 0.2)
    print("pen tip (raw px)", int(xs[i]), int(ys[i]))
    aa = alpha[:, 540:820] > 0.5
    ys, xs = np.nonzero(aa)
    i = np.argmin(ys + xs)
    print("arrow tip (raw px)", 540 + int(xs[i]), int(ys[i]))
    ha = alpha[:, 900:1260] > 0.5
    ys, xs = np.nonzero(ha)
    i = np.argmin(ys)
    print("finger tip (raw px)", 900 + int(xs[i]), int(ys[i]))


if __name__ == "__main__":
    bezel("laptop")
    bezel("crt")
    tools()
