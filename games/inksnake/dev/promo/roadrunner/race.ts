import { lerp, ramp, VIDEO } from '../short';
import { type BirdPose, birdBehind, birdFront, gripOf, HELD, heldSpine } from './bird';
import { drawCoyote } from './coyote';
import { type CoyotePose, gallop, skid } from './coyoteGait';
import { drawLand, drawSky, type Land } from './desert';
import { dustRing, streaks } from './fx';
import { type LegPose } from './leg';
import { pt, soft } from './paint';
import { footAt, RUN, speedOf } from './poses';
import { HOOK_PLACE, hookBack, hookBird, hookFigure, light } from './shots';
import { drawSnake } from './snake';
import { birdXAt, coyoteLeadAt, CUT, GOOD_AT, hookClock, hookPose, lookBackAt, PUSH, pushAt, pushFade, SKID_AT, skidAt, streakAt, wrap } from './story';

/**
 * "And the coyote? In real life, he's twice as FAST. Good thing": the bird
 * runs full tilt with its snake streaming; the coyote gallops up behind it
 * and past, looks back, sees the rattlesnake and brakes; and the camera
 * pushes in to the bird's bill, whose drawing hands over to the hook's.
 */
const GROUND = 1590;
const SCALE = 0.36;
const CYCLE = 0.27;
const HORIZON = 850;
/** The coyote's ground, a little further off, so it is seen whole over the bird. */
const PAWS = 1140;
const COYOTE = 0.94;
/** The gallop's cycle. */
const GALLOP_S = 0.4;

/** The mid layer's tile x 300..1200 holds no saguaro: that stretch is on screen at the hand-over. */
const LAND_OFFSET = 1100;

/** 0 running flat out .. 1 drawn up as in frame 1 (the push ends on the hook's own pose). */
const calmAt = (u: number): number => ramp(u, GOOD_AT - 0.25, PUSH.done - 0.2);

function runner(u: number): BirdPose {
  const ph = (u - CUT.race) / CYCLE;
  const c = calmAt(u);
  const h = hookBird(u);
  const m = (a: number, b: number): number => lerp(a, b, c);
  const settle = (l: LegPose, to: LegPose): LegPose => ({ foot: pt(m(l.foot.x, to.foot.x), m(l.foot.y, to.foot.y)), lift: m(l.lift, to.lift) });
  const bounce = Math.sin(ph * Math.PI * 4) * 14 * (1 - c);
  return {
    at: pt(birdXAt(u), GROUND - RUN.ground * SCALE + bounce * SCALE), scale: SCALE, tilt: m(0.02 + 0.03 * Math.sin(ph * Math.PI * 4 + 1), h.tilt), tail: m(-0.06 + 0.05 * Math.sin(ph * Math.PI * 4), h.tail), wing: m(0.1, h.wing),
    head: { at: pt(m(700, h.head.at.x), m(-420 - bounce * 0.5, h.head.at.y)), ang: m(0.02, h.head.ang), look: { crest: m(0.35, h.head.look.crest), gape: 0.125, lid: 0, gaze: 0.6 } },
    near: settle(footAt(RUN, ph), h.near), far: settle(footAt(RUN, ph + 0.5), h.far),
  };
}

/** The coyote's pose at u: galloping, then looking back and skidding, its eye on the snake throughout. */
function runningCoyote(u: number, bird: BirdPose): CoyotePose {
  const x = bird.at.x + coyoteLeadAt(u);
  const ph = (Math.min(u, SKID_AT) - CUT.race) / GALLOP_S;
  const free = gallop({ at: pt(x, PAWS - 300 * COYOTE), scale: COYOTE }, ph);
  const sk = skidAt(u);
  const back = lookBackAt(u);
  return skid(free, sk, back, pt(0.9, 0.9));
}

/** Furrows ploughed in the sand by the braced forepaws, running on ahead of it as it is left behind. */
function skidMarks(ctx: CanvasRenderingContext2D, x: number, slid: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (const [dx, y] of [[290, PAWS + 6], [236, PAWS - 12]] as const) {
    const len = 60 + slid * 420;
    const g = ctx.createLinearGradient(x + dx - len, 0, x + dx, 0);
    g.addColorStop(0, 'rgba(110,60,30,0)');
    g.addColorStop(1, 'rgba(110,60,30,0.6)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(x + dx - len, y);
    ctx.lineTo(x + dx - 14, y);
    ctx.stroke();
  }
  ctx.restore();
}

function raceScene(ctx: CanvasRenderingContext2D, land: Land, u: number, boil: number): void {
  const speed = speedOf(RUN, CYCLE) * SCALE;
  const scroll = (u - CUT.race) * speed * 0.92;
  drawSky(ctx, HORIZON, 0, pt(770, 660), 58);
  // Placed so that no saguaro is in frame when the push hands over to the hook.
  drawLand(ctx, land, HORIZON, scroll, { mid: 0.9, offset: LAND_OFFSET });
  streaks(ctx, streakAt(u) * 0.8, u, 700, 1250);
  const p = runner(u);
  const c = runningCoyote(u, p);
  const sk = skidAt(u);
  const slid = Math.max(0, u - SKID_AT);
  soft(ctx, c.at.x - 10, PAWS + 4, 400 * COYOTE, 34, 0, '#4a2413', 0.48);
  // The dust of the gallop behind its paws; in the skid, thick clouds off all four.
  const d = ((u - CUT.race) / GALLOP_S * 2) % 1;
  if (sk < 0.5) dustRing(ctx, pt(c.at.x - 210 - d * 170, PAWS), 0.15 + d * 0.8, 80, 95);
  if (slid > 0.02) for (let i = 0; i < 4; i++) dustRing(ctx, pt(c.at.x - 330 + i * 60 - slid * 120, PAWS + 4), Math.min(0.9, 0.1 + slid * 0.7 + i * 0.07), 180, 91 + i);
  drawCoyote(ctx, c, boil);
  if (slid > 0.02) {
    for (let i = 0; i < 3; i++) dustRing(ctx, pt(c.at.x + 300 - i * 60, PAWS + 16), Math.min(0.9, 0.12 + slid * 0.75 + i * 0.1), 120, 191 + i);
    skidMarks(ctx, c.at.x, slid);
  }
  soft(ctx, p.at.x + 60, GROUND + 4, 250, 24, 0, '#4a2413', 0.5);
  const d2 = ((u - CUT.race) / CYCLE * 2) % 1;
  dustRing(ctx, pt(p.at.x - 60 - d2 * 190, GROUND), 0.2 + d2 * 0.75, 70, 97);
  const calm = calmAt(u);
  const swing = (0.5 + 0.12 * Math.sin(u * 23)) * (1 - calm) + hookPose(u).swing * calm;
  const spine = heldSpine(p, (s) => Math.PI / 2 + swing * (0.4 + s) + (1 - calm) * 0.35 * Math.sin(s * 6 - u * 16) * s + Math.max(0, s - 0.6) * (1.2 * (1 - calm) + (4.6 + 0.5 * Math.sin(hookClock(u) * 4.2)) * calm), HELD.out);
  birdBehind(ctx, p, boil);
  drawSnake(ctx, spine, { width: HELD.width * p.scale, shake: 0.34 * Math.sin(u * 62) }, boil);
  birdFront(ctx, p, boil);
  streaks(ctx, streakAt(u) * 0.35, u + 3, 1320, 1700);
}

export function drawRace(ctx: CanvasRenderingContext2D, land: Land, t: number, boil: number): void {
  const u = wrap(t);
  const push = pushAt(t);
  const from = gripOf(runner(u)).at;
  const hook = hookBird(t);
  const to = gripOf(hook).at;
  // The push: the bill moves from its place in the race to its place in frame 1 as the scale grows to the hook's.
  const z = (HOOK_PLACE.scale / SCALE) ** push;
  const at = pt(from.x + (to.x - from.x) * push, from.y + (to.y - from.y) * push);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(z, z);
  ctx.translate(-from.x, -from.y);
  raceScene(ctx, land, u, boil);
  ctx.restore();
  const fade = pushFade(t);
  if (fade > 0) {
    const s = (z * SCALE) / HOOK_PLACE.scale;
    ctx.save();
    ctx.globalAlpha = fade;
    hookLayer(ctx, land, t, boil, at, to, s);
    ctx.restore();
  }
  light(ctx);
}

/** The hook's frame laid over, its bill on the race's bill, at `s` of its size (its sky always fills the frame). */
function hookLayer(ctx: CanvasRenderingContext2D, land: Land, t: number, boil: number, at: { x: number; y: number }, to: { x: number; y: number }, s: number): void {
  const layer = layerOf();
  const l = layer.ctx;
  l.setTransform(1, 0, 0, 1, 0, 0);
  l.globalAlpha = 1;
  hookBack(l, land);
  l.save();
  l.translate(at.x, at.y);
  l.scale(s, s);
  l.translate(-to.x, -to.y);
  hookFigure(l, t, boil);
  l.restore();
  ctx.drawImage(layer.canvas, 0, 0);
}

let spare: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
function layerOf(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (spare) return spare;
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  spare = { canvas, ctx };
  return spare;
}
