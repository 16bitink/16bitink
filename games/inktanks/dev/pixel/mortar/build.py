"""The Mortar turret (chapter 2), Mk I to III: modelled, painted and installed like chapter 1's turrets (dev/pixel/parts/).

  python3 dev/pixel/mortar/build.py render     out/render/turretMortar-mk<N>.png + meta.json (muzzles)
  python3 dev/pixel/mortar/build.py pack       out/sheets/mortars.png + mortars.json (one 256 sheet, one paint call)
  python3 dev/pixel/mortar/build.py cut        paint/mortars.png -> out/painted/, prints the worst match
  python3 dev/pixel/mortar/build.py install    src/art/pixel/parts/turretMortar-mk<N>.png + icons/turretMortar.png + manifest entries

Run `install` again after dev/pixel/parts/install.py, which rebuilds the parts folder from scratch.
Paint: PixelLab edit_image on the packed sheet, 256 x 256, transparent, prompt in PROMPT below (10 generations).

A mortar is a short fat tube on a turntable, pitched steeply up towards the north, so from straight above it reads as a
foreshortened tube with its bore showing: no other gun shows a bore. Mk II adds a gun shield, a second ammo box and a
sight; Mk III a bigger tube with a muzzle ring and recoil springs, a ring of sandbags and an aerial, as the MG Mk III.
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
from model import (BAG, BLACK, BRASS, GUN, GUN_D, OLIVE, OLIVE_D, RIVET, SAND, SAND_D, WOOD, Mesh, aerial, box, cyl, frustum,  # noqa: E402
                   pitch_pt, placed, rect, rivet_line, rivets)

OUT = HERE / 'out'
DEST = HERE.parents[2] / 'src' / 'art' / 'pixel' / 'parts'
NAME = 'turretMortar'
PITCH = 0.95
PROMPT = ('Turn this 3D render of three top-down tank gun turrets into masterful painterly pixel art for a top-down tank game, '
          'seen straight from above. Every part stays exactly where it is with the same silhouette, size and light; add nothing '
          'new; transparent stays transparent. Each is a heavy mortar on a turntable: a short, thick steel tube tilted steeply '
          'up, its round black bore showing, olive drab armour with worn paint, chipped edges, rivets, brass shells in a '
          'wooden ammo box, sandbags on the biggest. Warm sunlight from the top left, crisp dark outline.')


def mortar(tier: int):
    """The mesh and its muzzle (model units, rotation 0, from the ring)."""
    m = Mesh()
    z = 7.0
    big = tier == 3
    # The turntable and its base plate.
    cyl(m, 'z', (0, 0.6, z + 0.6), 1.2, 5.6 + 0.3 * (tier - 1), OLIVE_D, n=16, cap=OLIVE)
    rivets(m, rect(8.6, 8.6, 2.6, cy=0.6), z + 1.2, 1.5, GUN)
    # The cradle: two cheek plates either side of the tube's trunnion, the elevating screw behind.
    for sx in (-1, 1):
        frustum(m, rect(1.2, 6.0, 0.3, cx=sx * 3.1, cy=0.2), rect(1.0, 3.2, 0.2, cx=sx * 3.1, cy=-0.4), z + 1.2, z + 5.0, OLIVE, top=OLIVE_D)
    cyl(m, 'x', (0, -0.6, z + 4.0), 7.4, 0.8, GUN_D, n=8)
    cyl(m, 'z', (0, 2.6, z + 2.6), 2.8, 0.6, GUN, n=8)
    # The tube: thick and short, pitched up towards the north, its bore a black disk at the top end.
    r = 2.9 if big else 2.4 + 0.2 * (tier - 1)
    length = 13.0 if big else 11.5 + 0.5 * (tier - 1)
    tube = Mesh()
    cyl(tube, 'y', (0, -length / 2 + 2.0, 0), length, r, GUN, n=14, cap=GUN_D)
    cyl(tube, 'y', (0, -length + 2.0 + 0.05, 0), 0.2, r * 0.7, BLACK, n=14, cap=BLACK)
    cyl(tube, 'y', (0, 1.6, 0), 1.6, r + 0.25, GUN_D, n=14)
    if tier >= 2:
        cyl(tube, 'y', (0, -length * 0.45, 0), 0.8, r + 0.25, GUN_D, n=14)
    if big:
        # Muzzle ring and two recoil springs along the tube.
        cyl(tube, 'y', (0, -length + 2.6, 0), 1.2, r + 0.45, GUN_D, n=14)
        for sx in (-1, 1):
            cyl(tube, 'y', (sx * (r + 0.4), -length * 0.25, -0.6), length * 0.6, 0.45, RIVET, n=6)
    placed(m, tube, (0, -0.6, z + 4.0), pitch=PITCH)
    px, py, _ = pitch_pt((0, -length + 2.0, 0), PITCH)
    muzzle = (0.0, py - 0.6)
    # The ammo box at the back, brass shell noses showing.
    box(m, 0, 5.4, z + 1.2, 5.6, 2.6, 2.0, WOOD)
    for i in range(4):
        cyl(m, 'z', (-2.1 + i * 1.4, 5.4, z + 3.3), 0.4, 0.5, BRASS, n=8)
    if tier >= 2:
        # A bolted shield low in front, a second ammo box, a sight on the left cheek.
        frustum(m, rect(10.0, 1.2, 0.4, cy=-5.4), rect(9.4, 0.9, 0.3, cy=-5.4), z + 1.0, z + 3.6, OLIVE)
        rivet_line(m, -4.4, -5.4, 4.4, -5.4, z + 3.6, step=1.3)
        box(m, 4.6, 2.4, z + 1.2, 2.4, 3.4, 1.8, SAND)
        box(m, -4.0, -0.6, z + 4.4, 1.4, 2.2, 1.2, GUN_D)
        box(m, -4.0, -1.8, z + 5.0, 0.8, 0.3, 0.4, BLACK)
    if big:
        for i in range(12):
            a = math.radians(-165 + i * 30)
            cx, cy = 7.0 * math.sin(a), 0.8 + 7.0 * math.cos(a)
            turn = lambda pts, a=a, cx=cx, cy=cy: [(cx + (px - cx) * math.cos(-a) - (py - cy) * math.sin(-a), cy + (px - cx) * math.sin(-a) + (py - cy) * math.cos(-a)) for px, py in pts]
            if abs(math.degrees(a)) > 150:
                continue
            frustum(m, turn(rect(3.2, 2.0, 0.6, cx, cy)), turn(rect(2.6, 1.4, 0.45, cx, cy)), z, z + 1.5, BAG if i % 3 else SAND_D)
        aerial(m, 3.4, 4.2, z + 1.8, 4.0)
        box(m, -4.6, 2.6, z + 1.2, 2.4, 3.4, 1.8, SAND)
    return m, muzzle


def render() -> None:
    d = OUT / 'render'
    d.mkdir(parents=True, exist_ok=True)
    meta = {'muzzle': {}}
    for t in (1, 2, 3):
        mesh, (mx, my) = mortar(t)
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
    sheets.SETS['mortars'] = [f'{NAME}-mk{t}' for t in (1, 2, 3)]


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
        sheets.pack('mortars')
    elif cmd == 'cut':
        sheets.cut('mortars')
    elif cmd == 'install':
        install()
