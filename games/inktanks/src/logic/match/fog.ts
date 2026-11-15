import type { FogBankDef, FogDef } from '../level/types';

/**
 * Fog banks (chapter 3, Mirefen; design doc "Chapters 2–5"). A level's
 * `weather: { kind: 'fog', banks }` lays soft circles of swamp mist. A bank
 * is static, or drifts to and fro along (dx, dy) over `period` s. Inside one,
 * a tank is hidden as in smoke or a bush (perception.ts `hidden`, unless an
 * enemy is within SPOT_NEAR), and no one sees through it: a sight line that
 * crosses a bank is cut, both ways. Shots fly through fog. Pure functions of
 * the level time; the view is render/fogView.ts.
 */
export const FOG = { period: 60 } as const;

export interface FogBank {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

export interface FogRule {
  readonly banks: readonly FogBankDef[];
}

export const fogRule = (w: FogDef): FogRule => ({ banks: w.banks });

/** Where a bank is at time t: its centre swings (dx, dy) to either side, a full swing every `period` s. */
export function bankAt(b: FogBankDef, t: number): FogBank {
  if (!b.dx && !b.dy) return b;
  const k = Math.sin((t * Math.PI * 2) / (b.period ?? FOG.period));
  return { x: b.x + (b.dx ?? 0) * k, y: b.y + (b.dy ?? 0) * k, r: b.r };
}

export function banksAt(r: FogRule, t: number): readonly FogBank[] {
  return r.banks.map((b) => bankAt(b, t));
}

/** Inside a fog bank. */
export function inFog(banks: readonly FogBank[], x: number, y: number): boolean {
  for (const b of banks) if ((x - b.x) ** 2 + (y - b.y) ** 2 <= b.r * b.r) return true;
  return false;
}

/** Whether a sight line a→b crosses a fog bank (inside counts: it blocks both ways). */
export function fogBlocks(banks: readonly FogBank[], ax: number, ay: number, bx: number, by: number): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  for (const b of banks) {
    const k = Math.max(0, Math.min(1, ((b.x - ax) * dx + (b.y - ay) * dy) / len2));
    if ((ax + dx * k - b.x) ** 2 + (ay + dy * k - b.y) ** 2 <= b.r * b.r) return true;
  }
  return false;
}
