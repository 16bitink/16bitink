"""Vehicles from raw/vehicles.png at their real proportions (the owner, November 28: real widths, real lanes).

Each picture is cut, trimmed and resized to its length; then only its height is resampled so the body (the paint
between the mirrors, measured as the median opaque height of the middle columns) is the real width over the drawn
length. Mirrors stay outside the body, as on a real car. The game draws every picture at its own aspect
(src/render/cars/carAtlas.ts) and holds the body to sizeOf() in src/sim/vehicleSize.ts, so keep WIDTH_M there and
REAL below the same.
"""
import numpy as np
from PIL import Image
import artlib as A

# Drawn length (plan px, LENGTHS x 1.14 under 20 px, x 1.07 over) and real body width (m); 16 px is 4.5 m.
PX_PER_M = 16 / 4.5
DRAWN_LEN = {"car": 15.96, "taxi": 15.96, "police": 15.96, "van": 18.24, "truck": 25.68, "bus": 27.82,
             "tram": 36.38, "tow": 20.52, "school": 23.54}
REAL = {"car": 1.8, "taxi": 1.8, "police": 1.8, "van": 2.0, "truck": 2.55, "bus": 2.55, "tram": 2.65, "tow": 2.2, "school": 2.5}

# The raw sheet's order (rows of five) and each picture's length in picture px (8 per plan px of the sim's length).
NAMES = [("v-car-1", 112), ("v-car-2", 112), ("v-car-3", 112), ("v-car-4", 112), ("v-car-5", 112),
         ("v-taxi", 112), ("v-van", 136), ("v-truck", 232), ("v-tow", 152), ("v-police", 112),
         ("v-bus", 272), ("v-school", 240), ("v-tram", 440), ("v-metro", 272), ("v-boat", 150),
         ("v-lorry", 260), ("v-fire", 200), ("v-icecream", 136), ("v-jeep", 112), ("v-ambulance", 136)]


def kind_of(name):
    k = name[2:].split("-")[0]
    return k if k in REAL else None


def body_share(im):
    """The body's height over the picture's length: median opaque height of the middle 80% of columns."""
    a = np.array(im)[..., 3] > 128
    w = a.shape[1]
    return float(np.median(a.sum(axis=0)[int(w * 0.1):int(w * 0.9)])) / w


def bake(img, name, width):
    im = A.clean(img)
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    kind = kind_of(name)
    if kind:
        want = REAL[kind] * PX_PER_M / DRAWN_LEN[kind]
        k = want / body_share(im)
        im = im.resize((width, max(1, round(im.height * k))), Image.LANCZOS)
        print(f"{name}: body x{k:.2f} -> {im.size}")
    im.save(A.OUT / f"{name}.webp", "WEBP", quality=88, method=6)
    return im.size


cs = A.order(A.cut("raw/vehicles.png", dilate=3), [5, 5, 5, 5])
for c, (n, w) in zip(cs, NAMES):
    bake(c["img"], n, w)
