"""Backgrounds, coast map and catalog cover (opaque images) -> src/art/img/*.webp.
The generator only makes 1280 x 720, so:
  bg-N-wide  = the painting scaled up to 1920 x 1080 (surround; the board covers the middle third)
  bg-N-board = its centre 9:16 slice, scaled to 1080 x 1920, softly blurred and pulled toward its
               mean colour so the bricks read on top (a calm, out-of-focus version of the place)."""
import json
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance, ImageChops
from cutlib import SHEETS, OUT, save

REPO = Path(__file__).resolve().parents[4]
SIZES = {}


def calm(im):
    soft = im.filter(ImageFilter.GaussianBlur(7))
    mean = Image.new('RGB', im.size, tuple(int(c) for c in soft.resize((1, 1), Image.BOX).getpixel((0, 0))))
    soft = Image.blend(soft, mean, 0.28)
    return ImageEnhance.Brightness(ImageEnhance.Color(soft).enhance(0.85)).enhance(1.04)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for n in range(1, 6):
        src = Image.open(SHEETS / f'bg{n}.png').convert('RGB')
        wide = src.resize((1920, 1080), Image.LANCZOS)
        w = round(src.height * 9 / 16)
        x0 = (src.width - w) // 2
        board = calm(src.crop((x0, 0, x0 + w, src.height)).resize((1080, 1920), Image.BICUBIC))
        for name, im in ((f'bg-{n}-wide', wide), (f'bg-{n}-board', board)):
            p = save(im, name, webp=True)
            SIZES[name] = list(im.size)
    m = Image.open(SHEETS / 'map.png').convert('RGB').resize((1920, 1080), Image.LANCZOS)
    save(m, 'map', webp=True)
    SIZES['map'] = [1920, 1080]
    cov = Image.open(SHEETS / 'cover.png').convert('RGB').resize((1200, 675), Image.LANCZOS)
    cov.save(REPO / 'apps/web/public/covers/inkbrick.png', optimize=True)
    json.dump(SIZES, open(Path(__file__).parent / 'sizes-backdrops.json', 'w'), indent=1)
    print('backdrops', len(SIZES))


if __name__ == '__main__':
    main()
