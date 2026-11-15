import { lerp } from '../short';
import type { Pt } from '../sprites';
import { type BadgerPose, drawAdder, drawBadger, headPoint, smoothSpine } from './actors';
import type { Cast } from './cast';
import { dust, hitStar, vignette } from './fx';
import { GRIP_AT } from './badgerHead';
import { drawCatch, heldKnots } from './hook';
import { flinchAt, GRABS_AT, hitAt, jawsAt, lungeAt, punchAt, recoilAt, strikeAt, wrap } from './story';

/**
 * "The badger grabs it… and gets bitten, right in the FACE!": the adder
 * lies in an S on the sand, head up; the badger lunges in from the left,
 * jaws wide, and clamps them on its body (a puff of dust). The adder's
 * head whips round and strikes the badger's cheek: a white hit, the
 * badger's eye squeezed shut and its head jerked back; on "FACE" the
 * camera punches in on the face. No blood: the hit is the star and the
 * flinch.
 */
const GROUND = 1360;
const SCALE = 2.45;
const REST_X = 330;
const BASE = 74;
/** Where on the badger's head the adder strikes (head art units): the cheek below the eye. */
const CHEEK: Pt = { x: 40, y: 46 };

function badgerAt(t: number): BadgerPose {
  const u = wrap(t);
  const l = lungeAt(t);
  const grabbed = u >= GRABS_AT;
  const flinch = flinchAt(t);
  const x = lerp(-480, REST_X, l);
  const head = !grabbed ? (jawsAt(t) > 0.15 ? 'lunge' : 'shut') : flinch > 0.5 ? 'gripWince' : 'grip';
  return {
    at: { x, y: GROUND }, scale: SCALE, body: grabbed || l > 0.9 ? 'stand' : 'lunge', head,
    nod: -0.22 * flinch * (1 - 0.4 * recoilAt(t)) + (grabbed ? 0 : -0.08 * jawsAt(t)), roll: grabbed ? -0.02 * flinch : -0.04 * l,
  };
}

/** Before the grab: the catch's own lay, its middle still down on the sand where the jaws will close, head raised. */
function waitingKnots(t: number): Pt[] {
  const grip = headPoint({ at: { x: REST_X, y: GROUND }, scale: SCALE, body: 'stand', head: 'grip' }, GRIP_AT);
  return heldKnots(grip, Math.sin(wrap(t) * 3), GROUND).map((p, i) =>
    i >= 3 && i <= 6 ? { x: p.x, y: Math.max(p.y, GROUND - 30) } : i < 3 ? { x: p.x - 30, y: GROUND - (GROUND - p.y) * 0.62 } : p);
}

/** After the grab: the hook's catch, its head end whipping round to the cheek and back off. */
function strikeKnots(pose: BadgerPose, t: number): (grip: Pt) => Pt[] {
  return (grip: Pt): Pt[] => {
    const base = heldKnots(grip, Math.sin(wrap(t) * 3.1), GROUND);
    const s = strikeAt(t) * (1 - 0.6 * recoilAt(t));
    const cheek = headPoint(pose, CHEEK);
    // Over the top and down onto the cheek: the head's snout lands on it, the neck arching up and back to the jaws.
    const target = [{ x: cheek.x + 104, y: cheek.y - 82 }, { x: cheek.x + 176, y: cheek.y - 150 }, { x: cheek.x + 250, y: cheek.y - 60 }];
    return base.map((p, i) => (i < 3 ? { x: lerp(p.x, target[i]!.x, s), y: lerp(p.y, target[i]!.y, s) } : p));
  };
}

export function drawGrab(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const u = wrap(t);
  const pose = badgerAt(t);
  const punch = punchAt(t);
  const cheek = headPoint(pose, CHEEK);
  const z = 1 + 0.75 * punch;
  const hit = hitAt(t);
  const jolt = hit * 10 * Math.sin(u * 90);
  ctx.save();
  // Punch in on the cheek, bringing it towards the middle of the frame.
  ctx.translate(lerp(0, 560 - cheek.x, punch) + jolt, lerp(0, 1020 - cheek.y, punch));
  ctx.translate(cheek.x, cheek.y);
  ctx.scale(z, z);
  ctx.translate(-cheek.x, -cheek.y);
  ctx.drawImage(cast.bg.grab, 0, 0);
  if (u < GRABS_AT) {
    drawAdder(ctx, cast.adder, boil, { spine: smoothSpine(waitingKnots(t), 3), base: BASE }, 'top', 0);
    drawBadger(ctx, cast.badger, boil, pose);
  } else {
    const striking = strikeAt(t) > 0.55 && recoilAt(t) < 0.5;
    drawCatch(ctx, cast, boil, pose, Math.sin(u * 3.1), BASE, strikeKnots(pose, t), striking ? 'strike' : 'top', striking ? 1.75 : 1.3);
    dust(ctx, { x: headPoint(pose, { x: 80, y: 58 }).x, y: GROUND }, (u - GRABS_AT) / 0.5, 120, 31);
  }
  hitStar(ctx, { x: cheek.x - 6, y: cheek.y - 30 }, hit, 52);
  ctx.restore();
  if (hit > 0) {
    ctx.save();
    ctx.globalAlpha = 0.3 * hit;
    ctx.fillStyle = '#fff4dc';
    ctx.fillRect(0, 0, 1080, 1920);
    ctx.restore();
  }
  vignette(ctx, 0.45 + 0.2 * punch, 1080);
}
