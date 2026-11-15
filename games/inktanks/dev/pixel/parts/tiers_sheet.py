"""A contact sheet of every part family at Mk I to V, side by side, from the installed art.

  python3 dev/pixel/parts/tiers_sheet.py [out.png] [zoom] [--render]

One row per family (turrets, hulls, then each drive at L / M / H), one column per Mk, each cell on grey with a strip of
its tier's colour above it. --render shows the 3D models (out/render) instead of the installed paintings.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
DEST = HERE.parents[2] / 'src' / 'art' / 'pixel' / 'parts'
TURRETS = ['turretMG', 'turretCannon', 'turretRocket', 'turretMortar', 'turretFlamer', 'turretLaser', 'turretRail']
HULLS = ['hullLight', 'hullMedium', 'hullHeavy']
DRIVES = ['driveWheels', 'driveHalftrack', 'driveTracks', 'driveHover']
TIER = [(146, 150, 158), (84, 156, 76), (56, 156, 220), (136, 80, 184), (238, 128, 24)]
BG = (118, 122, 110, 255)
RENDERS = {'turretMortar': 'mortar', 'turretFlamer': 'flamer', 'turretLaser': 'laser', 'turretRail': 'rail', 'driveHover': 'hover'}


def rows() -> list[str]:
    out = list(TURRETS) + list(HULLS)
    for d in DRIVES:
        out += [f'{d}-{s}' for s in 'LMH']
    return out


def image(fam: str, t: int, render: bool) -> Image.Image | None:
    key = f'{fam}-mk{t}'
    if render:
        base = fam.split('-')[0]
        d = HERE.parent / RENDERS[base] / 'out' / 'render' if base in RENDERS else HERE / 'out' / 'render'
        p = d / f'{key}.png'
    else:
        p = DEST / f'{key}.png'
    return Image.open(p).convert('RGBA') if p.exists() else None


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    out = Path(args[0]) if args else HERE / 'out' / 'tiers.png'
    z = int(args[1]) if len(args) > 1 else 2
    render = '--render' in sys.argv
    fams = rows()
    cell, bar = 128 * z, 6
    sheet = Image.new('RGBA', (5 * cell, len(fams) * (cell + bar)), BG)
    draw = ImageDraw.Draw(sheet)
    for r, fam in enumerate(fams):
        y = r * (cell + bar)
        for t in range(1, 6):
            x = (t - 1) * cell
            draw.rectangle((x, y, x + cell - 1, y + bar - 1), fill=TIER[t - 1])
            im = image(fam, t, render)
            if im is None:
                draw.line((x + 8, y + bar + 8, x + cell - 8, y + bar + cell - 8), fill=(90, 40, 40), width=2)
                continue
            sheet.alpha_composite(im.resize((cell, cell), Image.NEAREST), (x, y + bar))
        draw.text((4, y + bar + 2), fam, fill=(20, 20, 20))
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print('wrote', out, sheet.size)


if __name__ == '__main__':
    main()
