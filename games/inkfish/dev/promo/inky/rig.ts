import { curlArm, type Pt } from '../octopus/geom';
import { type Arm, drawArm, drawHub, drawOctoBody, drawOctoEyes, drawWeb, meltInto, type Octo } from './octo';
import type { Light } from './paint';

/** A whole octopus from a few numbers: where its crown is, which way the body leans, and its arms. */

export interface RigArm {
  /** Heading, screen radians. */
  readonly a: number;
  /** Length, in body sizes. */
  readonly len: number;
  /** How far it turns by its tip, radians. */
  readonly curl: number;
  /** In front of the body. */
  readonly near: boolean;
  readonly ripple?: number;
  readonly phase?: number;
  /** Where the suckers face, root and tip (radians round the arm). */
  readonly band?: readonly [number, number];
  readonly w?: number;
  /** An explicit path instead. */
  readonly path?: readonly Pt[];
}

export interface Rig {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  /** The body's direction from the crown to the mantle tip, radians (screen; -π/2 is straight up). */
  readonly up: number;
  /** How far the mantle bends away from that by its tip, radians. */
  readonly bend: number;
  /** Body length, in sizes. */
  readonly length?: number;
  readonly turn: number;
  readonly gaze: Pt;
  readonly lid: number;
  readonly profile?: (s: number) => number;
  readonly breathe?: number;
  /** Where along the body the eyes sit, when squeezed out of place. */
  readonly eyeS?: number;
  readonly arms: readonly RigArm[];
  readonly seed: number;
  /** Web depth between neighbouring front arms. */
  readonly web?: number;
}

export function rigOcto(r: Rig): Octo {
  const len = (r.length ?? 3.8) * r.size;
  const n = 16;
  const axis: Pt[] = [];
  let p = { x: r.x - Math.cos(r.up) * r.size * 0.45, y: r.y - Math.sin(r.up) * r.size * 0.45 };
  for (let i = 0; i <= n; i++) {
    axis.push(p);
    const a = r.up + r.bend * (i / n);
    p = { x: p.x + (Math.cos(a) * len) / n, y: p.y + (Math.sin(a) * len) / n };
  }
  return { axis, size: r.size, turn: r.turn, gaze: r.gaze, lid: r.lid, profile: r.profile, breathe: r.breathe, eyeS: r.eyeS, detail: r.size > 120 ? 1.1 : 0.8 };
}

export function rigArms(r: Rig): { arm: Arm; near: boolean }[] {
  return r.arms.map((q, i) => {
    const root = { x: r.x + Math.cos(q.a) * r.size * 0.42, y: r.y + Math.sin(q.a) * r.size * 0.3 };
    const path = q.path ?? curlArm(root, q.a, q.len * r.size, q.curl, q.ripple ?? 0.25, q.phase ?? i, 40);
    // Suckers on the side the arm curls towards.
    const side = q.curl >= 0 ? -1 : 1;
    const [b0, b1] = q.band ?? [1.45 * side, 0.25 * side];
    return { near: q.near, arm: { path, w: r.size * 0.3 * (q.w ?? 1), band: (s: number) => b0 + (b1 - b0) * Math.min(1, Math.max(0, (s - 0.35) / 0.4)), seed: r.seed + 20 + i, n: r.size > 120 ? 100 : 70 } };
  });
}

export function drawRig(ctx: CanvasRenderingContext2D, r: Rig, light: Light, boil: number): void {
  const o = rigOcto(r);
  const arms = rigArms(r);
  for (const a of arms.filter((q) => !q.near)) drawArm(ctx, a.arm, light, boil, 0);
  const hub = (c: CanvasRenderingContext2D): void => drawHub(c, r.x - Math.cos(r.up) * r.size * 0.2, r.y - Math.sin(r.up) * r.size * 0.2, r.size * 0.56, r.size * 0.5, light);
  hub(ctx);
  drawOctoBody(ctx, o, light, boil);
  const front = arms.filter((q) => q.near).map((q) => q.arm);
  const face = { x: r.x + Math.cos(r.up) * r.size * 0.34, y: r.y + Math.sin(r.up) * r.size * 0.34, rx: r.size * 1.0, ry: r.size * 0.92, core: 0.5 };
  meltInto(ctx, face, (l) => {
    hub(l);
    for (let i = 0; i + 1 < front.length; i++) drawWeb(l, front[i]!.path, front[i + 1]!.path, r.web ?? 0.3, light, boil, r.seed + 60 + i);
    for (const a of front) drawArm(l, a, light, boil);
  });
  drawOctoEyes(ctx, o, light, boil);
}

/** Seven arms draped from a sitting body, stirring with phase `p`. */
export function sittingArms(p: number, spread = 1): RigArm[] {
  const w = (i: number): number => 0.09 * Math.sin(p + i * 1.7);
  return [
    { a: Math.PI * 1.02 + w(0), len: 3.2 * spread, curl: -2.6, near: false },
    { a: Math.PI * -0.02 + w(1), len: 3.2 * spread, curl: 2.6, near: false },
    { a: Math.PI * 0.9 + w(2), len: 3.5 * spread, curl: -3.1, near: true },
    { a: Math.PI * 0.71 + w(3), len: 3.5 * spread, curl: -2.5, near: true },
    { a: Math.PI * 0.53 + w(4), len: 2.7 * spread, curl: -3.4, near: true },
    { a: Math.PI * 0.33 + w(5), len: 3.4 * spread, curl: 2.6, near: true },
    { a: Math.PI * 0.12 + w(6), len: 3.5 * spread, curl: 3.1, near: true },
  ];
}

/** The first `u` share of a path (a growing arm). */
export function grown(path: readonly Pt[], u: number): Pt[] {
  return path.slice(0, Math.max(3, Math.round(path.length * Math.min(1, u))));
}
