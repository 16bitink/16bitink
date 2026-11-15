"""Mk IV and Mk V of every tank part: modelled, painted and installed like Mk I to III (dev/pixel/parts/, mortar/, hover/ ...).

  python3 dev/pixel/mk45/build.py render     out/render/<key>.png (+ -stripe for hulls, -f1/-f2 for drives) + meta.json
  python3 dev/pixel/mk45/build.py pack       out/sheets/<sheet>.png + .json (one 256 sheet per PixelLab paint call)
  python3 dev/pixel/mk45/build.py cut        paint/<sheet>.png -> out/painted/, prints the worst match per sheet
  python3 dev/pixel/mk45/build.py install    src/art/pixel/parts/<key>.png (+ stripes, frames, size-less drive aliases)
                                             and the manifest's keys/ring/muzzle/frames/drives/aliases/stripe/tiers
  then `python3 dev/pixel/rollframes.py` for the tread drives' -f1/-f2.

Run `install` again (then rollframes) after dev/pixel/parts/install.py, which rebuilds the parts folder from scratch.
Paint: PixelLab edit_image on each packed sheet, 256 x 256, transparent, the sheet's seed and prompt in SHEETS (10 generations
a sheet).

Every Mk IV and V is its family's Mk III model with the field kit swapped for factory kit, so the family, the silhouette,
the pivot, the turret ring, the stripe and the tread all stay where Mk III has them:
  * Mk IV: the sandbags become riveted steel armour blocks, the rust and scuffs go, bolted applique plates go on the
    faces that show (glacis, flanks, turret cheeks, pods), armoured covers on stowage, extra jackets and guards on guns.
  * Mk V: Mk IV, its armour blocks as rows of dark reactive-armour bricks, plus the advanced kit: sights and sensors,
    a quad MG, a guidance radar on the rockets, an autoloader on the mortar, radiator wings on the laser...
"""
from __future__ import annotations

import contextlib
import importlib.util
import json
import math
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
PIXEL = HERE.parent
PARTS = PIXEL / 'parts'
sys.path.insert(0, str(PARTS))
import model  # noqa: E402  (shared; patched only inside kit())
import sheets  # noqa: E402
from model import (BLACK, BRASS, GUN, GUN_D, OLIVE, OLIVE_D, RIVET, Mesh, box, cyl, frustum, placed, plate,  # noqa: E402
                   rect, rivet_line, rivets)


def load(name: str):
    spec = importlib.util.spec_from_file_location(f'{name}_build', PIXEL / name / 'build.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


MORTAR, FLAMER, LASER, RAIL, HOVER = (load(n) for n in ('mortar', 'flamer', 'laser', 'rail', 'hover'))
# load() re-points parts/sheets.py at each family's folder: point it back here in point_sheets().

OUT = HERE / 'out'
DEST = PIXEL.parents[1] / 'src' / 'art' / 'pixel' / 'parts'
TIERS = (4, 5)
FRESH = np.array([0.38, 0.40, 0.23])        # factory paint: a touch cleaner than OLIVE
ERA = np.array([0.30, 0.32, 0.30])          # reactive-armour bricks: dark steel-olive
ERA_BOLT = np.array([0.50, 0.50, 0.44])
HULLS = model.HULLS
DRIVES = ['driveWheels', 'driveHalftrack', 'driveTracks', 'driveHover']
TURRETS = ['turretMG', 'turretCannon', 'turretRocket', 'turretMortar', 'turretFlamer', 'turretLaser', 'turretRail']
SIZES = model.SIZES

BASE = ('Turn this 3D render of top-down tank parts into masterful painterly pixel art for a top-down tank game, seen straight '
        'from above. Every part stays exactly where it is with the same silhouette, size, light and colours; add nothing new; '
        'transparent stays transparent. Olive drab green armour painted in camouflage: keep every dark green, dark brown and pale '
        'blotch exactly where and as dark as it is in the render. Elite, well-kept tanks: crisp paint with only light edge wear, '
        'bolted steel armour plates with rivet rows, dark steel reactive armour bricks, gunmetal barrels. ')
LIGHT = 'Warm sunlight from the top left, crisp dark outline.'
SHEETS = {
    't45-guns': (6101, BASE + 'Tank gun turrets: twin and quad machine guns with cooled barrels, a long tank cannon with a fume '
                 'extractor, rocket launcher pods with black tube openings and a small radar dish. ' + LIGHT),
    't45-special': (6102, BASE + 'Tank gun turrets: a heavy mortar tilted steeply up with its round black bore and brass shells; a '
                    'flamethrower with a scorched flared nozzle, black hoses and round fuel tanks with red warning bands; a laser with '
                    'a slim finned emitter and glowing cyan lens and cells; a rail gun with two long polished steel rails, copper coil '
                    'bands and glowing blue-white capacitor cells. ' + LIGHT),
    't45-hulls': (6104, BASE + 'Tank hulls: sloped olive armour, hatches, engine grilles, a flat grey stripe, stowage boxes. ' + LIGHT),
    't45-wheels': (6105, BASE + 'Armoured car wheel sets: black rubber tyres with tread and snow chains, steel hubs, olive mudguards '
                   'and armour plates. ' + LIGHT),
    't45-halftrack': (6106, BASE + 'Half-track running gear: black rubber front wheels, steel track links with grousers, olive '
                      'mudguards and skirt plates. ' + LIGHT),
    't45-tracks': (6107, BASE + 'Tank tracks: steel track links with grousers, olive mudguards and spaced skirt plates. ' + LIGHT),
    't45-hover-a': (6108, BASE + 'Hovercraft drive parts: a black rubber skirt of overlapping fingers, round lift-fan ducts in olive '
                  'armoured pods with dark fan blades inside. ' + LIGHT),
    't45-hover-b': (6109, BASE + 'Hovercraft drive parts: a black rubber skirt of overlapping fingers, round lift-fan ducts in olive '
                  'armoured pods with dark fan blades inside. ' + LIGHT),
}


# --- the swap: sandbags -> armour blocks or reactive bricks; no rust or scuffs ------------------------------------------

def _armour_block(m, low, high, z0, z1, tier):
    """Where a sandbag was: a low steel block, riveted (IV), or a reactive brick with a bolt (V)."""
    cx, cy = np.mean(low, axis=0)
    top = z0 + (z1 - z0) * 0.8
    solid = [(cx + (x - cx) * 0.9, cy + (y - cy) * 0.9) for x, y in low]
    frustum(m, low, solid, z0, top, OLIVE_D if tier == 4 else ERA)
    if tier == 4:
        box(m, cx, cy, top, 0.55, 0.55, 0.25, RIVET)
    else:
        box(m, cx, cy, top, 0.7, 0.7, 0.3, ERA_BOLT)


@contextlib.contextmanager
def kit(tier):
    """While building a Mk III model: sandbags come out as armour (frustum calls in BAG/SAND_D), wear() draws nothing."""
    mods = [model, MORTAR, FLAMER, LASER, RAIL, HOVER]
    real = frustum

    def patched(m, low, high, z0, z1, col, top=None):
        if top is None and (col is model.BAG or col is model.SAND_D):
            return _armour_block(m, low, high, z0, z1, tier)
        return real(m, low, high, z0, z1, col, top)

    saved = [(mod, mod.__dict__.get('frustum')) for mod in mods]
    saved_wear = model.wear
    for mod in mods:
        if 'frustum' in mod.__dict__:
            mod.frustum = patched
    model.wear = lambda *a, **k: None
    try:
        yield
    finally:
        for mod, f in saved:
            if f is not None:
                mod.frustum = f
        model.wear = saved_wear


# --- shared kit ------------------------------------------------------------------------------------------------------

def bricks(m, cx, cy, z, w, l, bw=1.9, bl=1.5):
    """A grid of reactive-armour bricks filling w x l, each with a bolt."""
    nx, ny = max(1, int(w / bw)), max(1, int(l / bl))
    sx, sy = w / nx, l / ny
    for i in range(nx):
        for j in range(ny):
            x, y = cx - w / 2 + sx * (i + 0.5), cy - l / 2 + sy * (j + 0.5)
            frustum(m, rect(sx - 0.2, sy - 0.2, 0.2, x, y), rect(sx - 0.5, sy - 0.5, 0.2, x, y), z, z + 0.55, ERA)
            box(m, x, y, z + 0.55, 0.45, 0.45, 0.2, ERA_BOLT)


def tilted(m, build, at, pitch):
    """A small mesh built flat at the origin, set down tilted (placed() turns about x)."""
    local = Mesh()
    build(local)
    placed(m, local, at, pitch)


def smoke(m, x, y, z, n=3, sx=1):
    """A smoke-grenade discharger cluster: n short tubes splayed outward."""
    for k in range(n):
        cyl(m, 'y', (x + sx * k * 0.7, y - k * 0.5, z + 0.5), 1.2, 0.38, GUN_D, n=6, cap=BLACK)


def sight(m, x, y, z, w=1.6, l=2.0, h=1.2):
    """An armoured sight head with a dark lens facing forward."""
    box(m, x, y, z, w, l, h, GUN_D)
    box(m, x, y - l / 2 - 0.05, z + h * 0.35, w * 0.7, 0.2, h * 0.45, BLACK)
    box(m, x, y + 0.2, z + h, w * 0.6, l * 0.5, 0.2, GUN)


# --- hulls -------------------------------------------------------------------------------------------------------------

def hull(name, tier):
    with kit(tier):
        m = model.hull(name, 3)
    w, l, deck = model.DIMS[name]
    z0 = 2.5
    gy = -(l - 8) / 2 + 0.8 + 1.8
    # The glacis: the slope from the nose (z0 + 2) up to the deck's front edge. An applique plate between the nose's
    # armour row and the stripe, laid on the slope.
    y_lo, y_hi = -(l - 1.5) / 2, -(l - 8) / 2 + 0.8
    pitch = -math.atan2(deck - (z0 + 2.0), y_hi - y_lo)
    run = math.hypot(deck - (z0 + 2.0), y_hi - y_lo)
    gw = w - 6.0
    if tier == 4:
        tilted(m, lambda pm: plate(pm, 0, 0, 0, gw, run * 0.45, FRESH, step=1.3), (0, y_lo + (y_hi - y_lo) * 0.62, z0 + 2.0 + (deck - z0 - 2.0) * 0.62 + 0.05), pitch)
    else:
        tilted(m, lambda pm: bricks(pm, 0, 0, 0, gw, run * 0.45, bw=1.8, bl=1.3), (0, y_lo + (y_hi - y_lo) * 0.62, z0 + 2.0 + (deck - z0 - 2.0) * 0.62 + 0.05), pitch)
    # Smoke dischargers on both front corners, behind the nose armour.
    for sx in (-1, 1):
        smoke(m, sx * (w / 2 - 1.4), gy + 0.4, deck - 0.2, n=2 if name == 'hullLight' else 3, sx=-sx)
    # Flank armour fore and aft of Mk III's side plates: riveted plates (IV), reactive bricks on all of it (V).
    flank_z = z0 + (4.4 if name == 'hullHeavy' else 3.2)
    mid = l * 0.275
    seg = (l / 2 - 2.2) - mid
    for sx in (-1, 1):
        x = sx * (w / 2 + (0.3 if name != 'hullHeavy' else 0.4))
        for fy in (-1, 1):
            cy = fy * (mid + seg / 2) + (1.0 if fy < 0 else 0.0)
            plate(m, x, cy, flank_z, 1.3, seg - 0.8, FRESH, step=1.3)
            if tier == 5:
                bricks(m, x, cy, flank_z + 0.6, 1.2, seg - 1.2, bw=1.2, bl=1.4)
        if tier == 5:
            bricks(m, sx * (w / 2 + 0.4), 1.0, flank_z + 0.8, 1.2, l * 0.5, bw=1.2, bl=1.4)
    # Armoured bins over the rear jerrycans.
    for sx in (-1, 1):
        bx = sx * (w / 2 - 2.4)
        box(m, bx, l / 2 - 2.2, deck - 0.6, 2.4, 1.8, 2.0, OLIVE_D)
        rivets(m, rect(2.4, 1.8, 0.3, bx, l / 2 - 2.2), deck + 1.4, 0.9, RIVET, inset=0.35)
    if tier == 5:
        # Slat armour across the tail, a second aerial, an IR searchlight beside the driver.
        for i in range(int((w - 4) / 1.1)):
            box(m, -(w - 4) / 2 + 0.55 + i * 1.1, l / 2 + 0.5, z0 + 1.0, 0.35, 0.5, 3.4, GUN_D)
        box(m, 0, l / 2 + 0.5, z0 + 4.4, w - 4, 0.6, 0.35, GUN_D)
        model.aerial(m, w / 2 - 2.6, l / 2 - 6.0, deck)
        cyl(m, 'y', (-(w / 2 - 2.6), gy + 3.0, deck + 0.9), 1.0, 0.9, GUN_D, n=10, cap=BLACK)
        sight(m, w * 0.22, gy + 2.6, deck + 0.4, 1.4, 1.6, 0.8)
    return m


# --- turrets (z = 7, pivot = ring centre; each returns mesh, muzzles in model units) -----------------------------------

Z = 7.0


def t_mg(tier):
    with kit(tier):
        m, muzzles = model.turret('turretMG', 3)
    # Armoured jackets on both barrels, wings on the gun shield, a sight.
    for sx in (-1.6, 1.6):
        cyl(m, 'y', (sx, -6.6, Z + 3.0), 4.2, 1.3, GUN_D, n=10)
        for i in range(3):
            box(m, sx, -5.2 - i * 1.3, Z + 4.25, 0.9, 0.35, 0.12, BLACK)
    for sx in (-1, 1):
        frustum(m, rect(1.4, 3.0, 0.3, cx=sx * 5.0, cy=-3.0), rect(1.0, 2.6, 0.2, cx=sx * 5.0, cy=-3.0), Z + 1.0, Z + 4.0, FRESH)
        rivet_line(m, sx * 5.0, -4.2, sx * 5.0, -1.8, Z + 4.0, step=1.2)
    sight(m, -2.6, 1.6, Z + 3.4, 1.4, 1.8, 1.0)
    if tier == 5:
        # Quad mount: a second pair of barrels outboard, over the shield, with drum magazines.
        tip = -14.6 - 0.8 * 2
        for sx in (-3.6, 3.6):
            cyl(m, 'y', (sx, -9.0, Z + 4.4), 9.6, 0.85, GUN_D, n=8)
            cyl(m, 'y', (sx, -6.4, Z + 4.4), 3.0, 1.15, GUN_D, n=8)
            cyl(m, 'y', (sx, tip + 0.5, Z + 4.4), 1.0, 1.0, GUN, n=8)
            cyl(m, 'z', (sx * 1.25, -0.6, Z + 3.6), 1.0, 1.3, OLIVE_D, n=12, cap=GUN)
            muzzles.append((sx, tip))
        bricks(m, 0, -4.0, Z + 4.0, 8.0, 1.0, bw=1.6, bl=1.0)
    return m, muzzles


def t_cannon(tier):
    with kit(tier):
        m, muzzles = model.turret('turretCannon', 3)
    w, length = 13.0, 17.0
    by = -w / 2 - length / 2 + 1.0
    # A fume extractor on the barrel, wedge applique on both front cheeks.
    cyl(m, 'y', (0, by + 1.0, Z + 2.4), 3.4, 1.65, GUN_D, n=12)
    for sx in (-1, 1):
        cx = sx * (w / 2 - 2.4)
        # An arrow-head wedge: its point forward and outboard, so the turret front reads as a chevron.
        lo = [(cx - sx * 2.4, -w / 2 + 1.6), (cx + sx * 2.6, -w / 2 + 1.6), (cx + sx * 2.6, -w / 2 - 0.4), (cx - sx * 0.6, -w / 2 - 2.0)]
        hi = [(cx - sx * 2.0, -w / 2 + 1.3), (cx + sx * 2.3, -w / 2 + 1.3), (cx + sx * 2.3, -w / 2 - 0.2), (cx - sx * 0.4, -w / 2 - 1.5)]
        frustum(m, lo, hi, Z + 0.6, Z + 4.4, FRESH)
        rivet_line(m, cx - 1.8, -w / 2 + 0.8, cx + 1.8, -w / 2 + 0.8, Z + 4.4, step=1.0)
    if tier == 5:
        # Thermal sleeve bands, reactive bricks on the wedges, a gunner's sight and a wind-sensor mast.
        for k in range(4):
            cyl(m, 'y', (0, by - 3.0 - k * 2.0 + (k > 1) * -1.4, Z + 2.4), 0.5, 1.3, GUN, n=10)
        for sx in (-1, 1):
            bricks(m, sx * (w / 2 - 2.4) + sx * 0.4, -w / 2 + 0.1, Z + 4.4, 3.6, 1.8, bw=1.2, bl=0.9)
        sight(m, 2.8, -1.4, Z + 4.2, 1.8, 2.0, 1.2)
        cyl(m, 'z', (-4.4, 4.6, Z + 5.4), 2.0, 0.2, GUN_D, n=6)
        box(m, -4.4, 4.6, Z + 6.4, 1.2, 0.3, 0.3, GUN_D)
    return m, muzzles


def t_rocket(tier):
    with kit(tier):
        m, muzzles = model.turret('turretRocket', 3)
    pw, ph = 0.4 + 2.8 * 3, 0.2 + 2.7 * 3
    for sx in (-1, 1):
        at = (sx * (pw / 2 + 0.6), -1.2, Z + 5.2 + 0.4)

        def cover(pod, sx=sx):
            # An armoured shutter over each pod's back half (IV); reactive bricks on it (V).
            plate(pod, 0, 2.6, ph / 2 + 0.4, pw - 0.6, 4.4, FRESH, step=1.3)
            if tier == 5:
                bricks(pod, 0, 2.6, ph / 2 + 1.0, pw - 1.4, 3.6, bw=1.8, bl=1.2)
            for e in (-1, 1):
                box(pod, e * (pw / 2 + 0.9), -3.6, -ph / 2 + 0.6, 0.6, 2.0, ph - 1.2, OLIVE_D)
        tilted(m, cover, at, 0.75)
    if tier == 5:
        # A guidance radar dish on a short mast between the pods.
        ry = 6.4
        cyl(m, 'z', (0, ry, Z + 4.0), 4.0, 0.5, GUN_D, n=8)
        cyl(m, 'z', (0, ry, Z + 6.2), 0.4, 2.6, GUN, n=16, cap=GUN)
        cyl(m, 'z', (0, ry, Z + 6.5), 0.3, 1.7, GUN_D, n=16, cap=OLIVE_D)
        box(m, 0, ry, Z + 6.6, 0.5, 0.5, 0.5, RIVET)
    return m, muzzles


def t_mortar(tier):
    with kit(tier):
        m, (mx, my) = MORTAR.mortar(3)
    # Shield wings, armoured lids on both ammo boxes.
    for sx in (-1, 1):
        frustum(m, rect(1.4, 3.4, 0.3, cx=sx * 5.6, cy=-4.0), rect(1.0, 3.0, 0.2, cx=sx * 5.6, cy=-4.0), Z + 1.0, Z + 3.6, FRESH)
        rivet_line(m, sx * 5.6, -5.4, sx * 5.6, -2.6, Z + 3.6, step=1.2)
        plate(m, sx * 4.6, 2.5, Z + 3.0, 2.6, 3.6, OLIVE_D, step=1.2)
    if tier == 5:
        # An autoloader cassette behind the tube with shells in it, a rangefinder bar across the back.
        box(m, 0, 4.0, Z + 3.2, 4.4, 2.4, 1.6, GUN_D)
        for i in range(4):
            cyl(m, 'z', (-1.5 + i * 1.0, 4.0, Z + 4.9), 0.3, 0.42, BRASS, n=8)
        box(m, 0, 6.6, Z + 3.6, 10.0, 0.9, 0.9, GUN_D)
        for sx in (-1, 1):
            cyl(m, 'x', (sx * 5.0, 6.6, Z + 4.05), 0.4, 0.55, GUN, n=8, cap=BLACK)
    return m, [(mx, my)]


def t_flamer(tier):
    with kit(tier):
        m, (mx, my) = FLAMER.flamer(3)
    w = 13.0
    y0 = -w / 2 + 0.6
    # A wider bolted mantlet, a heat-shield plate over the hoses, a second pilot-light box.
    frustum(m, rect(8.0, 1.6, 0.4, cy=y0 + 0.4), rect(7.4, 1.2, 0.3, cy=y0 + 0.4), Z + 0.6, Z + 4.4, FRESH)
    rivet_line(m, -3.6, y0 + 0.4, 3.6, y0 + 0.4, Z + 4.4, step=1.2)
    box(m, -(w / 2 - 1.2), -1.2, Z + 1.0, 1.8, 2.6, 2.0, GUN_D)
    box(m, -(w / 2 - 1.2), -2.6, Z + 2.2, 0.8, 0.4, 0.5, BRASS)
    if tier == 5:
        # Pressure bottles beside the tanks, reactive bricks on the turret's front slope.
        for sx in (-1, 1):
            cyl(m, 'y', (sx * 7.4, w / 2 + 1.2, Z + 2.0), 5.6, 0.75, GUN, n=10, cap=GUN_D)
            cyl(m, 'y', (sx * 7.4, w / 2 - 1.8, Z + 2.0), 0.6, 0.5, BRASS, n=8, cap=BRASS)
        tilted(m, lambda pm: bricks(pm, 0, 0, 0, 7.0, 1.6, bw=1.75, bl=1.6), (0, -w / 2 + 2.6, Z + 3.7), 0.0)
    return m, [(mx, my)]


def t_laser(tier):
    with kit(tier):
        m, (mx, my) = LASER.laser(3)
    w = 12.6
    cy_ = w / 2 + 0.6
    # Finned heat sinks on both cheeks, a second glowing cell beside the first.
    for sx in (-1, 1):
        box(m, sx * (w / 2 + 0.2), 1.0, Z + 0.8, 1.2, 5.0, 2.4, GUN_D)
        for i in range(5):
            box(m, sx * (w / 2 + 0.2), -0.8 + i * 0.9, Z + 3.2, 1.4, 0.35, 0.25, GUN)
    box(m, -3.6, cy_, Z + 0.6, 2.0, 3.2, 2.8, GUN_D)
    box(m, -3.6, cy_, Z + 3.4, 1.2, 2.4, 0.25, LASER.CYAN)
    if tier == 5:
        # Radiator wings swept back from the cheeks, a lens hood, glow strips on the emitter root.
        for sx in (-1, 1):
            frustum(m, [(sx * 6.8, -1.0), (sx * 9.4, 1.6), (sx * 9.4, 5.6), (sx * 6.8, 4.6)],
                    [(sx * 7.0, -0.6), (sx * 9.1, 1.8), (sx * 9.1, 5.3), (sx * 7.0, 4.3)], Z + 0.8, Z + 1.6, GUN_D)
            for i in range(4):
                box(m, sx * 8.1, 0.4 + i * 1.3, Z + 1.6, 2.2, 0.3, 0.15, LASER.CYAN_D)
        tip = my
        cyl(m, 'y', (0, tip + 1.0, Z + 2.6), 1.0, 1.45, GUN, n=12)
        for sx in (-1, 1):
            box(m, sx * 1.0, -w / 2 - 0.6, Z + 3.4, 0.3, 1.6, 0.2, LASER.CYAN)
    return m, [(mx, my)]


def t_rail(tier):
    with kit(tier):
        m, (mx, my) = RAIL.rail(3)
    w = 12.6
    back = w / 2 + 0.6
    y0 = -w / 2 + 0.8
    # Armoured conduits over both cables, bigger capacitor pods with two cells each.
    for sx in (-1, 1):
        x = sx * (w / 2 - 1.5)
        box(m, x, (back + 0.9 + y0) / 2, Z + 3.0, 1.2, back - y0 - 1.6, 1.1, OLIVE_D)
        rivet_line(m, x, y0 + 1.6, x, back - 0.6, Z + 4.1, step=1.4)
        box(m, sx * (w / 2 + 0.2), 0.6, Z + 0.8, 2.0, 4.4, 2.6, GUN_D)
        for k in (-1, 1):
            cyl(m, 'z', (sx * (w / 2 + 0.2), 0.6 + k * 1.1, Z + 3.5), 0.3, 0.55, RAIL.VOLT, n=10, cap=RAIL.VOLT)
    if tier == 5:
        # Radiator fins along both rails' outer faces, a second row of cells in the bank, a sensor block on the brace.
        length = 18.0
        for sx in (-1, 1):
            for i in range(6):
                box(m, sx * 2.1, y0 - 2.0 - i * 2.2, Z + 2.2, 0.8, 0.4, 0.6, GUN)
        for i in range(4):
            x = (i - 1.5) * 2.2
            cyl(m, 'z', (x, back + 2.6, Z + 3.4), 0.5, 0.6, RAIL.VOLT, n=10, cap=RAIL.VOLT)
        box(m, 0, y0 - length + 1.6, Z + 3.8, 2.0, 1.2, 0.6, GUN_D)
    return m, [(mx, my)]


TURRET_FN = {'turretMG': t_mg, 'turretCannon': t_cannon, 'turretRocket': t_rocket, 'turretMortar': t_mortar,
             'turretFlamer': t_flamer, 'turretLaser': t_laser, 'turretRail': t_rail}


# --- drives ------------------------------------------------------------------------------------------------------------

def drive(name, size, tier, frame):
    if name == 'driveHover':
        return hover(size, tier, frame)
    with kit(tier):
        m = model.drive(name, size, 3, frame)
    w, l, _ = model.DIMS[SIZES[size]]
    e = w / 2 + model.EDGE[size]
    i = 'LMH'.index(size)
    if name == 'driveWheels':
        r = (2.2, 2.5, 2.8)[i]
        wid = (3.4, 3.8, 4.2)[i] + 0.6
        x = e - 1.0 + wid / 2
        ys = [f * l for f in (-0.375, -0.125, 0.125, 0.375)]
        for sx in (-1, 1):
            # Armour plates in the gaps between the tyres, low so the tyres stand above them.
            for a, b in zip(ys, ys[1:]):
                gap = (b - a) - 2 * r
                plate(m, sx * x, (a + b) / 2, r * 0.9, wid - 0.6, gap + 0.6, FRESH, step=1.2)
                if tier == 5:
                    bricks(m, sx * x, (a + b) / 2, r * 0.9 + 0.6, wid - 1.2, gap + 0.2, bw=1.5, bl=max(0.8, gap))
            # Armoured hub caps.
            for y in ys:
                cyl(m, 'x', (sx * (x + wid / 2 + 0.55), y, r), 0.6, r * 0.62, OLIVE_D, n=10, cap=GUN)
                box(m, sx * (x + wid / 2 + 0.85), y, r - 0.3, 0.3, 0.6, 0.6, RIVET)
            if tier == 5:
                # A side rail tying the hubs together.
                box(m, sx * (x + wid / 2 + 1.05), 0, r - 0.4, 0.5, ys[-1] - ys[0], 0.8, GUN_D)
    elif name == 'driveHalftrack':
        r = (2.5, 2.8, 3.1)[i]
        wid = (4.6, 5.2, 5.8)[i] + 0.8
        x = e - 1.0 + wid / 2
        y1 = -l / 2 + r - 0.3
        y2 = y1 + 2 * r + 0.5
        t0, t1 = y2 + r + 0.8, l / 2 + 0.8
        for sx in (-1, 1):
            # An armoured guard over the front wheels' outer half.
            plate(m, sx * (x + (wid - 1.4) / 2 - 0.9), (y1 + y2) / 2, 2 * r + 0.4, 1.8, (y2 - y1) + r * 1.2, FRESH, step=1.3)
            if tier == 5:
                bricks(m, sx * (x + wid / 2 - 1.0), (t0 + t1) / 2, 6.2, 1.6, (t1 - t0) * 0.7, bw=1.6, bl=1.6)
                bricks(m, sx * (x + (wid - 1.4) / 2 - 0.9), (y1 + y2) / 2, 2 * r + 1.0, 1.4, (y2 - y1) + r * 0.8, bw=1.4, bl=1.5)
    elif name == 'driveTracks':
        wid = (5.6, 6.2, 6.6)[i] + 0.6
        x = e - 1.6 + wid / 2
        y0, y1 = -l / 2 - 1.0, l / 2 + 1.0
        for sx in (-1, 1):
            # A heavier riveted lip along the skirt's outer edge, armoured end caps over the mudguards.
            box(m, sx * (x + wid / 2 - 0.1), (y0 + y1) / 2, 4.6, 0.6, y1 - y0 - 5.4, 2.8, OLIVE_D)
            for y in (y0 + 0.4, y1 - 0.4):
                plate(m, sx * x, y, 7.0, wid + 0.2, 2.2, FRESH, step=1.3)
            if tier == 5:
                n = (3, 3, 4)[i]
                pl = (y1 - y0 - 6.0) / n
                for k in range(n):
                    bricks(m, sx * (x + wid / 2 - 1.3), y0 + 3.0 + pl * (k + 0.5), 7.6, 2.2, pl - 1.2, bw=1.1, bl=1.6)
    return m


def hover(size, tier, frame):
    with kit(tier):
        m = HOVER.hover(size, 3, frame)
    w, l, _ = model.DIMS[SIZES[size]]
    e = w / 2 + model.EDGE[size]
    i = 'LMH'.index(size)
    r = (2.2, 2.5, 2.8)[i] + 0.3
    x = e + 0.6 + r
    out = (2.0, 2.3, 2.6)[i] + 0.4
    for sx in (-1, 1):
        # Armoured pod nose and tail plates, a riveted spine joining the two fans.
        for y in (-l * 0.22, l * 0.22):
            for fy in (-1, 1):
                plate(m, sx * x, y + fy * (r + 1.2), 4.6, 2 * r + 1.6, 1.2, FRESH, step=1.2)
        plate(m, sx * x, 0, 4.6, 2 * r, l * 0.44 - 2 * r - 3.4, OLIVE_D, step=1.3)
        if tier == 5:
            # A vectoring thruster on each pod's outer flank and reactive bricks on the spine.
            for y in (-l * 0.22, l * 0.22):
                cyl(m, 'x', (sx * (x + r + 1.6), y, 3.0), 1.4, 1.0, GUN_D, n=10, cap=BLACK)
            bricks(m, sx * x, 0, 5.2, 2 * r - 0.6, l * 0.44 - 2 * r - 3.8, bw=1.5, bl=1.3)
    # Bow bumper over the skirt's front run.
    box(m, 0, -l / 2 - 0.2 - out * 0.55, 3.7, w - 6.4, 1.0, 0.6, OLIVE_D)
    rivet_line(m, -(w - 7.4) / 2, -l / 2 - 0.2 - out * 0.55, (w - 7.4) / 2, -l / 2 - 0.2 - out * 0.55, 4.3, step=1.6)
    return m


# --- camouflage: Mk IV two-tone, Mk V three-tone, on the armour paint only (a model texture, before the paint pass) ----

CAMO_ON = [OLIVE, OLIVE_D, FRESH]
CAMO = {4: [(0.0, np.array([0.17, 0.19, 0.10]))],
        5: [(0.0, np.array([0.22, 0.19, 0.12])), (2.1, np.array([0.56, 0.51, 0.33]))]}


def camo_field(h, w, seed):
    """Smooth blobs: a few crossing waves, about 14 native px across."""
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h, 0:w] / (model.K * 14.0)
    f = np.zeros((h, w))
    for _ in range(5):
        a = rng.uniform(0, math.pi)
        f += np.sin((xx * math.cos(a) + yy * math.sin(a)) * rng.uniform(4.5, 7.5) + rng.uniform(0, 6.3))
    return f / 5 * 2.2


def draw(mesh, tier, seed):
    tris, cols = mesh.arrays()
    rgba, albedo = model.render_top(tris, cols, model.SIZE, model.K, model.UNIT)
    rgba = rgba.astype(float)
    on = np.zeros(albedo.shape[:2], bool)
    for c in CAMO_ON:
        on |= (np.abs(albedo[..., :3] - c).sum(axis=-1) < 1e-4) & (albedo[..., 3] > 0)
    field = camo_field(*on.shape, seed)
    for k, (phase, col) in enumerate(CAMO[tier]):
        band = (field > (0.1 if tier == 4 else 0.45)) if k == 0 else (np.sin(field * 2.4 + phase) > 0.75) & (field < 0.2)
        sel = on & band
        rgba[sel, :3] *= col / OLIVE
    return model.shrink(np.clip(rgba, 0, 255).astype(np.uint8), model.K), model.mask_of(albedo, model.STRIPE, model.K)


# --- pipeline ------------------------------------------------------------------------------------------------------------

def drive_keys(fam):
    return [f'{fam}-{z}-mk{t}' for z in SIZES for t in TIERS]


SETS = {
    't45-guns': [f'{f}-mk{t}' for f in ('turretMG', 'turretCannon', 'turretRocket') for t in TIERS],
    't45-special': [f'{f}-mk{t}' for f in ('turretMortar', 'turretFlamer', 'turretLaser', 'turretRail') for t in TIERS],
    't45-hulls': [f'{h}-mk{t}' for h in HULLS for t in TIERS],
    't45-wheels': [f'{k}|{s}' for k in drive_keys('driveWheels') for s in 'LR'],
    't45-halftrack': [f'{k}|{s}' for k in drive_keys('driveHalftrack') for s in 'LR'],
    't45-tracks': [f'{k}|{s}' for k in drive_keys('driveTracks') for s in 'LR'],
    't45-hover-a': [f'{k}|{s}' for k in drive_keys('driveHover') if k.endswith('mk4') for s in 'LR'],
    't45-hover-b': [f'{k}|{s}' for k in drive_keys('driveHover') if k.endswith('mk5') for s in 'LR'],
}


def render() -> None:
    d = OUT / 'render'
    d.mkdir(parents=True, exist_ok=True)
    meta = {'muzzle': {}}
    for t in TIERS:
        for name in HULLS:
            rgba, stripe = draw(hull(name, t), t, sum(map(ord, name)) + t)
            Image.fromarray(rgba).save(d / f'{name}-mk{t}.png')
            Image.fromarray((stripe * 255).astype(np.uint8)).save(d / f'{name}-mk{t}-stripe.png')
        for name in DRIVES:
            for z in SIZES:
                for f in (0, 1, 2):
                    rgba, _ = draw(drive(name, z, t, f), t, 7 + t)
                    Image.fromarray(rgba).save(d / f'{name}-{z}-mk{t}{"" if f == 0 else f"-f{f}"}.png')
        for name, fn in TURRET_FN.items():
            mesh, muzzles = fn(t)
            rgba, _ = draw(mesh, t, len(name) * 31 + t)
            Image.fromarray(rgba).save(d / f'{name}-mk{t}.png')
            meta['muzzle'][f'{name}-mk{t}'] = [[round(x * model.UNIT, 1), round(y * model.UNIT, 1)] for x, y in muzzles]
    (d / 'meta.json').write_text(json.dumps(meta, indent=1))
    print('rendered Mk IV-V:', len(HULLS) * 2, 'hulls,', len(DRIVES) * 6, 'drives,', len(TURRET_FN) * 2, 'turrets')


def point_sheets() -> None:
    sheets.RENDER = OUT / 'render'
    sheets.SHEETS = OUT / 'sheets'
    sheets.PAINTED = OUT / 'painted'
    sheets.HERE = HERE
    sheets.SETS.update(SETS)


def retone(key: str, keep: float = 0.9) -> None:
    """Pulls a cut painting's local colour back towards the model's (the paint pass drifts camouflage to sand), keeping
    the painting's own brushwork: art + keep * (blur(model) - blur(art)), inside the part's outline."""
    p = OUT / 'painted' / f'{key}.png'
    art = arr(p)
    ren = arr(OUT / 'render' / f'{key}.png')
    on = ren[..., 3] > 0

    k = np.exp(-0.5 * (np.arange(-4, 5) / 1.3) ** 2)
    k /= k.sum()

    def smooth(x):
        x = np.apply_along_axis(lambda v: np.convolve(v, k, 'same'), 0, x)
        return np.apply_along_axis(lambda v: np.convolve(v, k, 'same'), 1, x)

    def blur(a):
        den = smooth(on.astype(float))[..., None]
        num = np.dstack([smooth(np.where(on, a[..., c], 0.0)) for c in range(3)])
        return num / np.maximum(den, 1e-3)

    art[..., :3] = np.where(on[..., None], art[..., :3] + keep * (blur(ren) - blur(art)), art[..., :3])
    save(art, p)


def arr(p: Path) -> np.ndarray:
    return np.array(Image.open(p).convert('RGBA')).astype(float)


def save(a: np.ndarray, p: Path) -> None:
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(p)


def install_drive_frames(key: str, art: np.ndarray, model_im: np.ndarray) -> None:
    """Frames 1 and 2 as hover/build.py: the painting plus the model's change, new pixels from the nearest paint."""
    ren = OUT / 'render'
    for f in (1, 2):
        fm = arr(ren / f'{key}-f{f}.png')
        frame = art.copy()
        frame[..., :3] += (fm[..., :3] - model_im[..., :3]) * 0.9
        new = (fm[..., 3] > 0) & (model_im[..., 3] == 0)
        for y, x in zip(*np.nonzero(new)):
            for rad in range(1, 4):
                win = art[max(0, y - rad):y + rad + 1, max(0, x - rad):x + rad + 1]
                on = win[..., 3] > 0
                if on.any():
                    frame[y, x, :3] = win[on][:, :3].mean(axis=0)
                    break
        frame[..., 3] = fm[..., 3]
        save(frame, DEST / f'{key}-f{f}.png')


def install() -> None:
    ren = OUT / 'render'
    meta = json.loads((ren / 'meta.json').read_text())
    man = json.loads((DEST / 'manifest.json').read_text())
    keys = [f'{h}-mk{t}' for h in HULLS for t in TIERS] + [k for d in DRIVES for k in drive_keys(d)] + \
        [f'{tu}-mk{t}' for tu in TURRETS for t in TIERS]
    missing = []
    for key in keys:
        src = OUT / 'painted' / f'{key}.png'
        model_im = arr(ren / f'{key}.png')
        if not src.exists():
            missing.append(key)
        art = arr(src) if src.exists() else model_im.copy()
        art[..., 3] = model_im[..., 3]
        stripe = ren / f'{key}-stripe.png'
        if stripe.exists():
            mask = np.array(Image.open(stripe)) > 0
            art[mask, :3] = model_im[mask, :3]
            Image.fromarray((mask * 255).astype(np.uint8)).save(DEST / f'{key}-stripe.png')
            if key not in man['stripe']:
                man['stripe'].append(key)
        save(art, DEST / f'{key}.png')
        if key.startswith('drive'):
            install_drive_frames(key, art, model_im)
            man['frames'][key] = [key, f'{key}-f1', f'{key}-f2']
        if key not in man['keys']:
            man['keys'].append(key)
    for d in DRIVES:
        for t in TIERS:
            alias, src = f'{d}-mk{t}', f'{d}-L-mk{t}'
            for suffix in ('', '-f1', '-f2'):
                shutil.copy(DEST / f'{src}{suffix}.png', DEST / f'{alias}{suffix}.png')
            man['aliases'][alias] = src
            man['frames'][alias] = [alias, f'{alias}-f1', f'{alias}-f2']
            for z in SIZES:
                man['drives'][d][z][f'mk{t}'] = f'{d}-{z}-mk{t}'
    for h in HULLS:
        for t in TIERS:
            man['ring'][f'{h}-mk{t}'] = man['ring'][f'{h}-mk3']
    man['muzzle'].update(meta['muzzle'])
    man['tiers'] = [1, 2, 3, 4, 5]
    (DEST / 'manifest.json').write_text(json.dumps(man, indent=1))
    print('installed', len(keys), 'Mk IV-V parts', '| unpainted (model render):', missing or 'none')


if __name__ == '__main__':
    cmd = sys.argv[1]
    point_sheets()
    if cmd == 'render':
        render()
    elif cmd == 'pack':
        for name in (sys.argv[2:] or SETS):
            sheets.pack(name)
    elif cmd == 'cut':
        for name in (sys.argv[2:] or SETS):
            sheets.cut(name)
            for key in dict.fromkeys(k.partition('|')[0] for k in SETS[name]):
                retone(key)
    elif cmd == 'install':
        install()
