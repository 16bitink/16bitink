import { LENGTHS } from './tune';
import type { VehicleKind } from './types';

/**
 * The drawn size of every vehicle in plan px (nose along its heading), and the body test. Pure: one place for the
 * pictures, the parking slots (src/sim/slotGeometry.ts, shared by the city and the renderer) and the tests.
 */

/** Vehicle pictures: straight from above, nose right, 8x. Their shape sets each body's width. */
export const VEHICLE_PICTURES = {
  car: { w: 112, h: 58, n: 5 }, taxi: { w: 112, h: 56, n: 0 }, van: { w: 136, h: 67, n: 0 }, truck: { w: 232, h: 114, n: 0 },
  bus: { w: 272, h: 102, n: 0 }, tram: { w: 440, h: 155, n: 0 }, tow: { w: 152, h: 65, n: 0 }, school: { w: 240, h: 94, n: 0 },
  police: { w: 112, h: 57, n: 0 },
} as const;

export interface Size { readonly len: number; readonly wid: number }

/** A lane is 9 px. Drawn a little bigger than the sim's cars (which keep 4 px apart), so they read on a phone. */
export const WIDEST = 9.4;
const BIGGER = { small: 1.14, long: 1.07, from: 20 } as const;

export function sizeOf(kind: VehicleKind): Size {
  const p = VEHICLE_PICTURES[kind];
  const len = LENGTHS[kind] * (LENGTHS[kind] < BIGGER.from ? BIGGER.small : BIGGER.long);
  return { len, wid: Math.min(WIDEST, (len * p.h) / p.w) };
}

/** The kinds the city parks (a minibus is a van). */
export const PARKED_KINDS = ['car', 'taxi', 'van', 'truck'] as const;
export type ParkedKind = (typeof PARKED_KINDS)[number];

const largest = (kinds: readonly VehicleKind[]): Size =>
  kinds.reduce<Size>((m, k) => { const s = sizeOf(k); return { len: Math.max(m.len, s.len), wid: Math.max(m.wid, s.wid) }; }, { len: 0, wid: 0 });

/** One pitch is made for these (a car or a taxi); anything longer covers two neighbouring slots. */
export const PITCH_KINDS: readonly VehicleKind[] = ['car', 'taxi', 'police'];
export const PITCH_BODY: Size = largest(PITCH_KINDS);
/** The biggest that parks: rows deep enough for it, and the worst case of the tests. */
export const BIGGEST: Size = largest(PARKED_KINDS);

/** Vans and lorries (and anything else longer or wider than a car) cover their slot and a neighbour. */
export function spansTwo(kind: VehicleKind): boolean {
  const s = sizeOf(kind);
  return s.len > PITCH_BODY.len + 0.01 || s.wid > PITCH_BODY.wid + 0.01;
}

/** How far a len x wid body turned by `a` reaches along each axis (half the box that holds it): [along x, along y]. */
export function reach(s: Size, a: number): { readonly x: number; readonly y: number } {
  const c = Math.abs(Math.cos(a)), n = Math.abs(Math.sin(a));
  return { x: (s.len * c + s.wid * n) / 2, y: (s.len * n + s.wid * c) / 2 };
}

export interface Body { readonly x: number; readonly y: number; readonly a: number; readonly len: number; readonly wid: number }

const axes = (b: Body): readonly [number, number][] => [[Math.cos(b.a), Math.sin(b.a)], [-Math.sin(b.a), Math.cos(b.a)]];
const radius = (b: Body, ax: number, ay: number): number => {
  const [f, s] = axes(b) as [[number, number], [number, number]];
  return (b.len / 2) * Math.abs(f[0] * ax + f[1] * ay) + (b.wid / 2) * Math.abs(s[0] * ax + s[1] * ay);
};

/** Do two bodies overlap by more than `slack` px? (separating axis test) Pure. */
export function bodiesOverlap(p: Body, q: Body, slack = 0): boolean {
  const dx = q.x - p.x, dy = q.y - p.y;
  // Their circles apart: no overlap (most pairs end here, cheaply).
  const r = (Math.sqrt(p.len * p.len + p.wid * p.wid) + Math.sqrt(q.len * q.len + q.wid * q.wid)) / 2;
  if (dx * dx + dy * dy >= r * r) return false;
  for (const [ax, ay] of [...axes(p), ...axes(q)]) {
    if (Math.abs(dx * ax + dy * ay) >= radius(p, ax, ay) + radius(q, ax, ay) - slack) return false;
  }
  return true;
}

export const bodyAt = (kind: VehicleKind, x: number, y: number, a: number): Body => ({ x, y, a, ...sizeOf(kind) });
