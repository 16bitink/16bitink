"""Remove the cars drawn in the gulf mall car park (patch by colour key + inpaint)."""
import numpy as np
from PIL import Image
import artlib as A
P = A.OUT / "b-gulf-mall1-0.webp"
im = Image.open(P).convert("RGBA")
a = np.array(im).astype(np.float32)
hsv = np.array(im.convert("RGB").convert("HSV")).astype(np.float32) / 255
H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
mask = np.zeros(H.shape, bool)
rgb = a[..., :3]
asph = np.median(rgb[135:150, 30:45].reshape(-1, 3), 0)
dev = np.abs(rgb - asph).max(-1)
palm = np.zeros(H.shape, bool)
for (x0, y0, x1, y1) in [(46, 128, 70, 168), (90, 128, 114, 166), (88, 176, 114, 210),
                         (362, 128, 388, 168), (408, 126, 436, 168), (362, 176, 398, 210)]:
    palm[y0:y1, x0:x1] = True
for (x0, y0, x1, y1) in [(42, 152, 126, 209), (350, 152, 440, 209)]:
    sub = np.zeros_like(mask); sub[y0:y1, x0:x1] = True
    mask |= sub & (dev > 28) & ~palm
# cars hidden under the palm boxes: key colours there
blue = (H > 0.5) & (H < 0.7) & (S > 0.25)
red = ((H < 0.04) | (H > 0.93)) & (S > 0.35)
yellow = (H > 0.09) & (H < 0.16) & (S > 0.5) & (V > 0.7)
white = (V > 0.85) & (S < 0.15)
mask |= palm & (blue | red | yellow | white) & (np.arange(H.shape[0])[:, None] > 150)
# grow
m = mask.copy()
for _ in range(2):
    m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
known = (~m).astype(np.float32)
img = a[..., :3] * known[..., None]
for _ in range(40):
    k = known.copy(); acc = img.copy()
    num = sum(np.roll(np.roll(img, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1))
    den = sum(np.roll(np.roll(known, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1))
    new = num / np.maximum(den, 1e-6)[..., None]
    fill = (known == 0) & (den > 0)
    img = np.where(fill[..., None], new, img)
    known = np.where(fill, 1.0, known)
    if known.min() == 1: break
a[..., :3] = np.where(m[..., None], img, a[..., :3])
Image.fromarray(a.astype(np.uint8)).save(P, "WEBP", quality=88, method=6)
print("patched", int(m.sum()))
