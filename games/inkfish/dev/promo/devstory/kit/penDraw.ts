import { INK, makeCanvas } from '../../../../src/art/pen';
import { alongPolyline, clamp01, polylineLength, ramp, smooth, type Pt } from './geom';

/**
 * The pen-draw reveal: any drawing (a baked game sprite, a squid, a boat) is
 * inked as if a dip pen were following it, then a watercolour wash floods in.
 *
 * How: the drawing's ink (its dark pixels) is shown through a mask that grows
 * along two paths, measured once from the drawing itself: its outline (traced
 * round the silhouette, starting at the right-hand tip: a right-facing fish's
 * nose) and its spine (head to tail through the middle, covering the interior
 * detail: gills, eye, scales). The nib rides the mask's leading point. Then the
 * full painting blooms in from three wet seeds with ragged edges and a darker
 * pigment rim, until it is exactly the original drawing.
 *
 *   const r = makeInkReveal(fishStill('perch', 700));        // once
 *   drawInkReveal(ctx, r, art.pen, { x: 540, y: 450, width: 700, t, at: 1, inkS: 2.2, washS: 1 });
 */

export interface InkReveal {
  /** The finished drawing. */
  readonly colour: HTMLCanvasElement;
  /** Only its ink lines. */
  readonly ink: HTMLCanvasElement;
  /** Outline (source px), from the right-hand tip round the silhouette. */
  readonly contour: readonly Pt[];
  readonly contourLen: number;
  /** Spine (source px), right to left through the middle. */
  readonly spine: readonly Pt[];
  readonly spineLen: number;
  /** Mask widths (source px). */
  readonly contourW: number;
  readonly spineW: number;
  /** Seeds the wash blooms from (source px). */
  readonly seeds: readonly Pt[];
  readonly scratch: CanvasRenderingContext2D;
  readonly scratch2: CanvasRenderingContext2D;
}

/** Prepares a drawing for the reveal (pixel work: do it once, before the first frame). */
export function makeInkReveal(src: HTMLCanvasElement, opts: { readonly inkBelow?: number } = {}): InkReveal {
  const w = src.width;
  const h = src.height;
  const data = src.getContext('2d')!.getImageData(0, 0, w, h);
  const d = data.data;
  // Ink: dark, opaque pixels keep their colour; everything else goes clear.
  const inkLimit = opts.inkBelow ?? 95;
  const ink = makeCanvas(w, h);
  const inkData = ink.ctx.createImageData(w, h);
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.3 * d[i]! + 0.59 * d[i + 1]! + 0.11 * d[i + 2]!;
    if (d[i + 3]! > 60 && lum < inkLimit + 40) {
      const k = clamp01((inkLimit + 40 - lum) / 40);
      inkData.data[i] = d[i]!;
      inkData.data[i + 1] = d[i + 1]!;
      inkData.data[i + 2] = d[i + 2]!;
      inkData.data[i + 3] = d[i + 3]! * k;
    }
  }
  ink.ctx.putImageData(inkData, 0, 0);

  // Silhouette on a coarse grid.
  const g = Math.max(2, Math.round(Math.min(w, h) / 110));
  const gw = Math.ceil(w / g);
  const gh = Math.ceil(h / g);
  const solid = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const x = Math.min(w - 1, gx * g + (g >> 1));
      const y = Math.min(h - 1, gy * g + (g >> 1));
      solid[gy * gw + gx] = d[(y * w + x) * 4 + 3]! > 110 ? 1 : 0;
    }
  }
  const at = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < gw && y < gh && solid[y * gw + x] === 1;
  const contour = smoothPath(traceOutline(gw, gh, at), 3).map((p) => ({ x: (p.x + 0.5) * g, y: (p.y + 0.5) * g }));

  // Spine: the middle of each column, right to left.
  const spine: Pt[] = [];
  let spineW = 0;
  for (let gx = gw - 1; gx >= 0; gx--) {
    let lo = -1;
    let hi = -1;
    for (let gy = 0; gy < gh; gy++) {
      if (at(gx, gy)) {
        if (lo < 0) lo = gy;
        hi = gy;
      }
    }
    if (lo >= 0) {
      spine.push({ x: (gx + 0.5) * g, y: ((lo + hi) / 2 + 0.5) * g });
      spineW = Math.max(spineW, (hi - lo + 1) * g);
    }
  }
  const spineSmooth = smoothPath(spine, 4);
  const mid = spineSmooth[Math.floor(spineSmooth.length / 2)] ?? { x: w / 2, y: h / 2 };
  const seeds = [mid, spineSmooth[Math.floor(spineSmooth.length * 0.18)] ?? mid, spineSmooth[Math.floor(spineSmooth.length * 0.85)] ?? mid];
  return {
    colour: src,
    ink: ink.canvas,
    contour,
    contourLen: polylineLength(contour),
    spine: spineSmooth,
    spineLen: polylineLength(spineSmooth),
    contourW: Math.max(10, Math.min(w, h) * 0.07),
    spineW: spineW * 1.25,
    seeds,
    scratch: makeCanvas(w, h).ctx,
    scratch2: makeCanvas(w, h).ctx,
  };
}

/** Moore-neighbour trace of the largest outer boundary, starting at the right-most solid cell. */
function traceOutline(gw: number, gh: number, at: (x: number, y: number) => boolean): Pt[] {
  let start: Pt | null = null;
  for (let x = gw - 1; x >= 0 && !start; x--) {
    const ys: number[] = [];
    for (let y = 0; y < gh; y++) if (at(x, y)) ys.push(y);
    if (ys.length) start = { x, y: ys[0]! };
  }
  if (!start) return [];
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]] as const;
  const out: Pt[] = [start];
  let cur = start;
  let back = 0; // the cell to the right of the start is empty: search clockwise from just after it
  for (let guard = 0; guard < gw * gh * 4; guard++) {
    let found = -1;
    for (let k = 1; k <= 8; k++) {
      const dIdx = (back + k) % 8;
      const [dx, dy] = dirs[dIdx]!;
      if (at(cur.x + dx, cur.y + dy)) {
        found = dIdx;
        break;
      }
    }
    if (found < 0) break;
    const [dx, dy] = dirs[found]!;
    cur = { x: cur.x + dx, y: cur.y + dy };
    back = (found + 5) % 8;
    if (cur.x === start.x && cur.y === start.y) break;
    out.push(cur);
  }
  out.push(start);
  return out;
}

function smoothPath(pts: readonly Pt[], r: number): Pt[] {
  return pts.map((_, i) => {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let k = -r; k <= r; k++) {
      const p = pts[Math.min(pts.length - 1, Math.max(0, i + k))]!;
      sx += p.x;
      sy += p.y;
      n++;
    }
    return { x: sx / n, y: sy / n };
  });
}

export interface RevealOpts {
  /** Centre of the drawing on the canvas, and its drawn width (height follows). */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly t: number;
  /** When the nib touches down (s). */
  readonly at: number;
  /** Seconds of inking (outline, then interior). */
  readonly inkS: number;
  /** Seconds of the wash flooding in after the ink (0: stays a line drawing). */
  readonly washS: number;
  /** Show the pen (default true). */
  readonly nib?: boolean;
  /** Mirror the result (the reveal still runs on the source's own orientation). */
  readonly facing?: 1 | -1;
  readonly alpha?: number;
}

/** Where the inking is at `t`: 0..1 along the outline, then 0..1 along the spine. */
export function inkPhase(o: Pick<RevealOpts, 't' | 'at' | 'inkS'>): { readonly outline: number; readonly spine: number } {
  const u = clamp01((o.t - o.at) / o.inkS);
  const SPLIT = 0.68;
  return { outline: smooth(clamp01(u / SPLIT)) * 0.97 + clamp01(u / SPLIT) * 0.03, spine: smooth(clamp01((u - SPLIT) / (1 - SPLIT))) };
}

/** Draws the reveal at `t`. Returns the nib's tip on the canvas while it is inking, else null. */
export function drawInkReveal(ctx: CanvasRenderingContext2D, r: InkReveal, pen: HTMLImageElement | null, o: RevealOpts): Pt | null {
  if (o.t < o.at) return null;
  const { width: w, height: h } = r.colour;
  const s = o.width / w;
  const facing = o.facing ?? 1;
  const toCanvas = (p: Pt): Pt => ({ x: o.x + (p.x - w / 2) * s * facing, y: o.y + (p.y - h / 2) * s });
  const phase = inkPhase(o);
  const washU = o.washS > 0 ? clamp01((o.t - o.at - o.inkS) / o.washS) : 0;

  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.translate(o.x, o.y);
  ctx.scale(s * facing, s);
  ctx.translate(-w / 2, -h / 2);
  if (washU >= 1) {
    ctx.drawImage(r.colour, 0, 0);
  } else {
    // Ink through the growing mask.
    const m = r.scratch;
    m.globalCompositeOperation = 'source-over';
    m.clearRect(0, 0, w, h);
    m.lineCap = 'round';
    m.lineJoin = 'round';
    m.strokeStyle = '#000';
    strokePart(m, r.contour, r.contourLen * phase.outline, r.contourW);
    if (phase.spine > 0) strokePart(m, r.spine, r.spineLen * phase.spine, r.spineW);
    m.globalCompositeOperation = 'source-in';
    m.drawImage(r.ink, 0, 0);
    ctx.drawImage(m.canvas, 0, 0);
    if (washU > 0) drawWash(ctx, r, washU);
  }
  ctx.restore();

  // The nib: on the leading point while inking, then lifts away.
  const inkU = (o.t - o.at) / o.inkS;
  let tip: Pt | null = null;
  if (inkU < 1) {
    const along = phase.spine > 0 ? alongPolyline(r.spine, phase.spine) : alongPolyline(r.contour, phase.outline);
    tip = toCanvas(along.p);
  }
  if (pen && (o.nib ?? true)) {
    const lift = clamp01((inkU - 1) / (0.35 / o.inkS));
    if (lift < 1) {
      const end = toCanvas(alongPolyline(r.spine, 1).p);
      const at = tip ?? end;
      drawPen(ctx, pen, { x: at.x + lift * 160, y: at.y - lift * 220 }, 1 - lift, o.t);
    }
  }
  return tip;
}

function strokePart(m: CanvasRenderingContext2D, pts: readonly Pt[], len: number, width: number): void {
  if (len <= 0 || pts.length < 2) return;
  m.lineWidth = width;
  m.setLineDash([len, 1e6]);
  m.beginPath();
  pts.forEach((p, i) => (i === 0 ? m.moveTo(p.x, p.y) : m.lineTo(p.x, p.y)));
  m.stroke();
  m.setLineDash([]);
}

function blob(m: CanvasRenderingContext2D, c: Pt, rad: number, seed: number): void {
  m.beginPath();
  for (let k = 0; k <= 56; k++) {
    const a = (k / 56) * Math.PI * 2;
    const wob = 1 + 0.1 * Math.sin(a * 5 + seed) + 0.06 * Math.sin(a * 11 + seed * 2.3) + 0.04 * Math.sin(a * 17 + seed * 0.7);
    const x = c.x + Math.cos(a) * rad * wob;
    const y = c.y + Math.sin(a) * rad * wob * 0.82;
    if (k === 0) m.moveTo(x, y); else m.lineTo(x, y);
  }
  m.closePath();
}

/** The watercolour flooding in: blooms from the seeds, a darker pigment rim at the wet edge. */
function drawWash(ctx: CanvasRenderingContext2D, r: InkReveal, u: number): void {
  const { width: w, height: h } = r.colour;
  const m = r.scratch2;
  const maxR = Math.hypot(w, h) * 0.62;
  const radii = r.seeds.map((_, i) => {
    const delay = [0, 0.12, 0.24][i] ?? 0;
    return maxR * Math.pow(clamp01((u - delay) / (1 - delay)), 1.15);
  });
  m.globalCompositeOperation = 'source-over';
  m.clearRect(0, 0, w, h);
  m.fillStyle = '#000';
  r.seeds.forEach((c, i) => {
    if (radii[i]! <= 0) return;
    blob(m, c, radii[i]!, i * 1.9 + 0.4);
    m.fill();
  });
  m.globalCompositeOperation = 'source-in';
  m.drawImage(r.colour, 0, 0);
  m.globalCompositeOperation = 'source-over';
  ctx.drawImage(m.canvas, 0, 0);
  // Pigment pooling at the wet edge: the union's outer rim only (each blob's
  // ring minus the inside of the others), in the painting's own colours, multiplied.
  const fade = 1 - ramp(u, 0.7, 1);
  if (fade <= 0) return;
  const rim = r.scratch;
  const lw = Math.max(6, w * 0.02);
  rim.globalCompositeOperation = 'source-over';
  rim.clearRect(0, 0, w, h);
  rim.strokeStyle = '#000';
  rim.lineWidth = lw;
  r.seeds.forEach((c, i) => {
    if (radii[i]! <= 0) return;
    blob(rim, c, radii[i]!, i * 1.9 + 0.4);
    rim.stroke();
  });
  rim.globalCompositeOperation = 'destination-out';
  r.seeds.forEach((c, i) => {
    if (radii[i]! <= lw) return;
    blob(rim, c, radii[i]! - lw * 0.6, i * 1.9 + 0.4);
    r.seeds.forEach((_, j) => {
      if (j !== i) rim.fill();
    });
  });
  rim.globalCompositeOperation = 'source-in';
  rim.drawImage(r.colour, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha *= 0.95 * fade;
  ctx.drawImage(rim.canvas, 0, 0);
  ctx.restore();
}

/** Pen image hotspot: the nib's tip in pen.png px (see art/screen/cut.py). */
export const PEN_TIP = { x: 5, y: 499 } as const;
/** Drawn height of the pen, px. */
export const PEN_H = 300;

/** The painted dip pen with its tip on `tip`, a slight hand tremor. */
export function drawPen(ctx: CanvasRenderingContext2D, pen: HTMLImageElement, tip: Pt, alpha = 1, t = 0): void {
  const s = PEN_H / pen.height;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(tip.x, tip.y);
  ctx.rotate(0.05 * Math.sin(t * 9) - 0.04);
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 10;
  ctx.shadowOffsetY = 12;
  ctx.drawImage(pen, -PEN_TIP.x * s, -PEN_TIP.y * s, pen.width * s, pen.height * s);
  ctx.restore();
  // A wet dot of ink where the nib touches.
  if (alpha > 0.95) {
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
  }
}
