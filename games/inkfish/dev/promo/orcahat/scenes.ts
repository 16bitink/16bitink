import { vignette } from '../alvin/water';
import { INK, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine } from '../captions';
import { PAPER_ON_DARK } from '../credit';
import { VIDEO } from '../short';
import { drawHatOrca, hatOf, type HatOrca, snoutOf } from './art/hatOrca';
import { fog, sea, skyAndShore, spray, waterOver, wash } from './scenery';
import { TEXT } from './script';
import {
  darkAt, flashAt, hookAt, HOOK_WATER_Y, j27At, J27_WATER_Y, questionAt, rowAt, STARTS, TAGS, tagAlpha, THEN_AT, viewfinderAt, wrap,
} from './story';
import { ramp } from '../short';

/** The four scenes, and the writing over them. */

const HORIZON = 640;
const HOOK_HORIZON = 820;
const ROW_HORIZON = 720;

/** An orca coming up through the water: the body, the water over its lower half, the spray. */
function surfacing(ctx: CanvasRenderingContext2D, o: HatOrca, water: number, age: number, horizon: number, t: number, cold = 0): void {
  drawHatOrca(ctx, o, t);
  const snout = snoutOf(o);
  waterOver(ctx, horizon, water, snout.x - o.len * 1.08, snout.x + o.len * 0.06, t, cold);
  const hat = hatOf(o);
  spray(ctx, hat.x + o.len * 0.05, water, o.len * 0.42, age, Math.round(o.len));
}

export function drawHook(ctx: CanvasRenderingContext2D, t: number): void {
  const h = hookAt(t);
  skyAndShore(ctx, { horizon: HOOK_HORIZON }, t);
  sea(ctx, { horizon: HOOK_HORIZON }, t);
  drawHatOrca(ctx, h.orca, t);
  waterOver(ctx, HOOK_HORIZON, HOOK_WATER_Y, -20, VIDEO.width + 20, t);
  const hat = hatOf(h.orca);
  spray(ctx, hat.x + 80, HOOK_WATER_Y, 900, h.age, 5);
}

/** The row of orcas; `bare`: the next summer, cold and misty, the hats fading off. */
export function drawRow(ctx: CanvasRenderingContext2D, t: number, bare: boolean): void {
  const cold = bare ? ramp(wrap(t), THEN_AT - 0.1, THEN_AT + 1.2) : 0;
  skyAndShore(ctx, { horizon: ROW_HORIZON, cold }, t);
  sea(ctx, { horizon: ROW_HORIZON, cold }, t);
  for (const r of rowAt(t, bare)) {
    surfacing(ctx, r.orca, r.water, r.age, ROW_HORIZON, t, cold);
    // A breath of mist where a hat was.
    if (bare && r.orca.hat < 1 && r.orca.hat > 0) {
      const hat = hatOf(r.orca);
      const k = 1 - r.orca.hat;
      ctx.save();
      ctx.globalAlpha = 0.5 * Math.sin(Math.PI * k);
      ctx.fillStyle = 'rgb(230,236,238)';
      ctx.beginPath();
      ctx.ellipse(hat.x, hat.y - 20 * k, r.orca.len * (0.08 + 0.1 * k), r.orca.len * (0.04 + 0.05 * k), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  if (bare) {
    wash(ctx, `rgba(46,58,74,${0.3 * cold})`);
    fog(ctx, 0.5 * cold, t);
  }
}

function viewfinder(ctx: CanvasRenderingContext2D, alpha: number, focus: { readonly x: number; readonly y: number }, locked: boolean): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#f6f2e8';
  ctx.lineCap = 'round';
  ctx.lineWidth = 8;
  const [x0, y0, x1, y1, k] = [60, 300, 1020, 1470, 96];
  for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * k);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * k, y);
    ctx.stroke();
  }
  // The rule of thirds, faint.
  ctx.lineWidth = 2;
  ctx.globalAlpha = alpha * 0.3;
  for (const u of [1 / 3, 2 / 3]) {
    ctx.beginPath();
    ctx.moveTo(x0 + (x1 - x0) * u, y0);
    ctx.lineTo(x0 + (x1 - x0) * u, y1);
    ctx.moveTo(x0, y0 + (y1 - y0) * u);
    ctx.lineTo(x1, y0 + (y1 - y0) * u);
    ctx.stroke();
  }
  // The focus box on the hat, green once it locks.
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = locked ? '#8fe08a' : '#f6f2e8';
  ctx.lineWidth = 6;
  const [w, h, c] = [230, 150, 40];
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const [x, y] = [focus.x + (sx * w) / 2, focus.y + (sy * h) / 2];
    ctx.beginPath();
    ctx.moveTo(x - sx * c, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y - sy * c);
    ctx.stroke();
  }
  // The shutter's battery and shots-left marks, top right: a camera, not a phone.
  ctx.fillStyle = '#f6f2e8';
  ctx.beginPath();
  ctx.arc(x0 + 60, y0 + 50, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeRect(x1 - 120, y0 + 36, 66, 30);
  ctx.fillRect(x1 - 54, y0 + 44, 8, 14);
  ctx.fillRect(x1 - 114, y0 + 42, 40, 18);
  ctx.restore();
}

export function drawJ27(ctx: CanvasRenderingContext2D, t: number): void {
  const j = j27At(t);
  ctx.save();
  ctx.translate(j.tx, j.ty);
  ctx.scale(j.zoom, j.zoom);
  ctx.translate(-j.cx, -j.cy);
  skyAndShore(ctx, { horizon: HORIZON }, t);
  sea(ctx, { horizon: HORIZON }, t);
  surfacing(ctx, j.orca, J27_WATER_Y, j.age, HORIZON, t);
  const hat = hatOf(j.orca);
  ctx.restore();
  const onScreen = { x: j.tx + (hat.x - j.cx) * j.zoom, y: j.ty + (hat.y - j.cy) * j.zoom };
  viewfinder(ctx, viewfinderAt(t), onScreen, flashAt(t) > 0 || wrap(t) > STARTS.j27 + 2.2);
  const flash = flashAt(t);
  if (flash > 0) wash(ctx, `rgba(255,255,255,${0.75 * flash})`);
  const dark = darkAt(t);
  if (dark > 0) {
    wash(ctx, `rgba(8,14,22,${0.32 * dark})`);
    vignette(ctx, 0.75 * dark);
  }
  const q = questionAt(t);
  if (q > 0) drawTextLine(ctx, '?', VIDEO.width / 2 + 10, TEXT.question.y, TEXT.question.size, 700, q, PAPER_ON_DARK);
}

/** The small year tags: a paper label with the year in ink. */
export function drawTags(ctx: CanvasRenderingContext2D, t: number): void {
  for (const tag of TAGS) {
    const a = tagAlpha(tag, t);
    if (a <= 0.005) continue;
    ctx.save();
    ctx.font = `700 ${TEXT.tag.size}px ${CAPTION_FONT}`;
    const w = ctx.measureText(tag.text).width + 70;
    const h = TEXT.tag.size * 1.05;
    ctx.globalAlpha = a * 0.92;
    ctx.fillStyle = PAPER;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(VIDEO.width / 2 - w / 2, TEXT.tag.y - h * 0.78, w, h, 18);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    drawTextLine(ctx, tag.text, VIDEO.width / 2, TEXT.tag.y, TEXT.tag.size, 700, a);
  }
}
