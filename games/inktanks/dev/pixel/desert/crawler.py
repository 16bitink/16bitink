"""The Sand Crawler, chapter 2's land fortress (level 20), straight down like the Boar fortress (dev/pixel/world/topdown.py).

  python3 dev/pixel/desert/crawler.py      out/render/crawler-body.png, crawler-treads.png, crawler-treads-f2.png
                                           + out/sheets/crawler.png and crawler.json (one 512 sheet to paint)

Faces north, pivot at the frame centre, native density-C px, frame 288 like fortress-body. It keeps the fortress's turret
mounts (cannon, mgLeft, mgRight, rockets) at the same spots, so the Boar fortress's turrets sit on its rings.
A crawler: a tall riveted landship on four track units, a rake-toothed sand scoop at the bow, a bridge with dark slit
windows, cargo under tarps, a crane, exhaust stacks, Crow feathers and a bone emblem plate.
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
from props import transformed  # noqa: E402
from topdown import ARMOUR, ARMOUR_DARK, LINK, RING_R, SOOT, STEEL, frame, race, rivets, sponson  # noqa: E402

OUT = HERE / 'out'
SIZE = 288
HULL = tone(0.09, 0.42, 0.5, 0.008, 0.035)       # sun-bleached desert tan
HULL_D = tone(0.07, 0.38, 0.38, 0.008, 0.03)
RUSTY = tone(0.04, 0.5, 0.34, 0.01, 0.04)
CROW = tone(0.7, 0.1, 0.27, 0.01, 0.03)
TARP = tone(0.1, 0.3, 0.42, 0.01, 0.04)
BONE = lambda r: hls(0.12, 0.2, 0.84)  # noqa: E731
GLASS = lambda r: hls(0.55, 0.25, 0.14)  # noqa: E731
UNITS = [(-66, -62), (66, -62), (-66, 62), (66, 62)]
# Where level 20's five turrets stand (art px from the frame centre, north up; the game draws the body at 0.7).
MOUNTS = {'mortarLeft': (-57, 57), 'mortarRight': (57, 57), 'cannonLeft': (-60, -43), 'cannonRight': (60, -43), 'mg': (0, -100)}
MOUNT_TURRET = {'mortarLeft': 'fortressMortar', 'mortarRight': 'fortressMortar', 'cannonLeft': 'fortressCannon', 'cannonRight': 'fortressCannon',
                'mg': 'fortressMG'}
TRACK_W, TRACK_L = 28.0, 88.0


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


def treads(phase: int) -> PMesh:
    m = PMesh()
    rng = random.Random(611)
    for (x, y) in UNITS:
        m.box(x, y, 7, TRACK_W, TRACK_L, 8, 0, LINK(rng))
        yy = y - TRACK_L / 2 + 1.7 + phase
        while yy < y + TRACK_L / 2 - 1.7:
            m.box(x, yy, 11.6, TRACK_W, 3.4, 1.4, 0, STEEL(rng))
            m.box(x, yy, 12.4, 5, 3.4, 1.0, 0, hls(0.08, 0.1, 0.4))
            yy += 6
    return m


def body() -> PMesh:
    m = PMesh()
    rng = random.Random(621)
    # The hull: a wide lower box over the track units, a tall sloped superstructure on it.
    slab(m, -56, -112, 56, 112, 10, 22, 2, HULL_D, rng=rng)
    for (x, y) in UNITS:
        # Track guards: armoured hoods over each track unit, their outer halves.
        gx0, gx1 = (x - 3, x + 14) if x < 0 else (x - 14, x + 3)
        slab(m, gx0, y - 40, gx1, y + 40, 14, 24, 2, HULL_D, top=RUSTY, rng=rng)
        rivets(m, (gx0 + gx1) / 2, y - 36, (gx0 + gx1) / 2, y + 36, 24.4, 8, rng)
    slab(m, -58, -100, 58, 106, 22, 34, 6, HULL, rng=rng)
    # Deck plates with seams and rivets.
    for (x0, y0, x1, y1) in ((-50, -90, 50, -40), (-50, -36, -16, 46), (16, -36, 50, 46), (-50, 50, 50, 98)):
        m.box((x0 + x1) / 2, (y0 + y1) / 2, 34.6, x1 - x0 - 2, y1 - y0 - 2, 1.2, 0, HULL(rng))
        for (a, b, c, d) in ((x0, y0, x1, y0), (x0, y1, x1, y1)):
            rivets(m, a + 2, b + 2, c - 2, d - 2, 35.2, 7, rng)
    # The bow: a sand scoop with rake teeth, then a stepped bridge with dark slit windows.
    m.face([(-60, -100, 34), (60, -100, 34), (62, -114, 16), (-62, -114, 16)], HULL_D(rng), np.array([0, -90, 0]))
    m.box(0, -120, 8, 136, 10, 14, 0, RUSTY(rng))
    for k in range(-6, 7):
        m.box(k * 10.5, -127, 6, 5, 6, 8, 0, STEEL(rng))
    for side in (-1, 1):
        bar(m, (side * 60, -112, 16), (side * 66, -124, 10), 4, STEEL(rng))
    slab(m, -30, -84, 30, -54, 34, 46, 3, HULL, top=HULL_D, rng=rng)
    for k in range(5):
        m.box(-20 + k * 10, -84.6, 41, 7, 1.0, 3, 0, GLASS(rng))
    m.box(0, -69, 46.6, 40, 18, 1.2, 0, HULL(rng))
    bar(m, (16, -72, 47), (16, -72, 58), 0.8, STEEL(rng))
    # Crow mark: a bone-white plate with black feathers fanned on the bridge roof.
    cylinder(m, (-8, -69), 6, 46.6, 48, BONE, rng, sides=12)
    for k in range(5):
        a = math.radians(-60 + k * 30)
        m.box(-8 + 9 * math.sin(a), -69 - 9 * math.cos(a), 48.2, 3, 10, 0.8, a + math.pi / 2, CROW(rng))
    # Cargo under tarps and a crane on the mid deck, either side of the main turret ring.
    for side in (-1, 1):
        lump(m, (side * 36, 10, 34), (11, 18, 7), TARP, rng, n=7, jag=0.12, floor=34)
        for y in (-2, 10, 22):
            bar(m, (side * 25, y, 37), (side * 47, y, 37), 0.8, hls(0.1, 0.3, 0.3))
    bar(m, (24, 30, 35), (24, 30, 48), 3, STEEL(rng))
    bar(m, (24, 30, 48), (6, 38, 56), 2.2, RUSTY(rng))
    bar(m, (6, 38, 56), (6, 38, 40), 0.5, hls(0.1, 0.1, 0.3))
    # The engine deck aft: grilles, four exhaust stacks, spare track links and drums on the stern.
    for k in range(10):
        m.box(0, 86 + k * 2.2, 35.5, 44, 1.2, 1.0, 0, hls(0, 0, 0.16))
    for x in (-46, -34, 34, 46):
        cylinder(m, (x, 96), 4.4, 34, 50, STEEL, rng, sides=10, top=lambda r: hls(0, 0, 0.08))
    for x in (-40, 40):
        m.box(x, 110, 24, 18, 6, 8, 0, LINK(rng))
    for k, x in enumerate((-16, -6, 6, 16)):
        cylinder(m, (x, 108), 4, 22, 30, (lambda r: hls(0.01, 0.55, 0.38)) if k % 2 else (lambda r: hls(0.12, 0.6, 0.45)), rng, sides=10)
    # Hatches and the turret rings (the Boar fortress's mounts).
    for (x, y) in ((-24, -40), (24, -40), (-20, 66), (20, 66)):
        cylinder(m, (x, y), 5, 34.6, 36, HULL_D, rng, sides=10)
    # The turret races where level 20's turrets stand: the side guns on sponsons out over the tracks, the MG on the bow.
    for name, (x, y) in MOUNTS.items():
        r = RING_R[MOUNT_TURRET[name]]
        if abs(x) > 30:
            sponson(m, x, y, r + 4, 24, 35, rng)
        else:
            sponson(m, x, y, r + 3, 30, 35, rng)
        race(m, x, y, r, 35.0, rng)
    return m


MORTAR_PITCH = 0.95
MORTAR_TUBE = (12.0, 40.0)  # radius, length


def tube_mesh(r: float, length: float, rng: random.Random) -> PMesh:
    """A mortar tube along -y from the trunnion at the origin, its bore a black disk at the far end, then pitched up."""
    t = PMesh()
    n = 16
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        p = lambda a, y, rr=r: (rr * math.cos(a), y, rr * math.sin(a))  # noqa: E731
        t.face([p(a0, 6), p(a1, 6), p(a1, -length), p(a0, -length)], STEEL(rng), np.array([0, -length / 2, 0]))
    t.face([(r * math.cos(2 * math.pi * i / n), 6, r * math.sin(2 * math.pi * i / n)) for i in range(n)], STEEL(rng), np.array([0, 0, 0]))
    t.face([(r * 0.95 * math.cos(2 * math.pi * i / n), -length - 0.05, r * 0.95 * math.sin(2 * math.pi * i / n)) for i in range(n)], hls(0, 0, 0.13), np.array([0, 0, 0]))
    t.face([(r * 0.72 * math.cos(2 * math.pi * i / n), -length - 0.1, r * 0.72 * math.sin(2 * math.pi * i / n)) for i in range(n)], hls(0, 0, 0.03), np.array([0, 0, 0]))
    for y in (-length + 3, -length * 0.45):
        for i in range(n):
            a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
            p = lambda a, yy, rr=r + 1.6: (rr * math.cos(a), yy, rr * math.sin(a))  # noqa: E731
            t.face([p(a0, y - 1.5), p(a1, y - 1.5), p(a1, y + 1.5), p(a0, y + 1.5)], ARMOUR_DARK(rng), np.array([0, y, 0]))
    return t


def pitch(m: PMesh, ang: float, at: tuple) -> PMesh:
    c, s_ = math.cos(ang), math.sin(ang)
    return transformed(m, lambda p: np.array([p[0] + at[0], c * p[1] - s_ * p[2] + at[1], s_ * -p[1] * 0 + (s_ * -p[1] + c * p[2]) + at[2]]))


def mortar_turret(state: int) -> PMesh:
    """The crawler's boss mortar: a great tube on an armoured turntable with cheek plates, shells racked behind."""
    m = PMesh()
    rng = random.Random(631)
    if state:
        cylinder(m, (0, 4), 27, 0, 10, ARMOUR, rng, sides=20, top=ARMOUR_DARK)
        for side in (-1, 1):
            m.box(side * 16, 2, 18, 7, 26, 18, 0, ARMOUR(rng))
            rivets(m, side * 16, -9, side * 16, 13, 27.4, 6, rng)
        m.add(pitch(tube_mesh(*MORTAR_TUBE, rng), MORTAR_PITCH, (0, -2, 20)))
        bar(m, (-14, -2, 20), (14, -2, 20), 6, STEEL(rng))
        for k in range(6):
            x = -12.5 + k * 5
            m.box(x, 25, 12, 4.4, 6, 6, 0, hls(0.08, 0.35, 0.32))
            cylinder(m, (x, 25), 1.8, 15, 18, lambda q: hls(0.12, 0.6, 0.5), rng, sides=8)
        cylinder(m, (-18, 20), 4, 10, 14, ARMOUR_DARK, rng, sides=10)
        m.box(18, 22, 13, 6, 6, 6, 0, hls(0.12, 0.2, 0.84))
    else:
        cylinder(m, (0, 4), 27, 0, 7, SOOT, rng, sides=20)
        for k in range(10):
            a = rng.uniform(0, 2 * math.pi)
            m.box(math.cos(a) * 20, math.sin(a) * 18 + 4, 8, rng.uniform(5, 10), rng.uniform(3, 6), 3, a, ARMOUR_DARK(rng), (rng.uniform(-0.4, 0.4), 0))
        m.add(pitch(tube_mesh(MORTAR_TUBE[0], MORTAR_TUBE[1] * 0.6, rng), 0.15, (6, -4, 10)))
        lump(m, (0, 6, 7), (16, 14, 2), SOOT, rng, n=6, jag=0.3)
    return m


def mortar_muzzle() -> list:
    r, length = MORTAR_TUBE
    c, s_ = math.cos(MORTAR_PITCH), math.sin(MORTAR_PITCH)
    return [[0, round(c * -length - 2)]]


PIECES = {'crawler-body': body, 'crawler-treads': lambda: treads(0), 'crawler-treads-f2': lambda: treads(3)}
SHEET = {'crawler-body': (-20, -14), 'crawler-treads': (204, -14)}
TURRETS = {'fortressMortar-1': (lambda: mortar_turret(1), 144), 'fortressMortar-0': (lambda: mortar_turret(0), 144)}


def main() -> None:
    (OUT / 'render').mkdir(parents=True, exist_ok=True)
    (OUT / 'sheets').mkdir(parents=True, exist_ok=True)
    sheet = Image.new('RGBA', (512, 512))
    place = {}
    for key, fn in PIECES.items():
        img, _ = frame(fn(), SIZE)
        im = Image.fromarray(img)
        im.save(OUT / 'render' / f'{key}.png')
        print(key, im.getbbox(), flush=True)
        if key in SHEET:
            x, y = SHEET[key]
            bb = im.getbbox()
            assert x + bb[0] >= 0 and y + bb[1] >= 0 and x + bb[2] <= 512 and y + bb[3] <= 512, (key, bb)
            sheet.alpha_composite(im.crop(bb), (x + bb[0], y + bb[1]))
            place[key] = {'x': x, 'y': y}
    sheet.save(OUT / 'sheets' / 'crawler.png')
    (OUT / 'sheets' / 'crawler.json').write_text(json.dumps(place, indent=1))
    # The boss mortar's two states on their own 256 sheet (painted separately, after the crawler).
    tsheet = Image.new('RGBA', (256, 256))
    tplace = {}
    for i, (key, (fn, size)) in enumerate(TURRETS.items()):
        img, _ = frame(fn(), size)
        im = Image.fromarray(img)
        im.save(OUT / 'render' / f'{key}.png')
        x, y = -8 + i * 120, 40
        bb = im.getbbox()
        assert x + bb[0] >= 0 and x + bb[2] <= 256 and y + bb[1] >= 0 and y + bb[3] <= 256, (key, bb)
        tsheet.alpha_composite(im.crop(bb), (x + bb[0], y + bb[1]))
        tplace[key] = {'x': x, 'y': y}
        print(key, bb)
    tsheet.save(OUT / 'sheets' / 'mortar.png')
    (OUT / 'sheets' / 'mortar.json').write_text(json.dumps({'place': tplace, 'muzzle': mortar_muzzle()}, indent=1))


if __name__ == '__main__':
    main()
