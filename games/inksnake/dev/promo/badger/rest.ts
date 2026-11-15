import { drawTextLine, PAPER_ON_DARK } from '../captions';
import type { Pt } from '../sprites';
import { type BadgerPose, drawBadger } from './actors';
import type { Cast } from './cast';
import { drawCta } from './cta';
import { evening, vignette } from './fx';
import { drawHook } from './hook';
import { crossAt, immuneTag, irisAt, lickAt, resistantTag, shrugAt } from './story';

/**
 * "Resistant, not immune… but honestly? It doesn't care.": evening; the
 * badger stands full of lunch, side on. "resistant" is written in with a
 * green tick, "immune" with a red cross struck through it; on "honestly?"
 * it licks its lips, half lidded, and on "care" it gives a little toss of
 * the head. The call to action comes in over it; at the end frame 1 opens
 * out of it in a widening circle.
 */
const POSE: BadgerPose = { at: { x: 560, y: 1600 }, scale: 2.2, body: 'stand', head: 'shut' };
const IRIS_AT_PT: Pt = { x: 640, y: 1100 };
const IRIS_R = 1400;

function inkLine(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, colour: string, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [width, c] of [[w + 9, '#0b1a2a'], [w, colour]] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = width;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.restore();
}

/** "resistant ✓" and "immune ✗", the tick and the cross inked by hand, the cross struck through the word. */
function tags(ctx: CanvasRenderingContext2D, t: number): void {
  const r = resistantTag(t);
  const m = immuneTag(t);
  if (r > 0) {
    drawTextLine(ctx, 'resistant', 500, 680, 104, 700, r, PAPER_ON_DARK);
    inkLine(ctx, [{ x: 742, y: 646 }, { x: 772, y: 680 }, { x: 836, y: 600 }], 13, '#7bc86a', r);
  }
  if (m > 0) {
    drawTextLine(ctx, 'immune', 500, 812, 104, 700, m, PAPER_ON_DARK);
    const c = crossAt(t);
    if (c > 0) {
      inkLine(ctx, [{ x: 330, y: 790 }, { x: 330 + 350 * c, y: 772 }], 10, '#e0524a', m);
      inkLine(ctx, [{ x: 744, y: 744 }, { x: 744 + 70 * Math.min(1, c * 2), y: 744 + 70 * Math.min(1, c * 2) }], 13, '#e0524a', m);
      if (c > 0.5) inkLine(ctx, [{ x: 814, y: 744 }, { x: 814 - 70 * (c - 0.5) * 2, y: 744 + 70 * (c - 0.5) * 2 }], 13, '#e0524a', m);
    }
  }
}

function drawIris(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const k = irisAt(t);
  if (k <= 0) return;
  if (k >= 1) return drawHook(ctx, cast, t, boil);
  const r = IRIS_R * k * k;
  ctx.save();
  ctx.beginPath();
  ctx.arc(IRIS_AT_PT.x, IRIS_AT_PT.y, r, 0, Math.PI * 2);
  ctx.clip();
  drawHook(ctx, cast, t, boil);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = '#1a120a';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(IRIS_AT_PT.x, IRIS_AT_PT.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawRest(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  ctx.drawImage(cast.bg.rest, 0, 0);
  const lick = lickAt(t);
  drawBadger(ctx, cast.badger, boil, { ...POSE, head: lick > 0.5 ? 'smug' : 'shut', nod: -0.1 * shrugAt(t) });
  evening(ctx, 0.5);
  vignette(ctx, 0.5, 1200);
  tags(ctx, t);
  drawCta(ctx, cast.game, t, boil);
  drawIris(ctx, cast, t, boil);
}
