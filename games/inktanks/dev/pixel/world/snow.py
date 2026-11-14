"""The Frostridge (chapter 4) structures as 3D models, in the field projection (native density-C pixels, origin = middle of the footprint).

Snowy pines (canopy fades) and small snow-laden firs (cover, flattenable), log cabins (small and large, snowy roofs that fade),
snowdrifts (low cover, 2/1/0: level 32 digs crews out), ice rocks, the ridge (a granite cliff with snow on its ledges: an
east-west run, a north-south run and a corner, like the mesa), a frozen fence, the Laser Lab's generator (Raid target, level 33)
and the research lab, a signal mast, rail track in snow and a railway signal box.

Rendered by build.py like the farm set; painted on their own sheets (snow), see dev/pixel/snow/build.py.
"""
from __future__ import annotations

import math
import random

import numpy as np

from desert import blob
from desert2 import turned
from farm import holes_in, rotate, structure, trunk_foot
from kit import FIELDSTONE, PMesh, blocks, cylinder, gable, gable_ends, hls, lump, panel, rubble, tone
from props import SOOT, STEEL, bar, transformed

SNOW = tone(0.6, 0.3, 0.72, 0.01, 0.025)
SNOW_D = tone(0.6, 0.25, 0.62, 0.01, 0.025)
ICE = tone(0.53, 0.5, 0.74, 0.01, 0.04)
ICE_D = tone(0.55, 0.42, 0.56, 0.01, 0.04)
GRANITE = tone(0.6, 0.07, 0.44, 0.02, 0.06)
GRANITE_D = tone(0.62, 0.08, 0.33, 0.02, 0.04)
LOG = tone(0.07, 0.36, 0.3, 0.01, 0.04)
LOG_D = tone(0.07, 0.32, 0.22, 0.01, 0.03)
LOG_END = tone(0.09, 0.42, 0.56, 0.01, 0.04)
SHINGLE = tone(0.06, 0.25, 0.26, 0.01, 0.03)
NEEDLE = tone(0.4, 0.32, 0.2, 0.02, 0.03)
NEEDLE_L = tone(0.38, 0.3, 0.27, 0.02, 0.03)
BARK = tone(0.07, 0.3, 0.23, 0.01, 0.03)
CONCRETE = tone(0.1, 0.05, 0.6, 0.01, 0.04)
CONCRETE_D = tone(0.1, 0.05, 0.46, 0.01, 0.03)
PANEL = tone(0.55, 0.1, 0.56, 0.01, 0.03)
STEEL_D = tone(0.6, 0.06, 0.24, 0.01, 0.03)
GLOW = lambda r: hls(0.5, 0.85, 0.62)  # noqa: E731   the lab's cyan energy
GLASS = lambda r: hls(0.55, 0.35, 0.3)  # noqa: E731
LIT = lambda r: hls(0.13, 0.7, 0.66)  # noqa: E731   a warm lit window
HAZARD = lambda r: hls(0.13, 0.85, 0.52)  # noqa: E731
BLACK = lambda r: hls(0.0, 0.0, 0.08)  # noqa: E731
RED = lambda r: hls(0.0, 0.65, 0.45)  # noqa: E731
WHITE = lambda r: hls(0.1, 0.1, 0.86)  # noqa: E731
PORCELAIN = lambda r: hls(0.08, 0.35, 0.72)  # noqa: E731
DARK = lambda r: hls(0.6, 0.1, 0.1)  # noqa: E731
BRICK = tone(0.02, 0.42, 0.36, 0.01, 0.05)
PLANK = tone(0.08, 0.3, 0.4, 0.01, 0.05)


def icicles(m: PMesh, a: tuple, b: tuple, z: float, rng: random.Random, every: float = 3.0, length: tuple = (2.0, 6.0)) -> None:
    """Icicles hanging from an eave or a rail from a to b (ground x, y) at height z."""
    (ax, ay), (bx, by) = a, b
    n = max(1, int(math.hypot(bx - ax, by - ay) / every))
    for i in range(n + 1):
        if rng.random() < 0.35:
            continue
        f = i / n
        x, y = ax + (bx - ax) * f, ay + (by - ay) * f
        bar(m, (x, y, z), (x, y + 0.2, z - rng.uniform(*length)), 0.9, ICE(rng))


def snow_cap(m: PMesh, x0: float, x1: float, y0: float, y1: float, z: float, rng: random.Random, depth: float = 1.6, over: float = 0.8) -> None:
    """A soft cushion of snow on a flat top: lumps across it, a little proud of its edges."""
    w, d = x1 - x0, y1 - y0
    nx, ny = max(1, int(w / 9)), max(1, int(d / 9))
    for i in range(nx):
        for j in range(ny):
            cx = x0 + (i + 0.5) * w / nx + rng.uniform(-1, 1)
            cy = y0 + (j + 0.5) * d / ny + rng.uniform(-1, 1)
            lump(m, (cx, cy, z), (w / nx / 2 + over, d / ny / 2 + over, depth), SNOW, rng, n=5, jag=0.12, floor=z)


# --- trees ----------------------------------------------------------------------------------------------------------------------

def cone(m: PMesh, r: float, z0: float, z1: float, col, rng: random.Random, sides: int = 14, jag: float = 0.16, ry: float = 0.85,
         cx: float = 0.0, cy: float = 0.0) -> None:
    for i in range(sides):
        a0, a1 = 2 * math.pi * i / sides, 2 * math.pi * (i + 1) / sides
        j0 = 1 + jag * ((i * 7) % 3 - 1)
        j1 = 1 + jag * (((i + 1) * 7) % 3 - 1)
        m.face([(cx + r * j0 * math.cos(a0), cy + r * ry * j0 * math.sin(a0), z0), (cx + r * j1 * math.cos(a1), cy + r * ry * j1 * math.sin(a1), z0), (cx, cy, z1)],
               col(rng), np.array([cx, cy, z0 + 1]))
    m.face([(cx + r * math.cos(2 * math.pi * i / sides), cy + r * ry * math.sin(2 * math.pi * i / sides), z0) for i in range(sides)], col(rng), np.array([cx, cy, z0 + 5]))


def snowy_tiers(m: PMesh, tiers, rng: random.Random, cx: float = 0.0, cy: float = 0.0) -> None:
    """A pine's tiers of dark needles, each one's upper part under a cone of snow and a ragged snow lip."""
    for z0, z1, r in tiers:
        cone(m, r, z0, z1, NEEDLE, rng, cx=cx, cy=cy)
        # The snow sits on the tier's upper slope: a slightly smaller, slightly higher cone, plus lumps on its shoulders.
        zs = z0 + (z1 - z0) * 0.3
        cone(m, r * 0.72, zs, z1 + 0.6, SNOW, rng, sides=12, jag=0.22, cx=cx, cy=cy)
        for k in range(6):
            a = 2 * math.pi * k / 6 + rng.uniform(-0.3, 0.3)
            rr = r * rng.uniform(0.55, 0.75)
            lump(m, (cx + rr * math.cos(a), cy + rr * 0.85 * math.sin(a), zs + 0.8), (r * 0.18, r * 0.14, 1.4), SNOW, rng, n=4, jag=0.2)


@structure('snowPine', [1, 0], foot='hull', hp=120, flattenable=True)
def snow_pine(state: int) -> dict:
    rng = random.Random(1501)
    body, roof = PMesh(), PMesh()
    if state:
        cylinder(body, (0, 0), 2.8, 0, 14, BARK, rng, sides=8, ry=2.3)
        snowy_tiers(roof, ((8, 27, 18.0), (18, 38, 14.5), (29, 48, 11.0), (39, 57, 7.5), (48, 66, 4.2)), rng)
    else:
        cylinder(body, (0, 0), 2.8, 0, 5, BARK, rng, sides=8, ry=2.3, top=lambda r: hls(0.09, 0.4, 0.55))
        body.box(20, -2, 2.4, 34, 4.4, 4.4, -0.2, BARK(rng))
        for k, r in enumerate((13, 11, 9, 7, 5)):
            x, y = 12 + k * 8, -2 - k * 1.6
            lump(body, (x, y, 1.5), (r * 0.7, r, 3.6), NEEDLE, rng, n=6, jag=0.25, floor=0.4)
            lump(body, (x - 1, y - 1, 3.6), (r * 0.5, r * 0.7, 1.6), SNOW, rng, n=5, jag=0.25, floor=1.0)
        for _ in range(6):
            lump(body, (rng.uniform(4, 50), rng.uniform(-14, 10), 0.6), (rng.uniform(3, 6), rng.uniform(2, 4), 1.2), SNOW, rng, n=5, jag=0.2, floor=0.3)
    trunk_foot(body, 3.2)
    return {'body': body, 'roof': roof}


@structure('firSmall', [1, 0], foot='hull', hp=30, flattenable=True, cover=True)
def fir_small(state: int) -> dict:
    """A young fir bowed under its snow: a cover bush you can hide in, flattened by any tank."""
    rng = random.Random(1511)
    body, roof = PMesh(), PMesh()
    if state:
        snowy_tiers(roof, ((0, 14, 13.0), (7, 21, 10.0), (14, 28, 6.5), (21, 33, 3.4)), rng)
        for (x, y) in ((-12, 6), (11, 7), (3, 11)):
            lump(roof, (x, y, 1), (5, 3.4, 2.6), SNOW, rng, n=5, jag=0.2, floor=0.3)
    else:
        for k in range(7):
            a = rng.uniform(0, 2 * math.pi)
            bar(body, (0, 0, 0.8), (14 * math.cos(a), 9 * math.sin(a), 0.8), 1.4, BARK(rng))
        lump(body, (2, 0, 1), (13, 8, 3), NEEDLE, rng, n=6, jag=0.3, floor=0.3)
        for (x, y) in ((-6, 2), (6, -2), (10, 5)):
            lump(body, (x, y, 2.6), (6, 4, 1.6), SNOW, rng, n=5, jag=0.25, floor=1.0)
    body.solid_poly([(-13, -8), (13, -8), (13, 8), (-13, 8)])
    return {'body': body, 'roof': roof}


# --- log cabins (snowy gable roofs that fade) -----------------------------------------------------------------------------------

def log_wall(m: PMesh, a: tuple, b: tuple, top, rng: random.Random, holes=(), r: float = 3.6, overhang: float = 3.5,
             gone=None, solid: bool = True) -> None:
    """A wall of round logs from a to b, courses up to top(s); holes (s0, s1, z0, z1); logs cross past the corners."""
    ax, ay = a
    bx, by = b
    length = math.hypot(bx - ax, by - ay)
    ux, uy = (bx - ax) / length, (by - ay) / length
    hi = max(top(s) for s in np.linspace(0, length, 40))
    z = r / 2
    course = 0
    while z + r / 2 <= hi + 0.01:
        on = []
        for s in np.arange(0, length + 0.01, 1.0):
            ok = z + r / 2 <= top(s) + 0.01 and not any(h0 <= s <= h1 and z0 <= z <= z1 for h0, h1, z0, z1 in holes)
            if ok and gone and gone(course, s, z):
                ok = False
            on.append((s, ok))
        runs, start = [], None
        for s, ok in on:
            if ok and start is None:
                start = s
            if not ok and start is not None:
                runs.append((start, s - 1.0))
                start = None
        if start is not None:
            runs.append((start, length))
        for s0, s1 in runs:
            if s1 - s0 < 2:
                continue
            e0 = -overhang if s0 <= 0.5 else 0.0
            e1 = overhang if s1 >= length - 0.5 else 0.0
            col = (LOG if course % 2 else LOG_D)(rng)
            p = (ax + ux * (s0 + e0), ay + uy * (s0 + e0), z)
            q = (ax + ux * (s1 + e1), ay + uy * (s1 + e1), z)
            # A round log: an octagonal prism along the wall.
            for i in range(8):
                a0, a1 = 2 * math.pi * i / 8, 2 * math.pi * (i + 1) / 8
                o = lambda ang: (-uy * r / 2 * math.cos(ang), ux * r / 2 * math.cos(ang), r / 2 * math.sin(ang))  # noqa: E731
                m.face([tuple(np.add(p, o(a0))), tuple(np.add(q, o(a0))), tuple(np.add(q, o(a1))), tuple(np.add(p, o(a1)))], col, np.array([*((np.add(p, q)) / 2)[:2], z]))
            for end in ((p, e0), (q, e1)):
                if end[1]:
                    pt = end[0]
                    m.face([tuple(np.add(pt, (-uy * r / 2 * math.cos(2 * math.pi * i / 8), ux * r / 2 * math.cos(2 * math.pi * i / 8), r / 2 * math.sin(2 * math.pi * i / 8)))) for i in range(8)],
                           LOG_END(rng), np.array([*((np.add(p, q)) / 2)[:2], z]))
            if course == 0 and solid:
                m.solid_rect(a, b, s0, s1, r + 1)
        z += r * 0.86
        course += 1


def cabin(state: int, w: float, d: float, h: float, ridge: float, seed: int, porch: bool = False) -> dict:
    x0, x1, y0, y1 = -w / 2, w / 2, -d / 2, d / 2
    rng = random.Random(seed)
    body, roof = PMesh(), PMesh()
    door = (w * 0.6 - 5.5, w * 0.6 + 5.5, 0, 17)
    wins = [(w * 0.24, 7, 14)] + ([(w * 0.86, 7, 14)] if w > 80 else [])
    holes = [door] + [(s - 4.5, s + 4.5, z0, z1) for s, z0, z1 in wins]
    if state == 2:
        ts = tn = te = tw = lambda s: h  # noqa: E731
        gone = None
    elif state == 1:
        ts = lambda s: h - (7 if s > w - 16 else 0)  # noqa: E731
        tn = tw = lambda s: h  # noqa: E731
        te = lambda s: h - (6 if s > d - 18 else 0)  # noqa: E731
        gone = lambda c, s, z: c in (2, 3) and w * 0.38 < s < w * 0.38 + 6  # noqa: E731
    else:
        ts = lambda s: 0 if w * 0.3 < s < w * 0.78 else h * 0.45  # noqa: E731
        tn = lambda s: h * (0.8 - 0.4 * s / w)  # noqa: E731
        tw = lambda s: h * 0.6  # noqa: E731
        te = lambda s: h * 0.25  # noqa: E731
        gone = None
    log_wall(body, (x0, y1), (x1, y1), ts, rng, holes, gone=gone)
    log_wall(body, (x0, y0), (x1, y0), tn, rng)
    log_wall(body, (x0, y0), (x0, y1), tw, rng)
    log_wall(body, (x1, y0), (x1, y1), te, rng)
    for i, (s, z0, z1) in enumerate(wins):
        if ts(s) > z1 + 1:
            panel(body, (x0 + s, y1), 8, z0, z1, (LIT if i == 0 and state == 2 else GLASS)(rng), out=-0.3, d=1.0)
            panel(body, (x0 + s, y1), 10, z0 - 1.4, z0, PLANK(rng), out=2.2, d=1.4)
            lump(body, (x0 + s, y1 + 2.4, z0 + 0.3), (5, 1.4, 0.9), SNOW, rng, n=4)
            for sx in (-1, 1):
                panel(body, (x0 + s + sx * 6.5, y1), 3.4, z0, z1, hls(0.0, 0.45, 0.32), out=2.0)
    dx = x0 + (door[0] + door[1]) / 2
    if state:
        panel(body, (dx, y1), 10, 0, 17, PLANK(rng), out=-0.6, d=1.2)
        # A snowy step, a shovel against the wall and a stacked woodpile.
        body.box(dx, y1 + 4, 0.8, 14, 6, 1.6, 0, PLANK(rng))
        lump(body, (dx - 4, y1 + 5.5, 1.6), (4, 2, 0.8), SNOW, rng, n=4)
        bar(body, (dx + 8, y1 + 3, 0), (dx + 9, y1 + 2.2, 14), 0.9, PLANK(rng))
        body.box(dx + 9, y1 + 3.2, 1.2, 3.2, 1.0, 3, 0, STEEL(rng))
    body.floor(0, 0, 0.6, w - 8, d - 8, 1.0, 0, PLANK(rng))
    zr = h + ridge
    ch_top = {2: zr + 6, 1: zr - 2, 0: h * 0.5}[state]
    blocks(body, (x0 + 12 - 4, 0), (x0 + 12 + 4, 0), 8, lambda s: ch_top, rng, FIELDSTONE, bl=4, ch=3, solid=False, z_base=0)
    if state == 2:
        lump(body, (x0 + 12, 0, ch_top + 0.4), (4.4, 4.4, 1.2), SNOW, rng, n=4)
    if state == 2:
        keep = None
    elif state == 1:
        keep = holes_in([(w * 0.2, d * 0.2, 8), (-w * 0.22, -d * 0.12, 6)])
    else:
        keep = lambda x, y: x < -w * 0.2 + 8 * math.sin(y * 0.2) and (int(x * 3 + y) % 7 > 1)  # noqa: E731
    if state:
        # The roof: deep snow on shingles, a snow cornice along the south eave with icicles under it.
        snowy = lambda r: SNOW(r) if r.random() < 0.9 else SNOW_D(r)  # noqa: E731
        gable(roof, x0, x1, y0, y1, h, zr, rng, snowy, tile=5.0, rows=9, keep=keep, over=5.0)
        gable(roof, x0, x1, y0, y1, h - 1.6, zr - 1.6, rng, SHINGLE, tile=6.0, rows=4, keep=keep, over=5.4)
        gable_ends(body, x0, y0, y1, h, zr - 1, LOG_D(rng))
        gable_ends(body, x1, y0, y1, h, zr - 1, LOG_D(rng))
        for x in np.arange(x0 - 4, x1 + 5, 6):
            if keep is None or keep(x, y1):
                lump(roof, (x, y1 + 5.2, h + 0.6), (3.6, 1.6, 1.4), SNOW, rng, n=4)
        icicles(roof, (x0 - 3, y1 + 5.6), (x1 + 3, y1 + 5.6), h - 0.4, rng)
    if porch and state:
        # A lean-to woodshed on the east end: a pent roof on posts over stacked split logs.
        for y in (y0 + 6, y1 - 6):
            bar(body, (x1 + 18, y, 0), (x1 + 18, y, 12), 1.8, LOG_D(rng))
        for k in range(4):
            for j in range(6):
                body.box(x1 + 10, y0 + 8 + j * (d - 16) / 5.5, 2 + k * 3.2, 12, 3, 3, 0, LOG_END(rng))
        lean = PMesh()
        for k in range(8):
            yy = y0 + 2 + k * (d - 4) / 8
            lean.face([(x1 + 1, yy, h - 3), (x1 + 1, yy + (d - 4) / 8, h - 3), (x1 + 21, yy + (d - 4) / 8, 12), (x1 + 21, yy, 12)], SNOW(rng), np.array([x1 + 10, 0, 0]))
        roof.add(lean)
        body.solid_poly([(x1, y0 + 4), (x1 + 20, y0 + 4), (x1 + 20, y1 - 4), (x1, y1 - 4)])
    if state < 2:
        rubble(body, w * 0.15, y1 + 6, 20 if state == 0 else 8, 4, 30 if state == 0 else 8, random.Random(seed + state), LOG_END, 4)
        for _ in range(4 if state else 10):
            lump(body, (rng.uniform(x0, x1), y1 + rng.uniform(3, 9), 0.6), (rng.uniform(3, 5), 2, 1.0), SNOW, rng, n=4, floor=0.3)
    if state == 0:
        for k in range(9):
            body.box(rng.uniform(x0 + 6, x1 - 6), rng.uniform(y0 + 6, y1 - 6), 2 + k * 0.5, rng.uniform(18, 30), 3.6, 3.6, rng.uniform(-0.5, 0.5),
                     LOG(rng), (rng.uniform(-0.2, 0.2), 0))
        for _ in range(6):
            lump(body, (rng.uniform(x0 + 6, x1 - 6), rng.uniform(y0 + 6, y1 - 6), 4), (rng.uniform(6, 12), rng.uniform(4, 8), 2.4), SNOW, rng, n=5, jag=0.2, floor=1)
    return {'body': body, 'roof': roof}


@structure('cabinSmall', [2, 1, 0], foot='hull', hp=320)
def cabin_small(state: int) -> dict:
    return cabin(state, 62, 46, 19, 15, 1521)


@structure('cabinLarge', [2, 1, 0], foot='hull', hp=520)
def cabin_large(state: int) -> dict:
    return cabin(state, 100, 58, 21, 18, 1531, porch=True)


# --- snowdrifts: low cover, dug down 2 -> 1 -> 0 ----------------------------------------------------------------------------------

DRIFT = {'l': 96.0, 'd': 22.0, 'h': 14.0}


def snowdrift(state: int) -> dict:
    """A wind-packed drift 96 x 22, 14 high, a sharp wind crest to the north and a soft south face; dug into, then flattened."""
    m = PMesh()
    rng = random.Random(1541)
    L, D, H = DRIFT['l'], DRIFT['d'], DRIFT['h']
    nx, ny = 40, 12

    def height(x: float, y: float) -> float:
        fx = x / (L / 2 + 4)
        wide = max(0.0, 1 - fx ** 6)
        if wide <= 0.01:
            return 0.0
        crest = -2.5 + 1.6 * math.sin(x * 0.09 + 0.4)
        c = y - crest
        prof = max(0.0, 1 + c / (D * 0.38)) ** 0.7 if c < 0 else max(0.0, 1 - c / (D * 0.62)) ** 1.3
        hgt = H * (0.85 + 0.15 * math.sin(x * 0.17)) * prof * wide ** 0.5
        if state == 1:
            # A shovelled notch across the middle, a bite out of the west end.
            hgt *= 1 - 0.65 * math.exp(-((x - 6) / 9) ** 2)
            hgt *= 1 - 0.4 * math.exp(-((x + 34) / 8) ** 2)
        if state == 0:
            # Dug out: knee-high heaps left at the ends and a few clods between.
            hgt = hgt * (0.55 if abs(x) > 30 else 0.18 * max(0.0, math.sin(x * 0.35 + 1.0)))
        return max(0.0, hgt)
    xs = np.linspace(-L / 2 - 4, L / 2 + 4, nx + 1)
    ys = np.linspace(-D / 2 - 2, D / 2 + 4, ny + 1)
    for i in range(nx):
        for j in range(ny):
            pts = [(xs[i], ys[j]), (xs[i + 1], ys[j]), (xs[i + 1], ys[j + 1]), (xs[i], ys[j + 1])]
            zs = [height(x, y) for x, y in pts]
            if max(zs) < 0.3:
                continue
            q = [(x, y, max(z, 0.05)) for (x, y), z in zip(pts, zs)]
            col = SNOW(rng)
            m.face([q[0], q[1], q[2]], col, np.array([q[0][0], q[0][1], -30]))
            m.face([q[0], q[2], q[3]], col, np.array([q[0][0], q[0][1], -30]))
    if state < 2:
        # Thrown-out snow: clods south of the dig.
        for _ in range(8 if state else 16):
            lump(m, (rng.uniform(-30, 30), rng.uniform(D / 2 + 2, D / 2 + 12), 0.8), (rng.uniform(2.5, 4.5), rng.uniform(1.8, 3), 1.5), SNOW, rng, n=4, jag=0.2, floor=0.3)
    if state:
        m.solid_poly([(-L / 2, -D / 2 + 3), (L / 2, -D / 2 + 3), (L / 2, D / 2 - 3), (-L / 2, D / 2 - 3)])
    return {'body': m}


structure('snowdriftH', [2, 1, 0], foot='runs', hp=120)(snowdrift)
structure('snowdriftV', [2, 1, 0], foot='runs', hp=120)(turned(snowdrift))


# --- ice rocks: granite boulders under snow, with ice ---------------------------------------------------------------------------

def ice_rock(seed: int, size: float) -> dict:
    m = PMesh()
    rng = random.Random(seed)
    tops = []
    for k in range(3):
        c = (rng.uniform(-size * 0.4, size * 0.4), rng.uniform(-size * 0.2, size * 0.2), size * 0.15)
        r = rng.uniform(0.5, 0.75) * size
        lump(m, c, (r, r * 0.75, r * 0.62), GRANITE if k % 2 else GRANITE_D, rng, n=5, jag=0.2, floor=0.0)
        tops.append((c, r))
    for (cx, cy, cz), r in tops:
        lump(m, (cx - r * 0.1, cy - r * 0.08, cz + r * 0.45), (r * 0.72, r * 0.52, r * 0.24), SNOW, rng, n=5, jag=0.15)
    # Ice: a few pale blue shards and a glassy crust down the north side.
    for _ in range(int(size / 5)):
        a = rng.uniform(math.pi * 1.1, math.pi * 1.9)
        x, y = size * 0.7 * math.cos(a), size * 0.5 * math.sin(a)
        bar(m, (x, y, 0), (x * 1.15, y * 1.15, rng.uniform(4, size * 0.45)), rng.uniform(1.6, 2.6), ICE(rng))
    for _ in range(3):
        lump(m, (rng.uniform(-size, size), size * 0.55 + rng.uniform(0, 3), 0.5), (rng.uniform(3, 6), 2.4, 1.0), SNOW, rng, n=4, floor=0.2)
    pts = [(p[0], p[1]) for t in m.tris for p in t if p[2] < 1.0]
    m.solid_poly(pts)
    return {'body': m}


structure('iceRockA', [1], foot='hull', hp=0)(lambda s: ice_rock(1551, 13))
structure('iceRockB', [1], foot='hull', hp=0)(lambda s: ice_rock(1552, 20))
structure('iceRockC', [1], foot='hull', hp=0)(lambda s: ice_rock(1553, 30))


# --- the ridge: granite cliff, snow on every ledge (east-west run, north-south run, corner) --------------------------------------

RIDGE_BEDS = [(0, 8, 0.0), (8, 15, 2.5), (15, 24, 4.0), (24, 32, 5.5), (32, 38, 6.5), (38, 42, 8.0)]


def ridge_dressing(m: PMesh, rng: random.Random, xr: tuple, yr: tuple, foot) -> None:
    """Snow drifted on the top, a stunted fir or two, scree and snow at the foot."""
    for _ in range(8):
        lump(m, (rng.uniform(*xr), rng.uniform(*yr), 42.8), (rng.uniform(5, 9), rng.uniform(4, 6), 1.6), SNOW, rng, n=5, jag=0.15)
    for _ in range(2):
        x, y = rng.uniform(*xr), rng.uniform(*yr)
        cone(m, 5, 42, 53, NEEDLE, rng, sides=10, cx=x, cy=y)
        cone(m, 3.6, 46, 54, SNOW, rng, sides=10, cx=x, cy=y)
    for (x, y) in foot:
        lump(m, (x, y, 1.0), (rng.uniform(2, 4),) * 2 + (2.0,), GRANITE_D, rng, n=5, jag=0.25, floor=0)
        lump(m, (x + rng.uniform(-3, 3), y + 1.5, 0.6), (rng.uniform(3, 5), 2.2, 1.2), SNOW, rng, n=4, floor=0.2)


@structure('ridgeEdge', [1], foot='hull', hp=0)
def ridge_edge(state: int) -> dict:
    """A 128 px run of granite cliff, its face to the south, snow on every ledge: straight east and west ends so runs join."""
    rng = random.Random(1561)
    m = PMesh()
    L, D = 128.0, 44.0
    for k, (z0, z1, inset) in enumerate(RIDGE_BEDS):
        r2 = random.Random(1561 + k)
        south = [(x, D / 2 - inset + r2.uniform(-2.2, 2.2) * (0 < i < 16)) for i, x in enumerate(np.linspace(-L / 2, L / 2, 17))]
        outline = [(-L / 2, -D / 2), (L / 2, -D / 2)] + list(reversed(south))
        m.prism(outline, z0, z1, (GRANITE if k % 2 else GRANITE_D)(rng), SNOW(rng))
    ridge_dressing(m, rng, (-L / 2 + 8, L / 2 - 8), (-D / 2 + 4, D / 2 - 14), [(rng.uniform(-L / 2 + 4, L / 2 - 4), D / 2 + rng.uniform(1, 5)) for _ in range(9)])
    m.solid_poly([(-L / 2, -D / 2), (L / 2, -D / 2), (L / 2, D / 2), (-L / 2, D / 2)])
    return {'body': m}


@structure('ridgeEdgeV', [1], foot='hull', hp=0)
def ridge_edge_v(state: int) -> dict:
    """A 128 px north-south run, terraced on both long sides."""
    rng = random.Random(1571)
    m = PMesh()
    L, W = 128.0, 44.0
    for k, (z0, z1, inset) in enumerate(RIDGE_BEDS):
        r2 = random.Random(1571 + k)
        ys = np.linspace(-L / 2, L / 2, 17)
        west = [(-W / 2 + inset * 0.8 + r2.uniform(-2.0, 2.0) * (0 < i < 16), y) for i, y in enumerate(ys)]
        east = [(W / 2 - inset * 0.8 + r2.uniform(-2.0, 2.0) * (0 < i < 16), y) for i, y in enumerate(ys)]
        m.prism(west + list(reversed(east)), z0, z1, (GRANITE if k % 2 else GRANITE_D)(rng), SNOW(rng))
    ridge_dressing(m, rng, (-W / 2 + 10, W / 2 - 10), (-L / 2 + 8, L / 2 - 8),
                   [(rng.choice((-1, 1)) * (W / 2 + rng.uniform(1, 4)), rng.uniform(-L / 2 + 6, L / 2 - 6)) for _ in range(8)])
    m.solid_poly([(-W / 2, -L / 2), (W / 2, -L / 2), (W / 2, L / 2), (-W / 2, L / 2)])
    return {'body': m}


@structure('ridgeCorner', [1], foot='hull', hp=0)
def ridge_corner(state: int) -> dict:
    """A 44 x 44 block terraced on every side: closes a corner between an east-west and a north-south run, or caps an end."""
    rng = random.Random(1581)
    m = PMesh()
    S = 44.0
    sq = [(-S / 2 + S * t, -S / 2) for t in np.linspace(0, 1, 5)[:-1]] + [(S / 2, -S / 2 + S * t) for t in np.linspace(0, 1, 5)[:-1]] + \
         [(S / 2 - S * t, S / 2) for t in np.linspace(0, 1, 5)[:-1]] + [(-S / 2, S / 2 - S * t) for t in np.linspace(0, 1, 5)[:-1]]
    for k, (z0, z1, s) in enumerate([(0, 8, 1.0), (8, 15, 0.92), (15, 24, 0.86), (24, 32, 0.8), (32, 38, 0.75), (38, 42, 0.7)]):
        r2 = random.Random(1581 + k)
        poly = [(x * s * (1 + r2.uniform(-0.05, 0.05)), y * s * (1 + r2.uniform(-0.05, 0.05))) for x, y in sq]
        m.prism(poly, z0, z1, (GRANITE if k % 2 else GRANITE_D)(rng), SNOW(rng))
    lump(m, (3, -3, 42.8), (8, 6, 1.6), SNOW, rng, n=5, jag=0.15)
    for (x, y) in ((-10, S / 2 + 2), (12, S / 2 + 3), (S / 2 + 2, 6)):
        lump(m, (x, y, 0.6), (4, 2.4, 1.2), SNOW, rng, n=4, floor=0.2)
    m.solid_poly([(-S / 2, -S / 2), (S / 2, -S / 2), (S / 2, S / 2), (-S / 2, S / 2)])
    return {'body': m}


# --- the frozen fence (low cover, flattenable) ------------------------------------------------------------------------------------

def frozen_fence(state: int) -> dict:
    m = PMesh()
    rng = random.Random(1591 + state)
    length, h = 64.0, 13.0
    for i in range(5):
        s = -length / 2 + i * 16
        if state:
            m.box(s, 0, h / 2 + 1, 2.6, 2.6, h + 2, 0, LOG_D(rng))
            lump(m, (s, 0, h + 2.2), (2.2, 2.0, 1.2), SNOW, rng, n=4)
        else:
            m.box(s, 3, 1.2, 2.6, h, 2.4, 0, LOG_D(rng))
    for z in (5.0, 11.0):
        if state:
            m.box(0, 0.8, z, length, 1.4, 2.2, 0, PLANK(rng))
            for x in np.arange(-length / 2 + 4, length / 2, 8):
                lump(m, (x + rng.uniform(-1, 1), 0.8, z + 1.3), (4.4, 1.2, 0.8), SNOW, rng, n=4)
            icicles(m, (-length / 2 + 2, 1.8), (length / 2 - 2, 1.8), z - 1.0, rng, every=4.0, length=(1.5, 3.5))
        else:
            for k in range(4):
                m.box(-length / 2 + 8 + k * 16, 3 + rng.uniform(-3, 3), 0.8, 15, 1.4, 1.2, rng.uniform(-0.3, 0.3), PLANK(rng))
    # Snow banked along the foot, deeper to the north (the wind side).
    for x in np.arange(-length / 2, length / 2 + 1, 10):
        lump(m, (x + rng.uniform(-2, 2), -2.5, 0.5), (6, 3, 2.6 if state else 1.4), SNOW, rng, n=4, jag=0.2, floor=0.2)
    m.solid_poly([(-length / 2, -1.5), (length / 2, -1.5), (length / 2, 1.5), (-length / 2, 1.5)])
    return {'body': m}


structure('frozenFenceH', [1, 0], foot='runs', hp=40, flattenable=True)(frozen_fence)
structure('frozenFenceV', [1, 0], foot='runs', hp=40, flattenable=True)(turned(frozen_fence))


# --- the Laser Lab: generator (Raid target, level 33) and the research building ---------------------------------------------------

@structure('generator', [2, 1, 0], foot='hull', hp=400)
def generator(state: int) -> dict:
    """A power generator on a concrete plinth: a finned steel housing, a glowing cyan coil between two porcelain insulator
    stacks, cable drums and thick cables running off north, hazard stripes, snow on the roof. Raid target."""
    rng = random.Random(1601)
    m = PMesh()
    m.box(0, 0, 1.5, 60, 46, 3, 0, CONCRETE(rng))
    for x in (-30, 30):
        for y in np.arange(-22, 23, 6):
            m.box(x, y, 3.2, 1.2, 4, 0.5, 0, HAZARD(rng) if int((y + 22) / 6) % 2 else BLACK(rng))
    if state == 0:
        # Blown open: the housing burst, fins and panels strewn, the coil split and dark, soot and snow melt.
        lump(m, (0, 2, 3.2), (26, 18, 0.5), SOOT, rng, n=7, floor=3.1)
        for k in range(8):
            a = rng.uniform(0, 2 * math.pi)
            m.box(math.cos(a) * 14, math.sin(a) * 12, 5, rng.uniform(6, 12), rng.uniform(4, 8), rng.uniform(3, 7), a, (SOOT if k % 2 else STEEL_D)(rng),
                  (rng.uniform(-0.6, 0.6), rng.uniform(-0.4, 0.4)))
        cylinder(m, (14, -4), 6, 3, 9, lambda q: hls(0.5, 0.2, 0.25), rng, sides=12)
        bar(m, (-16, -10, 4), (-24, 6, 4), 4, PORCELAIN(rng))
        rubble(m, 0, 4, 22, 14, 40, rng, CONCRETE_D, 4)
        rubble(m, 4, 22, 20, 6, 16, random.Random(5), STEEL_D, 3)
    else:
        # The housing: a steel box with cooling fins down its sides, a vented roof.
        m.box(-6, 0, 3 + 11, 30, 28, 22, 0, PANEL(rng))
        for y in np.arange(-12, 13, 3):
            for sx in (-1, 1):
                if state == 1 and sx > 0 and -4 < y < 5:
                    continue
                m.box(-6 + sx * 16.2, y, 13, 2.4, 1.0, 18, 0, STEEL_D(rng))
        for k in range(2):
            cylinder(m, (-12 + k * 12, -4), 4.2, 25, 26.5, STEEL_D, rng, sides=12, top=lambda q: hls(0.6, 0.05, 0.16))
            for i in range(4):
                a = math.pi / 4 * i
                m.box(-12 + k * 12, -4, 26.8, 7.6, 0.8, 0.4, a, STEEL(rng))
        snow_cap(m, -20, 8, -13, 13, 25.2, rng, depth=1.4)
        panel(m, (-6, 14), 10, 6, 14, HAZARD(rng), out=0.4)
        panel(m, (-6, 14), 6, 8, 12, BLACK(rng), out=0.6)
        # The coil: a tall cylinder banded in copper rings, cyan light between them, insulators either side.
        cyl_col = GLOW if state == 2 else (lambda q: hls(0.5, 0.4, 0.35))
        cylinder(m, (18, -2), 5.5, 3, 26, cyl_col, rng, sides=14)
        for z in np.arange(5, 26, 3.2):
            cylinder(m, (18, -2), 6.3, z, z + 1.4, lambda q: hls(0.07, 0.6, 0.45), rng, sides=14)
        cylinder(m, (18, -2), 7, 26, 28, STEEL_D, rng, sides=14)
        lump(m, (18, -2, 30), (4.6, 4.6, 3.4), cyl_col, rng, n=6)
        for (x, y) in ((18, -16), (18, 12)):
            n = 7 if not (state == 1 and y > 0) else 3
            for k in range(n):
                cylinder(m, (x, y), 3.4 if k % 2 else 2.4, 3 + k * 3, 6 + k * 3, PORCELAIN, rng, sides=10)
            if n == 7:
                bar(m, (x, y, 24), (18, -2, 26), 0.8, STEEL_D(rng))
        if state == 1:
            lump(m, (24, 14, 3.4), (5, 3, 1.4), PORCELAIN, rng, n=5, jag=0.3, floor=3.2)
            for (x, z) in ((-14, 10), (2, 18)):
                m.box(x, 14.2, z, 4, 1, 3, 0, SOOT(rng))
            lump(m, (8, 18, 3.3), (10, 5, 0.3), SOOT, rng, n=5, floor=3.2)
    # Cable drums and cables running off north (to the lab).
    if state:
        for (x, y) in ((-22, -18), (-12, -19)):
            cylinder(m, (x, y), 4, 3, 7, STEEL_D, rng, sides=12, top=lambda q: hls(0.08, 0.5, 0.35))
    for x in (-4, 2, 8):
        bar(m, (x, -14, 3.6), (x + 2, -30, 0.8), 1.8, BLACK(rng))
    m.solid_poly([(-28, -21), (28, -21), (28, 21), (-28, 21)])
    return {'body': m}


LAB = {'w': 152.0, 'd': 92.0, 'h': 30.0}


@structure('labBuilding', [2, 1, 0], foot='hull', hp=800)
def lab_building(state: int) -> dict:
    """The Laser Lab: a long concrete research block, a ribbon of lit windows on the south face, a hangar door at its
    east end, a flat roof (fades) under snow with vents, a rooftop dish and a cyan beacon."""
    rng = random.Random(1611)
    body, roof = PMesh(), PMesh()
    w, d, h = LAB['w'], LAB['d'], LAB['h']
    x0, x1, y0, y1 = -w / 2, w / 2, -d / 2, d / 2
    t = 5.0
    door = (w - 46, w - 8, 0, 24)
    wins = [(s, 12, 20) for s in np.arange(10, w - 54, 13)]
    holes = [door] + [(s - 4.5, s + 4.5, z0, z1) for s, z0, z1 in wins] + [(30, 40, 0, 16)]
    if state == 2:
        ts = tn = te = tw = lambda s: h  # noqa: E731
        gone = None
    elif state == 1:
        ts = lambda s: h - (8 if 60 < s < 84 else 0)  # noqa: E731
        tn = tw = lambda s: h  # noqa: E731
        te = lambda s: h - (6 if s > d - 26 else 0)  # noqa: E731
        gone = lambda c, s, z: abs(s - 72 - (z - 14) * 0.5) < 3 and 4 < z < 24  # noqa: E731
    else:
        ts = lambda s: 0 if 40 < s < 110 else h * (0.4 + 0.2 * math.sin(s * 0.2))  # noqa: E731
        tn = lambda s: h * (0.9 - 0.5 * s / w)  # noqa: E731
        tw = lambda s: h * 0.7  # noqa: E731
        te = lambda s: h * 0.3  # noqa: E731
        gone = None
    for (a, b, top, hl) in (((x0, y1), (x1, y1), ts, holes), ((x0, y0), (x1, y0), tn, []), ((x0, y0 + t), (x0, y1 - t), tw, []),
                            ((x1, y0 + t), (x1, y1 - t), te, [])):
        blocks(body, a, b, t, top, rng, CONCRETE, bl=16, ch=6, holes=hl, gone=gone)
    for i, (s, z0, z1) in enumerate(wins):
        if ts(s) > z1 + 1:
            panel(body, (x0 + s, y1), 9, z0, z1, (GLOW if (i % 3 != 1 and state == 2) else GLASS)(rng), out=-0.6, d=1.0)
            panel(body, (x0 + s, y1), 11, z0 - 1.2, z0, CONCRETE_D(rng), out=t / 2 + 0.6)
            lump(body, (x0 + s, y1 + 3.2, z0 + 0.2), (5, 1.4, 0.8), SNOW, rng, n=4)
    # A dark band at the base and a cyan stripe under the eaves.
    for s0 in np.arange(0, w, 16):
        if ts(s0 + 8) >= h:
            panel(body, (x0 + s0 + 8, y1), 16, h - 4, h - 2.5, (GLOW(rng) if state == 2 else hls(0.5, 0.3, 0.3)), out=t / 2 + 0.3)
    # The personnel door under a canopy, the hangar door (shut, ribbed) at the east end.
    if state:
        panel(body, (x0 + 35, y1), 9, 0, 16, STEEL_D(rng), out=-0.4)
        body.box(x0 + 35, y1 + 5, 17, 16, 8, 1.4, 0, CONCRETE_D(rng))
        lump(body, (x0 + 35, y1 + 5, 17.8), (8, 4, 1.0), SNOW, rng, n=4)
        dx = x0 + (door[0] + door[1]) / 2
        panel(body, (dx, y1), door[1] - door[0], 0.5, door[3], PANEL(rng), out=0.6, d=1.6)
        for z in np.arange(3, door[3], 3):
            panel(body, (dx, y1), door[1] - door[0], z - 0.4, z + 0.4, STEEL_D(rng), out=1.6)
        for x in np.arange(door[0] + 2, door[1], 6):
            panel(body, (x0 + x, y1), 2.4, 0.5, 2.4, HAZARD(rng), out=2.0)
        panel(body, (dx, y1), door[1] - door[0] + 6, door[3], door[3] + 3, CONCRETE_D(rng), out=1.4)
    body.floor(0, 0, 0.6, w - 2 * t, d - 2 * t, 1.0, 0, CONCRETE_D(rng))
    # Inside (shows when the roof fades): benches, a lab rig with a cyan core, crates.
    for k in range(3):
        body.box(x0 + 30 + k * 30, y0 + 22, 5, 22, 8, 8, 0, PANEL(rng))
    cylinder(body, (x1 - 36, -6), 10, 1, 14, STEEL_D, rng, sides=16, top=GLOW if state else None)
    for k in range(4):
        body.box(x0 + 16 + k * 9, y1 - 18, 4, 7, 7, 7, 0.1 * k, PLANK(rng))
    if state == 2:
        keep = None
    elif state == 1:
        keep = holes_in([(w * 0.08, d * 0.1, 14), (-w * 0.25, -d * 0.2, 9)])
    else:
        keep = lambda x, y: x < -w * 0.22 + 8 * math.sin(y * 0.15) and (int(x * 3 + y) % 6 > 1)  # noqa: E731
    step = 8.0
    for yy in np.arange(y0, y1, step):
        for xx in np.arange(x0, x1, step):
            cx, cy = xx + step / 2, yy + step / 2
            if keep is None or keep(cx, cy):
                roof.box(cx, cy, h + 0.8, step, step, 1.6, 0, (SNOW if rng.random() < 0.88 else SNOW_D)(rng))
    if state:
        # A low parapet with snow, two big vents, a dish on a stand, a cyan beacon.
        for (x, y) in ((-40, -16), (-14, -18)):
            if keep is None or keep(x, y):
                roof.box(x, y, h + 4, 14, 10, 6, 0, STEEL_D(rng))
                for k in range(4):
                    roof.box(x, y - 3.6 + k * 2.4, h + 7.2, 12, 1.0, 0.6, 0, STEEL(rng))
                lump(roof, (x, y, h + 7.6), (7, 5, 1.2), SNOW, rng, n=4)
        if keep is None or keep(36, -10):
            roof.box(36, -10, h + 4, 8, 8, 6, 0, STEEL_D(rng))
            dish = PMesh()
            for i in range(14):
                a0, a1 = 2 * math.pi * i / 14, 2 * math.pi * (i + 1) / 14
                for r0, r1 in ((0, 7), (7, 14)):
                    dish.face([(r0 * math.cos(a0), r0 * math.sin(a0), 0.05 * r0 * r0), (r1 * math.cos(a0), r1 * math.sin(a0), 0.05 * r1 * r1),
                               (r1 * math.cos(a1), r1 * math.sin(a1), 0.05 * r1 * r1), (r0 * math.cos(a1), r0 * math.sin(a1), 0.05 * r0 * r0)],
                              WHITE(rng), np.array([0, 0, 20]))
            bar(dish, (0, 0, 0), (0, 0, 9), 0.8, STEEL_D(rng))

            def aim(p):
                x, y, z = p
                tilt = 0.8
                y, z = y * math.cos(tilt) + z * math.sin(tilt), -y * math.sin(tilt) + z * math.cos(tilt)
                return np.array([x + 36, y - 10, z + h + 10])
            roof.add(transformed(dish, aim))
        cylinder(roof, (x1 - 12, y0 + 12), 2.2, h, h + 12, STEEL_D, rng, sides=8)
        lump(roof, (x1 - 12, y0 + 12, h + 13), (2.6, 2.6, 2.6), GLOW if state == 2 else RED, rng, n=5)
    if state < 2:
        rubble(body, 0, y1 + 7, 30 if state == 0 else 12, 5, 50 if state == 0 else 14, random.Random(state + 3), CONCRETE, 5)
    if state == 0:
        rubble(body, -10, 0, w * 0.32, d * 0.3, 70, random.Random(9), CONCRETE_D, 5)
        lump(body, (6, 6, 2), (30, 18, 1.4), SOOT, rng, n=6, floor=1.2)
    return {'body': body, 'roof': roof}


# --- the signal mast (level 38's relay) ------------------------------------------------------------------------------------------

def signal_mast_mesh(state: int, rng: random.Random) -> PMesh:
    m = PMesh()
    hgt = 96.0
    legs = [(math.cos(a), math.sin(a)) for a in (math.pi / 2, math.pi / 2 + 2 * math.pi / 3, math.pi / 2 + 4 * math.pi / 3)]
    base, top_r = 12.0, 4.0
    at = lambda lx, ly, z: (lx * (base - (base - top_r) * z / hgt), ly * (base - (base - top_r) * z / hgt), z)  # noqa: E731
    red, white = hls(0.0, 0.62, 0.45), hls(0.1, 0.1, 0.86)
    for lx, ly in legs:
        bar(m, at(lx, ly, 0), at(lx, ly, hgt), 1.8, STEEL(rng))
    levels = np.linspace(0, hgt, 11)
    for k, (z0, z1) in enumerate(zip(levels, levels[1:])):
        c = red if k % 2 else white
        for i in range(3):
            if state == 1 and k == 5 and i == 0:
                continue
            (ax, ay), (bx, by) = legs[i], legs[(i + 1) % 3]
            bar(m, at(ax, ay, z1), at(bx, by, z1), 1.0, c)
            bar(m, at(ax, ay, z0), at(bx, by, z1), 0.7, c)
        # Ice on the struts low down.
        if k < 4 and state:
            lump(m, at(legs[k % 3][0], legs[k % 3][1], z1), (1.6, 1.6, 1.0), SNOW, rng, n=4)
    # Antennas: two horn panels on the sides, whips on top, a red light.
    for a in (0.2, math.pi - 0.2):
        m.box(7 * math.cos(a), 7 * math.sin(a), hgt * 0.72, 5, 3, 12, a + math.pi / 2, WHITE(rng))
    m.box(0, 0, hgt + 1, 10, 10, 1.4, 0, STEEL_D(rng))
    for (x, y, l) in ((0, 0, 22), (3, 2, 14), (-3, 1, 12)):
        bar(m, (x, y, hgt + 1.4), (x, y, hgt + l), 0.7, STEEL(rng))
    lump(m, (0, 0, hgt + 23), (1.6, 1.6, 1.6), RED, rng, n=5)
    if state and not state == 0:
        # Guy wires to the ground, south pair and north one.
        for (gx, gy) in ((26, 20), (-26, 20), (0, -30)):
            bar(m, at(0, 0, hgt * 0.6), (gx, gy, 0.4), 0.4, STEEL_D(rng))
    return m


@structure('signalMast', [2, 1, 0], foot='hull', hp=300)
def signal_mast(state: int) -> dict:
    rng = random.Random(1621)
    m = PMesh()
    m.box(0, 0, 1, 30, 30, 2, 0, CONCRETE(rng))
    if state == 0:
        mast = signal_mast_mesh(1, rng)
        th = math.radians(86)

        def fall(p):
            x, z = p[0] - 9, p[2]
            return np.array([9 + x * math.cos(th) + z * math.sin(th), p[1] + 0.05 * z, max(0.6, -x * math.sin(th) + z * math.cos(th) + 2)])
        m.add(transformed(mast, fall))
        rubble(m, 4, 4, 12, 8, 18, rng, STEEL, 3)
    else:
        m.add(signal_mast_mesh(state, rng))
    # The equipment hut: steel, snow on its roof, a warm lit window, a heater flue.
    hut = PMesh()
    hut.box(-26, 12, 8, 18, 14, 16, 0, PANEL(rng))
    panel(hut, (-26, 19), 6, 0, 12, STEEL_D(rng), out=0.6)
    panel(hut, (-20, 19), 4, 8, 12, (LIT if state else GLASS)(rng), out=0.6)
    snow_cap(hut, -35, -17, 5, 19, 16, rng, depth=1.4)
    cylinder(hut, (-31, 8), 1.2, 16, 22, STEEL_D, rng, sides=6)
    m.add(hut)
    m.solid_poly([(-12, -12), (12, -12), (12, 12), (-12, 12)])
    m.solid_poly([(-35, 5), (-17, 5), (-17, 19), (-35, 19)])
    return {'body': m}


# --- rail track in snow (ground layer) and the railway signal box ----------------------------------------------------------------

def snow_track(state: int) -> dict:
    """A 64 px east-west run of track, its ballast under snow, sleepers peeking out, the rails swept dark; ends straight so runs join."""
    m = PMesh()
    rng = random.Random(1631)
    l = 64.0
    for s in np.arange(-l / 2 + 4, l / 2, 8):
        m.box(s, 0, 0.8, 4, 22, 1.4, 0, LOG_D(rng))
    for o in (-7, 7):
        m.box(0, o, 2.3, l, 1.8, 1.6, 0, STEEL(rng))
        m.box(0, o, 3.2, l, 0.8, 0.2, 0, hls(0.6, 0.06, 0.62))
    # Snow over the ballast: a soft sheet between and beside the rails, thin at the edges, the sleepers showing through in places.
    nx, ny = 32, 14
    xs = np.linspace(-l / 2, l / 2, nx + 1)
    ys = np.linspace(-14, 14, ny + 1)

    def depth(x: float, y: float) -> float:
        edge = max(0.0, 1 - (abs(y) / 14) ** 4)
        wave = 0.55 * math.sin(x * 0.31 + y * 0.2) + 0.35 * math.sin(x * 0.13 - y * 0.45 + 1.0)
        return max(0.0, (1.5 + wave) * edge)
    for i in range(nx):
        for j in range(ny):
            pts = [(xs[i], ys[j]), (xs[i + 1], ys[j]), (xs[i + 1], ys[j + 1]), (xs[i], ys[j + 1])]
            q = [(x, y, depth(x, y)) for x, y in pts]
            if max(p[2] for p in q) < 0.2:
                continue
            col = SNOW(rng)
            m.face([q[0], q[1], q[2]], col, np.array([q[0][0], q[0][1], -30]))
            m.face([q[0], q[2], q[3]], col, np.array([q[0][0], q[0][1], -30]))
    return {'body': m}


structure('railSnowH', [1], foot='runs', hp=0)(snow_track)
structure('railSnowV', [1], foot='runs', hp=0)(turned(snow_track))


@structure('signalBox', [2, 1, 0], foot='hull', hp=260)
def signal_box(state: int) -> dict:
    """A railway signal box: a brick lower floor, a timber upper floor glazed all round, a snowy hipped roof (fades), an outside
    stair, and a semaphore signal post beside it, its red arm raised."""
    rng = random.Random(1641)
    body, roof = PMesh(), PMesh()
    w, d = 48.0, 34.0
    x0, x1, y0, y1 = -w / 2, w / 2, -d / 2, d / 2
    h0, h1 = 16.0, 30.0
    if state == 2:
        top = lambda s: h0  # noqa: E731
    elif state == 1:
        top = lambda s: h0 - (5 if s > w - 12 else 0)  # noqa: E731
    else:
        top = lambda s: h0 * (0.4 + 0.3 * math.sin(s * 0.3))  # noqa: E731
    for (a, b) in (((x0, y1), (x1, y1)), ((x0, y0), (x1, y0)), ((x0, y0 + 3), (x0, y1 - 3)), ((x1, y0 + 3), (x1, y1 - 3))):
        blocks(body, a, b, 3, top, rng, BRICK, bl=6, ch=3, holes=[(w * 0.3 - 4, w * 0.3 + 4, 0, 12)] if a == (x0, y1) else [])
    body.floor(0, 0, 0.6, w - 6, d - 6, 1.0, 0, PLANK(rng))
    if state:
        # The upper floor: a plank floor, corner posts, glazing bars, windows all round (lit in front).
        body.box(0, 0, h0 + 0.8, w + 2, d + 2, 1.6, 0, PLANK(rng))
        for (cx, cy) in ((x0, y1), (x1, y1), (x0, y0), (x1, y0)):
            if state == 1 and (cx, cy) == (x1, y1):
                continue
            body.box(cx, cy, (h0 + h1) / 2, 2.4, 2.4, h1 - h0, 0, PLANK(rng))
        for s in np.arange(x0 + 5, x1 - 2, 6.5):
            panel(body, (s, y1), 5.4, h0 + 4, h1 - 2, (LIT if state == 2 else GLASS)(rng), out=-0.2, d=1.0)
            panel(body, (s + 3.2, y1), 1.0, h0 + 4, h1 - 2, WHITE(rng), out=0.3)
        panel(body, (0, y1), w, h0 + 1.6, h0 + 4, PLANK(rng), out=0.4)
        for (a, b) in (((x0, y0), (x1, y0)), ((x0, y0), (x0, y1)), ((x1, y0), (x1, y1))):
            body.box((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, h0 + 3, abs(b[0] - a[0]) + 2, abs(b[1] - a[1]) + 2 if a[0] == b[0] else 2, 4, 0, PLANK(rng))
        icicles(body, (x0, y1 + 1.4), (x1, y1 + 1.4), h0 + 1.6, rng, every=3, length=(1.5, 4))
        # The outside stair up the east side.
        for k in range(8):
            body.box(x1 + 4, y1 - 2 - k * 3.4, 1.5 + k * 2, 6, 3, 1, 0, PLANK(rng))
        bar(body, (x1 + 7, y1, 4), (x1 + 7, y1 - 27, h0 + 3), 0.8, PLANK(rng))
        # The hipped roof under snow.
        zr = h1 + 8
        n = 8
        for k in range(n):
            f0, f1 = k / n, (k + 1) / n
            for side in range(4):
                cs = [(x0 - 3, y0 - 3), (x1 + 3, y0 - 3), (x1 + 3, y1 + 3), (x0 - 3, y1 + 3)]
                a, b = cs[side], cs[(side + 1) % 4]
                inner = lambda p, f: (p[0] * (1 - f * 0.86), p[1] * (1 - f), h1 + (zr - h1) * f)  # noqa: E731
                for j in range(4):
                    g0, g1 = j / 4, (j + 1) / 4
                    pa = (a[0] + (b[0] - a[0]) * g0, a[1] + (b[1] - a[1]) * g0)
                    pb = (a[0] + (b[0] - a[0]) * g1, a[1] + (b[1] - a[1]) * g1)
                    if state == 1 and side == 2 and j == 1 and k in (2, 3):
                        continue
                    roof.face([inner(pa, f0), inner(pb, f0), inner(pb, f1), inner(pa, f1)], (SNOW if k > 0 else SHINGLE)(rng), np.array([0, 0, h1 - 5]))
        cylinder(roof, (x0 + 10, y0 + 8), 2.4, h1, zr + 3, BRICK, rng, sides=8)
        icicles(roof, (x0 - 3, y1 + 3.2), (x1 + 3, y1 + 3.2), h1 - 0.2, rng)
    else:
        rubble(body, 0, 0, w * 0.4, d * 0.4, 60, random.Random(4), PLANK, 4)
        rubble(body, 4, y1 + 6, 16, 4, 20, random.Random(5), BRICK, 3)
        for _ in range(5):
            lump(body, (rng.uniform(x0, x1), rng.uniform(y0, y1), 3), (rng.uniform(5, 9), rng.uniform(3, 6), 2), SNOW, rng, n=5, floor=1)
    # The semaphore signal: a lattice post west of the box, a red arm with a white stripe raised, the lamp.
    sx, sy = x0 - 14, y1 - 4
    if state:
        bar(body, (sx, sy, 0), (sx, sy, 48), 1.8, STEEL_D(rng))
        for z in np.arange(4, 46, 6):
            bar(body, (sx - 1, sy, z), (sx + 1, sy, z + 4), 0.5, STEEL(rng))
        arm = PMesh()
        arm.box(9, 0, 0, 18, 0.8, 3.2, 0, RED(rng))
        arm.box(13, 0.5, 0, 2.4, 0.4, 3.2, 0, WHITE(rng))
        ang = math.radians(35 if state == 2 else -30)
        body.add(transformed(arm, lambda p: np.array([sx + 1 + p[0] * math.cos(ang), sy + p[1], 44 + p[0] * math.sin(ang) + p[2]])))
        lump(body, (sx + 2, sy + 1, 40), (1.6, 1.4, 1.6), lambda q: hls(0.3, 0.6, 0.5), rng, n=4)
        lump(body, (sx, sy, 48.6), (1.6, 1.6, 0.8), SNOW, rng, n=4)
    else:
        bar(body, (sx, sy, 0.8), (sx + 40, sy + 8, 0.8), 1.8, STEEL_D(rng))
        body.box(sx + 44, sy + 10, 0.6, 18, 3.2, 0.8, 0.3, RED(rng))
    body.solid_poly([(x0, y0), (x1, y1 - d), (x1, y1), (x0, y1)])
    body.solid_poly([(sx - 2, sy - 2), (sx + 2, sy - 2), (sx + 2, sy + 2), (sx - 2, sy + 2)])
    return {'body': body, 'roof': roof}


# --- the cornice: an overhanging snow lip on a ridge rim, shot down to start an avalanche (level 37) ----------------------------

@structure('cornice', [1, 0], foot='runs', hp=60)
def cornice(state: int) -> dict:
    """Sits on a ridgeEdge run (same 128 px run, same origin: place it at the ridge's own position). 1 = a heavy wind-packed lip
    of snow along the rim, curling out past the cliff face with icicles under it; 0 = broken off, a few lumps left on the bare rim."""
    rng = random.Random(1651)
    m = PMesh()
    L, rim, top = 128.0, 14.0, 42.0     # the ridge's top south edge (RIDGE_BEDS' last inset 8 from D/2 = 22) and height
    if state:
        n = 16
        for i in range(n):
            x = -L / 2 + (i + 0.5) * L / n
            reach = 9 + 3 * math.sin(i * 1.3) + rng.uniform(-1, 1)
            # The body on the rim, then the overhang curling out and down past the face.
            lump(m, (x, rim - 4, top + 2.5), (L / n / 2 + 2.5, 7, 4.2), SNOW, rng, n=5, jag=0.12)
            lump(m, (x + rng.uniform(-1, 1), rim + reach * 0.55, top + 1.5), (L / n / 2 + 2, reach * 0.6, 3.2), SNOW, rng, n=5, jag=0.15)
            lump(m, (x, rim + reach, top - 1.5), (L / n / 2 + 1.2, 2.6, 2.4), SNOW_D, rng, n=4, jag=0.2)
        for i in range(30):
            x = rng.uniform(-L / 2 + 2, L / 2 - 2)
            y = rim + 10 + 3 * math.sin(x * 0.1)
            bar(m, (x, y, top - 3), (x, y + 0.3, top - 3 - rng.uniform(3, 9)), 1.1, ICE(rng))
    else:
        for i in range(7):
            x = rng.uniform(-L / 2 + 6, L / 2 - 6)
            lump(m, (x, rim - 3, top + 1), (rng.uniform(4, 8), 3.5, 1.8), SNOW, rng, n=4, jag=0.25)
        for i in range(10):
            x = rng.uniform(-L / 2 + 2, L / 2 - 2)
            bar(m, (x, rim + 1, top - 1), (x, rim + 1.3, top - 1 - rng.uniform(1, 3)), 0.9, ICE(rng))
    # Its foot reaches the ridge's south edge (y 22) and a little past, so it sorts after the ridge it sits on (ridgeEdge sorts at 22).
    m.solid_poly([(-L / 2, rim - 8), (L / 2, rim - 8), (L / 2, 24), (-L / 2, 24)])
    return {'body': m}
