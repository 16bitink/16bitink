import { ANTENNA, drawPart, EYE_FAR, EYE_NEAR, LEG_BASES, type LobsterParts, ringBottom, RING_LEN, RINGS, SHOULDER_FAR, SHOULDER_NEAR } from './parts';
import { cubic, curve, ink, PAL, type Pt, trace, tube } from './shell';

/** One claw: where its wrist is, which way the hand points, how far it gapes (radians), which way the elbow bends. */
export interface ClawPose {
  readonly wrist: Pt;
  readonly angle: number;
  readonly open: number;
  readonly bend: 1 | -1;
}

/** The lobster as it is drawn, in body units (the mouth's frame): tail to -x, face to +x. */
export interface LobsterPose {
  /** Where the carapace meets the abdomen, and which way the carapace heads. */
  readonly joint: Pt;
  readonly heading: number;
  /** How far the abdomen turns from the carapace to the fan: negative curls under. */
  readonly tailBend: number;
  /** The fan: 0 folded .. 1 spread. */
  readonly spread: number;
  /** The beat of the legs and swimmerets, radians. */
  readonly phase: number;
  /** Each leg's tuck, front to back: 0 reaching down .. 1 laid along the body. */
  readonly tuck: readonly number[];
  /** The cutter (far side), the crusher (near side). */
  readonly claws: readonly [ClawPose, ClawPose];
  /** The long antennae, root to tip, far and near. */
  readonly antennae: readonly [readonly Pt[], readonly Pt[]];
  /** The eyes: 0 looking ahead .. 1 turned back to the jaws, and how wide. */
  readonly eyeTurn: number;
  readonly wide: number;
}

const ARM: readonly [number, number] = [96, 76];
export const ARM_REACH = ARM[0] + ARM[1];

export function bodyPoint(pose: Pick<LobsterPose, 'joint' | 'heading'>, q: Pt): Pt {
  const c = Math.cos(pose.heading);
  const s = Math.sin(pose.heading);
  return { x: pose.joint.x + c * q.x - s * q.y, y: pose.joint.y + s * q.x + c * q.y };
}

/** The abdomen's joints from the fan (0) to the carapace (RINGS), each with the heading of the ring in front of it; the fan's own heading last. */
export function tailChain(pose: LobsterPose): { readonly joints: readonly Pt[]; readonly angles: readonly number[]; readonly fan: number } {
  const joints: Pt[] = [];
  const angles: number[] = [];
  let at = pose.joint;
  for (let i = RINGS - 1; i >= 0; i--) {
    const a = pose.heading + (pose.tailBend * (RINGS - i - 0.5)) / (RINGS + 0.5);
    at = { x: at.x - RING_LEN * Math.cos(a), y: at.y - RING_LEN * Math.sin(a) };
    joints[i] = at;
    angles[i] = a;
  }
  return { joints, angles, fan: pose.heading + pose.tailBend };
}

function withFrame(c: CanvasRenderingContext2D, at: Pt, angle: number, draw: () => void): void {
  c.save();
  c.translate(at.x, at.y);
  c.rotate(angle);
  draw();
  c.restore();
}

/** Where the elbow is (two bones; past their reach the arm runs straight, stretched). */
function elbowOf(s: Pt, w: Pt, bend: number): Pt {
  const dx = w.x - s.x;
  const dy = w.y - s.y;
  const d = Math.max(Math.hypot(dx, dy), 1);
  const u = Math.min(d, ARM_REACH - 0.5);
  const a = (ARM[0] ** 2 - ARM[1] ** 2 + u * u) / (2 * u);
  const h = Math.sqrt(Math.max(0, ARM[0] ** 2 - a * a));
  const k = a / u;
  return { x: s.x + dx * k - (dy / d) * h * bend, y: s.y + dy * k + (dx / d) * h * bend };
}

/** The claw's hand and its moving finger. */
export function drawClaw(c: CanvasRenderingContext2D, parts: LobsterParts, which: 0 | 1, pose: ClawPose, boil: number): void {
  const a = parts.claws[which]!;
  withFrame(c, pose.wrist, pose.angle, () => {
    withFrame(c, a.shape.hinge, a.shape.shut - pose.open, () => drawPart(c, a.finger, boil));
    drawPart(c, a.hand, boil);
    // The hinge's pin.
    c.fillStyle = PAL.lit;
    c.beginPath();
    c.arc(a.shape.hinge.x - 2, a.shape.hinge.y + 4, 6.5, 0, Math.PI * 2);
    c.fill();
    ink(c, Array.from({ length: 13 }, (_, i) => ({ x: a.shape.hinge.x - 2 + 6.5 * Math.cos((i * Math.PI) / 6), y: a.shape.hinge.y + 4 + 6.5 * Math.sin((i * Math.PI) / 6) })), 2, boil);
  });
}

/** The jointed arm from its shoulder to the wrist. */
function drawArm(c: CanvasRenderingContext2D, shoulder: Pt, pose: ClawPose, boil: number, tone: number, k: number): void {
  const elbow = elbowOf(shoulder, pose.wrist, pose.bend);
  const seg = (a: Pt, b: Pt, n: number): Pt[] => Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / (n - 1), y: a.y + ((b.y - a.y) * i) / (n - 1) }));
  tube(c, seg(shoulder, elbow, 8), [11 * k, 15 * k, 20 * k, 21 * k, 17 * k], boil, { tone, specks: 26 });
  const hand = { x: pose.wrist.x + 8 * Math.cos(pose.angle), y: pose.wrist.y + 8 * Math.sin(pose.angle) };
  // The pale joint under the elbow, then the wrist's knuckle.
  c.fillStyle = PAL.pale;
  c.beginPath();
  c.arc(elbow.x, elbow.y, 14 * k, 0, Math.PI * 2);
  c.fill();
  tube(c, seg(elbow, hand, 8), [13 * k, 22 * k, 26 * k, 24 * k, 15 * k], boil, { tone, specks: 26 });
}

function drawLeg(c: CanvasRenderingContext2D, i: number, far: boolean, pose: LobsterPose, boil: number): void {
  const b0 = LEG_BASES[i]!;
  const base = far ? { x: b0.x + 12, y: b0.y - 10 } : b0;
  const swing = Math.sin(pose.phase + i * 1.5 + (far ? 2.4 : 0));
  const lift = Math.max(0, Math.cos(pose.phase + i * 1.5 + (far ? 2.4 : 0)));
  const tuck = pose.tuck[i] ?? 0;
  const mix = (a: number, b: number): number => a + (b - a) * tuck;
  const knee = { x: base.x + mix(26 + 9 * swing, 44), y: base.y + mix(26 - 6 * lift, 8) };
  const ankle = { x: base.x + mix(24 + 20 * swing, 92), y: base.y + mix(64 - 14 * lift, 10) };
  const foot = { x: base.x + mix(8 + 32 * swing - i * 3, 124), y: base.y + mix(106 - 20 * lift, 2) };
  const tone = far ? 0.42 : 0;
  const line = (a: Pt, b: Pt): Pt[] => [a, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, b];
  tube(c, line(base, knee), [8.5, 9, 7.5], boil, { tone, inkWidth: 2.2 });
  tube(c, line(knee, ankle), [7.6, 7, 5.4], boil, { tone, inkWidth: 2.2 });
  tube(c, line(ankle, foot), [5.2, 4, 1.2], boil, { tone, inkWidth: 2, color: PAL.warm });
  c.save();
  c.globalAlpha *= far ? 0.5 : 0.95;
  c.fillStyle = PAL.pale;
  for (const j of [knee, ankle]) {
    c.beginPath();
    c.arc(j.x, j.y, 4.4, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function drawSwimmeret(c: CanvasRenderingContext2D, i: number, pose: LobsterPose, boil: number): void {
  const swing = 0.35 + 0.35 * Math.sin(pose.phase * 1 - i * 0.9);
  withFrame(c, { x: 18, y: ringBottom(i) + 2 }, swing, () => {
    for (const [a, l] of [[0.35, 27], [-0.1, 31]] as const) {
      const o = curve([{ x: -5, y: 0 }, { x: -9 - 8 * a, y: l * 0.5 }, { x: -6 - 14 * a, y: l }, { x: 3 - 10 * a, y: l * 0.95 }, { x: 6, y: l * 0.4 }, { x: 5, y: 0 }], true, 5);
      trace(c, o, true);
      c.fillStyle = a > 0 ? PAL.warm : PAL.lit;
      c.fill();
      ink(c, o, 2, boil, true);
      ink(c, [{ x: 0, y: 4 }, { x: -2 - 10 * a, y: l * 0.8 }], 1.2, boil, false, PAL.ink, 0.5);
    }
  });
}

function drawFan(c: CanvasRenderingContext2D, parts: LobsterParts, pose: LobsterPose, boil: number): void {
  const sp = 0.1 + 0.9 * pose.spread;
  c.scale(1, Math.min(1, 0.6 + 0.56 * pose.spread));
  // The outer plates under the inner ones, the middle plate on top; seen a little from above, so the upper side is the fuller.
  for (const [a, y, s] of [[0.78, -13, 0.94], [-0.7, 14, 0.92], [0.4, -8, 1], [-0.36, 9, 0.98]] as const) {
    withFrame(c, { x: 2, y }, a * sp, () => {
      c.scale(s, s);
      drawPart(c, parts.uropod, boil);
    });
  }
  drawPart(c, parts.telson, boil);
}

function drawEye(c: CanvasRenderingContext2D, at: Pt, pose: LobsterPose, boil: number, far: boolean): void {
  const a = -0.62 - 1.45 * pose.eyeTurn;
  const len = 25 + 9 * pose.wide;
  const r = (far ? 14 : 16.5) * (1 + 0.16 * pose.wide);
  const ball = { x: at.x + len * Math.cos(a), y: at.y + len * Math.sin(a) };
  const half = { x: (at.x + ball.x) / 2, y: (at.y + ball.y) / 2 };
  tube(c, [at, half, ball], [10, 8.5, 10.5], boil, { inkWidth: 2.6, tone: far ? 0.25 : 0 });
  // A pale collar, then a black, wet, round eye with a catchlight and a soft lower glow.
  c.fillStyle = PAL.lit;
  c.beginPath();
  c.arc(ball.x, ball.y, r + 3, 0, Math.PI * 2);
  c.fill();
  ink(c, Array.from({ length: 25 }, (_, i) => ({ x: ball.x + (r + 3) * Math.cos((i / 24) * Math.PI * 2), y: ball.y + (r + 3) * Math.sin((i / 24) * Math.PI * 2) })), 2.2, boil);
  const g = c.createRadialGradient(ball.x + r * 0.2, ball.y + r * 0.45, r * 0.1, ball.x, ball.y, r);
  g.addColorStop(0, '#5a2f2a');
  g.addColorStop(0.5, '#1c0d10');
  g.addColorStop(1, '#070406');
  c.fillStyle = g;
  c.beginPath();
  c.arc(ball.x, ball.y, r, 0, Math.PI * 2);
  c.fill();
  // The glint slides towards what it looks at.
  const gx = 0.34 - 0.62 * pose.eyeTurn;
  c.fillStyle = '#fffdf4';
  c.beginPath();
  c.arc(ball.x + r * gx, ball.y - r * 0.36, r * 0.29, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 0.75;
  c.beginPath();
  c.arc(ball.x - r * gx * 0.7, ball.y + r * 0.38, r * 0.13, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;
}

/** A long whip, banded, from its thick jointed base. */
export function drawWhip(c: CanvasRenderingContext2D, path: readonly Pt[], boil: number, tone: number, k = 1): void {
  tube(c, path, [5.6 * k, 4.6 * k, 3.6 * k, 2.6 * k, 1.3 * k], boil, { inkWidth: 1.6, tone, color: PAL.warm });
  c.save();
  c.globalAlpha *= 0.6;
  c.strokeStyle = PAL.deep;
  c.lineWidth = 1.5;
  for (let i = 2; i < path.length - 2; i += 2) {
    const a = path[i]!;
    const b = path[i + 1]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const w = 4.6 * k * (1 - (0.75 * i) / path.length);
    c.beginPath();
    c.moveTo(a.x - ((b.y - a.y) / d) * w, a.y + ((b.x - a.x) / d) * w);
    c.lineTo(a.x + ((b.y - a.y) / d) * w, a.y - ((b.x - a.x) / d) * w);
    c.stroke();
  }
  c.restore();
}

function drawAntennaBase(c: CanvasRenderingContext2D, at: Pt, boil: number, tone: number): void {
  tube(c, [at, { x: at.x + 11, y: at.y + 2 }, { x: at.x + 22, y: at.y + 3 }], [13, 13.5, 11], boil, { tone, inkWidth: 2.4 });
  tube(c, [{ x: at.x + 20, y: at.y + 3 }, { x: at.x + 30, y: at.y + 3 }, { x: at.x + 40, y: at.y + 2 }], [10, 10, 7], boil, { tone, inkWidth: 2.4 });
}

/** The short forked antennules and the shut, folded mouthparts. */
function drawAntennules(c: CanvasRenderingContext2D, pose: LobsterPose, boil: number, tone: number): void {
  const w = 6 * Math.sin(pose.phase * 2);
  for (const [dx, dy] of [[70, -38], [78, -16]] as const) {
    const root = { x: 172, y: -16 };
    const path = cubic(root, { x: root.x + 24, y: root.y - 4 }, { x: root.x + dx * 0.7, y: root.y + dy * 0.5 }, { x: root.x + dx, y: root.y + dy + w }, 12);
    tube(c, path, [4.6, 3.4, 2.2, 1], boil, { tone, inkWidth: 1.6, color: PAL.lit });
  }
}

function drawMouthparts(c: CanvasRenderingContext2D, boil: number): void {
  for (const [x, y] of [[146, 36], [154, 30]] as const) {
    tube(c, [{ x, y }, { x: x + 18, y: y + 8 }, { x: x + 31, y: y + 3 }], [8, 8, 6], boil, { inkWidth: 2.2 });
    tube(c, [{ x: x + 30, y: y + 4 }, { x: x + 32, y: y + 14 }, { x: x + 24, y: y + 22 }], [6, 5, 2.5], boil, { inkWidth: 2, color: PAL.lit });
  }
}

/** The lobster, back to front. */
export function paintLobster(c: CanvasRenderingContext2D, parts: LobsterParts, pose: LobsterPose, boil: number): void {
  const inBody = (draw: () => void): void => withFrame(c, pose.joint, pose.heading, draw);
  const [cutter, crusher] = pose.claws;
  inBody(() => [3, 2, 1, 0].forEach((i) => drawLeg(c, i, true, pose, boil)));
  drawWhip(c, pose.antennae[0], boil, 0.22);
  drawArm(c, bodyPoint(pose, SHOULDER_FAR), cutter, boil, 0.2, 0.92);
  drawClaw(c, parts, 0, cutter, boil);
  inBody(() => {
    drawAntennaBase(c, { x: ANTENNA.x + 4, y: ANTENNA.y - 14 }, boil, 0.25);
    drawEye(c, EYE_FAR, pose, boil, true);
  });
  const chain = tailChain(pose);
  chain.joints.forEach((j, i) => withFrame(c, j, chain.angles[i]!, () => drawSwimmeret(c, i, pose, boil)));
  withFrame(c, chain.joints[0]!, chain.fan, () => drawFan(c, parts, pose, boil));
  chain.joints.forEach((j, i) => withFrame(c, j, chain.angles[i]!, () => drawPart(c, parts.rings[i]!, boil)));
  inBody(() => {
    drawAntennules(c, pose, boil, 0);
    drawMouthparts(c, boil);
    drawPart(c, parts.carapace, boil);
    [3, 2, 1, 0].forEach((i) => drawLeg(c, i, false, pose, boil));
  });
  drawWhip(c, pose.antennae[1], boil, 0);
  inBody(() => {
    drawAntennaBase(c, ANTENNA, boil, 0);
    drawEye(c, EYE_NEAR, pose, boil, false);
  });
  drawArm(c, bodyPoint(pose, SHOULDER_NEAR), crusher, boil, 0, 1);
  drawClaw(c, parts, 1, crusher, boil);
}
