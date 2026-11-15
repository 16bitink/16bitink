"""Our side's modern defences (owner, Nov 14: "those walls are ancient… white cement wall like in warzone 2100").

  python3 dev/pixel/concrete/build.py

Pieces (PixelLab create_image_pro, styled on the stone fort pieces for camera angle and size, kept here):
tower1.png (a square cement gun tower, 44×88), wallh0.png (a cement wall section, 64×44). The north-south wall is
assembled from the east-west wall's own slabs: its top is a strip of slab turned on its side, its end face a slab cut,
as the stone fortWallV is drawn. Each piece sits on the stone piece's canvas at the same spot, so the manifest's
anchors, footprints and shadows carry over.
Nov 15: tower1.png was corner-on (owner: roof "should be just flat, not squeezed"); the tower is now towerflat.png (40×74, face-on like the walls: flat roof from above over the south face; face trimmed to wall height, centred; TOWER_TOP in tankView.ts).
Nov 15, later: wallh0.png sloped (owner: "the top and bottom walls can be just straight"); the H wall is now wallflat.png (create_image_pro styled on the tower, cut whole from its sheet), straight-on: a 14 px flat top over a 38 px face, the V wall rebuilt from it; all pieces share OUTLINE. Towers stand flush beside walls, never on them (content/ch2/levels/kit.ts gateTowers).
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
WORLD = HERE.parents[2] / 'src' / 'art' / 'pixel' / 'world'
OUT = WORLD / 'structures'
# new kind: (stone kind it stands in for, piece file or None for the assembled wall)
PIECES = {'cementTower': ('fortTower', 'towerflat.png'), 'cementWallH': ('fortWallH', 'wallflat.png'), 'cementWallV': ('fortWallV', None)}

# Rows of towerflat.png's plain south face, above the slit (after cropping to its bbox), dropped so the face stands as tall as the walls'.
TOWER_TRIM = (34, 40)
# wallflat.png (64×45, cut whole from its generated sheet) to the 64×52 a 14 px thick, 38 px tall wall needs face-on:
# columns copied in (inside a slab) to make it 64 wide, rows copied in to make the top 14 and the face 38 tall.
WALL_COLS = (9, 41)
WALL_ROWS = ((6, 2), (20, 5))
# One soft dark outline for every cement piece (the generated ones came near-black, heavier than the old walls').
OUTLINE = (40, 40, 44, 255)


def trim_rows(art: Image.Image, rows: tuple[int, int]) -> Image.Image:
    """The art with rows [rows[0], rows[1]) cut out and the rest closed up (a plain stretch of the slab face)."""
    a, b = rows
    out = Image.new('RGBA', (art.width, art.height - (b - a)))
    out.paste(art.crop((0, 0, art.width, a)), (0, 0))
    out.paste(art.crop((0, b, art.width, art.height)), (0, a))
    return out


def repeat_rows(art: Image.Image, at: int, n: int) -> Image.Image:
    """The art with its rows [at, at + n) copied in again below themselves (a plain band made taller)."""
    out = Image.new('RGBA', (art.width, art.height + n))
    out.paste(art.crop((0, 0, art.width, at + n)), (0, 0))
    out.paste(art.crop((0, at, art.width, art.height)), (0, at + n))
    return out


def repeat_col(art: Image.Image, at: int) -> Image.Image:
    """The art with column `at` copied in again beside itself."""
    out = Image.new('RGBA', (art.width + 1, art.height))
    out.paste(art.crop((0, 0, at + 1, art.height)), (0, 0))
    out.paste(art.crop((at, 0, art.width, art.height)), (at + 1, 0))
    return out


def soften_outline(art: Image.Image) -> Image.Image:
    """Near-black pixels that touch the transparent outside take OUTLINE (inner lines and slits keep theirs)."""
    out = art.copy()
    src, px = art.load(), out.load()
    for y in range(art.height):
        for x in range(art.width):
            r, g, b, a = src[x, y]
            if a and r + g + b < 60:
                near = [src[x + dx, y + dy][3] if 0 <= x + dx < art.width and 0 <= y + dy < art.height else 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
                if 0 in near:
                    px[x, y] = OUTLINE
    return out


def wall_h(raw: Image.Image) -> Image.Image:
    """64×52 from wallflat.png: its few see-through specks filled from the next slab, widened and heightened by copies."""
    art = raw.crop(raw.getbbox()).copy()
    px = art.load()
    for y in range(1, art.height - 1):
        for x in range(1, art.width - 1):
            if px[x, y][3] == 0:
                px[x, y] = px[x + 16, y]
    for c in sorted(WALL_COLS, reverse=True):
        art = repeat_col(art, c)
    for at, n in sorted(WALL_ROWS, reverse=True):
        art = repeat_rows(art, at, n)
    return soften_outline(art)


def wall_v(h: Image.Image) -> Image.Image:
    """14×101 from the 64×52 H piece: its flat top turned 90° (the 64 px run, ends outlined) over 37 px of slab face."""
    w, top_len, face_h = 14, 64, 37
    strip = h.crop((0, 1, h.width, 1 + w - 2)).rotate(90, expand=True)  # 12 wide, 64 tall; the H piece's end lines become its ends
    face = h.crop((18, h.height - face_h, 30, h.height))  # inside the second slab (joints at x 16 and 32)
    out = Image.new('RGBA', (w, top_len + face_h), OUTLINE)
    out.paste(strip, (1, 0))
    out.paste(face, (1, top_len))
    px = out.load()
    for x in range(w):
        px[x, 0] = px[x, top_len + face_h - 1] = OUTLINE
    return out


def main() -> None:
    manifest = json.loads((WORLD / 'manifest.json').read_text())
    s = manifest['structures']
    for kind, (stone, src) in PIECES.items():
        h = wall_h(Image.open(HERE / 'wallflat.png').convert('RGBA'))
        if kind == 'cementTower':
            raw = Image.open(HERE / src).convert('RGBA')
            art = soften_outline(trim_rows(raw.crop(raw.getbbox()), TOWER_TRIM))
        else:
            art = h if src else wall_v(h)
        meta = json.loads(json.dumps(s[stone]))
        canvas = tuple(meta['size'])
        # Stand it where the stone piece stands: centred on it, same base line.
        sb = Image.open(OUT / f"{stone}-{meta['states'][0]}.png").getbbox()
        at = ((sb[0] + sb[2] - art.width) // 2, sb[3] - art.height)
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
