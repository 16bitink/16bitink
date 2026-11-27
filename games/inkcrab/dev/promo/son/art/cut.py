"""Cut Dewy's son (the fennec kit) out of his 4x2 pose sheet.

Input: raw/sheet-up4.png (ElevenLabs gpt-image-2.5-sunburst, flow pxhCJTx7cUrBkOKUGktJ, generation
knQpG2U5shHqaY6vxI3P, then two Topaz 2x passes). Output: <key>.png, transparent, trimmed, in art/.
Uses the same paper keying as Dewy's cutter (games/inkfish/dev/promo/devstory/art/cut.py).
Run: python3 cut.py   (from this folder). Needs Pillow + numpy.
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "../../../../../inkfish/dev/promo/devstory/art"))
from cut import cut  # noqa: E402  (Dewy's cutter: white paper keyed by flood fill, centre blob kept)

KEYS = ["dig", "hold-crab", "peek", "trophy", "search", "torch", "tablet", "asleep"]


def main():
    sheet = Image.open(os.path.join(HERE, "raw", "sheet-up4.png")).convert("RGB")
    cw, ch = sheet.width / 4, sheet.height / 2
    m = round(cw * 0.06)  # a bucket or a spade may reach past the grid line
    for i, key in enumerate(KEYS):
        r, c = divmod(i, 4)
        cell = sheet.crop((max(0, round(c * cw) - m), round(r * ch), min(sheet.width, round((c + 1) * cw) + m), round((r + 1) * ch)))
        out = cut(cell)
        out.save(os.path.join(HERE, key + ".png"))
        print(key, out.size)


if __name__ == "__main__":
    main()
