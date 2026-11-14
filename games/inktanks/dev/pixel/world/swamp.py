"""The Mirefen (chapter 3) structures as 3D models, in the field projection (native density-C pixels, origin = middle of the footprint).

Stilt huts (small and large, reed-thatch roofs that fade), reed clumps (cover, flattenable), a dead tree, a bald cypress
(canopy fades), boardwalks and a jetty (ground layer, like the bridge deck), boardwalk rope rails, a mooring post, a net
drying rack (flattenable), the sluice dam (Raid target for "Break the Dams"), the canal lock gate (level 29) and the Weasel capture flag (flagWeasel: the
desert flagpole's model, so it shares flagInk / flagCrow's canvas and anchor).

Rendered by build.py like the farm set; painted on their own sheets (swamp), see dev/pixel/swamp/build.py.
"""
from __future__ import annotations

import math
import random

import numpy as np

from desert import flagpole
from farm import boards, holes_in, rotate, structure, trunk_foot
from kit import FIELDSTONE, PMesh, blocks, cylinder, gable, gable_ends, hls, lump, panel, rubble, tone
from props import bar, transformed

WOOD = tone(0.08, 0.16, 0.36, 0.012, 0.05)        # weathered grey-brown planks
WOOD_D = tone(0.07, 0.18, 0.25, 0.01, 0.03)
WOOD_WET = tone(0.09, 0.2, 0.2, 0.01, 0.03)       # the dark wet foot of a pile
THATCH = tone(0.11, 0.38, 0.46, 0.015, 0.06)
THATCH_D = tone(0.1, 0.32, 0.34, 0.012, 0.04)
REED = tone(0.2, 0.36, 0.38, 0.02, 0.06)
REED_DRY = tone(0.13, 0.4, 0.52, 0.015, 0.05)
CATTAIL = tone(0.06, 0.45, 0.24, 0.01, 0.03)
DEADWOOD = tone(0.09, 0.08, 0.5, 0.012, 0.05)
CYPRESS_BARK = tone(0.05, 0.25, 0.3, 0.01, 0.04)
CYPRESS_LEAF = tone(0.27, 0.36, 0.3, 0.02, 0.05)
MOSS = tone(0.16, 0.1, 0.62, 0.02, 0.05)          # hanging grey-green moss
NET = tone(0.1, 0.22, 0.6, 0.01, 0.05)
ROPE = lambda r: hls(0.1, 0.32, 0.52)  # noqa: E731
DARK = lambda r: hls(0.07, 0.2, 0.1)  # noqa: E731
MUDDY = tone(0.08, 0.3, 0.22, 0.01, 0.03)
SPILL = lambda r: hls(0.42, 0.22, 0.55 + r.uniform(-0.04, 0.04))  # noqa: E731
IRON = tone(0.07, 0.15, 0.26, 0.01, 0.03)
TIMBER_BEAM = tone(0.07, 0.3, 0.3, 0.01, 0.03)
MUSTARD = lambda r: hls(0.12, 0.6, 0.5 + r.uniform(-0.02, 0.02))  # noqa: E731   the Weasels' colour (CLAN_COLOUR c9a23a)
WEASEL_MARK = lambda r: hls(0.07, 0.35, 0.18)  # noqa: E731


def lift(m: PMesh, dz: float) -> PMesh:
    out = transformed(m, lambda p: p + np.array([0.0, 0.0, dz]))
    out.runs = []
    return out


def pile(m: PMesh, x: float, y: float, z0: float, z1: float, r: float, rng: random.Random, lean: tuple = (0.0, 0.0)) -> None:
    """A round timber pile, its wet dark foot below the waterline."""
    cylinder(m, (x, y), r, z0, min(z1, 2.0), WOOD_WET, rng, sides=8)
    if z1 > 2.0:
        top = (x + lean[0], y + lean[1])
        if lean == (0.0, 0.0):
            cylinder(m, (x, y), r, 2.0, z1, WOOD_D, rng, sides=8, top=WOOD)
        else:
            bar(m, (x, y, 2.0), (top[0], top[1], z1), r * 1.7, WOOD_D(rng))


def deck(m: PMesh, x0: float, x1: float, y0: float, y1: float, z: float, rng: random.Random, plank: float = 4.0, along: str = 'y',
         gone=None) -> None:
    """A plank deck at height z (its top), planks running `along` (their long side), a little uneven."""
    if along == 'y':
        x = x0
        while x < x1 - 0.5:
            xa = min(x1, x + plank)
            if not (gone and gone((x + xa) / 2, (y0 + y1) / 2)):
                m.box((x + xa) / 2, (y0 + y1) / 2 + rng.uniform(-0.6, 0.6), z - 0.7 + rng.uniform(-0.15, 0.15), xa - x - 0.45, y1 - y0, 1.4, 0, WOOD(rng))
            x = xa
    else:
        y = y0
        while y < y1 - 0.5:
            ya = min(y1, y + plank)
            if not (gone and gone((x0 + x1) / 2, (y + ya) / 2)):
                m.box((x0 + x1) / 2 + rng.uniform(-0.6, 0.6), (y + ya) / 2, z - 0.7 + rng.uniform(-0.15, 0.15), x1 - x0, ya - y - 0.45, 1.4, 0, WOOD(rng))
            y = ya


def ladder(m: PMesh, x: float, y_top: float, z_top: float, rng: random.Random, run: float = 6.0) -> None:
    for lx in (x - 3, x + 3):
        bar(m, (lx, y_top + run, 0), (lx, y_top, z_top + 3), 1.1, WOOD_D(rng))
    for z in np.arange(3, z_top + 1, 3.5):
        f = z / (z_top + 3)
        bar(m, (x - 3, y_top + run * (1 - f), z), (x + 3, y_top + run * (1 - f), z), 0.8, WOOD(rng))


# --- stilt huts (reed-thatch roofs that fade) --------------------------------------------------------------------------------

def stilt_hut(state: int, pw: float, pd: float, hw: float, hd: float, h: float, ridge: float, seed: int, stilt: float = 12.0) -> dict:
    """A plank hut hw x hd, walls h high, on a deck pw x pd raised `stilt` on piles; the deck's south strip is a porch."""
    rng = random.Random(seed)
    body, roof = PMesh(), PMesh()
    x0, x1, y0, y1 = -pw / 2, pw / 2, -pd / 2, pd / 2
    hy0 = y0 + 3
    hy1 = hy0 + hd
    hx0, hx1 = -hw / 2, hw / 2
    t = 2.4
    standing = state > 0
    tilt = 0.0 if standing else 1.0
    # Piles: a grid under the deck, one leaning in the cracked state.
    xs = list(np.linspace(x0 + 3, x1 - 3, max(3, int(pw / 26) + 2)))
    ys = list(np.linspace(y0 + 3, y1 - 3, max(2, int(pd / 26) + 2)))
    for i, px in enumerate(xs):
        for j, py in enumerate(ys):
            if state == 0:
                if (i + j) % 2 == 0:
                    pile(body, px, py, -6, rng.uniform(3, 7), 1.9, rng)
                continue
            lean = (3.0, 1.5) if state == 1 and i == len(xs) - 1 and j == len(ys) - 1 else (0.0, 0.0)
            pile(body, px, py, -6, stilt - 1.4, 1.9, rng, lean)
        if state:
            bar(body, (px, y1 - 3, 3), (px, y0 + 3, stilt - 3), 1.0, WOOD_D(rng))
    if state:
        for py in ys:
            bar(body, (x0 + 3, py, stilt - 2.2), (x1 - 3, py, stilt - 2.2), 1.6, WOOD_D(rng))
    if standing:
        gone_deck = holes_in([(x1 - 10, y1 - 6, 6)]) if state == 1 else None
        deck(body, x0, x1, y0, y1, stilt, rng, along='y', gone=(lambda x, y: not gone_deck(x, y)) if gone_deck else None)
        # Plank walls, vertical boards on the deck; a door in the south wall, a shuttered window east of it.
        walls = PMesh()
        door = (hw * 0.42 - 5, hw * 0.42 + 5, 0, 15)
        win = (hw * 0.78 - 4, hw * 0.78 + 4, 7, 12) if hw > 60 else (hw * 0.15 - 4, hw * 0.15 + 4, 7, 12)
        if state == 2:
            ts = tn = te = tw = lambda s: h  # noqa: E731
            gone = None
        else:
            ts = lambda s: h - (6 if s > hw - 12 else 0)  # noqa: E731
            tn = tw = lambda s: h  # noqa: E731
            te = lambda s: h - (5 if s > hd - 10 else 0)  # noqa: E731
            gone = lambda s: hw * 0.62 < s < hw * 0.62 + 8  # noqa: E731
        boards(walls, (hx0, hy1), (hx1, hy1), t, ts, rng, WOOD, bw=3.6, holes=[door, win], gone=gone, solid=False)
        boards(walls, (hx0, hy0), (hx1, hy0), t, tn, rng, WOOD_D, bw=3.6, solid=False)
        boards(walls, (hx0, hy0 + t), (hx0, hy1 - t), t, tw, rng, WOOD_D, bw=3.6, solid=False)
        boards(walls, (hx1, hy0 + t), (hx1, hy1 - t), t, te, rng, WOOD_D, bw=3.6, solid=False)
        dx = hx0 + (door[0] + door[1]) / 2
        panel(walls, (dx, hy1), 9, 0, 15, DARK(rng), out=-0.4, d=1.0)
        panel(walls, (hx0 + (win[0] + win[1]) / 2, hy1), 7, 7, 12, DARK(rng), out=-0.4, d=1.0)
        for sx in (-1, 1):
            panel(walls, (hx0 + (win[0] + win[1]) / 2 + sx * 6, hy1), 3.6, 6.5, 12.5, WOOD_D(rng), out=1.6)
        # Corner posts and a top plate.
        for (cx, cy) in ((hx0, hy1), (hx1, hy1), (hx0, hy0), (hx1, hy0)):
            walls.box(cx, cy, h / 2, 2.6, 2.6, h, 0, WOOD_D(rng))
        body.add(lift(walls, stilt))
        # The porch: a rail along its south edge with a gap at the ladder, the ladder down, a hanging lantern, a pot.
        lx = x0 + pw * 0.22
        for px in np.arange(x0 + 2, x1 - 1, 9):
            if abs(px - lx) > 5:
                body.box(px, y1 - 1, stilt + 4, 1.6, 1.6, 8, 0, WOOD_D(rng))
        for (a, b) in ((x0 + 2, lx - 5), (lx + 5, x1 - 2)):
            if state == 1 and a > 0:
                b = b - 12
            bar(body, (a, y1 - 1, stilt + 7.4), (b, y1 - 1, stilt + 7.4), 1.2, WOOD(rng))
        ladder(body, lx, y1, stilt, rng)
        cylinder(body, (hx1 - 6, hy1 + 5), 2.6, stilt, stilt + 5, lambda q: hls(0.05, 0.45, 0.38), rng, sides=10)
        bar(body, (dx + 8, hy1 + 2, stilt + h - 1), (dx + 8, hy1 + 4.5, stilt + h - 1), 0.6, IRON(rng))
        body.box(dx + 8, hy1 + 4.5, stilt + h - 4, 2.2, 2.2, 3.2, 0, hls(0.11, 0.7, 0.55))
        # The reed thatch: a steep gable, ridge along x, deep eaves.
        zt = stilt + h
        if state == 2:
            keep = None
        else:
            keep = holes_in([(hw * 0.2, hy0 + hd * 0.5 + 4, 7), (-hw * 0.25, hy0 + hd * 0.4, 5)])
        gable(roof, hx0, hx1, hy0, hy1, zt - 1, zt + ridge, rng, THATCH, tile=3.2, rows=10, keep=keep, over=5.0,
              ridge_col=THATCH_D(rng) if state == 2 else None)
        gable_ends(body, hx0 + t / 2, hy0, hy1, zt, zt + ridge - 1, WOOD_D(rng))
        gable_ends(body, hx1 - t / 2, hy0, hy1, zt, zt + ridge - 1, WOOD_D(rng))
        if state == 2:
            # Bundles tied along the ridge.
            for x in np.arange(hx0 - 2, hx1 + 3, 6):
                lump(roof, (x, (hy0 + hy1) / 2, zt + ridge + 1.2), (2.4, 2.4, 1.6), THATCH_D, rng, n=5)
        if state == 1:
            rubble(body, x1 - 8, y1 + 6, 8, 4, 10, random.Random(seed + 1), WOOD, 4)
            lump(body, (x1 - 6, y1 + 8, 0.4), (6, 3, 1.4), THATCH, rng, n=5, floor=0.3)
    else:
        # Collapsed into the mire: the deck tipped down to the south-east, walls and thatch in a heap on it.
        for k in range(int(pw / 4)):
            x = x0 + 2 + k * 4
            z = 2.0 + 6.0 * (1 - (x - x0) / pw)
            body.box(x, 0, z, 3.6, pd * 0.9, 1.4, 0.04 * math.sin(k), WOOD(rng), (0.12, 0.08))
        rubble(body, -4, 2, pw * 0.38, pd * 0.32, 46, random.Random(seed + 2), WOOD, 5)
        lump(body, (6, -2, 6), (hw * 0.4, hd * 0.42, 6), THATCH, rng, n=7, jag=0.3, floor=1.0)
        lump(body, (-hw * 0.3, 8, 4), (hw * 0.22, hd * 0.3, 4), THATCH_D, rng, n=6, jag=0.3, floor=1.0)
        for k in range(5):
            body.box(rng.uniform(x0, x1), rng.uniform(y0, y1), 3, rng.uniform(12, 22), 2.2, 2.2, rng.uniform(0, 3), WOOD_D(rng), (rng.uniform(-0.3, 0.3), 0))
    body.solid_poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])
    del tilt
    return {'body': body, 'roof': roof}


@structure('stiltHutSmall', [2, 1, 0], foot='hull', hp=300)
def stilt_hut_small(state: int) -> dict:
    return stilt_hut(state, 60, 50, 44, 30, 17, 16, 1301)


@structure('stiltHutLarge', [2, 1, 0], foot='hull', hp=480)
def stilt_hut_large(state: int) -> dict:
    return stilt_hut(state, 104, 64, 86, 40, 19, 18, 1311, stilt=13)


# --- reeds (cover like a bush, flattenable) --------------------------------------------------------------------------------

@structure('reeds', [1, 0], foot='hull', hp=20, flattenable=True, cover=True)
def reeds(state: int) -> dict:
    rng = random.Random(1321)
    body, roof = PMesh(), PMesh()
    if state:
        for _ in range(70):
            a = rng.uniform(0, 2 * math.pi)
            r = rng.random() ** 0.6
            x, y = 17 * r * math.cos(a), 9 * r * math.sin(a)
            hgt = rng.uniform(16, 26) * (1.1 - 0.35 * r)
            lean = (x * 0.12 + rng.uniform(-2, 2), y * 0.12 + rng.uniform(-1.5, 1.5))
            col = (REED if rng.random() < 0.7 else REED_DRY)(rng)
            bar(roof, (x, y, 0), (x + lean[0], y + lean[1], hgt), 1.0, col)
            if rng.random() < 0.22:
                bar(roof, (x + lean[0] * 0.8, y + lean[1] * 0.8, hgt * 0.8), (x + lean[0], y + lean[1], hgt * 0.98), 1.9, CATTAIL(rng))
            if rng.random() < 0.3:
                # A long blade arching out.
                ang = rng.uniform(0, 2 * math.pi)
                bar(roof, (x, y, hgt * 0.4), (x + 7 * math.cos(ang), y + 4 * math.sin(ang), hgt * 0.55), 0.9, REED(rng))
    else:
        for _ in range(48):
            a = rng.uniform(0, 2 * math.pi)
            x, y = rng.uniform(-12, 12), rng.uniform(-6, 6)
            ln = rng.uniform(10, 20)
            bar(body, (x, y, 0.6), (x + ln * math.cos(a) * 0.4 + ln * 0.8, y + ln * math.sin(a) * 0.4, 0.9), 1.0, (REED_DRY if rng.random() < 0.5 else REED)(rng))
        for _ in range(8):
            body.box(rng.uniform(-6, 18), rng.uniform(-5, 5), 1.0, 3.6, 1.8, 1.4, rng.uniform(0, 3), CATTAIL(rng))
    body.solid_poly([(-17, -8), (17, -8), (17, 8), (-17, 8)])
    return {'body': body, 'roof': roof}


# --- the dead tree (solid) and the bald cypress (canopy fades) -----------------------------------------------------------

def branch(m: PMesh, p: tuple, ang: float, rise: float, length: float, r: float, depth: int, rng: random.Random, col) -> None:
    """A gnarled branch: a few kinked segments, forking."""
    x, y, z = p
    seg = length / 3
    for i in range(3):
        ang += rng.uniform(-0.45, 0.45)
        nx, ny, nz = x + seg * math.cos(ang), y + seg * math.sin(ang) * 0.8, z + seg * rise + rng.uniform(-1, 1.5)
        bar(m, (x, y, z), (nx, ny, nz), r, col(rng))
        if depth and i == 1:
            branch(m, (nx, ny, nz), ang + rng.choice((-1, 1)) * rng.uniform(0.5, 0.9), rise + 0.2, length * 0.55, r * 0.7, depth - 1, rng, col)
        x, y, z = nx, ny, nz
        r *= 0.72


@structure('deadTree', [1], foot='hull', hp=0)
def dead_tree(state: int) -> dict:
    rng = random.Random(1331)
    m = PMesh()
    # A leaning grey snag: the trunk in kinked sections, a broken top, three big limbs.
    pts = [(0, 0, 0), (1.5, -0.5, 12), (0.5, -1.5, 24), (3.0, -1.0, 36), (2.0, -2.0, 46)]
    for k, (a, b) in enumerate(zip(pts, pts[1:])):
        bar(m, a, b, 6.2 - k * 1.1, DEADWOOD(rng))
    lump(m, (2.0, -2.0, 47), (2.2, 2.0, 1.6), DEADWOOD, rng, n=5, jag=0.4)
    branch(m, (1.2, -0.8, 22), math.pi * 0.95, 0.45, 26, 2.6, 1, rng, DEADWOOD)
    branch(m, (2.5, -1.2, 32), 0.1, 0.5, 24, 2.2, 1, rng, DEADWOOD)
    branch(m, (2.0, -1.8, 41), -1.9, 0.6, 14, 1.6, 0, rng, DEADWOOD)
    # Roots clawing out over the mud, a broken-off limb at the foot.
    for k in range(6):
        a = k * 2 * math.pi / 6 + 0.4
        bar(m, (0, 0, 3), (9 * math.cos(a), 7 * math.sin(a), 0.4), 2.6, DEADWOOD(rng))
    bar(m, (8, 9, 1.0), (24, 12, 1.4), 2.4, DEADWOOD(rng))
    trunk_foot(m, 4.5)
    return {'body': m}


@structure('cypress', [1, 0], foot='hull', hp=180)
def cypress(state: int) -> dict:
    rng = random.Random(1341)
    body, roof = PMesh(), PMesh()
    # The buttressed foot: ribs flaring out at the waterline, and cypress knees poking up around it.
    for k in range(7):
        a = k * 2 * math.pi / 7
        body.face([(0, 0, 14), (8 * math.cos(a - 0.12), 6.5 * math.sin(a - 0.12), 0), (8 * math.cos(a + 0.12), 6.5 * math.sin(a + 0.12), 0)],
                  CYPRESS_BARK(rng), np.array([0, 0, -5]))
        body.face([(0, 0, 14), (2.6 * math.cos(a - 0.6), 2.2 * math.sin(a - 0.6), 0), (8 * math.cos(a), 6.5 * math.sin(a), 0)], CYPRESS_BARK(rng), np.array([0, 0, 30]))
        body.face([(0, 0, 14), (8 * math.cos(a), 6.5 * math.sin(a), 0), (2.6 * math.cos(a + 0.6), 2.2 * math.sin(a + 0.6), 0)], CYPRESS_BARK(rng), np.array([0, 0, 30]))
    for (x, y, h) in ((12, 6, 5), (-11, 8, 4), (14, -4, 3.5), (-6, 12, 3), (5, 13, 4.5)):
        cylinder(body, (x, y), 1.3, 0, h, CYPRESS_BARK, rng, sides=6, top=lambda q: hls(0.08, 0.3, 0.42))
    if state:
        # A tall straight trunk tapering up, bare limbs reaching out under the canopy.
        for k in range(6):
            z0, z1 = 64 * k / 6, 64 * (k + 1) / 6
            cylinder(body, (0, 0), 3.6 - 0.3 * k, z0, z1 + 0.4, CYPRESS_BARK, rng, sides=10, ry=3.0 - 0.25 * k)
        for a, z in ((0.4, 40), (2.7, 44), (-1.2, 50), (1.6, 54), (3.6, 36)):
            bar(body, (0, 0, z), (15 * math.cos(a), 10 * math.sin(a), z + 8), 1.8, CYPRESS_BARK(rng))
        # A flat-topped, layered canopy: wide, thin shelves of feathery needles.
        for (dx, dy, dz, r, ry) in ((0, 0, 68, 22, 16), (-17, 4, 58, 13, 9), (17, 2, 61, 14, 9), (-6, -9, 72, 14, 9), (9, -7, 71, 12, 8),
                                    (4, 9, 56, 12, 8), (-11, -3, 65, 10, 7)):
            lump(roof, (dx, dy, dz), (r, ry, r * 0.3), CYPRESS_LEAF, rng, n=8, jag=0.18)
        # Spanish moss hanging off the shelves in long pale grey-green strands.
        for _ in range(30):
            a = rng.uniform(0, 2 * math.pi)
            rr = rng.uniform(9, 21)
            x, y = rr * math.cos(a), rr * math.sin(a) * 0.72 + 2
            z = rng.uniform(54, 64)
            bar(roof, (x, y, z), (x + rng.uniform(-0.6, 0.6), y + 0.5, z - rng.uniform(8, 16)), 1.5, MOSS(rng))
    else:
        cylinder(body, (0, 0), 3.4, 0, 8, CYPRESS_BARK, rng, sides=10, ry=2.8, top=lambda r: hls(0.07, 0.4, 0.52))
        body.box(26, 4, 3.5, 44, 6, 6, 0.12, CYPRESS_BARK(rng))
        for (dx, dy, r) in ((52, 6, 15), (44, 14, 10), (58, -4, 11)):
            lump(body, (dx, dy, 2), (r, r * 0.7, 4.5), CYPRESS_LEAF, rng, n=6, jag=0.2, floor=0.5)
        for _ in range(8):
            x = rng.uniform(40, 64)
            bar(body, (x, rng.uniform(-6, 14), 1.2), (x + rng.uniform(-4, 4), rng.uniform(-6, 14), 0.8), 1.4, MOSS(rng))
    trunk_foot(body, 5.0)
    return {'body': body, 'roof': roof}


# --- boardwalks and the jetty: ground layer, drawn under everything ------------------------------------------------------------

WALK = {'l': 128.0, 'w': 36.0}


@structure('boardwalk', [1], foot='hull', hp=0)
def boardwalk(state: int) -> dict:
    """A 128 px run of plank walk east-west, its ends straight so runs join; piles show along its south edge."""
    m = PMesh()
    rng = random.Random(1351)
    l, w = WALK['l'], WALK['w']
    deck(m, -l / 2, l / 2, -w / 2, w / 2, 0.0, rng, plank=4.0, along='y')
    for y in (-w / 2 + 2.5, w / 2 - 2.5):
        m.box(0, y, -2.2, l, 2.6, 1.8, 0, WOOD_D(rng))
    for x in np.arange(-l / 2 + 8, l / 2, 32):
        for y in (-w / 2 + 1.5, w / 2 - 1.5):
            pile(m, x, y, -12, 1.0, 1.9, rng)
        bar(m, (x, w / 2 - 1.5, -10), (x + 14, w / 2 - 1.5, -2), 0.9, WOOD_D(rng))
    return {'body': m}


@structure('jetty', [1], foot='hull', hp=0)
def jetty(state: int) -> dict:
    """A square landing stage 88 x 64 on piles, planks east-west, a ladder down its south face."""
    m = PMesh()
    rng = random.Random(1361)
    l, w = 88.0, 64.0
    deck(m, -l / 2, l / 2, -w / 2, w / 2, 0.0, rng, plank=4.2, along='x')
    for x in (-l / 2 + 3, 0, l / 2 - 3):
        m.box(x, 0, -2.2, 2.8, w, 1.8, 0, WOOD_D(rng))
    for x in np.arange(-l / 2 + 3, l / 2, 21):
        for y in (-w / 2 + 2, w / 2 - 2):
            pile(m, x, y, -13, 1.0, 2.1, rng)
    for lx in (14, 20):
        m.box(lx, w / 2 + 0.6, -6, 1.2, 1.2, 12, 0, WOOD_D(rng))
    for z in (-10, -6.5, -3):
        m.box(17, w / 2 + 0.8, z, 7, 1.0, 0.8, 0, WOOD(rng))
    return {'body': m}


structure('boardwalkV', [1], foot='hull', hp=0)(lambda s: {k: rotate(v, math.pi / 2) for k, v in boardwalk(s).items()})


def walk_rail(state: int, side: int) -> dict:
    """Posts every 16 px along a boardwalk's edge with a sagging rope between; broken, the middle posts are down."""
    m = PMesh()
    rng = random.Random(1371 + side + state)
    l, w = WALK['l'], WALK['w']
    y = side * (w / 2 - 1.5)
    posts = list(np.arange(-l / 2 + 4, l / 2, 16))
    up = [state or not (-24 < x < 24) for x in posts]
    for x, u in zip(posts, up):
        if u:
            m.box(x, y, 7, 2.4, 2.4, 14, 0, WOOD_D(rng))
            lump(m, (x, y, 14.2), (1.4, 1.4, 0.8), ROPE, rng, n=4)
        else:
            m.box(x + 4, y + side * 3, 1.0, 12, 2.4, 2.0, 0.3, WOOD_D(rng), (0.0, 0.0))
    for (xa, ua), (xb, ub) in zip(zip(posts, up), list(zip(posts, up))[1:]):
        if ua and ub:
            n = 4
            for k in range(n):
                fa, fb = k / n, (k + 1) / n
                za, zb = 12.5 - 3.2 * math.sin(math.pi * fa), 12.5 - 3.2 * math.sin(math.pi * fb)
                bar(m, (xa + (xb - xa) * fa, y, za), (xa + (xb - xa) * fb, y, zb), 0.7, ROPE(rng))
        elif ua != ub:
            x0 = xa if ua else xb
            bar(m, (x0, y, 12.5), (x0 + (6 if ua else -6), y + side * 2, 0.8), 0.7, ROPE(rng))
    m.solid_poly([(-l / 2, y - 1.5), (l / 2, y - 1.5), (l / 2, y + 1.5), (-l / 2, y + 1.5)])
    return {'body': m}


structure('walkRailN', [1, 0], foot='runs', hp=60)(lambda s: walk_rail(s, -1))
structure('walkRailS', [1, 0], foot='runs', hp=60)(lambda s: walk_rail(s, 1))
structure('walkRailE', [1, 0], foot='runs', hp=60)(lambda s: {k: rotate(v, math.pi / 2) for k, v in walk_rail(s, -1).items()})
structure('walkRailW', [1, 0], foot='runs', hp=60)(lambda s: {k: rotate(v, math.pi / 2) for k, v in walk_rail(s, 1).items()})


# --- the mooring post and the drying rack ---------------------------------------------------------------------------------------------

@structure('mooringPost', [1], foot='hull', hp=0)
def mooring_post(state: int) -> dict:
    """Three piles lashed together (a dolphin), a rope hanging in a loop, an old tyre fender."""
    rng = random.Random(1381)
    m = PMesh()
    for (x, y, h) in ((-2.6, 0, 22), (2.6, -0.6, 19), (0, 3.2, 16)):
        pile(m, x, y, -6, h, 2.4, rng)
    for z in (12.0, 15.5):
        for a in range(10):
            a0, a1 = 2 * math.pi * a / 10, 2 * math.pi * (a + 1) / 10
            bar(m, (5.2 * math.cos(a0), 0.6 + 4.6 * math.sin(a0), z), (5.2 * math.cos(a1), 0.6 + 4.6 * math.sin(a1), z), 0.9, ROPE(rng))
    for k in range(6):
        a0, a1 = 0.3 + k * 0.4, 0.3 + (k + 1) * 0.4
        bar(m, (5 + 3 * math.sin(a0), 4 + 2 * math.sin(a0), 12 - 7 * math.sin(a0 * 1.2)), (5 + 3 * math.sin(a1), 4 + 2 * math.sin(a1), 12 - 7 * math.sin(a1 * 1.2)), 0.8, ROPE(rng))
    cylinder(m, (-5.6, 3.6), 3.0, 1, 3.4, lambda q: hls(0.0, 0.0, 0.14), rng, sides=10)
    cylinder(m, (-5.6, 3.6), 1.4, 1, 3.6, lambda q: hls(0.0, 0.0, 0.05), rng, sides=8)
    m.solid_poly([(-5.5, -3.5), (5.5, -3.5), (5.5, 6), (-5.5, 6)])
    return {'body': m}


@structure('fishRack', [1, 0], foot='hull', hp=30, flattenable=True)
def fish_rack(state: int) -> dict:
    """A drying rack: two A-frames and a ridge pole, fishing nets hung over it, reed baskets and floats beneath."""
    rng = random.Random(1391)
    m = PMesh()
    l, hgt, spread = 40.0, 20.0, 9.0
    if state:
        for x in (-l / 2, l / 2):
            for sy in (-1, 1):
                bar(m, (x, sy * spread, 0), (x, 0, hgt + 2), 1.4, WOOD_D(rng))
        bar(m, (-l / 2 - 3, 0, hgt), (l / 2 + 3, 0, hgt), 1.4, WOOD(rng))
        # The net: draped both sides of the pole in sagging panels, a few cork floats on its edge.
        n = 8
        for i in range(n):
            xa, xb = -l / 2 + 1 + (l - 2) * i / n, -l / 2 + 1 + (l - 2) * (i + 1) / n
            for sy in (-1, 1):
                sag_a = 1.5 * math.sin(math.pi * i / n)
                sag_b = 1.5 * math.sin(math.pi * (i + 1) / n)
                drop = 11 + 2 * math.sin(i * 1.3)
                m.face([(xa, sy * 0.6, hgt - 0.4), (xb, sy * 0.6, hgt - 0.4), (xb, sy * 5.5, hgt - drop - sag_b), (xa, sy * 5.5, hgt - drop - sag_a)],
                       NET(rng), np.array([(xa + xb) / 2, -sy * 4, hgt - 3]))
                if i % 2 == 0:
                    m.box((xa + xb) / 2, sy * 5.8, hgt - drop - sag_a - 0.6, 1.8, 1.4, 1.4, 0, hls(0.06, 0.6, 0.5))
        for (x, y) in ((-12, 12), (-5, 13), (14, 12)):
            cylinder(m, (x, y), 3.2, 0, 5, REED_DRY, rng, sides=10, top=lambda q: hls(0.1, 0.4, 0.3))
        m.box(6, 13, 1.2, 8, 5, 2.4, 0.2, WOOD(rng))
    else:
        bar(m, (-l / 2, -2, 1.2), (l / 2, 4, 1.2), 1.4, WOOD(rng))
        for x in (-l / 2, l / 2 - 6):
            bar(m, (x, -spread, 0.8), (x + 8, spread, 1.0), 1.4, WOOD_D(rng))
        lump(m, (0, 2, 0.6), (l * 0.45, 8, 1.4), NET, rng, n=7, jag=0.3, floor=0.4)
        for (x, y) in ((-12, 12), (14, 13)):
            lump(m, (x, y, 1), (4, 2.6, 1.6), REED_DRY, rng, n=5, jag=0.25, floor=0.4)
    m.solid_poly([(-l / 2 - 2, -spread), (l / 2 + 2, -spread), (l / 2 + 2, spread), (-l / 2 - 2, spread)])
    return {'body': m}


# --- the sluice dam (Raid target: "Break the Dams") ------------------------------------------------------------------------------

DAM = {'l': 136.0, 'd': 22.0, 'h': 22.0}


@structure('sluiceDam', [2, 1, 0], foot='runs', hp=600)
def sluice_dam(state: int) -> dict:
    """A timber crib dam across a 136 px channel between stone abutments, a sluice gate in the middle with a windlass.
    The pond is to the north; the spill falls south. Breached, the middle is gone and only the abutments stand."""
    rng = random.Random(1401)
    m = PMesh()
    l, d, h = DAM['l'], DAM['d'], DAM['h']
    ab = 22.0
    # Stone abutments at both ends, a little taller than the crib.
    for sx in (-1, 1):
        xa, xb = sx * (l / 2 - ab), sx * l / 2
        blocks(m, (min(xa, xb), d / 2), (max(xa, xb), d / 2), d, lambda s: h + 4, rng, FIELDSTONE, bl=6, ch=3.6, solid=False)
        m.box((xa + xb) / 2, 0, h + 4.6, ab + 1, d + 1, 1.2, 0, FIELDSTONE(rng))
        m.solid_poly([(min(xa, xb), -d / 2), (max(xa, xb), -d / 2), (max(xa, xb), d / 2), (min(xa, xb), d / 2)])
    cx0, cx1 = -l / 2 + ab, l / 2 - ab
    gate = 14.0
    if state:
        # The crib: horizontal logs on the south face, posts every 10 px, a plank walk on top; the gate frame in the middle.
        for side, (a, b) in enumerate(((cx0, -gate / 2 - 3), (gate / 2 + 3, cx1))):
            for z in np.arange(1.6, h, 3.4):
                broken = state == 1 and side == 1 and z > h - 9 and a + 6 < 0.5 * (a + b)
                if broken:
                    bar(m, (a, d / 2, z), (a + (b - a) * 0.45, d / 2, z), 3.2, WOOD_D(rng))
                else:
                    bar(m, (a, d / 2, z), (b, d / 2, z), 3.2, WOOD_D(rng) if int(z) % 2 else WOOD(rng))
            for x in np.arange(a + 2, b, 10):
                m.box(x, d / 2 + 1.6, h / 2, 2.6, 1.4, h, 0, IRON(rng))
            m.box((a + b) / 2, 0, h - 1, b - a, d - 4, 2, 0, MUDDY(rng))
            deck(m, a, b, -d / 2 + 2, d / 2 - 2, h + 1.2, rng, plank=3.6, along='y')
            m.solid_poly([(a, -d / 2), (b, -d / 2), (b, d / 2), (a, d / 2)])
        # The gate: two tall posts, a lintel, a plank gate (lifted a little, water jetting under it), a windlass wheel.
        for x in (-gate / 2 - 1.5, gate / 2 + 1.5):
            m.box(x, d / 2 - 2, (h + 14) / 2, 3.4, 3.4, h + 14, 0, WOOD_D(rng))
        m.box(0, d / 2 - 2, h + 13, gate + 8, 3.4, 3, 0, WOOD_D(rng))
        lift_by = 3.0 if state == 2 else 0.0
        for k in range(4):
            if state == 1 and k == 2:
                continue
            m.box(-gate / 2 + 1.75 + k * 3.5, d / 2 - 2.4, lift_by + h / 2, 3.2, 2.2, h - 2, 0, WOOD(rng))
        for k in range(3):
            m.box(0, d / 2 - 1.0, lift_by + 4 + k * 7, gate - 0.6, 1.0, 1.6, 0, IRON(rng))
        cylinder(m, (0, d / 2 - 2), 0.9, h + 14, h + 18, IRON, rng, sides=6)
        for k in range(8):
            a = 2 * math.pi * k / 8
            bar(m, (0, d / 2 - 2, h + 18), (6 * math.cos(a), d / 2 - 2, h + 18 + 6 * math.sin(a)), 0.9, IRON(rng))
        for k in range(12):
            a0, a1 = 2 * math.pi * k / 12, 2 * math.pi * (k + 1) / 12
            bar(m, (6 * math.cos(a0), d / 2 - 2, h + 18 + 6 * math.sin(a0)), (6 * math.cos(a1), d / 2 - 2, h + 18 + 6 * math.sin(a1)), 1.2, IRON(rng))
        m.solid_poly([(-gate / 2 - 3, -d / 2), (gate / 2 + 3, -d / 2), (gate / 2 + 3, d / 2), (-gate / 2 - 3, d / 2)])
        # Water: a sheet jetting from under the gate into a foaming pool, a trickle through the crack.
        m.face([(-gate / 2 + 1, d / 2, lift_by + 0.4), (gate / 2 - 1, d / 2, lift_by + 0.4), (gate / 2 + 2, d / 2 + 14, 0.2), (-gate / 2 - 2, d / 2 + 14, 0.2)],
               SPILL(rng), np.array([0, 0, -10]))
        lump(m, (0, d / 2 + 15, 0.2), (12, 5, 1.6), lambda q: hls(0.45, 0.2, 0.8), rng, n=6, jag=0.3, floor=0.2)
        if state == 1:
            m.face([(-1.7 + 3.5, d / 2 + 0.2, h - 3), (1.7 + 3.5, d / 2 + 0.2, h - 3), (2.2 + 3.5, d / 2 + 6, 0.3), (-2.2 + 3.5, d / 2 + 6, 0.3)], SPILL(rng), np.array([0, 0, -10]))
            m.face([(cx1 - 30, d / 2 + 0.2, h - 6), (cx1 - 24, d / 2 + 0.2, h - 6), (cx1 - 23, d / 2 + 8, 0.3), (cx1 - 31, d / 2 + 8, 0.3)], SPILL(rng), np.array([0, 0, -10]))
            rubble(m, cx1 - 26, d / 2 + 6, 8, 3, 8, random.Random(3), WOOD, 3.5)
    else:
        # Breached: log stubs and split posts at the ends of the gap, the gate frame down, debris strewn south, water through.
        for side, (a, b) in enumerate(((cx0, cx0 + 16), (cx1 - 12, cx1))):
            for z in np.arange(1.6, h * 0.6, 3.4):
                bar(m, (a, d / 2, z), (b - rng.uniform(0, 5) * (1 if side == 0 else 0), d / 2, z), 3.2, WOOD_D(rng))
            m.solid_poly([(a, -d / 2), (b, -d / 2), (b, d / 2), (a, d / 2)])
        m.box(-6, d / 2 + 10, 1.6, h + 10, 3.4, 3.4, 0.4, WOOD_D(rng))
        m.box(8, d / 2 + 6, 1.6, 22, 3.4, 3.4, -0.3, WOOD_D(rng))
        rubble(m, 0, d / 2 + 10, 40, 8, 34, random.Random(4), WOOD, 5)
        for k in range(8):
            a = 2 * math.pi * k / 8
            bar(m, (20, d / 2 + 18, 0.8), (20 + 6 * math.cos(a), d / 2 + 18 + 4 * math.sin(a), 0.8), 0.9, IRON(rng))
        m.face([(cx0 + 16, -d / 2, 0.15), (cx1 - 12, -d / 2, 0.15), (cx1 - 16, d / 2 + 12, 0.15), (cx0 + 22, d / 2 + 12, 0.15)], SPILL(rng), np.array([0, 0, -10]))
        for k in range(7):
            lump(m, (cx0 + 22 + k * (cx1 - cx0 - 40) / 6, d / 2 + rng.uniform(4, 12), 0.3), (rng.uniform(4, 7), 2.4, 1.2), lambda q: hls(0.45, 0.2, 0.8), rng, n=5, jag=0.3, floor=0.2)
    return {'body': m}


# --- the Weasel capture flag ------------------------------------------------------------------------------------------------------

structure('flagWeasel', [1], foot='hull', hp=0)(lambda s: flagpole((MUSTARD, WEASEL_MARK)))


# --- the canal lock gate (level 29: "Last Lock"; indestructible) -----------------------------------------------------------

@structure('lockGate', [1], foot='runs', hp=0)
def lock_gate(state: int) -> dict:
    """A pair of mitre gates across a 136 px canal between stone lock walls, shut, their V pointing upstream (north), with a
    plank walk and handrail on top, long balance beams swung out over the walls, and iron paddle gear; water leaks white
    through the paddles into the lower pound to the south."""
    rng = random.Random(1411)
    m = PMesh()
    l, d, h = DAM['l'], DAM['d'], DAM['h']
    ab = 24.0
    gap = l / 2 - ab
    for sx in (-1, 1):
        xa, xb = sx * gap, sx * l / 2
        blocks(m, (min(xa, xb), d / 2), (max(xa, xb), d / 2), d + 6, lambda s: h + 3, rng, FIELDSTONE, bl=7, ch=3.6, solid=False)
        m.box((xa + xb) / 2, 0, h + 3.6, ab + 1, d + 7, 1.2, 0, FIELDSTONE(rng))
        # Iron bollards and the hollow quoin the gate turns in.
        cylinder(m, ((xa + xb) / 2 + sx * 4, -d / 2 + 2), 1.8, h + 4, h + 8, IRON, rng, sides=8)
        m.solid_poly([(min(xa, xb), -d / 2 - 3), (max(xa, xb), -d / 2 - 3), (max(xa, xb), d / 2 + 3), (min(xa, xb), d / 2 + 3)])
    point = (0.0, -9.0)
    for sx in (-1, 1):
        hinge = (sx * (gap - 1), 2.0)
        dx, dy = point[0] - hinge[0], point[1] - hinge[1]
        length = math.hypot(dx, dy)
        ang = math.atan2(dy, dx)
        mx, my = (hinge[0] + point[0]) / 2, (hinge[1] + point[1]) / 2
        # The leaf: upright planks between a heel post and a mitre post, iron straps across, a plank walk and rail on top.
        n = int(length / 3.4)
        for k in range(n):
            f = (k + 0.5) / n
            m.box(hinge[0] + dx * f, hinge[1] + dy * f + 1.6, h / 2, length / n - 0.3, 3.0, h, ang, (WOOD_D if k % 2 else WOOD)(rng))
        for z in (5, 12, 19):
            m.box(mx, my + 3.2, z, length, 0.6, 1.4, ang, IRON(rng))
        for (px, py) in (hinge, point):
            m.box(px, py + 1.6, (h + 4) / 2, 3.6, 3.6, h + 4, ang, WOOD_D(rng))
        m.box(mx, my, h + 0.8, length, 6.0, 1.4, ang, WOOD(rng))
        for k in range(4):
            f = (k + 0.5) / 4
            m.box(hinge[0] + dx * f, hinge[1] + dy * f - 2.6, h + 5, 1.2, 1.2, 8, 0, WOOD_D(rng))
        bar(m, (hinge[0], hinge[1] - 2.6, h + 8.4), (point[0], point[1] - 2.6, h + 8.4), 1.0, WOOD(rng))
        # The balance beam swung back over the lock wall.
        bar(m, (hinge[0] - sx * 2, hinge[1] + 1, h + 3), (sx * (l / 2 - 4), 16, h + 5), 4.0, TIMBER_BEAM(rng))
        # Paddle gear: an iron post with a rack and a crank handle, a leak of white water below it on the south face.
        gx, gy = hinge[0] + dx * 0.55, hinge[1] + dy * 0.55
        m.box(gx, gy - 0.5, h + 5, 2.2, 2.2, 8, ang, IRON(rng))
        bar(m, (gx, gy - 0.5, h + 8), (gx + 3, gy - 0.5, h + 10), 0.8, IRON(rng))
        m.face([(gx - 2.5, gy + 3.4, 6), (gx + 2.5, gy + 3.4, 6), (gx + 3.5, gy + 12, 0.3), (gx - 3.5, gy + 12, 0.3)], SPILL(rng), np.array([gx, gy, -10]))
        lump(m, (gx, gy + 13, 0.3), (5, 2.5, 1.2), lambda q: hls(0.45, 0.2, 0.8), rng, n=5, jag=0.3, floor=0.2)
    m.solid_poly([(-gap, -12), (gap, -12), (gap, 5), (-gap, 5)])
    return {'body': m}
