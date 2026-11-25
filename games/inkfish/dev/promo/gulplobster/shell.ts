/** Paint for the lobster: layered washes inside a shape, speckles, rim light and a firm boiling ink line. */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

export const PAL = {
  back: '#5d100e',
  deep: '#8f1f13',
  base: '#c93a1c',
  warm: '#e65d2a',
  lit: '#fb9a58',
  pale: '#f9cb98',
  cream: '#fff0d2',
  ink: '#2a0908',
  speck: '#470b0b',
  freckle: '#ffbe86',
  rim: '#ffe0bd',
  shadow: '#1a0a1c',
} as const;

export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** A smooth curve through `pts` (Catmull-Rom), `per` steps to a span; closed joins the end to the start. */
export function curve(pts: readonly Pt[], closed: boolean, per = 8): Pt[] {
  const n = pts.length;
  const at = (i: number): Pt => (closed ? pts[((i % n) + n) % n]! : pts[Math.max(0, Math.min(n - 1, i))]!);
  const out: Pt[] = [];
  const spans = closed ? n : n - 1;
  for (let i = 0; i < spans; i++) {
    const [a, b, c, d] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < per; k++) {
      const s = k / per;
      const f = (p: number, q: number, r: number, u: number): number =>
        0.5 * (2 * q + (r - p) * s + (2 * p - 5 * q + 4 * r - u) * s * s + (3 * q - p - 3 * r + u) * s * s * s);
      out.push({ x: f(a.x, b.x, c.x, d.x), y: f(a.y, b.y, c.y, d.y) });
    }
  }
  return closed ? out : [...out, pts[n - 1]!];
}

/** A cubic from `a` to `d`, `n` points. */
export const cubic = (a: Pt, b: Pt, c: Pt, d: Pt, n: number): Pt[] => Array.from({ length: n }, (_, i) => {
  const u = i / (n - 1);
  const v = 1 - u;
  const f = (p: number, q: number, r: number, s: number): number => v * v * v * p + 3 * v * v * u * q + 3 * v * u * u * r + u * u * u * s;
  return { x: f(a.x, b.x, c.x, d.x), y: f(a.y, b.y, c.y, d.y) };
});

export function trace(c: CanvasRenderingContext2D, pts: readonly Pt[], close: boolean): void {
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
  if (close) c.closePath();
}

/** An ink line, trembling a little with the line boil. */
export function ink(c: CanvasRenderingContext2D, pts: readonly Pt[], width: number, boil: number, close = false, color: string = PAL.ink, alpha = 1): void {
  c.save();
  c.globalAlpha *= alpha;
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  trace(c, pts.map((p, i) => {
    const j = 0.16 * width * Math.sin(i * 1.1 + boil * 2.3);
    return { x: p.x + j, y: p.y - j };
  }), close);
  c.stroke();
  c.restore();
}

export interface ShellLook {
  /** The back's and the underside's height, for the washes from dark to pale. */
  readonly top: number;
  readonly bottom: number;
  readonly seed: number;
  readonly boil: number;
  readonly inkWidth?: number;
  /** Dark speckles over the back, and pale freckles. */
  readonly specks?: number;
  readonly freckles?: number;
  /** The wet gloss: where and how broad. */
  readonly gloss?: { readonly x: number; readonly y: number; readonly rx: number; readonly ry: number };
  /** How pale the underside goes, 0 .. 1. */
  readonly under?: number;
}

function box(pts: readonly Pt[]): { x0: number; x1: number } {
  return { x0: Math.min(...pts.map((p) => p.x)), x1: Math.max(...pts.map((p) => p.x)) };
}

/** One plate of shell: washes from the dark back to the pale underside, mottling, gloss, speckles, rim light, then the ink. */
export function paintShell(c: CanvasRenderingContext2D, outline: readonly Pt[], o: ShellLook): void {
  const r = rng(o.seed);
  const { x0, x1 } = box(outline);
  const h = o.bottom - o.top;
  const w = x1 - x0;
  const under = o.under ?? 1;
  c.save();
  trace(c, outline, true);
  const g = c.createLinearGradient(0, o.top, 0, o.bottom);
  g.addColorStop(0, PAL.back);
  g.addColorStop(0.14, PAL.deep);
  g.addColorStop(0.38, PAL.base);
  g.addColorStop(0.64, PAL.warm);
  g.addColorStop(0.84, under > 0.5 ? PAL.lit : PAL.warm);
  g.addColorStop(1, under > 0.5 ? PAL.pale : PAL.lit);
  c.fillStyle = g;
  c.fill();
  c.clip();
  // Mottled washes, laid over each other.
  for (let i = 0; i < 26; i++) {
    const u = r();
    c.globalAlpha = 0.07 + 0.06 * r();
    c.fillStyle = r() < 0.55 ? PAL.back : PAL.lit;
    c.beginPath();
    c.ellipse(x0 + w * r(), o.top + h * u, w * (0.06 + 0.1 * r()), h * (0.05 + 0.08 * r()), r() * 3, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  if (o.gloss) {
    const { x, y, rx, ry } = o.gloss;
    c.save();
    c.translate(x, y);
    c.scale(rx, ry);
    const s = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    s.addColorStop(0, 'rgba(255,176,104,0.75)');
    s.addColorStop(0.55, 'rgba(255,140,76,0.32)');
    s.addColorStop(1, 'rgba(255,140,76,0)');
    c.fillStyle = s;
    c.fillRect(-1, -1, 2, 2);
    c.restore();
  }
  // Shadow tucked under the bottom edge.
  const sh = c.createLinearGradient(0, o.top + h * 0.72, 0, o.bottom);
  sh.addColorStop(0, 'rgba(70,16,20,0)');
  sh.addColorStop(1, 'rgba(70,16,20,0.34)');
  c.fillStyle = sh;
  c.fillRect(x0 - 5, o.top - 5, w + 10, h + 10);
  for (let i = 0; i < (o.specks ?? 0); i++) {
    const u = r() ** 1.5;
    const size = 0.7 + 1.9 * r() ** 2;
    c.globalAlpha = (0.35 + 0.45 * r()) * (1 - 0.6 * u);
    c.fillStyle = PAL.speck;
    c.beginPath();
    c.ellipse(x0 + w * r(), o.top + h * u, size * 1.2, size, r() * 3, 0, Math.PI * 2);
    c.fill();
  }
  for (let i = 0; i < (o.freckles ?? 0); i++) {
    c.globalAlpha = 0.25 + 0.4 * r();
    c.fillStyle = PAL.freckle;
    c.beginPath();
    c.arc(x0 + w * r(), o.top + h * (0.12 + 0.75 * r()), 0.6 + 1.2 * r(), 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  // The rim light along the back, inside the line.
  const rim = c.createLinearGradient(0, o.top, 0, o.top + h * 0.5);
  rim.addColorStop(0, 'rgba(255,214,170,0.85)');
  rim.addColorStop(1, 'rgba(255,214,170,0)');
  c.strokeStyle = rim;
  c.lineWidth = 8.5;
  c.lineJoin = 'round';
  trace(c, outline, true);
  c.stroke();
  c.restore();
  ink(c, outline, o.inkWidth ?? 3.2, o.boil, true);
}

/** A rounded limb along `pts` with half-widths `half`: wash, a lit upper side, a shadowed lower side, ink. `tone` darkens the far ones. */
export function tube(
  c: CanvasRenderingContext2D, pts: readonly Pt[], half: readonly number[], boil: number, o: { readonly inkWidth?: number; readonly tone?: number; readonly color?: string; readonly specks?: number } = {},
): void {
  const n = pts.length;
  const norm = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(n - 1, i + 1)]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: -(b.y - a.y) / d, y: (b.x - a.x) / d };
  });
  const widthAt = (i: number): number => {
    const u = (i / (n - 1)) * (half.length - 1);
    const k = Math.min(half.length - 2, Math.floor(u));
    return half[k]! + (half[k + 1]! - half[k]!) * (u - k);
  };
  const side = (s: number): Pt[] => pts.map((p, i) => ({ x: p.x + norm[i]!.x * widthAt(i) * s, y: p.y + norm[i]!.y * widthAt(i) * s }));
  const outline = [...side(-1), ...side(1).reverse()];
  const mean = half.reduce((a, b) => a + b, 0) / half.length;
  c.save();
  trace(c, outline, true);
  c.fillStyle = o.color ?? PAL.base;
  c.fill();
  c.clip();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // Light from above: the side facing up is lit, the one facing down in shadow.
  const shift = (dy: number): Pt[] => pts.map((p) => ({ x: p.x, y: p.y + dy * mean }));
  for (const [dy, color, w, a] of [[0.75, PAL.back, 1.1, 0.55], [-0.35, PAL.warm, 1.1, 0.75], [-0.55, PAL.lit, 0.55, 0.75], [-0.62, PAL.rim, 0.2, 0.75]] as const) {
    c.globalAlpha = a;
    c.strokeStyle = color;
    c.lineWidth = mean * w;
    trace(c, shift(dy), false);
    c.stroke();
  }
  const r = rng(n * 31 + (o.specks ?? 0));
  c.fillStyle = PAL.speck;
  for (let i = 0; i < (o.specks ?? 0); i++) {
    const q = r() * (n - 1);
    const k = Math.floor(q);
    const a = pts[k]!;
    const b = pts[k + 1]!;
    const v = (r() * 2 - 1) * 0.85 * mean;
    c.globalAlpha = 0.3 + 0.4 * r();
    c.beginPath();
    c.arc(a.x + (b.x - a.x) * (q - k) + norm[k]!.x * v, a.y + (b.y - a.y) * (q - k) + norm[k]!.y * v, 0.8 + 1.4 * r(), 0, Math.PI * 2);
    c.fill();
  }
  if (o.tone) {
    c.globalAlpha = o.tone;
    c.fillStyle = PAL.shadow;
    trace(c, outline, true);
    c.fill();
  }
  c.restore();
  ink(c, outline, o.inkWidth ?? 2.4, boil, true);
}
