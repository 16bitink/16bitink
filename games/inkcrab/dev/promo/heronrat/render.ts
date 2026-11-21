import { drawSpokenLine, INK_ON_PAPER } from '../captions';
import { withCredit } from '../credit';
import { inkWash, makeLayer } from '../crabbird/marks';
import { RED } from '../../../src/art/palette';
import { VIDEO, type Short } from '../short';
import { boilAt } from '../sprites';
import { type Backdrop, drawBackdrop, drawRings, drawShallows } from '../heroncrab/art/marsh';
import { drawAlarm, drawDrips, drawSplash } from '../heroncrab/marks';
import { BILL_TIP, drawHeronBody, drawHeronHead, drawHeronMouth, GAPE_MAX, HEAD_SCALE, HINGE, type HeronPose } from './art/heron';
import { turn } from '../heroncrab/art/ink';
import { drawBank, makeSoftPark, makeWidePark } from './art/park';
import { drawFilmingPhone, drawPerson, fistOf } from './art/people';
import { drawRat } from './art/rat';
import { renderHeronRatAudio } from './audio';
import {
  AT, BIRDER, birderShout, cheerAt, CROWD, CROWD_FEET, type Cam, LOOP_S, PHONE, posesOf, type RatPlace, recAt, type Shot, shotsAt, spokenAt, swimAt, WATER_Y,
} from './story';

/** Draws "This bird swallowed a New York rat whole" (story.ts has the choreography). */

interface Kit {
  readonly wide: Backdrop;
  readonly soft: Backdrop;
}

/** The credit, as main.ts's `narrated(…, { text, inAt })` gives the other shorts: after the payoff, gone before the loop point. */
export const CREDIT = { text: 'InkCrab · 16bit.ink/crab', inAt: AT.dunk / LOOP_S } as const;

function withCam(ctx: CanvasRenderingContext2D, cam: Cam, draw: () => void): void {
  ctx.save();
  ctx.translate(VIDEO.width / 2, VIDEO.height / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
  draw();
  ctx.restore();
}

/**
 * The open bill's inside, in the head's frame: the wedge from the hinge to the
 * two tips, and everything beyond the line across the tips. The two pieces
 * don't overlap, so the path's winding doesn't matter.
 */
const TIP_CUT = 0.8;

function gapePath(ctx: CanvasRenderingContext2D, gape: number): void {
  // The line across sits a little short of the tips, so a rump and feet bulging out of the bill show whole.
  const x = HINGE.x + TIP_CUT * (BILL_TIP - HINGE.x);
  const upper = { x, y: 4.5 };
  const lower = turn({ x, y: 5 }, HINGE, GAPE_MAX * gape);
  const across = { x: lower.x - upper.x, y: lower.y - upper.y };
  const len = Math.hypot(across.x, across.y) || 1;
  const a = { x: (across.x / len) * 6000, y: (across.y / len) * 6000 };
  // Away from the hinge, square to the line across the tips.
  let out = { x: -a.y, y: a.x };
  if (out.x * (upper.x - HINGE.x) + out.y * (upper.y - HINGE.y) < 0) out = { x: -out.x, y: -out.y };
  ctx.beginPath();
  ctx.moveTo(HINGE.x, HINGE.y);
  ctx.lineTo(upper.x, upper.y);
  ctx.lineTo(lower.x, lower.y);
  ctx.closePath();
  ctx.moveTo(upper.x - a.x, upper.y - a.y);
  ctx.lineTo(upper.x + a.x, upper.y + a.y);
  ctx.lineTo(upper.x + a.x + out.x, upper.y + a.y + out.y);
  ctx.lineTo(upper.x - a.x + out.x, upper.y - a.y + out.y);
  ctx.closePath();
}

/** The rat, with what's inside the heron (behind the gape) or under the water left out. */
function drawRatPlace(ctx: CanvasRenderingContext2D, heron: HeronPose, r: RatPlace, boil: number): void {
  ctx.save();
  if (r.clip === 'water') {
    ctx.beginPath();
    ctx.rect(-5000, -5000, 10000, 5000 + WATER_Y + 6);
    ctx.clip();
  } else if (r.clip === 'gape') {
    // In the head's frame: only what lies between the mandibles, and whatever sticks out past their tips.
    const m = ctx.getTransform();
    ctx.translate(heron.x, heron.y);
    ctx.scale(heron.face * heron.k, heron.k);
    ctx.translate(heron.head.x, heron.head.y);
    ctx.rotate(heron.head.a);
    ctx.scale(HEAD_SCALE, HEAD_SCALE);
    gapePath(ctx, heron.head.gape);
    ctx.setTransform(m);
    ctx.clip();
  }
  drawRat(ctx, r.at, r.angle, r.k, r.pose, boil, r.facing);
  ctx.restore();
}

function drawBird(ctx: CanvasRenderingContext2D, heron: HeronPose, rat: RatPlace | null, boil: number): void {
  drawHeronBody(ctx, heron, boil);
  drawHeronMouth(ctx, heron);
  if (rat) drawRatPlace(ctx, heron, rat, boil);
  drawHeronHead(ctx, heron, boil);
}

/** Drops running off the wet rat while it's held up. */
function ratDrips(rat: RatPlace, t: number, from: number, water: number): readonly { x: number; y: number }[] {
  const u = t - from;
  if (u < 0 || u > 1.4) return [];
  return Array.from({ length: 7 }, (_, i) => {
    const age = (u + i * 0.19) % 0.7;
    return { x: rat.at.x - 120 * rat.k + ((i * 53) % 240) * rat.k, y: rat.at.y + 26 * rat.k + 1400 * age * age };
  }).filter((p) => p.y < water);
}

function drawClose(ctx: CanvasRenderingContext2D, kit: Kit, shot: Shot, boil: number): void {
  const { heron, rat, cam } = posesOf(shot);
  withCam(ctx, cam, () => {
    ctx.save();
    ctx.translate(-0.03 * (heron.head.x * heron.k), 0);
    drawBackdrop(ctx, kit.soft);
    ctx.restore();
    drawBird(ctx, heron, rat, boil);
    if (rat && shot.at > AT.close) drawDrips(ctx, ratDrips(rat, shot.at, AT.close, 2000));
  });
}

function drawPond(ctx: CanvasRenderingContext2D, kit: Kit, shot: Shot, boil: number): void {
  const t = shot.at;
  const { heron, rat, cam } = posesOf(shot);
  withCam(ctx, cam, () => {
    drawBackdrop(ctx, kit.wide);
    drawBird(ctx, heron, rat, boil);
    drawShallows(ctx, -500, 1600, WATER_Y, 420, t, 3);
    drawRings(ctx, heron.x + 30, WATER_Y + 8, 140, ((t - AT.hookOut) % 1.3) / 1.3, boil);
    if (t < AT.strike) drawRings(ctx, swimAt(t).x, WATER_Y + 10, 90, (t % 0.8) / 0.8, boil);
    const s = swimAt(AT.strike);
    drawSplash(ctx, s.x, WATER_Y, 50, (t - AT.strike) / 0.6, 4);
    drawRings(ctx, s.x, WATER_Y + 10, 260, (t - AT.strike) / 1.1, boil);
    drawSplash(ctx, s.x + 10, WATER_Y, 60, (t - AT.dunk - 0.05) / 0.6, 7);
    drawSplash(ctx, s.x + 10, WATER_Y, 45, (t - AT.up) / 0.6, 9);
    drawRings(ctx, s.x + 10, WATER_Y + 10, 260, (t - AT.dunk) / 1.1, boil);
    if (rat && t > AT.lift) drawDrips(ctx, ratDrips(rat, t, AT.lift, WATER_Y));
    if (rat && t > AT.up) drawDrips(ctx, ratDrips(rat, t, AT.up, WATER_Y));
  });
}

function drawCrowd(ctx: CanvasRenderingContext2D, kit: Kit, shot: Shot, boil: number): void {
  const t = shot.at;
  const { heron, cam } = posesOf(shot);
  withCam(ctx, cam, () => {
    drawBackdrop(ctx, kit.wide);
    drawBird(ctx, heron, null, boil);
    drawShallows(ctx, -500, 1600, WATER_Y, 300, t, 5);
    drawBank(ctx, -400, 1500, 1330, boil);
    for (const c of CROWD) {
      const cheer = cheerAt(t, c.delay);
      drawPerson(ctx, { x: c.x, y: CROWD_FEET, k: c.k, cheer, shout: cheer, cap: c.cap, tone: c.tone }, boil);
      const f = fistOf(cheer);
      const fist = { x: c.x + f.x * c.k, y: CROWD_FEET + f.y * c.k };
      drawAlarm(ctx, { x: fist.x + 30, y: fist.y - 10 }, 46, cheer > 0.8 ? 1 : 0, boil);
    }
  });
}

function drawBirder(ctx: CanvasRenderingContext2D, kit: Kit, shot: Shot, boil: number): void {
  const t = shot.at;
  const { heron, cam } = posesOf(shot);
  withCam(ctx, cam, () => {
    drawBackdrop(ctx, kit.soft);
    const { x, y, k } = BIRDER;
    const hand = { x: (PHONE.x + PHONE.w + 10 - x) / k, y: (PHONE.y + PHONE.h + 20 - y) / k };
    drawPerson(ctx, { x, y, k, cheer: 0, shout: birderShout(t), cap: true, tone: '#2a3040', phone: false, hand }, boil);
    drawFilmingPhone(ctx, PHONE, recAt(t), boil, () => {
      // On the screen: the pond, and the heron with the rat going down its neck.
      const s = PHONE.h / 900;
      ctx.save();
      ctx.translate(PHONE.x + PHONE.w / 2, PHONE.y);
      ctx.scale(s, s);
      ctx.translate(-heron.x - 60, -380);
      drawBackdrop(ctx, kit.wide);
      drawBird(ctx, heron, null, boil);
      drawShallows(ctx, -500, 1600, WATER_Y, 300, t, 5);
      ctx.restore();
    });
  });
}

function drawShot(ctx: CanvasRenderingContext2D, kit: Kit, shot: Shot, boil: number): void {
  if (shot.id === 'hook' || shot.id === 'gulp') drawClose(ctx, kit, shot, boil);
  else if (shot.id === 'pond') drawPond(ctx, kit, shot, boil);
  else if (shot.id === 'crowd') drawCrowd(ctx, kit, shot, boil);
  else drawBirder(ctx, kit, shot, boil);
}

function createInner(ctx: CanvasRenderingContext2D): Short {
  const kit: Kit = { wide: makeWidePark(), soft: makeSoftPark() };
  const layer = makeLayer();
  return {
    loopSeconds: LOOP_S,
    draw(seconds: number): void {
      const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
      const boil = boilAt(t);
      const s = shotsAt(t);
      drawShot(ctx, kit, s.under, boil);
      if (s.over) {
        layer.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
        drawShot(layer.ctx, kit, s.over, boil);
        if (s.how === 'wash') inkWash(ctx, layer.canvas, layer.ctx, s.u);
        else {
          ctx.save();
          ctx.globalAlpha = s.u;
          ctx.drawImage(layer.canvas, 0, 0);
          ctx.restore();
        }
      }
      for (const r of spokenAt(t)) drawSpokenLine(ctx, r.words, r.current, INK_ON_PAPER, RED, r.y, r.size, r.unsaid);
    },
    audio: renderHeronRatAudio,
  };
}

/** The short with its credit, which main.ts doesn't add for this one. */
export function createHeronRat(ctx: CanvasRenderingContext2D): Short {
  return withCredit(createInner(ctx), ctx, undefined, CREDIT);
}
