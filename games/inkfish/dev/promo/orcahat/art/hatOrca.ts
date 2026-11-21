import { INK, Pen } from '../../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import { drawOrca } from '../../foodchain/art/orca';
import { type Pt, spline } from '../../kraken/whale';
import { drawDraped, lengthOf } from './salmon';

/**
 * The food-chain video's painted orca (../../foodchain/art/orca.ts) wearing a
 * salmon. Two kinds: J27, a grown male, keeps the art's very tall straight
 * dorsal fin; the 1987 female's fin is masked off and replaced by a shorter,
 * backward-curving one painted the same way. Both keep the art's eye patch
 * and grey saddle. The salmon lies over the top of the head, in front of the
 * blowhole, nose to the orca's snout.
 *
 * Local units are the art's: snout at x 0, facing +x, y down, 1000 snout to flukes.
 */

const LEN = 1000;

export interface HatOrca {
  /** The centre (snout to flukes), screen px, as drawOrca places it. */
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly angle: number;
  readonly female: boolean;
  /** How much of the salmon hat shows (0 none, 1 on). */
  readonly hat: number;
  /** The salmon's tail lifting off the head (local units, + up). */
  readonly flick?: number;
  readonly tail?: number;
  /** Mirrored top to bottom (with angle π: swimming left). */
  readonly flip?: boolean;
}

/** The art's back line near the dorsal fin, local (a copy of its control points). */
const BACK_MID: readonly Pt[] = [{ x: -260, y: -115 }, { x: -370, y: -121 }, { x: -470, y: -115 }, { x: -570, y: -98 }, { x: -660, y: -76 }];
const backAt = (x: number): number => {
  for (let i = 1; i < BACK_MID.length; i++) {
    const [a, b] = [BACK_MID[i - 1]!, BACK_MID[i]!];
    if (x <= a.x && x >= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return -110;
};

/** The male fin's area, masked off on the female: above the back between these x. */
const MASK_X: readonly [number, number] = [-336, -552];
const MASK: readonly Pt[] = (() => {
  const base: Pt[] = [];
  for (let x = MASK_X[0]; x >= MASK_X[1]; x -= 12) base.push({ x, y: backAt(x) - 6 });
  return [...base, { x: MASK_X[1], y: -420 }, { x: MASK_X[0], y: -420 }];
})();

/** The female's fin: about 0.9 m on a 6 m whale, its tip swept back, the trailing edge hollow. */
export const FEMALE_FIN: readonly Pt[] = spline([
  { x: -334, y: -121 }, { x: -356, y: -160 }, { x: -384, y: -204 }, { x: -418, y: -238 }, { x: -452, y: -256 }, { x: -470, y: -258 },
  { x: -462, y: -244 }, { x: -462, y: -214 }, { x: -476, y: -176 }, { x: -502, y: -140 }, { x: -540, y: -110 },
], 6);
export const FEMALE_FIN_TOP = -258;
/** The art's male fin tip, for comparison (orca.ts FIN_UP). */
export const MALE_FIN_TOP = -342;

/** The top of the head, from behind the blowhole to the snout (the art's BACK control points). */
const HEAD_TOP: readonly Pt[] = spline([
  { x: -260, y: -115 }, { x: -165, y: -99 }, { x: -95, y: -76 }, { x: -45, y: -46 }, { x: -16, y: -18 }, { x: -3, y: 6 },
], 8);
/** The salmon's nose sits here on the head, local x; its tail ends short of the blowhole. */
const NOSE_X = -30;
export const SALMON_LEN = 185;
const NOSE_S: number = (() => {
  for (let i = 1; i < HEAD_TOP.length; i++) if (HEAD_TOP[i]!.x >= NOSE_X) return lengthOf(HEAD_TOP.slice(0, i + 1));
  return lengthOf(HEAD_TOP);
})();

/** A local point of the orca on screen. */
export function onOrca(o: HatOrca, p: Pt): Pt {
  const s = o.len / LEN;
  const lx = (p.x + LEN / 2) * s;
  const ly = (o.flip ? -p.y : p.y) * s;
  const [c, n] = [Math.cos(o.angle), Math.sin(o.angle)];
  return { x: o.x + lx * c - ly * n, y: o.y + lx * n + ly * c };
}
export const snoutOf = (o: HatOrca): Pt => onOrca(o, { x: 0, y: 0 });
/** The middle of the salmon on the head, on screen. */
export const hatOf = (o: HatOrca): Pt => onOrca(o, { x: NOSE_X - SALMON_LEN / 2 + 10, y: -100 });

function toLocal(ctx: CanvasRenderingContext2D, o: HatOrca): void {
  const s = o.len / LEN;
  ctx.translate(o.x, o.y);
  ctx.rotate(o.angle);
  if (o.flip) ctx.scale(1, -1);
  ctx.scale(s, s);
  ctx.translate(LEN / 2, 0);
}

function femaleFin(ctx: CanvasRenderingContext2D, f: number): void {
  const pen = new Pen(ctx, 401 + f * 7, 1.1);
  ctx.beginPath();
  FEMALE_FIN.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.lineTo(-540, -96);
  ctx.lineTo(-334, -108);
  ctx.closePath();
  const g = ctx.createLinearGradient(-360, -250, -470, -120);
  g.addColorStop(0, '#2b3442');
  g.addColorStop(0.5, '#151a24');
  g.addColorStop(1, '#10141c');
  ctx.fillStyle = g;
  ctx.fill();
  // The light from above catching the leading edge in broken strokes.
  for (let i = 0; i < 4; i++) {
    const a = FEMALE_FIN[6 + i * 7];
    const b = FEMALE_FIN[9 + i * 7];
    if (a && b) pen.hair([{ x: a.x - 6, y: a.y + 5 }, { x: b.x - 6, y: b.y + 5 }], 3, '#8d9bb0', 0.45);
  }
  pen.stroke([...FEMALE_FIN], 3.2, INK, 1);
}

/** The grey saddle behind the fin, painted stronger than the art's so it reads at any size. */
const SADDLE: readonly Pt[] = (() => {
  const top: Pt[] = [];
  const under: Pt[] = [];
  for (let x = -525; x >= -665; x -= 10) {
    const u = (x + 525) / -140;
    top.push({ x, y: backAt(x) + 5 });
    under.unshift({ x, y: backAt(x) + 8 + 46 * Math.sin(Math.PI * u) ** 0.8 });
  }
  return [...top, ...under];
})();

function saddle(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  SADDLE.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -110, 0, -50);
  g.addColorStop(0, 'rgba(184,190,200,0.85)');
  g.addColorStop(1, 'rgba(160,168,182,0.3)');
  ctx.fillStyle = g;
  ctx.fill();
}

/** Draws the orca and its hat. */
export function drawHatOrca(ctx: CanvasRenderingContext2D, o: HatOrca, t: number): void {
  const f = Math.floor(t * BOIL_FPS) % BOIL_FRAMES;
  ctx.save();
  if (o.female) {
    const m = ctx.getTransform();
    toLocal(ctx, o);
    ctx.beginPath();
    ctx.rect(-1400, -900, 2800, 1800);
    MASK.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.clip('evenodd');
    ctx.setTransform(m);
  }
  drawOrca(ctx, o.x, o.y, o.len, o.angle, t, { tail: o.tail }, o.flip ?? false);
  ctx.restore();
  ctx.save();
  toLocal(ctx, o);
  saddle(ctx);
  if (o.female) femaleFin(ctx, f);
  drawDraped(ctx, { line: HEAD_TOP, noseAt: NOSE_S, length: SALMON_LEN, flick: o.flick ?? 0, alpha: o.hat }, t);
  ctx.restore();
}
