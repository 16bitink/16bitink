"""Lip-sync mouth sets for Dewy's seven talking poses, by the duo method
(apps/web/scripts/duo/build_art.py `mouths`, docs/duo-characters.md), pasted onto OUR full-resolution pose.

  python3 mouths.py tiles                 # tile each pose's face 8x on cream paper -> dewy/mouth/src/<pose>-tile.png
  python3 mouths.py build <pose> <sheet>  # a generated mouth chart (any size, 4x2 panels) -> patches
  python3 mouths.py build-all             # build every pose from dewy/mouth/src/<pose>-chart.png

The chart panels, in order: A closed (M B P), B barely open, C half open, D wide, E "oh", F "oo", G blink, H half-blink.
Each panel is aligned to our own face crop (shift search), then only the mouth box (A-F) or the eye box (G, H) is
cut out with a feathered alpha. Output, in dewy/mouth/:
  <pose>-<A..H>.png   RGBA patches (feathered edge), already scaled to the pose PNG's pixels
  mouths.json         { "<pose>": { "mouth": [x, y, w, h], "eye": [x, y, w, h] | null } } in the pose PNG's pixels
dewy.ts draws the pose PNG, then the patch for the current mouth (and eyes) at that placement, so the
body is never redrawn and never jitters. Needs Pillow + numpy.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
DEWY = HERE / 'dewy'
OUT = DEWY / 'mouth'
SRC = OUT / 'src'
KEYS = 'ABCDEFGH'
PW, PH = 512, 576          # one panel
PAPER = (244, 238, 224)
# Face crop of each pose, in pose-PNG pixels (x0, y0, x1, y1): the head from brow to chin, ears left out.
FACE = {
    'neutral': (140, 425, 825, 910),
    'proud': (145, 380, 785, 900),
    'frustrated': (330, 250, 930, 650),
    'moved': (280, 120, 1000, 600),
    'laughing': (440, 210, 1040, 730),
    'tired': (640, 370, 1210, 875),
    'hurt': (565, 345, 1260, 790),
}
# Mouth box and eye box of each pose, in panel pixels (512 x 576, see `tiles`): picked by eye on the face crops so that
# the widest mouth shape and the shut eyes fit inside; everything outside stays our own pixels.
BOXES = {
    'neutral': ([120, 340, 400, 455], [130, 230, 450, 360]),
    'proud': ([225, 300, 450, 420], [180, 195, 490, 300]),
    'frustrated': ([180, 315, 400, 430], None),
    'moved': ([190, 305, 420, 400], [130, 185, 430, 310]),
    'laughing': ([125, 190, 365, 375], None),
    'tired': ([110, 225, 330, 320], [60, 95, 430, 200]),
    'hurt': ([140, 300, 360, 420], [70, 170, 450, 300]),
}
NO_BLINK = {'frustrated', 'laughing'}  # eyes already shut
ALIGN = 4                  # px searched each way


def face_panel(pose):
    """The face crop on cream paper, fitted to a panel. Returns (RGB panel, scale, offset of crop in panel)."""
    im = Image.open(DEWY / f'{pose}.png').convert('RGBA')
    box = FACE[pose]
    crop = im.crop(box)
    s = min(PW * 0.94 / crop.width, PH * 0.94 / crop.height)
    big = crop.resize((round(crop.width * s), round(crop.height * s)), Image.LANCZOS)
    panel = Image.new('RGBA', (PW, PH), PAPER + (255,))
    ox, oy = (PW - big.width) // 2, (PH - big.height) // 2
    panel.alpha_composite(big, (ox, oy))
    return panel.convert('RGB'), s, (ox, oy)


def tiles():
    SRC.mkdir(parents=True, exist_ok=True)
    for pose in FACE:
        panel, _, _ = face_panel(pose)
        sheet = Image.new('RGB', (PW * 4, PH * 2), PAPER)
        for i in range(8):
            sheet.paste(panel, ((i % 4) * PW, (i // 4) * PH))
        sheet.save(SRC / f'{pose}-tile.png')
        print('wrote', SRC / f'{pose}-tile.png', sheet.size)


def content_box(panel):
    """Bounding box of everything that is not cream paper (the face crop's hard edges are kept by the model)."""
    d = np.abs(np.asarray(panel).astype(np.int16) - np.array(PAPER, np.int16)).sum(2)
    ys, xs = np.nonzero(d > 60)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def split(sheet, base):
    """The chart's 8 panels, each mapped onto our face crop `base` by the scale and offset of its content box."""
    sheet = sheet.convert('RGB').resize((PW * 4, PH * 2), Image.LANCZOS)
    bx = content_box(base)
    out = []
    cells = [sheet.crop(((i % 4) * PW, (i // 4) * PH, (i % 4 + 1) * PW, (i // 4 + 1) * PH)) for i in range(8)]
    cx = content_box(cells[0])  # panel A's frame is used for all eight: a wide mouth must not rescale the face
    for cell in cells:
        sx, sy = (bx[2] - bx[0]) / (cx[2] - cx[0]), (bx[3] - bx[1]) / (cx[3] - cx[1])
        # output(x, y) = cell((x - bx0) / sx + cx0, ...): PIL transform takes the inverse mapping
        out.append(cell.transform((PW, PH), Image.AFFINE, (1 / sx, 0, cx[0] - bx[0] / sx, 0, 1 / sy, cx[1] - bx[1] / sy),
                                  Image.BICUBIC, fillcolor=PAPER))
    return out


def grey(a):
    return a.astype(np.float32).mean(2)


def best_shift(panel, base, ignore):
    """(dx, dy) moving `panel` onto `base` outside the `ignore` box; coarse at half size, then refined."""
    g, b = grey(np.asarray(panel)), grey(np.asarray(base))
    x0, y0, x1, y1 = ignore
    keep = np.ones(g.shape, bool)
    keep[y0:y1, x0:x1] = False

    def err(dx, dy, step):
        sh = np.roll(np.roll(g, dy, 0), dx, 1)
        return np.abs(sh - b)[keep][::step].mean()

    cand = min(((err(dx, dy, 7), dx, dy) for dy in range(-ALIGN, ALIGN + 1, 2) for dx in range(-ALIGN, ALIGN + 1, 2)))
    best = min(((err(cand[1] + ex, cand[2] + ey, 3), cand[1] + ex, cand[2] + ey) for ey in (-1, 0, 1) for ex in (-1, 0, 1)))
    return best[1], best[2], best[0]


def diff_box(panel, base, pad):
    d = np.abs(np.asarray(panel).astype(np.float32) - np.asarray(base).astype(np.float32)).sum(2)
    img = Image.fromarray(np.clip(d, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))
    a = np.asarray(img, dtype=float)
    ys, xs = np.nonzero(a > a.max() * 0.5)
    return [max(0, xs.min() - pad), max(0, ys.min() - pad), min(PW, xs.max() + pad), min(PH, ys.max() + pad)]


def shifted(panel, dx, dy):
    return Image.fromarray(np.roll(np.roll(np.asarray(panel), dy, 0), dx, 1))


def union(a, b):
    return [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]


def feather_mask(size, box, f):
    m = Image.new('L', size, 0)
    m.paste(255, (box[0] + f, box[1] + f, box[2] - f, box[3] - f))
    return m.filter(ImageFilter.GaussianBlur(f / 1.6))


def build(pose, sheet_path):
    base, s, (ox, oy) = face_panel(pose)
    panels = split(Image.open(sheet_path), base)
    # shift every panel onto our face first (ignoring nothing at coarse level is fine: the face dominates)
    moved = []
    for k, p in zip(KEYS, panels):
        dx, dy, e = best_shift(p, base, (0, 0, 1, 1))
        moved.append(shifted(p, dx, dy))
        print(f'  {pose} {k}: shift {dx:+d},{dy:+d} err {e:.1f}')
    mbox, ebox = BOXES[pose]
    print(f'  mouth box {mbox}  eye box {ebox}')
    OUT.mkdir(parents=True, exist_ok=True)
    pose_im = Image.open(DEWY / f'{pose}.png')
    meta_path = OUT / 'mouths.json'
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}

    def to_pose(box):  # panel box -> pose pixels
        x0, y0 = (box[0] - ox) / s + FACE[pose][0], (box[1] - oy) / s + FACE[pose][1]
        x1, y1 = (box[2] - ox) / s + FACE[pose][0], (box[3] - oy) / s + FACE[pose][1]
        return [round(x0), round(y0), round(x1) - round(x0), round(y1) - round(y0)]  # may poke outside the PNG: clamp below

    for k, p in zip(KEYS, moved):
        box = ebox if k in 'GH' else mbox
        if box is None:
            continue
        rgba = p.convert('RGBA')
        rgba.putalpha(feather_mask(p.size, box, 9))
        x, y, w, h = to_pose(box)
        patch = rgba.crop(tuple(box)).resize((w, h), Image.LANCZOS)
        # only where our pose is opaque: a box that reaches past the silhouette must not paste paper
        cover = pose_im.getchannel('A').crop((x, y, x + w, y + h))
        patch.putalpha(Image.fromarray((np.asarray(patch.getchannel('A'), np.float32) * np.asarray(cover, np.float32) / 255).astype(np.uint8)))
        patch.save(OUT / f'{pose}-{k}.png')
    meta[pose] = {'mouth': to_pose(mbox), 'eye': to_pose(ebox) if ebox else None, 'size': list(pose_im.size)}
    meta_path.write_text(json.dumps(meta, indent=1))
    # check strip: the pose with every patch pasted, face crop only
    fx0, fy0, fx1, fy1 = FACE[pose]
    strip = Image.new('RGB', ((fx1 - fx0) * 4 // 2, (fy1 - fy0) * 2 // 2), (60, 120, 160))
    for i, k in enumerate(KEYS):
        if not (OUT / f'{pose}-{k}.png').exists():
            continue
        im = pose_im.copy().convert('RGBA')
        info = meta[pose]['eye' if k in 'GH' else 'mouth']
        im.alpha_composite(Image.open(OUT / f'{pose}-{k}.png'), (info[0], info[1]))
        c = im.crop(FACE[pose]).resize(((fx1 - fx0) // 2, (fy1 - fy0) // 2))
        strip.paste(c.convert('RGB'), ((i % 4) * c.width, (i // 4) * c.height))
    strip.save(SRC / f'{pose}-check.png')


if __name__ == '__main__':
    a = sys.argv[1:]
    if a == ['tiles']:
        tiles()
    elif len(a) == 3 and a[0] == 'build':
        build(a[1], a[2])
    elif a == ['build-all']:
        for pose in FACE:
            build(pose, SRC / f'{pose}-chart.png')
    else:
        raise SystemExit(__doc__)
