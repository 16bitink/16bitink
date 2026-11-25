"""Turns the red paint of a picture teal (red means jammed and nothing else in this game).
   python3 dev/art/recolour.py src/art/img/v-tram.webp ...   rewrites the files in place; running it twice changes nothing."""
import colorsys, sys
from PIL import Image

TEAL_HUE = 0.505
RED = 0.06  # hue distance that still counts as red
SAT = 0.34

for path in sys.argv[1:]:
    im = Image.open(path).convert('RGBA'); px = im.load()
    n = 0
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if min(h, 1 - h) < RED and s > SAT:
                r, g, b = colorsys.hsv_to_rgb(TEAL_HUE, min(1, s * 0.86), v * 0.74)
                px[x, y] = (round(r * 255), round(g * 255), round(b * 255), a); n += 1
            elif 'tram' in path and s < 0.12 and 0.5 < v < 0.93:
                px[x, y] = (min(255, round(r * 1.06)), min(255, round(g * 1.03)), round(b * 0.94), a)  # a cream roof
    if n: im.save(path, quality=92, method=6)
    print(path, n)
