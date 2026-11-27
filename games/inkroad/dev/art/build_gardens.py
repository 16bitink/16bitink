"""Cut a set's front-garden sheet (raw/<set>-gardens.png, 2 x 2 pieces) into b-<set>-garden1-0..3.

A piece is a 2 x 2 plot's front garden: open north edge, side walls, front wall with a centred gate.
It is scaled to 160 px wide, and its ground (top edge of the full-width ground to the front wall's
bottom) to 2 cells deep at the view's tilt, so it meets the villa picture above it exactly.
usage: build_gardens.py <set> [<set> ...]
"""
import sys
import numpy as np
from PIL import Image
import artlib as A

W = 160
TILT = 0.87
GROUND_H = round(2 * 40 * TILT * 2)  # 2 cells deep, 2x  -> 139
FULL = 0.85  # a row is ground when this much of the width is painted


def ground_top(img):
    a = np.array(img)[..., 3] > 40
    w = a.shape[1]
    for y in range(a.shape[0]):
        if a[y].sum() >= FULL * w:
            return y
    return 0


def piece(img):
    im = A.clean(img)
    top = ground_top(im)
    ky = GROUND_H / (im.height - top)
    return im.resize((W, max(1, round(im.height * ky))), Image.LANCZOS)


for s in sys.argv[1:]:
    cs = None
    for d in (5, 3, 1):
        cs = A.cut(f"raw/{s}-gardens.png", dilate=d)
        if len(cs) == 4:
            break
    if len(cs) != 4:
        raise SystemExit(f"{s}: {len(cs)} pieces, expected 4 (areas {sorted(c['area'] for c in cs)})")
    for i, c in enumerate(A.order(cs, [2, 2])):
        out = piece(c["img"])
        out.save(A.OUT / f"b-{s}-garden1-{i}.webp", "WEBP", quality=88, method=6)
        print(s, i, out.size)
