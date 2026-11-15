"""The Ironclad, chapter 3's river fortress (level 30), straight down like the Boar fortress and the Sand Crawler.

  python3 dev/pixel/swamp/ironclad.py      out/render/ironclad-body.png, ironclad-wheels.png, ironclad-wheels-f2.png
                                           + out/sheets/ironclad.png and ironclad.json (one 512 sheet to paint)

Faces north, pivot at the frame centre, native density-C px, frame 288 like fortress-body and crawler-body. Its turret races stand
at the fortress's mounts (topdown.MOUNTS: level 10's and level 30's turret offsets), so the Boar fortress's turrets sit on them;
moved Nov 14 with dev/pixel/swamp/rings.py (repaint only what changed).
A Weasel river ironclad: a tarred timber hull with a ram bow, a sloped riveted iron casemate with mustard trim, a pilot
house and one tall funnel, a side paddle wheel each side in an open-topped paddle box (its blades are the moving part,
`wheels` in place of treads: the top run of blades moves forward), a lifeboat on davits and the clan pennant at the stern.
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
from topdown import MOUNT_TURRET, MOUNTS, RING_R, STEEL, frame, race, rivets, sponson  # noqa: E402

OUT = HERE / 'out'
SIZE = 288
TAR = tone(0.07, 0.25, 0.16, 0.008, 0.025)        # tarred hull timber
DECK = tone(0.08, 0.22, 0.36, 0.01, 0.04)
IRON = tone(0.25, 0.08, 0.3, 0.015, 0.03)
IRON_D = tone(0.25, 0.08, 0.22, 0.012, 0.02)
RUSTY = tone(0.04, 0.45, 0.3, 0.01, 0.04)
MUSTARD = tone(0.12, 0.6, 0.48, 0.008, 0.03)      # the Weasels' colour (CLAN_COLOUR c9a23a)
PADDLE = tone(0.08, 0.25, 0.3, 0.01, 0.04)
WHEEL_IRON = tone(0.0, 0.0, 0.2, 0.0, 0.02)
GLASS = lambda r: hls(0.55, 0.25, 0.14)  # noqa: E731
WHEEL = {'x': 78.0, 'y': 34.0, 'r': 42.0, 'w': 24.0, 'z': 16.0, 'n': 16}


def outline(scale: float = 1.0, inset: float = 0.0) -> list[tuple[float, float]]:
    """The hull at the waterline: a pointed bow to the north, straight sides, a rounded stern."""
    pts = []
    for k in range(9):
        t = k / 8
        y = -124 + t * 68
        x = 60 * math.sin(t * math.pi / 2) ** 0.8
        pts.append((x, y))
    pts += [(60, 96)]
    for k in range(1, 7):
        a = k / 6 * math.pi / 2
        pts.append((60 - 14 * (1 - math.cos(a)), 96 + 22 * math.sin(a)))
    right = [(max(0.0, x * scale - inset), y * (scale if y < 0 else 1) + (inset if y < 0 else -inset)) for x, y in pts]
    left = [(-x, y) for x, y in reversed(right) if x > 0]
    return right + left


def slab_poly(m: PMesh, low, high, z0: float, z1: float, col, top, rng) -> None:
    inside = np.array([0, float(np.mean([p[1] for p in low])), (z0 + z1) / 2])
    n = len(low)
    for i in range(n):
        a, b = low[i], low[(i + 1) % n]
        c, d = high[(i + 1) % n], high[i]
        m.face([(a[0], a[1], z0), (b[0], b[1], z0), (c[0], c[1], z1), (d[0], d[1], z1)], col(rng), inside)
    m.face([(x, y, z1) for x, y in high], top(rng), inside)


def wheels(phase: float) -> PMesh:
    """Both paddle wheels: blades round the rim, only the upper half shows from above; phase in blade steps."""
    m = PMesh()
    rng = random.Random(711)
    W = WHEEL
    step = 2 * math.pi / W['n']
    for sx in (-1, 1):
        x = sx * W['x']
        # Hub and rims: dark iron, the rims seen as two thin rings standing upright.
        for dx in (-W['w'] / 2 + 1, W['w'] / 2 - 1):
            for k in range(24):
                a0, a1 = 2 * math.pi * k / 24, 2 * math.pi * (k + 1) / 24
                if math.cos(a0) < -0.2:
                    continue
                bar(m, (x + dx, W['y'] + W['r'] * math.sin(a0), W['z'] + W['r'] * math.cos(a0)), (x + dx, W['y'] + W['r'] * math.sin(a1), W['z'] + W['r'] * math.cos(a1)), 2.0, WHEEL_IRON(rng))
        bar(m, (x - W['w'] / 2, W['y'], W['z']), (x + W['w'] / 2, W['y'], W['z']), 5, WHEEL_IRON(rng))
        for k in range(W['n']):
            a = (k + phase) * step
            if math.cos(a) < -0.1:
                continue
            y, z = W['y'] + (W['r'] - 4) * math.sin(a), W['z'] + (W['r'] - 4) * math.cos(a)
            # A spoke from the hub, then the blade: a plank across the wheel's width, edge-on to the turn.
            bar(m, (x, W['y'], W['z']), (x, y, z), 1.6, WHEEL_IRON(rng))
            m.box(x, y, z, W['w'] - 1, 2.2, 9, 0, PADDLE(rng), (a, 0.0))
        # Water churning in the wheel's well below.
        lump(m, (x, W['y'], 1), (W['w'] / 2, W['r'] * 0.9, 1.4), lambda q: hls(0.45, 0.2, 0.75), rng, n=6, jag=0.3, floor=0.5)
    return m


def body() -> PMesh:
    m = PMesh()
    rng = random.Random(721)
    hull = outline()
    # The tarred hull: sides flaring up from the waterline to the deck edge, a planked deck.
    slab_poly(m, outline(1.02), hull, 0, 14, TAR, DECK, rng)
    for y in np.arange(-120, 116, 5.5):
        half = max(x for x, yy in hull if abs(yy - y) < 12) if any(abs(yy - y) < 12 for x, yy in hull) else 0
        if half > 6:
            m.box(0, y, 14.4, 2 * half - 6, 0.5, 0.3, 0, hls(0.07, 0.2, 0.18))
    # A ram at the bow, an iron strake along the hull's sides, mustard rails.
    bar(m, (0, -124, 6), (0, -136, 3), 6, IRON_D(rng))
    for sx in (-1, 1):
        bar(m, (sx * 60.5, -56, 8), (sx * 60.5, 96, 8), 2.2, IRON_D(rng))
        bar(m, (sx * 58, -60, 16), (sx * 58, 100, 16), 1.4, MUSTARD(rng))
    # The casemate: sloped iron armour over the middle of the deck, a flat roof with seams and rivets, gun ports.
    lo = [(-52, -84), (52, -84), (52, 104), (-52, 104)]
    hi = [(-40, -74), (40, -74), (40, 94), (-40, 94)]
    slab_poly(m, lo, hi, 14, 38, IRON, IRON, rng)
    for (x0, y0, x1, y1) in ((-40, -74, 40, -74), (-40, 94, 40, 94), (-40, -74, -40, 94), (40, -74, 40, 94)):
        rivets(m, x0, y0, x1, y1, 38, 7, rng)
    for sx in (-1, 1):
        for y in (0, 40, 76):
            m.box(sx * 46.5, y, 25, 3, 7, 6, 0, hls(0, 0, 0.08), (0.0, sx * 0.55))
        rivets(m, sx * 46, -80, sx * 46, 100, 26, 9, rng)
        bar(m, (sx * 52.5, -84, 14.6), (sx * 52.5, 104, 14.6), 2.0, MUSTARD(rng))
        for y in (-62, -20, 30, 70):
            m.box(sx * 46, y + 8, 27, 9, 2, 3, 0, RUSTY(rng), (0.0, sx * 0.55))
    for y in (-30, 50):
        m.box(0, y, 38.4, 80, 0.6, 0.3, 0, hls(0.25, 0.08, 0.16))
    # The pilot house forward, its slit windows facing the bow, a searchlight on top.
    m.box(0, -52, 44, 26, 14, 12, 0, IRON(rng))
    m.box(0, -52, 50.6, 28, 16, 1.4, 0, IRON_D(rng))
    for k in range(4):
        m.box(-9 + k * 6, -59.2, 46, 4, 0.8, 2.4, 0, GLASS(rng))
    cylinder(m, (8, -52), 3, 51, 55, lambda q: hls(0.1, 0.4, 0.6), rng, sides=10)
    # Twin tall funnels either side of the main gun's barrels, mustard bands, a brass steam whistle between them.
    for sx in (-1, 1):
        cylinder(m, (sx * 24, 8), 8, 38, 64, IRON_D, rng, sides=16, top=lambda q: hls(0, 0, 0.05))
        cylinder(m, (sx * 24, 8), 8.4, 56, 60, MUSTARD, rng, sides=16, top=lambda q: hls(0, 0, 0.05))
        cylinder(m, (sx * 24, 8), 5.4, 63.9, 64.2, lambda q: hls(0, 0, 0.02), rng, sides=12)
    cylinder(m, (0, -30), 1.6, 38, 50, lambda q: hls(0.11, 0.55, 0.5), rng, sides=8)
    # The foredeck: anchor, chain, capstan, bollards; a Weasel emblem plate on the casemate's brow.
    cylinder(m, (0, -100), 5, 14, 18, IRON_D, rng, sides=12)
    for k in range(9):
        m.box(-12 + k * 0.6, -96 - k * 3.2, 15.2, 2.4, 2.4, 1.6, 0.6 * (k % 2), IRON_D(rng))
    m.box(-14, -106, 16, 10, 3, 3, 0.4, IRON_D(rng))
    for sx in (-1, 1):
        cylinder(m, (sx * 24, -96), 2.4, 14, 19, IRON_D, rng, sides=8)
    # The paddle boxes: an outer and an inner wall round each wheel, open on top, a mustard rim; walkways across.
    W = WHEEL
    for sx in (-1, 1):
        for dx in (-W['w'] / 2 - 3, W['w'] / 2 + 3):
            x = sx * W['x'] + dx
            m.box(x, W['y'], 14, 3, 2 * W['r'] + 8, 28, 0, TAR(rng))
            bar(m, (x, W['y'] - W['r'] - 4, 28.6), (x, W['y'] + W['r'] + 4, 28.6), 3.2, MUSTARD(rng))
        for y in (W['y'] - W['r'] - 5, W['y'] + W['r'] + 5):
            m.box(sx * W['x'], y, 14, W['w'] + 9, 3, 28, 0, TAR(rng))
        m.box(sx * (W['x'] - 6), W['y'] + W['r'] + 12, 14.6, 20, 7, 1.2, 0, DECK(rng))
        # Sponsons: braces from the hull out to the box.
        for y in (W['y'] - 30, W['y'], W['y'] + 30):
            bar(m, (sx * 52, y, 12), (sx * (W['x'] - W['w'] / 2 - 3), y, 12), 3, IRON_D(rng))
    # The stern: a lifeboat on davits each side, the clan pennant, coal sacks and crates.
    for sx in (-1, 1):
        lump(m, (sx * 30, 108, 20), (6, 12, 3), lambda q: hls(0.08, 0.35, 0.42), rng, n=6)
        for y in (100, 116):
            bar(m, (sx * 40, y, 38), (sx * 32, y, 26), 1.4, IRON_D(rng))
    bar(m, (0, 110, 38), (0, 116, 70), 1.6, hls(0.08, 0.3, 0.3))
    m.box(6, 117, 66, 12, 0.8, 7, 0, MUSTARD(rng), (0.0, 0.2))
    # Hatches and the turret rings (the Boar fortress's mounts).
    for (x, y) in ((-28, 84), (28, 84), (-34, 30), (34, 30)):
        cylinder(m, (x, y), 4.5, 38.4, 39.6, IRON_D, rng, sides=10)
    # The turret races where level 30's turrets stand (level 10's offsets): the side guns on armoured sponsons out over
    # the hull's sides, the MG on a barbette at the casemate's brow, the rockets on the roof.
    for name, (x, y) in MOUNTS.items():
        r = RING_R[MOUNT_TURRET[name]]
        if name != 'rockets':
            sponson(m, x, y, r + 4, 14, 38.4, rng)
            cylinder(m, (x, y), r + 4.4, 30, 32, MUSTARD, rng, sides=24, top=lambda q: hls(0.25, 0.08, 0.3))
        race(m, x, y, r, 38.4, rng)
    return m


STEPS = 3
PIECES = {'ironclad-body': body, 'ironclad-wheels': lambda: wheels(0.0), 'ironclad-wheels-f2': lambda: wheels(0.5)}
SHEET = {'ironclad-body': (-50, -6), 'ironclad-wheels': (230, -6)}


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
    sheet.save(OUT / 'sheets' / 'ironclad.png')
    (OUT / 'sheets' / 'ironclad.json').write_text(json.dumps(place, indent=1))


if __name__ == '__main__':
    main()
