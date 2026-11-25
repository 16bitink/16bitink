"""Contact sheet (shelf packed) on sand: sheet.py out.png glob..."""
import sys, glob
from PIL import Image, ImageDraw
out, pats = sys.argv[1], sys.argv[2:]
W = 1800
files = sorted(set(f for p in pats for f in glob.glob(p)))
ims = [Image.open(f).convert("RGBA") for f in files]
rows, cur, w = [], [], 0
for f, im in zip(files, ims):
    if w + im.width + 10 > W and cur:
        rows.append(cur); cur, w = [], 0
    cur.append((f, im)); w += im.width + 10
rows.append(cur)
H = sum(max(i.height for _, i in r) + 16 for r in rows)
bg = Image.new("RGBA", (W, H), (232, 204, 150, 255))
d = ImageDraw.Draw(bg)
y = 0
for r in rows:
    rh = max(i.height for _, i in r)
    x = 5
    for f, im in r:
        bg.alpha_composite(im, (x, y + 12 + rh - im.height))
        d.text((x, y), f.split("/")[-1][:-5], fill=(0, 0, 0, 255))
        x += im.width + 10
    y += rh + 16
bg.convert("RGB").save(out)
