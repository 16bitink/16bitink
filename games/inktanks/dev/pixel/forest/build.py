"""Installs the Deepwood (chapter 5) art: structures, grounds, decals, the Harvester, the forest light overlay and the fire effect.

  python3 dev/pixel/forest/build.py trim           canopies cut back to their painted outline (see trim())
  python3 dev/pixel/forest/build.py grounds        world/paint/ground/raw-<name>.png -> <name>.png, seamless 384 tiles (quilted)
  python3 dev/pixel/forest/build.py harvester-cut  paint/harvester.png -> out/painted/harvester-*.png
  python3 dev/pixel/forest/build.py fx             fx/<vfx export>.png grids -> out/fx/<name>.png (strips) + fx.json
  python3 dev/pixel/forest/build.py shafts         paint/raw-shafts.png -> out/shafts.png (seamless, alpha)
  python3 dev/pixel/forest/build.py preview        a contact sheet of everything on the forest floor (scratch: out/preview.png)
  python3 dev/pixel/forest/build.py install        copies everything into src/art/pixel/world and adds it to manifest.json

The whole batch, from scratch (PixelLab steps marked *):
  1. Structures: models in dev/pixel/world/forest.py, then (in dev/pixel/world)
       python3 build.py --only=<FOREST + HIVE names> --view
       python3 -c "import sheets; sheets.GAP=4; sheets.pack('forest', *FOREST); sheets.pack('hive', *HIVE)"
     The forest sheet only fills its top 208 rows: crop out/sheets/forest/sheet-0.png to 512 x 208 (a 21:9 canvas is 15
     generations, not 25).
     * edit_image on the forest crop, transparent, seed 5101, FOREST_PROMPT -> world/paint/forest/sheet-0.png
     * edit_image on out/sheets/hive/sheet-0.png, 512, transparent, seed 5102, HIVE_PROMPT -> world/paint/hive/sheet-0.png
       python3 sheets.py cut forest; python3 sheets.py cut hive; python3 sheets.py unify sawmill hiveTower logBridge logBridgeV
       then `trim` (the painted crowns of oldTree and youngTree came out a little smaller than the models').
     flagHive's cloth (black, an orange hexagon) painted right on the hive sheet, so it needs no flag pass.
  2. Harvester: python3 dev/pixel/forest/harvester.py
     * edit_image on out/sheets/harvester.png, 512, transparent, seed 5301, HARVESTER_PROMPT -> paint/harvester.png; then
       harvester-cut (both treads frames are on the sheet, painted together, so frame 2 needs no roll).
  3. Grounds: * edit_image 512 opaque on chapter 1/2 grounds (their approved style) -> world/paint/ground/raw-<name>.png:
     forestFloor = grass.png made leaf litter and moss (seed 5201), forestTrail = raw-sandTrack.png made a dirt trail through
     the forest floor (5202; its band runs north-south, forestTrailH is it turned), clearing = dirt.png made logged mud with
     sawdust and track marks (5203). Then `grounds` (see grounds(): forestFloor lifted and evened out, 448 quilts; clearing stays 512).
  4. Decals: * create_image_pro 48 x 48 transparent (25 candidates each): fallen leaves seed 5231 -> world/paint/decals/leaves-<n>.png,
     ferns seed 5232 -> ferns-<n>.png, mushrooms seed 5233 -> mushroom-<n>.png, sawdust heaps seed 5234 -> sawdust-<n>.png (for the
     clearing); picks in DECALS (the crescent-shaped sawdust and the long-stemmed ferns left out).
  5. Light shafts: * create_image_pro 512 opaque, seed 5241 (soft diagonal sun shafts and haze on black) -> paint/raw-shafts.png;
     then `shafts`.
  6. Effects: PixelLab vfx_workbench (free): twelve flame_tongue parts in a heap, a dark smoke_column and ember_rise (My effects
     "InkTanks burning tree"); its spritesheet in fx/; then `fx`.
  7. install. It only adds to manifest.json, so run it again after dev/pixel/world/install.py (which rewrites the manifest from the
     chapter 1 set alone) and after the concrete, desert, swamp and snow installs (order among those doesn't matter).
     Then dev/pixel/rail/build.py install and python3 dev/pixel/blueprints.py for the Rail gun and bp-rail.

PixelLab paints colour only; every piece keeps its model's outline, footprint and shadow (trim only takes pixels away).
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
quilt = desert_build.quilt

DEST = HERE.parents[2] / 'src' / 'art' / 'pixel' / 'world'
RENDER = WORLD_DEV / 'out' / 'render'
PAINTED = WORLD_DEV / 'out' / 'painted'
GROUND_DIR = WORLD_DEV / 'paint' / 'ground'
FOREST = ['oldTree', 'oldFir', 'youngTree', 'youngSpruce', 'fallenLog', 'fallenLogV', 'stump', 'undergrowth']
HIVE = ['sawmill', 'logPile', 'hiveTower', 'logBridge', 'logBridgeV', 'flagHive']
# Drawn under everything, as the bridge deck: tanks drive over them.
LAYER_GROUND = {'logBridge', 'logBridgeV'}
# Canopies whose painting came out smaller than the model: the model's leftover rim (flat render colours) is cut away.
TRIM = ['oldTree-1-roof', 'youngTree-1-roof']
# name: (source in world/paint/ground, order: higher draws over lower at an edge; water 0, mud 1, dirt 3, grass 6)
GROUNDS = {'clearing': ('clearing.png', 3.4), 'forestFloor': ('forestFloor.png', 5.2), 'forestTrail': ('forestTrail.png', 5.3),
           'forestTrailH': ('forestTrail.png', 5.3)}
FLOOR_LIFT = 1.36  # forestFloor painted very dark (mean 34): lifted to ~46, beside marsh (45) and mud (43)
FLOOR_FLATTEN = 0.6  # share of its large-scale light and dark taken out
# Decals: candidates picked by eye from world/paint/decals/<prefix>-<n>.png.
DECALS: dict[str, tuple[str, list[int]]] = {
    'leaves': ('leaves', [0, 1, 3, 5, 6, 9, 13, 15, 18, 22]),
    'fern': ('ferns', [0, 1, 3, 4, 6, 7, 10, 13, 16, 18]),
    'mushroom': ('mushroom', [0, 1, 3, 4, 5, 8, 9, 15, 17, 20]),
    'sawdust': ('sawdust', [2, 3, 4, 8, 14, 16, 17, 18, 21, 24]),
}
SHAFTS_ALPHA = (0, 120)
SHAFTS_GAMMA = 1.8
SHAFTS_FLATTEN = 0.8
SHAFTS_TINT = np.array([255, 236, 178])
FX: dict[str, tuple[str, str, bool, tuple[int, int] | None]] = {
    'treeFire': ('inktanks-burning-tree', 'a blazing tree canopy: a heap of flame tongues, embers and dark smoke rising (84 x 152). Loop it over '
                 'a burning tree; anchor = the middle of the blaze, so put it on the canopy centre (about the tree\'s anchor minus 0.55 of its '
                 'height in y); scale ~0.6 for young trees. When it burns out, switch the tree to its state 0 (oldTree / oldFir: a '
                 'charred snag with embers)', True, (42, 118)),
}
FOREST_PROMPT = (
    'Turn this 3D render of separate old-forest objects into masterful, richly detailed painterly pixel art for a top-down tank game. '
    'Every object stays exactly where it is, with exactly the same silhouette, size, angle, and the same light and shadow; add nothing '
    'new; transparent stays transparent, with no ground. A vast ancient broadleaf tree with a deep green leafy crown and a furrowed '
    'grey-brown buttressed trunk with mossy roots; a giant dark fir with drooping blue-green boughs; their burnt versions as charred '
    'black snags with grey ash and glowing embers; a young white birch with black bark marks and fresh light green leaves; a young dark '
    'spruce; mossy fallen logs with pale sawn ends, a root plate and bracket fungus; a cut tree stump with tree rings; a dense thicket '
    'of ferns and brambles. Rich greens, bark texture, crisp dark outline, warm sunlight from the top left.')
HIVE_PROMPT = (
    'Turn this 3D render of separate logging-camp structures into masterful, richly detailed painterly pixel art for a top-down tank '
    'game. Every object stays exactly where it is, with exactly the same silhouette, size, angle, and the same light and shadow; add '
    'nothing new; transparent stays transparent, with no ground. A sinister machine army\'s logging works: blackened riveted iron with '
    'hexagonal honeycomb panels and glowing hot orange lamps and trim; an open iron sawmill shed with a huge steel circular saw, logs '
    'on the carriage and pale sawdust on the floor, its pitched roof of dark corrugated iron with an orange ridge; stacked felled logs '
    'with pale cut ends between iron stakes and chains; a lattice iron watchtower with a hexagonal cabin and orange slit windows; flat '
    'log bridge decks lying on the ground seen from above, round brown logs side by side with low log curbs and iron brackets, their '
    'burnt and blown-apart versions charred black; a flagpole with a black flag bearing an orange hexagon. Crisp dark outline, warm '
    'sunlight from the top left.')
HARVESTER_PROMPT = (
    'Turn this 3D render into masterful painterly pixel art for a top-down tank game, seen straight from above: a colossal tracked '
    'logging war machine of a sinister machine army (a long low armoured hull of blackened riveted iron with hexagonal honeycomb armour '
    'plates and hot orange trim, a brow of glowing orange sensor lamps, two booms carrying a felling head with a hooked iron grapple '
    'claw, twin soot-black exhaust stacks with glowing orange mouths, turret rings, and a bunk of felled brown tree trunks with pale cut '
    'ends chained at the stern), and two copies of its separate pair of caterpillar tracks with a great polished steel circular saw '
    'blade in front of each track. Every part stays exactly where it is with exactly the same silhouette, size and light; add nothing '
    'new; transparent stays transparent. Worn scratched paint, rust streaks, sawdust and sap stains, rivets. Crisp dark outline, warm '
    'sunlight from the top left.')


def _painted_piece(set_name: str, key: str) -> tuple[np.ndarray, np.ndarray, tuple[int, int, int, int]]:
    """The model's render of a sheet piece and the painting over it (matched as sheets.cut does), cropped to the model's bbox."""
    place = json.loads((WORLD_DEV / 'out' / 'sheets' / set_name / 'place.json').read_text())[key]
    art = np.array(Image.open(WORLD_DEV / 'paint' / set_name / f'sheet-{place["sheet"]}.png').convert('RGBA'))
    full = np.array(Image.open(RENDER / place['name'] / f'{key}.png').convert('RGBA'))
    ys, xs = np.nonzero(full[..., 3])
    by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    src = full[by0:by1, bx0:bx1]
    _, dx, dy = match(art, src, place['x'] + bx0, place['y'] + by0)
    ax, ay = place['x'] + bx0 + dx, place['y'] + by0 + dy
    return src, art[ay:ay + by1 - by0, ax:ax + bx1 - bx0], (by0, by1, bx0, bx1)


def trim() -> None:
    """A canopy keeps only the pixels the painting covers (its own dark outline), dropping single stray pixels; idempotent."""
    for key in TRIM:
        name = key.split('-')[0]
        src, piece, (by0, by1, bx0, bx1) = _painted_piece('forest', key)
        path = PAINTED / name / f'{key}.png'
        out = np.array(Image.open(path).convert('RGBA'))
        keep = piece[..., 3] > 0
        n = np.zeros(keep.shape, int)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy or dx:
                    n += np.roll(np.roll(keep, dy, 0), dx, 1)
        keep &= n >= 2
        region = out[by0:by1, bx0:bx1]
        before = int((region[..., 3] > 0).sum())
        region[~keep] = 0
        Image.fromarray(out).save(path)
        print(f'  trim {key}: {before} -> {int((region[..., 3] > 0).sum())} px')


def grounds() -> None:
    """forestFloor: lifted (FLOOR_LIFT), its big blotches (the grass it was painted from) evened out by FLOOR_FLATTEN so the
    tiling doesn't read as a checkerboard, then quilted with a narrow overlap (448 tiles: more painting, less repeat).
    forestTrail: quilted the same way. clearing: its painting already wraps as well as chapter 1's dirt, so it stays 512."""
    from seam import wrap_blur  # noqa: E402  (dev/pixel/world/seam.py)
    g = GROUND_DIR
    raw = np.array(Image.open(g / 'raw-forestFloor.png').convert('RGB')).astype(float) * FLOOR_LIFT
    low = wrap_blur(raw, 24)
    flat = raw - FLOOR_FLATTEN * (low - low.mean(axis=(0, 1)))
    Image.fromarray(np.clip(flat, 0, 255).astype(np.uint8)).save(g / 'raw-forestFloor-lift.png')
    quilt(g / 'raw-forestFloor-lift.png', g / 'forestFloor.png', overlap=64)
    quilt(g / 'raw-forestTrail.png', g / 'forestTrail.png', overlap=64)
    shutil.copy(g / 'raw-clearing.png', g / 'clearing.png')


def harvester_cut() -> None:
    meta = json.loads((HERE / 'out' / 'sheets' / 'harvester.json').read_text())
    art = np.array(Image.open(HERE / 'paint' / 'harvester.png').convert('RGBA'))
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
        print(f'  {key:22s} match {score:.3f} shift {dx:+d},{dy:+d}')


def fx() -> None:
    """The vfx exports are grids; the game wants one horizontal strip per effect (frame size in the manifest)."""
    out = HERE / 'out' / 'fx'
    out.mkdir(parents=True, exist_ok=True)
    meta = {}
    for name, (src, note, loop, anchor) in FX.items():
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
                      'anchor': list(anchor) if anchor else [round(piv['x'] * w), round(piv['y'] * h)], 'loop': loop, 'note': note}
        print(' ', name, meta[name]['frame'], meta[name]['frames'], 'frames')
    (out / 'fx.json').write_text(json.dumps(meta, indent=1))


def shafts() -> None:
    """PixelLab's sun shafts made seamless (rolled by half, its old edges crossfaded away) and turned into a see-through
    overlay: brightness becomes alpha, the colour a warm sunlight."""
    a = np.array(Image.open(HERE / 'paint' / 'raw-shafts.png').convert('RGB')).astype(float)
    n = a.shape[0]
    rolled = np.roll(np.roll(a, n // 2, axis=0), n // 2, axis=1)
    t = np.abs(np.arange(n) - (n - 1) / 2) / (n / 2)
    wx = np.clip((1 - t) / 0.35, 0, 1)
    w = np.minimum(wx[None, :], wx[:, None])[..., None]
    w = w * w * (3 - 2 * w)
    seamless = a * w + rolled * (1 - w)
    lum = seamless.mean(axis=-1)
    # The painting is brightest at its upper left (the sun): even its large-scale light out so the tiling doesn't repeat a hot spot.
    from seam import wrap_blur  # noqa: E402  (dev/pixel/world/seam.py)
    low = wrap_blur(lum[..., None], 64)[..., 0]
    lum = lum - SHAFTS_FLATTEN * (low - low.mean())
    lo, hi = np.percentile(lum, 5), np.percentile(lum, 99.6)
    f = np.clip((lum - lo) / (hi - lo), 0, 1)
    alpha = SHAFTS_ALPHA[0] + (SHAFTS_ALPHA[1] - SHAFTS_ALPHA[0]) * f ** SHAFTS_GAMMA
    tint = seamless * 0.25 + SHAFTS_TINT * 0.75
    (HERE / 'out').mkdir(exist_ok=True)
    Image.fromarray(np.dstack([np.clip(tint, 0, 255), alpha]).astype(np.uint8)).save(HERE / 'out' / 'shafts.png')
    print('shafts', n, 'alpha', SHAFTS_ALPHA, 'mean', round(float(alpha.mean()), 1))


def preview() -> None:
    """Every structure state (shadow, body, front, roof) on the forest floor, the grounds and the Harvester: out/preview.png."""
    meta = json.loads((RENDER / 'structures.json').read_text())
    floor = Image.open(GROUND_DIR / 'forestFloor.png').convert('RGBA')
    W = 1600
    tiles, x, y, rowh = [], 0, 0, 0
    for name in FOREST + HIVE:
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
    for gx in range(0, W, floor.width):
        for gy in range(0, H, floor.height):
            sheet.alpha_composite(floor, (gx, gy))
    for name, st, x, y in tiles:
        for suffix in ('-shadow', '', '-front', '-roof'):
            p = (RENDER if suffix == '-shadow' else PAINTED) / name / f'{name}-{st}{suffix}.png'
            if p.exists():
                sheet.alpha_composite(Image.open(p).convert('RGBA'), (x, y))
    yb = y + rowh + 4
    g = 0
    for name in ('forestTrail', 'clearing'):
        p = GROUND_DIR / f'{name}.png'
        if p.exists():
            sheet.paste(Image.open(p).convert('RGBA').crop((0, 0, 300, 400)), (g, yb))
            g += 304
    painted = HERE / 'out' / 'painted'
    if (painted / 'harvester-body.png').exists():
        sheet.alpha_composite(Image.open(painted / 'harvester-treads.png'), (g, yb + 40))
        sheet.alpha_composite(Image.open(painted / 'harvester-body.png'), (g, yb + 40))
    sheet.save(HERE / 'out' / 'preview.png')
    print('preview', sheet.size)


def install_structures(manifest: dict) -> None:
    out = DEST / 'structures'
    meta = json.loads((RENDER / 'structures.json').read_text())
    for name in FOREST + HIVE:
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


def install_harvester(manifest: dict) -> None:
    out = DEST / 'vehicles'
    painted = HERE / 'out' / 'painted'
    meta = json.loads((HERE / 'out' / 'sheets' / 'harvester.json').read_text())
    files = {}
    for key in ('harvester-body', 'harvester-treads', 'harvester-treads-f2'):
        shutil.copy(painted / f'{key}.png', out / f'{key}.png')
        files[key] = f'vehicles/{key}.png'
    train = manifest['vehicles']['railTrain']
    turrets = {k: v for k, v in train['turrets'].items()}
    shared = {k: v for k, v in train['files'].items() if k.startswith('fortress')}
    manifest['vehicles']['harvester'] = {
        'size': 320, 'body': 'harvester-body', 'treads': ['harvester-treads', 'harvester-treads-f2'], 'mounts': meta['mounts'],
        'turrets': turrets, 'facing': 'north', 'files': {**shared, **files},
        'note': 'a 320 frame (its felling head reaches past the 288 of the other bosses). treads = its two track units AND its two '
                'felling saws: draw them under the body and swap the two frames while it moves (links move half a link, the saws '
                'turn half a tooth; swap them faster when it rams). Rings: the fortress cannons on sponsons, the boss rail gun '
                '(fortressRail) amidships, the MG at the brow (MOUNTS in dev/pixel/forest/harvester.py)'}
    print('  vehicle harvester', list(files))


def install_overlays_fx(manifest: dict) -> None:
    (DEST / 'fx').mkdir(exist_ok=True)
    if (HERE / 'out' / 'shafts.png').exists():
        shutil.copy(HERE / 'out' / 'shafts.png', DEST / 'fx' / 'shafts.png')
        manifest.setdefault('overlays', {})['shafts'] = {
            'file': 'fx/shafts.png', 'size': 512, 'tile': True,
            'note': 'straight-alpha warm sun shafts and haze slanting down from the upper left: tile it over the view in a forest '
                    '(additive or normal blend, ~0.6 opacity), drift it very slowly (say +4, +2 px/s); fade it out at night or in smoke'}
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
    if (HERE / 'out' / 'painted' / 'harvester-body.png').exists():
        install_harvester(manifest)
    install_overlays_fx(manifest)
    (DEST / 'manifest.json').write_text(json.dumps(manifest, indent=1))
    print('manifest:', len(manifest['structures']), 'structures,', len(manifest['ground']), 'grounds')


if __name__ == '__main__':
    {'trim': trim, 'grounds': grounds, 'harvester-cut': harvester_cut, 'fx': fx, 'shafts': shafts, 'preview': preview,
     'install': install}[sys.argv[1]]()
