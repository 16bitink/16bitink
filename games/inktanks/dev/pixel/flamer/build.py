"""The Flamer turret (chapter 3), Mk I to III: modelled, painted and installed like the Mortar (dev/pixel/mortar/build.py).

  python3 dev/pixel/flamer/build.py render     out/render/turretFlamer-mk<N>.png + meta.json (muzzles)
  python3 dev/pixel/flamer/build.py pack       out/sheets/flamers.png + flamers.json (one 256 sheet, one paint call)
  python3 dev/pixel/flamer/build.py cut        paint/flamers.png -> out/painted/, prints the worst match
  python3 dev/pixel/flamer/build.py install    src/art/pixel/parts/turretFlamer-mk<N>.png + icons/turretFlamer.png + manifest entries

Run `install` again after dev/pixel/parts/install.py, which rebuilds the parts folder from scratch (idempotent).
Paint: PixelLab edit_image on the packed sheet, 256 x 256, transparent, seed 3301, prompt PROMPT below (10 generations).

A flamer is a squat rounded turret with a short projector tube ending in a flared nozzle with an igniter under its lip,
fed by hoses from two fuel tanks on the turret's back (red bands): from above, the tanks and hoses tell it from every
other gun. Mk II adds a bolted mantlet, a third tank and a pilot-light box; Mk III a longer projector in a perforated heat
shroud, four tanks in a cradle, sandbags round the mount and an aerial, as the other Mk IIIs.
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
NAME = 'turretFlamer'
RED = np.array([0.55, 0.16, 0.12])
HOSE = np.array([0.16, 0.15, 0.14])
PROMPT = ('Turn this 3D render of three top-down tank gun turrets into masterful painterly pixel art for a top-down tank game, '
          'seen straight from above. Every part stays exactly where it is with the same silhouette, size and light; add nothing '
          'new; transparent stays transparent. Each is a flamethrower turret: a squat olive drab turret, a short scorched steel '
          'projector tube ending in a flared nozzle blackened with soot, black rubber fuel hoses, round fuel tanks with red '
          'warning bands on the back, worn paint, chipped edges, rivets, sandbags on the biggest. Warm sunlight from the top '
          'left, crisp dark outline.')


def tank(m, x, y, z, length, r):
    """A fuel tank lying along y: steel drum, red bands, a filler cap."""
    cyl(m, 'y', (x, y, z), length, r, OLIVE_D, n=12, cap=GUN)
    for f in (-0.3, 0.3):
        cyl(m, 'y', (x, y + f * length, z), 0.7, r + 0.08, RED, n=12)
    cyl(m, 'z', (x, y - length * 0.15, z + r), 0.5, 0.45, BRASS, n=6)


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


def flamer(tier: int):
    """The mesh and its muzzle (model units, rotation 0, from the ring)."""
    m = Mesh()
    z = 7.0
    big = tier == 3
    w = (11.5, 12.2, 13.0)[tier - 1]
    # A squat rounded turret, its front sloped.
    frustum(m, rect(w, w + 1.0, 3.2, cy=0.6), rect(w - 3.2, w - 2.6, 2.4, cy=0.2), z, z + 3.6, OLIVE, top=OLIVE)
    rivets(m, rect(w - 3.2, w - 2.6, 2.4, cy=0.2), z + 3.6, 1.5, GUN)
    cyl(m, 'z', (1.6, 1.4, z + 3.9), 0.6, 1.3, OLIVE_D, n=10, cap=GUN)
    # The projector: a short tube, a fat flared nozzle, the igniter under its lip.
    length = (9.0, 9.5, 11.5)[tier - 1]
    y0 = -w / 2 + 0.6
    cyl(m, 'y', (0, y0 - 1.0, z + 2.4), 2.6, 2.3, OLIVE_D, n=12)
    cyl(m, 'y', (0, y0 - length / 2, z + 2.4), length, 1.35, GUN, n=10)
    tip = y0 - length
    cyl(m, 'y', (0, tip + 1.6, z + 2.4), 1.2, 1.75, GUN_D, n=12)
    cyl(m, 'y', (0, tip + 0.6, z + 2.4), 1.2, 2.15, GUN_D, n=12)
    cyl(m, 'y', (0, tip + 0.05, z + 2.4), 0.2, 1.5, BLACK, n=12, cap=BLACK)
    box(m, 1.9, tip + 2.6, z + 1.0, 1.2, 2.0, 1.0, BRASS)
    if big:
        # A perforated heat shroud round the tube.
        cyl(m, 'y', (0, y0 - length * 0.45, z + 2.4), length * 0.55, 1.7, GUN_D, n=10)
        for i in range(5):
            box(m, 0, y0 - length * 0.22 - i * 1.15, z + 4.0, 0.6, 0.6, 0.12, BLACK)
    # Fuel tanks on the turret's back, hoses forward to the projector.
    ty = w / 2 + 1.2
    xs = {1: (-2.4, 2.4), 2: (-3.6, 0.0, 3.6), 3: (-5.1, -1.7, 1.7, 5.1)}[tier]
    r = 1.6 if tier < 3 else 1.5
    for x in xs:
        tank(m, x, ty, z + 2.2, 6.4, r)
    if big:
        for f in (-0.42, 0.42):
            box(m, 0, ty + f * 6.4, z + 0.6, 12.0, 0.8, 1.0, GUN_D)
    for x in xs[:2] if tier < 3 else (xs[1], xs[2]):
        hose(m, (x, ty - 3.2, z + 3.0), (x * 0.3, y0 - 1.8, z + 4.4), r=0.5, sag=-0.8)
    if tier >= 2:
        # A bolted mantlet round the projector's root, a pilot-light box on the right cheek.
        frustum(m, rect(6.4, 1.4, 0.4, cy=y0 - 0.2), rect(5.8, 1.0, 0.3, cy=y0 - 0.2), z + 0.6, z + 4.2, OLIVE_D)
        rivet_line(m, -2.8, y0 - 0.2, 2.8, y0 - 0.2, z + 4.2, step=1.2)
        box(m, w / 2 - 1.2, -1.2, z + 1.0, 1.8, 2.6, 2.0, GUN_D)
        box(m, w / 2 - 1.2, -2.6, z + 2.2, 0.8, 0.4, 0.5, BRASS)
    if big:
        for i in range(12):
            a = math.radians(-165 + i * 30)
            if abs(math.degrees(a)) > 150:
                continue
            cx, cy = 7.2 * math.sin(a), 0.8 + 7.2 * math.cos(a)
            turn = lambda pts, a=a, cx=cx, cy=cy: [(cx + (px - cx) * math.cos(-a) - (py - cy) * math.sin(-a), cy + (px - cx) * math.sin(-a) + (py - cy) * math.cos(-a)) for px, py in pts]
            frustum(m, turn(rect(3.2, 2.0, 0.6, cx, cy)), turn(rect(2.6, 1.4, 0.45, cx, cy)), z, z + 1.5, BAG if i % 3 else SAND_D)
        aerial(m, -w / 2 + 1.2, 1.6, z + 3.6, 4.0)
        box(m, -w / 2 + 0.6, -1.8, z + 1.0, 1.8, 2.6, 1.8, SAND)
    return m, (0.0, tip)


def render() -> None:
    d = OUT / 'render'
    d.mkdir(parents=True, exist_ok=True)
    meta = {'muzzle': {}}
    for t in (1, 2, 3):
        mesh, (mx, my) = flamer(t)
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
    sheets.SETS['flamers'] = [f'{NAME}-mk{t}' for t in (1, 2, 3)]


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
        sheets.pack('flamers')
    elif cmd == 'cut':
        sheets.cut('flamers')
    elif cmd == 'install':
        install()
