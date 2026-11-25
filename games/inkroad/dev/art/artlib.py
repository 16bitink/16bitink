"""Cut sprite sheets by connected alpha regions, make seamless textures, save webp."""
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).parent
OUT = HERE.parent.parent / "src" / "art" / "img"
OUT.mkdir(parents=True, exist_ok=True)
S = 4  # label grid downscale


def cut(path, min_area=40, dilate=5):
    """Return components (list of dict bbox/img/cx/cy) of an RGBA sheet."""
    im = Image.open(path).convert("RGBA")
    a = np.array(im)[..., 3]
    small = Image.fromarray(((a > 24) * 255).astype(np.uint8)).resize((im.width // S, im.height // S), Image.BOX)
    small = small.point(lambda v: 255 if v > 30 else 0).filter(ImageFilter.MaxFilter(dilate))
    m = np.array(small) > 0
    lab = np.zeros(m.shape, np.int32)
    n = 0
    for y, x in zip(*np.nonzero(m)):
        if lab[y, x]:
            continue
        n += 1
        q = deque([(y, x)])
        lab[y, x] = n
        while q:
            cy, cx = q.popleft()
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and m[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n
                    q.append((ny, nx))
    big = np.array(Image.fromarray(lab.astype(np.int32), "I").resize(im.size, Image.NEAREST))
    arr = np.array(im)
    comps = []
    for i in range(1, n + 1):
        mask = big == i
        ys, xs = np.nonzero(mask & (arr[..., 3] > 24))
        if len(ys) < min_area * S * S:
            continue
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        sub = arr[y0:y1, x0:x1].copy()
        sub[~mask[y0:y1, x0:x1]] = 0
        comps.append(dict(bbox=(x0, y0, x1, y1), img=Image.fromarray(sub), cx=(x0 + x1) / 2, cy=(y0 + y1) / 2, area=len(ys)))
    return comps


def order(comps, rows):
    """rows: list of counts per row. Sort by y centre, chunk, sort by x."""
    cs = sorted(comps, key=lambda c: c["bbox"][3])  # by bottom edge
    out, i = [], 0
    for r in rows:
        out += sorted(cs[i:i + r], key=lambda c: c["cx"])
        i += r
    return out


def clean(img, thresh=40):
    """Kill faint alpha fringe, trim."""
    a = np.array(img)
    a[..., 3] = np.where(a[..., 3] < thresh, 0, a[..., 3])
    a[a[..., 3] == 0] = 0
    im = Image.fromarray(a)
    bb = im.getbbox()
    return im.crop(bb) if bb else im


def save(img, name, width=None, height=None, fit=None):
    """Resize (by width, height, or fit within (w,h)) and save webp."""
    im = clean(img)
    if width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    elif height:
        im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    elif fit:
        k = min(fit[0] / im.width, fit[1] / im.height)
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    im.save(OUT / f"{name}.webp", "WEBP", quality=88, method=6)
    return im.size


def seamless(tile, size=512, lowcut=0.0):
    """Offset-and-blend seamless tile from a square-ish crop."""
    im = tile.convert("RGB").resize((size, size), Image.LANCZOS)
    a = np.asarray(im, np.float32)
    low = np.asarray(im.filter(ImageFilter.GaussianBlur(size / 7)), np.float32)
    a = a - low + a.mean((0, 1))  # drop the gradient so the repeat cannot show
    h = size // 2
    shifted = np.roll(np.roll(a, h, 0), h, 1)
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    # weight 1 at centre of source, 0 at its edges (where shifted copy is seamless)
    wx = 1 - np.abs(x - h) / h
    wy = 1 - np.abs(y - h) / h
    w = np.clip(np.minimum(wx, wy) * 1.0, 0, 1)[..., None]
    w = w * w * (3 - 2 * w)
    out = a * w + shifted * (1 - w)
    # restore contrast lost by blending
    mean = out.mean((0, 1))
    out = mean + (out - mean) * 1.15
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def flatten_tex(img, contrast=1.0, blur=0.0):
    a = np.asarray(img.convert("RGB"), np.float32)
    mean = a.mean((0, 1))
    a = mean + (a - mean) * contrast
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return im.filter(ImageFilter.GaussianBlur(blur)) if blur else im


def save_tex(img, name):
    img.save(OUT / f"{name}.webp", "WEBP", quality=86, method=6)


def tile3(name, path):
    im = Image.open(path).convert("RGB")
    sheet = Image.new("RGB", (im.width * 3, im.height * 3))
    for i in range(3):
        for j in range(3):
            sheet.paste(im, (i * im.width, j * im.height))
    return sheet
