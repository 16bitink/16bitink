import { INK, makeCanvas, Pen } from '../../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import { type Pt, spline } from '../../kraken/whale';

/**
 * A Chinook salmon, whole and shut-mouthed, in the painted ink of the
 * food-chain animals: a dark blue-green back with black spots, washes down
 * through bright silver to a white belly, a pale sheen along the flank, the
 * gill cover and lateral line in thin ink, an eye with a catchlight, a firm
 * outline. Baked once per line-boil frame, side-on, nose to +x.
 *
 * It's limp (it's a dead fish worn as a hat), so `drawDraped` lays it along
 * a curve column by column: its belly on the orca's head, its back to the sky.
 */

/** Sprite size in px; the fish runs nose (x 600) to tail tips (x 20), centre line y 110. */
const W = 620;
const H = 220;
const MID = 110;
/** Nose to tail tips, sprite px. */
export const SALMON_SPRITE_LEN = 580;
const NOSE_X = 600;

const at = (x: number, y: number): Pt => ({ x, y: MID + y });

const TOP: readonly Pt[] = spline([
  at(600, 4), at(588, -16), at(556, -38), at(500, -56), at(420, -68), at(330, -70), at(240, -62), at(160, -46), at(110, -32), at(84, -24),
], 6);
const BOTTOM: readonly Pt[] = spline([
  at(600, 4), at(590, 20), at(560, 36), at(500, 50), at(420, 58), at(330, 58), at(240, 50), at(160, 36), at(110, 24), at(84, 18),
], 6);
const TAIL: readonly Pt[] = spline([at(84, -24), at(52, -48), at(22, -66), at(34, -30), at(44, 0), at(34, 30), at(22, 66), at(52, 46), at(84, 18)], 5);
const BODY: readonly Pt[] = [...TOP, ...TAIL.slice(1, -1), ...[...BOTTOM].reverse()];
const DORSAL: readonly Pt[] = spline([at(372, -69), at(350, -108), at(318, -118), at(300, -104), at(282, -66)], 5);
const ADIPOSE: readonly Pt[] = spline([at(186, -50), at(170, -70), at(156, -66), at(150, -44)], 4);
const ANAL: readonly Pt[] = spline([at(214, 46), at(196, 76), at(170, 82), at(168, 40)], 4);
const PELVIC: readonly Pt[] = spline([at(330, 58), at(312, 86), at(292, 84), at(298, 56)], 4);
const PECTORAL: readonly Pt[] = spline([at(492, 30), at(452, 52), at(432, 50), at(470, 22)], 4);
const GILL: readonly Pt[] = spline([at(500, -50), at(486, -14), at(484, 20), at(496, 46)], 5);
const LATERAL: readonly Pt[] = spline([at(486, -8), at(400, -10), at(300, -6), at(200, -2), at(100, 0)], 5);
const MOUTH: readonly Pt[] = spline([at(600, 6), at(576, 12), at(550, 14)], 4);
const EYE = at(560, -8);

function path(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

function fin(ctx: CanvasRenderingContext2D, pen: Pen, pts: readonly Pt[], alpha = 0.85): void {
  path(ctx, pts);
  ctx.fillStyle = `rgba(74,92,96,${alpha})`;
  ctx.fill();
  pen.stroke([...pts], 2.4, INK, 0.9, false);
}

function paint(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, H);
  const pen = new Pen(ctx, seed, 0.9);
  for (const f of [DORSAL, ADIPOSE, ANAL, PELVIC]) fin(ctx, pen, f);
  ctx.save();
  path(ctx, BODY);
  ctx.clip();
  // Back to belly: dark blue-green, bright silver, white.
  const g = ctx.createLinearGradient(0, MID - 72, 0, MID + 60);
  g.addColorStop(0, '#22383f');
  g.addColorStop(0.28, '#3f5f66');
  g.addColorStop(0.48, '#9fb3b4');
  g.addColorStop(0.62, '#d7dfdc');
  g.addColorStop(1, '#f3f1e8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // The tail darker, the head a touch bronze.
  const tail = ctx.createLinearGradient(40, 0, 240, 0);
  tail.addColorStop(0, 'rgba(34,48,54,0.7)');
  tail.addColorStop(1, 'rgba(34,48,54,0)');
  ctx.fillStyle = tail;
  ctx.fillRect(0, 0, 240, H);
  const head = ctx.createRadialGradient(540, MID - 6, 6, 540, MID - 6, 90);
  head.addColorStop(0, 'rgba(150,140,110,0.32)');
  head.addColorStop(1, 'rgba(150,140,110,0)');
  ctx.fillStyle = head;
  ctx.fillRect(420, 0, 200, H);
  // The sheen: a pale streak along the flank.
  ctx.strokeStyle = 'rgba(255,255,250,0.5)';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(470, MID + 6);
  ctx.quadraticCurveTo(320, MID + 14, 150, MID + 8);
  ctx.stroke();
  // Black spots on the back and the tail.
  ctx.fillStyle = 'rgba(16,20,24,0.75)';
  for (let i = 0; i < 46; i++) {
    const x = 60 + pen.rng() * 440;
    const y = MID - 66 + pen.rng() * (x < 110 ? 120 : 44);
    ctx.beginPath();
    ctx.ellipse(x, y, 2.6 + pen.rng() * 2.4, 2 + pen.rng() * 1.6, pen.rng(), 0, Math.PI * 2);
    ctx.fill();
  }
  // Scale hatching, faint, on the silver.
  for (let x = 140; x < 470; x += 16) pen.hair([{ x, y: MID - 30 }, { x: x - 8, y: MID + 30 }], 0.8, INK, 0.12);
  ctx.restore();
  pen.hair([...GILL], 2.2, INK, 0.8);
  pen.hair([...LATERAL], 1.3, INK, 0.45);
  fin(ctx, pen, PECTORAL, 0.7);
  pen.stroke([...MOUTH], 2.4, INK, 0.9, false);
  // The eye: dark iris in a gold ring, a catchlight.
  ctx.fillStyle = '#b89a52';
  ctx.beginPath();
  ctx.arc(EYE.x, EYE.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0d0f12';
  ctx.beginPath();
  ctx.arc(EYE.x + 1, EYE.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(EYE.x + 3, EYE.y - 3, 2.4, 0, Math.PI * 2);
  ctx.fill();
  pen.stroke([...BODY, BODY[0]!], 3.4, INK, 1);
  return canvas;
}

/** How far below the centre line the belly is at sprite column x (the tail's lower lobe hangs over the side). */
function bellyAt(x: number): number {
  if (x <= 84) return 18;
  for (let i = 1; i < BOTTOM.length; i++) {
    const [a, b] = [BOTTOM[i - 1]!, BOTTOM[i]!];
    if ((a.x - x) * (b.x - x) <= 0) return a.y + ((b.y - a.y) * (x - a.x)) / ((b.x - a.x) || 1) - MID;
  }
  return 4;
}

let frames: HTMLCanvasElement[] | null = null;
function sprites(): HTMLCanvasElement[] {
  frames ??= Array.from({ length: BOIL_FRAMES }, (_, i) => paint(71 + i * 13));
  return frames;
}

/** Bakes the boil frames. */
export async function prepareSalmon(): Promise<void> {
  sprites();
}

/** A point along a polyline by arc length, with the unit tangent there. */
function along(line: readonly Pt[], s: number): { readonly p: Pt; readonly tx: number; readonly ty: number } {
  let rest = Math.max(0, s);
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1]!, line[i]!];
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1e-6;
    if (rest <= d || i === line.length - 1) {
      const u = Math.min(1, rest / d);
      return { p: { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }, tx: (b.x - a.x) / d, ty: (b.y - a.y) / d };
    }
    rest -= d;
  }
  return { p: line[0]!, tx: 1, ty: 0 };
}

export const lengthOf = (line: readonly Pt[]): number => line.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - line[i]!.x, p.y - line[i]!.y), 0);

export interface Drape {
  /** The surface it lies on, ordered so it runs toward where the salmon's nose points. */
  readonly line: readonly Pt[];
  /** Arc length along `line` where the nose is. */
  readonly noseAt: number;
  /** Nose to tail tips, in the line's units. */
  readonly length: number;
  /** Tail flick: lifts the tail end off the surface, in the line's units (+ up). */
  readonly flick?: number;
  readonly alpha?: number;
}

/** Lays the salmon along `drape.line` in the current transform, its belly on the line. */
export function drawDraped(ctx: CanvasRenderingContext2D, drape: Drape, t: number): void {
  const alpha = drape.alpha ?? 1;
  if (alpha <= 0.01) return;
  const sprite = sprites()[Math.floor(t * BOIL_FPS) % BOIL_FRAMES]!;
  const k = drape.length / SALMON_SPRITE_LEN;
  const strips = 40;
  const sw = W / strips;
  ctx.save();
  ctx.globalAlpha *= alpha;
  for (let i = 0; i < strips; i++) {
    const sx = i * sw;
    const fromNose = (NOSE_X - (sx + sw / 2)) * k;
    const { p, tx, ty } = along(drape.line, drape.noseAt - fromNose);
    const u = Math.max(0, fromNose / drape.length);
    // Belly on the surface: the strip's centre line sits its own belly-depth above it, a touch sunk by its weight.
    const lift = (bellyAt(sx + sw / 2) - 3) * k + (drape.flick ?? 0) * u * u;
    ctx.save();
    ctx.translate(p.x + ty * lift, p.y - tx * lift);
    ctx.rotate(Math.atan2(ty, tx));
    ctx.drawImage(sprite, sx, 0, sw + 1, H, (sx - (sx + sw / 2)) * k, -MID * k, (sw + 1.2) * k, H * k);
    ctx.restore();
  }
  ctx.restore();
}

/** The salmon straight, centre (x, y), nose along `angle`, `length` nose to tail. */
export function drawSalmon(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, t: number): void {
  const sprite = sprites()[Math.floor(t * BOIL_FPS) % BOIL_FRAMES]!;
  const k = length / SALMON_SPRITE_LEN;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(sprite, -(NOSE_X - SALMON_SPRITE_LEN / 2) * k, -MID * k, W * k, H * k);
  ctx.restore();
}
