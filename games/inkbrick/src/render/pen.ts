/**
 * A wobbly fountain-pen imitation, copied from InkFish (games/inkfish/src/art/pen.ts)
 * so InkBrick's ink set matches it. Every stroke is jittered and re-traced faintly so
 * lines look hand-drawn; the same shape with another seed gives a "line boil" frame.
 * Kept as a copy on purpose: game packages don't import each other.
 */
export const INK = '#1b1a1f';
export const PAPER = '#f4eddc';

export type Rng = () => number;

/** Mulberry32 (as InkFish's logic/rng): small, fast, seedable, returns [0, 1). */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Pt {
  x: number;
  y: number;
}

export interface HatchOpts {
  onlyBelow?: number;
  color?: string;
  alpha?: number;
}

export class Pen {
  readonly rng: Rng;

  constructor(readonly ctx: CanvasRenderingContext2D, seed: number, readonly wobble = 1.2) {
    this.rng = createRng(seed);
  }

  jitter(amount = this.wobble): number {
    return (this.rng() - 0.5) * 2 * amount;
  }

  /** Polyline with pressure-varying width; `retrace` adds the faint second pass. */
  stroke(points: readonly Pt[], width: number, color = INK, alpha = 1, retrace = true): void {
    if (points.length < 2) return;
    const pts = points.map((p) => ({ x: p.x + this.jitter(), y: p.y + this.jitter() }));
    this.trace(pts, width, color, alpha);
    if (!retrace) return;
    const ghost = pts.map((p) => ({ x: p.x + this.jitter(0.6), y: p.y + this.jitter(0.6) }));
    this.trace(ghost, width * 0.45, color, alpha * 0.22);
  }

  /** Fine single-pass line for interior detail (no re-trace, less wobble). */
  hair(points: readonly Pt[], width: number, color = INK, alpha = 0.85): void {
    if (points.length < 2) return;
    const pts = points.map((p) => ({ x: p.x + this.jitter(0.35), y: p.y + this.jitter(0.35) }));
    this.trace(pts, width, color, alpha);
  }

  /** Random dots, denser where `density(x, y)` is high (0..1), clipped to a shape. */
  stipple(clip: readonly Pt[], count: number, density: (x: number, y: number) => number, r = 0.55, color = INK): void {
    const { ctx } = this;
    const [x0, x1, y0, y1] = bounds(clip);
    ctx.save();
    pathOf(ctx, clip);
    ctx.clip();
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const x = x0 + this.rng() * (x1 - x0);
      const y = y0 + this.rng() * (y1 - y0);
      if (this.rng() > density(x, y)) continue;
      ctx.globalAlpha = 0.55 + this.rng() * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, r * (0.6 + this.rng() * 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  clipped(clip: readonly Pt[], draw: () => void): void {
    this.ctx.save();
    pathOf(this.ctx, clip);
    this.ctx.clip();
    draw();
    this.ctx.restore();
  }

  private trace(pts: readonly Pt[], width: number, color: string, alpha: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      const t = i / pts.length;
      ctx.lineWidth = Math.max(0.3, width * (0.6 + 0.55 * Math.sin(Math.PI * t)) * (1 + this.jitter(0.12)));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo((a.x + b.x) / 2 + this.jitter(0.2), (a.y + b.y) / 2 + this.jitter(0.2), b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  closed(points: readonly Pt[], width: number, color = INK): void {
    this.stroke([...points, points[0]!], width, color);
  }

  fill(points: readonly Pt[], color: string, alpha = 1): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    pathOf(ctx, points);
    ctx.fill();
    ctx.restore();
  }

  /** Parallel hatching clipped to a closed shape. */
  hatch(clip: readonly Pt[], spacing: number, angle: number, width: number, opts: HatchOpts = {}): void {
    const { ctx } = this;
    const [bx0, bx1, by0, by1] = bounds(clip);
    const minX = bx0 - 20;
    const maxX = bx1 + 20;
    const minY = by0 - 20;
    const maxY = by1 + 20;
    const span = Math.hypot(maxX - minX, maxY - minY);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    const nrm = { x: -dir.y, y: dir.x };
    ctx.save();
    pathOf(ctx, clip);
    ctx.clip();
    for (let off = -span / 2; off < span / 2; off += spacing + this.jitter(spacing * 0.2)) {
      const ox = cx + nrm.x * off;
      const oy = cy + nrm.y * off;
      if (opts.onlyBelow !== undefined && oy < opts.onlyBelow) continue;
      const len = span / 2;
      this.trace([{ x: ox - dir.x * len, y: oy - dir.y * len }, { x: ox + dir.x * len, y: oy + dir.y * len }], width, opts.color ?? INK, opts.alpha ?? 0.8);
    }
    ctx.restore();
  }

  dot(x: number, y: number, r: number, color = INK, alpha = 1): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + this.jitter(0.4), y + this.jitter(0.4), Math.max(0.4, r), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  circle(x: number, y: number, r: number, width: number, color = INK): void {
    this.closed(ellipse(x, y, r, r, Math.max(10, Math.round(r))), width, color);
  }
}

function bounds(pts: readonly Pt[]): [number, number, number, number] {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
}

export function pathOf(ctx: CanvasRenderingContext2D, points: readonly Pt[]): void {
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, steps = 24): Pt[] {
  return Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
  });
}

/** A rounded rectangle as a point loop (corner radius r), for brick and slab outlines. */
export function roundRect(x: number, y: number, w: number, h: number, r: number, perSide = 6): Pt[] {
  const pts: Pt[] = [];
  const corner = (cx: number, cy: number, a0: number): void => {
    for (let i = 0; i <= 4; i++) {
      const a = a0 + (i / 4) * (Math.PI / 2);
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
  };
  const side = (ax: number, ay: number, bx: number, by: number): void => {
    for (let i = 1; i < perSide; i++) pts.push({ x: ax + ((bx - ax) * i) / perSide, y: ay + ((by - ay) * i) / perSide });
  };
  corner(x + w - r, y + r, -Math.PI / 2);
  side(x + w, y + r, x + w, y + h - r);
  corner(x + w - r, y + h - r, 0);
  side(x + w - r, y + h, x + r, y + h);
  corner(x + r, y + h - r, Math.PI / 2);
  side(x, y + h - r, x, y + r);
  corner(x + r, y + r, Math.PI);
  side(x + r, y, x + w - r, y);
  return pts;
}
