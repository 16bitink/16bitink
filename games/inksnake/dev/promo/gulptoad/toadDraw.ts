import { INK, RED } from '../../../src/art/palette';
import { drawTextLine } from '../captions';
import { clamp01, lerp } from '../short';
import { bakeSprite, drawSprite, type Pt, type Sprite } from '../sprites';
import { toScreen, type View } from './camera';
import { BALL_A, BALL_R, swellMarks, type ToadPose } from './story';
import { HEAD_ROOT, PER_ART, TOAD_BODY, TOAD_HEAD } from './toadArt';
import { LIMB, TOAD_LIMB } from './toadLimbs';
import { alarmAt } from './words';

/** Draws the toad, its swelling marks and its "!" (story.ts has the poses). */

export interface ToadCast {
  readonly body: Sprite;
  readonly calm: Sprite;
  readonly alarm: Sprite;
  readonly thigh: Sprite;
  readonly shank: Sprite;
  readonly foot: Sprite;
  readonly arm: Sprite;
}

export function bakeToad(): ToadCast {
  return {
    body: bakeSprite(TOAD_BODY, 'body', 9, 500),
    calm: bakeSprite(TOAD_HEAD, 'calm', 9, 510),
    alarm: bakeSprite(TOAD_HEAD, 'alarm', 9, 510),
    thigh: bakeSprite(TOAD_LIMB, 'thigh', 9, 520),
    shank: bakeSprite(TOAD_LIMB, 'shank', 9, 530),
    foot: bakeSprite(TOAD_LIMB, 'foot', 9, 540),
    arm: bakeSprite(TOAD_LIMB, 'arm', 9, 550),
  };
}

/** The ground under frame 1's toad, world units below its axis. */
const GROUND = 290;
const LIMP = 0.62;
const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Its axis place `a` (world units from frame 1's nose), `y` world units down from it, to the world. */
function placer(c: ToadPose): (a: number, y: number) => Pt {
  const rot = -c.tilt;
  const [cos, sin] = [Math.cos(rot), Math.sin(rot)];
  return (a, y) => ({ x: c.x - a * cos - y * sin, y: c.y - a * sin + y * cos });
}

export function drawToadShadow(ctx: CanvasRenderingContext2D, c: ToadPose, view: View): void {
  const at = placer(c);
  const ground = at(BALL_A + 10, GROUND - 6);
  const p = toScreen(view, { x: ground.x, y: ground.y + c.air });
  ctx.save();
  ctx.globalAlpha = 0.28 * c.shadow;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(p.x + 12, p.y + 8, 265 * c.puff * view.zoom, 46 * view.zoom, -c.tilt * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The joint angles of a hind leg, `e` folded (0) to stretched out behind (1), `size` limp (0) to blown up (1). */
function legAngles(e: number, size: number, spread: number): { thigh: number; shank: number; foot: number } {
  return {
    thigh: rad(lerp(lerp(6, 30, size), 172, e)) + spread * e * 0.5,
    shank: rad(lerp(lerp(162, 142, size), 180, e)) + spread * e,
    foot: rad(lerp(lerp(2, 8, size), 182, e)) + spread * e * 1.2,
  };
}

const polar = (p: Pt, ang: number, len: number): Pt => ({ x: p.x + Math.cos(ang) * len, y: p.y + Math.sin(ang) * len });

export function drawToad(ctx: CanvasRenderingContext2D, cast: ToadCast, c: ToadPose, boil: number, view: View): void {
  const at = placer(c);
  const rot = -c.tilt;
  const k = PER_ART * view.zoom;
  const size = clamp01((c.puff - LIMP) / (1 - LIMP));
  const puff = c.puff * (1 + 0.012 * c.shudder);
  const put = (s: Sprite, w: Pt, rotation: number, scale = 1, flip = 1): void => {
    const q = toScreen(view, w);
    drawSprite(ctx, s, boil, { x: q.x, y: q.y, rotation, flip, scale: k * scale });
  };
  /** Limbs keep their lit side up whichever way they point. */
  const limb = (s: Sprite, w: Pt, ang: number, scale: number): void => put(s, w, ang, scale, Math.cos(ang) < 0 ? -1 : 1);

  const hind = (e: number, kick: number, far: boolean): void => {
    const hipA = Math.max(BALL_A + (far ? 88 : 118) * puff + c.hipBack, e > 0 ? lerp(0, c.hipAt, e) : 0);
    const hip = at(hipA, lerp((far ? 126 : 138) * Math.min(1, puff), far ? -26 : 34, e));
    const q = legAngles(e, size, far ? 0.2 : -0.22);
    const scale = far ? 0.94 : 1;
    const knee = polar(hip, rot + q.thigh, LIMB.thigh * PER_ART * scale);
    const ankle = polar(knee, rot + q.shank + kick * 0.4, LIMB.shank * PER_ART * scale);
    limb(cast.shank, knee, rot + q.shank + kick * 0.4, scale);
    limb(cast.foot, ankle, rot + q.foot + kick, scale);
    limb(cast.thigh, hip, rot + q.thigh, scale);
  };
  const arm = (swing: number, far: boolean): void => {
    const shoulder = at(BALL_A - (far ? 150 : 128) * puff, (far ? 98 : 116) * puff);
    limb(cast.arm, shoulder, rot + rad(lerp(44, 82, size)) + swing, far ? 0.86 : 0.92);
  };

  // The far legs, in shade behind the body.
  ctx.save();
  ctx.filter = 'brightness(0.7)';
  hind(c.legFar, c.kickFar, true);
  arm(c.armFar, true);
  ctx.restore();
  put(cast.body, at(BALL_A, 0), rot, puff);
  // The head sits on the ball's front: drawn back with it while the toad is limp.
  const headA = HEAD_ROOT + Math.max(0, BALL_A - BALL_R * c.puff - (BALL_A - BALL_R));
  put(c.alarm ? cast.alarm : cast.calm, at(headA, lerp(-26, 0, size)), rot + c.neck);
  hind(c.legNear, c.kickNear, false);
  arm(c.armNear, false);
}

/** Little arcs of swelling round the ball, as the game draws round its puffed toad. */
export function drawSwell(ctx: CanvasRenderingContext2D, t: number, c: ToadPose, view: View): void {
  const a = swellMarks(t);
  if (a <= 0) return;
  const p = toScreen(view, placer(c)(BALL_A, 0));
  const r = BALL_R * c.puff * view.zoom;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.8 * a;
  for (const [ang, half] of [[-2.5, 0.12], [-2.0, 0.16], [-1.5, 0.14], [2.75, 0.12], [3.2, 0.16]] as const) {
    for (const [off, len, w] of [[26, 1, 8], [50, 0.6, 6]] as const) {
      ctx.lineWidth = w * view.zoom;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + (off + 14 * a) * view.zoom, ang - half * len, ang + half * len);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawAlarm(ctx: CanvasRenderingContext2D, t: number, c: ToadPose | null, view: View): void {
  const a = alarmAt(t);
  if (a <= 0 || !c) return;
  const q = toScreen(view, { x: c.x - 452, y: c.y - 250 });
  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.rotate(-0.14);
  ctx.scale(a, a);
  drawTextLine(ctx, '!', 0, 80, 280 * view.zoom, 700, 1, { fill: RED, halo: '#fffaf0' });
  ctx.restore();
}
