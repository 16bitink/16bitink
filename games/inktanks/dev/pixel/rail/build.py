"""The Rail turret (chapter 5), Mk I to III: modelled, painted and installed like the Laser (dev/pixel/laser/build.py).

  python3 dev/pixel/rail/build.py render     out/render/turretRail-mk<N>.png + meta.json (muzzles)
  python3 dev/pixel/rail/build.py pack       out/sheets/rails.png + rails.json (one 256 sheet, one paint call)
  python3 dev/pixel/rail/build.py cut        paint/rails.png -> out/painted/, prints the worst match
  python3 dev/pixel/rail/build.py install    src/art/pixel/parts/turretRail-mk<N>.png + icons/turretRail.png + manifest entries

Run `install` again after dev/pixel/parts/install.py, which rebuilds the parts folder from scratch (idempotent).
Paint: PixelLab edit_image on the packed sheet, 256 x 256, transparent, seed 5401, prompt PROMPT below (10 generations).
Then `python3 dev/pixel/blueprints.py` (FAMILY_ICON 'rail') for the bp-rail pickup.

A rail gun is an angular, wedge-fronted turret with two long flat parallel rails running forward, a dark slot between them,
wrapped at intervals by copper field coils, fed by a bank of glowing blue-white capacitor cells across the turret's back: from
above, the twin rails with the gap, the copper bands and the blue-white cells tell it from the Laser (one round finned emitter,
cyan lens). Mk II adds a second coil set, longer rails, side capacitor pods and a bolted mantlet; Mk III the longest rails with
three coil sets and a muzzle brace, a radiator across the back, sandbags round the mount and an aerial, as the other Mk IIIs.
"""
from __future__ import annotations

import importlib.util
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
from model import BAG, GUN, GUN_D, OLIVE, OLIVE_D, SAND, SAND_D, aerial, box, cyl, frustum, rect, rivet_line, rivets  # noqa: E402

OUT = HERE / 'out'
DEST = HERE.parents[2] / 'src' / 'art' / 'pixel' / 'parts'
NAME = 'turretRail'
COPPER = np.array([0.72, 0.42, 0.22])
COPPER_D = np.array([0.5, 0.27, 0.13])
VOLT = np.array([0.7, 0.82, 1.0])      # blue-white charge glow
VOLT_D = np.array([0.32, 0.42, 0.85])
STEEL = np.array([0.55, 0.57, 0.6])
HOSE = np.array([0.16, 0.15, 0.14])
PROMPT = ('Turn this 3D render of three top-down tank gun turrets into masterful painterly pixel art for a top-down tank game, '
          'seen straight from above. Every part stays exactly where it is with the same silhouette, size and light; add nothing '
          'new; transparent stays transparent. Each is a rail gun turret: an angular olive drab turret, two long flat parallel '
          'polished steel rails running forward with a dark slot between them, wrapped by shiny copper coil bands, a row of '
          'glowing blue-white capacitor cells on the back with black cables, worn paint, chipped edges, rivets, sandbags on the '
          'biggest. Warm sunlight from the top left, crisp dark outline.')


def rail(tier: int):
    """The mesh and its muzzle (model units, rotation 0, from the ring)."""
    m = model.Mesh()
    z = 7.0
    big = tier == 3
    w = (11.0, 11.8, 12.6)[tier - 1]
    # An angular wedge-fronted turret: wide at the back, its front cut in a chisel, a commander's hatch.
    back = w / 2 + 0.6
    lo = [(-w / 2, back), (w / 2, back), (w / 2, -w / 2 + 1.8), (w / 4, -w / 2), (-w / 4, -w / 2), (-w / 2, -w / 2 + 1.8)]
    hi = [(x * 0.74, y * 0.8 + 0.3) for x, y in lo]
    frustum(m, lo, hi, z, z + 3.2, OLIVE, top=OLIVE)
    rivets(m, hi, z + 3.2, 1.5, GUN)
    cyl(m, 'z', (-2.2, 1.8, z + 3.5), 0.6, 1.3, OLIVE_D, n=10, cap=GUN)
    # The rails: two flat steel bars with the slot between, a breech block at their root.
    length = (14.0, 15.5, 18.0)[tier - 1]
    y0 = -w / 2 + 0.8
    zc = z + 2.4
    box(m, 0, y0 - 0.6, zc - 1.2, 4.4, 3.2, 2.6, GUN_D)
    for sx in (-1, 1):
        box(m, sx * 1.15, y0 - length / 2, zc - 0.6, 1.1, length, 1.4, STEEL)
        box(m, sx * 1.15, y0 - length / 2, zc + 0.8, 0.5, length, 0.2, STEEL * 1.15)
    box(m, 0, y0 - length / 2, zc - 0.9, 1.2, length, 0.3, VOLT_D * 0.6)
    # Copper field coils wrapping both rails, in sets of three bands.
    sets = {1: 1, 2: 2, 3: 3}[tier]
    for s in range(sets):
        cy = y0 - 3.0 - s * 4.4
        for i in range(3):
            box(m, 0, cy - i * 0.7, zc - 1.0, 3.8, 0.45, 2.4, COPPER if i % 2 == 0 else COPPER_D)
    # The muzzle: a steel brace across the rails' tips, a faint glow between them.
    tip = y0 - length
    box(m, 0, tip + 0.5, zc - 0.6, 3.6, 0.8, 1.6, GUN_D)
    box(m, 0, tip + 0.2, zc - 0.4, 1.0, 0.6, 0.6, VOLT)
    # The capacitor bank on the back: glowing cells in a frame, cables forward along both cheeks to the breech.
    cy_ = back + 0.9
    box(m, 0, cy_, z + 0.6, w - 2.2, 2.6, 2.8, GUN_D)
    cells = (3, 4, 5)[tier - 1]
    for i in range(cells):
        x = (i - (cells - 1) / 2) * (w - 4.2) / max(1, cells - 1)
        cyl(m, 'z', (x, cy_, z + 3.4), 0.5, 0.75, VOLT, n=10, cap=VOLT)
    for sx in (-1, 1):
        # A cable along each cheek from the bank to the breech.
        x = sx * (w / 2 - 1.5)
        box(m, x, (cy_ + y0) / 2, z + 3.2, 0.7, cy_ - y0 - 1.0, 0.7, HOSE)
    if tier >= 2:
        # A bolted mantlet round the rails' root, capacitor pods on both cheeks.
        frustum(m, rect(5.6, 1.4, 0.4, cy=y0 - 0.2), rect(5.0, 1.0, 0.3, cy=y0 - 0.2), z + 0.6, z + 4.0, OLIVE_D)
        rivet_line(m, -2.4, y0 - 0.2, 2.4, y0 - 0.2, z + 4.0, step=1.1)
        for sx in (-1, 1):
            box(m, sx * (w / 2 - 0.4), 0.6, z + 0.8, 1.8, 3.6, 2.2, GUN_D)
            box(m, sx * (w / 2 - 0.4), 0.6, z + 3.0, 0.9, 2.4, 0.25, VOLT_D)
    if big:
        # A radiator across the back, sandbags round the mount, an aerial.
        box(m, 0, cy_ + 2.4, z + 0.6, 9.4, 1.4, 2.4, GUN_D)
        for i in range(7):
            box(m, -3.6 + i * 1.2, cy_ + 2.4, z + 3.0, 0.4, 1.2, 0.2, GUN)
        for i in range(12):
            a = math.radians(-165 + i * 30)
            if abs(math.degrees(a)) > 150:
                continue
            cx, cy = 7.0 * math.sin(a), 0.8 + 7.0 * math.cos(a)
            turn = lambda pts, a=a, cx=cx, cy=cy: [(cx + (px - cx) * math.cos(-a) - (py - cy) * math.sin(-a), cy + (px - cx) * math.sin(-a) + (py - cy) * math.cos(-a)) for px, py in pts]  # noqa: E731
            frustum(m, turn(rect(3.2, 2.0, 0.6, cx, cy)), turn(rect(2.6, 1.4, 0.45, cx, cy)), z, z + 1.5, BAG if i % 3 else SAND_D)
        aerial(m, -w / 2 + 1.2, 2.0, z + 3.2, 4.0)
        box(m, w / 2 - 0.6, -2.0, z + 1.0, 1.8, 2.6, 1.8, SAND)
    return m, (0.0, tip)


def render() -> None:
    d = OUT / 'render'
    d.mkdir(parents=True, exist_ok=True)
    meta = {'muzzle': {}}
    for t in (1, 2, 3):
        mesh, (mx, my) = rail(t)
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
    sheets.SETS['rails'] = [f'{NAME}-mk{t}' for t in (1, 2, 3)]


def install() -> None:
    meta = json.loads((OUT / 'render' / 'meta.json').read_text())
    for t in (1, 2, 3):
        key = f'{NAME}-mk{t}'
        src = OUT / 'painted' / f'{key}.png'
        shutil.copy(src if src.exists() else OUT / 'render' / f'{key}.png', DEST / f'{key}.png')
    # The icon at the same scale as the other turrets' icons (one scale per kind, from their Mk I).
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
        sheets.pack('rails')
    elif cmd == 'cut':
        sheets.cut('rails')
    elif cmd == 'install':
        install()
