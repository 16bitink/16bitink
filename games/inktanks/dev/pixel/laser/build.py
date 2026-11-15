"""The Laser turret (chapter 4), Mk I to III: modelled, painted and installed like the Flamer (dev/pixel/flamer/build.py).

  python3 dev/pixel/laser/build.py render     out/render/turretLaser-mk<N>.png + meta.json (muzzles)
  python3 dev/pixel/laser/build.py pack       out/sheets/lasers.png + lasers.json (one 256 sheet, one paint call)
  python3 dev/pixel/laser/build.py cut        paint/lasers.png -> out/painted/, prints the worst match
  python3 dev/pixel/laser/build.py install    src/art/pixel/parts/turretLaser-mk<N>.png + icons/turretLaser.png + manifest entries

Run `install` again after dev/pixel/parts/install.py, which rebuilds the parts folder from scratch (idempotent).
Paint: PixelLab edit_image on the packed sheet, 256 x 256, transparent, seed 4401, prompt PROMPT below (10 generations).

A laser is a low rounded turret with a long slim emitter: a finned cooling jacket, focusing rings and a glowing cyan lens at
the tip, fed by a power cable from a crystal cell on the turret's back (cyan): from above, the fins, the lens and the glowing
cell tell it from every other gun. Mk II adds a second cooling jacket, a capacitor box and a bolted mantlet; Mk III a longer
emitter with three focusing rings, a radiator panel on the back, sandbags round the mount and an aerial, as the other Mk IIIs.
"""
from __future__ import annotations

import json
import math
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
PARTS = HERE.parent / 'parts'
sys.path.insert(0, str(PARTS))
import model  # noqa: E402  (shared, read-only)
import sheets  # noqa: E402  (parts/sheets.py, pointed at this folder below)
from model import (BAG, BLACK, BRASS, GUN, GUN_D, OLIVE, OLIVE_D, RIVET, RUST, SAND, SAND_D, Mesh, aerial, box, cyl, frustum,  # noqa: E402
                   rect, rivet_line, rivets)

OUT = HERE / 'out'
DEST = HERE.parents[2] / 'src' / 'art' / 'pixel' / 'parts'
NAME = 'turretLaser'
CYAN = np.array([0.35, 0.92, 0.95])
CYAN_D = np.array([0.1, 0.55, 0.62])
HOSE = np.array([0.16, 0.15, 0.14])
WHITE = np.array([0.85, 0.86, 0.84])
PROMPT = ('Turn this 3D render of three top-down tank gun turrets into masterful painterly pixel art for a top-down tank game, '
          'seen straight from above. Every part stays exactly where it is with the same silhouette, size and light; add nothing '
          'new; transparent stays transparent. Each is a laser turret: a low rounded olive drab turret, a long slim steel emitter '
          'barrel with dark cooling fins and polished focusing rings, a glowing cyan crystal lens at the tip, a glowing cyan power '
          'cell on the back with a black cable, worn paint, chipped edges, rivets, sandbags on the biggest. Warm sunlight from the '
          'top left, crisp dark outline.')


def hose(m, a, b, r=0.38, sag=0.6, n=5):
    """A hose from a to b, sagging a little, in short straight pieces."""
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * math.sin(math.pi * t)))
    for p, q in zip(pts, pts[1:]):
        mid = [(p[k] + q[k]) / 2 for k in range(3)]
        l = math.dist(p, q)
        ang = math.atan2(q[1] - p[1], q[0] - p[0])
        m.box(mid[0], mid[1], mid[2], l + 0.3, r * 2, r * 2, ang, HOSE)

def laser(tier: int):
    """The mesh and its muzzle (model units, rotation 0, from the ring)."""
    m = Mesh()
    z = 7.0
    big = tier == 3
    w = (11.0, 11.8, 12.6)[tier - 1]
    # A low rounded turret, its front sloped, a commander's hatch.
    frustum(m, rect(w, w + 0.6, 3.4, cy=0.8), rect(w - 3.4, w - 3.0, 2.8, cy=0.6), z, z + 3.4, OLIVE, top=OLIVE)
    rivets(m, rect(w - 3.4, w - 3.0, 2.8, cy=0.6), z + 3.4, 1.5, GUN)
    cyl(m, 'z', (-2.0, 2.2, z + 3.7), 0.6, 1.4, OLIVE_D, n=10, cap=GUN)
    # The emitter: a slim barrel, a finned cooling jacket, focusing rings, a lens housing with the glowing lens.
    length = (13.0, 14.0, 16.0)[tier - 1]
    y0 = -w / 2 + 0.8
    zc = z + 2.6
    cyl(m, 'y', (0, y0 - 0.9, zc), 2.4, 1.9, OLIVE_D, n=12)
    cyl(m, 'y', (0, y0 - length / 2, zc), length, 0.75, GUN, n=10)
    jackets = 1 if tier == 1 else 2
    for j in range(jackets):
        jy = y0 - 2.6 - j * 4.4
        for i in range(5):
            cyl(m, "y", (0, jy - i * 0.75, zc), 0.4, 1.6, GUN_D, n=10)
    tip = y0 - length
    for k in range({1: 1, 2: 2, 3: 3}[tier]):
        cyl(m, 'y', (0, tip + 2.2 + k * 1.4, zc), 0.6, 1.15, WHITE * 0.75, n=10)
    cyl(m, 'y', (0, tip + 0.8, zc), 1.6, 1.25, GUN_D, n=12)
    cyl(m, 'y', (0, tip + 0.0, zc), 0.25, 0.95, CYAN, n=12, cap=CYAN)
    # The power cell on the back: a crystal glowing through a slotted housing, a cable forward to the emitter's root.
    cy_ = w / 2 + 0.6
    box(m, 0, cy_, z + 0.6, 4.6, 3.6, 3.0, GUN_D)
    for i in range(3):
        box(m, -1.4 + i * 1.4, cy_, z + 3.6, 0.8, 2.8, 0.25, CYAN)
    hose(m, (2.6, cy_ - 1.0, z + 3.2), (1.6, y0 - 1.2, zc + 1.4), r=0.4, sag=-0.6)
    if tier >= 2:
        # A bolted mantlet round the emitter's root, a capacitor box on the right cheek.
        frustum(m, rect(5.2, 1.4, 0.4, cy=y0 - 0.2), rect(4.6, 1.0, 0.3, cy=y0 - 0.2), z + 0.6, z + 4.2, OLIVE_D)
        rivet_line(m, -2.2, y0 - 0.2, 2.2, y0 - 0.2, z + 4.2, step=1.1)
        box(m, w / 2 - 1.3, -0.8, z + 1.0, 1.9, 3.0, 2.2, GUN_D)
        box(m, w / 2 - 1.3, -1.6, z + 3.2, 1.0, 0.5, 0.3, CYAN_D)
    if big:
        # A radiator panel across the back, sandbags round the mount, an aerial.
        box(m, 0, cy_ + 2.6, z + 0.6, 9.0, 1.4, 2.6, GUN_D)
        for i in range(7):
            box(m, -3.6 + i * 1.2, cy_ + 2.6, z + 3.2, 0.4, 1.2, 0.2, GUN)
        for i in range(12):
            a = math.radians(-165 + i * 30)
            if abs(math.degrees(a)) > 150:
                continue
            cx, cy = 7.0 * math.sin(a), 0.8 + 7.0 * math.cos(a)
            turn = lambda pts, a=a, cx=cx, cy=cy: [(cx + (px - cx) * math.cos(-a) - (py - cy) * math.sin(-a), cy + (px - cx) * math.sin(-a) + (py - cy) * math.cos(-a)) for px, py in pts]
            frustum(m, turn(rect(3.2, 2.0, 0.6, cx, cy)), turn(rect(2.6, 1.4, 0.45, cx, cy)), z, z + 1.5, BAG if i % 3 else SAND_D)
        aerial(m, -w / 2 + 1.2, 1.6, z + 3.4, 4.0)
        box(m, -w / 2 + 0.6, -1.8, z + 1.0, 1.8, 2.6, 1.8, SAND)
    return m, (0.0, tip)


def render() -> None:
    d = OUT / 'render'
    d.mkdir(parents=True, exist_ok=True)
    meta = {'muzzle': {}}
    for t in (1, 2, 3):
        mesh, (mx, my) = laser(t)
        rgba, _ = model.draw(mesh)
        Image.fromarray(rgba).save(d / f'{NAME}-mk{t}.png')
        meta['muzzle'][f'{NAME}-mk{t}'] = [[round(mx * model.UNIT, 1), round(my * model.UNIT, 1)]]
    (d / 'meta.json').write_text(json.dumps(meta, indent=1))
    print('rendered', list(meta['muzzle'].items()))


def point_sheets() -> None:
    sheets.RENDER = OUT / 'render'
    sheets.SHEETS = OUT / 'sheets'
    sheets.PAINTED = OUT / 'painted'
    sheets.HERE = HERE
    sheets.SETS['lasers'] = [f'{NAME}-mk{t}' for t in (1, 2, 3)]


def install() -> None:
    meta = json.loads((OUT / 'render' / 'meta.json').read_text())
    for t in (1, 2, 3):
        key = f'{NAME}-mk{t}'
        src = OUT / 'painted' / f'{key}.png'
        shutil.copy(src if src.exists() else OUT / 'render' / f'{key}.png', DEST / f'{key}.png')
    # The icon at the same scale as the other turrets' icons (one scale per kind, from their Mk I).
    import importlib.util
    spec = importlib.util.spec_from_file_location('parts_install', PARTS / 'install.py')
    parts_install = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(parts_install)
    kind = ['turretMG', 'turretCannon', 'turretRocket', NAME]
    ims = {f: Image.open(DEST / f'{f}-mk1.png').convert('RGBA') for f in kind}
    ims = {f: im.crop(im.getbbox()) for f, im in ims.items()}
    k = parts_install.ICON_FIT / max(max(i.width, i.height) for f, i in ims.items() if f != NAME)
    im = ims[NAME]
    w, h = max(4, round(im.width * k)), max(4, round(im.height * k))
    small = im.resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1, 80, 2))
    icon = Image.new('RGBA', (parts_install.ICON, parts_install.ICON))
    icon.alpha_composite(small, ((parts_install.ICON - w) // 2, (parts_install.ICON - h) // 2))
    parts_install.outlined(icon).save(DEST / 'icons' / f'{NAME}.png')
    man = json.loads((DEST / 'manifest.json').read_text())
    if NAME not in man['families']['turrets']:
        man['families']['turrets'].append(NAME)
    for t in (1, 2, 3):
        key = f'{NAME}-mk{t}'
        if key not in man['keys']:
            man['keys'].append(key)
        man['muzzle'][key] = meta['muzzle'][key]
    man['icons'][NAME] = f'icons/{NAME}.png'
    (DEST / 'manifest.json').write_text(json.dumps(man, indent=1))
    print('installed', NAME, 'mk1-3 + icon; muzzles', {k: v for k, v in man['muzzle'].items() if k.startswith(NAME)})


if __name__ == '__main__':
    cmd = sys.argv[1]
    point_sheets()
    if cmd == 'render':
        render()
    elif cmd == 'pack':
        sheets.pack('lasers')
    elif cmd == 'cut':
        sheets.cut('lasers')
    elif cmd == 'install':
        install()
