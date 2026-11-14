"""Repaints only what moved on a boss body (Nov 14: the turret races moved to where the levels' turrets stand).

  python3 dev/pixel/desert/rings.py prep     out/rings/<key>-patch.png (old paint + the new render where the model changed) + -mask.png
  python3 dev/pixel/desert/rings.py merge    paint/rings/<key>.png -> the new painted body: old paint where nothing changed,
                                             PixelLab's paint (edit_image, 256 crop) only in the changed area; alpha = new render

The old renders the mask is measured against are kept in out/rings/<key>-render-old.png.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
WORLD_DEV = HERE.parent / 'world'
OUT = HERE / 'out' / 'rings'
CROP = {'crawler-body': (16, 8, 272, 264), 'fortress-body': (16, 0, 272, 256)}  # the 256 px window of the 288 frame holding each body
BODIES = {
    'crawler-body': (HERE / 'out' / 'render' / 'crawler-body.png', HERE / 'out' / 'painted' / 'crawler-body.png'),
    'fortress-body': (WORLD_DEV / 'out' / 'render' / 'fortress' / 'fortress-body.png', WORLD_DEV / 'out' / 'painted' / 'fortress' / 'fortress-body.png'),
}


def arr(p: Path) -> np.ndarray:
    return np.array(Image.open(p).convert('RGBA'))


def prep() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for key, (render, painted) in BODIES.items():
        old = arr(OUT / f'{key}-render-old.png').astype(int)
        new = arr(render).astype(int)
        paint = arr(painted)
        diff = (np.abs(old - new).sum(axis=-1) > 12)
        mask = np.array(Image.fromarray(diff.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0
        mask &= new[..., 3] > 0
        patch = paint.copy()
        patch[mask] = new[mask]
        patch[..., 3] = new[..., 3]
        Image.fromarray(patch.astype(np.uint8)).crop(CROP[key]).save(OUT / f'{key}-patch.png')
        Image.fromarray(mask.astype(np.uint8) * 255).save(OUT / f'{key}-mask.png')
        print(key, 'changed px', int(mask.sum()))


def merge() -> None:
    for key, (render, painted) in BODIES.items():
        new = arr(render)
        mask = arr(OUT / f'{key}-mask.png')[..., 0] > 0
        art = np.zeros_like(new)
        c = CROP[key]
        art[c[1]:c[3], c[0]:c[2]] = arr(HERE / 'paint' / 'rings' / f'{key}.png')
        if not (OUT / f'{key}-painted-old.png').exists():
            shutil.copy(painted, OUT / f'{key}-painted-old.png')
        out = arr(OUT / f'{key}-painted-old.png')
        take = mask & (art[..., 3] > 0)
        out[take, :3] = art[take, :3]
        hole = mask & ~take
        out[hole, :3] = new[hole, :3]
        out[..., 3] = new[..., 3]
        Image.fromarray(out).save(painted)
        print(key, 'repainted', int(take.sum()), 'px; from the model', int(hole.sum()))


if __name__ == '__main__':
    {'prep': prep, 'merge': merge}[sys.argv[1]]()
