import { INK, Pen } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { normals, type Pt, resample } from '../octopus/geom';
import { type Light, lit, mix, ORAL, type Ramp, rampAt, type Rgb, rgb, SKIN, sstep, unit } from './colour';

/**
 * The painter for soft round bodies: a tube along any path, lit like a solid
 * form (every cross-section shaded by its real surface normal), with skin
 * mottles, wrinkles and papillae that stay put on the skin, an optional pale
 * sucker band that can roll round the tube with real perspective, and a pen
 * outline that boils. The octopus's mantle, head and arms are all tubes, so
 * any squeeze or bend stays one soft animal.
 */

export * from './colour';

// ---------------------------------------------------------------- tubes

export interface Tube {
  readonly path: readonly Pt[];
  /** Radius at s (0 root .. 1 tip), px. */
  readonly radius: (s: number) => number;
  /** Samples along it. */
  readonly n?: number;
  /** The sucker band's middle, radians round the tube (0 faces the viewer, ±π/2 the edges, π hidden), by s. */
  readonly band?: (s: number) => number;
  readonly seed: number;
  /** Line-boil step. */
  readonly boil: number;
  readonly line?: number;
  /** Skin detail, 1 = normal, 0 = none. */
  readonly detail?: number;
  readonly from?: number;
  readonly to?: number;
  /** Suckers flattened on glass: wider rims. */
  readonly pressed?: boolean;
  /** Sucker radius as a share of the tube's. */
  readonly suckerK?: number;
  readonly ramp?: Ramp;
  /** Bumpiness of the silhouette. */
  readonly bumps?: number;
  /** No outline near the root (it grows out of the body). */
  readonly inkFrom?: number;
}

export interface Frame {
  readonly pts: Pt[];
  readonly nrm: Pt[];
  readonly r: number[];
  readonly len: number;
  readonly slope: number[];
}

export function tubeFrame(t: Tube): Frame {
  const n = t.n ?? 80;
  const pts = resample(t.path, n);
  const nrm = normals(pts);
  let len = 0;
  for (let i = 1; i < n; i++) len += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
  const b = t.bumps ?? 0;
  const r = pts.map((_, i) => {
    const s = i / (n - 1);
    return Math.max(0.5, t.radius(s) * (1 + b * (0.5 * Math.sin(s * 23 + t.seed) + 0.35 * Math.sin(s * 57 + t.seed * 1.7) + 0.25 * Math.sin(s * 91 + t.seed * 0.6))));
  });
  // The form's own slope, smoothed over a few samples: what the light sees (not the bumps).
  const clean = pts.map((_, i) => t.radius(i / (n - 1)));
  const step = len / (n - 1) || 1;
  const reach = Math.max(1, Math.round(n / 40));
  const slope = pts.map((_, i) => {
    const [a, c] = [Math.max(0, i - reach), Math.min(n - 1, i + reach)];
    return Math.max(-2.5, Math.min(2.5, -(clean[c]! - clean[a]!) / ((c - a) * step)));
  });
  return { pts, nrm, r, len, slope };
}

/** The screen point at (index, angle round the tube). */
export const onTube = (f: Frame, i: number, phi: number, k = 1): Pt => {
  const p = f.pts[i]!;
  const n = f.nrm[i]!;
  const d = f.r[i]! * Math.sin(phi) * k;
  return { x: p.x + n.x * d, y: p.y + n.y * d };
};

const STOPS = [-1, -0.94, -0.8, -0.6, -0.35, -0.1, 0.15, 0.4, 0.65, 0.84, 0.95, 1] as const;

const range = (t: Tube, f: Frame): readonly [number, number] => {
  const last = f.pts.length - 1;
  return [Math.max(0, Math.round((t.from ?? 0) * last)), Math.min(last, Math.round((t.to ?? 1) * last))];
};

/** The lit body of a tube, cross-section by cross-section. */
function paintSlices(ctx: CanvasRenderingContext2D, t: Tube, f: Frame, light: Light): void {
  const [i0, i1] = range(t, f);
  const ramp = t.ramp ?? SKIN;
  for (let i = i0; i < i1; i++) {
    const a = f.pts[i]!;
    const b = f.pts[i + 1]!;
    const na = f.nrm[i]!;
    const nb = f.nrm[i + 1]!;
    const step = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const tx = (b.x - a.x) / step;
    const ty = (b.y - a.y) / step;
    const slope = f.slope[i]!;
    const rm = (f.r[i]! + f.r[i + 1]!) / 2;
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const g = ctx.createLinearGradient(m.x - na.x * rm, m.y - na.y * rm, m.x + na.x * rm, m.y + na.y * rm);
    const band = t.band?.(i / (f.pts.length - 1));
    for (const k of STOPS) {
      const c = Math.sqrt(1 - k * k);
      const n = unit([na.x * k + tx * slope, na.y * k + ty * slope, c]);
      let col = lit(ramp, n, light);
      if (band !== undefined) {
        const phi = Math.asin(k);
        const d = Math.abs(Math.atan2(Math.sin(phi - band), Math.cos(phi - band)));
        const w = t.pressed ? 1 - sstep(0.6, 0.95, d) : 1 - sstep(0.75, 1.1, d);
        if (w > 0) col = mix(col, lit(ORAL, n, light), w);
      }
      g.addColorStop((k + 1) / 2, rgb(col));
    }
    ctx.fillStyle = g;
    // Each slice reaches a little over the next so no seam shows.
    const o = i + 1 < i1 ? 1.6 : 0.4;
    ctx.beginPath();
    ctx.moveTo(a.x + na.x * f.r[i]!, a.y + na.y * f.r[i]!);
    ctx.lineTo(b.x + nb.x * f.r[i + 1]! + tx * o, b.y + nb.y * f.r[i + 1]! + ty * o);
    ctx.lineTo(b.x - nb.x * f.r[i + 1]! + tx * o, b.y - nb.y * f.r[i + 1]! + ty * o);
    ctx.lineTo(a.x - na.x * f.r[i]!, a.y - na.y * f.r[i]!);
    ctx.closePath();
    ctx.fill();
  }
}

/** Mottles, wrinkles and papillae, fixed to the skin. */
function paintSkinDetail(ctx: CanvasRenderingContext2D, t: Tube, f: Frame, light: Light): void {
  const detail = t.detail ?? 1;
  if (detail <= 0) return;
  const [i0, i1] = range(t, f);
  const rng = createRng(t.seed * 7 + 13);
  const last = f.pts.length - 1;
  const rMax = Math.max(...f.r);
  const inBand = (i: number, phi: number): boolean => {
    const b = t.band?.(i / last);
    return b !== undefined && Math.abs(Math.atan2(Math.sin(phi - b), Math.cos(phi - b))) < 0.95;
  };
  const k = unit(light.key);
  const tone = (c: Rgb): Rgb => (light.tint ? mix(c, light.tint, light.tintK ?? 0) : c);
  const spot = (i: number, phi: number, along: number, across: number, c: Rgb, a: number, soft = false): void => {
    const p = onTube(f, i, phi);
    const n = f.nrm[i]!;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(n.y, n.x));
    ctx.scale(Math.max(0.12, Math.cos(phi)) * across, along);
    if (soft) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, rgb(tone(c), a));
      g.addColorStop(0.55, rgb(tone(c), a * 0.6));
      g.addColorStop(1, rgb(tone(c), 0));
      ctx.fillStyle = g;
    } else ctx.fillStyle = rgb(tone(c), a);
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  // Broad soft mottling first.
  const broad = Math.min(130, Math.round((f.len / Math.max(8, rMax)) * 22 * detail));
  for (let j = 0; j < broad; j++) {
    const i = Math.floor(rng() * last);
    const phi = (rng() - 0.5) * 2.8;
    const dark = rng() < 0.55;
    const q = f.r[i]! * (0.1 + 0.16 * rng() * rng() + 0.03);
    if (i < i0 || i >= i1 || inBand(i, phi)) continue;
    spot(i, phi, q * 1.25, q, dark ? [138, 40, 8] : [255, 190, 116], dark ? 0.36 : 0.3, true);
  }
  // Then the skin's colour cells and bumps.
  const count = Math.min(1500, Math.round((f.len * rMax * 2) / 260 * detail));
  for (let j = 0; j < count; j++) {
    const i = Math.floor(rng() * last);
    const phi = (rng() - 0.5) * 2.9;
    const pick = rng();
    const size = 0.5 + rng() * rng() * 1.6;
    if (i < i0 || i >= i1 || inBand(i, phi)) continue;
    const q = Math.min(f.r[i]! * 0.085, 9.5) * size;
    if (pick < 0.5) spot(i, phi, q * 0.3, q * 0.3, [62, 16, 6], 0.5);
    else if (pick < 0.68) spot(i, phi, q * 0.75, q * 0.6, [120, 36, 12], 0.3);
    else if (pick < 0.84) spot(i, phi, q * 0.55, q * 0.5, [255, 206, 136], 0.3);
    else if (pick < 0.93) {
      // A papilla: a small raised point, lit on one side, its shadow on the other.
      const p = onTube(f, i, phi);
      const b = Math.max(1.1, q * 0.72);
      ctx.fillStyle = rgb(tone([58, 14, 6]), 0.5);
      ctx.beginPath();
      ctx.ellipse(p.x - k[0] * b * 0.7, p.y - k[1] * b * 0.7, b * 1.15, b * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createRadialGradient(p.x + k[0] * b * 0.5, p.y + k[1] * b * 0.5, 0, p.x, p.y, b);
      g.addColorStop(0, rgb(tone([255, 200, 130]), 0.8));
      g.addColorStop(0.6, rgb(tone([224, 118, 50]), 0.6));
      g.addColorStop(1, rgb(tone([170, 70, 26]), 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, b, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Wrinkles running partway round the form.
  const wr = Math.min(60, Math.round((f.len / Math.max(8, rMax)) * 5 * detail));
  for (let j = 0; j < wr; j++) {
    const i = Math.floor(rng() * last);
    const p0 = (rng() - 0.5) * 2.4;
    const span = 0.3 + rng() * 0.7;
    const bow = (rng() - 0.5) * 4;
    if (i < i0 + 2 || i >= i1 - 3 || inBand(i, p0) || inBand(i, p0 + span)) continue;
    ctx.strokeStyle = rgb(tone([60, 18, 8]), 0.28);
    ctx.lineWidth = Math.max(0.7, f.r[i]! * 0.012);
    ctx.beginPath();
    for (let q = 0; q <= 8; q++) {
      const idx = Math.max(i0, Math.min(i1, Math.round(i + bow * Math.sin((q / 8) * Math.PI))));
      const at = onTube(f, idx, Math.min(1.5, p0 + (span * q) / 8));
      if (q) ctx.lineTo(at.x, at.y);
      else ctx.moveTo(at.x, at.y);
    }
    ctx.stroke();
  }
}

/** One sucker, seen at `face` (1 full on .. 0 edge on), turned so its short axis lies along `angle`. */
export function drawSucker(ctx: CanvasRenderingContext2D, p: Pt, r: number, face: number, angle: number, light: Light, pressed = false): void {
  const tone = (c: Rgb): string => rgb(light.tint ? mix(c, light.tint, light.tintK ?? 0) : c);
  const k = unit(light.key);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.scale(Math.max(0.3, face), 1);
  ctx.fillStyle = 'rgba(50,14,10,0.45)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.14, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(k[0] * r * 0.35, k[1] * r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, tone([255, 246, 230]));
  g.addColorStop(0.7, tone([246, 212, 178]));
  g.addColorStop(1, tone([206, 140, 104]));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  if (r > 3) {
    const cup = r * (pressed ? 0.52 : 0.58);
    const h = ctx.createRadialGradient(-k[0] * cup * 0.4, -k[1] * cup * 0.4, 0, 0, 0, cup);
    h.addColorStop(0, tone([222, 158, 122]));
    h.addColorStop(0.65, tone([176, 100, 72]));
    h.addColorStop(1, tone([128, 62, 44]));
    ctx.fillStyle = h;
    ctx.beginPath();
    ctx.arc(0, 0, cup, 0, Math.PI * 2);
    ctx.fill();
    if (r > 6) {
      ctx.fillStyle = tone(r > 60 ? [142, 76, 56] : [84, 34, 26]);
      ctx.beginPath();
      ctx.arc(0, 0, cup * 0.34, 0, Math.PI * 2);
      ctx.fill();
      // Radial folds in the cup.
      ctx.strokeStyle = 'rgba(90,40,28,0.4)';
      ctx.lineWidth = Math.max(0.5, r * 0.04);
      for (let a = 0; a < 8; a++) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a * 0.785) * cup * 0.4, Math.sin(a * 0.785) * cup * 0.4);
        ctx.lineTo(Math.cos(a * 0.785) * cup * 0.95, Math.sin(a * 0.785) * cup * 0.95);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,250,238,0.75)';
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.82, Math.PI * 1.05, Math.PI * 1.55);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = 'rgba(40,14,10,0.8)';
  ctx.lineWidth = Math.max(0.6, r * 0.08);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Two staggered rows of suckers along the band; those round the far side of the edge peek past it. */
function paintSuckers(ctx: CanvasRenderingContext2D, t: Tube, f: Frame, light: Light): void {
  if (!t.band) return;
  const [i0, i1] = range(t, f);
  const last = f.pts.length - 1;
  let acc = 0;
  let row = 0;
  for (let i = Math.max(i0, 1); i < i1; i++) {
    acc += Math.hypot(f.pts[i]!.x - f.pts[i - 1]!.x, f.pts[i]!.y - f.pts[i - 1]!.y);
    const size = f.r[i]! * (t.suckerK ?? (t.pressed ? 0.43 : 0.38));
    if (size < 1.1 || acc < size * 1.12) continue;
    acc = 0;
    row = 1 - row;
    const phi = t.band(i / last) + (row ? 0.44 : -0.44);
    const c = Math.cos(phi);
    if (c < -0.4) continue;
    const n = f.nrm[i]!;
    drawSucker(ctx, onTube(f, i, phi, 1.02), size, Math.max(0.36, c), Math.atan2(n.y, n.x), light, t.pressed);
  }
}

export function drawTube(ctx: CanvasRenderingContext2D, t: Tube, light: Light): Frame {
  const f = tubeFrame(t);
  const [i0, i1] = range(t, f);
  if (i1 - i0 < 2) return f;
  const pen = new Pen(ctx, t.seed + (t.boil % 3) * 977, 0.9);
  // Suckers round the back of the edge go under the skin.
  paintSlices(ctx, t, f, light);
  paintSkinDetail(ctx, t, f, light);
  const line = t.line ?? Math.max(1.6, Math.min(5, Math.max(...f.r) * 0.045));
  const ink0 = Math.max(i0, Math.round((t.inkFrom ?? 0) * (f.pts.length - 1)));
  for (const sgn of [-1, 1]) {
    const side = f.pts.slice(ink0, i1 + 1).map((p, j) => ({ x: p.x + f.nrm[ink0 + j]!.x * f.r[ink0 + j]! * sgn, y: p.y + f.nrm[ink0 + j]!.y * f.r[ink0 + j]! * sgn }));
    pen.stroke(side, line, INK, 0.95, false);
  }
  paintSuckers(ctx, t, f, light);
  return f;
}

/** A soft round mound of skin, melting into what's under it. */
export function drawMound(ctx: CanvasRenderingContext2D, c: Pt, rx: number, ry: number, light: Light, strength = 1): void {
  const k = unit(light.key);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(k[0] * 0.42, k[1] * 0.42, 0.04, 0, 0, 1);
  const tone = (v: number): Rgb => {
    const s = rampAt(SKIN, v);
    return light.tint ? mix(s, light.tint, light.tintK ?? 0) : s;
  };
  g.addColorStop(0, rgb(tone(0.86), strength));
  g.addColorStop(0.45, rgb(tone(0.62), 0.9 * strength));
  g.addColorStop(0.78, rgb(tone(0.34), 0.62 * strength));
  g.addColorStop(1, rgb(tone(0.2), 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A soft round glow or shadow. */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, c: Rgb, a: number, mode: GlobalCompositeOperation = 'source-over'): void {
  if (a <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, rgb(c, a));
  g.addColorStop(0.5, rgb(c, a * 0.45));
  g.addColorStop(1, rgb(c, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A filled polygon with any style. */
export function poly(ctx: CanvasRenderingContext2D, pts: readonly Pt[], style: string | CanvasGradient): void {
  ctx.fillStyle = style;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}

/** A gradient down (or across) the frame from colour stops. */
export function wash(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: readonly (readonly [number, string])[]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [at, c] of stops) g.addColorStop(at, c);
  return g;
}
