import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA")
bg = Image.new("RGBA", im.size, (232, 204, 150, 255))
bg.alpha_composite(im)
bg.convert("RGB").save(dst)
