"""Builds every cut-out sprite from dev/art/sheets/*.png into src/art/img/ (2x board px).
  python3 dev/art/build_sprites.py            (from games/inkbrick)
Writes dev/art/sizes.json: {file stem: [w, h]} read by gen_manifest.py."""
import json
import numpy as np
from PIL import Image, ImageFilter
from cutlib import split_items, to_rgba, fit, save

SIZES = {}


def put(im, name, webp=False):
    save(im, name, webp)
    SIZES[name] = [im.width, im.height]


def canvas(w, h, parts):
    c = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for im, x, y in parts:
        c.alpha_composite(im, (x, y))
    return c


def skip_and_rafts():
    names = ['skip-aim', 'skip-idle', 'skip-cheer', 'skip-shrug']
    items = split_items('skip.png', 2, 2, names, punch=30)
    cut = {n: to_rgba(*items[n]) for n in names}
    # one scale for every pose: the raft (about 512 sheet px) is 180 px wide
    s = 180 / 512
    scaled = {n: Image.fromarray(cut[n], 'RGBA').resize(
        (round(cut[n].shape[1] * s), round(cut[n].shape[0] * s)), Image.LANCZOS) for n in names}
    w = max(i.width for i in scaled.values())
    h = max(i.height for i in scaled.values())
    for n, im in scaled.items():  # raft's left edge at x 0, raft bottom on the canvas bottom
        put(canvas(w, h, [(im, 0, h - im.height)]), n)
    rn = ['raft-wide', 'raft-plain', 'raft-3', 'raft-7', 'raft-14', 'raft-30', 'raft-50', 'raft-100']
    items = split_items('rafts.png', 2, 4, rn)
    for n in rn:
        rgba = to_rgba(*items[n])
        body = 280 if n == 'raft-wide' else 180   # body width: 140 / 90 logical
        im = Image.fromarray(rgba, 'RGBA')
        k = body / im.width
        put(im.resize((body, round(im.height * k)), Image.LANCZOS), n)


def brumm():
    names = ['brumm-smug', 'brumm-hit', 'brumm-defeated']
    items = split_items('brumm.png', 3, 1, names)
    cut = {n: Image.fromarray(to_rgba(*items[n]), 'RGBA') for n in names}
    s = min(min(440 / i.width, 360 / i.height) for i in cut.values())
    for n, im in cut.items():
        r = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        put(canvas(440, 360, [(r, (440 - r.width) // 2, 360 - r.height)]), n)


def stone_and_trails():
    names = ['stone', 'trail-3', 'trail-7', 'trail-14', 'trail-30', 'trail-50', 'trail-100', 'stone-dark']
    items = split_items('stones.png', 4, 2, names, main_only=('stone', 'stone-dark'))
    for n in names:
        im = fit(to_rgba(*items[n], erode=1), 40, 40)
        if n.startswith('stone'):
            im = fit(to_rgba(*items[n], erode=1), 24, 24)
            im = canvas(24, 24, [(im, (24 - im.width) // 2, (24 - im.height) // 2)])
        put(im, n)


def seamless_x(a):
    """Cross-fade a half-width shift so the left and right edges meet without a seam."""
    h, w = a.shape[:2]
    x = np.arange(w)
    wt = (np.abs(x - (w - 1) / 2) / ((w - 1) / 2)) ** 1.0  # 0 centre ... 1 edges
    wt = 1 - wt  # 1 at centre, 0 at edges
    shifted = np.roll(a, w // 2, axis=1)
    return a * wt[None, :, None] + shifted * (1 - wt)[None, :, None]


SQ_CENTRE = {'key': 0.27}


def brick(arr, m, name, trim=2, top=0.0, seamless=False, keep_alpha=False):
    ys, xs = np.nonzero(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    h = y1 - y0
    y0 += round(h * top)
    crop = arr[y0 + trim:y1 - trim, x0 + trim:x1 - trim]
    if seamless:
        crop = seamless_x(crop)
    im = Image.fromarray(crop.astype(np.uint8), 'RGB')
    wide = im.resize((180, 60), Image.LANCZOS).convert('RGBA')
    if keep_alpha:
        a = Image.fromarray(m[y0 + trim:y1 - trim, x0 + trim:x1 - trim].astype(np.uint8) * 255).filter(ImageFilter.MinFilter(3))
        wide.putalpha(a.resize((180, 60), Image.LANCZOS))
    put(wide, 'brick-' + name)
    cx = round(180 * SQ_CENTRE.get(name, 0.5))
    mid = wide.crop((cx - 30, 0, cx + 30, 60))   # 1x1: a 60 px slice, no outline at the sides
    put(mid, 'brick-' + name + '-sq')


def bricks():
    n1 = ['soft-1', 'soft-2', 'soft-3', 'tough-1', 'tough-2', 'tough-3', 'stone', 'x3']
    it = split_items('bricks1.png', 2, 4, n1)
    order = ['soft-1', 'tough-1', 'soft-3', 'tough-2', 'tough-3', 'soft-2', 'stone', 'x3']
    # sheet order is row-major: (soft-1, soft-2) (soft-3, tough-1) (tough-2, tough-3) (stone, x3)
    sheet = {'soft-1': 'soft-1', 'soft-2': 'soft-2', 'soft-3': 'soft-3', 'tough-1': 'tough-1',
             'tough-2': 'tough-2', 'tough-3': 'tough-3', 'stone': 'stone', 'x3': 'x3'}
    for n in n1:
        arr, m = it[n]
        brick(arr, m, n, top=0.40 if n == 'soft-2' else 0.0, seamless=(n == 'stone'), keep_alpha=(n == 'tough-3'))
    n2 = ['keg', 'pickup', 'ice-1', 'ice-2', 'key', 'gate', 'dense', 'shutter']
    it = split_items('bricks2.png', 2, 4, n2)
    for n in n2:
        arr, m = it[n]
        if n == 'shutter':
            ys, xs = np.nonzero(m)
            crop = arr[ys.min() + 2:ys.max() - 1, xs.min() + 2:xs.max() - 1]
            put(Image.fromarray(crop.astype(np.uint8)).resize((60, 60), Image.LANCZOS).convert('RGBA'), 'shutter')
        else:
            brick(arr, m, n)


def pieces():
    names = ['pu-wide', 'pu-plus3', 'pu-fireball', 'whirlpool', 'spinner', 'heart-medal', 'shield', 'heart-alt', 'heart-empty-alt']
    it = split_items('pieces.png', 3, 3, names)
    for n, box in (('pu-wide', (96, 96)), ('pu-plus3', (96, 96)), ('pu-fireball', (96, 96)),
                   ('whirlpool', (120, 120))):
        put(fit(to_rgba(*it[n]), *box), n)
    put(fit(to_rgba(*it['spinner']), 600, 48, stretch=True), 'spinner')
    put(fit(to_rgba(*it['shield']), 360, 72, stretch=True), 'shield')


def ui():
    names = ['shell-icon', 'shell-empty', 'stamp', 'heart', 'heart-empty']
    anchors = [(400, 190), (880, 190), (255, 510), (640, 510), (1037, 510)]
    it = split_items('ui.png', 1, 1, names, min_area=2000, anchors=anchors, hollow=('heart-empty',))
    for n in names:
        put(fit(to_rgba(*it[n]), 72, 72) if n.startswith('shell') else fit(to_rgba(*it[n]), 64, 64), n)


if __name__ == '__main__':
    skip_and_rafts(); brumm(); stone_and_trails(); bricks(); pieces(); ui()
    json.dump(SIZES, open('dev/art/sizes.json', 'w'), indent=1)
    print(len(SIZES), 'sprites')
