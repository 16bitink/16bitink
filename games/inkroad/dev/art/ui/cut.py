"""Cut the InkRoad UI sheets in raw/ into webp files in src/ui/img.

Run: python3 cut.py   (from this folder). Needs Pillow + numpy.
"""
import os
from collections import deque
from PIL import Image, ImageFilter
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "ui", "img"))


def load(name):
    return Image.open(os.path.join(RAW, name + ".png")).convert("RGBA")


def save(im, sub, key, q=88):
    d = os.path.join(OUT, sub)
    os.makedirs(d, exist_ok=True)
    im.save(os.path.join(d, key + ".webp"), "WEBP", quality=q, method=6)


def components(im, scale=4, grow=3):
    """Connected alpha regions (on a shrunk, grown mask). Returns [(cx, cy, bbox)]."""
    a = im.getchannel("A")
    w, h = a.size
    m = a.point(lambda v: 255 if v > 120 else 0).resize((w // scale, h // scale), Image.BILINEAR)
    m = m.filter(ImageFilter.MaxFilter(grow))
    arr = np.array(m) > 40
    lab = np.zeros(arr.shape, int)
    n = 0
    out = []
    for y in range(arr.shape[0]):
        for x in range(arr.shape[1]):
            if arr[y, x] and not lab[y, x]:
                n += 1
                q = deque([(y, x)])
                lab[y, x] = n
                ys, xs = [], []
                while q:
                    cy, cx = q.popleft()
                    ys.append(cy)
                    xs.append(cx)
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < arr.shape[0] and 0 <= nx < arr.shape[1] and arr[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n
                            q.append((ny, nx))
                if len(ys) > 30:
                    out.append((np.mean(xs) * scale, np.mean(ys) * scale,
                                (min(xs) * scale, min(ys) * scale, (max(xs) + 1) * scale, (max(ys) + 1) * scale)))
    return out


def _cut_points(profile, n, total, win=70):
    """n-1 cut positions at the emptiest spot near each nominal grid line."""
    cuts = [0]
    for i in range(1, n):
        c = int(total * i / n)
        lo, hi = max(c - win, cuts[-1] + 1), min(c + win, total - 1)
        seg = profile[lo:hi]
        # emptiest spot, ties broken toward the nominal line
        best = min(range(len(seg)), key=lambda j: (seg[j], abs(lo + j - c)))
        cuts.append(lo + best)
    cuts.append(total)
    return cuts


def grid_items(im, rows, cols):
    """One trimmed RGBA crop per grid cell, as {(row, col): image}."""
    W, H = im.size
    mask = np.array(im.getchannel("A")) > 120
    rc = _cut_points(mask.sum(axis=1), rows, H)
    res = {}
    for r in range(rows):
        band = mask[rc[r]:rc[r + 1]]
        cc = _cut_points(band.sum(axis=0), cols, W)
        for c in range(cols):
            box = (cc[c], rc[r], cc[c + 1], rc[r + 1])
            crop = im.crop(box)
            bb = crop.getchannel("A").point(lambda v: 255 if v > 12 else 0).getbbox()
            if bb:
                res[(r, c)] = crop.crop(bb)
    return res


def fit_square(im, size, pad=0.04):
    inner = int(size * (1 - 2 * pad))
    s = min(inner / im.width, inner / im.height)
    r = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    c = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    c.alpha_composite(r, ((size - r.width) // 2, (size - r.height) // 2))
    return c


def bottom_canvas(im, scale, w, h):
    r = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    c = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    c.alpha_composite(r, ((w - r.width) // 2, h - r.height))
    return c


def portraits():
    items = grid_items(load("portraits"), 2, 5)
    names = ["dewy", "miko", "juma", "pim", "sulo"]
    for col, n in enumerate(names):
        a, b = items[(0, col)], items[(1, col)]
        s = 320 / max(a.height, b.height)
        w = round(max(a.width, b.width) * s)
        save(bottom_canvas(a, s, w, 320), "portraits", n)
        save(bottom_canvas(b, s, w, 320), "portraits", n + ("_stern" if n == "sulo" else "_upset"))
    res = grid_items(load("residents"), 3, 5)
    rn = ["hedgehog", "gazelle", "owl", "flamingo", "oryx", "sandcat", "gecko", "pelican", "jerboa2",
          "badger", "otter", "goose", "seal", "stork"]
    s = 320 / max(i.height for i in res.values())
    for idx, n in enumerate(rn):
        im = res[(idx // 5, idx % 5)]
        save(bottom_canvas(im, s, round(im.width * s), round(im.height * s)), "portraits", n)


def icons():
    a = grid_items(load("tools_a"), 4, 4)
    na = ["street", "avenue", "boulevard", "highway", "remove", "junction", "flyover", "underpass",
          "kerb", "parking", "toll", "bus", "buslane", "tram", "metro", "boat"]
    for i, n in enumerate(na):
        save(fit_square(a[(i // 4, i % 4)], 96), "tools", n)
    b = grid_items(load("tools_b"), 4, 4)
    nb = ["oneway", "square", "zone", "group_roads", "group_junctions", "group_parking", "group_prices",
          "group_transit", "ov_flow", "ov_parking", "ov_anger", "ov_money", "bar_trips", "bar_parking",
          "bar_cost", "bar_streets"]
    for i, n in enumerate(nb):
        save(fit_square(b[(i // 4, i % 4)], 96), "tools", n)
    t = grid_items(load("tech"), 3, 5)
    nt = ["smart_signals", "scan_car", "parking_app", "tow_trucks", "staggered_hours", "school_buses",
          "night_works", "traffic_forecast", "express_bus", "quiet_asphalt", "resident_permits",
          "park_and_ride_app", "electric_buses", "drone_patrol"]
    for i, n in enumerate(nt):
        save(fit_square(t[(i // 5, i % 5)], 128), "tech", n)


def seamless(arr):
    n = arr.shape[0]
    t = (np.arange(n) + 0.5) / n
    w = 1 - np.abs(2 * t - 1)
    a = arr.astype(float)
    wx = w[None, :, None]
    a = a * wx + np.roll(a, n // 2, axis=1) * (1 - wx)
    wy = w[:, None, None]
    a = a * wy + np.roll(a, n // 2, axis=0) * (1 - wy)
    return a


def materials():
    m = load("materials").convert("RGB")
    for key, (x0, y0) in (("paper", (0, 0)), ("desk_leather", (640, 0)), ("desk_wood", (0, 360))):
        c = m.crop((x0 + 160, y0 + 20, x0 + 160 + 320, y0 + 20 + 320))
        arr = seamless(np.array(c))
        im = Image.fromarray(np.clip(arr, 0, 255).astype("uint8")).resize((512, 512), Image.LANCZOS)
        save(im, "materials", key, 90)
    d = load("desk")
    for cx, cy, b in components(d):
        if cx < 400 and cy < 350:
            b = (b[0], b[1], b[2] - 12, b[3] - 12)  # drop the envelope sliver at the corner
        c = d.crop(b)
        c = c.crop(c.getchannel("A").point(lambda v: 255 if v > 12 else 0).getbbox())
        if cx < 400 and cy < 350:
            key, w = "stamp_ring", 256
        elif cy < 350:
            key, w = "plate_blank", 384
        elif cx < 450:
            key, w = "tape", 192
        elif cx < 950:
            key, w = "envelope", 256
        else:
            key, w = "wax_seal", 160
        save(c.resize((w, round(c.height * w / c.width)), Image.LANCZOS), "materials", key)


def cover(im, box, size, q):
    return im.crop(box).resize(size, Image.LANCZOS)


def pictures():
    def rgb(n):
        return Image.open(os.path.join(RAW, n + ".png")).convert("RGB")
    save(rgb("menu").resize((1920, 1080), Image.LANCZOS), "pictures", "menu_key_art", 82)
    for n, key in (("city_saffron", "saffron_bay"), ("city_oldharbour", "old_harbour"),
                   ("city_twinisles", "twin_isles"), ("city_sevenhills", "seven_hills"),
                   ("city_crossrivers", "cross_rivers")):
        save(cover(rgb(n), (64, 0, 1216, 720), (640, 400), 84), "pictures", "city_" + key, 84)
    save(rgb("end_replaced").resize((960, 540), Image.LANCZOS), "pictures", "end_replaced", 84)
    save(rgb("end_done").resize((960, 540), Image.LANCZOS), "pictures", "end_city_done", 84)
    save(cover(rgb("cover"), (40, 0, 760, 720), (1024, 1024), 86), "pictures", "cover_square", 86)


if __name__ == "__main__":
    import sys
    for f in (sys.argv[1:] or ["portraits", "icons", "materials", "pictures"]):
        globals()[f]()
