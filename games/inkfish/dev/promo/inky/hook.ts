import { lerp, ramp } from '../short';
import { type Pt, spline } from '../octopus/geom';
import { drawHall, drawHandle, drawLid, drawTankBack, drawTankFront, NIGHT_LIGHT, type Tank } from './hall';
import { type Arm, drawArm, drawHub, drawOctoBody, drawOctoEyes, drawWeb, drips, meltInto, type Octo } from './octo';
import { glow, type Light } from './paint';
import { AQUARIUM_AT, cycles, OUT_AT } from './story';

/**
 * The hook: Inky halfway out over the rim of a glass tank, huge, looking at
 * us. Arms hang down the outside of the glass and hold the tipped-up lid;
 * others are still in the water, suckers flat on the glass. Dripping.
 */

export const TANK: Tank = { xL: 46, xR: 1034, rim: 1010, base: 1890, inset: 120, rise: 92, water: 46, frame: 40 };

export interface HookState {
  readonly octo: Octo;
  readonly near: readonly Arm[];
  readonly inside: readonly Arm[];
  readonly lidA: Pt;
  readonly lidB: Pt;
  readonly zoom: number;
}

/** Everything in the hook at loop time t, hook clock h (0 at frame 1, negative as it comes round). */
export function hookAt(t: number, h: number): HookState {
  // The lurch on "OUT": up and towards us; it settles as the cut comes.
  const out = ramp(h, OUT_AT - 0.12, OUT_AT + 0.3);
  const reach = ramp(h, 0.15, 1.0);
  const tip = ramp(h, AQUARIUM_AT, AQUARIUM_AT + 0.55);
  const w = (n: number, p: number, a: number): number => a * Math.sin(cycles(n, t) + p);
  const up = -26 * out;
  const lean = -18 * out;
  const axis = spline([
    { x: 572, y: 1076 + up * 0.2 },
    { x: 568, y: 990 + up * 0.4 },
    { x: 560 + lean * 0.2 + w(5, 0, 3), y: 900 + up * 0.6 },
    { x: 536 + lean * 0.4 + w(5, 0.3, 5), y: 770 + up },
    { x: 494 + lean * 0.7 + w(5, 0.6, 7), y: 630 + up },
    { x: 440 + lean + w(5, 0.9, 10), y: 480 + up * 1.1 },
    { x: 392 + lean * 1.3 + w(5, 1.2, 13), y: 342 + up * 1.2 },
    { x: 366 + lean * 1.4 + w(5, 1.5, 14), y: 252 + up * 1.2 },
  ], 12);
  const blink = h > 1.86 && h < 2.06 ? Math.sin(((h - 1.86) / 0.2) * Math.PI) : 0;
  const octo: Octo = {
    axis,
    size: 208,
    turn: 0.36 + 0.03 * Math.sin(cycles(2, t)),
    gaze: { x: lerp(0.1, -0.3, ramp(h, 0.5, 0.9) * (1 - ramp(h, 1.2, 1.4))), y: 0.15 },
    lid: 0.08 + 0.92 * blink,
    breathe: 1 + 0.018 * Math.sin(cycles(10, t)),
  };
  const near: Arm[] = [
    // Left, along the rim and down the glass, its tip curling over.
    { path: spline([{ x: 470, y: 940 + up * 0.4 }, { x: 350, y: 928 + up * 0.4 }, { x: 220, y: 950 + w(5, 0, 5) }, { x: 120, y: 1010 + w(5, 0.6, 6) }, { x: 84 + w(4, 1, 8), y: 1110 }, { x: 130 + w(4, 1.6, 12), y: 1210 - 18 * reach }, { x: 226 + w(4, 2, 12), y: 1222 - 26 * reach }, { x: 262 + w(4, 2.4, 12), y: 1150 - 22 * reach }, { x: 214 + w(4, 2.6, 10), y: 1112 - 14 * reach }], 10), w: 62, band: (s) => lerp(1.5, 0.15, Math.min(1, Math.max(0, (s - 0.3) / 0.4))), seed: 4201 },
    // Front left, down the outside of the glass.
    { path: spline([{ x: 505, y: 968 }, { x: 468, y: 1060 }, { x: 420 + w(5, 1, 5), y: 1170 }, { x: 396 + w(5, 1.5, 9), y: 1290 }, { x: 440 + w(4, 2, 14), y: 1396 + 14 * out }, { x: 540 + w(4, 2.4, 16), y: 1420 + 18 * out }, { x: 584 + w(4, 2.8, 16), y: 1346 + 10 * out }, { x: 536 + w(4, 3, 12), y: 1306 }], 10), w: 60, band: (s) => lerp(1.45, 0.1, Math.min(1, Math.max(0, (s - 0.35) / 0.3))), seed: 4202 },
    // Front right: the slap on the glass on "OUT".
    { path: spline([{ x: 636, y: 964 }, { x: 706, y: 1050 - 20 * out }, { x: 790 + 14 * out + w(5, 2, 5), y: 1140 - 30 * out }, { x: 862 + 22 * out + w(5, 2.6, 8), y: 1262 - 50 * out }, { x: 846 + 26 * out + w(4, 3, 12), y: 1394 - 50 * out }, { x: 752 + 14 * out + w(4, 3.4, 14), y: 1426 - 40 * out }, { x: 716 + w(4, 3.8, 12), y: 1350 - 30 * out }, { x: 766 + w(4, 4, 10), y: 1316 - 20 * out }], 10), w: 60, band: (s) => lerp(-1.45, -0.1, Math.min(1, Math.max(0, (s - 0.35) / 0.3))), seed: 4203 },
    // Right: up and over the edge of the lid.
    { path: spline([{ x: 672, y: 936 + up * 0.4 }, { x: 770, y: 930 + up * 0.4 }, { x: 874, y: 886 + w(5, 3, 4) }, { x: 944, y: 806 + w(5, 3.2, 5) - 10 * tip }, { x: 940, y: 706 - 12 * tip }, { x: 872, y: 652 - 12 * tip + w(4, 4, 7) }, { x: 800, y: 674 + w(4, 4.4, 9) }, { x: 790, y: 730 + w(4, 4.8, 8) }, { x: 832, y: 744 + w(4, 5, 6) }], 10), w: 58, band: (s) => lerp(1.4, 0.2, Math.min(1, Math.max(0, (s - 0.4) / 0.35))), seed: 4204 },
  ];
  const inside: Arm[] = [
    { path: spline([{ x: 430, y: 985 }, { x: 330, y: 1090 }, { x: 236, y: 1260 }, { x: 196 + w(3, 0, 8), y: 1440 }, { x: 256 + w(3, 0.6, 12), y: 1600 }, { x: 360 + w(3, 1, 14), y: 1640 }, { x: 404 + w(3, 1.4, 12), y: 1560 }, { x: 350 + w(3, 1.8, 8), y: 1530 }], 10), w: 66, band: () => 0.05, seed: 4211, pressed: true },
    { path: spline([{ x: 600, y: 990 }, { x: 622, y: 1120 }, { x: 640, y: 1290 }, { x: 606 + w(3, 2, 8), y: 1490 }, { x: 640 + w(3, 2.5, 14), y: 1660 }, { x: 740 + w(3, 3, 16), y: 1720 }, { x: 800 + w(3, 3.4, 12), y: 1650 }], 10), w: 66, band: () => -0.08, seed: 4212, pressed: true },
    { path: spline([{ x: 720, y: 985 }, { x: 830, y: 1060 }, { x: 934, y: 1200 }, { x: 962 + w(3, 4, 7), y: 1390 }, { x: 900 + w(3, 4.4, 12), y: 1560 }, { x: 930 + w(3, 4.8, 14), y: 1680 }, { x: 996 + w(3, 5.2, 10), y: 1690 }], 10), w: 64, band: () => 0.1, seed: 4213, pressed: true },
  ];
  return { octo, near, inside, lidA: { x: 1078, y: 950 }, lidB: { x: 640 - 26 * out - 20 * tip, y: 372 - 34 * out - 34 * tip }, zoom: 1 + 0.035 * ramp(h, 0, 2.4) };
}

const UNDER: Light = { ...NIGHT_LIGHT, key: [-0.2, -0.8, 0.75], ambient: 0.34, tint: [60, 150, 150], tintK: 0.1 };

export function drawHook(ctx: CanvasRenderingContext2D, t: number, h: number, boil: number): void {
  const s = hookAt(t, h);
  ctx.save();
  ctx.translate(540, 860);
  ctx.scale(s.zoom, s.zoom);
  ctx.translate(-540, -860);
  drawHall(ctx, t, { x: 380, y: -60, w: 620, a: 1 });
  // A warm halo behind it, so the orange stands off the blue.
  glow(ctx, 440, 560, 560, 620, [255, 150, 66], 0.2, 'lighter');
  drawTankBack(ctx, TANK, t, boil, { rocks: true });
  drawLid(ctx, s.lidA, s.lidB, { x: 96, y: -128 }, 30, boil);
  const mid = { x: (s.lidA.x + s.lidB.x) / 2 + 80, y: (s.lidA.y + s.lidB.y) / 2 - 150 };
  drawHandle(ctx, mid, { x: 46, y: 62 }, boil);
  for (const a of s.inside) drawArm(ctx, a, UNDER, boil);
  drawTankFront(ctx, TANK, t, boil);
  // Its shadow and warm reflection on the rim.
  glow(ctx, 560, 1034, 330, 70, [10, 8, 14], 0.6);
  drawHub(ctx, 570, 1030, 140, 90, NIGHT_LIGHT);
  drawOctoBody(ctx, s.octo, NIGHT_LIGHT, boil);
  const [left, fl, fr, right] = s.near as [Arm, Arm, Arm, Arm];
  const face = { x: 550, y: 872, rx: 224, ry: 190, core: 0.6 };
  meltInto(ctx, face, (l) => {
    drawHub(l, 570, 1010, 120, 90, NIGHT_LIGHT);
    drawArm(l, right, NIGHT_LIGHT, boil);
    drawArm(l, left, NIGHT_LIGHT, boil);
    drawWeb(l, left.path, fl.path, 0.34, NIGHT_LIGHT, boil, 331);
    drawWeb(l, fr.path, right.path, 0.32, NIGHT_LIGHT, boil, 332);
    drawWeb(l, fl.path, fr.path, 0.34, NIGHT_LIGHT, boil, 333);
    drawArm(l, fl, NIGHT_LIGHT, boil);
    drawArm(l, fr, NIGHT_LIGHT, boil);
  });
  drawOctoEyes(ctx, s.octo, NIGHT_LIGHT, boil);
  // Water running off it.
  const wet: readonly (readonly [number, number, number])[] = [[250, 968, 11], [128, 1060, 9], [330, 944, 8], [470, 1424, 10], [548, 1446, 9], [800, 1424, 10], [700, 960, 7], [842, 780, 9], [1000, 900, 8]];
  wet.forEach(([x, y, n], i) => drips(ctx, { x, y }, t, n / 22.5, 190, i));
  ctx.restore();
}
