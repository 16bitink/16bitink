import { clamp01, lerp, ramp, smooth } from '../short';
import { curlArm, type Pt, spline } from '../octopus/geom';
import { drawLeak, drawSlit, SLIT, TANK, UNDER } from './gap';
import { drawHall, drawLid, drawTankBack, drawTankFront, NIGHT_LIGHT } from './hall';
import { type Arm, bodyTube, drawArm, drawEye, drawHub, drawWeb, drips, eyesOf, meltInto, natural, type Octo } from './octo';
import { drawTube, glow, type Light, tubeFrame } from './paint';
import { INKY_AT, said, SQUEEZED_AT } from './story';

/**
 * "Inky squeezed out,": from the water (right, behind the glass) through the
 * slot between rim and lid, flattened to a pancake there, and out at the left
 * over the front, where it balloons back to its shape. Arms first, then the
 * mantle; the second eye pops through the slot last.
 */

/** The second eye is through the slot, and pops round again. */
const POP_AT = said('out,') + 0.06;
/** Where it comes out along the slot, and where it goes in. */
const OUT_X = 412;
const IN_X = 800;
const FULL = 186;
/** The share left in the water under which the last of it is up behind the bar. */
const SAC_GONE = 0.1;

/** The first of it out: a low dome bulging from the slot. */
const dome = (v: number): number => (v < 0.4 ? 1 : Math.sqrt(Math.max(0, 1 - ((v - 0.4) / 0.6) ** 2)));

export interface Squeeze {
  /** The part outside. */
  readonly octo: Octo;
  readonly arms: readonly Arm[];
  /** The slot's height there (the lid lifts as the body goes through). */
  readonly gap: number;
  /** How much is still in the water, 1 .. 0. */
  readonly inside: number;
  /** 0 .. 1 all out, the last eye popped round. */
  readonly pop: number;
  /** The last eye on its way: in the water, then flat in the slot. */
  readonly slotEye: { readonly x: number; readonly y: number; readonly flat: number };
}

export function squeezeAt(t: number): Squeeze {
  const through = ramp(t, INKY_AT + 0.08, POP_AT);
  const inside = 1 - through;
  const s = (t - POP_AT) / 0.2;
  const pop = s <= 0 ? 0 : smooth(s);
  const strain = Math.sin(t * 31) * (1 - pop) * ramp(t, INKY_AT, SQUEEZED_AT);
  // Outside: it swells out of the slot over the bar, then springs up full.
  const size = FULL * (lerp(0.62, 1, through) + 0.05 * Math.sin(clamp01(s) * Math.PI));
  const crownY = lerp(SLIT + 34, SLIT + 160, through);
  const full = smooth(through / 0.75);
  // Rounded under the arms; from a dome to its own shape.
  const profile = (v: number): number => lerp(dome(v), natural(v), full) * (v < 0.1 ? Math.sqrt(1 - 0.8 * ((0.1 - v) / 0.1) ** 2) : 1);
  const up = -Math.PI / 2 - 0.12 + 0.03 * strain;
  const length = size * lerp(1.45, 3.6, through);
  const n = 12;
  const axis: Pt[] = Array.from({ length: n + 1 }, (_, i) => {
    const d = (i / n) * length;
    const a = up - 0.12 * (i / n);
    return { x: OUT_X + 4 * strain + Math.cos(a) * (d - size * 0.45), y: crownY + Math.sin(a) * (d - size * 0.45) };
  });
  const arm = (a: number, len: number, curl: number, i: number): Arm => {
    const root = { x: OUT_X + Math.cos(a) * lerp(74, 84, through), y: crownY + lerp(-10, 10, through) + Math.sin(a) * 46 };
    return { path: curlArm(root, a + 0.06 * Math.sin(t * 5 + i), len, curl, 0.18, t * 3 + i, 44), w: lerp(50, 56, through), band: (v) => (curl > 0 ? -1 : 1) * lerp(1.45, 0.15, clamp01((v - 0.35) / 0.35)), seed: 5301 + i };
  };
  const arms = [
    arm(Math.PI * 0.94, 470, -2.4, 0),
    arm(Math.PI * 0.72, 600, -2.8, 1),
    arm(Math.PI * 0.53, 560, -3.2, 2),
    arm(Math.PI * 0.32, 590, 2.6, 3),
    arm(Math.PI * 0.1, 470, 2.4, 4),
  ];
  // Up through the water, into the slot, along it.
  const gap = lerp(86, 124, Math.sin(clamp01(through * 1.02) * Math.PI)) + 3 * strain - 46 * pop;
  const rise = ramp(t, INKY_AT + 0.1, said('out,') - 0.12);
  const along = smooth((t - (said('out,') - 0.14)) / 0.2);
  const inSlot = SLIT - gap * 0.5;
  const slotEye = { x: lerp(lerp(IN_X + 30, 742, rise), OUT_X + 150, along), y: lerp(920, inSlot, smooth(rise)), flat: smooth((rise - 0.78) / 0.22) };
  return {
    octo: { axis, size, turn: 0.04, gaze: { x: 0.25 - 0.2 * pop, y: 0.1 }, lid: lerp(0.4, 0.02, pop), breathe: 1 + 0.02 * Math.sin(t * 22) * (1 - pop), detail: 1.2, profile },
    arms, gap, inside, pop, slotEye,
  };
}

/** What's still in the water: a sac narrowing up into the slot. */
function drawInside(ctx: CanvasRenderingContext2D, s: Squeeze, t: number, boil: number): void {
  if (s.inside < SAC_GONE) return;
  const k = Math.sqrt((s.inside - SAC_GONE) / (1 - SAC_GONE));
  const wob = 8 * Math.sin(t * 15);
  const path = spline([{ x: IN_X + 30 + wob, y: 700 + 470 * k }, { x: IN_X + 24 + wob, y: 700 + 310 * k }, { x: IN_X - 4, y: 700 + 140 * k }, { x: IN_X - 40, y: 676 }, { x: IN_X - 66, y: SLIT - 20 }], 10);
  const radius = (v: number): number => {
    const sac = v < 0.34 ? Math.sqrt(Math.max(0.004, 1 - ((0.34 - v) / 0.34) ** 2)) : 1 - 0.1 * smooth((v - 0.34) / 0.3);
    return 235 * k * sac * lerp(1, 0.46, smooth((v - 0.5) / 0.4)) * (1 + 0.04 * Math.sin(v * 9 - t * 16));
  };
  drawTube(ctx, { path, radius, n: 110, seed: 5330, boil, detail: 1.1, bumps: 0.015 }, UNDER);
}

/** The flattened strip in the slot, rim and lid pressing into it. */
function drawStrip(ctx: CanvasRenderingContext2D, s: Squeeze, t: number, boil: number): void {
  // Its far end bends down behind the bar, into what's still in the water.
  const down = smooth((s.inside - SAC_GONE) / 0.16);
  const held = Math.max(lerp(OUT_X + 150, IN_X + 20, smooth(s.inside / 0.45)), s.slotEye.flat > 0 ? s.slotEye.x + 180 : 0);
  const right = lerp(held, IN_X + 20, down);
  const left = OUT_X;
  if (s.pop > 0.3) return;
  const y = SLIT - s.gap * 0.46;
  const path = spline([
    ...Array.from({ length: 12 }, (_, i) => ({ x: lerp(left, right - 110 * down, i / 11), y: y + 3 * Math.sin(i * 0.9 + t * 14) })),
    { x: right - 48 * down + 14 * (1 - down), y: y + 22 * down }, { x: right - 8 * down + 28 * (1 - down), y: y + 78 * down }, { x: right + 42 * (1 - down), y: y + 160 * down },
  ], 6);
  // A pancake seen edge on: thicker than the slot, so the bar and the lid cut into it; it thins to nothing once nothing follows.
  const end = (v: number): number => Math.sqrt(Math.max(0.002, 1 - Math.max(0, (v - 0.55) / 0.45) ** 2.4));
  const radius = (v: number): number => Math.max(1, s.gap * lerp(0.64, 0.7, v) * lerp(end(v), 1, down) * (1 + 0.06 * Math.sin(v * 22 - t * 18)));
  const light: Light = { ...NIGHT_LIGHT, key: [-0.25, -0.6, 0.6], ambient: 0.16, wet: 0.55 };
  ctx.save();
  // Nothing of it shows below the bar: there it's the sac in the water.
  ctx.beginPath();
  ctx.rect(-200, -200, 1480, 200 + SLIT + 60);
  ctx.clip();
  const f = drawTube(ctx, { path, radius, n: 120, seed: 5350, boil, detail: 1.2, bumps: 0.02 }, light);
  // Stretch creases running the way it's being pulled.
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const k = -0.6 + (i / 8) * 1.2;
    const from = 12 + ((i * 29) % 46);
    ctx.strokeStyle = `rgba(70,20,8,${0.4 - 0.2 * Math.abs(k)})`;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let j = from; j < from + 40; j += 4) {
      const p = f.pts[Math.min(119, j)]!;
      ctx.lineTo(p.x, p.y + k * f.r[Math.min(119, j)]! * 0.9 + 2 * Math.sin(j * 0.3 + i));
    }
    ctx.stroke();
  }
  // Pinched dark where the edges bite.
  for (const yy of [SLIT - 2, SLIT - s.gap + 2]) glow(ctx, (left + right) / 2, yy, (right - left) * 0.6, 24, [14, 3, 5], 0.8);
  ctx.restore();
}

/** The last eye: round in the water, flat in the slot. */
function drawTravellingEye(ctx: CanvasRenderingContext2D, s: Squeeze, light: Light, boil: number): void {
  const e = s.slotEye;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(lerp(1, 1.45, e.flat), lerp(1, 0.62, e.flat));
  drawEye(ctx, { c: { x: 0, y: 0 }, r: 62, face: 1, angle: 0 }, { x: -0.7, y: lerp(-0.8, 0, e.flat) }, lerp(0.1, 0.22, e.flat), light, boil, 3);
  ctx.restore();
}

export function drawSqueeze(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const s = squeezeAt(t);
  ctx.save();
  const z = lerp(1.0, 1.05, ramp(t, INKY_AT, POP_AT));
  ctx.translate(520, 760);
  ctx.scale(z, z);
  ctx.translate(-520, -760);
  drawHall(ctx, t, { x: 320, y: -160, w: 560, a: 0.85 });
  drawTankBack(ctx, TANK, t, boil);
  drawSlit(ctx, s.gap, s.gap * 0.86);
  // In the water and in the slot: the glass, the bar and the lid are in front of these.
  drawInside(ctx, s, t, boil);
  const waiting = s.pop <= 0;
  if (waiting && s.slotEye.flat <= 0) drawTravellingEye(ctx, s, UNDER, boil);
  drawStrip(ctx, s, t, boil);
  if (waiting && s.slotEye.flat > 0) drawTravellingEye(ctx, s, NIGHT_LIGHT, boil);
  drawTankFront(ctx, TANK, t, boil);
  drawLid(ctx, { x: 1160, y: SLIT - s.gap * 0.86 }, { x: -60, y: SLIT - s.gap }, { x: 120, y: -190 }, 66, boil);
  drawLeak(ctx, s.gap, s.gap * 0.86);
  // Outside, over the bar: what's come through.
  const crown = { x: OUT_X, y: s.octo.axis[0]!.y };
  glow(ctx, OUT_X + 10, crown.y + 60, s.octo.size * 1.7, 110, [3, 8, 16], 0.5);
  drawHub(ctx, OUT_X, crown.y - s.octo.size * 0.12, s.octo.size * 0.72, s.octo.size * 0.42, NIGHT_LIGHT);
  const tube = bodyTube(s.octo, boil);
  drawTube(ctx, tube, NIGHT_LIGHT);
  meltInto(ctx, { x: OUT_X, y: crown.y - s.octo.size * 1.06, rx: s.octo.size * 1.16, ry: s.octo.size * 0.98, core: 0.62 }, (l) => {
    drawHub(l, OUT_X, crown.y - s.octo.size * 0.12, s.octo.size * 0.72, s.octo.size * 0.42, NIGHT_LIGHT);
    const [a, b, m, d, e] = s.arms as [Arm, Arm, Arm, Arm, Arm];
    drawArm(l, a, NIGHT_LIGHT, boil);
    drawArm(l, e, NIGHT_LIGHT, boil);
    for (const [p, q] of [[a, b], [b, m], [m, d], [d, e]] as const) drawWeb(l, p.path, q.path, 0.24, NIGHT_LIGHT, boil, 5400);
    for (const arm of [b, d, m]) drawArm(l, arm, NIGHT_LIGHT, boil);
  });
  // Its first eye opens as it swells; the second springs round once it's through.
  const spots = [...eyesOf(s.octo, tubeFrame(tube))].sort((p, q) => p.c.x - q.c.x);
  const first = ramp(t, SQUEEZED_AT - 0.12, SQUEEZED_AT + 0.14);
  const spring = s.pop * (1 + 0.35 * Math.sin(s.pop * Math.PI));
  [first, spring].forEach((k, i) => {
    const e = spots[i];
    if (e && k > 0.02) drawEye(ctx, { ...e, r: e.r * k }, s.octo.gaze, i === 0 ? s.octo.lid : 0.02, NIGHT_LIGHT, boil, i);
  });
  ([[200, 960, 1.3], [300, 760, 1], [470, 770, 1.1], [560, 980, 0.9], [420, 1240, 1.2]] as const).forEach(([x, y, r], i) => drips(ctx, { x, y }, t, r, 240, i));
  ctx.restore();
}
