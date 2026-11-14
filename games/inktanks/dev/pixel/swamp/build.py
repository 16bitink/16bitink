"""Installs the Mirefen (chapter 3) art: structures, grounds, decals, the Ironclad, the fog overlay and the flame effects.

  python3 dev/pixel/swamp/build.py flag           world/paint/swamp/flagWeasel.png -> the painted flagWeasel-1 (cloth only)
  python3 dev/pixel/swamp/build.py walk           boardwalk-1's deck from boardwalkV-1's paint, turned (see walk())
  python3 dev/pixel/swamp/build.py grounds        world/paint/ground/raw-<name>.png -> <name>.png, seamless 384 tiles (quilted)
  python3 dev/pixel/swamp/build.py fog            paint/raw-fog.png -> out/fog.png (seamless, alpha)
  python3 dev/pixel/swamp/build.py ironclad-cut   paint/ironclad.png -> out/painted/ironclad-*.png (+ wheels f2)
  python3 dev/pixel/swamp/build.py fx             fx/<vfx export>.png grids -> out/fx/flamer.png, burningReeds.png (strips)
  python3 dev/pixel/swamp/build.py install        copies everything into src/art/pixel/world and adds it to manifest.json

The whole batch, from scratch (PixelLab steps marked *):
  1. Structures: models in dev/pixel/world/swamp.py, then (in dev/pixel/world)
       python3 build.py --only=<SWAMP names> --view
       python3 -c "import sheets; sheets.GAP=4; sheets.pack('swamp', *SWAMP)"
     * edit_image on out/sheets/swamp/sheet-0.png, 512, transparent, seed 3101, prompt STRUCTURE_PROMPT -> paint/swamp/sheet-0.png
       python3 sheets.py cut swamp; python3 sheets.py unify stiltHutSmall stiltHutLarge sluiceDam
     * flagWeasel: edit_image on src/.../structures/flagCrow-1.png (99 x 140, seed 3501, FLAG_PROMPT) -> world/paint/swamp/flagWeasel.png;
       then `flag`. The sheet's own flag lost its mark; the pole and cairn are the same model, so the Crow flag's paint fits.
     lockGate (follow-up): build.py --only=lockGate; pack 'swamp2' with sheets.GAP=4, sheets.SIZE=256; * edit_image 256,
       transparent, seed 3102, reference = the painted sluiceDam-2 -> paint/swamp2/sheet-0.png; sheets.py cut swamp2.
     `walk`: the sheet painted boardwalk (east-west) like a palisade; its deck is flat (z 0), so boardwalkV's deck turned is exact.
  2. Ironclad: python3 dev/pixel/swamp/ironclad.py (its rings moved to level 30's turret offsets later: dev/pixel/swamp/rings.py,
     prep, * edit_image 256 seed 3602, merge; re-running ironclad-cut would undo that, so don't)
     * edit_image on out/sheets/ironclad.png, 512, transparent, seed 3601 -> paint/ironclad.png; then ironclad-cut (drops the
       paint's pure-white ghost, rolls the wheels' blades half a step for frame 2).
  3. Grounds: * edit_image 512 opaque on chapter 1's own ground (seamless, the approved style) -> world/paint/ground/raw-<name>.png:
     marsh = grass.png made wet marsh (seed 3216), shallows = mud.png flooded with reeds (seed 3215), swampWater = water.png
     made murky olive (seed 3214). Then `grounds`: marsh and shallows quilted to 384; swampWater built by water_tile() from its
     clean band (the generator's flat rectangles sit in its lower middle, as in chapter 1's water). Earlier create_image_pro
     tries are kept as raw-*-a / -b / -d (blocky patches, or read as mud / grass).
  4. Fog: * create_image_pro 512 opaque, seed 3221 (pale mist on black) -> paint/raw-fog.png; then fog.
  5. Decals: * create_image_pro 48 x 48 transparent (25 candidates each): lily pads seed 3231 -> world/paint/decals/lily-<n>.png,
     duckweed seed 3232 -> world/paint/decals/weed-<n>.png; picks in DECALS.
  6. Effects: PixelLab vfx_workbench (free): flame_jet x1.4 sparks 0.8 (My effects "InkTanks flamer jet"), fire_wall x0.72
     ("InkTanks burning reeds"), dust_trail + speed_lines in foam colours x1.6 ("InkTanks water wake"); their spritesheets in fx/;
     then `fx`.
  7. install. It only adds to manifest.json, so run it again after dev/pixel/world/install.py, which rewrites the manifest
     from the chapter 1 set alone (and after dev/pixel/concrete and desert installs; order among those three doesn't matter).

PixelLab paints colour only; every piece keeps its model's outline, footprint and shadow.
"""
from __future__ import annotations

import importlib.util
import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
WORLD_DEV = HERE.parent / 'world'
sys.path.insert(0, str(WORLD_DEV))
from install import edge_mask  # noqa: E402  (dev/pixel/world/install.py)
from sheets import match  # noqa: E402

_spec = importlib.util.spec_from_file_location('desert_build', HERE.parent / 'desert' / 'build.py')
desert_build = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(desert_build)
quilt = desert_build.quilt

DEST = HERE.parents[2] / 'src' / 'art' / 'pixel' / 'world'
RENDER = WORLD_DEV / 'out' / 'render'
PAINTED = WORLD_DEV / 'out' / 'painted'
SWAMP = ['stiltHutSmall', 'stiltHutLarge', 'reeds', 'deadTree', 'cypress', 'boardwalk', 'boardwalkV', 'jetty', 'walkRailN', 'walkRailS',
         'walkRailE', 'walkRailW', 'mooringPost', 'fishRack', 'sluiceDam', 'flagWeasel', 'lockGate']
# Drawn under everything, as the bridge deck: tanks drive over them.
LAYER_GROUND = {'boardwalk', 'boardwalkV', 'jetty'}
# name: (source in world/paint/ground, order: higher draws over lower at an edge; water 0, mud 1, grass 6)
GROUNDS = {'swampWater': ('swampWater.png', 0.3), 'shallows': ('shallows.png', 0.7), 'marsh': ('marsh.png', 5.5)}
# Decals: candidates picked by eye from world/paint/decals/<prefix>-<n>.png.
DECALS = {'lily': ('lily', [0, 1, 2, 3, 4, 7, 13, 16, 21, 24]), 'duckweed': ('weed', [0, 2, 3, 4, 7, 9, 12, 16, 18, 20])}
WHEEL_STEP = 15  # px between paddle blades at the top of the wheel (ironclad.py: 16 blades, radius 38)
FOG_ALPHA = (0, 200)   # alpha of the mist's thinnest and thickest parts (curve FOG_GAMMA between)
FOG_GAMMA = 1.3
FOG_TINT = np.array([206, 214, 196])
STRUCTURE_PROMPT = ('Turn this 3D render of separate swamp-village structures into masterful, richly detailed painterly pixel art for a '
                    'top-down tank game. Every object stays exactly where it is, with exactly the same silhouette, size, angle, and the '
                    'same light and shadow; add nothing new; transparent stays transparent, with no ground. Weathered grey-brown '
                    'driftwood planks with dark gaps and wet mossy feet on the piles; steep reed-thatch roofs in bundled golden-olive '
                    'straw; reed clumps with brown cattails; a pale bleached dead tree; a bald cypress with flat feathery green shelves '
                    'and hanging grey moss; a stone and log sluice dam with an iron windlass and murky green water jetting white foam; '
                    'rope rails; fishing nets; a mustard yellow flag. Broken parts show splintered wood and fallen thatch. Crisp dark '
                    'outline, warm sunlight from the top left.')
FLAG_PROMPT = ("Recolour only the flag cloth: a bright mustard-gold banner (the Weasel clan's colour) with a dark brown weasel-claw mark "
               'of three slashes across its middle, painted folds and highlights. The pole, gold ball, stone cairn, outline, size and '
               'position stay exactly the same; transparent stays transparent.')
FX = {'flamer': ('inktanks-flamer-jet', 'a jet pointing right (+x), nozzle at the anchor; rotate it to the gun, stretch along x to the range'),
      'burningReeds': ('inktanks-burning-reeds', 'flames standing on the ground; anchor = their foot; play over a burning reeds clump'),
      'wake': ('inktanks-water-wake', 'foam churn at the anchor, wake streaks trailing to -x; anchor at the stern or a paddle wheel, rotate so -x points astern')}


def flag() -> None:
    """flagWeasel-1: the Crow flag's paint recoloured by PixelLab, on the flagWeasel model's outline (same model, same canvas)."""
    src = np.array(Image.open(RENDER / 'flagWeasel' / 'flagWeasel-1.png').convert('RGBA'))
    art = np.array(Image.open(WORLD_DEV / 'paint' / 'swamp' / 'flagWeasel.png').convert('RGBA'))
    assert art.shape == src.shape, (art.shape, src.shape)
    rgb = np.where(art[..., 3:] > 0, art[..., :3], src[..., :3])
    out = PAINTED / 'flagWeasel'
    out.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.dstack([rgb, src[..., 3]]).astype(np.uint8)).save(out / 'flagWeasel-1.png')
    print('  flagWeasel-1 from the recoloured Crow flag')


def walk() -> None:
    """boardwalk-1's deck (ground x, y within the walk) from boardwalkV-1's painted deck: H(x, y) = V(-y, x), since boardwalkV
    is boardwalk turned a quarter (farm.rotate) and a deck at z 0 projects straight down. The piles below keep their own paint."""
    meta = json.loads((RENDER / 'structures.json').read_text())
    h, v = meta['boardwalk'], meta['boardwalkV']
    hx, hy = h['anchor']
    vx, vy = v['anchor']
    H = np.array(Image.open(PAINTED / 'boardwalk' / 'boardwalk-1.png').convert('RGBA'))
    V = np.array(Image.open(PAINTED / 'boardwalkV' / 'boardwalkV-1.png').convert('RGBA'))
    model = np.array(Image.open(RENDER / 'boardwalk' / 'boardwalk-1.png').convert('RGBA'))
    n = 0
    for py in range(H.shape[0]):
        y = py - hy
        if not -18 <= y < 18:
            continue
        for px in range(H.shape[1]):
            x = px - hx
            if model[py, px, 3] == 0:
                continue
            qx, qy = vx - y - 1, vy + x
            if 0 <= qx < V.shape[1] and 0 <= qy < V.shape[0] and V[qy, qx, 3] > 0:
                H[py, px, :3] = V[qy, qx, :3]
                n += 1
    Image.fromarray(H).save(PAINTED / 'boardwalk' / 'boardwalk-1.png')
    print('  boardwalk-1 deck from boardwalkV:', n, 'px')


def seam_rows(top: np.ndarray, bottom: np.ndarray, overlap: int) -> np.ndarray:
    """`top` then `bottom`, overlapping `overlap` rows, joined along the cheapest left-to-right path (desert min_cut, turned)."""
    a, b = top[-overlap:].astype(float), bottom[:overlap].astype(float)
    err = np.abs(a - b).sum(axis=-1).T            # columns x overlap rows
    err[:, :4] += 1e6
    err[:, -4:] += 1e6
    cut = desert_build.min_cut(err)               # per column: the first row taken from `bottom`
    join = a.copy()
    for x, c in enumerate(cut):
        join[c:, x] = b[c:, x]
    return np.concatenate([top[:-overlap], join.astype(top.dtype), bottom[overlap:]], axis=0)


def water_tile(src: Path, dest: Path) -> None:
    """PixelLab's swamp water (and chapter 1's water it was edited from) has flat, darker rectangles in its lower middle, a
    seam of the generator's own tiling. Its band from row 410 round to row 90 (the image wraps) is clean, so the tile is three
    160-row strips of that band, each shifted sideways, stacked along min-cut seams, then quilted to wrap both ways (384)."""
    a = np.array(Image.open(src).convert('RGB'))
    band = np.roll(a, -410, axis=0)[:192]
    strips = [np.roll(band, k * 170, axis=1)[16:176] for k in range(3)]
    t = strips[0]
    for s in strips[1:]:
        t = seam_rows(t, s, 32)
    t = desert_build.quilt_x(t, 128)
    t = desert_build.quilt_x(t.transpose(1, 0, 2), t.shape[0] - 384).transpose(1, 0, 2)
    Image.fromarray(t).save(dest)
    print('water tile', src.name, '->', dest.name, t.shape[:2])


def grounds() -> None:
    g = WORLD_DEV / 'paint' / 'ground'
    for name in GROUNDS:
        if name == 'swampWater':
            water_tile(g / 'raw-swampWater.png', g / 'swampWater.png')
        else:
            quilt(g / f'raw-{name}.png', g / f'{name}.png')


def fog() -> None:
    """PixelLab's mist made seamless (rolled by half, its old edges crossfaded away) and turned into a see-through overlay:
    the mist's brightness becomes its alpha, its colour a pale grey-green."""
    a = np.array(Image.open(HERE / 'paint' / 'raw-fog.png').convert('RGB')).astype(float)
    n = a.shape[0]
    rolled = np.roll(np.roll(a, n // 2, axis=0), n // 2, axis=1)
    t = np.abs(np.arange(n) - (n - 1) / 2) / (n / 2)
    wx = np.clip((1 - t) / 0.35, 0, 1)
    w = np.minimum(wx[None, :], wx[:, None])[..., None]
    w = w * w * (3 - 2 * w)
    seamless = a * w + rolled * (1 - w)
    lum = seamless.mean(axis=-1)
    lo, hi = np.percentile(lum, 4), np.percentile(lum, 99.5)
    f = np.clip((lum - lo) / (hi - lo), 0, 1)
    alpha = FOG_ALPHA[0] + (FOG_ALPHA[1] - FOG_ALPHA[0]) * f ** FOG_GAMMA
    tint = seamless * 0.35 + FOG_TINT * 0.65
    (HERE / 'out').mkdir(exist_ok=True)
    Image.fromarray(np.dstack([np.clip(tint, 0, 255), alpha]).astype(np.uint8)).save(HERE / 'out' / 'fog.png')
    print('fog', n, 'alpha', FOG_ALPHA, 'mean', round(float(alpha.mean()), 1))


def ironclad_cut() -> None:
    place = json.loads((HERE / 'out' / 'sheets' / 'ironclad.json').read_text())
    art = np.array(Image.open(HERE / 'paint' / 'ironclad.png').convert('RGBA'))
    # PixelLab left an opaque pure-white ghost round the wheels (the empty middle of the sheet): not paint.
    art[art[..., :3].min(axis=-1) >= 250, 3] = 0
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
    # Frame 2 of the wheels: frame 1's paint with its blades slid half a blade step towards the bow, column by column inside
    # each run (dev/pixel/rollframes.py's roll). The model's frame difference muddied the paint here (blades, not tread links).
    sys.path.insert(0, str(HERE.parent))
    import rollframes  # noqa: E402
    a = np.array(Image.open(out / 'ironclad-wheels.png').convert('RGBA'))
    runs = rollframes.tread_runs(a, None)
    Image.fromarray(rollframes.rolled(a, runs, WHEEL_STEP, WHEEL_STEP // 2)).save(out / 'ironclad-wheels-f2.png')
    print('  ironclad-wheels-f2 rolled', WHEEL_STEP // 2, 'px over', len(runs), 'columns')


def fx() -> None:
    """The vfx exports are grids; the game wants one horizontal strip per effect (frame size in the manifest)."""
    out = HERE / 'out' / 'fx'
    out.mkdir(parents=True, exist_ok=True)
    meta = {}
    for name, (src, note) in FX.items():
        info = json.loads((HERE / 'fx' / f'{src}.json').read_text())
        sheet = Image.open(HERE / 'fx' / f'{src}.png').convert('RGBA')
        frames = info['frames']
        w, h = frames[0]['frame']['w'], frames[0]['frame']['h']
        strip = Image.new('RGBA', (w * len(frames), h))
        for i, f in enumerate(frames):
            r = f['frame']
            strip.alpha_composite(sheet.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])), (i * w, 0))
        strip.save(out / f'{name}.png')
        piv = frames[0]['pivot']
        meta[name] = {'file': f'fx/{name}.png', 'frame': [w, h], 'frames': len(frames), 'fps': round(1000 / frames[0]['duration']),
                      'anchor': [round(piv['x'] * w), round(piv['y'] * h)], 'loop': True, 'note': note}
        print(' ', name, meta[name])
    (out / 'fx.json').write_text(json.dumps(meta, indent=1))


def install_structures(manifest: dict) -> None:
    out = DEST / 'structures'
    meta = json.loads((RENDER / 'structures.json').read_text())
    for name in SWAMP:
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
            'layer': 'ground' if name in LAYER_GROUND else 'structure', 'anchor': m['anchor'], 'size': m['size'], 'states': m['states'],
            'hp': m['hp'], 'height': m['height'], 'flattenable': m['flattenable'], 'cover': m['cover'], 'footprint': m['footprint'],
            'roofFade': m['roofFade'], 'pieces': pieces, 'shadows': {str(st): f'structures/{name}-{st}-shadow.png' for st in m['states']},
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
        im.save(out / f'{name}.png')
        Image.fromarray(edge_mask(np.array(im))).save(out / f'{name}-edge.png')
        manifest['ground'][name] = {'file': f'ground/{name}.png', 'edge': f'ground/{name}-edge.png', 'size': im.width, 'order': order}
        print('  ground', name, 'order', order)


def install_decals(manifest: dict) -> None:
    out = DEST / 'decals'
    for kind, (prefix, picks) in DECALS.items():
        keys = []
        for i, n in enumerate(picks):
            p = WORLD_DEV / 'paint' / 'decals' / f'{prefix}-{n}.png'
            if not p.exists():
                continue
            a = np.array(Image.open(p).convert('RGBA'))
            a[a[..., 3] < 40] = 0
            im = Image.fromarray(a)
            im = im.crop(im.getbbox())
            key = f'{kind}{i + 1}'
            im.save(out / f'{key}.png')
            keys.append({'key': key, 'file': f'decals/{key}.png', 'size': [im.width, im.height]})
        manifest['decals'][kind] = keys
        print('  decals', kind, len(keys))


def install_ironclad(manifest: dict) -> None:
    out = DEST / 'vehicles'
    files = {}
    for key in ('ironclad-body', 'ironclad-wheels', 'ironclad-wheels-f2'):
        shutil.copy(HERE / 'out' / 'painted' / f'{key}.png', out / f'{key}.png')
        files[key] = f'vehicles/{key}.png'
    fortress = manifest['vehicles']['fortress']
    # The Boar fortress's turrets sit on the ironclad's rings: same mounts, same turret art. 'treads' are its paddle wheels.
    manifest['vehicles']['ironclad'] = {
        'size': 288, 'body': 'ironclad-body', 'treads': ['ironclad-wheels', 'ironclad-wheels-f2'], 'mounts': fortress['mounts'],
        'turrets': fortress['turrets'], 'facing': 'north',
        'files': {**files, **{k: v for k, v in fortress['files'].items() if 'fortress-' not in k}},
        'note': 'a boat: the treads frames are its paddle wheels; draw them under the body and cycle them while it moves'}
    print('  vehicle ironclad', list(files))


def install_overlays_fx(manifest: dict) -> None:
    (DEST / 'fx').mkdir(exist_ok=True)
    shutil.copy(HERE / 'out' / 'fog.png', DEST / 'fx' / 'fog.png')
    manifest.setdefault('overlays', {})['fog'] = {
        'file': 'fx/fog.png', 'size': 512, 'tile': True,
        'note': 'straight-alpha swamp mist; tile it over a fog bank (mask it to the bank, soft edge), drift it slowly (say +10, +3 px/s)'}
    meta = json.loads((HERE / 'out' / 'fx' / 'fx.json').read_text())
    for name, m in meta.items():
        shutil.copy(HERE / 'out' / 'fx' / f'{name}.png', DEST / 'fx' / f'{name}.png')
    manifest.setdefault('effects', {}).update(meta)
    print('  overlay fog; effects', list(meta))


def install() -> None:
    manifest = json.loads((DEST / 'manifest.json').read_text())
    install_structures(manifest)
    install_grounds(manifest)
    install_decals(manifest)
    install_ironclad(manifest)
    install_overlays_fx(manifest)
    (DEST / 'manifest.json').write_text(json.dumps(manifest, indent=1))
    print('manifest:', len(manifest['structures']), 'structures,', len(manifest['ground']), 'grounds')


if __name__ == '__main__':
    {'flag': flag, 'walk': walk, 'grounds': grounds, 'fog': fog, 'ironclad-cut': ironclad_cut, 'fx': fx, 'install': install}[sys.argv[1]]()
