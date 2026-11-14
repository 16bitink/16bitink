"""The Deepwood (chapter 5) structures as 3D models, in the field projection (native density-C pixels, origin = middle of the footprint).

The forest: an old broadleaf giant (oldTree) and an old fir giant (oldFir) that stop shots and sight (canopies fade; state 0 is the
burnt, broken snag a fire or a rail gun leaves), a young birch (youngTree) and a young spruce (youngSpruce) that Tracks and Heavies
flatten (canopies fade), a fallen log east-west and north-south (low and solid; state 0 sawn through, so a felled road can be
cleared), a cut stump (low), a dense undergrowth clump (cover, flattenable).
The Iron Hive's logging works: a sawmill (an iron shed whose roof fades over a big circular saw; 2/1/0), log piles (1/0),
a Hive watchtower (its cabin fades), log bridges east-west and north-south (ground layer like the bridge deck; 2/1/0, the Timber
Bridges raid blows them) and the Hive capture flag (flagHive: the desert flagpole's model, so it shares flagInk / flagCrow's canvas
and anchor).

The Iron Hive's look: blackened iron plates with hexagonal (honeycomb) panels, hot orange lamps and trim, rivets.

Rendered by build.py like the farm set; painted on their own sheets (forest, hive), see dev/pixel/forest/build.py.
"""
from __future__ import annotations

import math
import random

import numpy as np

from desert import flagpole
from farm import holes_in, rotate, structure, trunk_foot
from kit import FIELDSTONE, PMesh, cylinder, hls, lump, tone
from props import bar

BARK_OLD = tone(0.07, 0.2, 0.27, 0.012, 0.04)       # an old tree's grey-brown furrowed bark
BARK_D = tone(0.07, 0.22, 0.19, 0.01, 0.03)
BIRCH = tone(0.11, 0.1, 0.8, 0.01, 0.04)            # white birch bark
BIRCH_D = lambda r: hls(0.08, 0.15, 0.2)  # noqa: E731   its black marks
LEAF_OLD = tone(0.27, 0.36, 0.27, 0.02, 0.05)        # deep, dark old-forest green
LEAF_LIGHT = tone(0.22, 0.45, 0.4, 0.02, 0.05)       # a young birch's fresh green
FIR = tone(0.4, 0.3, 0.2, 0.02, 0.03)                # dark fir needles
FIR_L = tone(0.37, 0.3, 0.27, 0.02, 0.03)
MOSS = tone(0.21, 0.5, 0.33, 0.02, 0.05)             # bright moss on roots and logs
FERN = tone(0.26, 0.45, 0.36, 0.02, 0.06)
BRAMBLE = tone(0.3, 0.3, 0.24, 0.02, 0.05)
WOOD_END = tone(0.1, 0.45, 0.62, 0.01, 0.04)         # a fresh-cut log end, pale ochre
WOOD_END_D = tone(0.08, 0.35, 0.4, 0.01, 0.03)
LOG = tone(0.07, 0.3, 0.28, 0.01, 0.04)
LOG_D = tone(0.07, 0.28, 0.2, 0.01, 0.03)
CHAR = tone(0.05, 0.08, 0.09, 0.01, 0.03)            # burnt black wood
CHAR_L = tone(0.06, 0.06, 0.2, 0.01, 0.04)
ASH = tone(0.08, 0.04, 0.42, 0.01, 0.06)
EMBER = lambda r: hls(0.05, 0.9, 0.5 + r.uniform(-0.05, 0.05))  # noqa: E731
SAWDUST = tone(0.11, 0.45, 0.7, 0.01, 0.05)
HIVE = tone(0.6, 0.06, 0.2, 0.01, 0.03)              # the Hive's blackened iron
HIVE_L = tone(0.6, 0.06, 0.3, 0.01, 0.03)
HIVE_D = tone(0.6, 0.06, 0.13, 0.01, 0.02)
GLOW = lambda r: hls(0.07, 0.95, 0.56)  # noqa: E731     the Hive's hot orange lamps and trim
TRIM = tone(0.07, 0.7, 0.45, 0.006, 0.03)
STEEL = tone(0.58, 0.06, 0.55, 0.01, 0.04)           # a saw blade's bright steel
CHAIN = lambda r: hls(0.6, 0.05, 0.36)  # noqa: E731
GLASS = lambda r: hls(0.07, 0.5, 0.3)  # noqa: E731     smoked glass with an orange glow behind
HIVE_CLOTH = lambda r: hls(0.6, 0.05, 0.14 + r.uniform(-0.02, 0.02))  # noqa: E731
HIVE_MARK = lambda r: hls(0.07, 0.9, 0.52)  # noqa: E731


def log(m: PMesh, p: tuple, q: tuple, r: float, rng: random.Random, col=LOG, end=WOOD_END, ends: tuple = (True, True), sides: int = 8) -> None:
    """A round log from p to q (3D), radius r, its ends capped with cut wood (or bark when end is None)."""
    p, q = np.array(p, float), np.array(q, float)
    d = q - p
    n = d / np.linalg.norm(d)
    a = np.array([0.0, 0.0, 1.0]) if abs(n[2]) < 0.9 else np.array([1.0, 0.0, 0.0])
    u = np.cross(n, a)
    u /= np.linalg.norm(u)
    v = np.cross(n, u)
    ring = [u * r * math.cos(2 * math.pi * i / sides) + v * r * math.sin(2 * math.pi * i / sides) for i in range(sides)]
    mid = (p + q) / 2
    for i in range(sides):
        j = (i + 1) % sides
        m.face([p + ring[i], q + ring[i], q + ring[j], p + ring[j]], col(rng), mid)
    for c, on in ((p, ends[0]), (q, ends[1])):
        m.face([c + x for x in ring], (end if (end and on) else col)(rng), mid)


def roots(m: PMesh, n: int, r0: float, r1: float, h: float, rng: random.Random, col=BARK_OLD, moss: bool = True, seed_ang: float = 0.3) -> None:
    """Buttress roots flaring from the trunk's foot out over the ground, moss on their backs."""
    for k in range(n):
        a = seed_ang + k * 2 * math.pi / n + rng.uniform(-0.2, 0.2)
        reach = r1 * rng.uniform(0.8, 1.2)
        m.face([(r0 * 0.6 * math.cos(a), r0 * 0.5 * math.sin(a), h), (reach * math.cos(a - 0.08), reach * 0.8 * math.sin(a - 0.08), 0),
                (reach * math.cos(a + 0.08), reach * 0.8 * math.sin(a + 0.08), 0)], col(rng), np.array([0, 0, -5]))
        for s in (-1, 1):
            m.face([(r0 * 0.6 * math.cos(a), r0 * 0.5 * math.sin(a), h), (r0 * math.cos(a + s * 0.5), r0 * 0.8 * math.sin(a + s * 0.5), 0),
                    (reach * math.cos(a), reach * 0.8 * math.sin(a), 0)], col(rng), np.array([0, 0, h * 3]))
        if moss and k % 2 == 0:
            lump(m, (reach * 0.7 * math.cos(a), reach * 0.56 * math.sin(a), 1.2), (3, 2.4, 1.4), MOSS, rng, n=4, jag=0.2, floor=0.2)


def trunk(m: PMesh, r: float, h: float, rng: random.Random, col=BARK_OLD, lean: tuple = (0.0, 0.0), taper: float = 0.25, n: int = 6) -> None:
    for k in range(n):
        z0, z1 = h * k / n, h * (k + 1) / n
        cx, cy = lean[0] * z0 / h, lean[1] * z0 / h
        cylinder(m, (cx, cy), r * (1 - taper * k / n), z0, z1 + 0.4, col, rng, sides=12, ry=r * 0.82 * (1 - taper * k / n))


# --- the old giants: solid, they stop shots and sight; the canopy fades ---------------------------------------------------------

@structure('oldTree', [1, 0], foot='hull', hp=420)
def old_tree(state: int) -> dict:
    """An ancient broadleaf (an old beech-oak): a massive buttressed trunk, a vast domed crown; 0 = the burnt, snapped snag."""
    rng = random.Random(1701)
    body, roof = PMesh(), PMesh()
    roots(body, 7, 9.5, 22, 12, rng, col=BARK_OLD if state else CHAR)
    if state:
        trunk(body, 9.0, 44, rng)
        for a, z, l in ((0.5, 34, 22), (2.5, 37, 24), (-1.0, 40, 20), (1.6, 42, 18), (-2.4, 36, 20)):
            bar(body, (0, 0, z), (l * math.cos(a), l * 0.8 * math.sin(a), z + 12), 3.4, BARK_OLD(rng))
        crown = ((0, 0, 66, 28), (-26, 4, 56, 20), (26, 2, 58, 21), (-12, -18, 70, 19), (14, -16, 71, 18), (2, 20, 52, 19),
                 (-22, 18, 50, 15), (24, 18, 51, 15), (-30, -10, 60, 14), (31, -9, 61, 14), (0, -28, 66, 14))
        for (dx, dy, dz, r) in crown:
            lump(roof, (dx, dy, dz), (r, r * 0.9, r * 0.75), LEAF_OLD, rng, n=8, jag=0.14)
        for _ in range(10):
            a, rr = rng.uniform(0, 2 * math.pi), rng.uniform(10, 34)
            lump(roof, (rr * math.cos(a), rr * 0.85 * math.sin(a) - 4, rng.uniform(74, 82)), (rng.uniform(6, 9),) * 2 + (4,), LEAF_LIGHT, rng, n=6, jag=0.2)
        lump(body, (6, 7, 6), (4, 2, 3), MOSS, rng, n=5, jag=0.2)
    else:
        # Burnt: a blackened trunk snapped at a jag, two charred limb stubs, ash and embers round its foot, the top lying east.
        trunk(body, 9.0, 26, rng, col=CHAR, n=4)
        for k in range(7):
            a = k * 2 * math.pi / 7
            bar(body, (6 * math.cos(a), 5 * math.sin(a), 26), (5 * math.cos(a), 4 * math.sin(a), 30 + 6 * (k % 3)), 3.2, CHAR(rng))
        bar(body, (0, 0, 20), (14, -6, 30), 3, CHAR_L(rng))
        bar(body, (0, 0, 16), (-14, 4, 24), 3, CHAR_L(rng))
        log(body, (14, 6, 5), (64, 16, 5), 6.5, rng, col=CHAR, end=CHAR_L)
        for (x, y) in ((40, 6), (52, 22), (60, 8)):
            bar(body, (x, y, 5), (x + rng.uniform(-6, 6), y + rng.uniform(6, 12), 2), 2, CHAR(rng))
        for _ in range(9):
            lump(body, (rng.uniform(-24, 64), rng.uniform(-16, 26), 0.4), (rng.uniform(5, 10), rng.uniform(3, 6), 0.9), ASH, rng, n=5, jag=0.2, floor=0.2)
        for _ in range(6):
            body.box(rng.uniform(-14, 40), rng.uniform(-10, 20), 1.2, 1.6, 1.6, 1.2, rng.uniform(0, 3), EMBER(rng))
    trunk_foot(body, 10.0)
    return {'body': body, 'roof': roof}


@structure('oldFir', [1, 0], foot='hull', hp=420)
def old_fir(state: int) -> dict:
    """A giant old fir: a thick straight trunk, tiers of dark drooping boughs to a high spire; 0 = its burnt snag."""
    rng = random.Random(1711)
    body, roof = PMesh(), PMesh()
    roots(body, 6, 7.5, 18, 9, rng, col=BARK_D if state else CHAR, seed_ang=0.8)
    if state:
        trunk(body, 7.0, 22, rng, col=BARK_D, n=3)
        tiers = ((14, 34, 30.0), (26, 46, 25.0), (38, 58, 20.0), (50, 70, 15.0), (62, 82, 10.0), (74, 94, 5.5))
        for i, (z0, z1, r) in enumerate(tiers):
            sides = 16
            for s in range(sides):
                a0, a1 = 2 * math.pi * s / sides, 2 * math.pi * (s + 1) / sides
                j0 = 1 + 0.2 * ((s * 5) % 3 - 1)
                j1 = 1 + 0.2 * (((s + 1) * 5) % 3 - 1)
                roof.face([(r * j0 * math.cos(a0), r * 0.85 * j0 * math.sin(a0), z0 - 3 * (j0 - 1) * 4), (r * j1 * math.cos(a1), r * 0.85 * j1 * math.sin(a1), z0 - 3 * (j1 - 1) * 4),
                           (0, 0, z1)], (FIR if s % 3 else FIR_L)(rng), np.array([0, 0, z0 + 1]))
            roof.face([(r * math.cos(2 * math.pi * s / 16), r * 0.85 * math.sin(2 * math.pi * s / 16), z0) for s in range(16)], FIR(rng), np.array([0, 0, z0 + 5]))
    else:
        trunk(body, 7.0, 40, rng, col=CHAR, n=5)
        for k, z in enumerate((14, 20, 27, 33, 38)):
            a = k * 2.3
            bar(body, (0, 0, z), (12 * math.cos(a), 10 * math.sin(a), z - 3), 1.8, CHAR(rng))
        for k in range(5):
            a = k * 2 * math.pi / 5
            bar(body, (4 * math.cos(a), 3 * math.sin(a), 40), (3 * math.cos(a), 2.4 * math.sin(a), 43 + 3 * (k % 2)), 2.6, CHAR(rng))
        for _ in range(8):
            lump(body, (rng.uniform(-24, 24), rng.uniform(-14, 20), 0.4), (rng.uniform(5, 10), rng.uniform(3, 6), 0.9), ASH, rng, n=5, jag=0.2, floor=0.2)
        for _ in range(5):
            body.box(rng.uniform(-16, 16), rng.uniform(-8, 14), 1.2, 1.6, 1.6, 1.2, rng.uniform(0, 3), EMBER(rng))
    trunk_foot(body, 8.0)
    return {'body': body, 'roof': roof}


# --- young trees: Tracks and Heavies flatten them; the canopy fades -------------------------------------------------------------

@structure('youngTree', [1, 0], foot='hull', hp=60, flattenable=True)
def young_tree(state: int) -> dict:
    """A young birch: a slim white trunk, a light airy crown; 0 = pushed flat to the east."""
    rng = random.Random(1721)
    body, roof = PMesh(), PMesh()
    if state:
        trunk(body, 2.4, 30, rng, col=BIRCH, lean=(1.5, -1.0), taper=0.3, n=4)
        for z in (5, 11, 17, 23):
            body.box(0.3 * z / 30, -2.0 - 0.03 * z, z, 3, 0.6, 1.4, 0, BIRCH_D(rng))
        for a, z in ((0.4, 22), (2.8, 25), (-1.4, 28)):
            bar(body, (1, -0.6, z), (9 * math.cos(a), 7 * math.sin(a), z + 8), 1.2, BIRCH(rng))
        for (dx, dy, dz, r) in ((1, -1, 40, 12), (-9, 3, 34, 9), (10, 2, 35, 9), (-3, -9, 44, 8), (5, 8, 31, 8)):
            lump(roof, (dx, dy, dz), (r, r * 0.9, r * 0.8), LEAF_LIGHT, rng, n=7, jag=0.2)
    else:
        cylinder(body, (0, 0), 2.4, 0, 3, BIRCH, rng, sides=8, top=lambda r: hls(0.1, 0.4, 0.6))
        log(body, (2, 0, 2.4), (30, 4, 2.4), 2.2, rng, col=BIRCH, end=None)
        for (dx, dy, r) in ((36, 4, 10), (30, 11, 7), (40, -4, 7)):
            lump(body, (dx, dy, 1.6), (r, r * 0.75, 3), LEAF_LIGHT, rng, n=6, jag=0.25, floor=0.4)
        for _ in range(4):
            bar(body, (rng.uniform(8, 26), rng.uniform(-2, 8), 2), (rng.uniform(20, 36), rng.uniform(-8, 14), 1), 0.8, BIRCH(rng))
    trunk_foot(body, 3.0)
    return {'body': body, 'roof': roof}


@structure('youngSpruce', [1, 0], foot='hull', hp=60, flattenable=True)
def young_spruce(state: int) -> dict:
    """A young spruce, dense and dark to the ground; 0 = pushed flat to the east."""
    rng = random.Random(1731)
    body, roof = PMesh(), PMesh()
    if state:
        cylinder(body, (0, 0), 2.0, 0, 8, BARK_D, rng, sides=8)
        for z0, z1, r in ((3, 21, 17.0), (12, 31, 13.5), (21, 40, 10.0), (30, 49, 7.0), (40, 57, 3.8)):
            sides = 14
            for s in range(sides):
                a0, a1 = 2 * math.pi * s / sides, 2 * math.pi * (s + 1) / sides
                j0 = 1 + 0.18 * ((s * 7) % 3 - 1)
                j1 = 1 + 0.18 * (((s + 1) * 7) % 3 - 1)
                roof.face([(r * j0 * math.cos(a0), r * 0.85 * j0 * math.sin(a0), z0), (r * j1 * math.cos(a1), r * 0.85 * j1 * math.sin(a1), z0), (0, 0, z1)],
                          (FIR if s % 2 else FIR_L)(rng), np.array([0, 0, z0 + 1]))
            roof.face([(r * math.cos(2 * math.pi * s / sides), r * 0.85 * math.sin(2 * math.pi * s / sides), z0) for s in range(sides)], FIR(rng), np.array([0, 0, z0 + 5]))
    else:
        cylinder(body, (0, 0), 2.0, 0, 3.5, BARK_D, rng, sides=8, top=lambda r: hls(0.09, 0.4, 0.55))
        log(body, (2, 0, 2.2), (24, -3, 2.2), 1.8, rng, col=BARK_D, end=None)
        for k, r in enumerate((10, 8.5, 7, 5, 3.5)):
            lump(body, (8 + k * 6, -1 - k * 0.5, 1.5), (r * 0.6, r, 3.2), FIR, rng, n=6, jag=0.25, floor=0.4)
    trunk_foot(body, 2.5)
    return {'body': body, 'roof': roof}


# --- fallen logs, stumps and undergrowth -----------------------------------------------------------------------------------------

def fallen_log(state: int) -> dict:
    """A great log lying east-west: its root plate at the west end, broken limbs, moss and fungus shelves; low and solid.
    0 = sawn through in the middle and pushed apart (a felled road cleared): two halves with fresh-cut faces, sawdust."""
    rng = random.Random(1741)
    m = PMesh()
    r, x0, x1 = 7.0, -44.0, 46.0
    if state:
        log(m, (x0, 0, r), (x1, 2, r - 0.6), r, rng, col=LOG, end=WOOD_END_D, ends=(False, True))
        m.solid_poly([(x0, -r), (x1, -r + 2), (x1, r + 2), (x0, r)])
    else:
        log(m, (x0, -2, r), (-4, -6, r - 0.3), r, rng, col=LOG, end=WOOD_END, ends=(False, True))
        log(m, (6, 8, r - 0.3), (x1, 10, r - 0.6), r, rng, col=LOG, end=WOOD_END, ends=(True, True))
        for _ in range(8):
            lump(m, (rng.uniform(-8, 8), rng.uniform(-4, 14), 0.3), (rng.uniform(3, 6), rng.uniform(2, 4), 0.8), SAWDUST, rng, n=4, jag=0.2, floor=0.2)
        m.solid_poly([(x0, -2 - r), (-4, -6 - r), (-4, -6 + r), (x0, -2 + r)])
        m.solid_poly([(6, 8 - r), (x1, 10 - r), (x1, 10 + r), (6, 8 + r)])
    # The root plate: a disc of roots and earth standing up at the west end.
    for k in range(10):
        a = 2 * math.pi * k / 10
        bar(m, (x0 - 1, 0, r), (x0 - 3, 13 * math.cos(a), r + 11 * math.sin(a) + 2), 2.4, BARK_D(rng))
    lump(m, (x0 - 3, 0, r + 1), (2.5, 9, 8), lambda q: hls(0.07, 0.3, 0.2), rng, n=6, jag=0.25, floor=0.2)
    sx = 1 if state else 0
    for (x, y) in ((-24, -3), (8 * sx + 14, 0), (32, 3)):
        lump(m, (x, y, 2 * r - 0.6), (6, 4, 1.4), MOSS, rng, n=5, jag=0.2)
    for (x, a) in ((-12, 0.9), (22, -1.0), (36, 1.2)):
        bar(m, (x, 2, r + 2), (x + 8 * math.cos(a), 2 + 10 * math.sin(a), r + 6), 1.6, LOG_D(rng))
    for x in (-30, 26):
        lump(m, (x, r + 0.6, r), (4, 1.6, 0.8), WOOD_END, rng, n=4)  # bracket fungus shelves on the south side
    return {'body': m}


structure('fallenLog', [1, 0], foot='runs', hp=160)(fallen_log)
structure('fallenLogV', [1, 0], foot='runs', hp=160)(lambda s: {k: rotate(m, math.pi / 2) for k, m in fallen_log(s).items()})


@structure('stump', [1], foot='hull', hp=0)
def stump(state: int) -> dict:
    """A cut stump: the pale sawn top with its rings, roots over the ground, a moss cushion and a little fungus."""
    rng = random.Random(1751)
    m = PMesh()
    roots(m, 6, 8, 15, 5, rng, col=BARK_OLD)
    cylinder(m, (0, 0), 8.0, 0, 9, BARK_OLD, rng, sides=14, ry=6.6, top=WOOD_END)
    cylinder(m, (0, 0), 5.0, 9, 9.15, WOOD_END_D, rng, sides=12, ry=4.1, top=WOOD_END_D)
    cylinder(m, (0, 0), 2.6, 9.15, 9.3, WOOD_END, rng, sides=10, ry=2.2, top=WOOD_END)
    lump(m, (-6, 4, 4), (3, 2, 3), MOSS, rng, n=5, jag=0.2)
    m.box(7, 3, 6, 4, 2, 0.8, 0.4, hls(0.09, 0.45, 0.62))
    trunk_foot(m, 8.0)
    return {'body': m}


@structure('undergrowth', [1, 0], foot='hull', hp=30, flattenable=True, cover=True)
def undergrowth(state: int) -> dict:
    """A dense thicket of ferns and brambles you can hide a tank in; 0 = crushed flat."""
    rng = random.Random(1761)
    body, roof = PMesh(), PMesh()
    if state:
        for (dx, dy, dz, r) in ((0, 0, 9, 12), (-14, 3, 7, 9), (14, 2, 7, 10), (4, 9, 6, 9), (-6, -7, 10, 9), (9, -6, 9, 8), (-18, -3, 5, 7), (20, -2, 5, 7)):
            lump(roof, (dx, dy, dz), (r, r * 0.8, r * 0.75), BRAMBLE, rng, n=7, jag=0.22, floor=0.3)
        # Fern fronds arching out over the thicket's skirt.
        for k in range(16):
            a = 2 * math.pi * k / 16 + rng.uniform(-0.15, 0.15)
            rr = rng.uniform(14, 20)
            base = (rr * 0.5 * math.cos(a), rr * 0.4 * math.sin(a), rng.uniform(6, 10))
            tip = (rr * 1.35 * math.cos(a), rr * 0.9 * math.sin(a), 1.0)
            mid = ((base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2, base[2] + 2)
            for p, q in ((base, mid), (mid, tip)):
                bar(roof, p, q, 3.2, FERN(rng))
    else:
        for (dx, dy, r) in ((0, 0, 13), (-14, 3, 9), (14, 2, 10), (4, 8, 8), (-6, -6, 8)):
            lump(body, (dx, dy, 1), (r * 1.1, r * 0.8, 2.4), BRAMBLE, rng, n=6, jag=0.3, floor=0.3)
        for k in range(10):
            a = 2 * math.pi * k / 10
            bar(body, (6 * math.cos(a), 4 * math.sin(a), 1.2), (24 * math.cos(a), 15 * math.sin(a), 0.6), 3.0, FERN(rng))
    body.solid_poly([(-20, -10), (20, -10), (20, 10), (-20, 10)])
    return {'body': body, 'roof': roof}


# --- the Iron Hive's logging works ----------------------------------------------------------------------------------------------

def hex_plate(m: PMesh, cx: float, cy: float, z: float, r: float, rng: random.Random, col=HIVE_L, h: float = 0.6) -> None:
    """A raised hexagonal panel lying flat (the Hive's honeycomb mark)."""
    pts = [(cx + r * math.cos(math.pi / 6 + k * math.pi / 3), cy + r * 0.86 * math.sin(math.pi / 6 + k * math.pi / 3)) for k in range(6)]
    inside = np.array([cx, cy, z])
    for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]):
        m.face([(ax, ay, z), (bx, by, z), (bx, by, z + h), (ax, ay, z + h)], col(rng), inside)
    m.face([(x, y, z + h) for x, y in pts], col(rng), inside)


def hex_wall_plate(m: PMesh, cx: float, y: float, cz: float, r: float, rng: random.Random, col=HIVE_L, out: float = 0.6) -> None:
    """A hexagonal panel standing on a south-facing wall at y."""
    pts = [(cx + r * math.cos(k * math.pi / 3), cz + r * math.sin(k * math.pi / 3)) for k in range(6)]
    inside = np.array([cx, y - 2, cz])
    for (ax, az), (bx, bz) in zip(pts, pts[1:] + pts[:1]):
        m.face([(ax, y, az), (bx, y, bz), (bx, y + out, bz), (ax, y + out, az)], col(rng), inside)
    m.face([(x, y + out, z) for x, z in pts], col(rng), inside)


def saw_blade(m: PMesh, cx: float, cy: float, z: float, r: float, rng: random.Random, teeth: int = 16, phase: float = 0.0) -> None:
    """A big circular saw blade standing upright in the x-z plane (a sawmill's), teeth round its rim."""
    inside = np.array([cx, cy - 3, z])
    rim = [(cx + r * math.cos(2 * math.pi * k / 24), z + r * math.sin(2 * math.pi * k / 24)) for k in range(24)]
    for yy, sgn in ((cy - 0.4, -1), (cy + 0.4, 1)):
        m.face([(x, yy, zz) for x, zz in rim], STEEL(rng), np.array([cx, cy - sgn * 3, z]))
    for k in range(teeth):
        a = 2 * math.pi * (k + phase) / teeth
        p = (cx + r * math.cos(a), z + r * math.sin(a))
        q = (cx + (r + 2.2) * math.cos(a + 0.12), z + (r + 2.2) * math.sin(a + 0.12))
        o = (cx + r * math.cos(a + 0.3), z + r * math.sin(a + 0.3))
        m.face([(p[0], cy + 0.5, p[1]), (q[0], cy + 0.5, q[1]), (o[0], cy + 0.5, o[1])], STEEL(rng), inside)
    cylinder(m, (cx, cy), 2.0, z - 0.1, z + 0.1, HIVE_D, rng, sides=8)


@structure('sawmill', [2, 1, 0], foot='hull', hp=600)
def sawmill(state: int) -> dict:
    """The Hive's sawmill: an open iron shed on hex-plated posts over a saw bench with a great circular saw, a log on the carriage,
    sawdust heaps, an orange lamp; its pitched corrugated-iron roof fades. 1 = the roof holed, a post bent; 0 = the roof down,
    the saw bench wrecked and burning."""
    rng = random.Random(1771)
    body, roof = PMesh(), PMesh()
    w, d, h = 120.0, 64.0, 30.0
    x0, x1, y0, y1 = -w / 2, w / 2, -d / 2, d / 2
    # Concrete-and-sawdust floor (takes the clearing ground after paint).
    body.floor(0, 0, 0.5, w - 4, d - 4, 1.0, 0, SAWDUST(rng))
    # Posts: hex-plated iron columns at the corners and along the long sides; a low back wall of iron plates to the north.
    posts = [(x, y) for x in (x0 + 4, -20, 20, x1 - 4) for y in (y0 + 4, y1 - 4)]
    for i, (x, y) in enumerate(posts):
        if state == 0 and i in (2, 5, 7):
            bar(body, (x, y, 0), (x + 8, y + 10, 4), 3.4, HIVE(rng))
            continue
        top = h if not (state == 1 and i == 5) else h - 8
        body.box(x, y, top / 2, 4, 4, top, 0, HIVE(rng))
        body.box(x, y, 2, 6, 6, 4, 0, HIVE_D(rng))
        body.solid_poly([(x - 2.5, y - 2.5), (x + 2.5, y - 2.5), (x + 2.5, y + 2.5), (x - 2.5, y + 2.5)])
    back = h * (0.55 if state else 0.3)
    body.box(0, y0 + 2, back / 2, w - 8, 2.4, back, 0, HIVE(rng))
    for k in range(5):
        hex_wall_plate(body, -44 + k * 22, y0 + 3.3, back * 0.55, 5.5, rng)
    body.solid_poly([(x0 + 4, y0 + 0.8), (x1 - 4, y0 + 0.8), (x1 - 4, y0 + 3.2), (x0 + 4, y0 + 3.2)])
    # The saw bench: a long iron carriage track east-west, the blade standing up in its housing, a log on the carriage.
    body.box(0, 4, 4, 100, 12, 8, 0, HIVE_D(rng))
    for x in np.arange(-48, 49, 8):
        body.box(x, 4, 8.3, 1.4, 12, 0.6, 0, STEEL(rng))
    if state:
        saw_blade(body, 4, 4, 14, 11, rng)
        body.box(4, 4, 10, 10, 6, 6, 0, HIVE(rng))
        cylinder(body, (4, -4), 3.5, 8, 16, HIVE_L, rng, sides=10, top=TRIM)
        log(body, (-46, 4, 14), (-12, 4, 14), 5.5, rng, col=LOG, end=WOOD_END)
        log(body, (18, 4, 13), (44, 4, 13), 5.0, rng, col=LOG, end=WOOD_END)
        cylinder(body, (-30, 4), 1.2, 8, 9.5, GLOW, rng, sides=6)
    else:
        body.box(4, 6, 6, 18, 10, 4, 0.5, CHAR(rng), (0.3, 0.2))
        log(body, (-46, 8, 6), (-18, 14, 4), 5.5, rng, col=CHAR, end=CHAR_L)
        for _ in range(5):
            body.box(rng.uniform(-30, 30), rng.uniform(-6, 18), 2, 1.6, 1.6, 1.2, rng.uniform(0, 3), EMBER(rng))
    # Sawdust heaps by the saw and out the front, planks stacked at the east end.
    for (x, y, r) in ((14, 18, 8), (24, 22, 6), (-6, 20, 5)):
        lump(body, (x, y, 0.5), (r, r * 0.7, r * 0.45), SAWDUST, rng, n=6, jag=0.15, floor=0.5)
    for k in range(4):
        body.box(46, 18, 1.2 + k * 1.8, 18, 12, 1.6, 0.05 * k, (LOG if k % 2 else WOOD_END_D)(rng))
    # A lamp on the front middle post's top.
    if state:
        cylinder(body, (-20, y1 - 4), 2.4, h, h + 3, GLOW, rng, sides=8, top=GLOW)
    # The roof: pitched corrugated iron along x, an orange ridge strip; holes in state 1; state 0 has fallen sheets on the floor.
    ridge = h + 12
    if state:
        keep = None if state == 2 else holes_in([(18, 6, 10), (-34, -6, 8)])
        for side in (-1, 1):
            ys = np.arange(0, d / 2 + 6, 3.0)
            for x in np.arange(x0 - 4, x1 + 4, 6.0):
                for ya, yb in zip(ys, ys[1:]):
                    if keep and not keep(x + 3, side * (ya + yb) / 2):
                        continue
                    za, zb = ridge - (ridge - h) * ya / (d / 2), ridge - (ridge - h) * yb / (d / 2)
                    col = (HIVE if (ya // 3) % 2 else HIVE_L)(rng)
                    pts = [(x, side * ya, za), (x + 6, side * ya, za), (x + 6, side * yb, zb), (x, side * yb, zb)]
                    roof.face(pts, col, np.array([x + 3, 0, h - 5]))
        roof.box(0, 0, ridge + 0.6, w + 8, 3, 1.4, 0, TRIM(rng))
        for k in range(4):
            hex_plate(roof, -42 + k * 28, 14, ridge - 9.2, 4.5, rng, col=TRIM, h=0.5)
    else:
        for (x, y, a) in ((-30, 0, 0.3), (10, 8, -0.2), (36, -4, 0.5)):
            body.box(x, y, 3, 30, 20, 1.2, a, HIVE(rng), (0.25, 0.1))
    return {'body': body, 'roof': roof}


def log_stack(m: PMesh, rows: list[int], r: float, length: float, rng: random.Random, x: float = 0.0, y: float = 0.0, ang: float = 0.0) -> None:
    """Logs stacked in a pyramid lying along `ang`, rows of n logs from the bottom, end-on to the south viewer when ang = pi/2."""
    ca, sa = math.cos(ang), math.sin(ang)
    for i, n in enumerate(rows):
        z = r + i * r * 1.7
        for j in range(n):
            off = (j - (n - 1) / 2) * 2 * r + rng.uniform(-0.3, 0.3)
            cx, cy = x - sa * off, y + ca * off
            ln = length + rng.uniform(-3, 3)
            log(m, (cx - ca * ln / 2, cy - sa * ln / 2, z), (cx + ca * ln / 2, cy + sa * ln / 2, z), r, rng, col=LOG, end=WOOD_END)


@structure('logPile', [1, 0], foot='hull', hp=220)
def log_pile(state: int) -> dict:
    """Felled trunks stacked by the Hive between iron stakes, chained down: solid cover. 0 = blown apart, logs strewn."""
    rng = random.Random(1781)
    m = PMesh()
    if state:
        log_stack(m, [5, 4, 3], 4.8, 64, rng)
        for x in (-30, 30):
            for y in (-14, 14):
                m.box(x, y, 9, 2.4, 2.4, 18, 0, HIVE(rng))
            bar(m, (x, -14, 15), (x, 14, 15), 0.9, CHAIN(rng))
            m.box(x, 16, 16, 2.6, 0.6, 2.6, 0, GLOW(rng))
        m.solid_poly([(-32, -15), (32, -15), (32, 15), (-32, 15)])
    else:
        for k in range(8):
            a = rng.uniform(-0.6, 0.6) + (k % 2) * math.pi / 2 * 0.3
            cx, cy = rng.uniform(-30, 30), rng.uniform(-18, 22)
            ln = rng.uniform(30, 56)
            log(m, (cx - math.cos(a) * ln / 2, cy - math.sin(a) * ln / 2, 4.6), (cx + math.cos(a) * ln / 2, cy + math.sin(a) * ln / 2, 4.6), 4.6, rng,
                col=LOG if k % 3 else CHAR, end=WOOD_END if k % 3 else CHAR_L)
        for x in (-30, 30):
            bar(m, (x, -14, 0), (x + 6, -10, 6), 2.4, HIVE(rng))
        m.solid_poly([(-20, -8), (20, -8), (20, 8), (-20, 8)])
    return {'body': m}


@structure('hiveTower', [2, 1, 0], foot='hull', hp=420)
def hive_tower(state: int) -> dict:
    """The Hive's watchtower: four splayed iron legs braced in a lattice, a hexagonal cabin with slit windows glowing orange, a
    searchlight and a stub aerial; the cabin and its roof fade. 1 = the cabin holed, the light out; 0 = toppled to the east."""
    rng = random.Random(1791)
    body, roof = PMesh(), PMesh()
    H = 52.0
    legs = [(-12, -10), (12, -10), (12, 10), (-12, 10)]
    if state:
        for (x, y) in legs:
            bar(body, (x, y, 0), (x * 0.55, y * 0.55, H), 2.6, HIVE(rng))
            body.box(x, y, 1.5, 6, 6, 3, 0, HIVE_D(rng))
        for z in (12, 26, 40):
            f = 1 - 0.45 * z / H
            for (a, b) in zip(legs, legs[1:] + legs[:1]):
                bar(body, (a[0] * f, a[1] * f, z), (b[0] * f, b[1] * f, z), 1.2, HIVE_L(rng))
                bar(body, (a[0] * f, a[1] * f, z), (b[0] * (f - 0.13), b[1] * (f - 0.13), z + 13), 0.9, HIVE_D(rng))
        # A ladder up the south face.
        for z in np.arange(3, H, 4):
            f = 1 - 0.45 * z / H
            body.box(0, 10 * f + 1, z, 7, 0.8, 0.8, 0, HIVE_L(rng))
        for sx in (-3.5, 3.5):
            bar(body, (sx, 11, 0), (sx, 6.5, H), 0.9, HIVE_L(rng))
        # The cabin: a hexagonal room with a walkway, slit windows, a flat hex roof, searchlight and aerial.
        hexpts = lambda r: [(r * math.cos(k * math.pi / 3), r * 0.86 * math.sin(k * math.pi / 3)) for k in range(6)]  # noqa: E731
        lo, ring = hexpts(16), hexpts(19)
        roof.face([(x, y, H) for x, y in ring], HIVE_D(rng), np.array([0, 0, H - 4]))
        for (ax, ay), (bx, by) in zip(ring, ring[1:] + ring[:1]):
            roof.face([(ax, ay, H - 1.6), (bx, by, H - 1.6), (bx, by, H), (ax, ay, H)], HIVE(rng), np.array([0, 0, H - 1]))
        wall_top = H + 14
        for k, ((ax, ay), (bx, by)) in enumerate(zip(lo, lo[1:] + lo[:1])):
            roof.face([(ax, ay, H), (bx, by, H), (bx, by, wall_top), (ax, ay, wall_top)], HIVE(rng), np.array([0, 0, H + 7]))
            if ay + by > 0 and not (state == 1 and k == 1):
                mx, my = (ax + bx) / 2, (ay + by) / 2
                nx, ny = mx / 15, my / 15
                roof.face([(ax * 0.75 + bx * 0.25 + nx * 0.4, ay * 0.75 + by * 0.25 + ny * 0.4, H + 8), (ax * 0.25 + bx * 0.75 + nx * 0.4, ay * 0.25 + by * 0.75 + ny * 0.4, H + 8),
                           (ax * 0.25 + bx * 0.75 + nx * 0.4, ay * 0.25 + by * 0.75 + ny * 0.4, H + 11), (ax * 0.75 + bx * 0.25 + nx * 0.4, ay * 0.75 + by * 0.25 + ny * 0.4, H + 11)],
                          (GLOW if state == 2 else (lambda q: hls(0.0, 0.0, 0.08)))(rng), np.array([0, 0, H + 9]))
        top = hexpts(18)
        roof.face([(x, y, wall_top + 3) for x, y in top], HIVE_L(rng), np.array([0, 0, wall_top]))
        for (ax, ay), (bx, by) in zip(top, top[1:] + top[:1]):
            roof.face([(ax, ay, wall_top), (bx, by, wall_top), (bx, by, wall_top + 3), (ax, ay, wall_top + 3)], TRIM(rng), np.array([0, 0, wall_top + 1]))
        hex_plate(roof, 0, 0, wall_top + 3, 7, rng, col=HIVE, h=0.8)
        if state == 2:
            cylinder(roof, (6, 6), 3.2, wall_top + 3, wall_top + 8, HIVE_D, rng, sides=10, top=lambda q: hls(0.13, 0.6, 0.8))
            bar(roof, (-8, -4, wall_top + 3), (-9, -5, wall_top + 18), 0.8, HIVE_L(rng))
        else:
            for _ in range(4):
                roof.box(rng.uniform(-10, 10), rng.uniform(-6, 8), wall_top + 3.5, 5, 4, 0.8, rng.uniform(0, 3), CHAR(rng))
        body.solid_poly([(-13, -11), (13, -11), (13, 11), (-13, 11)])
    else:
        # Toppled east: the legs bent at the knee, the cabin crushed on its side, glass and plates strewn.
        for (x, y) in legs:
            bar(body, (x, y, 0), (x * 0.8, y * 0.8, 10), 2.6, HIVE(rng))
            bar(body, (x * 0.8, y * 0.8, 10), (x * 0.3 + 40, y * 0.5, 3), 2.6, HIVE(rng))
        lump(body, (58, 0, 8), (14, 12, 8), HIVE, rng, n=6, jag=0.25, floor=0.4)
        hex_plate(body, 58, -2, 14, 6, rng, col=TRIM, h=0.6)
        for _ in range(6):
            body.box(rng.uniform(30, 80), rng.uniform(-16, 16), 0.8, 4, 3, 1, rng.uniform(0, 3), HIVE_L(rng))
        body.solid_poly([(-13, -11), (13, -11), (13, 11), (-13, 11)])
    return {'body': body, 'roof': roof}


# --- log bridges: ground layer, drawn under everything; the Timber Bridges raid blows them ---------------------------------------

LOGBRIDGE = {'l': 168.0, 'w': 64.0}


def log_bridge(state: int) -> dict:
    """Round logs laid across two stringers on timber trestles, low log curbs along both sides (so it can lie under tanks),
    iron Hive brackets. 1 = scorched, two logs gone; 0 = blown in the middle: the ends sag into the gap, splinters."""
    rng = random.Random(1801)
    m = PMesh()
    l, w = LOGBRIDGE['l'], LOGBRIDGE['w']
    gap = (lambda x: -26 < x < 22) if state == 0 else (lambda x: x in (-4.0, 4.0)) if state == 1 else (lambda x: False)
    x = -l / 2 + 4
    while x < l / 2:
        if not gap(round(x, 1)):
            sag = 0.0
            if state == 0 and abs(x) < 50:
                sag = -(50 - abs(x)) * 0.25
            col = (LOG if int(x / 8) % 2 else LOG_D) if not (state < 2 and abs(x) < 34) else CHAR
            log(m, (x, -w / 2 + 2, -2.0 + sag), (x, w / 2 - 2, -2.0 + sag), 3.9, rng, col=col, end=WOOD_END_D)
        x += 8
    for y in (-w / 2 + 1, w / 2 - 1):
        for x0, x1 in ((-l / 2, -26), (22, l / 2)) if state == 0 else ((-l / 2, l / 2),):
            log(m, (x0, y, 1.8), (x1, y, 1.8), 2.8, rng, col=LOG_D, end=WOOD_END)
        for x in (-l / 2 + 10, -30, 30, l / 2 - 10):
            if state == 0 and -30 < x < 30:
                continue
            m.box(x, y, 2.6, 4, 4, 1.2, 0, HIVE(rng))
            m.box(x, y, 3.4, 1.4, 1.4, 0.6, 0, TRIM(rng))
    # Trestles under the south edge, seen below the deck.
    for x in (-l / 2 + 34, l / 2 - 34):
        if state == 0 and abs(x) < 40:
            continue
        for dx in (-5, 5):
            bar(m, (x + dx, w / 2 - 2, -16), (x + dx * 0.4, w / 2 - 2, -4), 3.2, LOG_D(rng))
        bar(m, (x - 6, w / 2 - 2, -12), (x + 6, w / 2 - 2, -6), 1.6, LOG_D(rng))
    if state == 0:
        for _ in range(9):
            a = rng.uniform(0, math.pi)
            cx, cy = rng.uniform(-24, 20), rng.uniform(-w / 2, w / 2)
            bar(m, (cx, cy, -10), (cx + 10 * math.cos(a), cy + 6 * math.sin(a), -12), 1.6, CHAR(rng))
    return {'body': m}


structure('logBridge', [2, 1, 0], foot='hull', hp=500)(log_bridge)
structure('logBridgeV', [2, 1, 0], foot='hull', hp=500)(lambda s: {k: rotate(m, math.pi / 2) for k, m in log_bridge(s).items()})


# --- the Hive capture flag: the desert flagpole's model -------------------------------------------------------------------------

structure('flagHive', [1], foot='hull', hp=0)(lambda s: flagpole((HIVE_CLOTH, HIVE_MARK)))
