"""Dust Flats, second batch: dune crests, north-south cliff runs and a corner, adobe walls and the Crow compound gate,
desert scrub, the oil pipeline and its valve station (Raid, level 13). Same projection and conventions as desert.py.

crowGate's states are its doors, not damage: 1 = shut (the doors block), 0 = open (swung in, the passage is clear).
"""
from __future__ import annotations

import math
import random

import numpy as np

from desert import ADOBE, BONE, CROW, DARK, OIL, SANDSTONE, SANDSTONE_L, TANKBAND, TANKSTEEL, strata
from farm import rotate, structure
from kit import FIELDSTONE, PLANK, TIMBER, PMesh, blocks, cylinder, hls, lump, panel, rubble, tone
from props import SOOT, STEEL, bar, transformed

DUNE = tone(0.1, 0.45, 0.6, 0.008, 0.02)
SAGE = tone(0.2, 0.18, 0.46, 0.02, 0.05)
SAGE_D = tone(0.17, 0.2, 0.34, 0.02, 0.04)
TWIG = tone(0.08, 0.25, 0.36, 0.01, 0.04)
PIPE = tone(0.1, 0.12, 0.42, 0.01, 0.03)
IRON = lambda r: hls(0.06, 0.1, 0.2)  # noqa: E731
RED = lambda r: hls(0.0, 0.65, 0.42)  # noqa: E731


def turned(fn):
    """A builder's pieces a quarter turn round, for the north-south version of an east-west piece."""
    return lambda s: {k: rotate(m, math.pi / 2) for k, m in fn(s).items()}


# --- dune crests: a low sand ridge, gentle to the north, a sharp crest and a steeper slip face to the south ---------------

def dune(state: int) -> dict:
    m = PMesh()
    rng = random.Random(931)
    L, D, H = 124.0, 40.0, 15.0
    nx, ny = 48, 18
    def height(x: float, y: float) -> float:
        fx = x / (L / 2)
        wide = max(0.0, 1 - fx * fx) ** 0.5  # the ridge narrows to points at its ends
        if wide <= 0.02:
            return 0.0
        crest = 3.0 * math.sin(x * 0.05 + 0.6) * wide  # the crest snakes a little
        c = y - crest
        if c < 0:
            prof = max(0.0, 1 + c / (D * 0.6 * (0.35 + 0.65 * wide))) ** 1.25
        else:
            prof = max(0.0, 1 - c / (D * 0.4 * (0.35 + 0.65 * wide))) ** 0.85
        return H * wide ** 0.8 * prof
    xs = np.linspace(-L / 2, L / 2, nx + 1)
    ys = np.linspace(-D / 2 - 2, D / 2 + 2, ny + 1)
    for i in range(nx):
        for j in range(ny):
            pts = [(xs[i], ys[j]), (xs[i + 1], ys[j]), (xs[i + 1], ys[j + 1]), (xs[i], ys[j + 1])]
            zs = [height(x, y) for x, y in pts]
            if max(zs) < 0.4:
                continue
            q = [(x, y, max(z, 0.05)) for (x, y), z in zip(pts, zs)]
            col = DUNE(rng)
            m.face([q[0], q[1], q[2]], col, np.array([q[0][0], q[0][1], -30]))
            m.face([q[0], q[2], q[3]], col, np.array([q[0][0], q[0][1], -30]))
    m.solid_poly([(-L / 2 + 6, -D / 2 + 4), (L / 2 - 6, -D / 2 + 4), (L / 2 - 6, D / 2 - 4), (-L / 2 + 6, D / 2 - 4)])
    return {'body': m}


structure('dune', [1], foot='hull', hp=0)(dune)
structure('duneV', [1], foot='hull', hp=0)(turned(dune))


# --- the mesa: a north-south run (terraced on both long sides) and a square corner/end block ------------------------------

def mesa_run_v(state: int) -> dict:
    rng = random.Random(941)
    m = PMesh()
    L, W, H = 128.0, 44.0, 42.0
    beds = [(0, 8, 0.0), (8, 15, 2.0), (15, 24, 3.5), (24, 32, 5.0), (32, 38, 6.0), (38, H, 7.5)]
    for k, (z0, z1, inset) in enumerate(beds):
        r2 = random.Random(941 + k)
        ys = np.linspace(-L / 2, L / 2, 17)
        west = [(-W / 2 + inset + r2.uniform(-2.0, 2.0) * (0 < i < 16), y) for i, y in enumerate(ys)]
        east = [(W / 2 - inset + r2.uniform(-2.0, 2.0) * (0 < i < 16), y) for i, y in enumerate(ys)]
        outline = west + list(reversed(east))
        m.prism(outline, z0, z1, (SANDSTONE_L if k % 2 else SANDSTONE)(rng), tone(0.07, 0.36, 0.6, 0.01, 0.04)(rng))
    for _ in range(6):
        lump(m, (rng.uniform(-W / 2 + 10, W / 2 - 10), rng.uniform(-L / 2 + 6, L / 2 - 6), H + 1.2), (3.2, 2.6, 2.0), tone(0.2, 0.3, 0.38, 0.02, 0.04), rng, n=5, jag=0.2)
    for _ in range(8):
        side = rng.choice((-1, 1))
        lump(m, (side * (W / 2 + rng.uniform(1, 4)), rng.uniform(-L / 2 + 6, L / 2 - 6), 1.0), (rng.uniform(2, 4),) * 2 + (2.0,), SANDSTONE, rng, n=5, jag=0.25, floor=0)
    m.solid_poly([(-W / 2, -L / 2), (W / 2, -L / 2), (W / 2, L / 2), (-W / 2, L / 2)])
    return {'body': m}


def mesa_corner(state: int) -> dict:
    """A 44 x 44 block terraced on every side: closes the corner where an east-west run meets a north-south one, or caps an end."""
    rng = random.Random(951)
    m = PMesh()
    S, H = 44.0, 42.0
    beds = [(0, 8, 1.0), (8, 15, 0.92), (15, 24, 0.86), (24, 32, 0.8), (32, 38, 0.75), (38, H, 0.7)]
    sq = [(-S / 2 + S * t, -S / 2) for t in np.linspace(0, 1, 5)[:-1]] + [(S / 2, -S / 2 + S * t) for t in np.linspace(0, 1, 5)[:-1]] + \
         [(S / 2 - S * t, S / 2) for t in np.linspace(0, 1, 5)[:-1]] + [(-S / 2, S / 2 - S * t) for t in np.linspace(0, 1, 5)[:-1]]
    strata(m, sq, beds, rng, 951)
    m.runs = [[(-S / 2, -S / 2), (S / 2, -S / 2), (S / 2, S / 2), (-S / 2, S / 2)]]
    lump(m, (4, -4, H + 1.2), (3.2, 2.6, 2.0), tone(0.2, 0.3, 0.38, 0.02, 0.04), rng, n=5, jag=0.2)
    return {'body': m}


structure('mesaEdgeV', [1], foot='hull', hp=0)(mesa_run_v)
structure('mesaCorner', [1], foot='hull', hp=0)(mesa_corner)


# --- adobe walls: 64 px runs like the cement and fort walls -----------------------------------------------------------------

def adobe_wall(state: int, vertical: bool) -> dict:
    m = PMesh()
    rng = random.Random(961 + state)
    L, t, h = 64.0, 10.0, 25.0
    a, b = ((0, -L / 2), (0, L / 2)) if vertical else ((-L / 2, 0), (L / 2, 0))
    if state == 2:
        top, gone = (lambda s: h), None
    elif state == 1:
        top = lambda s: h - (8 if 36 < s < 54 else 0)  # noqa: E731
        gone = lambda c, s, z: abs(s - 20 - (z - 12) * 0.5) < 3 and 4 < z < 20  # noqa: E731
    else:
        top = lambda s: 0 if abs(s - 32) < 14 + 3 * math.sin(s * 0.7) else h * (0.5 + 0.25 * math.cos(s * 0.3))  # noqa: E731
        gone = None
    blocks(m, a, b, t, top, rng, ADOBE, bl=11, ch=5, gone=gone)
    if state:
        # A rounded mud cap along the top, a little proud of the wall.
        n = 8
        for i in range(n):
            s0, s1 = L * i / n, L * (i + 1) / n
            if top((s0 + s1) / 2) < h:
                continue
            mid = (s0 + s1) / 2 - L / 2
            cx, cy = (0, mid) if vertical else (mid, 0)
            lump(m, (cx, cy, h + 0.4), ((t / 2 + 0.6) if vertical else (s1 - s0) / 2 + 0.6, (s1 - s0) / 2 + 0.6 if vertical else (t / 2 + 0.6), 2.2), ADOBE, rng, n=5)
    if state < 2:
        if vertical:
            rubble(m, 10, 6, 5, 18, 12 if state else 40, random.Random(4), ADOBE, 5)
        else:
            rubble(m, 6 if state else 0, 10, 18, 5, 12 if state else 40, random.Random(4), ADOBE, 5)
    return {'body': m}


structure('adobeWallH', [2, 1, 0], foot='runs', hp=360)(lambda s: adobe_wall(s, False))
structure('adobeWallV', [2, 1, 0], foot='runs', hp=360)(lambda s: adobe_wall(s, True))


# --- the Crow compound gate (in an east-west wall): two adobe pillars, a timber lintel, plank doors --------------------------

@structure('crowGate', [1, 0], foot='runs', hp=0)
def crow_gate(state: int) -> dict:
    m = PMesh()
    rng = random.Random(971)
    t, h = 16.0, 38.0
    half, pw = 32.0, 18.0
    for cx in (-half - pw / 2, half + pw / 2):
        blocks(m, (cx - pw / 2, 0), (cx + pw / 2, 0), t, lambda s: h, rng, ADOBE, bl=9, ch=5)
        for k in (-1, 1):
            m.box(cx + k * 5, t / 2 - 3, h + 3, 5, 5, 6, 0, ADOBE(rng))
        # A bone-white skull plate and black feathers on each pillar's face.
        lump(m, (cx, t / 2 + 0.8, 26), (3.2, 1.0, 3.4), BONE, rng, n=5)
        for k in (-1, 1):
            m.box(cx + k * 4.5, t / 2 + 0.6, 24, 1.6, 0.8, 8, k * 0.4, CROW(rng), (0, k * 0.3))
    # The lintel beam and a ragged black banner hanging from it.
    m.box(0, 2, h - 3, 2 * half + 2 * pw, 6, 5, 0, TIMBER(rng))
    for x in np.arange(-half - pw + 4, half + pw, 9):
        m.box(x, 5.4, h - 3, 2.2, 1.2, 2.2, 0, IRON(rng))
    m.box(0, 5.6, h - 13, 18, 0.8, 15, 0, hls(0.7, 0.08, 0.14))
    lump(m, (0, 6.2, h - 11), (3.4, 0.8, 3.6), BONE, rng, n=5)
    # The doors: shut across the passage, or swung in (north) against the pillars.
    for side in (-1, 1):
        door = PMesh()
        for k in range(8):
            door.box(side * (k * 4 + 2), 0, 12, 3.8, 3, 24, 0, PLANK(rng))
        for z in (5, 19):
            door.box(side * 16, 1.6, z, 30, 0.6, 2, 0, IRON(rng))
        hinge = -side * half
        ang = 0.0 if state else -side * math.radians(82)
        door = transformed(door, lambda p, a=ang, hx=hinge: np.array([hx + p[0] * math.cos(a) - p[1] * math.sin(a), p[0] * math.sin(a) + p[1] * math.cos(a) - 1, p[2]]))
        m.add(door)
    m.solid_rect((-half - pw, 0), (-half, 0), 0, pw, t)
    m.solid_rect((half, 0), (half + pw, 0), 0, pw, t)
    if state:
        m.solid_rect((-half, 0), (half, 0), 0, 2 * half, 4)
    return {'body': m}


# --- desert scrub (cover, flattenable) --------------------------------------------------------------------------------------

@structure('scrub', [1, 0], foot='hull', hp=30, flattenable=True, cover=True)
def scrub(state: int) -> dict:
    rng = random.Random(981)
    body, roof = PMesh(), PMesh()
    if state:
        # Wiry twigs fanning up from the root, grey-green sage tufts on them, a few dry ones.
        for k in range(14):
            a = rng.uniform(0, 2 * math.pi)
            r = rng.uniform(6, 15)
            tip = (math.cos(a) * r, math.sin(a) * r * 0.75, rng.uniform(8, 15))
            bar(roof, (math.cos(a) * 2, math.sin(a) * 1.5, 0), tip, 0.9, TWIG(rng))
            lump(roof, tip, (rng.uniform(3, 4.6), rng.uniform(2.6, 3.8), rng.uniform(2.2, 3.2)), SAGE if k % 4 else SAGE_D, rng, n=5, jag=0.3)
        for (dx, dy, dz, r) in ((0, 0, 7, 7.5), (-8, 3, 5, 5.5), (8, 2, 5, 6)):
            lump(roof, (dx, dy, dz), (r, r * 0.8, r * 0.7), SAGE, rng, n=6, jag=0.28, floor=0.3)
    else:
        for k in range(10):
            a = rng.uniform(0, math.pi)
            body.box(math.cos(a) * 7 + 4, math.sin(a) * 4, 0.8, rng.uniform(8, 14), 1.0, 1.0, a + rng.uniform(-0.4, 0.4), TWIG(rng))
        for (dx, dy, r) in ((0, 0, 9), (9, 3, 6), (-8, 2, 6)):
            lump(body, (dx + 3, dy, 0.8), (r * 1.1, r * 0.8, 1.8), SAGE_D, rng, n=6, jag=0.35, floor=0.3)
    body.solid_poly([(-15, -8), (15, -8), (15, 8), (-15, 8)])
    return {'body': body, 'roof': roof}


# --- the oil pipeline (64 px runs, indestructible) and its valve station (Raid target, sits in a run) -----------------------

def pipe_run(m: PMesh, rng: random.Random, x0: float = -32.0, x1: float = 32.0, broken: tuple | None = None) -> None:
    """An east-west pipe on concrete saddles, flanged at both ends so runs join; `broken` (x0, x1) leaves a burst gap."""
    z, r = 8.0, 4.4
    sides = 12
    def seg(a: float, b: float) -> None:
        for i in range(sides):
            a0, a1 = 2 * math.pi * i / sides, 2 * math.pi * (i + 1) / sides
            p = lambda x, ang: (x, r * math.cos(ang), z + r * math.sin(ang))  # noqa: E731
            m.face([p(a, a0), p(a, a1), p(b, a1), p(b, a0)], PIPE(rng), np.array([(a + b) / 2, 0, z]))
    if broken:
        seg(x0, broken[0])
        seg(broken[1], x1)
    else:
        seg(x0, x1)
    for x in (x0 + 1.2, x1 - 1.2):
        for i in range(sides):
            a0, a1 = 2 * math.pi * i / sides, 2 * math.pi * (i + 1) / sides
            q = lambda xx, ang: (xx, (r + 1.2) * math.cos(ang), z + (r + 1.2) * math.sin(ang))  # noqa: E731
            m.face([q(x - 1.2, a0), q(x - 1.2, a1), q(x + 1.2, a1), q(x + 1.2, a0)], STEEL(rng), np.array([x, 0, z]))
    for x in np.arange(x0 + 12, x1 - 4, 20):
        m.box(x, 0, 2.4, 6, 12, 4.8, 0, hls(0.09, 0.08, 0.6))
        bar(m, (x, -r - 0.6, 7), (x, r + 0.6, 7), 1.0, IRON(rng))
    m.solid_rect((x0, 0), (x1, 0), 0, x1 - x0, 2 * r + 2)


def pipe(state: int) -> dict:
    m = PMesh()
    pipe_run(m, random.Random(991))
    return {'body': m}


structure('pipeH', [1], foot='runs', hp=0)(pipe)
structure('pipeV', [1], foot='runs', hp=0)(turned(pipe))


@structure('valve', [2, 1, 0], foot='hull', hp=260)
def valve(state: int) -> dict:
    """A valve station in a 64 px east-west pipe run: a manifold block, a big red handwheel, a gauge, a catwalk."""
    m = PMesh()
    rng = random.Random(1001)
    pipe_run(m, rng, broken=(-10, 10) if state == 0 else None)
    if state:
        m.box(0, 0, 9, 18, 18, 14, 0, TANKSTEEL(rng))
        m.box(0, 0, 16.5, 20, 20, 1.4, 0, TANKBAND(rng))
        cylinder(m, (0, 0), 2.2, 17, 25, IRON, rng, sides=8)
        # The handwheel, lying flat on its stem, spokes and rim.
        for i in range(12):
            a0, a1 = 2 * math.pi * i / 12, 2 * math.pi * (i + 1) / 12
            bar(m, (8 * math.cos(a0), 8 * math.sin(a0) * 0.9, 25.5), (8 * math.cos(a1), 8 * math.sin(a1) * 0.9, 25.5), 1.4, RED(rng))
        for i in range(4):
            a = math.pi / 4 + i * math.pi / 2
            bar(m, (0, 0, 25.5), (8 * math.cos(a), 8 * math.sin(a) * 0.9, 25.5), 0.9, RED(rng))
        # A pressure gauge on the south face, a warning plate, a small catwalk with a rail to the east.
        cylinder(m, (-5, 9.6), 2.6, 10, 11, lambda q: hls(0.12, 0.1, 0.85), rng, sides=10)
        panel(m, (5, 9), 5, 4, 9, hls(0.13, 0.8, 0.5), out=0.4)
        m.box(20, 10, 4, 14, 8, 1, 0, PLANK(rng))
        for x in (14, 26):
            bar(m, (x, 13.5, 0), (x, 13.5, 10), 0.7, hls(0.13, 0.7, 0.5))
        bar(m, (14, 13.5, 10), (26, 13.5, 10), 0.7, hls(0.13, 0.7, 0.5))
        if state == 1:
            for (x, z) in ((-6, 6), (4, 12)):
                m.box(x, 9.2, z, 3.5, 1, 3, 0, DARK(rng))
            lump(m, (2, 16, 0.3), (12, 6, 0.4), OIL, rng, n=6, floor=0.3)
    else:
        # Burst: the block blown open, the wheel thrown, the pipe torn and a burning pool of oil.
        for k in range(6):
            a = rng.uniform(0, 2 * math.pi)
            m.box(math.cos(a) * 9, math.sin(a) * 9, 3, rng.uniform(6, 10), rng.uniform(3, 6), rng.uniform(3, 6), a, (SOOT if k % 2 else TANKSTEEL)(rng), (rng.uniform(-0.5, 0.5), 0))
        for i in range(12):
            a0, a1 = 2 * math.pi * i / 12, 2 * math.pi * (i + 1) / 12
            bar(m, (24 + 8 * math.cos(a0), 16 + 6 * math.sin(a0), 1.2), (24 + 8 * math.cos(a1), 16 + 6 * math.sin(a1), 1.2), 1.4, RED(rng))
        for side in (-1, 1):
            bar(m, (side * 10, 0, 8), (side * 6, side * 4, 13), 3, SOOT(rng))
        lump(m, (0, 10, 0.4), (26, 12, 0.6), OIL, rng, n=8, floor=0.4)
        rubble(m, 0, 4, 18, 10, 30, rng, SOOT, 3)
    m.solid_poly([(-11, -11), (11, -11), (11, 11), (-11, 11)])
    return {'body': m}
