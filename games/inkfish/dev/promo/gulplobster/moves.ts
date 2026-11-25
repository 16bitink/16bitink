import { ANTENNA, LEG_BASES, SHOULDER_FAR, SHOULDER_NEAR } from './parts';
import { bodyPoint, type ClawPose, type LobsterPose } from './lobster';
import { cubic, type Pt } from './shell';
import { clamp01, lerp, ramp } from '../short';
import {
  CLACK_AT, eyeTurn, eyeWide, flick, frameAngle, GULP_AT, HEAVES, insertion, isDessert, jawTips, LOOP_S, mouthFrame, offLine, reach, seam, SLURP_AT, SNIP_AT, TAIL_UNITS, viperJaw,
} from './story';

/** The lobster's pose over the loop, in the mouth's frame (body units). */

/** Which way it lies on screen while its body is out in the water: face a touch up. */
const LIE = -0.075;
/** In the strike it rears up and holds its claws in closer: 1 on frame 1 .. 0 once bitten. */
const rear = (t: number): number => (isDessert(t) ? ramp(t, 11.2, 11.75) : 1 - ramp(t, 0.35, 1.1));
/** The thrash as it is held, and the tug of a heave. */
const thrash = (t: number): number => 0.055 * Math.sin(2 * Math.PI * 3 * t + 1);
export function tug(t: number): number {
  return Math.max(0, ...HEAVES.map((h) => Math.sin(Math.PI * clamp01((t - h + 0.1) / 0.45))));
}
/** It trails straight behind itself: streaming as it flicks backwards, and as it is slurped in. */
export function streaming(t: number): number {
  if (isDessert(t)) return 1 - ramp(t, 10.8, 11.3);
  return t < GULP_AT ? ramp(t, SLURP_AT - 0.1, SLURP_AT + 0.14) : 0;
}

function heading(t: number): number {
  const across = LIE - 0.12 * rear(t) - frameAngle(mouthFrame(t));
  // As the carapace goes in it turns to follow the throat.
  const follow = isDessert(t) ? 0 : 0.75 * ramp(reach(t), 250, 430);
  return across * (1 - follow) + thrash(t) * (isDessert(t) ? ramp(t, 11.3, LOOP_S) : 1 - Math.min(1, insertion(t)));
}

type Body = Pick<LobsterPose, 'joint' | 'heading'>;

function bodyAt(t: number): Body {
  const a = heading(t);
  const d = TAIL_UNITS - reach(t);
  return { heading: a, joint: { x: d * Math.cos(a), y: d * Math.sin(a) + offLine(t) } };
}

const lerpAngle = (a: number, b: number, u: number): number => a + (b - a) * u;
const mixClaw = (a: ClawPose, b: ClawPose, u: number): ClawPose => (u <= 0 ? a : u >= 1 ? b : {
  wrist: { x: lerp(a.wrist.x, b.wrist.x, u), y: lerp(a.wrist.y, b.wrist.y, u) }, angle: lerpAngle(a.angle, b.angle, u), open: lerp(a.open, b.open, u), bend: a.bend,
});

/** A pose from the shoulder, in the body's own frame. */
function fromShoulder(body: Body, shoulder: Pt, dx: number, dy: number, angle: number, open: number, bend: 1 | -1): ClawPose {
  return { wrist: bodyPoint(body, { x: shoulder.x + dx, y: shoulder.y + dy }), angle: body.heading + angle, open, bend };
}

/** How much the claws hold on to the jaws: 0 free .. 1 braced (through the first two heaves, torn off at the third). */
export const bracing = (t: number): number => (isDessert(t) ? 0 : ramp(t, 1.35, 1.75) * (1 - ramp(t, 3.6, 3.88)));
/** The wave goodbye: 0 .. 1. */
const waving = (t: number): number => (t < GULP_AT ? ramp(t, 3.75, 4.0) : 0);
const snip = (t: number): number => Math.max(...[SNIP_AT, SNIP_AT + 0.11].map((s) => Math.max(0, 1 - Math.abs(t - s) / 0.05)));

export function clawsAt(t: number, body: Body): readonly [ClawPose, ClawPose] {
  const u = seam(t);
  const beat = 2 * Math.PI * t;
  const tips = jawTips(t);
  const tilt = frameAngle(mouthFrame(t));
  const toFrame = (x: number, y: number): Pt => ({ x: x * Math.cos(tilt) + y * Math.sin(tilt), y: -x * Math.sin(tilt) + y * Math.cos(tilt) });
  const startle = u < 0 ? ramp(u, -0.6, -0.2) : 1;
  // Free: both up and wide, gaping at you.
  const r = rear(t);
  const guardFar = fromShoulder(body, SHOULDER_FAR, 84 - 4 * r + 8 * Math.sin(beat * 2), -104 + 42 * r - 8 * Math.cos(beat * 2), -0.98 + 0.08 * r + 0.12 * Math.sin(beat * 2 + 1), lerp(0.25, 0.5, startle) + 0.12 * Math.sin(beat * 3), -1);
  const guardNear = fromShoulder(body, SHOULDER_NEAR, 68 - 46 * r + 6 * Math.sin(beat * 2 + 2), 70 + 8 * Math.cos(beat * 2 + 2), 0.3 + 0.86 * r + 0.1 * Math.sin(beat * 2 + 3), lerp(0.25, 0.55, startle) + 0.12 * Math.sin(beat * 3 + 2), 1);
  // Streaming straight ahead of the face, close together.
  const trailFar = fromShoulder(body, SHOULDER_FAR, 150, -42 + 5 * Math.sin(beat * 2), -0.07 + 0.04 * Math.sin(beat * 2), 0.06, -1);
  const trailNear = fromShoulder(body, SHOULDER_NEAR, 156, 2 + 5 * Math.sin(beat * 2 + 1), 0.07 + 0.04 * Math.sin(beat * 2 + 2), 0.06, 1);
  // Waving goodbye, side by side out of the mouth.
  const w = Math.sin(beat * 2.6);
  const cut = snip(t);
  const waveFar = fromShoulder(body, SHOULDER_FAR, 128, -44, -0.62 + 0.3 * w, 0.42 * (1 - cut), -1);
  const waveNear = fromShoulder(body, SHOULDER_NEAR, 136, 24, 0.34 + 0.3 * w, 0.5 * (1 - cut), 1);
  // Braced: the cutter's tip under the upper jaw, the crusher's on the lower lip, then shut on it.
  const strain = tug(t);
  const up = toFrame(172 - 10 * strain, -44);
  const down = toFrame(128 - 10 * strain, 34);
  const shut = t < CLACK_AT ? 0 : ramp(t, CLACK_AT, CLACK_AT + 0.05);
  const braceFar: ClawPose = { wrist: { x: tips.upper.x + up.x, y: tips.upper.y + up.y }, angle: -tilt - Math.PI - 0.42 - 0.05 * strain, open: 0.16, bend: -1 };
  const braceNear: ClawPose = { wrist: { x: tips.lower.x + down.x, y: tips.lower.y + down.y }, angle: -tilt + Math.PI + 0.22, open: lerp(0.62, 0.2, shut), bend: 1 };
  const held = bracing(t);
  const wave = waving(t);
  const s = streaming(t);
  // Letting go (and reaching for the jaws), a claw swings well clear of them.
  const clear = Math.sin(Math.PI * held);
  const swing = (c: ClawPose, x: number, y: number): ClawPose => {
    const o = toFrame(x * clear, y * clear);
    return { ...c, wrist: { x: c.wrist.x + o.x, y: c.wrist.y + o.y } };
  };
  const far = mixClaw(mixClaw(swing(mixClaw(guardFar, braceFar, held), 80, 40), waveFar, wave), trailFar, s);
  const near = mixClaw(mixClaw(swing(mixClaw(guardNear, braceNear, held), 110, -120), waveNear, wave), trailNear, s);
  return [far, near];
}

const WHIP_POINTS = 30;
function whip(t: number, body: Body, far: boolean): Pt[] {
  const root = { x: ANTENNA.x + (far ? 42 : 38), y: ANTENNA.y + (far ? -12 : 2) };
  const s = streaming(t);
  const beat = (2 * Math.PI * t) / 1;
  const sway = (k: number): number => 14 * Math.sin(beat * 1.5 + k + (far ? 2 : 0)) * (0.4 + 0.6 * (1 - s));
  // Up and over, or streaming straight ahead.
  const r = rear(t);
  const up = far
    ? [{ x: 95 - 20 * r, y: -24 }, { x: 178 - 68 * r + sway(1), y: -96 }, { x: 176 - 82 * r + sway(2), y: -250 + 24 * r }]
    : [{ x: 74, y: -4 }, { x: 112 + sway(0), y: -176 }, { x: -28 + sway(2), y: -262 + sway(3) * 0.5 }];
  const out = far
    ? [{ x: 110, y: -12 }, { x: 220, y: -44 + sway(1) }, { x: 330, y: -30 + sway(2) }]
    : [{ x: 110, y: 8 }, { x: 220, y: 30 + sway(1) }, { x: 335, y: 8 + sway(2) }];
  const q = up.map((p, i) => ({ x: root.x + lerp(p.x, out[i]!.x, s), y: root.y + lerp(p.y, out[i]!.y, s) }));
  return cubic(root, q[0]!, q[1]!, q[2]!, WHIP_POINTS).map((p) => bodyPoint(body, p));
}

export function poseAt(t: number): LobsterPose {
  const body = bodyAt(t);
  const inMouth = isDessert(t) ? ramp(reach(t), 0, 70) : 1;
  const f = isDessert(t) ? flick(t) : 0;
  // In the mouth the tail turns to follow the throat; a flick curls it under.
  const tailBend = -body.heading * 0.7 * inMouth - 2.5 * f;
  return {
    ...body,
    tailBend,
    // Folded to fit the jaws as they open round it.
    spread: lerp(1 - 0.45 * f, lerp(0.1, 0.72, clamp01((viperJaw(t) - 1.1) / 1.7)), isDessert(t) ? ramp(t, 11.4, 11.75) : 1),
    phase: 2 * Math.PI * 2 * t,
    tuck: LEG_BASES.map((b) => Math.max(isDessert(t) ? 0.55 * (1 - ramp(t, 10.9, 11.4)) : 0, 1 - ramp(bodyPoint(body, b).x, -20, 80), t < GULP_AT ? ramp(t, SLURP_AT - 0.1, SLURP_AT) : 0)),
    claws: clawsAt(t, body),
    antennae: [whip(t, body, true), whip(t, body, false)],
    eyeTurn: eyeTurn(t),
    wide: eyeWide(t),
  };
}
