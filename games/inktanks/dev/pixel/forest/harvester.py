"""The Harvester, chapter 5's fortress and the final boss (level 50): the Iron Hive's logging machine, straight down like the Boar
fortress, the Sand Crawler, the Ironclad and the Rail-Gun Train.

  python3 dev/pixel/forest/harvester.py    out/render/harvester-body.png, harvester-treads.png, harvester-treads-f2.png
                                           + out/sheets/harvester.png and harvester.json (one 512 sheet to paint, both
                                           treads frames on it, painted together, so frame 2 needs no roll)

Faces north, pivot at the frame centre, native density-C px. Its felling head reaches past the 288 frame of the other bosses,
so the frame is 320. A long, low tracked hull of blackened Hive iron with honeycomb plates and orange trim; at the bow a felling
head on two booms: two great horizontal circular saws in half guards with a grapple claw between them; a brow of orange sensor
lamps; twin exhaust stacks; a log bunk at the stern with felled trunks chained between stakes. 'treads' carry the two track units
AND the two saw blades: frame 2 moves the track links half a link and turns the saws half a tooth, so both run while it moves.

Turret rings (MOUNTS): the Boar fortress's cannons at their level 10 spots on sponsons, the boss rail gun (fortressRail, from the
Rail-Gun Train) amidships, the MG at the brow. The coordinator may move them for level 50: change MOUNTS, re-run, repaint.
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
from topdown import LINK, STEEL, frame, race, rivets  # noqa: E402

OUT = HERE / 'out'
SIZE = 320
HIVE = tone(0.6, 0.06, 0.22, 0.01, 0.03)          # blackened iron
HIVE_L = tone(0.6, 0.06, 0.32, 0.01, 0.03)
HIVE_D = tone(0.6, 0.06, 0.14, 0.01, 0.02)
TRIM = tone(0.07, 0.7, 0.45, 0.006, 0.03)          # the Hive's hot orange
GLOW = lambda r: hls(0.08, 0.95, 0.6)  # noqa: E731
BLADE = tone(0.58, 0.06, 0.62, 0.01, 0.04)
LOG = tone(0.07, 0.3, 0.28, 0.01, 0.04)
WOOD_END = tone(0.1, 0.45, 0.62, 0.01, 0.04)
SOOTY = tone(0.07, 0.08, 0.1, 0.01, 0.02)
MOUNTS = {'cannonLeft': (-49, -43), 'cannonRight': (49, -43), 'rail': (0, 40), 'mg': (0, -84)}
MOUNT_TURRET = {'cannonLeft': 'fortressCannon', 'cannonRight': 'fortressCannon', 'rail': 'fortressRail', 'mg': 'fortressMG'}
RING_R = {'fortressCannon': 20, 'fortressMG': 13, 'fortressRail': 24}
TRACK_X, TRACK_W, TRACK_Y = 64.0, 26.0, (-100.0, 124.0)
SAWS = [(-36.0, -130.0), (36.0, -130.0)]
SAW_R, SAW_Z, TEETH = 23.0, 12.0, 20


def slab(m: PMesh, x0: float, y0: float, x1: float, y1: float, z0: float, z1: float, inset: float, col, top=None, rng=None) -> None:
    """A box whose top is pulled in by `inset`: sloped armour sides."""
    lo = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    hi = [(x0 + inset, y0 + inset), (x1 - inset, y0 + inset), (x1 - inset, y1 - inset), (x0 + inset, y1 - inset)]
    inside = np.array([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2])
    for i in range(4):
        a, b = lo[i], lo[(i + 1) % 4]
        c, d = hi[(i + 1) % 4], hi[i]
        m.face([(a[0], a[1], z0), (b[0], b[1], z0), (c[0], c[1], z1), (d[0], d[1], z1)], col(rng), inside)
    m.face([(x, y, z1) for x, y in hi], (top or col)(rng), inside)


def hex_plate(m: PMesh, cx: float, cy: float, z: float, r: float, rng: random.Random, col=HIVE_L, h: float = 0.8) -> None:
    pts = [(cx + r * math.cos(math.pi / 6 + k * math.pi / 3), cy + r * math.sin(math.pi / 6 + k * math.pi / 3)) for k in range(6)]
    inside = np.array([cx, cy, z])
    for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]):
        m.face([(ax, ay, z), (bx, by, z), (bx, by, z + h), (ax, ay, z + h)], col(rng), inside)
    m.face([(x, y, z + h) for x, y in pts], col(rng), inside)


def saw(m: PMesh, cx: float, cy: float, phase: float, spin: int, rng: random.Random) -> None:
    """A great circular saw lying flat: a steel disc, a hub, raked teeth round the rim (turned by phase, in teeth)."""
    cylinder(m, (cx, cy), SAW_R, SAW_Z - 0.6, SAW_Z + 0.6, BLADE, rng, sides=40)
    cylinder(m, (cx, cy), SAW_R * 0.55, SAW_Z + 0.6, SAW_Z + 0.8, tone(0.58, 0.05, 0.5, 0.0, 0.0), rng, sides=28)
    for k in range(6):
        a = 2 * math.pi * (k + phase * 6 / TEETH) / 6 * spin
        bar(m, (cx + 6 * math.cos(a), cy + 6 * math.sin(a), SAW_Z + 0.9), (cx + SAW_R * 0.8 * math.cos(a), cy + SAW_R * 0.8 * math.sin(a), SAW_Z + 0.9), 1.0,
            tone(0.58, 0.05, 0.42, 0.0, 0.0)(rng))
    for k in range(TEETH):
        a = 2 * math.pi * (k + phase) / TEETH * spin
        p = (cx + SAW_R * math.cos(a), cy + SAW_R * math.sin(a))
        q = (cx + (SAW_R + 4.0) * math.cos(a + spin * 0.1), cy + (SAW_R + 4.0) * math.sin(a + spin * 0.1))
        o = (cx + SAW_R * math.cos(a + spin * 0.28), cy + SAW_R * math.sin(a + spin * 0.28))
        inside = np.array([cx, cy, SAW_Z])
        for z in (SAW_Z - 0.6, SAW_Z + 0.6):
            m.face([(p[0], p[1], z), (q[0], q[1], z), (o[0], o[1], z)], tone(0.58, 0.04, 0.72, 0.0, 0.03)(rng), np.array([cx, cy, SAW_Z * 2 - z]))
        m.face([(p[0], p[1], SAW_Z - 0.6), (q[0], q[1], SAW_Z - 0.6), (q[0], q[1], SAW_Z + 0.6), (p[0], p[1], SAW_Z + 0.6)], BLADE(rng), inside)
    cylinder(m, (cx, cy), 4.5, SAW_Z, SAW_Z + 3, STEEL, rng, sides=12, top=TRIM)


def treads(phase: float) -> PMesh:
    """The two track units and the two saws; phase 0 or 0.5 (a half link, a half tooth)."""
    m = PMesh()
    rng = random.Random(1911)
    y0, y1 = TRACK_Y
    for side in (-1, 1):
        x = side * TRACK_X
        m.box(x, (y0 + y1) / 2, 7, TRACK_W, y1 - y0, 8, 0, LINK(rng))
        y = y0 + 1.7 + phase * 6
        while y < y1 - 1.7:
            m.box(x, y, 11.6, TRACK_W, 3.4, 1.4, 0, STEEL(rng))
            m.box(x, y, 12.4, 5, 3.4, 1.0, 0, hls(0.08, 0.1, 0.4))
            y += 6
    for (sx, sy), spin in zip(SAWS, (1, -1)):
        saw(m, sx, sy, phase, spin, rng)
    return m


def body() -> PMesh:
    m = PMesh()
    rng = random.Random(1921)
    y0, y1 = TRACK_Y
    # The hull: a long low lower hull, sloped upper armour, dark fenders over the tracks' outer halves.
    slab(m, -54, y0 - 4, 54, y1 - 2, 10, 24, 3, HIVE_D, rng=rng)
    slab(m, -48, y0 + 4, 48, y1 - 8, 24, 34, 4, HIVE, top=HIVE_L, rng=rng)
    for side in (-1, 1):
        # Fenders over the tracks' inner two thirds: the outer links show.
        fx0, fx1 = sorted((side * (TRACK_X - 15), side * (TRACK_X + 4)))
        slab(m, fx0, y0 + 2, fx1, y1 - 2, 16, 21, 1.5, HIVE_D, top=HIVE, rng=rng)
        rivets(m, side * 51, y0 + 6, side * 51, y1 - 10, 25, 9, rng)
        bar(m, (side * (TRACK_X + 3.5), y0 + 6, 20), (side * (TRACK_X + 3.5), y1 - 6, 20), 1.6, TRIM(rng))
        for y in (-60, -10, 70, 100):
            m.box(side * TRACK_X, y, 21.6, 16, 9, 3, 0, LINK(rng))
    # Honeycomb plates across the deck, between the turret rings.
    for (x, y) in ((-22, -66), (22, -66), (-28, -12), (0, -16), (28, -12), (-34, 10), (34, 10)):
        hex_plate(m, x, y, 34, 7.5, rng)
    # Hatches and vent grilles on the deck.
    for (x, y) in ((-30, -86), (30, -86)):
        cylinder(m, (x, y), 5, 34, 35.6, HIVE_D, rng, sides=10, top=HIVE_L)
    for side in (-1, 1):
        for k in range(6):
            m.box(side * 22, -2 + k * 2.4, 34.6, 14, 1.2, 0.8, 0, hls(0, 0, 0.1))
    # The brow: a sloped glacis, a row of orange sensor lamps (the Hive's eyes) under an iron visor.
    m.face([(-44, y0 + 8, 34), (44, y0 + 8, 34), (50, y0 - 4, 22), (-50, y0 - 4, 22)], HIVE_D(rng), np.array([0, y0 + 20, 0]))
    m.box(0, y0 - 1, 26, 90, 3, 5, 0, HIVE(rng))
    for k in range(-4, 5):
        cylinder(m, (k * 9.5, y0 - 3.4), 2.2, 24, 27.6, GLOW, rng, sides=8, top=GLOW)
    m.box(0, y0 - 4.8, 29, 92, 2.6, 1.6, 0, TRIM(rng))
    # The felling head: two booms from the bow to the saw hubs, a cross beam, half guards over the saws' rear, a grapple claw.
    for (sx, sy) in SAWS:
        side = 1 if sx > 0 else -1
        bar(m, (side * 24, y0 - 2, 22), (sx, sy, SAW_Z + 4), 6, HIVE(rng))
        bar(m, (side * 40, y0 - 2, 18), (sx + side * 6, sy + 8, SAW_Z + 3), 4, HIVE_D(rng))
        cylinder(m, (sx, sy), 6, SAW_Z + 3, SAW_Z + 7, HIVE_D, rng, sides=12, top=TRIM)
        n = 14
        for i in range(n):
            a0, a1 = math.pi * (0.05 + 0.9 * i / n), math.pi * (0.05 + 0.9 * (i + 1) / n)
            r0, r1 = SAW_R + 5, SAW_R - 2
            pts = [(sx + r0 * math.cos(a0), sy + r0 * math.sin(a0)), (sx + r0 * math.cos(a1), sy + r0 * math.sin(a1)),
                   (sx + r1 * math.cos(a1), sy + r1 * math.sin(a1)), (sx + r1 * math.cos(a0), sy + r1 * math.sin(a0))]
            m.face([(x, y, SAW_Z + 6) for x, y in pts], (HIVE if i % 2 else HIVE_L)(rng), np.array([sx, sy, SAW_Z]))
            m.face([(pts[0][0], pts[0][1], SAW_Z + 1), (pts[1][0], pts[1][1], SAW_Z + 1), (pts[1][0], pts[1][1], SAW_Z + 6), (pts[0][0], pts[0][1], SAW_Z + 6)],
                   HIVE_D(rng), np.array([sx, sy, SAW_Z + 3]))
        bar(m, (sx - 0.7 * SAW_R * side, sy + 0.9 * SAW_R, SAW_Z + 6.2), (sx + 0.7 * SAW_R * side, sy + 0.9 * SAW_R, SAW_Z + 6.2), 1.6, TRIM(rng))
    bar(m, (SAWS[0][0], SAWS[0][1] + 6, SAW_Z + 5), (SAWS[1][0], SAWS[1][1] + 6, SAW_Z + 5), 4.4, HIVE(rng))
    # The grapple: two hooked iron jaws reaching forward between the saws.
    for side in (-1, 1):
        pts = [(side * 3, y0 - 4, 20), (side * 9, y0 - 22, 18), (side * 10, y0 - 38, 16), (side * 5, y0 - 50, 14), (side * 1, y0 - 54, 13)]
        for p, q in zip(pts, pts[1:]):
            bar(m, p, q, 4.2, HIVE_L(rng))
        m.box(side * 1.5, y0 - 54, 13, 3, 3, 3, 0, TRIM(rng))
    # Twin exhaust stacks, soot-black with hot orange mouths; cooling grilles behind the rail ring.
    for side in (-1, 1):
        cylinder(m, (side * 40, 44), 7, 34, 48, HIVE_D, rng, sides=14, top=lambda q: hls(0.06, 0.9, 0.45))
        cylinder(m, (side * 40, 44), 7.4, 44, 46, TRIM, rng, sides=14, top=lambda q: hls(0.06, 0.9, 0.45))
        cylinder(m, (side * 40, 44), 4, 48, 48.2, SOOTY, rng, sides=10)
    # The log bunk at the stern: stakes, felled trunks lying lengthwise, two chains over them.
    for side in (-1, 1):
        for y in (74, 116):
            m.box(side * 40, y, 42, 3, 3, 18, 0, HIVE(rng))
            m.box(side * 40, y, 51.5, 3.6, 3.6, 1.2, 0, TRIM(rng))
    for i, (n, z) in enumerate(((7, 38), (6, 44.5), (5, 51))):
        for j in range(n):
            x = (j - (n - 1) / 2) * 10.6
            ya, yb = 70 + rng.uniform(-3, 2), 122 + rng.uniform(-2, 4)
            r = 5.0
            pts = [(x + r * math.cos(2 * math.pi * k / 8), z + r * math.sin(2 * math.pi * k / 8)) for k in range(8)]
            mid = np.array([x, (ya + yb) / 2, z])
            for k in range(8):
                (ax, az), (bx, bz) = pts[k], pts[(k + 1) % 8]
                m.face([(ax, ya, az), (ax, yb, az), (bx, yb, bz), (bx, ya, bz)], LOG(rng), mid)
            m.face([(px, ya, pz) for px, pz in pts], WOOD_END(rng), mid)
            m.face([(px, yb, pz) for px, pz in pts], WOOD_END(rng), mid)
    for y in (84, 106):
        bar(m, (-42, y, 52), (42, y, 56), 1.2, hls(0.6, 0.05, 0.4))
    # The turret races; the cannons stand on sponsons out over the fenders.
    for name, (x, y) in MOUNTS.items():
        r = RING_R[MOUNT_TURRET[name]]
        z = 34.0
        if abs(x) > 30:
            cylinder(m, (x, y), r + 4, 22, z, HIVE_D, rng, sides=24, top=HIVE)
            cylinder(m, (x, y), r + 4.4, 30, 31.4, TRIM, rng, sides=24, top=HIVE)
        race(m, x, y, r, z, rng)
    return m


PIECES = {'harvester-body': body, 'harvester-treads': lambda: treads(0.0), 'harvester-treads-f2': lambda: treads(0.5)}


def main() -> None:
    (OUT / 'render').mkdir(parents=True, exist_ok=True)
    (OUT / 'sheets').mkdir(parents=True, exist_ok=True)
    ims = {}
    for key, fn in PIECES.items():
        img, _ = frame(fn(), SIZE)
        ims[key] = Image.fromarray(img)
        ims[key].save(OUT / 'render' / f'{key}.png')
        print(key, ims[key].getbbox(), flush=True)
    # Side by side: body, then the two treads frames (each as its own bbox), packed left to right.
    sheet = Image.new('RGBA', (512, 512))
    place, x = {}, 4
    for key, im in ims.items():
        bb = im.getbbox()
        w, h = bb[2] - bb[0], bb[3] - bb[1]
        y = (512 - h) // 2
        assert x + w <= 508, (key, x, w)
        sheet.alpha_composite(im.crop(bb), (x, y))
        place[key] = {'x': x - bb[0], 'y': y - bb[1]}
        x += w + 6
    sheet.save(OUT / 'sheets' / 'harvester.png')
    mounts = {k: {'at': list(v), 'turret': MOUNT_TURRET[k]} for k, v in MOUNTS.items()}
    (OUT / 'sheets' / 'harvester.json').write_text(json.dumps({'place': place, 'mounts': mounts}, indent=1))


if __name__ == '__main__':
    main()
