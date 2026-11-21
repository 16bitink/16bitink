import { INK, PAPER, type Pt } from '../../../../src/art/pen';
import type { SharkId } from './ids';

/**
 * The one shape every shark in the size comparison is drawn through, so the
 * engine can stage any of them beside "you" the same way. KEEP THIS STABLE:
 * art agents paint against it in parallel with the engine.
 *
 * A full side view, FACING LEFT, placed by its SNOUT TIP: (x, y) is the tip
 * of the snout, and `length` is the total length, snout tip to the tip of the
 * tail's upper lobe, measured straight along the body (the way the ladder's
 * numbers are measured). The body extends to the RIGHT of (x, y); belly down.
 *
 * New paintings implement `RawShark`: draw FACING RIGHT, anywhere around the
 * origin, at roughly `len` px long. `fitShark` (roster.ts uses it on every
 * shark, old and new) measures the drawing once on an offscreen canvas,
 * finds its real snout tip and its real length, and from then on places it
 * exactly, mirrored to face left. So a painting that comes out 6% long or
 * puts its origin at the body's middle still lands right.
 */

export interface SharkPose {
  /** The snout tip, canvas px. */
  readonly x: number;
  readonly y: number;
  /** Total length, snout tip to the upper tail lobe's tip, px. */
  readonly length: number;
  /** The gulp: 0 jaw shut .. 1 wide open (filter feeders: the feeding gape). */
  readonly gulp: number;
  /** Seconds, for idle motion (line boil, a blink). Must not move the snout tip. */
  readonly t: number;
  /** Tail-beat phase, radians. Defaults to swimming with `t`. */
  readonly beat?: number;
  /** Turned about the snout tip, radians, positive = nose up (π/2: standing on its tail, nose at the top). */
  readonly tilt?: number;
}

/** What a painting provides: draws facing RIGHT around the origin, about `len` px long. */
export interface RawShark {
  readonly id: SharkId;
  readonly name: string;
  /** True for real paintings; false for the labelled placeholders. */
  readonly painted: boolean;
  /** Bakes sprites (called once before the first frame). */
  readonly prepare?: () => void | Promise<void>;
  readonly draw: (ctx: CanvasRenderingContext2D, len: number, gulp: number, t: number, beat: number) => void;
  /** Where meals go in, as fractions of the length: back from the snout tip, and down from it. */
  readonly mouth: { readonly along: number; readonly below: number };
}

export interface SharkArt {
  readonly id: SharkId;
  readonly name: string;
  readonly painted: boolean;
  /** Body height (fins included) over length, measured; and the top's height above the snout tip, over length. */
  readonly depth: number;
  readonly top: number;
  readonly draw: (ctx: CanvasRenderingContext2D, pose: SharkPose) => void;
  /** Where the meal goes in, canvas px, for a pose. */
  readonly mouthAt: (pose: SharkPose) => Pt;
}

const PROBE = 1000;
const PROBE_W = 1800;
const PROBE_H = 1100;

interface Fit {
  /** The snout tip relative to the raw origin, and the real length, all over the probe length. */
  readonly dx: number;
  readonly dy: number;
  readonly k: number;
  readonly depth: number;
  readonly top: number;
}

/** Draws `raw` once facing right at PROBE px and measures its opaque box and its snout tip. */
function measure(raw: RawShark): Fit {
  const c = document.createElement('canvas');
  c.width = PROBE_W;
  c.height = PROBE_H;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  const ox = PROBE_W / 2;
  const oy = PROBE_H / 2;
  g.save();
  g.translate(ox, oy);
  raw.draw(g, PROBE, 0, 0, 0);
  g.restore();
  const { data } = g.getImageData(0, 0, PROBE_W, PROBE_H);
  let left = PROBE_W;
  let right = -1;
  let top = PROBE_H;
  let bottom = -1;
  for (let y = 0; y < PROBE_H; y += 2) {
    for (let x = 0; x < PROBE_W; x += 2) {
      if (data[(y * PROBE_W + x) * 4 + 3]! < 40) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) throw new Error(`${raw.id}: the drawing is empty`);
  const width = right - left;
  // The snout tip: the middle of what's opaque in the last 1% before the right edge.
  let sum = 0;
  let n = 0;
  for (let y = top; y <= bottom; y++) {
    for (let x = Math.max(left, right - Math.ceil(width * 0.01)); x <= right; x++) {
      if (data[(y * PROBE_W + x) * 4 + 3]! < 40) continue;
      sum += y;
      n++;
    }
  }
  const snoutY = n ? sum / n : (top + bottom) / 2;
  return { dx: (right - ox) / PROBE, dy: (snoutY - oy) / PROBE, k: width / PROBE, depth: (bottom - top) / width, top: (snoutY - top) / width };
}

/** Wraps a painting so it's placed by its snout tip and true length, facing left (see the header). Call after its prepare(). */
export function fitShark(raw: RawShark): SharkArt {
  const fit = measure(raw);
  const draw = (ctx: CanvasRenderingContext2D, p: SharkPose): void => {
    if (p.length < 1) return;
    const len = p.length / fit.k;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.tilt ?? 0);
    ctx.scale(-1, 1);
    ctx.translate(-fit.dx * len, -fit.dy * len);
    raw.draw(ctx, len, Math.max(0, Math.min(1, p.gulp)), p.t, p.beat ?? p.t * 5);
    ctx.restore();
  };
  const mouthAt = (p: SharkPose): Pt => {
    const a = p.tilt ?? 0;
    const along = raw.mouth.along * p.length;
    const below = raw.mouth.below * p.length;
    // Facing left: "back from the snout" is +x before the tilt.
    return { x: p.x + along * Math.cos(a) - below * Math.sin(a), y: p.y + along * Math.sin(a) + below * Math.cos(a) };
  };
  return { id: raw.id, name: raw.name, painted: raw.painted, depth: fit.depth, top: fit.top, draw, mouthAt };
}

// ---------------------------------------------------------------- the generic outline (placeholders and ghosts)

/** A shark's build for the generic outline: body depth over length, and the odd head. */
export interface Build {
  readonly depth: number;
  /** 'hammer': the hammerhead's cephalofoil; 'blunt': a short round snout (Greenland, whale shark); 'long': a long cone (mako, white). */
  readonly head?: 'hammer' | 'blunt' | 'long';
  /** Fin colour accents: 'blacktip' inks the fin tips. */
  readonly tips?: boolean;
}

/** Traces a generic shark side view facing RIGHT, snout tip at (0, 0), `len` long: body, dorsal, pectoral, tail. */
export function traceShark(ctx: CanvasRenderingContext2D, len: number, b: Build): void {
  const L = len;
  const d = b.depth * L * 0.5;
  const nose = b.head === 'blunt' ? 0.05 : b.head === 'long' ? 0.12 : 0.09;
  const tailBase = 0.78;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  // Back: up from the snout to the first dorsal, the dorsal, down to the tail stalk.
  ctx.quadraticCurveTo(-nose * L * 0.6, -d * 0.45, -nose * L * 2.2, -d * 0.5);
  ctx.quadraticCurveTo(-0.3 * L, -d * 0.62, -0.36 * L, -d * 0.6);
  ctx.lineTo(-0.44 * L, -d * 1.25);
  ctx.quadraticCurveTo(-0.46 * L, -d * 0.9, -0.5 * L, -d * 0.48);
  ctx.quadraticCurveTo(-0.66 * L, -d * 0.3, -tailBase * L, -d * 0.12);
  // Tail: the long upper lobe, the short lower lobe.
  ctx.lineTo(-L, -d * 1.05);
  ctx.quadraticCurveTo(-0.93 * L, -d * 0.3, -0.9 * L, -d * 0.05);
  ctx.lineTo(-0.96 * L, d * 0.65);
  ctx.quadraticCurveTo(-0.86 * L, d * 0.2, -tailBase * L, d * 0.1);
  // Belly back to the snout, the pectoral hanging under the front.
  ctx.quadraticCurveTo(-0.6 * L, d * 0.32, -0.32 * L, d * 0.48);
  ctx.lineTo(-0.36 * L, d * 1.05);
  ctx.lineTo(-0.24 * L, d * 0.5);
  ctx.quadraticCurveTo(-nose * L * 1.6, d * 0.45, 0, d * 0.08);
  ctx.closePath();
  if (b.head === 'hammer') {
    ctx.moveTo(0.01 * L, -d * 0.12);
    ctx.lineTo(0.01 * L, d * 0.2);
    ctx.lineTo(-0.05 * L, d * 0.22);
    ctx.lineTo(-0.05 * L, -d * 0.14);
    ctx.closePath();
  }
}

/** A labelled grey stand-in for a shark whose painting hasn't landed. */
export function placeholderShark(id: SharkId, name: string, build: Build, mouth: RawShark['mouth'] = { along: 0.06, below: 0.03 }): RawShark {
  return {
    id, name, painted: false, mouth,
    draw(ctx, len, gulp) {
      ctx.save();
      ctx.fillStyle = '#8f99a6';
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.5, len * 0.006);
      ctx.lineJoin = 'round';
      traceShark(ctx, len, build);
      ctx.fill('evenodd');
      ctx.stroke();
      if (build.tips) {
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(-0.44 * len, -build.depth * len * 1.18, len * 0.018, 0, Math.PI * 2);
        ctx.arc(-len * 0.99, -build.depth * len * 1.0, len * 0.018, 0, Math.PI * 2);
        ctx.fill();
      }
      // The jaw: a dark wedge under the snout that opens with the gulp.
      ctx.fillStyle = '#3a1418';
      ctx.beginPath();
      ctx.moveTo(-0.03 * len, build.depth * len * 0.12);
      ctx.lineTo(-0.1 * len, build.depth * len * (0.2 + 0.5 * gulp));
      ctx.lineTo(-0.11 * len, build.depth * len * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PAPER;
      ctx.font = `700 ${Math.max(8, Math.round(len * 0.045))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // fitShark mirrors the drawing to face left: mirror the label back so it reads.
      ctx.translate(-0.42 * len, 0);
      ctx.scale(-1, 1);
      ctx.fillText(`${name} · PLACEHOLDER`, 0, 0);
      ctx.restore();
    },
  };
}
