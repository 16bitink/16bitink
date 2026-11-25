import sys, glob
from PIL import Image
out = sys.argv[1]; files = sys.argv[2:]
ims = [Image.open(f).convert("RGB").resize((256, 256)) for f in files]
cols = 4; rows = (len(ims) + 3) // 4
sheet = Image.new("RGB", (cols * 768, rows * 768))
for n, f in enumerate(files):
    im = Image.open(f).convert("RGB").resize((256, 256))
    for i in range(3):
        for j in range(3):
            sheet.paste(im, ((n % cols) * 768 + i * 256, (n // cols) * 768 + j * 256))
sheet.resize((sheet.width // 2, sheet.height // 2)).save(out)
