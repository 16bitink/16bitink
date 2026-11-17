"""
Turns generated sheets (4 x 2 panels on cream paper, 1280 x 720) into the hosts'
cut-out art in art/. See docs/duo-characters.md, "Art".

  python3 apps/web/scripts/duo/build_art.py mouths <sheet.png> <who> <pose> <mouth box> <eye box>
  python3 apps/web/scripts/duo/build_art.py poses  <sheet.png> <who> <name1,...,name8> [<match pose>]

mouths: a lip-sync chart drawn from one pose. Panels, in order: A closed (M B P),
B barely open, C half open, D wide, E "oh", F "oo", blink, half-blink. Panel A is
the body; every other panel is aligned to it and only its mouth box (A-F) or
eye box (the blinks) is pasted onto it, so the body never jitters. Boxes are
x0,y0,x1,y1 in panel pixels (320 x 360), or auto (where the panels differ from A). Writes art/mouth/<who>-<pose>-<key>.png.

poses: eight new expressions, cut and scaled to the size of the existing
<match pose> (default neutral), aligned bottom-centre. Writes art/<who>-<name>.png.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
ART = HERE / 'art'
MOUTH_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'blink', 'half']
CUT_THRESH = 16          # max colour distance (sum of RGB) still counted as paper
ALIGN_RANGE = 10         # px searched each way when aligning a panel to panel A


def flood_background(free):
    """Pixels of `free` connected to the panel border (4-neighbour), by repeated dilation."""
    reg = np.zeros_like(free)
    reg[0, :], reg[-1, :], reg[:, 0], reg[:, -1] = free[0, :], free[-1, :], free[:, 0], free[:, -1]
    while True:
        grown = reg.copy()
        grown[1:, :] |= reg[:-1, :]
        grown[:-1, :] |= reg[1:, :]
        grown[:, 1:] |= reg[:, :-1]
        grown[:, :-1] |= reg[:, 1:]
        grown &= free
        if (grown == reg).all():
            return reg
        reg = grown


def panels(sheet_path):
    """The 8 panels as RGBA float arrays (cream paper made transparent), row by row."""
    a = np.asarray(Image.open(sheet_path).convert('RGB')).astype(float)
    if a.shape[:2] != (720, 1280):
        raise SystemExit(f'{sheet_path}: expected 1280 x 720, got {a.shape[1]} x {a.shape[0]}')
    paper = np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3)]), axis=0)
    out = []
    for r in range(2):
        for c in range(4):
            sub = a[r * 360:(r + 1) * 360, c * 320:(c + 1) * 320]
            bg = flood_background(np.abs(sub - paper).sum(2) <= CUT_THRESH)
            alpha = Image.fromarray((~bg).astype(np.uint8) * 255)
            alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
            out.append(np.dstack([sub, np.asarray(alpha, dtype=float)]))
    return out


def shift(img, dx, dy):
    out = np.zeros_like(img)
    h, w = img.shape[:2]
    out[max(0, dy):h + min(0, dy), max(0, dx):w + min(0, dx)] = \
        img[max(0, -dy):h - max(0, dy), max(0, -dx):w - max(0, dx)]
    return out


def align(panel, base, ignore):
    """Shift of `panel` that best matches `base` outside the `ignore` box (grey + alpha)."""
    def grey(p):
        return p[..., :3].mean(2) * p[..., 3] / 255
    keep = np.ones(base.shape[:2], bool)
    x0, y0, x1, y1 = ignore
    keep[y0:y1, x0:x1] = False
    g_base = grey(base)
    best = (1e18, 0, 0)
    for dy in range(-ALIGN_RANGE, ALIGN_RANGE + 1):
        for dx in range(-ALIGN_RANGE, ALIGN_RANGE + 1):
            err = np.abs(grey(shift(panel, dx, dy)) - g_base)[keep].mean()
            best = min(best, (err, dx, dy))
    return shift(panel, best[1], best[2]), best


def soft_box(shape, box, feather=7):
    m = Image.new('L', (shape[1], shape[0]), 0)
    x0, y0, x1, y1 = box
    m.paste(255, (x0 + feather, y0 + feather, x1 - feather, y1 - feather))
    return np.asarray(m.filter(ImageFilter.GaussianBlur(feather / 1.5)), dtype=float)[..., None] / 255


def paste(base, panel, mask):
    """base and panel mixed by mask, premultiplied so the paper edge never fringes."""
    pa, ba = panel[..., 3:] / 255, base[..., 3:] / 255
    alpha = ba * (1 - mask) + pa * mask
    rgb = (base[..., :3] * ba * (1 - mask) + panel[..., :3] * pa * mask) / np.maximum(alpha, 1e-6)
    return np.dstack([rgb, alpha * 255])


def fit_to(rgba, match):
    """Scale and place `rgba` so its figure has the height and bottom-centre of `match`'s figure."""
    img = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), 'RGBA')
    bb, mb = img.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox(), \
        match.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    s = (mb[3] - mb[1]) / (bb[3] - bb[1])
    big = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    cx, bottom = (bb[0] + bb[2]) / 2 * s, bb[3] * s
    canvas = Image.new('RGBA', match.size, (0, 0, 0, 0))
    canvas.alpha_composite(big, (round((mb[0] + mb[2]) / 2 - cx), round(mb[3] - bottom)))
    return canvas, s


def auto_box(ps, idx, pad):
    """Box around the core of where panel `idx` differs from panel A: D (wide) finds the mouth,
    the blink finds the eyes. The threshold ignores the small redraw differences all over the body."""
    base = ps[0]
    moved, _ = align(ps[idx], base, (0, 0, 1, 1))
    diff = np.abs(moved[..., :3] * moved[..., 3:] / 255 - base[..., :3] * base[..., 3:] / 255).sum(2)
    img = Image.fromarray(np.clip(diff, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))
    d = np.asarray(img, dtype=float)
    ys, xs = np.nonzero(d > d.max() * 0.5)
    return [int(max(0, xs.min() - pad)), int(max(0, ys.min() - pad)),
            int(min(320, xs.max() + pad)), int(min(360, ys.max() + pad))]


def build_mouths(sheet, who, pose, mouth_box, eye_box):
    ps = panels(sheet)
    if mouth_box == 'auto':
        mouth_box = auto_box(ps, MOUTH_KEYS.index('D'), 20)
    if eye_box == 'auto':
        eye_box = auto_box(ps, MOUTH_KEYS.index('blink'), 8)
    print(f'  mouth box {mouth_box}  eye box {eye_box}')
    base = ps[0]
    match = Image.open(ART / f'{who}-{pose}.png').convert('RGBA')
    out_dir = ART / 'mouth'
    out_dir.mkdir(exist_ok=True)
    for key, panel in zip(MOUTH_KEYS, ps):
        box = eye_box if key in ('blink', 'half') else mouth_box
        if key == 'A':
            frame = base
        else:
            moved, (err, dx, dy) = align(panel, base, box)
            frame = paste(base, moved, soft_box(base.shape, box))
            print(f'  {key}: shift {dx:+d},{dy:+d}  body diff {err:.1f}')
        img, s = fit_to(frame, match)
        img.save(out_dir / f'{who}-{pose}-{key}.png')
    print(f'wrote art/mouth/{who}-{pose}-*.png (scale {s:.3f})')


def build_poses(sheet, who, names, match_pose='neutral'):
    match = Image.open(ART / f'{who}-{match_pose}.png').convert('RGBA')
    base_h = None
    for name, panel in zip(names, panels(sheet)):
        img = Image.fromarray(np.clip(panel, 0, 255).astype(np.uint8), 'RGBA')
        # Every new pose gets the scale that fits panel 1 to the match pose, so sizes stay relative.
        if base_h is None:
            _, base_h = fit_to(panel, match)
        bb = img.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
        big = img.crop(bb).resize((round((bb[2] - bb[0]) * base_h), round((bb[3] - bb[1]) * base_h)), Image.LANCZOS)
        mb = match.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
        w, h = max(match.width, big.width + 10), max(match.height, big.height + 10)
        canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        canvas.alpha_composite(big, (round(w / 2 + ((mb[0] + mb[2]) / 2 - match.width / 2) - big.width / 2),
                                     h - (match.height - mb[3]) - big.height))
        canvas.save(ART / f'{who}-{name}.png')
    print(f'wrote art/{who}-{{{",".join(names)}}}.png')


def box(text):
    if text == 'auto':
        return text
    vals = [int(v) for v in text.split(',')]
    if len(vals) != 4 or not (0 <= vals[0] < vals[2] <= 320 and 0 <= vals[1] < vals[3] <= 360):
        raise SystemExit(f'bad box {text!r}: want x0,y0,x1,y1 inside 320 x 360')
    return vals


if __name__ == '__main__':
    if len(sys.argv) == 7 and sys.argv[1] == 'mouths':
        build_mouths(sys.argv[2], sys.argv[3], sys.argv[4], box(sys.argv[5]), box(sys.argv[6]))
    elif len(sys.argv) in (5, 6) and sys.argv[1] == 'poses':
        names = sys.argv[4].split(',')
        if len(names) != 8:
            raise SystemExit('poses needs 8 names')
        build_poses(sys.argv[2], sys.argv[3], names, *sys.argv[5:])
    else:
        raise SystemExit(__doc__)
