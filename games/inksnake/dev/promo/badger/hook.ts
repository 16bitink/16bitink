import { VIDEO } from '../short';
import type { Pt } from '../sprites';
import { adderShare, type AdderLay, type BadgerPose, drawAdderBody, drawAdderHead, drawBadger, headPoint, smoothSpine } from './actors';
import { GRIP_AT, OVERLAY } from './badgerHead';
import type { Cast } from './cast';
import { hookPose } from './story';

/**
 * Frame 1: the honey badger big in frame, side on and facing right on the
 * red sand, the puff adder's body clamped in its jaws. The adder runs
 * through the mouth: its forebody arcs down in front of the badger's chest
 * and rears up, the broad triangular head turned to the badger's face; the
 * rest drops from the far side of the jaws to the sand and runs back under
 * the badger's forepaw, pinned by its claws. Chevrons all along it.
 */
const FOCUS: Pt = { x: 620, y: 1150 };

export const HOOK_BADGER: BadgerPose = { at: { x: 470, y: 1350 }, scale: 2.65, body: 'stand', head: 'grip' };

/** The share of the adder's length at the jaws, and how hard they squeeze it there. */
const GRIP_U = 0.36;
const PINCH = 0.72;

const pinched = (u: number): number => adderShare(u) * (1 - (1 - PINCH) * Math.exp(-(((u - GRIP_U) / 0.035) ** 2)));

/**
 * The adder's lay for a badger with its jaws at `grip`: the forebody hangs
 * from the near jaw in front of the snout and rears, the head turned back
 * at the badger's face; the rest drops from the jaws down the chest to the
 * sand and runs back under the forepaws.
 */
export function heldKnots(grip: Pt, sway: number, ground: number): Pt[] {
  return [
    { x: grip.x + 24 + sway * 6, y: grip.y - 232 + Math.abs(sway) * 3 },
    { x: grip.x + 84 + sway * 4, y: grip.y - 236 },
    { x: grip.x + 124, y: grip.y - 170 },
    { x: grip.x + 122, y: grip.y - 80 },
    { x: grip.x + 76, y: grip.y - 8 },
    grip,
    { x: grip.x - 34, y: grip.y + 36 },
    { x: grip.x - 46, y: ground - 40 },
    { x: grip.x - 96, y: ground + 4 },
    { x: grip.x - 220, y: ground + 14 },
    { x: grip.x - 290, y: ground + 8 },
  ];
}

export function heldAdder(grip: Pt, sway: number, base: number, ground: number, knots: readonly Pt[] = heldKnots(grip, sway, ground)): AdderLay {
  return { spine: smoothSpine(knots, 3), base, share: pinched };
}

/** The share of the length where the adder touches down (from there it lies under the paws). */
const GROUND_U = 0.6;

/** The badger with the adder in its jaws (no backdrop): the tail behind the paws, the forebody in front, the upper jaw over the bite. */
export function drawCatch(
  ctx: CanvasRenderingContext2D, cast: Cast, boil: number, pose: BadgerPose, sway: number, base: number,
  knots?: (grip: Pt) => readonly Pt[], adderHead: 'top' | 'strike' = 'top', headK = 1.45,
): void {
  const grip = headPoint(pose, GRIP_AT);
  const lay = heldAdder(grip, sway, base, pose.at.y, knots?.(grip));
  drawAdderBody(ctx, cast.adder, boil, { ...lay, from: GROUND_U }, 1);
  drawBadger(ctx, cast.badger, boil, pose, 'body');
  drawBadger(ctx, cast.badger, boil, pose, 'head');
  drawAdderBody(ctx, cast.adder, boil, { ...lay, to: GROUND_U }, 0.6);
  // A resting head lies under the badger's muzzle; a striking one lands on its face, so over it.
  if (adderHead === 'top') drawAdderHead(ctx, cast.adder, boil, lay, adderHead, 0, headK);
  drawBadger(ctx, cast.badger, boil, { ...pose, head: OVERLAY[pose.head] ?? 'gripTop' }, 'head');
  if (adderHead === 'strike') drawAdderHead(ctx, cast.adder, boil, lay, adderHead, 0, headK);
}

export function drawHook(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const h = hookPose(t);
  ctx.save();
  ctx.translate(FOCUS.x, FOCUS.y);
  ctx.scale(h.zoom, h.zoom);
  ctx.translate(-FOCUS.x, -FOCUS.y);
  ctx.drawImage(cast.bg.hook, -50, -50);
  drawCatch(ctx, cast, boil, { ...HOOK_BADGER, nod: h.tug }, h.sway, 82);
  ctx.restore();
  const v = ctx.createRadialGradient(VIDEO.width / 2, 1100, 460, VIDEO.width / 2, 1100, 1300);
  v.addColorStop(0, 'rgba(30,10,4,0)');
  v.addColorStop(1, 'rgba(30,10,4,0.5)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

