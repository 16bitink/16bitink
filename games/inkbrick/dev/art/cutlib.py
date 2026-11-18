"""Cut-out helpers for the InkBrick art sheets (cream paper -> transparent PNG).
Same idea as apps/web/scripts/duo/build_art.py: flood the paper colour from the
border, erode the alpha a little so no cream fringe is left, blur it softly."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
SHEETS = HERE / 'sheets'
OUT = HERE.parent.parent / 'src' / 'art' / 'img-paint'  # the watercolour set; build_ink_characters.py writes ./img
PAPER_DIST = 34       # summed RGB distance still counted as paper
PUNCH_MIN_AREA = 200   # px of an enclosed paper gap worth cutting out
BRIDGE = 3            # px of dilation when grouping parts of one item


def paper_colour(a):
    return np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3)]), axis=0)


def _grow(reg, free):
    g = reg.copy()
    g[1:, :] |= reg[:-1, :]; g[:-1, :] |= reg[1:, :]
    g[:, 1:] |= reg[:, :-1]; g[:, :-1] |= reg[:, 1:]
    return g & free


def flood_from_border(free):
    reg = np.zeros_like(free)
    reg[0, :], reg[-1, :], reg[:, 0], reg[:, -1] = free[0, :], free[-1, :], free[:, 0], free[:, -1]
    while True:
        g = _grow(reg, free)
        if (g == reg).all():
            return reg
        reg = g


def object_mask(arr, hollow=False):
    paper = paper_colour(arr)
    near = np.abs(arr - paper).sum(2) <= PAPER_DIST
    return ~near if hollow else ~flood_from_border(near)


def dilate(m, r):
    img = Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(2 * r + 1))
    return np.asarray(img) > 0


def label(m):
    """Connected components (4-neighbour) by label propagation."""
    lab = np.where(m, np.arange(1, m.size + 1).reshape(m.shape), 0).astype(np.int64)
    while True:
        new = lab.copy()
        for sl_a, sl_b in (((slice(1, None), slice(None)), (slice(None, -1), slice(None))),
                           ((slice(None, -1), slice(None)), (slice(1, None), slice(None))),
                           ((slice(None), slice(1, None)), (slice(None), slice(None, -1))),
                           ((slice(None), slice(None, -1)), (slice(None), slice(1, None)))):
            nb = lab[sl_b]
            cur = new[sl_a]
            cand = np.where((nb > 0) & (cur > 0), np.minimum(cur, nb), cur)
            new[sl_a] = cand
        if (new == lab).all():
            return new
        lab = new


def split_items(sheet, cols, rows, names, min_area=60, main_only=(), hollow=(), anchors=None, punch=0):
    """-> {name: (rgba float array cropped to the item)}, items found by grid anchor."""
    arr = np.asarray(Image.open(SHEETS / sheet).convert('RGB')).astype(float)
    h, w = arr.shape[:2]
    mask = object_mask(arr)
    lab = label(dilate(mask, BRIDGE))
    anchors = anchors or [((c + .5) * w / cols, (r + .5) * h / rows) for r in range(rows) for c in range(cols)]
    groups = {i: [] for i in range(len(names))}
    for l in np.unique(lab[lab > 0]):
        comp = (lab == l) & mask
        if comp.sum() < min_area:
            continue
        ys, xs = np.nonzero(comp)
        cx, cy = xs.mean(), ys.mean()
        k = int(np.argmin([(cx - ax) ** 2 + (cy - ay) ** 2 for ax, ay in anchors]))
        groups[k].append((comp, comp.sum()))
    out = {}
    for i, name in enumerate(names):
        if not groups[i]:
            raise SystemExit(f'{sheet}: nothing found for {name}')
        comps = groups[i]
        if name in main_only:
            comps = [max(comps, key=lambda c: c[1])]
        m = np.zeros_like(mask)
        for c, _ in comps:
            m |= c
        if name in hollow:
            m = object_mask(arr, hollow=True) & dilate(m, 2)
        if punch:  # drop enclosed paper-coloured gaps (between an arm and the body)
            gap = m & ((np.abs(arr - paper_colour(arr)).sum(2) <= punch) | ((arr.min(2) >= 190) & (arr.max(2) - arr.min(2) <= 40)))
            lab = label(gap)
            for l in np.unique(lab[lab > 0]):
                comp = lab == l
                if comp.sum() >= PUNCH_MIN_AREA:   # small ones are eye whites and highlights: keep
                    m = m & ~comp
        out[name] = (arr, m)
    return out


def to_rgba(arr, m, erode=1, blur=0.8):
    ys, xs = np.nonzero(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    a = Image.fromarray(m[y0:y1, x0:x1].astype(np.uint8) * 255)
    for _ in range(erode):
        a = a.filter(ImageFilter.MinFilter(3))
    a = a.filter(ImageFilter.GaussianBlur(blur))
    rgb = arr[y0:y1, x0:x1].astype(np.uint8)
    return np.dstack([rgb, np.asarray(a)])


def fit(rgba, box_w, box_h, stretch=False):
    im = Image.fromarray(rgba, 'RGBA')
    if stretch:
        return im.resize((box_w, box_h), Image.LANCZOS)
    s = min(box_w / im.width, box_h / im.height)
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)


def save(im, name, webp=False):
    OUT.mkdir(parents=True, exist_ok=True)
    p = OUT / (name + ('.webp' if webp else '.png'))
    if webp:
        im.convert('RGB').save(p, 'WEBP', quality=82, method=6)
    else:
        im.save(p, optimize=True)
    return p
