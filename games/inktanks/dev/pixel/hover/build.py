"""The Hover drive (chapter 3), Mk I to III, per hull size L / M / H like every drive (dev/pixel/parts/model.py drive()).

  python3 dev/pixel/hover/build.py render     out/render/driveHover-<L|M|H>-mk<N>[-f1|-f2].png
  python3 dev/pixel/hover/build.py pack       out/sheets/hovers-<a|b>.png (+ .json): each drive as its two sides, as parts/sheets.py
  python3 dev/pixel/hover/build.py cut        paint/hovers-<a|b>.png -> out/painted/, prints the worst match
  python3 dev/pixel/hover/build.py install    src/art/pixel/parts/driveHover-*.png (+ -f1/-f2, the size-less L aliases),
                                              icons/driveHover.png and the manifest's families/keys/frames/drives/aliases/icons

Run `install` again after dev/pixel/parts/install.py, which rebuilds the parts folder (idempotent). dev/pixel/rollframes.py
skips driveHover: a hover's frames are not a rolling tread.
Paint: PixelLab edit_image on each packed sheet, 256 x 256, transparent, seed 3401, prompt PROMPT (10 generations a sheet).

A hover doesn't roll. It sits in a black rubber skirt of overlapping fingers that rings the hull (a band just outside the
hull's outline: the hull covers the rest), with a ducted lift fan in a pod on each side. The frames are a ripple: the
skirt's fingers puff in and out in a wave running round the hull, and the fan blades turn 30 degrees (four blades, so
three frames loop). Mk II adds a riveted rubbing strake round the skirt's top and guard bars over the fans; Mk III two
fans a side, a pair of rear thrust ducts and armoured pod covers.
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
from model import (BLACK, DIMS, EDGE, GUN, GUN_D, OLIVE, OLIVE_D, RIVET, RUBBER, SIZES, Mesh, box, cyl, frustum, plate,  # noqa: E402
                   rect, rivet_line)

OUT = HERE / 'out'
DEST = HERE.parents[2] / 'src' / 'art' / 'pixel' / 'parts'
NAME = 'driveHover'
SKIRT = np.array([0.15, 0.14, 0.13])
SKIRT_L = np.array([0.21, 0.2, 0.18])
PROMPT = ('Turn this 3D render of top-down hovercraft drive parts into masterful painterly pixel art for a top-down tank game, '
          'seen straight from above. Every part stays exactly where it is with the same silhouette, size and light; add nothing '
          'new; transparent stays transparent. Each is a hovercraft skirt and lift-fan pod: a black rubber skirt of overlapping '
          'fingers with worn grey edges and dried mud, round fan ducts in olive drab armoured pods with dark spinning fan blades '
          'inside, rivets, chipped paint. Warm sunlight from the top left, crisp dark outline.')


def skirt(m, w, l, out, frame, tier):
    """Fingers round a chamfered rectangle just outside the hull (w x l), each a little sloped block; a wave of puff."""
    c = 3.0
    x, y = w / 2 + 0.2, l / 2 + 0.2
    ring = [(-x + c, -y), (x - c, -y), (x, -y + c), (x, y - c), (x - c, y), (-x + c, y), (-x, y - c), (-x, -y + c)]
    per = sum(math.dist(a, b) for a, b in zip(ring, ring[1:] + ring[:1]))
    step = 1.6
    s0 = 0.0
    k = 0
    for a, b in zip(ring, ring[1:] + ring[:1]):
        seg = math.dist(a, b)
        n = max(1, round(seg / step))
        nx, ny = (b[1] - a[1]) / seg, -(b[0] - a[0]) / seg       # outward normal (ring runs clockwise on screen)
        for i in range(n):
            t0, t1 = i / n, (i + 1) / n
            p0 = (a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0)
            p1 = (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1)
            ph = 2 * math.pi * ((s0 + seg * (t0 + t1) / 2) / per * 6 - frame / 3)
            o = out + 0.35 * math.sin(ph)
            col = SKIRT if k % 2 else SKIRT_L
            k += 1
            lo = [p0, p1, (p1[0] + nx * o, p1[1] + ny * o), (p0[0] + nx * o, p0[1] + ny * o)]
            hi = [p0, p1, (p1[0] + nx * o * 0.45, p1[1] + ny * o * 0.45), (p0[0] + nx * o * 0.45, p0[1] + ny * o * 0.45)]
            frustum(m, lo, hi, 0.0, 3.4 + 0.2 * math.sin(ph), col)
        s0 += seg
    if tier >= 2:
        # A rubbing strake: a steel band round the skirt's top, riveted.
        for a, b in zip(ring, ring[1:] + ring[:1]):
            seg = math.dist(a, b)
            nx, ny = (b[1] - a[1]) / seg, -(b[0] - a[0]) / seg
            mx, my = (a[0] + b[0]) / 2 + nx * 0.5, (a[1] + b[1]) / 2 + ny * 0.5
            m.box(mx, my, 3.6, seg + 0.6, 1.0, 0.6, math.atan2(b[1] - a[1], b[0] - a[0]), OLIVE_D)
            if seg > 4:
                rivet_line(m, a[0] + nx * 0.5 + (b[0] - a[0]) * 0.1, a[1] + ny * 0.5 + (b[1] - a[1]) * 0.1,
                           b[0] + nx * 0.5 - (b[0] - a[0]) * 0.1, b[1] + ny * 0.5 - (b[1] - a[1]) * 0.1, 3.9, step=2.0)


def fan(m, x, y, r, frame, tier, side):
    """A lift fan in an armoured pod: the duct, its dark well, a hub and four blades turned 30 degrees a frame."""
    frustum(m, rect(2 * r + 2.4, 2 * r + 3.0, r * 0.7, cx=x, cy=y), rect(2 * r + 1.6, 2 * r + 2.2, r * 0.6, cx=x, cy=y), 0.0, 4.6, OLIVE, top=OLIVE)
    cyl(m, 'z', (x, y, 4.75), 0.3, r, BLACK, n=16, cap=BLACK)
    cyl(m, 'z', (x, y, 4.6), 0.5, r + 0.5, GUN_D, n=16, cap=None)
    rot = math.radians(30 * frame)
    for b in range(4):
        a = rot + b * math.pi / 2
        bx, by = x + math.cos(a) * r * 0.5, y + math.sin(a) * r * 0.5
        m.box(bx, by, 4.5, r * 0.95, 0.9, 0.25, a + 0.25, GUN)
    cyl(m, 'z', (x, y, 4.7), 0.5, 0.55 * max(1.0, r / 2.4), GUN_D, n=8, cap=RIVET)
    if tier >= 2:
        for g in (-0.5, 0.0, 0.5):
            box(m, x + g * r * 1.2, y, 5.0, 0.35, 2 * r + 0.8, 0.3, GUN_D)
        rivet_line(m, x - r - 0.6, y - r - 1.0, x + r + 0.6, y - r - 1.0, 4.6, step=1.4)
    if tier == 3:
        plate(m, x + side * (r + 0.7), y, 4.6, 1.2, 2 * r + 1.2, OLIVE_D, step=1.4)


def hover(size: str, tier: int, frame: int) -> Mesh:
    m = Mesh()
    w, l, _ = DIMS[SIZES[size]]
    e = w / 2 + EDGE[size]
    i = 'LMH'.index(size)
    skirt(m, w, l, (2.0, 2.3, 2.6)[i] + 0.2 * (tier - 1), frame, tier)
    r = (2.2, 2.5, 2.8)[i] + 0.15 * (tier - 1)
    x = e + 0.6 + r
    ys = [0.0] if tier < 3 else [-l * 0.22, l * 0.22]
    for sx in (-1, 1):
        box(m, sx * (e - 1.0), 0, 1.2, 3.0, l * 0.5, 1.6, GUN_D)
        for y in ys:
            fan(m, sx * x, y, r, frame, tier, sx)
    if tier == 3:
        # Two rear thrust ducts: rings standing upright behind the hull, a rudder vane in each.
        for sx in (-1, 1):
            cx, cy = sx * w * 0.24, l / 2 + 2.6
            cyl(m, 'y', (cx, cy, 3.6), 2.2, 3.0, OLIVE_D, n=14, cap=BLACK)
            box(m, cx, cy + 1.4, 1.0, 0.4, 1.4, 5.0, GUN)
            box(m, cx, cy - 1.6, 2.0, 2.2, 1.4, 1.6, GUN_D)
    return m


KEYS = [f'{NAME}-{z}-mk{t}' for z in SIZES for t in (1, 2, 3)]
SHEETS = {'hovers-a': [k for k in KEYS if k.endswith('mk1') or (k.endswith('mk2') and '-H-' not in k)],
          'hovers-b': [k for k in KEYS if k.endswith('mk3') or k == f'{NAME}-H-mk2']}


def render() -> None:
    d = OUT / 'render'
    d.mkdir(parents=True, exist_ok=True)
    for z in SIZES:
        for t in (1, 2, 3):
            for f in (0, 1, 2):
                rgba, _ = model.draw(hover(z, t, f))
                Image.fromarray(rgba).save(d / f'{NAME}-{z}-mk{t}{"" if f == 0 else f"-f{f}"}.png')
    print('rendered', len(KEYS), 'hover drives x 3 frames')


def point_sheets() -> None:
    sheets.RENDER = OUT / 'render'
    sheets.SHEETS = OUT / 'sheets'
    sheets.PAINTED = OUT / 'painted'
    sheets.HERE = HERE
    for name, keys in SHEETS.items():
        sheets.SETS[name] = [f'{k}|{side}' for k in keys for side in 'LR']


def arr(p: Path) -> np.ndarray:
    return np.array(Image.open(p).convert('RGBA')).astype(float)


def save(a: np.ndarray, p: Path) -> None:
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(p)


def install() -> None:
    import importlib.util
    spec = importlib.util.spec_from_file_location('parts_install', PARTS / 'install.py')
    parts_install = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(parts_install)
    ren = OUT / 'render'
    for key in KEYS:
        src = OUT / 'painted' / f'{key}.png'
        model_im = arr(ren / f'{key}.png')
        art = arr(src) if src.exists() else model_im.copy()
        art[..., 3] = model_im[..., 3]
        save(art, DEST / f'{key}.png')
        # Frames 1 and 2: the painting plus the model's change between frames, the frame's own outline (as parts/install.py).
        for f in (1, 2):
            fm = arr(ren / f'{key}-f{f}.png')
            frame = art.copy()
            frame[..., :3] += (fm[..., :3] - model_im[..., :3]) * 0.9
            # Where the frame's skirt puffs out past the painting, take the nearest painted colour from the base row.
            new = (fm[..., 3] > 0) & (model_im[..., 3] == 0)
            if new.any():
                ys, xs = np.nonzero(new)
                for y, x in zip(ys, xs):
                    best = None
                    for r in range(1, 4):
                        win = art[max(0, y - r):y + r + 1, max(0, x - r):x + r + 1]
                        on = win[..., 3] > 0
                        if on.any():
                            best = win[on][:, :3].mean(axis=0)
                            break
                    frame[y, x, :3] = best if best is not None else fm[y, x, :3]
            frame[..., 3] = fm[..., 3]
            save(frame, DEST / f'{key}-f{f}.png')
    for t in (1, 2, 3):
        for suffix in ('', '-f1', '-f2'):
            shutil.copy(DEST / f'{NAME}-L-mk{t}{suffix}.png', DEST / f'{NAME}-mk{t}{suffix}.png')
    # The icon at the drives' scale (parts/install.py icons(): one scale per kind, from the M Mk I, sides squeezed together).
    fams = ['driveWheels', 'driveHalftrack', 'driveTracks', NAME]
    ims = {f: parts_install.squeeze_drive(Image.open(DEST / f'{f}-M-mk1.png').convert('RGBA')) for f in fams}
    k = parts_install.ICON_FIT / max(max(i.width, i.height) for f, i in ims.items() if f != NAME)
    im = ims[NAME]
    k = min(k, parts_install.ICON_FIT / max(im.width, im.height))
    w, h = max(4, round(im.width * k)), max(4, round(im.height * k))
    small = im.resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1, 80, 2))
    icon = Image.new('RGBA', (parts_install.ICON, parts_install.ICON))
    icon.alpha_composite(small, ((parts_install.ICON - w) // 2, (parts_install.ICON - h) // 2))
    parts_install.outlined(icon).save(DEST / 'icons' / f'{NAME}.png')
    man = json.loads((DEST / 'manifest.json').read_text())
    if NAME not in man['families']['drives']:
        man['families']['drives'].append(NAME)
    # As parts/install.py: keys lists the sized drives; frames also covers the size-less aliases.
    for key in KEYS:
        if key not in man['keys']:
            man['keys'].append(key)
    for key in KEYS + [f'{NAME}-mk{t}' for t in (1, 2, 3)]:
        man['frames'][key] = [key, f'{key}-f1', f'{key}-f2']
    man['drives'][NAME] = {z: {f'mk{t}': f'{NAME}-{z}-mk{t}' for t in (1, 2, 3)} for z in SIZES}
    for t in (1, 2, 3):
        man['aliases'][f'{NAME}-mk{t}'] = f'{NAME}-L-mk{t}'
    man['icons'][NAME] = f'icons/{NAME}.png'
    man.setdefault('notes', {})[NAME] = 'frames are a skirt ripple and turning lift fans, not a rolling tread; play them at any speed, also when standing still'
    (DEST / 'manifest.json').write_text(json.dumps(man, indent=1))
    print('installed', NAME, len(KEYS), 'drives + aliases + icon')


if __name__ == '__main__':
    cmd = sys.argv[1]
    point_sheets()
    if cmd == 'render':
        render()
    elif cmd == 'pack':
        for name in SHEETS:
            sheets.pack(name)
    elif cmd == 'cut':
        for name in SHEETS:
            sheets.cut(name)
    elif cmd == 'install':
        install()
