"""Installs the Frostridge (chapter 4) art: structures, grounds, decals, the Rail-Gun Train, the blizzard overlay and the
laser / ice effects.

  python3 dev/pixel/snow/build.py fixups        floors (barn planks; the lab gets concrete) and the lab roof's snow (see fixups())
  python3 dev/pixel/snow/build.py grounds       world/paint/ground/raw-<name>.png -> <name>.png, seamless 384 tiles (quilted)
  python3 dev/pixel/snow/build.py blizzard      paint/raw-blizzard.png -> out/blizzard.png (seamless, alpha)
  python3 dev/pixel/snow/build.py train-cut     paint/train.png -> out/painted/train-*.png, fortressRail-*.png
  python3 dev/pixel/snow/build.py fx            fx/<vfx export>.png grids -> out/fx/<name>.png (strips) + fx.json
  python3 dev/pixel/snow/build.py preview       a contact sheet of everything on the snow ground (scratch: out/preview.png)
  python3 dev/pixel/snow/build.py install       copies everything into src/art/pixel/world and adds it to manifest.json

The whole batch, from scratch (PixelLab steps marked *):
  1. Structures: models in dev/pixel/world/snow.py, then (in dev/pixel/world)
       python3 build.py --only=<SNOW names> --view
       python3 -c "import sheets; sheets.GAP=4; sheets.pack('snow', *SNOW)"          (2 sheets)
     * edit_image on out/sheets/snow/sheet-0.png and sheet-1.png, 512, transparent, seeds 4101 / 4102, prompts STRUCTURE_PROMPT[0/1]
       -> paint/snow/sheet-N.png
       python3 sheets.py cut snow; python3 sheets.py unify <the 2/1/0 names>; then `fixups`.
     The cornice came later on its own sheet: pack 'snow2' cornice with sheets.GAP=4, sheets.SIZE=256; * edit_image 256, seed 4103
       -> paint/snow2/sheet-0.png; sheets.py cut snow2. It shares ridgeEdge's origin: place it at a ridgeEdge run's position.
  2. Train: python3 dev/pixel/snow/train.py
     * edit_image on out/sheets/train.png, 512, transparent, seed 4301, TRAIN_PROMPT -> paint/train.png; then train-cut
       (both wheel frames are on the sheet, painted together, so frame 2 needs no roll).
  3. Grounds: * edit_image 512 opaque on earlier grounds -> world/paint/ground/raw-<name>.png: snow = raw-sand made deep snow
     (seed 4201), snowTrack = raw-sandTrack made a packed snow road (4202), frozenDirt = raw-dirt frozen (4203; its bands are chapter
     1's dirt's own). snow is made seamless by dev/pixel/world/seam.py (prep snow 0.6, * inpaint_image of the cross, seed 4209 ->
     seam-snow-1.png; the inpaint kept a straight line down the top half, so its 256 crop at (128, 0) under a fix_mask('v') band was
     * inpainted again, seed 4213, out/seam/snow-fix.png, and pasted back -> seam-snow.png; `seamfix-prep` / `seamfix-apply`
     do the same for any tile). ice = seam-snow made pale lake ice (4212)
     then made glassy (4216; raw-ice-e is the step between); thinIce = ice made thin, dark and cracked (4217). Then `grounds`
     (min-cut quilts to 384; snow stays the 512 seam tile). Discarded tries: raw-*-b (create_image_pro with a style image: the
     style's stripes and blocks came along), raw-ice-a (chapter 1's water edited: read as water), raw-ice-c/-d and raw-thinIce-a
     (edited from the first seam-snow, whose leftover seam line came along).
  4. Blizzard: * create_image_pro 512 opaque, seed 4211 (driving snow on black) -> paint/raw-blizzard.png; then blizzard.
  5. Decals: * create_image_pro 48 x 48 transparent (25 candidates each): snow tufts seed 4231 -> world/paint/decals/snowtuft-<n>.png,
     tracks in snow seed 4232 -> world/paint/decals/snowtrack-<n>.png, ice cracks seed 4234 -> world/paint/decals/icecrackb-<n>.png (4233's
     icecrack-<n> came out as star bursts, read as snowflakes);
     picks in DECALS.
  6. Effects: PixelLab vfx_workbench (free), spritesheets in fx/; then `fx`.
  7. install. It only adds to manifest.json, so run it again after dev/pixel/world/install.py (which rewrites the manifest from the
     chapter 1 set alone) and after the concrete, desert and swamp installs (order among those doesn't matter).

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


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


desert_build = _load('desert_build', HERE.parent / 'desert' / 'build.py')
swamp_build = _load('swamp_build', HERE.parent / 'swamp' / 'build.py')
quilt = desert_build.quilt

DEST = HERE.parents[2] / 'src' / 'art' / 'pixel' / 'world'
RENDER = WORLD_DEV / 'out' / 'render'
PAINTED = WORLD_DEV / 'out' / 'painted'
GROUND_DIR = WORLD_DEV / 'paint' / 'ground'
SNOW = ['snowPine', 'firSmall', 'cabinSmall', 'cabinLarge', 'snowdriftH', 'snowdriftV', 'iceRockA', 'iceRockB', 'iceRockC', 'ridgeEdge',
        'ridgeEdgeV', 'ridgeCorner', 'frozenFenceH', 'frozenFenceV', 'generator', 'labBuilding', 'signalMast', 'railSnowH', 'railSnowV',
        'signalBox', 'cornice']
# Drawn under everything, as the bridge deck and chapter 1's rail track: tanks drive over them.
LAYER_GROUND = {'railSnowH', 'railSnowV'}
# name: (source in world/paint/ground, order: higher draws over lower at an edge; water 0, sand 2, dirt 3, grass 6)
GROUNDS = {'ice': ('ice.png', 0.4), 'thinIce': ('thinIce.png', 0.5), 'frozenDirt': ('frozenDirt.png', 3.2), 'snow': ('snow.png', 4.5),
           'snowTrack': ('snowTrack.png', 4.8), 'snowTrackH': ('snowTrack.png', 4.8)}
# Decals: candidates picked by eye from world/paint/decals/<prefix>-<n>.png.
DECALS: dict[str, tuple[str, list[int]]] = {
    'snowTuft': ('snowtuft', [0, 3, 6, 8, 9, 10, 13, 14, 19, 20]),
    'snowPrints': ('snowtrack', [0, 1, 2, 3, 4, 5, 6, 7, 8, 20]),
    'snowRuts': ('snowtrack', [9, 11, 13, 15, 16, 18, 19]),
    'iceCrack': ('icecrackb', [0, 1, 3, 5, 6, 9, 13, 15, 17, 23]),
}
BLIZZARD_ALPHA = (0, 225)
BLIZZARD_GAMMA = 1.6
BLIZZARD_TINT = np.array([236, 242, 250])
FX: dict[str, tuple[str, str, bool]] = {
    'laserBeam': ('inktanks-laser-beam', 'an instant beam strip pointing right (+x), even along x: stretch (or tile) it along x from the '
                  'muzzle to the hit, rotate it to the shot; anchor = its centre line; flicker through the frames while it shows', True),
    'laserHit': ('inktanks-laser-hit', 'one-shot spark where a beam hits; anchor = the hit point', False),
    'iceBreak': ('inktanks-ice-break', 'one-shot: cracks race out, the ice shatters and the water splashes; anchor = the middle of the '
                 'hole; play when thin ice gives way under a Heavy (then show the hole / water ground there)', False),
}
STRUCTURE_PROMPT = (
    'Turn this 3D render of separate snowy northern structures into masterful, richly detailed painterly pixel art for a top-down '
    'tank game. Every object stays exactly where it is, with exactly the same silhouette, size, angle, and the same light and shadow; '
    'add nothing new; transparent stays transparent, with no ground. Deep soft snow in clean white with cool blue-grey shadows on roofs, '
    'ledges and drifts; dark green pines {firs}under heavy snow; round brown log-cabin walls with pale cut log ends; {rest} Crisp dark '
    'outline, cold sunlight from the top left.')
TRAIN_PROMPT = (
    'Turn this 3D render into masterful painterly pixel art for a top-down tank game, seen straight from above: an armoured war train '
    '(a riveted gunmetal-grey armoured locomotive with a steel snow plough, a squat sooty smokestack and a yellow headlamp, coupled to '
    'an armoured gun car with glowing cyan capacitor cells), separate rows of black iron train wheels with steel rims and red coupling '
    'rods, and a rail-gun turret with two long steel rails and glowing cyan field coils, plus its wrecked, scorched version. Every part '
    'stays exactly where it is with exactly the same silhouette, size and light; add nothing new; transparent stays transparent. Worn '
    'frosty paint, rust streaks, rivets, red warning stripes, snow drifted in the corners. Crisp dark outline, cold sunlight from the '
    'top left.')


def floor_pass(name: str, source: np.ndarray) -> None:
    """A building's visible floor takes `source` (a painted texture), lit as the model lights it (sheets.floors, any texture):
    PixelLab paints a roof over an empty floor, which would show when the roof fades."""
    meta = json.loads((RENDER / 'structures.json').read_text())
    for key in meta[name]['pieces']:
        fm = RENDER / name / f'{key}-floor.png'
        if not fm.exists():
            continue
        mask = np.array(Image.open(fm)) > 0
        ren = np.array(Image.open(RENDER / name / f'{key}.png').convert('RGB')).astype(float).mean(axis=-1)
        path = PAINTED / name / f'{key}.png'
        art = np.array(Image.open(path).convert('RGBA')).astype(float)
        ys, xs = np.nonzero(mask)
        light = ren[ys, xs] / max(1.0, float(np.median(ren[ys, xs])))
        tex = source[ys % source.shape[0], xs % source.shape[1]]
        art[ys, xs, :3] = np.clip(tex * light[:, None] ** 0.8, 0, 255)
        Image.fromarray(art.astype(np.uint8)).save(path)
        print('  floor', key, len(ys), 'px')


def snow_roof(name: str) -> None:
    """The lab's flat roof: the sheet painted its snow tiles as a checkerboard. Its snow pixels (the model's pale blue snow tone)
    take the painted snow ground instead, lit as the model lights them; vents, dish and beacon keep their paint."""
    snow = np.array(Image.open(GROUND_DIR / 'snow.png').convert('RGB')).astype(float)
    meta = json.loads((RENDER / 'structures.json').read_text())
    for key in meta[name]['pieces']:
        if not key.endswith('-roof'):
            continue
        ren = np.array(Image.open(RENDER / name / f'{key}.png').convert('RGBA')).astype(float)
        r, g, b, a = ren[..., 0], ren[..., 1], ren[..., 2], ren[..., 3]
        lum = ren[..., :3].mean(axis=-1)
        mask = (a > 0) & (b - r > 10) & (lum > 120)
        path = PAINTED / name / f'{key}.png'
        art = np.array(Image.open(path).convert('RGBA')).astype(float)
        ys, xs = np.nonzero(mask)
        # The flat roof's tiles vary in tone on purpose (that is what painted as a checkerboard): flat light there; only the snow
        # caps on the vents (lit a good deal brighter or darker than the roof) keep the model's light.
        light = lum[ys, xs] / max(1.0, float(np.median(lum[ys, xs])))
        light = np.where(np.abs(light - 1) < 0.12, 1.0, light)
        tex = snow[ys % snow.shape[0], xs % snow.shape[1]]
        art[ys, xs, :3] = np.clip(tex * light[:, None] ** 0.6, 0, 255)
        Image.fromarray(art.astype(np.uint8)).save(path)
        print('  snow roof', key, len(ys), 'px')


def fixups() -> None:
    planks = np.array(Image.open(PAINTED / 'barn' / 'barn-2.png').convert('RGBA')).astype(float)
    ax, ay = json.loads((RENDER / 'structures.json').read_text())['barn']['anchor']
    planks = planks[ay - 20:ay + 44, ax - 70:ax + 10, :3]
    concrete = np.array(Image.open(GROUND_DIR / 'concrete.png').convert('RGB')).astype(float)
    for name in ('cabinSmall', 'cabinLarge', 'signalBox'):
        floor_pass(name, planks)
    floor_pass('labBuilding', concrete)
    snow_roof('labBuilding')


def grounds() -> None:
    """snow: the seam.py tile (raw-snow rolled, its cross inpainted by PixelLab, seed 4209: the drifts are long diagonal ripples,
    which a min-cut quilt breaks into visible wedges). The rest are min-cut quilts of their own painting (384 tiles)."""
    g = GROUND_DIR
    shutil.copy(g / 'seam-snow.png', g / 'snow.png')
    for name in ('snowTrack', 'frozenDirt', 'ice', 'thinIce'):
        if (g / f'raw-{name}.png').exists():
            quilt(g / f'raw-{name}.png', g / f'{name}.png')


# The seam.py cross leaves a straight line where the inpaint kept the old edge: vertical through the tile's top half, horizontal
# through its left half (the same spot in every tile edited from seam-snow v1). Each is fixed by one 256 inpaint (10 generations)
# of a wobbly band down its middle: crop at FIX_CROPS[k], mask from fix_mask(k).
FIX_CROPS = {'v': (128, 0), 'h': (0, 128)}
FIX_DIR = WORLD_DEV / 'out' / 'seam'


def fix_mask(k: str) -> np.ndarray:
    ys, xs = np.mgrid[0:256, 0:256]
    if k == 'h':
        xs, ys = ys, xs
    w = 14 + 5 * np.sin(ys * 0.05) + 3 * np.sin(ys * 0.13 + 1)
    return np.abs(xs - 128 - 5 * np.sin(ys * 0.03 + 2)) < w


def seamfix_prep(src: str) -> None:
    """world/paint/ground/<src>.png -> out/seam/<src>-fix-<k>.png crops + masks, to inpaint (* inpaint_image 256, prompt: the
    ground continuing smoothly, no straight lines)."""
    a = Image.open(GROUND_DIR / f'{src}.png').convert('RGB')
    for k, (x, y) in FIX_CROPS.items():
        a.crop((x, y, x + 256, y + 256)).save(FIX_DIR / f'{src}-fix-{k}.png')
        Image.fromarray((fix_mask(k) * 255).astype(np.uint8)).save(FIX_DIR / f'{src}-fix-{k}-mask.png')


def seamfix_apply(name: str) -> None:
    """Pastes the inpainted crops (out/seam/<name>-fixed-<k>.png) onto world/paint/ground/<name>-unfixed.png (kept from the first
    run) and writes <name>.png."""
    g = GROUND_DIR
    if not (g / f'{name}-unfixed.png').exists():
        shutil.copy(g / f'{name}.png', g / f'{name}-unfixed.png')
    a = Image.open(g / f'{name}-unfixed.png').convert('RGB')
    for k, (x, y) in FIX_CROPS.items():
        p = FIX_DIR / f'{name}-fixed-{k}.png'
        if p.exists():
            a.paste(Image.open(p).convert('RGB'), (x, y))
    a.save(g / f'{name}.png')
    print('seam fixed', name)


def blizzard() -> None:
    """PixelLab's driving snow made seamless (rolled by half, its old edges crossfaded away) and turned into a see-through overlay:
    the flakes' brightness becomes their alpha, their colour a cold white."""
    a = np.array(Image.open(HERE / 'paint' / 'raw-blizzard.png').convert('RGB')).astype(float)
    n = a.shape[0]
    rolled = np.roll(np.roll(a, n // 2, axis=0), n // 2, axis=1)
    t = np.abs(np.arange(n) - (n - 1) / 2) / (n / 2)
    wx = np.clip((1 - t) / 0.35, 0, 1)
    w = np.minimum(wx[None, :], wx[:, None])[..., None]
    w = w * w * (3 - 2 * w)
    seamless = a * w + rolled * (1 - w)
    lum = seamless.mean(axis=-1)
    lo, hi = np.percentile(lum, 5), np.percentile(lum, 99.6)
    f = np.clip((lum - lo) / (hi - lo), 0, 1)
    alpha = BLIZZARD_ALPHA[0] + (BLIZZARD_ALPHA[1] - BLIZZARD_ALPHA[0]) * f ** BLIZZARD_GAMMA
    tint = seamless * 0.3 + BLIZZARD_TINT * 0.7
    (HERE / 'out').mkdir(exist_ok=True)
    Image.fromarray(np.dstack([np.clip(tint, 0, 255), alpha]).astype(np.uint8)).save(HERE / 'out' / 'blizzard.png')
    print('blizzard', n, 'alpha', BLIZZARD_ALPHA, 'mean', round(float(alpha.mean()), 1))


def train_cut() -> None:
    meta = json.loads((HERE / 'out' / 'sheets' / 'train.json').read_text())
    art = np.array(Image.open(HERE / 'paint' / 'train.png').convert('RGBA'))
    out = HERE / 'out' / 'painted'
    out.mkdir(parents=True, exist_ok=True)
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
        Image.fromarray(whole).save(out / f'{key}.png')
        print(f'  {key:20s} match {score:.3f} shift {dx:+d},{dy:+d}')


def fx() -> None:
    """The vfx exports are grids; the game wants one horizontal strip per effect (frame size in the manifest)."""
    out = HERE / 'out' / 'fx'
    out.mkdir(parents=True, exist_ok=True)
    meta = {}
    for name, (src, note, loop) in FX.items():
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
                      'anchor': [round(piv['x'] * w), round(piv['y'] * h)], 'loop': loop, 'note': note}
        print(' ', name, meta[name])
    (out / 'fx.json').write_text(json.dumps(meta, indent=1))


def preview() -> None:
    """Every structure state (shadow, body, front, roof) on the snow ground, the train and the grounds: out/preview.png."""
    meta = json.loads((RENDER / 'structures.json').read_text())
    snow = Image.open(GROUND_DIR / 'snow.png').convert('RGBA')
    W = 1600
    tiles, x, y, rowh = [], 0, 0, 0
    for name in SNOW:
        m = meta[name]
        for st in m['states']:
            w, h = m['size']
            if x + w > W:
                x, y, rowh = 0, y + rowh + 4, 0
            tiles.append((name, st, x, y))
            x += w + 4
            rowh = max(rowh, h)
    H = y + rowh + 4 + 400
    sheet = Image.new('RGBA', (W, H))
    for gx in range(0, W, snow.width):
        for gy in range(0, H, snow.height):
            sheet.alpha_composite(snow, (gx, gy))
    for name, st, x, y in tiles:
        for suffix in ('-shadow', '', '-front', '-roof'):
            p = (RENDER if suffix == '-shadow' else PAINTED) / name / f'{name}-{st}{suffix}.png'
            if p.exists():
                sheet.alpha_composite(Image.open(p).convert('RGBA'), (x, y))
    yb = y + rowh + 4
    g = 0
    for name in ('ice', 'thinIce', 'frozenDirt', 'snowTrack'):
        p = GROUND_DIR / f'{name}.png'
        if p.exists():
            sheet.paste(Image.open(p).convert('RGBA').crop((0, 0, 300, 400)), (g, yb))
            g += 304
    painted = HERE / 'out' / 'painted'
    if (painted / 'train-body.png').exists():
        sheet.alpha_composite(Image.open(painted / 'train-wheels.png'), (g, yb + 8))
        sheet.alpha_composite(Image.open(painted / 'train-body.png'), (g, yb + 8))
    sheet.save(HERE / 'out' / 'preview.png')
    print('preview', sheet.size)


def install_structures(manifest: dict) -> None:
    out = DEST / 'structures'
    meta = json.loads((RENDER / 'structures.json').read_text())
    for name in SNOW:
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
        p = GROUND_DIR / src
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


def install_train(manifest: dict) -> None:
    out = DEST / 'vehicles'
    painted = HERE / 'out' / 'painted'
    meta = json.loads((HERE / 'out' / 'sheets' / 'train.json').read_text())
    files = {}
    for key in ('train-body', 'train-wheels', 'train-wheels-f2', 'fortressRail-1', 'fortressRail-0'):
        shutil.copy(painted / f'{key}.png', out / f'{key}.png')
        files[key] = f'vehicles/{key}.png'
    fortress = manifest['vehicles']['fortress']
    turrets = {**fortress['turrets'], 'fortressRail': {'size': 144, 'muzzle': meta['muzzle']['fortressRail']}}
    mounts = {k: {'at': list(v), 'turret': meta['mountTurret'][k]} for k, v in meta['mounts'].items()}
    manifest['vehicles']['railTrain'] = {
        'size': 384, 'body': 'train-body', 'treads': ['train-wheels', 'train-wheels-f2'], 'mounts': mounts, 'turrets': turrets,
        'facing': 'north', 'files': {**{k: v for k, v in fortress['files'].items() if 'fortress-' not in k}, **files},
        'note': 'a 384 frame (a train is long; the other bosses are 288). treads = its wheels: draw under the body, swap the two '
                'frames while it moves (the coupling rods swing half a crank turn). Rings sit on the centre line (MOUNTS in '
                'dev/pixel/snow/train.py); fortressRail is the boss rail gun turret'}
    print('  vehicle railTrain', list(files))


def install_overlays_fx(manifest: dict) -> None:
    (DEST / 'fx').mkdir(exist_ok=True)
    if (HERE / 'out' / 'blizzard.png').exists():
        shutil.copy(HERE / 'out' / 'blizzard.png', DEST / 'fx' / 'blizzard.png')
        manifest.setdefault('overlays', {})['blizzard'] = {
            'file': 'fx/blizzard.png', 'size': 512, 'tile': True,
            'note': 'straight-alpha driving snow, its streaks running from upper right to lower left: tile it over the view in two '
                    'layers (one at 1x drifting fast along the streaks, say -200, +260 px/s, one scaled 2x, slower and fainter) and fade '
                    'it in during a blizzard'}
    fxj = HERE / 'out' / 'fx' / 'fx.json'
    if fxj.exists():
        meta = json.loads(fxj.read_text())
        for name in meta:
            shutil.copy(HERE / 'out' / 'fx' / f'{name}.png', DEST / 'fx' / f'{name}.png')
        manifest.setdefault('effects', {}).update(meta)
        print('  effects', list(meta))


def install() -> None:
    manifest = json.loads((DEST / 'manifest.json').read_text())
    install_structures(manifest)
    install_grounds(manifest)
    install_decals(manifest)
    install_train(manifest)
    install_overlays_fx(manifest)
    (DEST / 'manifest.json').write_text(json.dumps(manifest, indent=1))
    print('manifest:', len(manifest['structures']), 'structures,', len(manifest['ground']), 'grounds')


if __name__ == '__main__':
    if sys.argv[1] == 'seamfix-prep':
        seamfix_prep(sys.argv[2])
        sys.exit(0)
    if sys.argv[1] == 'seamfix-apply':
        seamfix_apply(sys.argv[2])
        sys.exit(0)
    {'fixups': fixups, 'grounds': grounds, 'blizzard': blizzard, 'train-cut': train_cut, 'fx': fx, 'preview': preview,
     'install': install}[sys.argv[1]]()
