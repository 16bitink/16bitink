"""Repaints only what moved on the Ironclad (Nov 14: its turret races moved to level 30's turret offsets, as the fortress's
and the crawler's did; dev/pixel/desert/rings.py is the same recipe).

  python3 dev/pixel/swamp/rings.py prep     out/rings/ironclad-body-patch.png (old paint + the new render where the model
                                            changed, the 256 window of the 288 frame) + -mask.png; the wheels' paint moved down
  python3 dev/pixel/swamp/rings.py merge    paint/rings/ironclad-body.png -> the new painted body: old paint where nothing
                                            changed, PixelLab's paint only in the changed area; alpha = new render

* Between the two: edit_image on out/rings/ironclad-body-patch.png, 256, transparent, seed 3602, PROMPT -> paint/rings/ironclad-body.png.
The old render and paint are kept in out/rings/ (-render-old, -painted-old). The wheels only moved (WHEEL y 8 -> 34): their
painting is moved the same 26 px and frame 2 rolled again (build.py ironclad-cut's roll).
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out' / 'rings'
CROP = (16, 8, 272, 264)
KEY = 'ironclad-body'
WHEEL_MOVE = 26
PROMPT = ('Paint the plain grey 3D-render parts of this top-down river ironclad to match the painted pixel art around them: '
          'riveted dark grey-green iron armour with rust streaks and mustard yellow trim, round armoured gun sponsons with '
          'bolted steel turret rings round dark grey plates, black funnels with mustard bands. Everything stays exactly where '
          'it is with the same silhouette, size and light; the already painted parts stay as they are; transparent stays '
          'transparent. Crisp dark outline, warm sunlight from the top left.')


def arr(p: Path) -> np.ndarray:
    return np.array(Image.open(p).convert('RGBA'))


def prep() -> None:
    old = arr(OUT / f'{KEY}-render-old.png').astype(int)
    new = arr(HERE / 'out' / 'render' / f'{KEY}.png').astype(int)
    paint = arr(OUT / f'{KEY}-painted-old.png')
    diff = np.abs(old - new).sum(axis=-1) > 12
    mask = np.array(Image.fromarray(diff.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0
    mask &= new[..., 3] > 0
    patch = paint.copy()
    patch[mask] = new[mask]
    patch[..., 3] = new[..., 3]
    Image.fromarray(patch.astype(np.uint8)).crop(CROP).save(OUT / f'{KEY}-patch.png')
    Image.fromarray(mask.astype(np.uint8) * 255).save(OUT / f'{KEY}-mask.png')
    print(KEY, 'changed px', int(mask.sum()))
    wheels()


def wheels() -> None:
    """The wheels' painting moved down with the model; checked against the new render's outline."""
    old = arr(OUT / 'ironclad-wheels-painted-old.png')
    moved = np.zeros_like(old)
    moved[WHEEL_MOVE:] = old[:-WHEEL_MOVE]
    new = arr(HERE / 'out' / 'render' / 'ironclad-wheels.png')
    a, b = moved[..., 3] > 0, new[..., 3] > 0
    print('wheels moved', WHEEL_MOVE, 'px; outline match', round(float((a & b).sum() / (a | b).sum()), 3))
    moved[..., 3] = new[..., 3]
    out = HERE / 'out' / 'painted'
    Image.fromarray(moved).save(out / 'ironclad-wheels.png')
    sys.path.insert(0, str(HERE.parent))
    import rollframes  # noqa: E402
    sys.path.insert(0, str(HERE))
    from build import WHEEL_STEP  # noqa: E402
    runs = rollframes.tread_runs(moved, None)
    Image.fromarray(rollframes.rolled(moved, runs, WHEEL_STEP, WHEEL_STEP // 2)).save(out / 'ironclad-wheels-f2.png')


def merge() -> None:
    new = arr(HERE / 'out' / 'render' / f'{KEY}.png')
    mask = arr(OUT / f'{KEY}-mask.png')[..., 0] > 0
    art = np.zeros_like(new)
    art[CROP[1]:CROP[3], CROP[0]:CROP[2]] = arr(HERE / 'paint' / 'rings' / f'{KEY}.png')
    out = arr(OUT / f'{KEY}-painted-old.png')
    take = mask & (art[..., 3] > 0)
    out[take, :3] = art[take, :3]
    hole = mask & ~take
    out[hole, :3] = new[hole, :3]
    out[..., 3] = new[..., 3]
    Image.fromarray(out).save(HERE / 'out' / 'painted' / f'{KEY}.png')
    print(KEY, 'repainted', int(take.sum()), 'px; from the model', int(hole.sum()))


if __name__ == '__main__':
    {'prep': prep, 'merge': merge}[sys.argv[1]]()
