import { type Pt } from '../../../../src/art/pen';
import { fur, rngOf } from '../../otterpocket/brush';
import { dab, softLine, step01, taper, turn } from '../../seal/art/paint';
import { type HeadLook, paintCrowHead } from './crowHead';
import { fillShape, groundShadow, inkLine, linear, P, spline, within } from './ink';
import { paintLeg } from './crowLeg';

/**
 * The carrion crow, side on, painted: all black but never a flat silhouette.
 * Blue-violet gloss on the back and coverts, green on the flight feathers,
 * every long feather with its own lit edge, shaggy throat and thighs, a pale
 * rim of sky light along the back. Local units: facing right (+x), y down,
 * feet at 0,0; a standing bird is about 420 tall and 620 long.
 */
export interface CrowHead extends HeadLook {
  /** Skull middle from the hips, level units (x ahead, y down). */
  readonly x: number;
  readonly y: number;
  /** Bill direction (0 ahead, positive down). */
  readonly a: number;
}

export interface CrowPose {
  readonly x: number;
  readonly y: number;
  /** Screen px per unit. */
  readonly k: number;
  /** 1 facing right, -1 left. */
  readonly face: number;
  /** Body tilt: negative breast up. */
  readonly pitch: number;
  /** Tail's own turn (positive droops). */
  readonly tail: number;
  /** Hip height above the ground, units. */
  readonly hip: number;
  readonly head: CrowHead;
  /** Walking phase (radians) and amount. */
  readonly step: number;
  readonly walk: number;
  /** The near foot's toes lifted, 0..1 (tapping). */
  readonly tap: number;
  /** Feathers ruffled by wind, 0..1. */
  readonly ruffle: number;
  readonly shadow: number;
}

export const HIP = 168;
export const CROW: CrowPose = {
  x: 0, y: 0, k: 1, face: 1, pitch: -0.42, tail: 0.1, hip: HIP,
  head: { x: 128, y: -196, a: 0.06, gape: 0, look: { x: 0, y: 0 }, lid: 0, brow: 0.2, nut: false },
  step: 0, walk: 0, tap: 0, ruffle: 0, shadow: 0.5,
};

const BODY: readonly Pt[] = spline(P(168, -20, 152, -66, 112, -96, 48, -106, -40, -100, -128, -82, -204, -56, -226, -34, -196, -2, -140, 34, -60, 66, 20, 78, 92, 64, 146, 24), 6, true);

/** A long feather from its root `b` to its tip `t`, `w` wide, bowed sideways; lit along its upper edge. */
function feather(ctx: CanvasRenderingContext2D, b: Pt, t: Pt, w: number, bow: number, inks: readonly [string, string, string], boil: number, edge = 0.6): void {
  const len = Math.hypot(t.x - b.x, t.y - b.y) || 1;
  const d = { x: (t.x - b.x) / len, y: (t.y - b.y) / len };
  // The upper side (towards -y).
  const n = d.x < 0 ? { x: d.y, y: -d.x } : { x: -d.y, y: d.x };
  const up = n.y > 0 ? { x: -n.x, y: -n.y } : n;
  const at = (u: number, v: number): Pt => ({ x: b.x + d.x * len * u + up.x * (v + bow * 4 * u * (1 - u)), y: b.y + d.y * len * u + up.y * (v + bow * 4 * u * (1 - u)) });
  const shape = spline([at(0, w * 0.16), at(0.3, w * 0.46), at(0.72, w * 0.5), at(0.93, w * 0.34), at(1, 0), at(0.93, -w * 0.4), at(0.7, -w * 0.5), at(0.3, -w * 0.42), at(0, -w * 0.14)], 4, true);
  const m = at(0.5, 0);
  // The upper side lies in the shadow of the feather over it; the outer (lower) edge catches the light.
  fillShape(ctx, shape, linear(ctx, m.x + up.x * w * 0.5, m.y + up.y * w * 0.5, m.x - up.x * w * 0.5, m.y - up.y * w * 0.5, [[0, inks[2]], [0.45, inks[2]], [0.78, inks[1]], [1, inks[0]]]));
  within(ctx, shape, () => {
    softLine(ctx, [at(0.04, w * 0.4), at(0.5, w * 0.4), at(0.95, w * 0.2)], w * 0.5, '#04040a', 0.5, 4);
    for (let i = 2; i < 12; i++) softLine(ctx, [at(i / 13, 0), at(i / 13 + 0.06, -w * 0.48)], 1, '#b4bee4', 0.1, 1);
    softLine(ctx, [at(0.15, -w * 0.44), at(0.6, -w * 0.5), at(0.92, -w * 0.4), at(1, 0)], Math.max(2, w * 0.15), '#a3afd8', edge * 0.36, 3);
    softLine(ctx, [at(0.02, 0), at(0.5, 0), at(0.95, 0)], 1.5, '#08080d', 0.6, 1);
  });
  inkLine(ctx, shape, 0.8, 0.7, boil, true, '#08080d');
}

const VIOLET = ['#4c5080', '#25263a', '#0f0f15'] as const;
const BLUE = ['#3c4a6e', '#1c2132', '#0d0d13'] as const;
const SOFT = ['#383b58', '#1f2030', '#101017'] as const;
const GREEN = ['#37626a', '#182a31', '#0c0e12'] as const;

function paintTail(ctx: CanvasRenderingContext2D, p: CrowPose, boil: number): void {
  ctx.save();
  ctx.translate(-196, -34);
  ctx.rotate(-p.tail);
  for (let i = 4; i >= 0; i--) {
    const u = i / 4;
    feather(ctx, { x: 10, y: -8 + u * 30 }, { x: -206 + u * 26, y: -18 + u * 48 }, 42, 2, i % 2 ? BLUE : GREEN, boil, 0.5);
  }
  ctx.restore();
}

function paintBody(ctx: CanvasRenderingContext2D, boil: number): void {
  fillShape(ctx, BODY, linear(ctx, 20, -106, -10, 80, [[0, '#3c4058'], [0.25, '#20222e'], [0.6, '#131319'], [0.88, '#131217'], [1, '#332e33']]));
  within(ctx, BODY, () => {
    dab(ctx, 70, 20, 110, '52,60,96', 0.4);
    dab(ctx, 130, -10, 70, '70,80,124', 0.35);
    dab(ctx, -80, 60, 90, '6,6,10', 0.5);
  });
  fur(ctx, rngOf(203), BODY, {
    count: 620, dir: (q) => Math.PI - 0.1 - (q.y / 90) * 0.45, len: [16, 40], width: 3.6,
    inks: [['#8a92b8', 0.14], ['#07070b', 0.42], ['#454e70', 0.22], ['#0b0b10', 0.4], ['#35585f', 0.14]],
  });
  inkLine(ctx, BODY, 1.6, 0.8, boil, true, '#08080d');
}

function paintWing(ctx: CanvasRenderingContext2D, p: CrowPose, boil: number): void {
  const r = p.ruffle;
  const flap = (i: number): number => r * 7 * Math.sin(i * 1.7 + boil * 2.1);
  // Primaries: a narrow stack running to the wing tip over the tail.
  for (let i = 0; i < 6; i++) feather(ctx, { x: -70 - i * 4, y: 6 - i * 6 }, { x: -346 + (5 - i) * 24, y: 10 - i * 9 + flap(i) }, 30, -4, i % 2 ? BLUE : GREEN, boil, 0.7);
  // Secondaries and tertials.
  for (let i = 0; i < 6; i++) feather(ctx, { x: 20 - i * 6, y: 46 - i * 15 }, { x: -196 - i * 12, y: 32 - i * 13 + flap(i + 4) }, 38, 4, i % 3 === 1 ? GREEN : i % 3 ? VIOLET : BLUE, boil, 0.75);
  // Greater coverts.
  for (let i = 0; i < 8; i++) {
    const u = i / 7;
    feather(ctx, { x: 82 - u * 26, y: 44 - u * 104 }, { x: -52 - u * 62, y: 44 - u * 104 + flap(i + 2) }, 31, 5, i % 3 === 2 ? BLUE : VIOLET, boil, 0.6);
  }
  // Median coverts, shorter and softer.
  for (let i = 0; i < 8; i++) {
    const u = i / 7;
    feather(ctx, { x: 104 - u * 18, y: 28 - u * 102 }, { x: 26 - u * 46 + 6 * Math.sin(i * 2.2), y: 34 - u * 104 }, 28, 4, i % 2 ? SOFT : BLUE, boil, 0.3);
  }
  // Lesser coverts and the mantle: soft overlapping strokes, no hard edges.
  const shoulder = spline(P(134, -40, 120, -84, 60, -104, -20, -100, -120, -82, -96, -70, 10, -66, 62, -30, 78, 20, 108, 26), 5, true);
  fillShape(ctx, shoulder, linear(ctx, 60, -104, 80, 30, [[0, '#474c70'], [0.4, '#23253a'], [1, '#13131b']]), 0.9);
  fur(ctx, rngOf(404), shoulder, {
    count: 340, dir: (q) => Math.PI - 0.12 - (q.x > 70 ? 0.5 * ((q.y + 40) / 70) : 0), len: [18, 34], width: 5.5,
    inks: [['#8f97c8', 0.18], ['#08080d', 0.35], ['#565e92', 0.26], ['#0e0e14', 0.35]],
  });
}

/** The neck's two edges, from the head's nape and throat down into the body, level units from the hips. */
function neckShape(p: CrowPose): { readonly nape: readonly Pt[]; readonly throat: readonly Pt[] } {
  const h = p.head;
  const O = { x: 0, y: 0 };
  const on = (q: Pt): Pt => { const r = turn(q, O, h.a); return { x: h.x + r.x, y: h.y + r.y }; };
  const body = (q: Pt): Pt => turn(q, O, p.pitch);
  const bez = (a: Pt, b: Pt, c: Pt, d: Pt): Pt[] => Array.from({ length: 17 }, (_, i) => {
    const u = i / 16;
    const v = 1 - u;
    const f = (w: number, x: number, y: number, z: number): number => v * v * v * w + 3 * v * v * u * x + 3 * v * u * u * y + u * u * u * z;
    return { x: f(a.x, b.x, c.x, d.x), y: f(a.y, b.y, c.y, d.y) };
  });
  const gap = Math.hypot(h.x - body({ x: 110, y: -40 }).x, h.y - body({ x: 110, y: -40 }).y);
  const reach = 22 + gap * 0.28;
  const n0 = on({ x: -36, y: -46 });
  const n1 = on({ x: -36 - reach, y: -46 + reach * 0.35 });
  const n3 = body({ x: 10, y: -104 });
  // Bowed low, the nape runs on over the shoulder in one line before it turns down.
  const low = step01(h.y, -150, -10);
  const n2 = body({ x: 10 + reach * (1.1 + 0.5 * low), y: -108 - 6 * low });
  const t0 = on({ x: 20, y: 48 });
  const t1 = on({ x: 8 - reach * 0.6, y: 64 + reach * 0.15 });
  const t3 = body({ x: 146, y: 30 });
  const t2 = body({ x: 168, y: 0 - reach * 0.4 });
  return { nape: bez(n0, n1, n2, n3), throat: bez(t0, t1, t2, t3) };
}

function paintNeck(ctx: CanvasRenderingContext2D, p: CrowPose, boil: number): void {
  const { nape, throat } = neckShape(p);
  const shape = [...nape, ...[...throat].reverse()];
  const mid = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  const top = nape[8]!;
  const low = throat[8]!;
  fillShape(ctx, shape, linear(ctx, top.x, top.y, low.x, low.y, [[0, '#3f445e'], [0.25, '#22242f'], [0.65, '#14141b'], [1, '#131318']]));
  const rng = rngOf(909);
  within(ctx, shape, () => {
    const c = mid(top, low, 0.4);
    dab(ctx, c.x, c.y, 60, '66,74,122', 0.35);
    // Feathers laid down the neck, from the head to the body.
    for (let i = 0; i < 460; i++) {
      const v = rng();
      const s = rng();
      const j = Math.min(14, Math.floor(s * 15));
      const a = mid(nape[j]!, throat[j]!, v);
      const b = mid(nape[Math.min(16, j + 3)]!, throat[Math.min(16, j + 3)]!, v + (rng() - 0.5) * 0.06);
      const ink = (['#8a93be', '#08080d', '#474f74', '#0d0d13', '#39606a'] as const)[i % 5]!;
      taper(ctx, [a, b], 4.2, 0.8, ink, i % 5 === 1 || i % 5 === 3 ? 0.4 : 0.24);
    }
  });
  // Shaggy throat hackles breaking the front edge.
  for (let i = 0; i < 26; i++) {
    const j = 2 + (i % 11);
    const a = throat[j]!;
    const b = throat[Math.min(16, j + 4)]!;
    const out = { x: -(b.y - a.y), y: b.x - a.x };
    const l = Math.hypot(out.x, out.y) || 1;
    const k = -(2 + rng() * 5);
    const s = mid(a, nape[j]!, 0.02 + rng() * 0.1);
    taper(ctx, [s, mid(s, b, 0.6), { x: b.x + (out.x / l) * k, y: b.y + (out.y / l) * k }], 8, 0.8, i % 3 ? '#131319' : '#31364c', 0.95);
  }
  inkLine(ctx, nape, 1.6, 0.85, boil, false, '#0b0b11');
  softLine(ctx, nape.map((q) => ({ x: q.x + 2, y: q.y + 5 })), 8, '#b9c4ec', 0.55, 4);
}

export function drawCrow(ctx: CanvasRenderingContext2D, p: CrowPose, boil: number): void {
  if (p.shadow > 0) groundShadow(ctx, p.x - p.face * 40 * p.k, p.y + 4 * p.k, 250 * p.k, 34 * p.k, p.shadow);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.k * p.face, p.k);
  ctx.translate(0, -p.hip);
  const turned = (paint: () => void): void => {
    ctx.save();
    ctx.rotate(p.pitch);
    paint();
    ctx.restore();
  };
  const hips = turn({ x: -14, y: 52 }, { x: 0, y: 0 }, p.pitch);
  paintLeg(ctx, p, { x: hips.x + 34, y: hips.y - 8 }, true, boil);
  turned(() => {
    paintTail(ctx, p, boil);
    paintBody(ctx, boil);
  });
  paintNeck(ctx, p, boil);
  paintLeg(ctx, p, hips, false, boil);
  turned(() => {
    paintWing(ctx, p, boil);
    // Flank feathers lapping over the thigh's top and the wing's lower edge; the rim of sky light along the back.
    softLine(ctx, spline(P(-200, -60, -128, -84, -40, -100, 40, -106), 6), 9, '#c2ccf2', 0.6, 4);
    inkLine(ctx, spline(P(-206, -56, -128, -83, -40, -101, 48, -107), 6), 1.4, 0.8, boil, false, '#0b0b11');
  });
  // Feathers from the neck fanning over the shoulder, so there's no seam.
  const { nape, throat } = neckShape(p);
  const rng = rngOf(1201);
  for (let i = 0; i < 90; i++) {
    const v = 0.06 + rng() * 0.8;
    const a = { x: nape[12]!.x + (throat[12]!.x - nape[12]!.x) * v, y: nape[12]!.y + (throat[12]!.y - nape[12]!.y) * v };
    const c = { x: nape[16]!.x + (throat[16]!.x - nape[16]!.x) * v, y: nape[16]!.y + (throat[16]!.y - nape[16]!.y) * v };
    taper(ctx, [a, c, { x: c.x + (c.x - a.x) * (0.5 + rng() * 0.5), y: c.y + (c.y - a.y) * (0.5 + rng() * 0.5) }], 6.5, 0.8, (['#4c5278', '#131319', '#272a3c', '#0c0c11'] as const)[i % 4]!, i % 4 === 0 ? 0.4 : 0.6);
  }
  ctx.save();
  ctx.translate(p.head.x, p.head.y);
  ctx.rotate(p.head.a);
  paintCrowHead(ctx, p.head, boil);
  ctx.restore();
  // The head's feathers run on down the neck, so there's no edge between them.
  const O = { x: 0, y: 0 };
  for (let i = 0; i < 230; i++) {
    const v = rng();
    const q = turn({ x: -16 - rng() * 34 + 34 * v * rng(), y: -44 + 98 * v }, O, p.head.a);
    const s = { x: p.head.x + q.x, y: p.head.y + q.y };
    const a = { x: nape[4]!.x + (throat[4]!.x - nape[4]!.x) * v, y: nape[4]!.y + (throat[4]!.y - nape[4]!.y) * v };
    const e = { x: nape[7]!.x + (throat[7]!.x - nape[7]!.x) * v, y: nape[7]!.y + (throat[7]!.y - nape[7]!.y) * v };
    const t = 0.4 + rng() * 0.6;
    taper(ctx, [s, { x: s.x + (a.x - s.x) * t, y: s.y + (a.y - s.y) * t }, { x: s.x + (e.x - s.x) * t, y: s.y + (e.y - s.y) * t }], 5, 0.7, (['#171820', '#3a3f58', '#0c0c11', '#22242f', '#767fae'] as const)[i % 5]!, i % 5 === 4 ? 0.22 : 0.55);
  }
  ctx.restore();
}

/** Where a point of the head's frame is on screen. */
export function headToScreen(p: CrowPose, q: Pt): Pt {
  const r = turn(q, { x: 0, y: 0 }, p.head.a);
  return { x: p.x + p.face * p.k * (p.head.x + r.x), y: p.y + p.k * (p.head.y + r.y - p.hip) };
}

