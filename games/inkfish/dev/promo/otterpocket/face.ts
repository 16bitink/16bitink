import { INK, type Pen, type Pt } from '../../../src/art/pen';
import { smoothLoop } from '../seal/art/paint';
import { dab, fur, path, radialFill, rngOf, taper, through } from './brush';

/**
 * The sea otter's head, seen from the front as it floats looking up at us:
 * round and blunt, pale cream and grizzled with brown, small ears low on the
 * sides, dark eyes with a catchlight, two puffy whisker pads, a broad dark
 * nose pad and long white whiskers. Moods are the lids, brows and mouth.
 */

export interface FaceLook {
  /** Head roll about the neck (radians). */
  readonly tilt: number;
  /** Eyes open 0..1. */
  readonly eyes: number;
  /** Closed eyes curved up in a grin (1) or plain shut (0). */
  readonly happy: number;
  readonly smile: number;
  /** Mouth open in a laugh, 0..1. */
  readonly laugh: number;
  /** Where the eyes look, -1..1 each way. */
  readonly look: Pt;
  /** Brows up (1, surprise) or down (-1, mischief). */
  readonly brow: number;
}

const NECK: Pt = { x: 0, y: -300 };
export const HEAD_C: Pt = { x: 0, y: -418 };

const HEAD: readonly Pt[] = smoothLoop([
  { x: 0, y: -566 }, { x: 106, y: -548 }, { x: 172, y: -488 }, { x: 196, y: -408 }, { x: 180, y: -338 }, { x: 128, y: -286 },
  { x: 0, y: -262 }, { x: -128, y: -286 }, { x: -180, y: -338 }, { x: -196, y: -408 }, { x: -172, y: -488 }, { x: -106, y: -548 },
], 6);
const PAD = (s: number): Pt => ({ x: s * 46, y: -352 });
const EYE = (s: number): Pt => ({ x: s * 72, y: -438 });

function drawEar(ctx: CanvasRenderingContext2D, pen: Pen, lw: number, s: number): void {
  const ear = smoothLoop([{ x: s * 150, y: -500 }, { x: s * 170, y: -536 }, { x: s * 198, y: -530 }, { x: s * 204, y: -496 }, { x: s * 186, y: -474 }], 4);
  radialFill(ctx, ear, { x: s * 178, y: -510 }, 40, [[0, '#4a3326'], [1, '#2a1a12']]);
  pen.closed(ear, 2.6 * lw);
}

function drawEye(ctx: CanvasRenderingContext2D, pen: Pen, lw: number, s: number, f: FaceLook): void {
  const c = EYE(s);
  const r = 17;
  // A soft dark socket, as the sea otter's eye sits in a slightly darker patch.
  dab(ctx, c.x, c.y + 2, 42, '96,72,52', 0.4);
  const open = Math.max(0, Math.min(1, f.eyes));
  if (open < 0.15) {
    // Shut: a grin curve (happy) or a plain line.
    const bend = -10 * f.happy + 4 * (1 - f.happy);
    pen.stroke(through({ x: c.x - 18, y: c.y + 2 }, { x: c.x, y: c.y + bend }, { x: c.x + 18, y: c.y + 2 }, 8), 3.6 * lw, INK, 1, false);
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, r, r * (0.35 + 0.65 * open), 0, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(c.x, c.y + r * 0.4, 1, c.x, c.y, r * 1.1);
    g.addColorStop(0, '#5a3820');
    g.addColorStop(0.5, '#1d120b');
    g.addColorStop(1, '#050303');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    const lx = c.x + f.look.x * 4;
    const ly = c.y + f.look.y * 3;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.arc(lx, ly, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.ellipse(lx + 5, ly - 6, 5.2, 4.2, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(lx - 6, ly + 6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.lineWidth = 2.6 * lw;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, r, r * (0.35 + 0.65 * open), 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.restore();
  }
  // The brow: a small lit tuft of fur over the eye.
  const lift = 8 * f.brow;
  const inner = { x: c.x - s * 20, y: c.y - 26 - lift + (f.brow < 0 ? 6 : 0) };
  const outer = { x: c.x + s * 22, y: c.y - 30 - lift * 0.6 };
  taper(ctx, [inner, { x: (inner.x + outer.x) / 2, y: Math.min(inner.y, outer.y) - 6 }, outer], 7, 2, '#8b6a4c', 0.7);
}

function drawMuzzle(ctx: CanvasRenderingContext2D, pen: Pen, lw: number, f: FaceLook): void {
  // The mouth under the pads: a smile, or open in a laugh.
  const corner = -322 - 12 * f.smile;
  if (f.laugh > 0.02) {
    const open = 46 * f.laugh;
    const mouth = smoothLoop([{ x: -48, y: corner }, { x: 0, y: -318 }, { x: 48, y: corner }, { x: 26, y: -312 + open * 0.7 }, { x: 0, y: -310 + open }, { x: -26, y: -312 + open * 0.7 }], 5);
    path(ctx, mouth);
    ctx.fillStyle = '#3a1612';
    ctx.fill();
    dab(ctx, 0, -306 + open * 0.8, 26 * f.laugh + 4, '200,110,104', 0.9);
    pen.closed(mouth, 2.8 * lw);
  } else {
    pen.stroke(through({ x: -52, y: corner }, { x: -24, y: -312 }, { x: 0, y: -322 }, 8), 2.8 * lw, INK, 1, false);
    pen.stroke(through({ x: 0, y: -322 }, { x: 24, y: -312 }, { x: 52, y: corner }, 8), 2.8 * lw, INK, 1, false);
  }
  // Two puffy whisker pads.
  for (const s of [-1, 1]) {
    const c = PAD(s);
    const pad = smoothLoop(Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      return { x: c.x + Math.cos(a) * 60, y: c.y + Math.sin(a) * 42 };
    }), 4);
    radialFill(ctx, pad, { x: c.x - 10, y: c.y - 14 }, 70, [[0, '#f7f0e2'], [0.7, '#e2d4b8'], [1, '#bda988']]);
    for (let row = 0; row < 3; row++) {
      for (let k = 0; k < 4; k++) {
        pen.dot(c.x + s * (8 + k * 13) - s * row * 4, c.y - 12 + row * 11, 1.8, '#4b3a2e', 0.7);
      }
    }
    pen.stroke(pad.slice(Math.floor(pad.length * 0.05), Math.floor(pad.length * 0.55)), 2.2 * lw, INK, 0.8, false);
  }
  // The nose pad: broad, dark and leathery, with a wet highlight.
  const nose = smoothLoop([{ x: -40, y: -414 }, { x: 40, y: -414 }, { x: 44, y: -398 }, { x: 20, y: -374 }, { x: 0, y: -368 }, { x: -20, y: -374 }, { x: -44, y: -398 }], 5);
  radialFill(ctx, nose, { x: -8, y: -402 }, 52, [[0, '#4d3a33'], [0.5, '#241814'], [1, '#0d0907']]);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-10, -404, 13, 5, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  for (const s of [-1, 1]) pen.stroke(through({ x: s * 30, y: -394 }, { x: s * 20, y: -386 }, { x: s * 10, y: -390 }, 6), 3 * lw, '#000', 0.9, false);
  pen.closed(nose, 2.6 * lw);
}

function drawWhiskers(ctx: CanvasRenderingContext2D, s: number): void {
  for (let i = 0; i < 8; i++) {
    const root = { x: s * (40 + i * 7), y: -366 + i * 6 };
    const a = -0.32 + i * 0.1;
    const len = 150 + 30 * Math.sin(i * 1.7) + 20;
    const tip = { x: root.x + s * Math.cos(a) * len, y: root.y + Math.sin(a) * len + 10 };
    const mid = { x: (root.x + tip.x) / 2, y: (root.y + tip.y) / 2 - 10 };
    const pts = through(root, mid, tip, 10);
    taper(ctx, pts.map((p) => ({ x: p.x, y: p.y + 1.6 })), 3.2, 0.4, '#3a2a1e', 0.35);
    taper(ctx, pts, 3.4, 0.5, '#f8f4ea', 0.95);
  }
}

/** The head (or, from behind, the back of it) about the neck, rolled by `f.tilt`. */
export function drawHead(ctx: CanvasRenderingContext2D, pen: Pen, lw: number, f: FaceLook, back: boolean): void {
  ctx.save();
  ctx.translate(NECK.x, NECK.y);
  ctx.rotate(f.tilt);
  ctx.translate(-NECK.x, -NECK.y);
  for (const s of [-1, 1]) drawEar(ctx, pen, lw, s);
  radialFill(ctx, HEAD, { x: -40, y: -470 }, 240, back
    ? [[0, '#a68a68'], [0.6, '#7c6046'], [1, '#4a3424']]
    : [[0, '#f4ecda'], [0.5, '#dccaa6'], [0.85, '#b89c74'], [1, '#8a6d4e']]);
  // Grizzled: brown flecks, thicker towards the crown and the edges.
  fur(ctx, rngOf(back ? 13 : 12), HEAD, {
    count: 520, dir: (p) => Math.atan2(p.y - HEAD_C.y, p.x - HEAD_C.x), len: [8, 15], width: 2.4,
    inks: [['#6e5038', 0.32], ['#f7f0e0', 0.4], ['#9c7c5a', 0.3]],
    density: (p) => 0.35 + 0.65 * Math.min(1, Math.hypot(p.x - HEAD_C.x, (p.y - HEAD_C.y) * 1.2) / 190),
  });
  if (!back) {
    for (const s of [-1, 1]) drawEye(ctx, pen, lw, s, f);
    drawMuzzle(ctx, pen, lw, f);
  }
  pen.closed(HEAD, 3.4 * lw);
  if (!back) for (const s of [-1, 1]) drawWhiskers(ctx, s);
  ctx.restore();
}
