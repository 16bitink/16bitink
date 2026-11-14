"""Installs the Dust Flats (chapter 2) art: structures, grounds, the Sand Crawler and the sandstorm overlay.

  python3 dev/pixel/desert/build.py crawler-cut   paint/crawler.png -> out/painted/crawler-*.png (+ treads f2)
  python3 dev/pixel/desert/build.py storm         paint/raw-sandstorm.png -> out/sandstorm.png (seamless, alpha)
  python3 dev/pixel/desert/build.py install       copies everything into src/art/pixel/world and adds it to manifest.json

The whole batch, from scratch (PixelLab steps marked *):
  1. Structures: models in dev/pixel/world/desert.py, then
       python3 dev/pixel/world/build.py --only=<DESERT names> --view
       python3 -c "import sheets; sheets.GAP=4; sheets.pack('desert', *DESERT)"      (in dev/pixel/world)
     * edit_image on out/sheets/desert/sheet-0.png, 512, transparent, seed 2101, prompt STRUCTURE_PROMPT -> paint/desert/sheet-0.png
       python3 dev/pixel/world/sheets.py cut desert; python3 dev/pixel/world/sheets.py unify adobeSmall adobeLarge oilTank
  2. Crawler: python3 dev/pixel/desert/crawler.py
     * edit_image on out/sheets/crawler.png, 512, transparent, seed 2103 -> paint/crawler.png; then crawler-cut.
  3. Grounds: * create_image_pro 512 opaque, style image ground/sand.png -> world/paint/ground/raw-<name>.png (sandTrack seed 2201,
     canyonRock seed 2202 with style_copy outline/detail/shading, packedSand seed 2204), then `build.py grounds`: a min-cut quilt
     makes each a seamless 384 tile from its own pixels (no PixelLab call; seam.py's inpainted cross showed as a band here).
  1b. Batch 2 (dev/pixel/world/desert2.py): build.py --only=<batch 2 names>; pack 'desert2' with sheets.GAP=4, sheets.SIZE=340;
     * edit_image 340, transparent, seed 2105 -> world/paint/desert2/sheet-0.png; sheets.py cut desert2; unify adobeWallH adobeWallV valve.
  2b. Boss mortar: crawler.py also writes out/sheets/mortar.png; * edit_image 256, seed 2106 -> paint/mortar.png; then mortar-cut.
  4. Sandstorm: * create_image_pro 512 opaque, seed 2203 -> paint/raw-sandstorm.png; then storm.
  5. install. It only adds to manifest.json (as dev/pixel/concrete/build.py does), so run it again after
     dev/pixel/world/install.py, which rewrites the manifest from the chapter 1 set alone.

PixelLab paints colour only; every piece keeps its model's outline, footprint and shadow. crowTent-0 was remodelled and
repainted alone after the sheet (seed 2104, 128 canvas, reference = the standing tent's paint): `tent-cut` puts it back.
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
WORLD_DEV = HERE.parent / 'world'
sys.path.insert(0, str(WORLD_DEV))
sys.path.insert(0, str(HERE))
from install import edge_mask  # noqa: E402  (dev/pixel/world/install.py)
from sheets import match  # noqa: E402

DEST = HERE.parents[2] / 'src' / 'art' / 'pixel' / 'world'
RENDER = WORLD_DEV / 'out' / 'render'
PAINTED = WORLD_DEV / 'out' / 'painted'
DESERT = ['adobeSmall', 'adobeLarge', 'oilDerrick', 'oilTank', 'palm', 'cactus', 'canyonRockA', 'canyonRockB', 'canyonRockC', 'mesaEdge',
          'well', 'crowTent', 'flagInk', 'flagCrow', 'flagBare',
          # Batch 2 (dev/pixel/world/desert2.py, sheet desert2: 340 px, seed 2105).
          'dune', 'duneV', 'mesaEdgeV', 'mesaCorner', 'adobeWallH', 'adobeWallV', 'crowGate', 'scrub', 'pipeH', 'pipeV', 'valve']
# name: (source in world/paint/ground, order: higher draws over lower at an edge; sand is 2, dirt 3)
GROUNDS = {'sand': ('sand.png', 2), 'canyonRock': ('canyonRock.png', 1.5), 'packedSand': ('packedSand.png', 2.5), 'sandTrack': ('sandTrack.png', 2.5),
           'sandTrackH': ('sandTrack.png', 2.5)}
STORM_ALPHA = (36, 215)  # alpha of the haze's darkest and lightest wisps (curve STORM_GAMMA between)
STORM_GAMMA = 1.5


def min_cut(err: np.ndarray) -> np.ndarray:
    """Per row, the column of the cheapest top-to-bottom path through err (rows x cols), steps of at most one column."""
    h, w = err.shape
    cost = err.copy()
    for y in range(1, h):
        prev = cost[y - 1]
        best = np.minimum(prev, np.minimum(np.r_[np.inf, prev[:-1]], np.r_[prev[1:], np.inf]))
        cost[y] += best
    path = np.zeros(h, int)
    path[-1] = int(np.argmin(cost[-1]))
    for y in range(h - 2, -1, -1):
        c = path[y + 1]
        lo, hi = max(0, c - 1), min(w, c + 2)
        path[y] = lo + int(np.argmin(cost[y, lo:hi]))
    return path


def quilt_x(a: np.ndarray, overlap: int) -> np.ndarray:
    """A tile that wraps in x, (width - overlap) wide: its first `overlap` columns are the image's last ones up to a cut,
    then its own, the cut running where the two agree best. Every pixel is the painting's own; nothing is blended."""
    w = a.shape[1]
    p = w - overlap
    left, right = a[:, p:].astype(float), a[:, :overlap].astype(float)
    err = np.abs(left - right).sum(axis=-1)
    # Keep the cut away from the overlap's ends, so the wrap joins on the painting's own neighbours.
    err[:, :6] += 1e6
    err[:, -6:] += 1e6
    cut = min_cut(err)
    out = a[:, :p].copy()
    for y in range(a.shape[0]):
        out[y, :cut[y]] = a[y, p:p + cut[y]]
    return out


def quilt(src: Path, dest: Path, overlap: int = 128) -> None:
    a = np.array(Image.open(src).convert('RGB'))
    t = quilt_x(a, overlap)
    t = quilt_x(t.transpose(1, 0, 2), overlap).transpose(1, 0, 2)
    Image.fromarray(t).save(dest)
    print('quilt', src.name, '->', dest.name, t.shape[:2], 'edge step x/y',
          round(float(np.abs(t[:, 0].astype(int) - t[:, -1]).sum(axis=-1).mean()), 1),
          round(float(np.abs(t[0].astype(int) - t[-1]).sum(axis=-1).mean()), 1),
          'inside', round(float(np.abs(t[:, 100].astype(int) - t[:, 101]).sum(axis=-1).mean()), 1))


def grounds() -> None:
    """Each raw PixelLab ground made seamless by quilting (384 px tiles), as world/paint/ground/<name>.png."""
    g = WORLD_DEV / 'paint' / 'ground'
    for name in ('sandTrack', 'canyonRock', 'packedSand'):
        quilt(g / f'raw-{name}.png', g / f'{name}.png')
    # Chapter 1's sand, quilted from its own raw painting: seam.py's inpainted cross showed as straight bands across the
    # dunes, and the desert is mostly sand. The inpainted tile is kept as sand-inpaint.png.
    if not (g / 'sand-inpaint.png').exists():
        shutil.copy(g / 'sand.png', g / 'sand-inpaint.png')
    quilt(g / 'raw-sand.png', g / 'sand.png')


def mortar_cut() -> None:
    """The boss mortar turret (fortressMortar-1 / -0): paint/mortar.png, painted from out/sheets/mortar.png (seed 2106)."""
    meta = json.loads((HERE / 'out' / 'sheets' / 'mortar.json').read_text())
    art = np.array(Image.open(HERE / 'paint' / 'mortar.png').convert('RGBA'))
    for key, p in meta['place'].items():
        full = np.array(Image.open(HERE / 'out' / 'render' / f'{key}.png').convert('RGBA'))
        ys, xs = np.nonzero(full[..., 3])
        by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        src = full[by0:by1, bx0:bx1]
        score, dx, dy = match(art, src, p['x'] + bx0, p['y'] + by0)
        ax, ay = p['x'] + bx0 + dx, p['y'] + by0 + dy
        piece = art[ay:ay + by1 - by0, ax:ax + bx1 - bx0]
        rgb = np.where(piece[..., 3:] > 0, piece[..., :3], src[..., :3])
        whole = np.zeros_like(full)
        whole[by0:by1, bx0:bx1] = np.dstack([rgb, src[..., 3]])
        Image.fromarray(whole).save(HERE / 'out' / 'painted' / f'{key}.png')
        print(f'  {key:20s} match {score:.3f} shift {dx:+d},{dy:+d}')


def crawler_cut() -> None:
    place = json.loads((HERE / 'out' / 'sheets' / 'crawler.json').read_text())
    art = np.array(Image.open(HERE / 'paint' / 'crawler.png').convert('RGBA'))
    out = HERE / 'out' / 'painted'
    out.mkdir(parents=True, exist_ok=True)
    for key, p in place.items():
        full = np.array(Image.open(HERE / 'out' / 'render' / f'{key}.png').convert('RGBA'))
        ys, xs = np.nonzero(full[..., 3])
        by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        src = full[by0:by1, bx0:bx1]
        score, dx, dy = match(art, src, p['x'] + bx0, p['y'] + by0)
        ax, ay = p['x'] + bx0 + dx, p['y'] + by0 + dy
        piece = art[ay:ay + by1 - by0, ax:ax + bx1 - bx0]
        rgb = np.where(piece[..., 3:] > 0, piece[..., :3], src[..., :3])
        whole = np.zeros_like(full)
        whole[by0:by1, bx0:bx1] = np.dstack([rgb, src[..., 3]])
        Image.fromarray(whole).save(out / f'{key}.png')
        print(f'  {key:20s} match {score:.3f} shift {dx:+d},{dy:+d}')
    # Frame 2 of the treads: frame 1's paint plus the model's change between the frames (as world/install.py).
    a = np.array(Image.open(out / 'crawler-treads.png').convert('RGBA')).astype(float)
    m1 = np.array(Image.open(HERE / 'out' / 'render' / 'crawler-treads.png').convert('RGBA')).astype(float)
    m2 = np.array(Image.open(HERE / 'out' / 'render' / 'crawler-treads-f2.png').convert('RGBA')).astype(float)
    f2 = a.copy()
    f2[..., :3] += (m2[..., :3] - m1[..., :3]) * 0.9
    f2[..., 3] = np.maximum(a[..., 3], m2[..., 3])
    Image.fromarray(np.clip(f2, 0, 255).astype(np.uint8)).save(out / 'crawler-treads-f2.png')


def storm() -> None:
    """PixelLab's haze made seamless (rolled by half, its old edges crossfaded away) and turned into a see-through overlay:
    the wisps' brightness becomes their alpha, their colour the haze's sand colour."""
    a = np.array(Image.open(HERE / 'paint' / 'raw-sandstorm.png').convert('RGB')).astype(float)
    n = a.shape[0]
    rolled = np.roll(np.roll(a, n // 2, axis=0), n // 2, axis=1)
    # Weight of the original tile: 1 in the middle, 0 at its edges; the rolled tile is seamless at the original's edges.
    t = np.abs(np.arange(n) - (n - 1) / 2) / (n / 2)
    wx = np.clip((1 - t) / 0.35, 0, 1)
    w = np.minimum(wx[None, :], wx[:, None])[..., None]
    w = w * w * (3 - 2 * w)
    seamless = a * w + rolled * (1 - w)
    lum = seamless.mean(axis=-1)
    lo, hi = np.percentile(lum, 3), np.percentile(lum, 99)
    f = np.clip((lum - lo) / (hi - lo), 0, 1)
    alpha = STORM_ALPHA[0] + (STORM_ALPHA[1] - STORM_ALPHA[0]) * f ** STORM_GAMMA
    tint = seamless * 0.5 + np.array([226, 190, 132]) * 0.5
    Image.fromarray(np.dstack([np.clip(tint, 0, 255), alpha]).astype(np.uint8)).save(HERE / 'out' / 'sandstorm.png')
    print('storm', n, 'alpha', STORM_ALPHA)


def tent_cut() -> None:
    """crowTent-0, repainted alone (its first paint read as a coal heap): world/paint/desert/tent0.png is the render's
    crop at (4, 4) on a 128 canvas, painted by edit_image in reference mode on the standing tent's paint."""
    full = np.array(Image.open(RENDER / 'crowTent' / 'crowTent-0.png').convert('RGBA'))
    art = np.array(Image.open(WORLD_DEV / 'paint' / 'desert' / 'tent0.png').convert('RGBA'))
    ys, xs = np.nonzero(full[..., 3])
    by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    src = full[by0:by1, bx0:bx1]
    score, dx, dy = match(art, src, 4, 4)
    piece = art[4 + dy:4 + dy + by1 - by0, 4 + dx:4 + dx + bx1 - bx0]
    rgb = np.where(piece[..., 3:] > 0, piece[..., :3], src[..., :3])
    whole = np.zeros_like(full)
    whole[by0:by1, bx0:bx1] = np.dstack([rgb, src[..., 3]])
    Image.fromarray(whole).save(PAINTED / 'crowTent' / 'crowTent-0.png')
    print(f'  crowTent-0 match {score:.3f} shift {dx:+d},{dy:+d}')


def install_structures(manifest: dict) -> None:
    out = DEST / 'structures'
    meta = json.loads((RENDER / 'structures.json').read_text())
    for name in DESERT:
        m = meta[name]
        pieces = {}
        for key, v in m['pieces'].items():
            src = PAINTED / name / f'{key}.png'
            if not src.exists():
                raise SystemExit(f'unpainted {key}')
            shutil.copy(src, out / f'{key}.png')
            pieces[key] = {'file': f'structures/{key}.png', 'sortY': v['sortY']}
        for st in m['states']:
            shutil.copy(RENDER / name / f'{name}-{st}-shadow.png', out / f'{name}-{st}-shadow.png')
        manifest['structures'][name] = {
            'layer': 'structure', 'anchor': m['anchor'], 'size': m['size'], 'states': m['states'], 'hp': m['hp'], 'height': m['height'],
            'flattenable': m['flattenable'], 'cover': m['cover'], 'footprint': m['footprint'], 'roofFade': m['roofFade'],
            'pieces': pieces, 'shadows': {str(st): f'structures/{name}-{st}-shadow.png' for st in m['states']},
        }
        print('  structure', name, m['states'], 'hp', m['hp'])


def install_grounds(manifest: dict) -> None:
    out = DEST / 'ground'
    for name, (src, order) in GROUNDS.items():
        p = WORLD_DEV / 'paint' / 'ground' / src
        if not p.exists():
            print('  missing ground', name)
            continue
        im = Image.open(p).convert('RGB')
        if name.endswith('H'):
            im = im.transpose(Image.Transpose.ROTATE_90)
        im.save(out / f'{name}.png')
        Image.fromarray(edge_mask(np.array(im))).save(out / f'{name}-edge.png')
        manifest['ground'][name] = {'file': f'ground/{name}.png', 'edge': f'ground/{name}-edge.png', 'size': im.width, 'order': order}
        print('  ground', name, 'order', order)


def install_crawler(manifest: dict) -> None:
    out = DEST / 'vehicles'
    files = {}
    for key in ('crawler-body', 'crawler-treads', 'crawler-treads-f2'):
        shutil.copy(HERE / 'out' / 'painted' / f'{key}.png', out / f'{key}.png')
        files[key] = f'vehicles/{key}.png'
    fortress = manifest['vehicles']['fortress']
    # Both bodies' turret races moved to where the levels' turrets stand (rings.py repainted them): the mounts follow.
    import crawler as crawler_model  # noqa: E402  (this folder)
    shutil.copy(WORLD_DEV / 'out' / 'painted' / 'fortress' / 'fortress-body.png', out / 'fortress-body.png')
    fortress['mounts'] = json.loads((RENDER / 'topdown.json').read_text())['fortress']['mounts']
    mounts = {k: {'at': list(v), 'turret': crawler_model.MOUNT_TURRET[k]} for k, v in crawler_model.MOUNTS.items()}
    # The Boar fortress's turret art serves the crawler too (plus the boss mortar, below).
    crawler = {'size': 288, 'body': 'crawler-body', 'treads': ['crawler-treads', 'crawler-treads-f2'], 'mounts': mounts,
               'turrets': fortress['turrets'], 'facing': 'north', 'files': {**files, **{k: v for k, v in fortress['files'].items() if 'fortress-' not in k}}}
    # The boss mortar turret: on the fortress's list of turrets too, so either boss can mount it.
    meta = json.loads((HERE / 'out' / 'sheets' / 'mortar.json').read_text())
    for key in ('fortressMortar-1', 'fortressMortar-0'):
        shutil.copy(HERE / 'out' / 'painted' / f'{key}.png', out / f'{key}.png')
    for v in (fortress, crawler):
        v['turrets'] = {**v['turrets'], 'fortressMortar': {'size': 144, 'muzzle': meta['muzzle']}}
        v['files'] = {**v['files'], 'fortressMortar-1': 'vehicles/fortressMortar-1.png', 'fortressMortar-0': 'vehicles/fortressMortar-0.png'}
    manifest['vehicles']['sandCrawler'] = crawler
    print('  vehicle sandCrawler', list(files))


def install_storm(manifest: dict) -> None:
    (DEST / 'fx').mkdir(exist_ok=True)
    shutil.copy(HERE / 'out' / 'sandstorm.png', DEST / 'fx' / 'sandstorm.png')
    manifest.setdefault('overlays', {})['sandstorm'] = {'file': 'fx/sandstorm.png', 'size': 512, 'tile': True,
                                                        'note': 'straight-alpha haze; tile it over the view, drift it (say +40, +12 px/s) and fade it in during a storm'}
    print('  overlay sandstorm')


def install() -> None:
    manifest = json.loads((DEST / 'manifest.json').read_text())
    install_structures(manifest)
    install_grounds(manifest)
    install_crawler(manifest)
    install_storm(manifest)
    (DEST / 'manifest.json').write_text(json.dumps(manifest, indent=1))
    print('manifest:', len(manifest['structures']), 'structures,', len(manifest['ground']), 'grounds')


if __name__ == '__main__':
    {'crawler-cut': crawler_cut, 'mortar-cut': mortar_cut, 'tent-cut': tent_cut, 'storm': storm, 'grounds': grounds, 'install': install}[sys.argv[1]]()
