"""The Dust Flats (chapter 2) structures as 3D models, in the field projection (native density-C pixels, origin = middle of the footprint).

Adobe houses (small and large, roofs that fade), the oil derrick and oil storage tank (Raid), palms and cactus clumps, canyon
rocks and a mesa edge, a water well (Capture dressing), a Crow camp tent (Recon dressing) and capture flagpoles
(flagInk / flagCrow / flagBare share one model, so they share a canvas and an anchor and can be swapped).

Rendered by build.py like the farm set; painted on their own sheets (desert-*), see dev/pixel/desert/build.py.
"""
from __future__ import annotations

import math
import random

import numpy as np

from farm import holes_in, rotate, structure, trunk_foot
from kit import FIELDSTONE, FLOOR, PLANK, TIMBER, PMesh, blocks, cylinder, hls, lump, panel, ragged, rubble, tone
from props import SOOT, bar, transformed

ADOBE = tone(0.075, 0.38, 0.62, 0.008, 0.035)
ADOBE_D = tone(0.07, 0.34, 0.5, 0.008, 0.035)
MUDROOF = tone(0.075, 0.3, 0.46, 0.01, 0.04)
SANDSTONE = tone(0.045, 0.45, 0.5, 0.012, 0.06)
SANDSTONE_L = tone(0.065, 0.42, 0.62, 0.012, 0.05)
DERRICK = tone(0.04, 0.42, 0.36, 0.01, 0.04)
TANKSTEEL = tone(0.1, 0.1, 0.74, 0.01, 0.03)
TANKBAND = tone(0.03, 0.4, 0.4, 0.01, 0.03)
OIL = lambda r: hls(0.08, 0.2, 0.07)  # noqa: E731
PALM_BARK = tone(0.08, 0.32, 0.4, 0.012, 0.06)
FROND = tone(0.24, 0.45, 0.34, 0.02, 0.05)
DATES = tone(0.06, 0.6, 0.35, 0.01, 0.04)
CACTUS = tone(0.3, 0.32, 0.36, 0.015, 0.04)
CACTUS_L = tone(0.28, 0.3, 0.46, 0.015, 0.04)
CROW = tone(0.7, 0.1, 0.27, 0.01, 0.03)
CROW_L = tone(0.7, 0.1, 0.36, 0.01, 0.03)
INK = lambda r: hls(0.6, 0.56, 0.5 + r.uniform(-0.02, 0.02))  # noqa: E731
BONE = lambda r: hls(0.12, 0.2, 0.84)  # noqa: E731
WATER = lambda r: hls(0.55, 0.45, 0.28)  # noqa: E731
DARK = lambda r: hls(0.07, 0.2, 0.12)  # noqa: E731
ROPE = lambda r: hls(0.1, 0.3, 0.55)  # noqa: E731


# --- adobe houses (flat mud roofs that fade, beam ends through the walls) ------------------------------------------------

def adobe(state: int, w: float, d: float, h: float, seed: int, upper: tuple | None = None) -> dict:
    """An adobe block w x d, walls h high plus a parapet; `upper` (x, y, w, d, h) is a rooftop room, part of the roof."""
    x0, x1, y0, y1 = -w / 2, w / 2, -d / 2, d / 2
    rng = random.Random(seed)
    body, roof = PMesh(), PMesh()
    t = 4.0
    hp = h + 4  # walls run up past the roof into a parapet
    door = (w * 0.58 - 6, w * 0.58 + 6, 0, 19)
    wins = [(w * 0.2, 9, 16)] + ([(w * 0.86, 9, 16)] if w > 80 else [])
    holes = [door] + [(s - 4, s + 4, z0, z1) for s, z0, z1 in wins]
    if state == 2:
        ts = tn = te = tw = lambda s: hp  # noqa: E731
        gone = None
    elif state == 1:
        ts = lambda s: hp - (9 if s > w - 16 else 0)  # noqa: E731
        tn = tw = lambda s: hp  # noqa: E731
        te = lambda s: hp - (8 if s > d - 20 else 0)  # noqa: E731
        gone = lambda c, s, z: abs(s - w * 0.36 - (z - 14) * 0.5) < 2.6 and 5 < z < 24  # noqa: E731
    else:
        rs = ragged(hp, seed, 0.25, 3)
        ts = lambda s: 0 if w * 0.38 < s < w * 0.8 else rs(s, w) * 0.8  # noqa: E731
        tn = lambda s: hp * (0.9 - 0.45 * s / w)  # noqa: E731
        tw = lambda s: hp * 0.85  # noqa: E731
        te = lambda s: hp * 0.35  # noqa: E731
        gone = None
    for (a, b, top, hl) in (((x0, y1), (x1, y1), ts, holes), ((x0, y0), (x1, y0), tn, []), ((x0, y0 + t), (x0, y1 - t), tw, []), ((x1, y0 + t), (x1, y1 - t), te, [])):
        blocks(body, a, b, t, top, rng, ADOBE, bl=11, ch=5.0, holes=hl, gone=gone)
    # Windows: deep dark recesses with a timber lintel; the door a plank door under a lintel.
    for s, z0, z1 in wins:
        if ts(s) > z1 + 2:
            panel(body, (x0 + s, y1), 7, z0, z1, DARK(rng), out=-0.6, d=1.0)
            panel(body, (x0 + s, y1), 11, z1, z1 + 2, TIMBER(rng), out=t / 2 + 0.4)
    dx = x0 + (door[0] + door[1]) / 2
    if state:
        panel(body, (dx, y1), 11, 0, 19, PLANK(rng), out=0.0, d=t - 1)
        panel(body, (dx, y1), 16, 19, 21.5, TIMBER(rng), out=t / 2 + 0.4)
        body.box(dx, y1 + 3.5, 0.6, 14, 5, 1.2, 0, ADOBE_D(rng))
    # Vigas: roof beam ends poking out of the south wall under the parapet.
    for s in np.arange(5, w - 3, 10):
        if ts(s) >= h:
            body.box(x0 + s, y1 + 2.6, h - 1.6, 2.4, 5.4, 2.4, 0, TIMBER(rng))
    body.floor(0, 0, 0.6, w - 2 * t, d - 2 * t, 1.0, 0, FLOOR(rng))
    # The flat mud roof, in tiles so a shell can hole it, sitting just under the parapet.
    if state == 2:
        keep = None
    elif state == 1:
        keep = holes_in([(w * 0.15, -d * 0.1, 9), (-w * 0.28, d * 0.15, 6)])
    else:
        keep = lambda x, y: x < -w * 0.2 + 8 * math.sin(y * 0.25) and (int(x * 3 + y) % 6 > 1)  # noqa: E731
    step = 6.0
    for yy in np.arange(y0 + t, y1 - t, step):
        for xx in np.arange(x0 + t, x1 - t, step):
            cx, cy = xx + step / 2, yy + step / 2
            if keep is None or keep(cx, cy):
                roof.box(cx, cy, h + 0.5 + rng.uniform(-0.1, 0.1), min(step, x1 - t - xx), min(step, y1 - t - yy), 1.0, 0, MUDROOF(rng))
    if upper and state:
        ux, uy, uw, ud, uh = upper
        if state == 2:
            ut = lambda s: h + 1 + uh  # noqa: E731
        else:
            ut = lambda s: h + 1 + uh - (6 if s < 12 else 0)  # noqa: E731
        ub = PMesh()
        for (a, b) in (((ux - uw / 2, uy + ud / 2), (ux + uw / 2, uy + ud / 2)), ((ux - uw / 2, uy - ud / 2), (ux + uw / 2, uy - ud / 2)),
                       ((ux - uw / 2, uy - ud / 2 + t), (ux - uw / 2, uy + ud / 2 - t)), ((ux + uw / 2, uy - ud / 2 + t), (ux + uw / 2, uy + ud / 2 - t))):
            blocks(ub, a, b, t, ut, rng, ADOBE, bl=11, ch=5.0, solid=False, z_base=h + 1)
        panel(ub, (ux, uy + ud / 2), 7, h + 6, h + 13, DARK(rng), out=-0.6, d=1.0)
        for s in np.arange(4, uw - 2, 9):
            ub.box(ux - uw / 2 + s, uy + ud / 2 + 2.4, h + uh - 1.4, 2.2, 4.8, 2.2, 0, TIMBER(rng))
        if state == 2:
            ub.box(ux, uy, h + uh - 0.5, uw - 2, ud - 2, 1.0, 0, MUDROOF(rng))
        roof.add(ub)
        # A ladder up the south face to the roof, a water jar up top.
        for lx in (x0 + 10, x0 + 16):
            bar(body, (lx, y1 + 4, 0), (lx, y1 + 1.5, hp + 4), 1.2, TIMBER(rng))
        for z in np.arange(4, hp + 2, 5):
            bar(body, (x0 + 10, y1 + 4 - z * 2.5 / (hp + 4), z), (x0 + 16, y1 + 4 - z * 2.5 / (hp + 4), z), 0.8, PLANK(rng))
        cylinder(roof, (x1 - 14, y0 + 12), 4, h + 1, h + 9, lambda r: hls(0.04, 0.5, 0.42), rng, sides=10)
    if state < 2:
        rubble(body, w * 0.2, y1 + 6, 20 if state == 0 else 9, 4, 40 if state == 0 else 12, random.Random(seed + state), ADOBE, 4)
    if state == 0:
        rubble(body, 6, 0, w * 0.3, d * 0.28, 50, random.Random(seed + 9), MUDROOF, 4)
        for k in range(5):
            body.box(rng.uniform(x0 + 8, x1 - 8), rng.uniform(y0 + 8, y1 - 8), 2, rng.uniform(14, 24), 2.4, 2.4, rng.uniform(0, 3), TIMBER(rng), (rng.uniform(-0.3, 0.3), 0))
    return {'body': body, 'roof': roof}


@structure('adobeSmall', [2, 1, 0], foot='hull', hp=320)
def adobe_small(state: int) -> dict:
    return adobe(state, 64, 54, 24, 811)


@structure('adobeLarge', [2, 1, 0], foot='hull', hp=520)
def adobe_large(state: int) -> dict:
    return adobe(state, 108, 74, 28, 821, upper=(-18, -10, 44, 34, 18))


# --- the oil derrick (indestructible) --------------------------------------------------------------------------------------

@structure('oilDerrick', [1], foot='hull', hp=0)
def oil_derrick(state: int) -> dict:
    rng = random.Random(831)
    m = PMesh()
    base, top_w, hgt = 36.0, 8.0, 118.0
    legs = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    at = lambda sx, sy, z: (sx * (base / 2 - (base - top_w) / 2 * z / hgt), sy * (base / 2 - (base - top_w) / 2 * z / hgt), z + 4)  # noqa: E731
    # A timber drill floor on a concrete base, the lattice tower on it.
    m.box(0, 0, 2, base + 10, base + 10, 4, 0, hls(0.09, 0.08, 0.6))
    for k in range(9):
        m.box(0, -base / 2 - 2 + k * (base + 4) / 8, 4.4, base + 6, 4, 0.8, 0, PLANK(rng))
    steel = DERRICK
    for sx, sy in legs:
        bar(m, at(sx, sy, 0), at(sx, sy, hgt), 2.0, steel(rng))
    levels = np.linspace(0, hgt, 10)
    for k, (z0, z1) in enumerate(zip(levels, levels[1:])):
        for i in range(4):
            (ax, ay), (bx, by) = legs[i], legs[(i + 1) % 4]
            bar(m, at(ax, ay, z1), at(bx, by, z1), 1.2, steel(rng))
            bar(m, at(ax, ay, z0), at(bx, by, z1), 0.8, steel(rng))
            bar(m, at(bx, by, z0), at(ax, ay, z1), 0.8, steel(rng))
    # A railed work platform two thirds up, the crown block on top, the drill pipe hanging down the middle.
    zp = hgt * 0.62 + 4
    wp = base - (base - top_w) * 0.62 + 10
    m.box(0, 0, zp, wp, wp, 1.2, 0, PLANK(rng))
    for i in range(4):
        (ax, ay), (bx, by) = legs[i], legs[(i + 1) % 4]
        bar(m, (ax * wp / 2, ay * wp / 2, zp + 5), (bx * wp / 2, by * wp / 2, zp + 5), 0.7, hls(0.1, 0.6, 0.55))
    m.box(0, 0, hgt + 6, 14, 10, 4, 0, hls(0.1, 0.5, 0.5))
    cylinder(m, (0, 0), 3.2, hgt + 8, hgt + 12, lambda r: hls(0.0, 0.0, 0.25), rng, sides=10)
    bar(m, (0, 0, hgt + 4), (0, 0, 12), 1.0, hls(0.6, 0.05, 0.3))
    m.box(0, 0, 18, 4, 4, 6, 0, hls(0.1, 0.55, 0.45))
    # The doghouse shed and a pipe rack at the foot, a few drums.
    m.box(-30, 10, 8, 16, 14, 16, 0, hls(0.33, 0.06, 0.55))
    m.box(-30, 10, 16.6, 18, 16, 1.2, 0, hls(0.05, 0.4, 0.35))
    panel(m, (-30, 17), 6, 0, 11, PLANK(rng), out=0.4)
    for k in range(4):
        cylinder(m, (24 + k * 0.4, -10 + k * 6), 2.6, 0, 3, lambda r: hls(0.6, 0.05, 0.32), rng, sides=8)
        bar(m, (22, -12 + k * 6, 3.4), (40, -12 + k * 6, 3.4), 2.2, hls(0.6, 0.05, 0.36))
    for k, (x, y) in enumerate(((26, 18), (33, 20), (29, 26))):
        cylinder(m, (x, y), 3.6, 0, 11, (lambda r: hls(0.01, 0.55, 0.38)) if k % 2 else (lambda r: hls(0.12, 0.6, 0.45)), rng, sides=12, ry=3.1)
    lump(m, (10, 22, 0.3), (12, 7, 0.4), OIL, rng, n=6, floor=0.3)
    m.solid_poly([(-base / 2 - 5, -base / 2 - 5), (base / 2 + 5, -base / 2 - 5), (base / 2 + 5, base / 2 + 5), (-base / 2 - 5, base / 2 + 5)])
    m.solid_poly([(-38, 3), (-22, 3), (-22, 17), (-38, 17)])
    return {'body': m}


# --- the oil storage tank (Raid target) -------------------------------------------------------------------------------------

def shell(m: PMesh, r: float, ry: float, z0: float, top, colour, rng: random.Random, sides: int = 28, bend=None) -> None:
    """A cylinder wall in strips, each up to top(i); bend(i) tips a strip outwards (radians)."""
    for i in range(sides):
        a0, a1 = 2 * math.pi * i / sides, 2 * math.pi * (i + 1) / sides
        z1 = top(i)
        if z1 <= z0 + 0.5:
            continue
        tip = bend(i) if bend else 0.0
        out = math.sin(tip) * (z1 - z0)
        zt = z0 + math.cos(tip) * (z1 - z0)
        am = (a0 + a1) / 2
        p = lambda a, z, o: (r * math.cos(a) + o * math.cos(am), ry * math.sin(a) + o * math.sin(am), z)  # noqa: E731
        col = colour(rng)
        m.face([p(a0, z0, 0), p(a1, z0, 0), p(a1, zt, out), p(a0, zt, out)], col, np.array([0, 0, (z0 + z1) / 2]))
        m.face([p(a0, z0, -1.2), p(a1, z0, -1.2), p(a1, zt, out - 1.2), p(a0, zt, out - 1.2)], hls(0.08, 0.1, 0.2), np.array([5 * r * math.cos(am), 5 * ry * math.sin(am), (z0 + z1) / 2]))


@structure('oilTank', [2, 1, 0], foot='hull', hp=420)
def oil_tank(state: int) -> dict:
    rng = random.Random(841)
    m = PMesh()
    r, ry, h = 30.0, 27.0, 34.0
    # A low earth bund round a concrete pad.
    m.box(0, 0, 0.6, 2 * r + 12, 2 * ry + 12, 1.2, 0, hls(0.09, 0.08, 0.58))
    if state == 2:
        shell(m, r, ry, 1.2, lambda i: h, TANKSTEEL, rng)
    elif state == 1:
        shell(m, r, ry, 1.2, lambda i: h - (5 if i in (6, 7) else 0), TANKSTEEL, rng)
    else:
        tops = [h * (0.25 + 0.75 * abs(math.sin(i * 1.7 + 0.4)) ** 2) if not 4 <= i <= 10 else rng.uniform(4, 9) for i in range(28)]
        shell(m, r, ry, 1.2, lambda i: tops[i], lambda q: SOOT(q) if q.random() < 0.6 else TANKSTEEL(q), rng,
              bend=lambda i: 0.5 if 3 <= i <= 11 and tops[i] > 6 else 0.0)
    if state:
        # Rust bands, the shallow cone roof, a vent, the stair climbing the south face.
        for z in (9, 19, 29):
            if z < h - 1:
                shell(m, r + 0.3, ry + 0.3, z - 0.7, lambda i, z=z: z + 0.7, TANKBAND, rng)
        n = 28
        for i in range(n):
            a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
            if state == 1 and 20 <= i <= 23:
                continue
            m.face([(r * math.cos(a0), ry * math.sin(a0), h), (r * math.cos(a1), ry * math.sin(a1), h), (0, 0, h + 6)], TANKSTEEL(rng), np.array([0, 0, h - 4]))
        if state == 1:
            lump(m, (8, -14, h - 2), (8, 6, 3), SOOT, rng, n=6, jag=0.3)
        cylinder(m, (0, 0), 3, h + 5, h + 9, lambda q: hls(0.1, 0.05, 0.4), rng, sides=10)
        for k in range(13):
            f = k / 12
            a = math.radians(70 - f * 75)
            x, y, z = (r + 2) * math.cos(a), (ry + 2) * math.sin(a), 2 + f * (h - 2)
            m.box(x, y, z, 5, 3, 1, a + math.pi / 2, PLANK(rng))
        bar(m, ((r + 4) * math.cos(math.radians(70)), (ry + 4) * math.sin(math.radians(70)), 6), ((r + 4) * math.cos(math.radians(-5)), (ry + 4) * math.sin(math.radians(-5)), h + 5), 0.8, hls(0.02, 0.6, 0.45))
        # Valves and a pipe out of the east side.
        bar(m, (r - 1, 6, 4), (r + 14, 6, 4), 3, hls(0.6, 0.05, 0.35))
        cylinder(m, (r + 6, 6), 2.2, 4, 9, lambda q: hls(0.0, 0.6, 0.42), rng, sides=8)
    if state == 1:
        for (a, z) in ((1.2, 12), (1.9, 22), (0.6, 26)):
            m.box(r * math.cos(a), ry * math.sin(a) + 0.8, z, 4, 1.2, 4, a + math.pi / 2, DARK(rng))
        lump(m, (6, ry + 8, 0.3), (14, 6, 0.4), OIL, rng, n=6, floor=0.3)
    if state == 0:
        lump(m, (0, 6, 0.4), (r + 12, ry * 0.9, 0.5), OIL, rng, n=8, floor=0.4)
        rubble(m, 0, 0, r * 0.7, ry * 0.6, 50, random.Random(7), SOOT, 4)
        rubble(m, 4, ry + 4, 20, 6, 18, random.Random(8), TANKSTEEL, 4)
    m.solid_poly([(r * math.cos(2 * math.pi * i / 16), ry * math.sin(2 * math.pi * i / 16)) for i in range(16)])
    return {'body': m}


# --- palm and cactus ----------------------------------------------------------------------------------------------------------

def frond(m: PMesh, base: tuple, ang: float, length: float, droop: float, rng: random.Random) -> None:
    """A palm frond: a midrib of short segments arching out and down, leaflets either side."""
    n = 7
    pts = []
    for i in range(n + 1):
        f = i / n
        rr = length * f
        pts.append((base[0] + rr * math.cos(ang), base[1] + rr * math.sin(ang) * 0.9, base[2] + length * 0.35 * math.sin(f * math.pi * 0.7) - droop * f * f))
    for i in range(n):
        p, q = np.array(pts[i]), np.array(pts[i + 1])
        bar(m, tuple(p), tuple(q), 1.1, PALM_BARK(rng))
        wdt = 6.5 * (1 - (i / n) ** 1.5) + 1.2
        side = np.array([-math.sin(ang), math.cos(ang) * 0.9, 0.0])
        for sgn in (-1, 1):
            tip = (p + q) / 2 + side * sgn * wdt + np.array([0, 0, -1.6])
            m.face([tuple(p), tuple(q), tuple(tip)], FROND(rng))
            m.face([tuple(q), tuple(p), tuple(tip)], FROND(rng))


@structure('palm', [1, 0], foot='hull', hp=110, flattenable=True)
def palm(state: int) -> dict:
    rng = random.Random(851)
    body, roof = PMesh(), PMesh()
    hgt = 56.0
    curve = lambda z: (7 * (z / hgt) ** 2, -2 * (z / hgt))  # noqa: E731
    if state:
        for k in range(14):
            z0, z1 = hgt * k / 14, hgt * (k + 1) / 14
            (xa, ya), (xb, yb) = curve(z0), curve(z1)
            r = 3.4 - 1.0 * k / 14
            col = PALM_BARK if k % 2 else tone(0.08, 0.3, 0.32, 0.01, 0.03)
            bar(body, (xa, ya, z0), (xb, yb, z1 + 0.6), r * 1.6, col(rng))
        cx, cy = curve(hgt)
        for k in range(12):
            ang = 2 * math.pi * k / 12 + rng.uniform(-0.15, 0.15)
            frond(roof, (cx, cy, hgt), ang, rng.uniform(25, 31), rng.uniform(13, 19), rng)
        for k in range(5):
            a = 2 * math.pi * k / 5
            lump(roof, (cx + 2.6 * math.cos(a), cy + 2.2 * math.sin(a), hgt - 3), (1.8, 1.8, 2.2), DATES, rng, n=5)
        lump(roof, (cx, cy, hgt + 1), (3, 3, 2.5), FROND, rng, n=6)
    else:
        cylinder(body, (0, 0), 3.4, 0, 6, PALM_BARK, rng, sides=10, ry=2.9, top=lambda r: hls(0.1, 0.4, 0.6))
        for k in range(12):
            x0 = 4 + k * 3.6
            bar(body, (x0, 1 + k * 0.3, 3), (x0 + 3.8, 1 + (k + 1) * 0.3, 3), 5.4 - 0.12 * k, (PALM_BARK if k % 2 else tone(0.08, 0.3, 0.32, 0.01, 0.03))(rng))
        for k in range(8):
            ang = -0.9 + k * 0.25 + rng.uniform(-0.1, 0.1)
            frond(body, (48, 4, 3), ang if k % 2 else ang + math.pi * 0.25, rng.uniform(18, 24), 2.0, rng)
    trunk_foot(body, 3.6)
    return {'body': body, 'roof': roof}


def column(m: PMesh, x: float, y: float, z0: float, z1: float, r: float, rng: random.Random, axis: str = 'z', sides: int = 10) -> None:
    """A ribbed cactus stem: faces alternate light and dark, its top a rounded cap."""
    for i in range(sides):
        a0, a1 = 2 * math.pi * i / sides, 2 * math.pi * (i + 1) / sides
        col = (CACTUS if i % 2 else CACTUS_L)(rng)
        m.face([(x + r * math.cos(a0), y + r * math.sin(a0) * 0.85, z0), (x + r * math.cos(a1), y + r * math.sin(a1) * 0.85, z0),
                (x + r * math.cos(a1), y + r * math.sin(a1) * 0.85, z1), (x + r * math.cos(a0), y + r * math.sin(a0) * 0.85, z1)], col, np.array([x, y, (z0 + z1) / 2]))
    lump(m, (x, y, z1), (r, r * 0.85, r * 0.7), CACTUS_L, rng, n=6)


@structure('cactus', [1, 0], foot='hull', hp=20, flattenable=True)
def cactus(state: int) -> dict:
    rng = random.Random(861)
    m = PMesh()
    stems = [(-6, -2, 30, 3.6, [(-1, 14, 8), (1, 19, 6)]), (8, 3, 20, 3.0, [(1, 9, 6)]), (-1, 8, 12, 2.6, [])]
    if state:
        for x, y, h, r, arms in stems:
            column(m, x, y, 0, h, r, rng)
            for side, z, up in arms:
                bar(m, (x + side * r * 0.6, y, z), (x + side * (r + 4), y, z), r * 1.4, CACTUS(rng))
                column(m, x + side * (r + 4.5), y, z - r * 0.6, z + up, r * 0.75, rng, sides=8)
        for (x, y) in ((14, -6), (-14, 6)):
            lump(m, (x, y, 2.8), (3.6, 3.2, 3.4), CACTUS_L, rng, n=6, jag=0.15)
            m.box(x, y, 6.4, 1.6, 1.6, 1.0, 0, hls(0.95, 0.6, 0.62))
        m.box(-6, -2, 31.4, 2, 2, 1.2, 0, hls(0.13, 0.7, 0.75))
    else:
        for k, (x, y, h, r, _arms) in enumerate(stems):
            column(m, x, y, 0, 3 + k, r, rng)
            lump(m, (x + 10 + k * 3, y + 2, 1.2), (h * 0.35, r * 1.1, 1.6), CACTUS, rng, n=6, jag=0.25, floor=0.3)
        lump(m, (14, -6, 0.8), (4.6, 3.6, 1.2), CACTUS_L, rng, n=6, jag=0.3, floor=0.3)
    m.solid_poly([(-11, -6), (12, -6), (12, 12), (-11, 12)])
    return {'body': m}


# --- canyon rocks and the mesa edge ---------------------------------------------------------------------------------------------

def strata(m: PMesh, outline, layers: list[tuple[float, float, float]], rng: random.Random, seed: int) -> None:
    """Stacked sandstone beds: each (z0, z1, shrink) is the outline pulled in and jagged, light and dark beds in turn."""
    cx, cy = np.mean(outline, axis=0)
    for k, (z0, z1, s) in enumerate(layers):
        r2 = random.Random(seed + k)
        poly = []
        for (x, y) in outline:
            j = 1 + r2.uniform(-0.07, 0.07)
            poly.append((cx + (x - cx) * s * j, cy + (y - cy) * s * j))
        m.prism(poly, z0, z1, (SANDSTONE_L if k % 2 else SANDSTONE)(rng), SANDSTONE_L(rng))
    m.solid_poly([(cx + (x - cx) * layers[0][2], cy + (y - cy) * layers[0][2]) for x, y in outline])


def blob(rx: float, ry: float, n: int, seed: int, jag: float = 0.18) -> list[tuple[float, float]]:
    rng = random.Random(seed)
    return [(rx * math.cos(a) * (1 + rng.uniform(-jag, jag)), ry * math.sin(a) * (1 + rng.uniform(-jag, jag))) for a in np.linspace(0, 2 * math.pi, n + 1)[:-1]]


def canyon_rock(seed: int, rx: float, ry: float, beds: list[tuple[float, float, float]]) -> dict:
    rng = random.Random(seed)
    m = PMesh()
    strata(m, blob(rx, ry, 11, seed), beds, rng, seed)
    # Fallen chunks at the foot.
    for _ in range(4):
        a = rng.uniform(0.3, math.pi - 0.3)
        lump(m, (rx * 1.02 * math.cos(a), ry * 1.05 * math.sin(a), 1.2), (rng.uniform(2, 4),) * 2 + (2.2,), SANDSTONE, rng, n=5, jag=0.25, floor=0)
    return {'body': m}


structure('canyonRockA', [1], foot='hull', hp=0)(lambda s: canyon_rock(871, 17, 12, [(0, 6, 1.0), (6, 11, 0.85), (11, 14, 0.62)]))
structure('canyonRockB', [1], foot='hull', hp=0)(lambda s: canyon_rock(872, 27, 18, [(0, 7, 1.0), (7, 13, 0.92), (13, 19, 0.78), (19, 23, 0.55)]))
structure('canyonRockC', [1], foot='hull', hp=0)(lambda s: canyon_rock(873, 38, 26, [(0, 9, 1.0), (9, 17, 0.95), (17, 25, 0.88), (25, 32, 0.8), (32, 36, 0.62)]))


@structure('mesaEdge', [1], foot='hull', hp=0)
def mesa_edge(state: int) -> dict:
    """A 128 px run of cliff, its face to the south: straight east and west ends so runs of it join."""
    rng = random.Random(881)
    m = PMesh()
    L, D, H = 128.0, 44.0, 42.0
    beds = [(0, 8, 0.0), (8, 15, 2.5), (15, 24, 4.0), (24, 32, 5.5), (32, 38, 6.5), (38, H, 8.0)]
    for k, (z0, z1, inset) in enumerate(beds):
        r2 = random.Random(881 + k)
        south = [(x, D / 2 - inset + r2.uniform(-2.2, 2.2) * (0 < i < 16)) for i, x in enumerate(np.linspace(-L / 2, L / 2, 17))]
        poly = [(-L / 2, -D / 2)] + south + [(L / 2, -D / 2)]
        poly = [poly[0]] + poly[1:]
        # Prism wants the outline in order: north-west, then the south edge west to east, then north-east.
        outline = [(-L / 2, -D / 2), (L / 2, -D / 2)] + list(reversed(south))
        m.prism(outline, z0, z1, (SANDSTONE_L if k % 2 else SANDSTONE)(rng), tone(0.07, 0.36, 0.6, 0.01, 0.04)(rng))
    # Scrub on the top, scree at the foot.
    for _ in range(7):
        x, y = rng.uniform(-L / 2 + 6, L / 2 - 6), rng.uniform(-D / 2 + 4, D / 2 - 14)
        lump(m, (x, y, H + 1.2), (3.2, 2.6, 2.0), tone(0.2, 0.3, 0.38, 0.02, 0.04), rng, n=5, jag=0.2)
    for _ in range(10):
        x = rng.uniform(-L / 2 + 4, L / 2 - 4)
        lump(m, (x, D / 2 + rng.uniform(1, 5), 1.0), (rng.uniform(2, 4.5),) * 2 + (2.0,), SANDSTONE, rng, n=5, jag=0.25, floor=0)
    m.solid_poly([(-L / 2, -D / 2), (L / 2, -D / 2), (L / 2, D / 2), (-L / 2, D / 2)])
    return {'body': m}


# --- the well (Capture dressing) ---------------------------------------------------------------------------------------------------

@structure('well', [1], foot='hull', hp=0)
def well(state: int) -> dict:
    rng = random.Random(891)
    m = PMesh()
    r = 11.0
    sides = 14
    for i in range(sides):
        a = 2 * math.pi * (i + 0.5) / sides
        for k, z in enumerate((0, 3.4, 6.8)):
            m.box(r * math.cos(a + 0.1 * k), r * 0.9 * math.sin(a + 0.1 * k), z + 1.7, 5.4, 3.6, 3.2, a + math.pi / 2, FIELDSTONE(rng))
    m.box(0, 0, 6.5, 2 * r - 6, 2 * r * 0.9 - 6, 0.6, 0, WATER(rng))
    # Posts, a little plank roof, the winch beam with a rope and bucket.
    for sx in (-1, 1):
        bar(m, (sx * (r + 1), 0, 0), (sx * (r + 1), 0, 26), 2.2, TIMBER(rng))
    bar(m, (-r - 3, 0, 22), (r + 3, 0, 22), 1.8, TIMBER(rng))
    for side in (-1, 1):
        for k in range(5):
            m.box(-r - 4 + k * (2 * r + 8) / 4.5 + 2, side * 5, 27.5 - 0 * k, (2 * r + 8) / 5 - 0.4, 10.5, 1.0, 0, PLANK(rng), (side * 0.5, 0))
    bar(m, (2, 0, 22), (2, 0, 12), 0.5, ROPE(rng))
    cylinder(m, (2, 0), 2.0, 9, 12.5, lambda q: hls(0.08, 0.3, 0.32), rng, sides=8)
    # A stone trough to the east, a few pots.
    m.box(20, 6, 2.4, 14, 6, 4.8, 0, FIELDSTONE(rng))
    m.box(20, 6, 4.9, 11, 3.6, 0.3, 0, WATER(rng))
    for (x, y) in ((-17, 9), (-20, 4)):
        cylinder(m, (x, y), 2.6, 0, 6, lambda q: hls(0.05, 0.5, 0.42), rng, sides=10)
    m.solid_poly([(r * 1.1 * math.cos(2 * math.pi * i / 12), r * math.sin(2 * math.pi * i / 12)) for i in range(12)])
    m.solid_poly([(13, 2), (27, 2), (27, 10), (13, 10)])
    return {'body': m}


# --- the Crow camp tent (Recon dressing) ------------------------------------------------------------------------------------------

@structure('crowTent', [1, 0], foot='hull', hp=80)
def crow_tent(state: int) -> dict:
    rng = random.Random(901)
    m = PMesh()
    w, d, h = 46.0, 30.0, 22.0
    if state:
        # A ridge tent of patched dark canvas, its south flap open on a dark inside.
        for side in (-1, 1):
            n = 6
            for k in range(n):
                xa, xb = -w / 2 + w * k / n, -w / 2 + w * (k + 1) / n
                m.face([(xa, side * d / 2, 0), (xb, side * d / 2, 0), (xb, 0, h), (xa, 0, h)], (CROW if (k + side) % 3 else CROW_L)(rng), np.array([0, 0, h / 3]))
        for x in (-w / 2, w / 2):
            m.face([(x, -d / 2, 0), (x, d / 2, 0), (x, 0, h)], CROW(rng), np.array([0, 0, h / 3]))
        m.face([(-5, d / 2 + 0.3, 0), (5, d / 2 + 0.3, 0), (0, d / 4 + 0.3, h / 2)], DARK(rng), np.array([0, 0, 4]))
        m.face([(5, d / 2 + 0.6, 0), (12, d / 2 + 4, 0), (2, d / 4 + 0.6, h / 2)], CROW_L(rng), np.array([0, 0, 4]))
        bar(m, (-w / 2 - 1, 0, 0), (-w / 2 - 1, 0, h + 4), 1.4, TIMBER(rng))
        bar(m, (w / 2 + 1, 0, 0), (w / 2 + 1, 0, h + 4), 1.4, TIMBER(rng))
        for x in (-w / 2 + 6, w / 2 - 6):
            bar(m, (x, d / 4, h / 2), (x, d / 2 + 8, 0), 0.4, ROPE(rng))
        # A rag banner on a pole with crow feathers and a skull-white mark.
        bar(m, (w / 2 + 8, -6, 0), (w / 2 + 8, -6, 38), 1.2, TIMBER(rng))
        m.box(w / 2 + 15, -6, 33, 13, 0.8, 8, 0, hls(0.7, 0.08, 0.14), (0.0, 0.15))
        m.box(w / 2 + 15, -5.4, 33, 4, 0.6, 4, 0, BONE(rng))
    else:
        # Collapsed: the canvas sags off a leaning west pole to the ground, folded in broad creases.
        nx, ny = 8, 4
        ridge = lambda x: 15.0 * max(0.0, 1 - (x + w / 2) / (w * 0.85)) ** 1.2 + 1.0  # noqa: E731
        for i in range(nx):
            xa, xb = -w / 2 + w * i / nx, -w / 2 + w * (i + 1) / nx
            fold = lambda x, j: 1.2 * math.sin(x * 0.45 + j * 1.7)  # noqa: E731
            for side in (-1, 1):
                for j in range(ny):
                    fa, fb = j / ny, (j + 1) / ny
                    ext = lambda x: (d / 2 + 3) * (1 - 0.3 * (x + w / 2) / w) + 2.5 * math.sin(x * 0.37 + side)  # noqa: E731
                    ya, yb = side * fa, side * fb
                    za = lambda x, f: max(0.4, ridge(x) * (1 - f) ** 1.5 + fold(x, j) * f * (1 - f) * 2)  # noqa: E731
                    col = (CROW if (i + j + side) % 3 else CROW_L)(rng)
                    m.face([(xa, ya * ext(xa), za(xa, fa)), (xb, ya * ext(xb), za(xb, fa)), (xb, yb * ext(xb), za(xb, fb)), (xa, yb * ext(xa), za(xa, fb))], col, np.array([(xa + xb) / 2, 0, -20]))
        bar(m, (-w / 2 - 1, 0, 0), (-w / 2 + 3, 1, 13), 1.4, TIMBER(rng))
        bar(m, (w / 2 + 2, 6, 1.0), (w / 2 - 14, 14, 1.0), 1.4, TIMBER(rng))
        m.box(-6, d / 2 + 2, 0.8, 9, 6, 1.4, 0.3, CROW_L(rng))
        bar(m, (w / 2 + 8, -6, 1.5), (w / 2 + 8 + 30, 2, 1.5), 1.2, TIMBER(rng))
        lump(m, (w / 2 + 34, 2, 1), (6, 3, 1.2), lambda q: hls(0.7, 0.08, 0.14), rng, n=5, floor=0.3)
    # Crates and a cold campfire by the door.
    for k, (x, y) in enumerate(((-w / 2 + 2, d / 2 + 8), (-w / 2 + 10, d / 2 + 9))):
        m.box(x, y, 3.5 + k * 0.5, 8, 7, 7 + k, 0.1 * k, PLANK(rng))
    for k in range(9):
        a = 2 * math.pi * k / 9
        m.box(16 + 6 * math.cos(a), d / 2 + 12 + 5 * math.sin(a), 1.2, 3, 2.4, 2.4, a, FIELDSTONE(rng))
    lump(m, (16, d / 2 + 12, 0.3), (4, 3.4, 1.4), SOOT, rng, n=5, floor=0.3)
    m.solid_poly([(-w / 2 - 2, -d / 2), (w / 2 + 2, -d / 2), (w / 2 + 2, d / 2), (-w / 2 - 2, d / 2)])
    return {'body': m}


# --- capture flagpoles ------------------------------------------------------------------------------------------------------------

def flagpole(cloth) -> dict:
    rng = random.Random(911)
    m = PMesh()
    hgt = 66.0
    # A cairn of stones at the foot, the pole, a gilt ball on top.
    for k in range(8):
        a = 2 * math.pi * k / 8
        m.box(5.5 * math.cos(a), 4.6 * math.sin(a), 2.2, 5, 4, 4.4, a, FIELDSTONE(rng))
    m.box(0, 0, 5.6, 7, 6, 3, 0.4, FIELDSTONE(rng))
    cylinder(m, (0, 0), 1.2, 0, hgt, lambda q: hls(0.08, 0.15, 0.62), rng, sides=8)
    lump(m, (0, 0, hgt + 1.2), (1.8, 1.8, 1.8), lambda q: hls(0.12, 0.7, 0.55), rng, n=5)
    if cloth:
        colour, mark = cloth
        # The flag streams east, a little wave along it.
        n = 8
        fw, fh = 28.0, 17.0
        z1 = hgt - 1
        for i in range(n):
            xa, xb = 1.2 + fw * i / n, 1.2 + fw * (i + 1) / n
            ya, yb = 1.8 * math.sin(i * 1.1), 1.8 * math.sin((i + 1) * 1.1)
            sag_a, sag_b = 1.2 * i / n, 1.2 * (i + 1) / n
            col = colour(rng)
            m.face([(xa, ya, z1 - sag_a), (xb, yb, z1 - sag_b), (xb, yb, z1 - fh - sag_b), (xa, ya, z1 - fh - sag_a)], col, np.array([xa, ya - 5, z1 - fh / 2]))
            m.face([(xa, ya, z1 - sag_a), (xb, yb, z1 - sag_b), (xb, yb, z1 - fh - sag_b), (xa, ya, z1 - fh - sag_a)], col, np.array([xa, ya + 5, z1 - fh / 2]))
            if 2 <= i <= 4:
                m.face([(xa, ya + 0.3, z1 - 5 - sag_a), (xb, yb + 0.3, z1 - 5 - sag_b), (xb, yb + 0.3, z1 - 12 - sag_b), (xa, ya + 0.3, z1 - 12 - sag_a)], mark(rng), np.array([xa, ya - 5, z1 - 8]))
    m.solid_poly([(-8, -6), (8, -6), (8, 6), (-8, 6)])
    return {'body': m}


structure('flagInk', [1], foot='hull', hp=0)(lambda s: flagpole((INK, lambda r: hls(0.12, 0.2, 0.9))))
structure('flagCrow', [1], foot='hull', hp=0)(lambda s: flagpole((lambda r: hls(0.7, 0.1, 0.16 + r.uniform(-0.02, 0.02)), BONE)))
structure('flagBare', [1], foot='hull', hp=0)(lambda s: flagpole(None))
