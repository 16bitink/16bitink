"""Our side's modern defences (owner, Nov 14: "those walls are ancient… white cement wall like in warzone 2100").

  python3 dev/pixel/concrete/build.py

Pieces (PixelLab create_image_pro, styled on the stone fort pieces for camera angle and size, kept here):
tower1.png (a square cement gun tower, 44×88), wallh0.png (a cement wall section, 64×44). The north-south wall is
assembled from the east-west wall's own slabs: its top is a strip of slab turned on its side, its end face a slab cut,
as the stone fortWallV is drawn. Each piece sits on the stone piece's canvas at the same spot, so the manifest's
anchors, footprints and shadows carry over.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
WORLD = HERE.parents[2] / 'src' / 'art' / 'pixel' / 'world'
OUT = WORLD / 'structures'
# new kind: (stone kind it stands in for, piece file or None for the assembled wall, paste spot on the stone canvas)
PIECES = {'cementTower': ('fortTower', 'tower1.png', (4, 45)), 'cementWallH': ('fortWallH', 'wallh0.png', (4, 34)), 'cementWallV': ('fortWallV', None, (5, 34))}


def wall_v(h: Image.Image) -> Image.Image:
    """14×101: a 64 px top strip (a slab band turned 90°) over a 37 px end face (a slab's front)."""
    w, top_len, face_h = 14, 64, 37
    bb = h.getbbox()
    h = h.crop(bb)
    # The slab front: below the wall's top lip.
    front = h.crop((2, 6, h.width - 2, h.height - 2))
    band = front.crop((0, 4, front.width, 4 + w)).rotate(90, expand=True)  # w wide, front.width tall
    top = Image.new('RGBA', (w, top_len))
    for y in range(0, top_len, band.height):
        top.paste(band, (0, y))
    # Lighter top, as the H wall's top lip is lit.
    top = Image.blend(top, Image.new('RGBA', top.size, (236, 236, 230, 255)), 0.25)
    face = front.crop((front.width // 2 - w // 2, front.height - face_h, front.width // 2 + w // 2, front.height))
    out = Image.new('RGBA', (w, top_len + face_h))
    out.paste(top, (0, 0))
    out.paste(face, (0, top_len))
    # A 1 px dark outline round the whole piece, and a crease where top meets face.
    px = out.load()
    for x in range(w):
        px[x, 0] = px[x, top_len - 1] = px[x, top_len + face_h - 1] = (40, 40, 44, 255)
    for y in range(top_len + face_h):
        px[0, y] = px[w - 1, y] = (40, 40, 44, 255)
    return out


def main() -> None:
    manifest = json.loads((WORLD / 'manifest.json').read_text())
    s = manifest['structures']
    for kind, (stone, src, at) in PIECES.items():
        art = Image.open(HERE / src).convert('RGBA') if src else wall_v(Image.open(HERE / 'wallh0.png').convert('RGBA'))
        if src:
            art = art.crop(art.getbbox())
        meta = json.loads(json.dumps(s[stone]))
        canvas = tuple(meta['size'])
        # Stand it where the stone piece stands: same left edge, same base line.
        sb = Image.open(OUT / f"{stone}-{meta['states'][0]}.png").getbbox()
        at = (sb[0], sb[3] - art.height)
        pieces, shadows = {}, {}
        for st in meta['states']:
            c = Image.new('RGBA', canvas)
            c.alpha_composite(art, at)
            c.save(OUT / f'{kind}-{st}.png')
            shutil.copy(OUT / f'{stone}-{st}-shadow.png', OUT / f'{kind}-{st}-shadow.png')
            pieces[f'{kind}-{st}'] = {'file': f'structures/{kind}-{st}.png', 'sortY': meta['pieces'][f'{stone}-{st}']['sortY']}
            shadows[str(st)] = f'structures/{kind}-{st}-shadow.png'
        meta['pieces'], meta['shadows'] = pieces, shadows
        s[kind] = meta
        print(kind, art.size, '->', canvas)
    (WORLD / 'manifest.json').write_text(json.dumps(manifest, indent=1))


if __name__ == '__main__':
    main()
