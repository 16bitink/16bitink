"""The Rail-Gun Train, chapter 4's fortress (level 40), straight down like the Boar fortress, the Sand Crawler and the Ironclad.

  python3 dev/pixel/snow/train.py      out/render/train-body.png, train-wheels.png, train-wheels-f2.png,
                                       fortressRail-1.png, fortressRail-0.png
                                       + out/sheets/train.png and train.json (one 512 sheet to paint, both wheel frames on it)

Faces north, pivot at the frame centre, native density-C px. A train is long, so its frame is 384 (the other bosses' 288 can't
hold it): an armoured locomotive (snow plough, boxy sloped armour over the boiler, a squat smokestack, the cab with slit
windows) coupled to one gun car carrying the rail gun. The clans' three marks (Crow black, Boar ivory, Weasel mustard) ride
on the cab roof: all three clans run it. 'wheels' stand in for treads: the driving wheels and bogies peek out past the
skirts, and the coupling rods along the loco's sides move between the two frames (half a crank turn).

Turret rings (MOUNTS) sit on the centre line; the Boar fortress's turret art serves the cannon, MG and rockets, and the boss
rail gun (fortressRail, 144 frame like fortressMortar) is new. The coordinator may move the rings for level 40: change MOUNTS,
re-run this, repaint the sheet.
"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
WORLD = HERE.parent / 'world'
sys.path.insert(0, str(WORLD))
from kit import PMesh, cylinder, hls, lump, tone  # noqa: E402
from props import bar  # noqa: E402
from topdown import SOOT, STEEL, cylinder_y, frame, race, rivets  # noqa: E402

OUT = HERE / 'out'
SIZE = 384
IRON = tone(0.6, 0.08, 0.34, 0.012, 0.03)        # cold gunmetal armour
IRON_D = tone(0.6, 0.08, 0.24, 0.01, 0.02)
IRON_L = tone(0.6, 0.06, 0.44, 0.01, 0.03)
RUSTY = tone(0.04, 0.45, 0.32, 0.01, 0.04)
WHEEL = tone(0.0, 0.0, 0.16, 0.0, 0.02)
TYRE = tone(0.6, 0.04, 0.5, 0.0, 0.03)
RED = lambda r: hls(0.0, 0.62, 0.42)  # noqa: E731
SNOW = tone(0.6, 0.3, 0.72, 0.01, 0.025)
GLOW = lambda r: hls(0.5, 0.85, 0.6)  # noqa: E731
GLASS = lambda r: hls(0.55, 0.25, 0.14)  # noqa: E731
LAMP = lambda r: hls(0.14, 0.8, 0.75)  # noqa: E731
CROW = lambda r: hls(0.7, 0.1, 0.18)  # noqa: E731
BOAR = lambda r: hls(0.12, 0.35, 0.8)  # noqa: E731
WEASEL = lambda r: hls(0.12, 0.6, 0.48)  # noqa: E731
HALF = 34.0                                       # half the body's width
LOCO = (-176.0, -6.0)                             # the locomotive's y extent (nose to buffers)
CAR = (6.0, 182.0)                                # the gun car's
MOUNTS = {'cannon': (0, -108), 'mg': (0, -30), 'rockets': (0, 34), 'rail': (0, 112)}
MOUNT_TURRET = {'cannon': 'fortressCannon', 'mg': 'fortressMG', 'rockets': 'fortressRockets', 'rail': 'fortressRail'}
RING_R = {'fortressCannon': 20, 'fortressMG': 13, 'fortressRockets': 20, 'fortressRail': 24}
DRIVERS = [-140, -112, -84]                       # the loco's driving axles (big wheels, coupled by rods)
BOGIES = [(-162, 7.0), (-40, 7.0), (-24, 7.0), (24, 7.0), (40, 7.0), (156, 7.0), (172, 7.0)]  # (y, radius) small wheels
DRIVE_R = 11.0
CRANK = 4.5


def slab(m: PMesh, x0: float, y0: float, x1: float, y1: float, z0: float, z1: float, inset: float, col, rng, top=None) -> None:
    """A box whose top is pulled in by `inset`: sloped armour."""
    lo = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    hi = [(x0 + inset, y0 + inset), (x1 - inset, y0 + inset), (x1 - inset, y1 - inset), (x0 + inset, y1 - inset)]
    inside = np.array([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2])
    for i in range(4):
        a, b = lo[i], lo[(i + 1) % 4]
        c, d = hi[(i + 1) % 4], hi[i]
        m.face([(a[0], a[1], z0), (b[0], b[1], z0), (c[0], c[1], z1), (d[0], d[1], z1)], col(rng), inside)
    m.face([(x, y, z1) for x, y in hi], (top or col)(rng), inside)


def wheel(m: PMesh, x: float, y: float, r: float, rng: random.Random, w: float = 5.0) -> None:
    """A flanged wheel standing edge-on along y (axis along x): from above, its tyre's upper half."""
    n = 14
    for i in range(n):
        a0, a1 = math.pi * i / n, math.pi * (i + 1) / n
        p = lambda a, dx: (x + dx, y - r * math.cos(a), r + r * math.sin(a) * 0.98)  # noqa: E731
        m.face([p(a0, -w / 2), p(a1, -w / 2), p(a1, w / 2), p(a0, w / 2)], TYRE(rng) if i % 2 else WHEEL(rng), np.array([x, y, r]))
    m.box(x + math.copysign(w / 2 + 0.6, x), y, r, 1.2, r * 1.6, r * 1.6, 0, WHEEL(rng))


def wheels(phase: float) -> PMesh:
    """Wheels peeking past the skirts, and the coupling rods on the drivers, at crank angle `phase` (radians)."""
    m = PMesh()
    rng = random.Random(1701)
    for sx in (-1, 1):
        x = sx * (HALF + 3)
        for y in DRIVERS:
            wheel(m, x, y, DRIVE_R, rng, w=6.0)
        for y, r in BOGIES:
            wheel(m, x, y, r, rng)
        # The coupling rod joins the crank pins of the three drivers; the main rod runs forward to the piston's crosshead.
        dy, dz = CRANK * math.cos(phase), CRANK * math.sin(phase)
        xr = sx * (HALF + 7.5)
        bar(m, (xr, DRIVERS[0] + dy, DRIVE_R + dz + 2), (xr, DRIVERS[-1] + dy, DRIVE_R + dz + 2), 2.6, STEEL(rng))
        for y in DRIVERS:
            cylinder(m, (xr, y + dy), 1.8, DRIVE_R + dz + 1, DRIVE_R + dz + 4, lambda q: hls(0.08, 0.5, 0.5), rng, sides=8)
        cross = -162 + dy * 0.6
        bar(m, (xr + sx * 1.6, DRIVERS[0] + dy, DRIVE_R + dz + 3.4), (xr + sx * 1.6, cross, DRIVE_R + 3), 2.2, RED(rng))
        m.box(xr + sx * 1.6, cross, DRIVE_R + 3, 3, 5, 4, 0, STEEL(rng))
    return m


def body() -> PMesh:
    m = PMesh()
    rng = random.Random(1711)
    ly0, ly1 = LOCO
    cy0, cy1 = CAR
    # --- the locomotive: frame and skirts, a plough, sloped armour over the boiler, the cab ---
    m.box(0, (ly0 + ly1) / 2 + 4, 6, 2 * HALF, ly1 - ly0 - 8, 8, 0, IRON_D(rng))
    for sx in (-1, 1):
        # Skirts over the wheels: cut away where the drivers and rods show.
        for (a, b) in ((ly0 + 12, -156), (-70, ly1 - 2)):
            m.box(sx * (HALF - 1), (a + b) / 2, 14, 3, b - a, 12, 0, IRON(rng))
            rivets(m, sx * (HALF - 1), a + 2, sx * (HALF - 1), b - 2, 20, 6, rng)
        # The piston cylinders, forward of the drivers.
        cylinder_y(m, (sx * (HALF + 2), -168), -150, 5.5, 13, IRON_D, rng, sides=12)
    # The plough: a wedge across the nose, its blade ribbed, snow heaped on it.
    for sx in (-1, 1):
        m.face([(0, ly0 - 10, 2), (sx * HALF, ly0 + 6, 2), (sx * HALF, ly0 + 6, 18), (0, ly0 - 4, 18)], STEEL(rng), np.array([0, ly0 + 20, 10]))
        m.face([(0, ly0 - 4, 18), (sx * HALF, ly0 + 6, 18), (sx * (HALF - 4), ly0 + 14, 20), (0, ly0 + 8, 20)], IRON_D(rng), np.array([0, ly0 + 20, 0]))
    for k in range(-3, 4):
        bar(m, (k * 8, ly0 - 4 + abs(k) * 2.4, 18.5), (k * 9, ly0 + 6 + abs(k) * 1.4, 4), 1.2, IRON_L(rng))
    lump(m, (-10, ly0 - 1, 10), (10, 5, 6), SNOW, rng, n=5, jag=0.2)
    lump(m, (14, ly0 + 1, 8), (8, 4, 5), SNOW, rng, n=5, jag=0.2)
    # Armour over the boiler: a long sloped box, plates riveted down its spine, hatches, the headlamp in front.
    slab(m, -HALF + 2, ly0 + 14, HALF - 2, -54, 14, 38, 6, IRON, rng)
    for y in np.arange(ly0 + 24, -60, 22):
        m.box(0, y, 38.4, 2 * HALF - 18, 0.8, 0.3, 0, IRON_D(rng))
    for sx in (-1, 1):
        rivets(m, sx * (HALF - 8), ly0 + 22, sx * (HALF - 8), -60, 38.2, 7, rng)
    cylinder(m, (0, ly0 + 18), 4.2, 30, 34, LAMP, rng, sides=12)
    m.box(0, ly0 + 22, 33, 12, 4, 4, 0, IRON_D(rng))
    # The squat armoured smokestack with a spark-arrester cap, soot round it; a sand dome and a bell behind.
    cylinder(m, (0, -146), 8, 38, 48, IRON_D, rng, sides=14, top=lambda q: hls(0, 0, 0.06))
    cylinder(m, (0, -146), 9.2, 46, 47.4, STEEL, rng, sides=14)
    for k in range(6):
        a = math.pi / 6 * k
        m.box(0, -146, 47.8, 17, 1.0, 0.6, a, IRON_D(rng))
    lump(m, (0, -140, 38.6), (14, 12, 0.6), SOOT, rng, n=6, floor=38.4)
    cylinder(m, (-12, -76), 5, 38, 43, IRON_L, rng, sides=12)
    cylinder(m, (12, -78), 3, 38, 41, lambda q: hls(0.11, 0.55, 0.5), rng, sides=10)
    # Snow drifted along the armour's shoulders.
    for y in (-170, -132, -96, -66):
        for sx in (-1, 1):
            lump(m, (sx * (HALF - 9), y, 37), (4, rng.uniform(6, 10), 1.6), SNOW, rng, n=4, jag=0.2)
    # The cab: higher, its front a sloped plate with slit windows, a roof with the clans' three marks, vents.
    slab(m, -HALF, -54, HALF, ly1, 14, 46, 4, IRON, rng, top=IRON_L)
    for k in range(5):
        m.box(-16 + k * 8, -50.4, 42, 5, 1.0, 2.4, 0, GLASS(rng))
    for (x, col) in ((-14, CROW), (0, BOAR), (14, WEASEL)):
        cylinder(m, (x, -12), 4.6, 46, 47.2, col, rng, sides=12)
    for k in range(6):
        m.box(0, -46 + k * 2.6, 46.3, 22, 1.1, 0.6, 0, hls(0, 0, 0.14))
    for sx in (-1, 1):
        m.box(sx * (HALF - 2), -30, 30, 2, 12, 10, 0, IRON_D(rng))
    # Buffers and the coupling across the gap.
    for sx in (-1, 1):
        cylinder_y(m, (sx * 22, ly1), ly1 + 4, 3, 10, STEEL, rng, sides=10)
        cylinder_y(m, (sx * 22, cy0 - 4), cy0, 3, 10, STEEL, rng, sides=10)
    bar(m, (0, ly1, 9), (0, cy0, 9), 3, IRON_D(rng))
    # --- the gun car: a frame, armoured walls round a sunken deck, the rail gun's big ring aft, rockets forward ---
    m.box(0, (cy0 + cy1) / 2, 6, 2 * HALF, cy1 - cy0, 8, 0, IRON_D(rng))
    for sx in (-1, 1):
        m.box(sx * (HALF - 3), (cy0 + cy1) / 2, 19, 6, cy1 - cy0 - 4, 22, 0, IRON(rng))
        rivets(m, sx * (HALF - 3), cy0 + 4, sx * (HALF - 3), cy1 - 4, 30.2, 7, rng)
        for y in np.arange(cy0 + 30, cy1 - 10, 36):
            m.box(sx * (HALF + 0.6), y, 18, 1.6, 10, 8, 0, RED(rng))
    for y in (cy0 + 3, cy1 - 3):
        m.box(0, y, 19, 2 * HALF - 4, 6, 22, 0, IRON(rng))
    m.box(0, (cy0 + cy1) / 2, 26, 2 * HALF - 12, cy1 - cy0 - 12, 1.4, 0, IRON_D(rng))
    # Capacitor banks and cable runs feeding the rail gun: cyan-lit cells between the turret rings.
    for sx in (-1, 1):
        for k in range(4):
            m.box(sx * 17, 62 + k * 7, 29.5, 10, 5.2, 6, 0, IRON_L(rng))
            m.box(sx * 17, 62 + k * 7, 32.7, 7, 2.4, 0.6, 0, GLOW(rng))
        bar(m, (sx * 8, 58, 28), (sx * 8, 92, 28), 2.2, hls(0, 0, 0.1))
    # Shell racks behind the rockets, an ammo hoist, snow in the corners.
    for k in range(5):
        m.box(-16 + k * 8, 166, 29, 6, 8, 6, 0, hls(0.08, 0.35, 0.32))
        cylinder(m, (-16 + k * 8, 166), 2, 32, 34, lambda q: hls(0.12, 0.6, 0.5), rng, sides=8)
    for (x, y) in ((-24, 14), (24, 16), (-24, 172), (24, 170)):
        lump(m, (x, y, 27), (6, 4, 1.8), SNOW, rng, n=4, jag=0.2)
    # Turret races on armoured barbettes.
    for name, (x, y) in MOUNTS.items():
        r = RING_R[MOUNT_TURRET[name]]
        z = 46.4 if name == 'mg' else (38.4 if y < 0 else 27.4)
        cylinder(m, (x, y), r + 3, z - 3, z, IRON_D, rng, sides=24, top=IRON)
        race(m, x, y, r, z, rng)
    return m


# --- the boss rail gun turret (fortressRail, 144 frame like the other boss turrets) ---------------------------------------------

RAIL_LEN = 56.0


def rail_turret(state: int) -> PMesh:
    m = PMesh()
    rng = random.Random(1721)
    if state:
        # A low armoured housing, the two long rails with cyan field coils, a breech block, capacitors behind.
        pts = [(26 * math.cos(2 * math.pi * (i + 0.5) / 10), 24 * math.sin(2 * math.pi * (i + 0.5) / 10) + 6) for i in range(10)]
        m.prism(pts, 0, 12, IRON(rng), IRON(rng))
        m.prism([(x * 0.8, y * 0.8 + 1) for x, y in pts], 12, 14, IRON_D(rng))
        m.box(0, -14, 13, 22, 16, 12, 0, IRON_D(rng))
        for sx in (-1, 1):
            m.box(sx * 5, -14 - RAIL_LEN / 2 + 6, 13, 3.4, RAIL_LEN - 2, 8, 0, STEEL(rng))
            m.box(sx * 5, -14 - RAIL_LEN / 2 + 6, 17.4, 2.4, RAIL_LEN - 4, 0.8, 0, IRON_L(rng))
        m.box(0, -14 - RAIL_LEN / 2 + 6, 11, 6.6, RAIL_LEN - 4, 2, 0, GLOW(rng))
        for k in range(5):
            y = -24 - k * 9
            m.box(0, y, 13, 16, 3.2, 10, 0, IRON_D(rng))
            m.box(0, y - 2, 13, 7, 0.8, 9, 0, GLOW(rng))
        m.box(0, -14 - RAIL_LEN + 6, 13, 16, 4, 10, 0, IRON_D(rng))
        for sx in (-1, 1):
            for k in range(3):
                cylinder(m, (sx * 12, 14 + k * 6.5), 3, 14, 20, IRON_L, rng, sides=10, top=GLOW)
        rivets(m, -18, 22, 18, 22, 14, 5, rng)
        cylinder(m, (0, 18), 5, 14, 16, IRON_D, rng, sides=10)
    else:
        pts = [(26 * math.cos(2 * math.pi * (i + 0.5) / 10), 24 * math.sin(2 * math.pi * (i + 0.5) / 10) + 6) for i in range(10)]
        m.prism(pts, 0, 7, SOOT(rng), SOOT(rng))
        for k in range(10):
            a = rng.uniform(0, 2 * math.pi)
            m.box(math.cos(a) * 18, math.sin(a) * 16 + 4, 8, rng.uniform(5, 10), rng.uniform(3, 6), 3, a, IRON_D(rng), (rng.uniform(-0.4, 0.4), 0))
        # One rail snapped and bent aside, the other short and blackened.
        m.box(-5, -34, 9, 3.4, 40, 6, 0, SOOT(rng))
        bar(m, (5, -14, 10), (18, -48, 3), 3.4, STEEL(rng))
        lump(m, (0, 4, 7), (16, 14, 2), SOOT, rng, n=6, jag=0.3)
    return m


PIECES = {'train-body': (body, SIZE), 'train-wheels': (lambda: wheels(0.0), SIZE), 'train-wheels-f2': (lambda: wheels(math.pi), SIZE),
          'fortressRail-1': (lambda: rail_turret(1), 144), 'fortressRail-0': (lambda: rail_turret(0), 144)}
# Where each frame's bbox sits on the 512 sheet (x, y of its frame's top-left); everything here is painted in one call.
SHEET = {'train-body': (-60, 64), 'train-wheels': (60, 64), 'train-wheels-f2': (170, 64), 'fortressRail-1': (360, 0), 'fortressRail-0': (360, 150)}


def main() -> None:
    (OUT / 'render').mkdir(parents=True, exist_ok=True)
    (OUT / 'sheets').mkdir(parents=True, exist_ok=True)
    sheet = Image.new('RGBA', (512, 512))
    place = {}
    for key, (fn, size) in PIECES.items():
        img, _ = frame(fn(), size)
        im = Image.fromarray(img)
        im.save(OUT / 'render' / f'{key}.png')
        bb = im.getbbox()
        x, y = SHEET[key]
        print(key, size, bb, flush=True)
        assert x + bb[0] >= 0 and y + bb[1] >= 0 and x + bb[2] <= 512 and y + bb[3] <= 512, (key, bb, x + bb[0], y + bb[1], x + bb[2], y + bb[3])
        sheet.alpha_composite(im.crop(bb), (x + bb[0], y + bb[1]))
        place[key] = {'x': x, 'y': y}
    sheet.save(OUT / 'sheets' / 'train.png')
    muzzle = [[0, round(-14 - RAIL_LEN + 4)]]
    (OUT / 'sheets' / 'train.json').write_text(json.dumps({'place': place, 'muzzle': {'fortressRail': muzzle}, 'mounts': MOUNTS,
                                                           'mountTurret': MOUNT_TURRET}, indent=1))


if __name__ == '__main__':
    main()
