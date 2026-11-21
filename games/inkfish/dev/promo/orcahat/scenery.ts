import { blob } from '../alvin/art/draw';
import { VIDEO } from '../short';

/**
 * The Salish Sea on a grey day: a misty sky, a forested shore in layers of
 * conifers fading into the mist, and grey-green water. Painted as washes;
 * the sea's colour is a function of y only, so the water drawn over a
 * surfacing orca (`waterOver`) matches the sea round it exactly.
 */

const W = VIDEO.width;
const H = VIDEO.height;

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** One conifer's outline: a leaning leader, then tiers of drooping, ragged branch tips widening down to the ground. */
function conifer(p: Path2D, x: number, ground: number, h: number, w: number, seed: number): void {
  const tiers = 11 + Math.floor(hash(seed) * 7);
  const lean = (hash(seed + 1) - 0.5) * w * 0.12;
  const top = { x: x + lean, y: ground - h };
  const side = (dir: 1 | -1): { x: number; y: number }[] => {
    const pts: { x: number; y: number }[] = [];
    let v = 0;
    for (let i = 1; v < 1; i++) {
      const r = hash(seed + i * 7 + (dir > 0 ? 0 : 3));
      const r2 = hash(seed + i * 13 + (dir > 0 ? 5 : 9));
      const step = (0.5 + r2) / tiers;
      v = Math.min(1, v + step);
      // Ragged: some tiers stick far out, some barely, the odd gap where a branch is missing.
      const reach = r2 > 0.85 ? 0.45 : 0.6 + 0.65 * r;
      const hw = (w / 2) * (0.08 + 0.92 * v ** 0.8) * reach;
      const y = ground - h * (1 - v);
      const cx = x + lean * (1 - v);
      const tier = h * step;
      pts.push({ x: cx + dir * hw * (0.25 + 0.3 * r2), y: y - tier * (0.4 + 0.4 * r) });
      pts.push({ x: cx + dir * hw * (0.75 + 0.1 * r2), y: y - tier * 0.15 });
      pts.push({ x: cx + dir * hw, y: y + tier * (0.15 + 0.35 * r) });
    }
    return pts;
  };
  const right = side(1);
  const left = side(-1).reverse();
  p.moveTo(x - w * 0.06, ground + 4);
  for (const q of left) p.lineTo(q.x, q.y);
  p.lineTo(top.x - 1.5, top.y + h * 0.04);
  p.lineTo(top.x, top.y);
  p.lineTo(top.x + 1.5, top.y + h * 0.05);
  for (const q of right) p.lineTo(q.x, q.y);
  p.lineTo(x + w * 0.06, ground + 4);
  p.closePath();
}

/** A shore of conifers: a rolling hill line crowded with trees of varied heights, cached. */
const ridges = new Map<string, Path2D>();
function ridge(seed: number, baseY: number, hill: number, tree: number): Path2D {
  const key = `${seed}:${baseY}`;
  const have = ridges.get(key);
  if (have) return have;
  const p = new Path2D();
  const groundAt = (x: number): number => baseY - hill * (0.5 + 0.5 * Math.sin(x * 0.004 + seed)) - hill * 0.3 * Math.sin(x * 0.011 + seed * 2);
  p.moveTo(-60, H);
  for (let x = -60; x <= W + 60; x += 20) p.lineTo(x, groundAt(x) - tree * 0.06);
  p.lineTo(W + 60, H);
  p.closePath();
  let i = 0;
  for (let x = -50; x <= W + 50; i++) {
    const r = hash(seed * 31 + i);
    const h = tree * (0.55 + 0.75 * r * r + (hash(seed + i * 5) > 0.9 ? 0.4 : 0));
    const w = h * (0.32 + 0.14 * hash(seed + i * 3));
    conifer(p, x, groundAt(x) + tree * 0.15, h, w, seed * 100 + i);
    x += w * (0.22 + 0.35 * hash(seed + i * 11));
  }
  ridges.set(key, p);
  return p;
}

/** Fine texture inside a layer: short needle dabs, lighter and darker. */
function needles(ctx: CanvasRenderingContext2D, shape: Path2D, top: number, bottom: number, seed: number, alpha: number): void {
  ctx.save();
  ctx.clip(shape);
  for (let i = 0; i < 420; i++) {
    const x = hash(seed + i * 1.3) * W;
    const y = top + hash(seed + i * 2.7) * (bottom - top);
    const light = hash(seed + i * 4.1) > 0.5;
    ctx.fillStyle = light ? `rgba(150,170,155,${alpha})` : `rgba(10,22,18,${alpha * 1.4})`;
    ctx.fillRect(x, y, 6 + 10 * hash(seed + i), 2);
  }
  ctx.restore();
}

export interface SkyOpts {
  /** The horizon (where the water starts), screen y. */
  readonly horizon: number;
  /** 0 the grey day, 1 the cold mist of the vanish beat. */
  readonly cold?: number;
}

const mix = (a: readonly number[], b: readonly number[], u: number): string =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i]! - v) * u)).join(',')})`;

/** The sky and the shore down to the horizon. */
export function skyAndShore(ctx: CanvasRenderingContext2D, o: SkyOpts, t: number): void {
  const c = o.cold ?? 0;
  const g = ctx.createLinearGradient(0, 0, 0, o.horizon);
  g.addColorStop(0, mix([176, 190, 186], [150, 162, 170], c));
  g.addColorStop(1, mix([214, 222, 214], [190, 198, 204], c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, o.horizon + 2);
  blob(ctx, 700, o.horizon - 420, 700, 260, 0, '250,246,230', 0.35 * (1 - c));
  // Far to near: each layer's trees fade from their own colour at the top into the fog at the foot.
  const layers: readonly [number, number, number, number, readonly number[], number][] = [
    [3, o.horizon - 220, 50, 90, [158, 172, 166], 0.85],
    [7, o.horizon - 145, 46, 120, [126, 144, 136], 0.75],
    [11, o.horizon - 70, 40, 150, [88, 108, 98], 0.6],
    [17, o.horizon - 26, 22, 200, [40, 56, 48], 0.35],
  ];
  const fogRgb = mix([222, 228, 222], [200, 206, 212], c).slice(4, -1);
  layers.forEach(([seed, y, hill, tree, colour, fogAt], i) => {
    const shape = ridge(seed, y, hill, tree);
    const top = y - hill - tree * 1.3;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, o.horizon);
    ctx.clip();
    const solid = ctx.createLinearGradient(0, top, 0, y + tree * 0.15);
    solid.addColorStop(0, mix(colour, [150, 160, 170], c * 0.4));
    solid.addColorStop(fogAt, mix(colour, [150, 160, 170], c * 0.4));
    solid.addColorStop(1, `rgba(${fogRgb},1)`);
    ctx.fillStyle = i === layers.length - 1 ? mix(colour, [60, 70, 80], c * 0.5) : solid;
    ctx.fill(shape);
    if (i >= 2) needles(ctx, shape, top, o.horizon, seed, i === layers.length - 1 ? 0.22 : 0.12);
    ctx.restore();
    // Mist lying along the foot of each layer, thicker far away.
    const m = ctx.createLinearGradient(0, y - tree * 0.6, 0, Math.min(o.horizon, y + tree * 0.3));
    m.addColorStop(0, `rgba(${fogRgb},0)`);
    m.addColorStop(1, `rgba(${fogRgb},${(0.75 - 0.15 * i) + 0.15 * c})`);
    ctx.fillStyle = m;
    ctx.fillRect(0, y - tree * 0.6, W, Math.min(o.horizon, y + tree * 0.3) - (y - tree * 0.6));
  });
  // A low bank of fog along the waterline.
  const bank = ctx.createLinearGradient(0, o.horizon - 70, 0, o.horizon);
  bank.addColorStop(0, `rgba(${fogRgb},0)`);
  bank.addColorStop(1, `rgba(${fogRgb},${0.45 + 0.2 * c})`);
  ctx.fillStyle = bank;
  ctx.fillRect(0, o.horizon - 70, W, 70);
}

/** The sea's colour stops, from the horizon down. */
function seaGradient(ctx: CanvasRenderingContext2D, horizon: number, cold: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, horizon, 0, H);
  g.addColorStop(0, mix([150, 166, 156], [140, 152, 160], cold));
  g.addColorStop(0.12, mix([96, 116, 104], [88, 102, 112], cold));
  g.addColorStop(0.45, mix([56, 76, 68], [48, 60, 72], cold));
  g.addColorStop(1, mix([24, 38, 34], [20, 28, 38], cold));
  return g;
}

/** The sea's paint over a rectangle: its gradient and the shore's dark reflection under the horizon. */
function seaFill(ctx: CanvasRenderingContext2D, horizon: number, cold: number, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = seaGradient(ctx, horizon, cold);
  ctx.fillRect(x, y, w, h);
  const r = ctx.createLinearGradient(0, horizon, 0, horizon + 90);
  r.addColorStop(0, 'rgba(40,58,50,0.45)');
  r.addColorStop(1, 'rgba(40,58,50,0)');
  ctx.fillStyle = r;
  ctx.fillRect(x, Math.max(y, horizon), w, 90);
}

/** The open water below the horizon, with slow ripples and the shore's dark reflection. */
export function sea(ctx: CanvasRenderingContext2D, o: SkyOpts, t: number): void {
  const c = o.cold ?? 0;
  seaFill(ctx, o.horizon, c, 0, o.horizon, W, H - o.horizon);
  ripples(ctx, o.horizon, H, t, 70);
}

/** Short pale ripple strokes, thinner and closer together toward the horizon. */
function ripples(ctx: CanvasRenderingContext2D, top: number, bottom: number, t: number, count: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const d = hash(i * 3.1);
    const y = top + (bottom - top) * d * d;
    if (y < top + 4) continue;
    const near = (y - top) / (H - top);
    const x = (hash(i * 7.7) * (W + 300) + t * 18 * (0.4 + near)) % (W + 300) - 150;
    const len = 30 + 160 * near * (0.5 + hash(i));
    ctx.strokeStyle = `rgba(214,228,220,${0.1 + 0.18 * near})`;
    ctx.lineWidth = 1.5 + 4 * near;
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y);
    ctx.quadraticCurveTo(x, y - 3 - 5 * near, x + len / 2, y);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The water in front of a surfacing animal: the sea's own colour from its
 * water line down over [x0, x1], see-through near the top so the body shows
 * dimly under it, then a foam line where it breaks the surface.
 */
export function waterOver(ctx: CanvasRenderingContext2D, horizon: number, water: number, x0: number, x1: number, t: number, cold = 0, foam = 1): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, H);
  for (let x = x0; x <= x1; x += 20) ctx.lineTo(x, water + 5 * Math.sin(x * 0.02 + t * 2.4));
  ctx.lineTo(x1, H);
  ctx.closePath();
  ctx.clip();
  ctx.globalAlpha = 0.8;
  seaFill(ctx, horizon, cold, x0, water - 12, x1 - x0, H - water + 12);
  ctx.restore();
  if (foam <= 0) return;
  // Foam where the body breaks the surface: a soft wavy line, brighter at the head.
  ctx.save();
  ctx.lineCap = 'round';
  const line = (width: number, alpha: number, lift: number): void => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, 'rgba(240,246,242,0)');
    g.addColorStop(0.25, `rgba(240,246,242,${alpha * 0.6})`);
    g.addColorStop(0.9, `rgba(240,246,242,${alpha})`);
    g.addColorStop(1, 'rgba(240,246,242,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 12) ctx.lineTo(x, water + lift + 5 * Math.sin(x * 0.02 + t * 2.4) + 2 * Math.sin(x * 0.11 + t * 5));
    ctx.stroke();
  };
  line(14, 0.22 * foam, 2);
  line(4, 0.7 * foam, 0);
  ctx.restore();
}

/** Spray thrown up as something breaks the surface at (x, y), `age` s ago, `size` px across. */
export function spray(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, age: number, seed: number): void {
  if (age < 0 || age > 1.4) return;
  ctx.save();
  const fade = 1 - age / 1.4;
  // A white burst of foam round the break.
  blob(ctx, x, y, size * (0.5 + 0.3 * age), size * 0.12, 0, '245,250,246', 0.75 * fade);
  for (let i = 0; i < 34; i++) {
    const a = -Math.PI / 2 + (hash(seed + i) - 0.5) * 2.2;
    const v = size * (0.9 + 1.3 * hash(seed + i * 2));
    const dx = (hash(seed + i * 5) - 0.5) * size * 0.6;
    const px = x + dx + Math.cos(a) * v * age;
    const py = y + Math.sin(a) * v * age + 0.5 * 2200 * age * age * (size / 600);
    if (py > y - 4) continue;
    const vy = Math.sin(a) * v + 2200 * age * (size / 600);
    const vx = Math.cos(a) * v;
    const k = 0.018;
    ctx.strokeStyle = `rgba(244,248,246,${0.7 * fade})`;
    ctx.lineCap = 'round';
    ctx.lineWidth = (1.5 + 3 * hash(seed + i * 3)) * (size / 600) + 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - vx * k, py - vy * k);
    ctx.stroke();
  }
  ctx.restore();
}

/** A wash over the whole frame. */
export function wash(ctx: CanvasRenderingContext2D, rgba: string): void {
  ctx.fillStyle = rgba;
  ctx.fillRect(0, 0, W, H);
}

/** Drifting fog banks, for the vanish beat. */
export function fog(ctx: CanvasRenderingContext2D, alpha: number, t: number): void {
  if (alpha <= 0.01) return;
  for (let i = 0; i < 6; i++) {
    const x = ((hash(i * 9) * W * 1.6 + t * (20 + 10 * i)) % (W * 1.6)) - W * 0.3;
    blob(ctx, x, 600 + 140 * i, 520, 120, 0, '214,222,226', alpha * (0.45 + 0.2 * hash(i)));
  }
}
