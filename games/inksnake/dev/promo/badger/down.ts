import { VIDEO } from '../short';
import type { Pt } from '../sprites';
import { type BadgerPose, drawAdder, drawBadger, headPoint, smoothSpine } from './actors';
import type { Cast } from './cast';
import { bang, drain, dust, evening, vignette } from './fx';
import { COLLAPSES_AT, drainAt, duskAt, groggyAt, popAt, shakeAt, tipAt, UP_AT, upAt, wakeAt, WAKES_AT, wrap } from './story';

/**
 * "It collapses. It's over…" then "Hours later? It WAKES UP…": one framing
 * for both. The badger sways, its legs buckle and it goes over onto its
 * side with a thud and a puff of dust, eyes shut, still; the adder lies
 * limp on the sand beside it. The colour drains on "It's over…". Hours
 * later the light runs to evening and the sun sinks; on "WAKES" its eyes
 * snap open ("!"), and on "UP" it pops up onto its feet in a puff of dust
 * and shakes itself off.
 */
const GROUND = 1390;
const AT: Pt = { x: 520, y: GROUND };
const SCALE = 2.15;

const ADDER_KNOTS: readonly Pt[] = [
  { x: 760, y: 1560 }, { x: 860, y: 1590 }, { x: 960, y: 1560 }, { x: 1000, y: 1500 }, { x: 930, y: 1460 }, { x: 800, y: 1470 }, { x: 640, y: 1500 },
];

function limpAdder(ctx: CanvasRenderingContext2D, cast: Cast, boil: number): void {
  drawAdder(ctx, cast.adder, boil, { spine: smoothSpine(ADDER_KNOTS, 3), base: 64 }, 'top', 0.2, 0.8);
}

/** The badger in the collapse: groggy, buckling, then down on its side. */
function collapsing(t: number): BadgerPose {
  const tip = tipAt(t);
  const g = groggyAt(t);
  if (tip < 0.55) return { at: AT, scale: SCALE, body: 'stand', head: 'wince', roll: 0.035 * g - 0.05 * tip, squash: 1 - 0.32 * tip, nod: 0.25 * tip - 0.1 };
  return { at: AT, scale: SCALE, body: 'flop', head: 'out', squash: 1 - 0.06 * Math.max(0, 1 - (tip - 0.55) / 0.45) };
}

export function drawDown(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const u = wrap(t);
  ctx.drawImage(cast.bg.down, 0, 0);
  limpAdder(ctx, cast, boil);
  dust(ctx, { x: AT.x, y: GROUND + 10 }, (u - COLLAPSES_AT - 0.3) / 0.6, 190, 41);
  drawBadger(ctx, cast.badger, boil, collapsing(t));
  vignette(ctx, 0.5, 1200);
  drain(ctx, drainAt(t));
}

/** The sun sinking across the sky as the hours pass. */
function sun(ctx: CanvasRenderingContext2D, k: number): void {
  const x = 300 + 560 * k;
  const y = 420 + 470 * k * k;
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 10, x, y, 180);
  g.addColorStop(0, `rgba(255,236,190,${0.9 - 0.2 * k})`);
  g.addColorStop(0.25, `rgba(255,${Math.round(200 - 60 * k)},120,0.5)`);
  g.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 180, y - 180, 360, 360);
  ctx.fillStyle = `rgb(255,${Math.round(240 - 70 * k)},${Math.round(200 - 110 * k)})`;
  ctx.beginPath();
  ctx.arc(x, y, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawLater(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const u = wrap(t);
  const k = duskAt(t);
  ctx.drawImage(cast.bg.later, 0, 0);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.drawImage(cast.bg.laterDusk, 0, 0);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, VIDEO.width, 875);
  ctx.clip();
  sun(ctx, k);
  ctx.restore();
  limpAdder(ctx, cast, boil);
  const up = upAt(t) > 0;
  const shake = shakeAt(t);
  const pose: BadgerPose = up
    ? { at: AT, scale: SCALE, body: 'stand', head: 'wide', roll: 0.07 * shake, squash: 1 + 0.05 * Math.abs(shake), nod: 0.1 * shake }
    : { at: AT, scale: SCALE, body: 'flop', head: wakeAt(t) > 0 ? 'wide' : 'out' };
  dust(ctx, { x: AT.x, y: GROUND + 10 }, popAt(t), 190, 43);
  drawBadger(ctx, cast.badger, boil, pose);
  evening(ctx, k * 0.8);
  if (shake !== 0) {
    // Shake lines either side of the body.
    ctx.save();
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.7 * Math.min(1, Math.abs(shake) * 2);
    for (const [x, y] of [[90, 1180], [70, 1250], [950, 1120], [975, 1190]] as const) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 14, y + 20, x, y + 40);
      ctx.stroke();
    }
    ctx.restore();
  }
  const head = headPoint(pose, { x: 60, y: -20 });
  bang(ctx, { x: head.x + 30, y: head.y - 40 }, u >= WAKES_AT - 0.03 && u < UP_AT + 0.4 ? Math.min(1, (u - WAKES_AT + 0.03) / 0.3) : 0);
  vignette(ctx, 0.5, 1200);
}
