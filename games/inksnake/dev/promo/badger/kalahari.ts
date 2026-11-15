import { createRng, type Rng } from '../../../src/logic/rng';
import { glaze } from '../../../src/art/snakes/cornPaint';
import { makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { mix, rgba } from '../../../src/art/wash';

/**
 * The Kalahari in warm light, painted once per framing: a pale hot sky
 * (or, at `dusk`, the evening's deep blue over a low orange glow), a far
 * line of red dunes with a few distant thorn trees, the red sand running
 * to the foreground with its ripples, pebbles and grains, clumps of dry
 * golden grass, and a camel thorn (Vachellia erioloba): a dark, fissured,
 * twisted trunk and a broad flat-topped crown of small grey-green leaves.
 */
export interface VeldFrame {
  readonly width: number;
  readonly height: number;
  /** Where the far dunes meet the sky. */
  readonly horizon: number;
  /** 0 the day's warm light .. 1 evening. */
  readonly dusk: number;
  /** The camel thorn: its trunk's foot and its height, or none. */
  readonly tree?: { readonly x: number; readonly base: number; readonly h: number; readonly flip?: boolean };
  /** Tussocks: x, the ground y of their foot, size. */
  readonly tussocks: readonly (readonly [number, number, number])[];
  /** Where the sun or its glow sits, as a share of the width. */
  readonly sun: number;
}

const DAY = {
  skyTop: '#9fc1d4', skyMid: '#dfe3d2', skyLow: '#f4dcb0', dune: '#c96f42', duneFar: '#d99a72',
  sand: '#d9844c', sandLit: '#efa766', sandDeep: '#a9542e', grass: ['#d8b468', '#c69f52', '#e6ca86', '#a8863e', '#f0d9a0'], shadow: '#5a2a18',
} as const;
const DUSK = {
  skyTop: '#2a3560', skyMid: '#a3607a', skyLow: '#f29a52', dune: '#6e3a3a', duneFar: '#8e4e4a',
  sand: '#a2583c', sandLit: '#d68350', sandDeep: '#5e2e24', grass: ['#b48450', '#9a7040', '#cc9a5c', '#7a5634', '#dcae70'], shadow: '#2a1416',
} as const;

const tone = (key: Exclude<keyof typeof DAY, 'grass'>, dusk: number): string => mix(DAY[key], DUSK[key], dusk);

function sky(ctx: CanvasRenderingContext2D, f: VeldFrame): void {
  const g = ctx.createLinearGradient(0, 0, 0, f.horizon);
  g.addColorStop(0, tone('skyTop', f.dusk));
  g.addColorStop(0.62, tone('skyMid', f.dusk));
  g.addColorStop(1, tone('skyLow', f.dusk));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, f.width, f.horizon + 4);
  const sx = f.sun * f.width;
  const glow = ctx.createRadialGradient(sx, f.horizon, 10, sx, f.horizon, f.width * 0.9);
  glow.addColorStop(0, rgba(mix('#fff1c8', '#ffb060', f.dusk), 0.75));
  glow.addColorStop(0.4, rgba(mix('#ffe6b0', '#f07a40', f.dusk), 0.25));
  glow.addColorStop(1, rgba('#ffe6b0', 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, f.width, f.horizon + 4);
  if (f.dusk > 0.5) {
    // The low sun itself, sitting on the dunes.
    const r = 46;
    ctx.fillStyle = rgba('#ffd890', 0.9 * (f.dusk - 0.5) * 2);
    ctx.beginPath();
    ctx.arc(sx, f.horizon - r * 0.35, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // A few long thin clouds, lit from below.
  const rng = createRng(9100);
  for (let i = 0; i < 5; i++) {
    const y = f.horizon * (0.25 + rng() * 0.5);
    glaze(ctx, rng() * f.width, y, 160 + rng() * 220, 7 + rng() * 6, 0, mix('#ffffff', '#f0a070', f.dusk), 0.3);
  }
}

function dunes(pen: Pen, f: VeldFrame): void {
  const { ctx } = pen;
  const rng = createRng(9200);
  for (const [lift, colour, amp] of [[46, tone('duneFar', f.dusk), 14], [0, tone('dune', f.dusk), 22]] as const) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(0, f.height);
    const phase = rng() * 6;
    for (let x = 0; x <= f.width; x += 12) ctx.lineTo(x, f.horizon - lift - amp * (0.6 + 0.4 * Math.sin(x / 210 + phase)) * (0.7 + 0.3 * Math.sin(x / 67 + phase * 2)));
    ctx.lineTo(f.width, f.height);
    ctx.closePath();
    ctx.fill();
  }
  // Distant thorn trees on the dunes.
  for (let i = 0; i < 5; i++) {
    const x = rng() * f.width;
    const y = f.horizon - 18 - rng() * 14;
    const s = 0.4 + rng() * 0.5;
    ctx.fillStyle = rgba(mix('#5a5a3a', '#2a2030', f.dusk), 0.55);
    ctx.fillRect(x - 1.5 * s, y - 26 * s, 3 * s, 26 * s);
    ctx.beginPath();
    ctx.ellipse(x, y - 30 * s, 34 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function sand(pen: Pen, f: VeldFrame): void {
  const { ctx } = pen;
  const top = f.horizon - 10;
  const g = ctx.createLinearGradient(0, top, 0, f.height);
  g.addColorStop(0, tone('dune', f.dusk));
  g.addColorStop(0.12, tone('sandLit', f.dusk));
  g.addColorStop(0.5, tone('sand', f.dusk));
  g.addColorStop(1, tone('sandDeep', f.dusk));
  ctx.fillStyle = g;
  ctx.fillRect(0, top + 12, f.width, f.height - top);
  ctx.beginPath();
  ctx.moveTo(0, f.height);
  for (let x = 0; x <= f.width; x += 12) ctx.lineTo(x, f.horizon + 6 + 5 * Math.sin(x / 140));
  ctx.lineTo(f.width, f.height);
  ctx.closePath();
  ctx.fill();
  const rng = createRng(9300);
  // Broad soft patches of light and shade, then the wind ripples, finer far away.
  for (let i = 0; i < 26; i++) {
    const y = f.horizon + rng() * (f.height - f.horizon);
    const k = (y - f.horizon) / (f.height - f.horizon);
    glaze(ctx, rng() * f.width, y, 120 + k * 260, 16 + k * 50, 0, rng() < 0.5 ? tone('sandLit', f.dusk) : tone('sandDeep', f.dusk), 0.22);
  }
  for (let i = 0; i < 240; i++) {
    const y = f.horizon + 10 + rng() * (f.height - f.horizon);
    const k = (y - f.horizon) / (f.height - f.horizon);
    const x = rng() * f.width;
    const len = 20 + k * 110 + rng() * 40;
    const pts: Pt[] = [];
    for (let s = 0; s <= 6; s++) pts.push({ x: x + (s / 6) * len, y: y + Math.sin((s / 6) * Math.PI) * -k * 5 + s * k * 0.6 });
    pen.hair(pts, 0.8 + k * 2, tone('sandDeep', f.dusk), 0.16 + k * 0.12);
    pen.hair(pts.map((p) => ({ x: p.x + 2, y: p.y - 1.5 - k * 2 })), 0.6 + k * 1.4, tone('sandLit', f.dusk), 0.14 + k * 0.1);
  }
  // Grains and pebbles in the foreground.
  for (let i = 0; i < 1400; i++) {
    const y = f.horizon + rng() * (f.height - f.horizon);
    const k = (y - f.horizon) / (f.height - f.horizon);
    if (rng() > k + 0.15) continue;
    pen.dot(rng() * f.width, y, 0.6 + k * 1.8 * rng(), rng() < 0.5 ? tone('sandDeep', f.dusk) : mix(tone('sandLit', f.dusk), '#fff0d0', 0.4), 0.35 + rng() * 0.3);
  }
  for (let i = 0; i < 30; i++) {
    const y = f.horizon + 40 + rng() * (f.height - f.horizon - 40);
    const k = (y - f.horizon) / (f.height - f.horizon);
    const x = rng() * f.width;
    const r = 3 + k * 9 * (0.5 + rng());
    glaze(ctx, x + r * 0.6, y + r * 0.5, r * 1.4, r * 0.5, 0, tone('shadow', f.dusk), 0.4);
    ctx.fillStyle = mix(tone('sandDeep', f.dusk), '#8a7a6a', 0.4);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.66, rng(), 0, Math.PI * 2);
    ctx.fill();
    glaze(ctx, x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.35, 0, '#fff0d8', 0.4);
  }
}

/** A clump of dry grass: blades fanning up from a tight foot, gold and straw, a few seed heads; a soft shadow at its foot. */
export function tussock(pen: Pen, x: number, y: number, size: number, dusk: number, seed: number): void {
  const { ctx } = pen;
  const rng = createRng(seed);
  glaze(ctx, x + size * 0.5, y + size * 0.06, size * 0.9, size * 0.12, 0, tone('shadow', dusk), 0.45);
  const blades = Math.round(28 + size * 0.3);
  for (let i = 0; i < blades; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 1.9;
    const len = size * (0.5 + rng() * 0.7);
    const bend = (rng() - 0.5) * 0.9 + Math.sign(Math.cos(a)) * 0.3;
    const x0 = x + (rng() - 0.5) * size * 0.25;
    const pts: Pt[] = [];
    for (let s = 0; s <= 8; s++) {
      const u = s / 8;
      const aa = a + bend * u * u;
      pts.push({ x: x0 + Math.cos(aa) * len * u, y: y + Math.sin(aa) * len * u });
    }
    const colours = mix(DAY.grass[i % 5]!, DUSK.grass[i % 5]!, dusk);
    pen.hair(pts, Math.max(1, size * 0.022), i % 4 === 0 ? mix(colours, '#5a3e20', 0.5) : colours, 0.92);
    if (rng() < 0.18) {
      const tip = pts[pts.length - 1]!;
      for (let k = 0; k < 4; k++) pen.dot(tip.x + (rng() - 0.5) * 4, tip.y + k * 3, size * 0.012 + 0.8, mix('#f4e2b0', '#d8a070', dusk), 0.9);
    }
  }
}

function camelThorn(pen: Pen, f: VeldFrame, rng: Rng): void {
  const t = f.tree;
  if (!t) return;
  const { ctx } = pen;
  const s = t.flip ? -1 : 1;
  const bark = mix('#3e3430', '#201a20', f.dusk);
  const leaf = mix('#6d7a4e', '#3a3a3a', f.dusk);
  const leafLit = mix('#9aa46a', '#6a5a50', f.dusk);
  const leafDeep = mix('#3e4a2e', '#1c1c24', f.dusk);
  const crownY = t.base - t.h;
  const w = t.h * 0.07;
  // Its shadow on the sand.
  glaze(ctx, t.x + s * t.h * 0.2, t.base + 10, t.h * 0.7, t.h * 0.06, 0, tone('shadow', f.dusk), 0.4);
  // The trunk: thick, leaning, twisted, splitting into two limbs and then many.
  const limbs: Pt[][] = [
    [{ x: t.x, y: t.base }, { x: t.x + s * w * 0.6, y: t.base - t.h * 0.3 }, { x: t.x - s * w * 0.8, y: t.base - t.h * 0.55 }, { x: t.x - s * t.h * 0.22, y: crownY + t.h * 0.12 }],
    [{ x: t.x + s * w * 0.3, y: t.base - t.h * 0.4 }, { x: t.x + s * w * 1.6, y: t.base - t.h * 0.6 }, { x: t.x + s * t.h * 0.26, y: crownY + t.h * 0.1 }],
  ];
  for (let i = 0; i < 6; i++) {
    const from = limbs[i % 2]![2]!;
    limbs.push([from, { x: from.x + s * (rng() - 0.5) * t.h * 0.5, y: crownY + t.h * (0.02 + rng() * 0.1) }]);
  }
  limbs.forEach((l, i) => {
    const width = i === 0 ? w * 2.1 : i === 1 ? w * 1.4 : w * 0.55;
    pen.stroke(l, width, bark, 1, false);
    pen.hair(l.map((p) => ({ x: p.x - width * 0.25, y: p.y })), width * 0.18, mix(bark, '#d8b890', 0.35), 0.6);
  });
  for (let i = 0; i < 18; i++) {
    const y = t.base - rng() * t.h * 0.5;
    pen.hair([{ x: t.x - w * 0.6 + rng() * w * 1.2, y }, { x: t.x - w * 0.6 + rng() * w * 1.2, y: y - 10 - rng() * 20 }], 1.4, mix(bark, '#000000', 0.4), 0.6);
  }
  // The crown: a broad, flat-topped spread of leaf clusters, dark below, lit along the top.
  const spread = t.h * 0.95;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < 70; i++) {
      const u = rng() * 2 - 1;
      const cx = t.x + s * t.h * 0.02 + u * spread * 0.55;
      const cy = crownY + t.h * 0.08 + (1 - u * u) * -t.h * 0.07 + (rng() - 0.3) * t.h * 0.12 - pass * t.h * 0.03;
      const r = t.h * (0.04 + rng() * 0.045);
      ctx.fillStyle = [leafDeep, leaf, leafLit][pass]!;
      ctx.globalAlpha = pass === 2 ? 0.75 : 0.95;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.5, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  // Leaf flecks round the crown's edge, and a few grey seed pods hanging.
  for (let i = 0; i < 260; i++) {
    const u = rng() * 2 - 1;
    const x = t.x + u * spread * 0.62;
    const y = crownY + t.h * 0.02 + (rng() - 0.4) * t.h * 0.22;
    pen.dot(x, y, 1.6 + rng() * 2, rng() < 0.5 ? leafLit : leafDeep, 0.8);
  }
  for (let i = 0; i < 7; i++) {
    const x = t.x + (rng() * 2 - 1) * spread * 0.4;
    const y = crownY + t.h * 0.17 + rng() * t.h * 0.04;
    ctx.fillStyle = mix('#a8a090', '#4a4048', f.dusk);
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 5, 14, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Paints one framing. */
export function paintVeld(f: VeldFrame, seed: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(f.width, f.height);
  const pen = new Pen(ctx, seed, 0.8);
  sky(ctx, f);
  dunes(pen, f);
  sand(pen, f);
  camelThorn(pen, f, createRng(seed + 5));
  f.tussocks.forEach(([x, y, size], i) => tussock(pen, x, y, size, f.dusk, seed * 31 + i));
  // The light: warm from the low sun's side, a soft vignette.
  const v = ctx.createRadialGradient(f.width / 2, f.height * 0.55, f.width * 0.3, f.width / 2, f.height * 0.55, f.height * 0.75);
  v.addColorStop(0, rgba('#000000', 0));
  v.addColorStop(1, rgba(mix('#3a1a0a', '#0a0a1a', f.dusk), 0.42));
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, f.width, f.height);
  return canvas;
}
