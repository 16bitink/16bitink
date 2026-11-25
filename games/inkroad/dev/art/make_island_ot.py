"""Oldtown roundabout garden: lawn and flowers made from the sandy island."""
import numpy as np
from PIL import Image, ImageDraw
import artlib as A

rng = np.random.default_rng(7)
grass = Image.open(A.OUT / "tex-oldtown-grass.webp").convert("RGB")
for src, dst in (("flat-island", "flat-oldtown-island"), ("flat-island-small", "flat-oldtown-island-small")):
    im = Image.open(A.OUT / f"{src}.webp").convert("RGBA")
    w, h = im.size
    hsv = np.array(im.convert("RGB").convert("HSV")).astype(np.float32) / 255
    H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.hypot(xx - w / 2, yy - h / 2) / (w / 2)
    sandy = (H > 0.06) & (H < 0.15) & (S > 0.18) & (V > 0.5) & (r < 0.8) & (np.array(im)[..., 3] > 200)
    g = np.array(grass.resize((w * 2, h * 2)))[:h, :w].astype(np.float32)
    a = np.array(im).astype(np.float32)
    a[..., :3] = np.where(sandy[..., None], g * 0.95, a[..., :3])
    out = Image.fromarray(a.astype(np.uint8))
    d = ImageDraw.Draw(out)
    cols = [(236, 120, 150), (250, 248, 240), (245, 205, 70), (150, 110, 200), (235, 90, 70)]
    ys, xs = np.nonzero(sandy)
    k = 90 if w > 200 else 28
    for i in rng.choice(len(ys), min(k, len(ys)), replace=False):
        x, y = int(xs[i]), int(ys[i])
        c = cols[rng.integers(len(cols))]
        rad = 2 if w > 200 else 1
        d.ellipse((x - rad, y - rad, x + rad, y + rad), fill=c + (255,))
    out.save(A.OUT / f"{dst}.webp", "WEBP", quality=88, method=6)
    bg = Image.new("RGBA", out.size, (150, 160, 120, 255)); bg.alpha_composite(out)
    bg.convert("RGB").save(f"/private/tmp/claude-501/-Users-omegascorp-Projects-16bitink/b5ecefdb-e522-4b8c-8f5e-aa6cccb8f4bc/scratchpad/art/{dst}.png")
