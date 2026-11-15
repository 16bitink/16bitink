import type { Pt } from '../sprites';
import { type AdderLay, type AdderSprites, drawAdderBody, drawAdderHead, smoothSpine } from './actors';
import { ADDER, ADDER_SNOUT } from './adderArt';
import type { Cast } from './cast';
import { dangerVignette, vignette } from './fx';
import { adderTongue, adderZoom, puffAt } from './story';

/**
 * "A puff adder, one of Africa's most dangerous.": the adder alone and big
 * on the red sand, seen a little from above, lying in its loose coil with
 * the neck drawn back in an S and the broad head on top, ready to strike;
 * the tongue flicks. On "dangerous" it puffs its body up (as puff adders
 * do, hissing) and the edges flush red.
 */
const FOCUS: Pt = { x: 540, y: 1180 };
const C: Pt = { x: 560, y: 1290 };
const FLAT = 0.46;

/** The coil, head first: the head and the S of the neck, then once round from the inside out to the tail. */
function coilSpine(puff: number, t: number): Pt[] {
  const sway = Math.sin(t * 2.4) * 6;
  const draw = puff * 26;
  const neck: Pt[] = [
    { x: 330 + sway + draw, y: 1040 - draw * 0.6 },
    { x: 410 + draw * 0.6, y: 1060 },
    { x: 470, y: 1110 },
    { x: 440, y: 1180 },
    { x: 470, y: 1240 },
  ];
  const ring: Pt[] = [];
  const turns = 1.08;
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const a = Math.PI * 0.85 + u * turns * Math.PI * 2;
    const r = 150 + u * 120;
    ring.push({ x: C.x + Math.cos(a) * r * 1.35, y: C.y + Math.sin(a) * r * FLAT });
  }
  return smoothSpine([...neck, ...ring], 3);
}

/** A forked black tongue from the snout along `dir`, `out` 0 .. 1. */
export function forkedTongue(ctx: CanvasRenderingContext2D, from: Pt, dir: number, len: number, out: number): void {
  if (out <= 0) return;
  const l = len * out;
  const tip = { x: from.x + Math.cos(dir) * l, y: from.y + Math.sin(dir) * l };
  ctx.save();
  ctx.strokeStyle = ADDER.tongue;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(3, len * 0.07);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(tip.x, tip.y);
  for (const s of [-0.5, 0.5]) {
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x + Math.cos(dir + s) * len * 0.3 * out, tip.y + Math.sin(dir + s) * len * 0.3 * out);
  }
  ctx.stroke();
  ctx.restore();
}

/** The coil drawn from its outside in (the tail under, the neck on top), in pieces so each lies over the one before. */
export function drawCoiled(ctx: CanvasRenderingContext2D, s: AdderSprites, boil: number, lay: AdderLay, cuts: readonly number[]): void {
  const bounds = [0, ...cuts, 1];
  for (let i = bounds.length - 1; i > 0; i--) drawAdderBody(ctx, s, boil, { ...lay, from: bounds[i - 1]!, to: bounds[i]! }, i === bounds.length - 1 ? 1 : 0.4);
}

export function drawAdderShot(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const puff = puffAt(t);
  const z = adderZoom(t);
  ctx.save();
  ctx.translate(FOCUS.x, FOCUS.y);
  ctx.scale(z, z);
  ctx.translate(-FOCUS.x, -FOCUS.y);
  ctx.drawImage(cast.bg.adder, 0, 0);
  const spine = coilSpine(puff, t);
  const lay: AdderLay = { spine, base: 150 * (1 + 0.14 * puff) };
  drawCoiled(ctx, cast.adder, boil, lay, [0.3, 0.62]);
  drawAdderHead(ctx, cast.adder, boil, lay, 'top', 0, 1.05);
  const a = spine[0]!;
  const b = spine[4]!;
  const dir = Math.atan2(a.y - b.y, a.x - b.x);
  const k = ((lay.base * 0.58) / 24) * 1.05;
  forkedTongue(ctx, { x: a.x + Math.cos(dir) * ADDER_SNOUT.top * k, y: a.y + Math.sin(dir) * ADDER_SNOUT.top * k }, dir, 90, adderTongue(t));
  ctx.restore();
  dangerVignette(ctx, puff);
  vignette(ctx, 0.4, 1150);
}
