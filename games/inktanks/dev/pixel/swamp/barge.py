"""The Ink supply barge (chapter 3, level 23 "The Barge"), straight down like the supply truck (dev/pixel/world/topdown.py).

  python3 dev/pixel/swamp/barge.py render    out/render/barge-1.png, barge-1-f2.png, barge-0.png + out/sheets/barge.png/.json
  python3 dev/pixel/swamp/barge.py cut       paint/barge.png -> out/painted/barge-*.png (f2 keeps frame 1's paint where only
                                             the water moved)

Faces north, pivot at the frame centre, frame 128 like the truck. A riveted steel river barge ~56 x 112: a raked bow, the hold
amidships under our ink-blue tarps lashed over crates, side decks with bollards and tyre fenders, a small wheelhouse at the stern
with a stovepipe funnel, a towing bitt and the Ink pennant. Its 'treads' frames are the water at the hull: a bow wave and a
churned wake that shift between the two frames, so it bobs as it moves. barge-0 is the wreck: holed, the tarps burnt, low in
the water.
Paint: * edit_image on out/sheets/barge.png, 256, transparent, seed 3701, PROMPT -> paint/barge.png; then cut.
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
from sheets import match  # noqa: E402
from topdown import SOOT, STEEL, frame, rivets  # noqa: E402

OUT = HERE / 'out'
SIZE = 128
HULL = tone(0.3, 0.12, 0.34, 0.01, 0.03)          # weathered grey-green steel
HULL_D = tone(0.3, 0.12, 0.24, 0.01, 0.02)
DECK = tone(0.08, 0.25, 0.38, 0.01, 0.04)
INK = tone(0.6, 0.5, 0.4, 0.01, 0.04)             # our ink blue (the player's colour)
INK_D = tone(0.6, 0.5, 0.3, 0.01, 0.03)
CRATE = tone(0.08, 0.38, 0.42, 0.01, 0.05)
FENDER = tone(0.0, 0.0, 0.12, 0.0, 0.02)
FOAM = tone(0.5, 0.25, 0.85, 0.01, 0.04)
GLASS = lambda r: hls(0.55, 0.25, 0.2)  # noqa: E731
WHITE = lambda r: hls(0.12, 0.15, 0.85)  # noqa: E731
L, W = 112.0, 54.0
PROMPT = ('Turn this 3D render into masterful painterly pixel art for a top-down tank game, seen straight from above: a riveted '
          'grey-green steel river supply barge with a raked bow, deep blue canvas tarps lashed with ropes over the cargo hold, wooden '
          'side decks, black tyre fenders, a small white wheelhouse with a stovepipe at the stern, white foam of a bow wave and wake '
          'at the waterline; and its burnt, holed wreck. Every part stays exactly where it is with exactly the same silhouette, size '
          'and light; add nothing new; transparent stays transparent. Worn paint, rust streaks, crisp dark outline, warm sunlight '
          'from the top left.')


def outline(inset: float = 0.0) -> list[tuple[float, float]]:
    """The hull at the deck edge: a raked bow (a blunt wedge), straight sides, a squared stern with rounded corners."""
    hw, hl = W / 2 - inset, L / 2 - inset
    pts = [(-hw * 0.55, -hl), (hw * 0.55, -hl), (hw, -hl + 16), (hw, hl - 6), (hw - 6, hl), (-hw + 6, hl), (-hw, hl - 6), (-hw, -hl + 16)]
    return pts


def water(m: PMesh, phase: int, rng: random.Random, sunk: bool = False) -> None:
    """Foam at the waterline: a bow wave either side of the bow, a churned wake off the stern; phase 1 shifts it half a step."""
    s = 3.0 * phase
    hw, hl = W / 2, L / 2

    def half(y: float) -> float:
        f = min(1.0, max(0.0, (y + hl) / 16))
        return hw * (0.55 + 0.45 * f)
    for side in (-1, 1):
        for k in range(6):
            y = -hl + 1 + k * 6 + s
            lump(m, (side * (half(y) + 1.5 + k * 0.5), y, 0.3), (2.0 + k * 0.25, 2.8, 0.6), FOAM, rng, n=4, jag=0.3, floor=0.2)
    if not sunk:
        for k in range(6):
            y = L / 2 + 2 + k * 3.2 + s * 0.7
            if y > 62:
                continue
            lump(m, (rng.uniform(-10, 10) * (1 - k * 0.1), y, 0.3), (5 - k * 0.5, 2.0, 0.6), FOAM, rng, n=4, jag=0.35, floor=0.2)
        lump(m, (0, -L / 2 - 2 + s * 0.4, 0.3), (8, 2.2, 0.6), FOAM, rng, n=4, jag=0.3, floor=0.2)


def barge(state: int, phase: int) -> PMesh:
    m = PMesh()
    rng = random.Random(1801)
    z0 = 2.0 if state else 0.6
    zd = 9.0 if state else 5.0
    low, high = outline(1.5), outline()
    inside = np.array([0, 0, (z0 + zd) / 2])
    for i in range(len(low)):
        a, b = low[i], low[(i + 1) % len(low)]
        c, d = high[(i + 1) % len(high)], high[i]
        m.face([(a[0], a[1], z0), (b[0], b[1], z0), (c[0], c[1], zd), (d[0], d[1], zd)], HULL_D(rng), inside)
    m.face([(x, y, zd) for x, y in high], DECK(rng), inside)
    # Gunwale: a steel rim round the deck edge, rivets along it.
    for i in range(len(high)):
        a, b = high[i], high[(i + 1) % len(high)]
        bar(m, (a[0], a[1], zd + 0.8), (b[0], b[1], zd + 0.8), 1.8, HULL(rng))
    rivets(m, -W / 2 + 1.5, -L / 2 + 18, -W / 2 + 1.5, L / 2 - 8, zd + 1.2, 6, rng)
    rivets(m, W / 2 - 1.5, -L / 2 + 18, W / 2 - 1.5, L / 2 - 8, zd + 1.2, 6, rng)
    # Plank side decks.
    for y in np.arange(-L / 2 + 14, L / 2 - 4, 4):
        for sx in (-1, 1):
            m.box(sx * (W / 2 - 5), y, zd + 0.3, 6, 3.6, 0.6, 0, DECK(rng))
    # Tyre fenders hung over the sides.
    for y in (-28, -8, 12, 32):
        for sx in (-1, 1):
            cylinder(m, (sx * (W / 2 + 0.6), y), 2.6, zd - 5, zd - 1, FENDER, rng, sides=8)
    # The hold: a coaming round it, tarps over cargo (ink blue, lashed), or burnt open on the wreck.
    hx, hy0, hy1 = W / 2 - 9, -L / 2 + 18, L / 2 - 28
    m.box(0, (hy0 + hy1) / 2, zd + 1.5, 2 * hx + 2, hy1 - hy0 + 2, 3, 0, HULL(rng))
    if state:
        n = 10
        for k in range(5):
            y0 = hy0 + k * (hy1 - hy0) / 5
            y1 = y0 + (hy1 - hy0) / 5
            hump = 7.0 + (1.5 if k % 2 else 0)
            for i in range(n):
                a0, a1 = math.pi * i / n, math.pi * (i + 1) / n
                xa, xb = -hx * math.cos(a0), -hx * math.cos(a1)
                za, zb = zd + 3 + hump * math.sin(a0), zd + 3 + hump * math.sin(a1)
                m.face([(xa, y0, za), (xb, y0, zb), (xb, y1, zb), (xa, y1, za)], (INK if (k + i) % 3 else INK_D)(rng), np.array([0, (y0 + y1) / 2, zd]))
            bar(m, (-hx, y0, zd + 3.2), (hx, y0, zd + 3.2), 0.8, hls(0.1, 0.3, 0.55))
            # A rope over the tarp's crown.
            for i in range(n):
                a0, a1 = math.pi * i / n, math.pi * (i + 1) / n
                bar(m, (-hx * math.cos(a0), y1 - 0.5, zd + 3.4 + hump * math.sin(a0)), (-hx * math.cos(a1), y1 - 0.5, zd + 3.4 + hump * math.sin(a1)), 0.6,
                    hls(0.1, 0.35, 0.55))
        # Crates stacked on the foredeck, a coil of rope, two bollards at the bow.
        for (x, y, s) in ((-12, -L / 2 + 12, 7), (-4, -L / 2 + 12, 6), (10, -L / 2 + 13, 6)):
            m.box(x, y, zd + s / 2, s, s, s, 0.1 * x, CRATE(rng))
        for sx in (-1, 1):
            cylinder(m, (sx * 8, -L / 2 + 5), 1.6, zd, zd + 4, STEEL, rng, sides=8)
        for k in range(10):
            a0, a1 = 2 * math.pi * k / 10, 2 * math.pi * (k + 1) / 10
            bar(m, (16 + 3 * math.cos(a0), -L / 2 + 20 + 3 * math.sin(a0), zd + 1), (16 + 3 * math.cos(a1), -L / 2 + 20 + 3 * math.sin(a1), zd + 1), 1.0, hls(0.1, 0.35, 0.55))
        # The wheelhouse at the stern: white walls, dark windows forward, a tin roof, a stovepipe; the Ink pennant on a staff.
        m.box(0, L / 2 - 16, zd + 8, 26, 16, 16, 0, WHITE(rng))
        for k in range(4):
            m.box(-9 + k * 6, L / 2 - 24.2, zd + 12, 4, 0.8, 4, 0, GLASS(rng))
        m.box(0, L / 2 - 16, zd + 16.6, 30, 20, 1.2, 0, HULL(rng))
        cylinder(m, (9, L / 2 - 12), 1.8, zd + 16, zd + 26, SOOT, rng, sides=8, top=lambda q: hls(0, 0, 0.05))
        bar(m, (-12, L / 2 - 3, zd), (-12, L / 2 - 3, zd + 30), 0.9, hls(0.08, 0.3, 0.3))
        m.box(-6, L / 2 - 3, zd + 27, 11, 0.6, 5, 0, INK(rng), (0.0, 0.2))
        cylinder(m, (6, L / 2 - 4), 2.2, zd, zd + 3.5, STEEL, rng, sides=8)
    else:
        # Wreck: the tarps burnt to rags, the hold open and flooded, the wheelhouse caved in, soot and a holed side.
        m.box(0, (hy0 + hy1) / 2, zd + 0.6, 2 * hx - 2, hy1 - hy0 - 2, 0.4, 0, hls(0.5, 0.25, 0.22))
        for k in range(8):
            m.box(rng.uniform(-hx + 4, hx - 4), rng.uniform(hy0 + 4, hy1 - 4), zd + 1.5, rng.uniform(5, 10), rng.uniform(4, 8), 2, rng.uniform(0, 3),
                  (SOOT if k % 2 else INK_D)(rng), (rng.uniform(-0.3, 0.3), 0))
        m.box(0, L / 2 - 16, zd + 3, 26, 16, 6, 0, SOOT(rng))
        for k in range(6):
            m.box(rng.uniform(-12, 12), L / 2 - 16 + rng.uniform(-7, 7), zd + 6.5, rng.uniform(5, 9), 2, 1, rng.uniform(0, 3), WHITE(rng), (rng.uniform(-0.5, 0.5), 0))
        lump(m, (W / 2 - 4, 6, zd), (6, 9, 1.2), SOOT, rng, n=5, jag=0.4)
    water(m, phase, random.Random(1811), sunk=not state)
    return m


PIECES = {'barge-1': lambda: barge(1, 0), 'barge-1-f2': lambda: barge(1, 1), 'barge-0': lambda: barge(0, 0)}
SHEET = {'barge-1': (-30, 60), 'barge-1-f2': (40, 60), 'barge-0': (110, 60)}


def render() -> None:
    (OUT / 'render').mkdir(parents=True, exist_ok=True)
    (OUT / 'sheets').mkdir(parents=True, exist_ok=True)
    sheet = Image.new('RGBA', (256, 256))
    place = {}
    for key, fn in PIECES.items():
        img, _ = frame(fn(), SIZE)
        im = Image.fromarray(img)
        im.save(OUT / 'render' / f'{key}.png')
        bb = im.getbbox()
        x, y = SHEET[key]
        print(key, bb)
        assert x + bb[0] >= 0 and y + bb[1] >= 0 and x + bb[2] <= 256 and y + bb[3] <= 256, (key, bb)
        sheet.alpha_composite(im.crop(bb), (x + bb[0], y + bb[1]))
        place[key] = {'x': x, 'y': y}
    sheet.save(OUT / 'sheets' / 'barge.png')
    (OUT / 'sheets' / 'barge.json').write_text(json.dumps(place, indent=1))


def cut() -> None:
    place = json.loads((OUT / 'sheets' / 'barge.json').read_text())
    art = np.array(Image.open(HERE / 'paint' / 'barge.png').convert('RGBA'))
    out = OUT / 'painted'
    out.mkdir(parents=True, exist_ok=True)
    for key, p in place.items():
        full = np.array(Image.open(OUT / 'render' / f'{key}.png').convert('RGBA'))
        ys, xs = np.nonzero(full[..., 3])
        by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        src = full[by0:by1, bx0:bx1]
        score, dx, dy = match(art, src, p['x'] + bx0, p['y'] + by0)
        ax, ay = p['x'] + bx0 + dx, p['y'] + by0 + dy
        piece = art[ay:ay + by1 - by0, ax:ax + bx1 - bx0]
        rgb = np.where(piece[..., 3:] > 0, piece[..., :3], src[..., :3])
        whole = np.zeros_like(full)
        whole[by0:by1, bx0:bx1] = np.dstack([rgb, src[..., 3]])
        Image.fromarray(whole).save(out / f'{key}.png')
        print(f'  {key:12s} match {score:.3f} shift {dx:+d},{dy:+d}')
    # Frame 2 is frame 1 wherever the model didn't change (the boat), its own paint only where the water moved: no flicker.
    r1 = np.array(Image.open(OUT / 'render' / 'barge-1.png').convert('RGBA')).astype(int)
    r2 = np.array(Image.open(OUT / 'render' / 'barge-1-f2.png').convert('RGBA')).astype(int)
    p1 = np.array(Image.open(out / 'barge-1.png'))
    p2 = np.array(Image.open(out / 'barge-1-f2.png'))
    same = (np.abs(r1 - r2).sum(axis=-1) < 10) & (r1[..., 3] > 0)
    p2[same] = p1[same]
    Image.fromarray(p2).save(out / 'barge-1-f2.png')
    print('  barge-1-f2 shares', int(same.sum()), 'px with frame 1')


def install() -> None:
    dest = HERE.parents[2] / 'src' / 'art' / 'pixel' / 'world'
    manifest = json.loads((dest / 'manifest.json').read_text())
    files = {}
    for key in PIECES:
        import shutil
        shutil.copy(OUT / 'painted' / f'{key}.png', dest / 'vehicles' / f'{key}.png')
        files[key] = f'vehicles/{key}.png'
    manifest['vehicles']['barge'] = {'size': SIZE, 'frames': ['barge-1', 'barge-1-f2'], 'wreck': 'barge-0', 'facing': 'north', 'files': files,
                                     'note': 'like the truck: swap the two frames while it moves (the bow wave and wake shift: it bobs)'}
    (dest / 'manifest.json').write_text(json.dumps(manifest, indent=1))
    print('  vehicle barge', list(files))


if __name__ == '__main__':
    {'render': render, 'cut': cut, 'install': install}[sys.argv[1]]()
