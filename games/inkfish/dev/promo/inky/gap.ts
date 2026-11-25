import { lerp, ramp } from '../short';
import { type Pt, shareAt, spline } from '../octopus/geom';
import { drawHall, drawLid, drawTankBack, drawTankFront, NIGHT_LIGHT, type Tank } from './hall';
import { type Arm, drawArm, drips } from './octo';
import { glow, type Light, poly, wash } from './paint';
import { drawRig, grown, sittingArms } from './rig';
import { CRACK_AT, INKY_AT, JUST_AT, LID_AT, OPEN_AT } from './story';

/** Close on the lid's gap: an arm tip feeling its way out (the squeeze through it is in squeeze.ts). */

export const TANK: Tank = { xL: -60, xR: 1140, rim: 660, base: 2000, inset: 150, rise: 96, water: 70, frame: 84 };
export const UNDER: Light = { ...NIGHT_LIGHT, key: [-0.25, -0.85, 0.7], ambient: 0.32, wet: 0.35, tint: [40, 140, 150], tintK: 0.1 };
export const SLIT = TANK.rim - TANK.frame / 2;

/** The light leaking out of the gap. */
export function drawLeak(ctx: CanvasRenderingContext2D, gapL: number, gapR: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 5; k++) {
    poly(ctx, [{ x: -60, y: SLIT - gapL }, { x: 1140, y: SLIT - gapR }, { x: 1140, y: SLIT - gapR - 160 - 90 * k }, { x: -60, y: SLIT - gapL - 420 - 160 * k }], wash(ctx, 0, SLIT - gapL, 0, SLIT - gapL - 420 - 160 * k, [[0, 'rgba(80,220,225,0.03)'], [1, 'rgba(80,220,225,0)']]));
  }
  ctx.restore();
}

/** The gap itself: dark, with the water's light at the bottom. */
export function drawSlit(ctx: CanvasRenderingContext2D, gapL: number, gapR: number): void {
  poly(ctx, [{ x: -60, y: SLIT - gapL }, { x: 1140, y: SLIT - gapR }, { x: 1140, y: SLIT + 8 }, { x: -60, y: SLIT + 8 }], wash(ctx, 0, SLIT - gapL, 0, SLIT + 8, [[0, '#041420'], [0.55, '#0c5668'], [1, '#4fe0dc']]));
}

// ---------------------------------------------------------------- "The lid was left open… just a crack."

/** The arm's way out: up through the water and the gap, over the bar, down the glass, curling. */
const FEELER: readonly Pt[] = spline([
  { x: 600, y: 1040 }, { x: 500, y: 1010 }, { x: 412, y: 930 }, { x: 350, y: 780 }, { x: 330, y: 690 }, { x: 322, y: 600 }, { x: 300, y: 540 }, { x: 240, y: 520 }, { x: 180, y: 556 }, { x: 150, y: 640 }, { x: 170, y: 730 }, { x: 240, y: 770 }, { x: 296, y: 742 }, { x: 290, y: 700 },
], 12);
/** Where it is in the gap. */
const IN_GAP: Pt = { x: 320, y: 602 };

export function feelerAt(t: number): Pt[] {
  const peek = 0.54 + 0.12 * ramp(t, OPEN_AT, OPEN_AT + 0.4) + 0.34 * ramp(t, JUST_AT + 0.1, CRACK_AT + 0.3);
  const path = grown(FEELER, peek);
  // The tip feels about: left, right, left.
  return path.map((p, i) => {
    const s = i / (path.length - 1);
    return { x: p.x + s ** 2.4 * (16 * Math.sin(t * 9 + s * 3)), y: p.y + s ** 3 * 8 * Math.cos(t * 7) };
  });
}

export function drawLidScene(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const u = ramp(t, LID_AT - 0.1, INKY_AT);
  const z = lerp(1, 1.18, u);
  ctx.save();
  ctx.translate(lerp(540, 500, u), 700);
  ctx.scale(z, z);
  ctx.translate(-lerp(540, 430, u), -700);
  drawHall(ctx, t, { x: 220, y: -160, w: 560, a: 0.8 });
  const gapL = 92;
  const gapR = 12;
  drawTankBack(ctx, TANK, t, boil);
  drawSlit(ctx, gapL, gapR);
  const path = feelerAt(t);
  const arm: Arm = { path, w: 50, band: (s) => lerp(-0.2, 0.2, s) + 1.0 * Math.max(0, 1 - s * 1.6), seed: 5260, end: 0.06 };
  drawArm(ctx, arm, UNDER, boil);
  const look = ramp(t, LID_AT + 0.2, LID_AT + 0.6);
  drawRig(ctx, {
    x: 620, y: 1066, size: 172, up: -Math.PI / 2 + 0.12, bend: 0.75, length: 3.1, turn: 0.2, gaze: { x: lerp(0.4, -0.75, look), y: lerp(0.4, -1, look) }, lid: lerp(0.5, 0.12, look),
    breathe: 1 + 0.02 * Math.sin(t * 4), arms: sittingArms(t * 2, 1), seed: 5201,
  }, UNDER, boil);
  drawTankFront(ctx, TANK, t, boil);
  drawLid(ctx, { x: 1160, y: SLIT - gapR }, { x: -60, y: SLIT - gapL }, { x: 120, y: -190 }, 66, boil);
  drawLeak(ctx, gapL, gapR);
  // What's come out is in front of the bar and the lid.
  glow(ctx, 230, 690, 150, 60, [4, 8, 16], 0.45 * ramp(t, JUST_AT, CRACK_AT));
  drawArm(ctx, { ...arm, from: shareAt(path, IN_GAP) }, NIGHT_LIGHT, boil, 0.06);
  drips(ctx, { x: 226, y: 704 }, t, 1.1, 260, 2);
  drips(ctx, { x: 330, y: 704 }, t, 0.8, 220, 5);
  ctx.restore();
}
