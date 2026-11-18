"""Cuts the ink-style characters (ElevenLabs, InkFish style) into src/art/img/ at the paint set's sizes.
  python3 dev/art/build_ink_characters.py      (from games/inkbrick)
Sheets: dev/art/sheets-ink/skip.png (2x2: aim, idle, cheer, shrug on the raft), skip-moves.png (2x2: ready, swat-up,
swat-across, throw: the play animation's frames, made from skip.png) and brumm.png (smug, hit, defeated).
Made in the ElevenLabs flow bj0iIdC0DeWL0gA7IaNM from the paint sheets with covers/inkfish.png as the style reference."""
import numpy as np
from PIL import Image
import cutlib
from cutlib import split_items, to_rgba

cutlib.SHEETS = cutlib.HERE / 'sheets-ink'
cutlib.OUT = cutlib.HERE.parent.parent / 'src' / 'art' / 'img'
SKIP_W, SKIP_H, RAFT_W = 194, 105, 180


def canvas(w, h, parts):
    c = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for im, x, y in parts:
        c.alpha_composite(im, (x, y))
    return c


def raft_width(a):
    """Width of the opaque run along the raft (the item's lowest tenth)."""
    rows = a[int(a.shape[0] * 0.9):, :, 3] > 128
    cols = np.where(rows.any(axis=0))[0]
    return cols[-1] - cols[0] + 1


def skip(sheet='skip.png', names=('skip-aim', 'skip-idle', 'skip-cheer', 'skip-shrug')):
    """Every sheet is scaled so its raft is RAFT_W wide, so all frames line up on the raft."""
    items = split_items(sheet, 2, 2, list(names), punch=30)
    cut = {n: to_rgba(*items[n]) for n in names}
    s = min(min(RAFT_W / raft_width(a), SKIP_W / a.shape[1], SKIP_H / a.shape[0]) for a in cut.values())
    if sheet != 'skip.png':  # match the first sheet's scale by the raft
        s = min(RAFT_W / raft_width(a) for a in cut.values())
    for n, a in cut.items():
        im = Image.fromarray(a, 'RGBA')
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        cutlib.save(canvas(SKIP_W, SKIP_H, [(im, 0, SKIP_H - im.height)]), n)
    print('skip scale', s, 'raft px', [round(raft_width(a) * s) for a in cut.values()])


def brumm():
    names = ['brumm-smug', 'brumm-hit', 'brumm-defeated']
    items = split_items('brumm.png', 3, 1, names)
    cut = {n: Image.fromarray(to_rgba(*items[n]), 'RGBA') for n in names}
    s = min(min(440 / i.width, 360 / i.height) for i in cut.values())
    for n, im in cut.items():
        r = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        cutlib.save(canvas(440, 360, [(r, (440 - r.width) // 2, 360 - r.height)]), n)


if __name__ == '__main__':
    skip()
    skip('skip-moves.png', ('skip-ready', 'skip-swat-up', 'skip-swat-across', 'skip-throw'))
    brumm()
