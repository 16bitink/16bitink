import { PAPER } from '../../../src/art/pen';
import { createWater } from '../foodchain/water';
import { smooth } from '../short';
import { drawText, PAPER_ON_INK, RED, YELLOW, YELLOW_ON_INK } from '../swallowyou/text';
import { drawYou } from '../everysize/hud';
import type { SharkPose } from './art/contract';
import { traceShark } from './art/contract';
import { drawMeal } from './art/meals';
import { sharks } from './art/roster';
import { drawYouFigure } from './art/you';
import { cameraAt, GROUND_Y, snoutOf, toScreen, type Camera, type Pt } from './camera';
import { EXTRAS, GHOST_LABEL_W, GHOST_LABEL_X, GHOSTS, STANDS, type Ghost } from './facts';
import { verdictInk } from './hud';
import { drawStamp } from '../survival/hud';
import { STEPS, YOU_M, stepAt } from './ladder';
import { T } from './timeline';

/**
 * The ladder's stage, one look for the whole video: deep-blue water, the
 * sand, you (5 ft 9 in) standing on it under the fat yellow YOU arrow, the
 * step's shark gliding in from the right at true scale, its real meal
 * swimming into its mouth, the YOU ruler under it, and the ghosts (claimed
 * sizes) as dashed outlines from the same snout tip.
 */

const W = 1920;
const ease = (u: number): number => smooth(Math.max(0, Math.min(1, u)));
const bump = (t: number, a: number, b: number, c: number): number => (t < a || t > c ? 0 : t < b ? ease((t - a) / (b - a)) : 1 - ease((t - b) / (c - b)));

/** 0 → 1 over `fin` s from a, held, 1 → 0 over `fout` s ending at b. */
const plateau = (t: number, a: number, b: number, fin = 0.6, fout = 0.6): number => ease((t - a) / fin) * (1 - ease((t - b + fout) / fout));

const water = createWater();

/** How open the step shark's mouth is: the meal's gulp, and the filter feeders' long gapes. */
function gulpOf(i: number, t: number): number {
  const m = STEPS[i]!.meal;
  let g = bump(t, m.at - 0.5, m.at - 0.12, m.at + 0.2);
  if (STEPS[i]!.id === 'basking') g = Math.max(g, plateau(t, T.mouth9 - 0.3, T.oneLeft));
  if (STEPS[i]!.id === 'whaleShark') g = Math.max(g, 0.85 * plateau(t, T.plankton - 0.4, T.born));
  return g;
}

/** Step i's shark at t, in world metres: its snout, length and tilt, and how visible it is. */
export function stepShark(i: number, t: number): { readonly at: Pt; readonly length: number; readonly tilt: number; readonly alpha: number } | null {
  const st = STEPS[i]!;
  const L = st.length;
  const home = snoutOf(L);
  const enter = i === STEPS.length - 1 ? null : STEPS[i + 1]!.from;
  const coldOpen = st.id === 'whaleShark' && t < T.this0 + 0.5;
  if (!coldOpen && t < st.from - 0.8) return null;
  if (enter !== null && t > enter + 2.6) return null;
  const w = cameraAt(t).scale;
  let x = home.x;
  let y = home.y + 0.012 * L * Math.sin(t * 0.9 + i);
  let alpha = 1;
  if (coldOpen) alpha = 1 - ease((t - T.this0 + 0.1) / 0.45);
  else x += (1 - ease((t - st.from + 0.8) / 2.2)) * (W / w) * 1.15;
  if (enter !== null && t > enter - 0.4) {
    // It drifts back and down and fades while the next one glides in: it never swims through you.
    const u = ease((t - enter + 0.4) / 2.4);
    x -= u * L * 0.35;
    y -= u * L * 0.08;
    alpha *= 1 - ease((t - enter) / 1.6);
  }
  const m = st.meal;
  x -= 0.1 * L * bump(t, m.at - 0.7, m.at - 0.05, m.at + 0.6);
  let length = L;
  let tilt = 0;
  for (const s of STANDS) {
    if (s.step !== i) continue;
    const u = plateau(t, s.from - 0.2, s.until, 0.9, 0.8);
    const up = { x: 0.62, y: s.length };
    x += (up.x - x) * u;
    y += (up.y - y) * u;
    length += (s.length - length) * u;
    tilt = (Math.PI / 2) * u;
  }
  return { at: { x, y }, length, tilt, alpha };
}

function poseOf(cam: Camera, at: Pt, length: number, tilt: number, gulp: number, t: number): SharkPose {
  const s = toScreen(cam, at);
  return { x: s.x, y: s.y, length: length * cam.scale, gulp, t, tilt };
}

function drawSand(ctx: CanvasRenderingContext2D, cam: Camera): void {
  const g = ctx.createLinearGradient(0, GROUND_Y - 12, 0, 1080);
  g.addColorStop(0, '#c9b58a');
  g.addColorStop(0.25, '#a8946c');
  g.addColorStop(1, '#5d5240');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, GROUND_Y + 3 * Math.sin((x - cam.anchor * cam.scale) * 0.013));
  ctx.lineTo(W, 1080);
  ctx.lineTo(0, 1080);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,30,20,0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

/** The dashed outline of a claimed size, its label and stamp, crossed out or shrunk to the real one. */
function drawGhost(ctx: CanvasRenderingContext2D, g: Ghost, cam: Camera, base: Pt, t: number): void {
  const fade = ease((t - g.from) / 0.5) * (1 - ease((t - g.until + 0.4) / 0.4));
  if (fade <= 0) return;
  const shrinkU = g.shrink ? ease((t - g.shrink.at) / 0.9) : 0;
  const len = g.length + ((g.shrink?.length ?? g.length) - g.length) * shrinkU;
  const depth = g.shark === 'whaleShark' || g.shark === 'basking' ? 0.2 : 0.18;
  const lift = (g.lift ?? 0) * depth * len * 1.6;
  const snout = toScreen(cam, { x: base.x, y: base.y + lift });
  const px = len * cam.scale;
  const real = shrinkU > 0.5;
  const crossed = g.cross !== undefined && t >= g.cross && !real;
  ctx.save();
  ctx.globalAlpha = fade * (crossed ? 0.55 : 1);
  ctx.translate(snout.x, snout.y);
  ctx.scale(-1, 1);
  traceShark(ctx, px, { depth, head: g.shark === 'hammerhead' ? 'hammer' : g.shark === 'greenland' || g.shark === 'whaleShark' ? 'blunt' : 'long' });
  ctx.fillStyle = g.shark === 'megalodon' ? 'rgba(200,210,220,0.14)' : 'rgba(255,255,255,0.09)';
  ctx.fill();
  ctx.setLineDash([18, 12]);
  ctx.lineDashOffset = -t * 30;
  ctx.lineWidth = 4;
  ctx.strokeStyle = real ? YELLOW : g.shark === 'megalodon' ? '#c8ced6' : PAPER;
  ctx.stroke();
  ctx.restore();
  const mid = Math.max(GHOST_LABEL_X[0], Math.min(GHOST_LABEL_X[1], snout.x + px * 0.5));
  const top = Math.max(150, snout.y - depth * px * 1.3 - 34);
  const label = real ? g.shrink!.label : g.label;
  drawText(ctx, label, { x: mid, y: top, size: 40, maxWidth: GHOST_LABEL_W }, 700, fade, real ? YELLOW_ON_INK : PAPER_ON_INK);
  const stamp = real ? g.shrink!.stamp : g.stamp;
  const at = real ? g.shrink!.at + 0.6 : g.stampAt;
  drawStamp(ctx, stamp, verdictInk(stamp), mid, top + 56, 30, t, at, fade, -0.05);
  if (crossed) {
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = RED;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    const w = Math.min(GHOST_LABEL_W, label.length * 19) * ease((t - g.cross!) / 0.25);
    ctx.beginPath();
    ctx.moveTo(mid - w / 2, top + 4);
    ctx.lineTo(mid + w / 2, top - 4);
    ctx.stroke();
    ctx.restore();
  }
}

/** The YOU ruler on the sand under the step shark: a tick at every whole you, "= N YOU" at its tail. */
function drawRuler(ctx: CanvasRenderingContext2D, cam: Camera, snout: Pt, length: number, alpha: number): void {
  if (alpha <= 0) return;
  const a = toScreen(cam, { x: snout.x, y: 0 });
  const px = length * cam.scale;
  const y = GROUND_Y + 30;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, y - 14);
  ctx.lineTo(a.x, y);
  ctx.lineTo(a.x + px, y);
  ctx.lineTo(a.x + px, y - 14);
  const you = YOU_M * cam.scale;
  for (let k = 1; k * you < px - 20; k++) {
    ctx.moveTo(a.x + k * you, y - 10);
    ctx.lineTo(a.x + k * you, y + 6);
  }
  ctx.stroke();
  ctx.restore();
  for (let k = 1; k * you < px - 60 && k < 12; k++) drawText(ctx, `${k}`, { x: a.x + k * you, y: y + 26, size: 24, maxWidth: 60 }, 700, alpha * 0.85, YELLOW_ON_INK);
}

/** Everything on the ladder's stage at t (the readouts are hud.ts's). */
export function drawStage(ctx: CanvasRenderingContext2D, t: number): void {
  const cam = cameraAt(t);
  water.draw(ctx, 0.62, -cam.anchor * 0.01, Math.log2(1920 / cam.scale), t);
  drawSand(ctx, cam);
  const i = stepAt(t);
  const main = i >= 0 ? i : STEPS.length - 1;
  const base = snoutOf(STEPS[main]!.length);
  const feet = toScreen(cam, { x: 0, y: 0 });
  drawYouFigure(ctx, feet.x, feet.y, YOU_M * cam.scale, t);
  const art = sharks();
  for (const e of EXTRAS) {
    const a = ease((t - e.from) / 0.8) * (1 - ease((t - e.until + 0.5) / 0.5));
    if (a <= 0) continue;
    const len = e.grow ? e.length + (e.grow - e.length) * ease((t - e.from - 0.8) / (e.until - e.from - 2)) : e.length;
    const glide = (1 - ease((t - e.from) / 1.6)) * 3;
    ctx.save();
    ctx.globalAlpha = a;
    art[e.shark].draw(ctx, poseOf(cam, { x: e.x + glide, y: e.y }, len, 0, 0, t + e.x));
    ctx.restore();
  }
  // The leaving shark under the arriving one.
  for (const k of [main - 1, main]) {
    if (k < 0) continue;
    const s = stepShark(k, t);
    if (!s || s.alpha <= 0) continue;
    const pose = poseOf(cam, s.at, s.length, s.tilt, gulpOf(k, t), t);
    drawMealOf(ctx, k, t, art[STEPS[k]!.id].mouthAt(pose), cam);
    ctx.save();
    ctx.globalAlpha = s.alpha;
    art[STEPS[k]!.id].draw(ctx, pose);
    ctx.restore();
  }
  for (const g of GHOSTS) if (t >= g.from - 0.1 && t < g.until + 0.1) drawGhost(ctx, g, cam, base, t);
  const cur = i >= 0 ? stepShark(i, t) : null;
  if (cur && cur.tilt < 0.05) drawRuler(ctx, cam, cur.at, cur.length, ease((t - STEPS[i]!.from - 1.2) / 0.5) * cur.alpha);
  // The YOU arrow: on your head when it's in view, else on the leg that's in view.
  const head = toScreen(cam, { x: 0, y: YOU_M });
  const legX = toScreen(cam, { x: 0.09, y: 0 }).x;
  const arrowX = Math.max(90, Math.min(W - 90, head.y > 230 ? head.x : legX));
  const arrowY = head.y > 230 ? head.y - 12 : 640;
  drawYou(ctx, arrowX, arrowY, t, ease((t - T.you0) / 0.3), 0.8);
}

/** Step k's meal swimming into its mouth, gone whole on the gulp (the seal's cut-away flash is the hud's). */
function drawMealOf(ctx: CanvasRenderingContext2D, k: number, t: number, mouth: Pt, cam: Camera): void {
  const st = STEPS[k]!;
  const m = st.meal;
  if (t < m.at - 2 || t >= m.at || m.id === 'plankton') return;
  const u = ease((t - m.at + 2) / 2);
  const len = m.length * cam.scale;
  const from = { x: mouth.x - st.length * cam.scale * 0.55 - len, y: mouth.y + st.length * cam.scale * 0.05 };
  const x = from.x + (mouth.x - from.x + len * 0.3) * u;
  const y = from.y + (mouth.y - from.y) * u + 6 * Math.sin(t * 4);
  if (m.id === 'hidden') {
    drawText(ctx, '?', { x, y, size: 90, maxWidth: 120 }, 700, 1 - ease((t - m.at + 0.3) / 0.3), YELLOW_ON_INK);
    return;
  }
  ctx.save();
  ctx.globalAlpha = 1 - ease((t - m.at + 0.12) / 0.12);
  drawMeal(ctx, m.id, x, y, len, m.id === 'seal' ? -1 : 1, t);
  ctx.restore();
  if (len > 30 && t > m.at - 1.6) drawText(ctx, m.label, { x, y: y - Math.max(34, len * 0.35), size: 34, maxWidth: 420 }, 700, ease((t - m.at + 1.6) / 0.3) * (1 - ease((t - m.at + 0.15) / 0.15)), PAPER_ON_INK);
}

