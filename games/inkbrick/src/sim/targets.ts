/** The design's targets ("Bots, lab and measurements"), per level kind. */
import { MAX_BALLS, MAX_BRICKS } from './constants';
import type { LevelDef } from './types';

export type MetricKey =
  | 'aimWindow' | 'breakInNovice' | 'breakInSkilled' | 'cascade' | 'drought' | 'clearSkilled'
  | 'noviceClear' | 'hunt' | 'luckCV' | 'bricks' | 'peakBalls' | 'bossHits';

export interface Target {
  readonly key: MetricKey;
  readonly label: string;
  readonly lo: number;
  readonly hi: number;
  readonly unit: '%' | 's' | '' ;
}

const BASE: readonly Target[] = [
  { key: 'aimWindow', label: 'aim window', lo: 0.02, hi: 0.08, unit: '%' },
  { key: 'breakInNovice', label: 'break-in novice', lo: 20, hi: 60, unit: 's' },
  { key: 'breakInSkilled', label: 'break-in skilled', lo: 8, hi: 25, unit: 's' },
  { key: 'cascade', label: 'cascade 8s', lo: 0.35, hi: 1, unit: '%' },
  { key: 'drought', label: 'drought', lo: 0, hi: 10, unit: 's' },
  { key: 'clearSkilled', label: 'clear skilled', lo: 60, hi: 120, unit: 's' },
  { key: 'noviceClear', label: 'novice clears', lo: 0.55, hi: 0.85, unit: '%' },
  { key: 'hunt', label: 'last-brick hunt', lo: 0, hi: 15, unit: 's' },
  { key: 'luckCV', label: 'luck (CV)', lo: 0, hi: 0.5, unit: '' },
  { key: 'bricks', label: 'bricks', lo: 0, hi: MAX_BRICKS, unit: '' },
  { key: 'peakBalls', label: 'peak balls', lo: 0, hi: MAX_BALLS, unit: '' },
];

/** Hits on Brumm a boss level asks for: fewer is over before it starts, more is a grind. */
export const BOSS_HITS: readonly [number, number] = [15, 40];
const BOSS_DROUGHT = 12;

/**
 * Boss levels (10, 20, ...): won on hits, so no cascade and no last-brick hunt; instead the hits
 * needed, novice clears 45-75%, skilled clear 60-120 s, drought (no break, no hit on Brumm,
 * no stone by the hole) at most 12 s.
 */
export function bossTargets(): Target[] {
  return [
    ...BASE.filter((t) => t.key !== 'cascade' && t.key !== 'hunt').map((t) => {
      if (t.key === 'noviceClear') return { ...t, lo: 0.45, hi: 0.75 };
      if (t.key === 'drought') return { ...t, hi: BOSS_DROUGHT };
      return t;
    }),
    { key: 'bossHits', label: 'boss hits needed', lo: BOSS_HITS[0], hi: BOSS_HITS[1], unit: '' },
  ];
}

export type Overrides = Partial<Record<MetricKey, readonly [number, number]>>;

function withOverrides(overrides: Overrides): Target[] {
  return BASE.map((t) => {
    const o = overrides[t.key];
    return o ? { ...t, lo: o[0], hi: o[1] } : t;
  });
}

/**
 * Novice clears for chapter 1's levels 4-9: the free chapter is every new player's first look,
 * so beginners should clear it most of the time (the designer's call, 2026-11-18).
 */
export const CH1_NOVICE_CLEAR: readonly [number, number] = [0.7, 0.95];

/**
 * Targets for a campaign level: levels 1-3 easier for the novice, the rest of chapter 1 a little
 * easier than paid levels, boss levels harder.
 */
export function levelTargets(level: LevelDef): Target[] {
  const local = ((level.number - 1) % 10) + 1;
  if (level.boss) return bossTargets();
  const o: Overrides = {};
  if (level.chapter === 1 && local <= 3) o.noviceClear = [0.9, 1];
  else if (level.chapter === 1) o.noviceClear = CH1_NOVICE_CLEAR;
  return withOverrides(o);
}

/**
 * The novice clear rate each weekday aims at (0 = Sunday): Monday ~85%, down to ~58% on Saturday.
 * Sunday's spectacle (hundreds of stones) is for everyone: novices clear it 76-100%.
 */
export const DAILY_NOVICE_AIM: readonly number[] = [0.88, 0.85, 0.78, 0.72, 0.68, 0.64, 0.58];
const NOVICE_BAND = 0.12;

/** Targets for a daily by local weekday (0 = Sunday): Monday is a warm-up, Saturday the hard one. */
export function dailyTargets(weekday: number): Target[] {
  const aimNovice = DAILY_NOVICE_AIM[weekday] ?? DAILY_NOVICE_AIM[3]!;
  const novice: readonly [number, number] = [aimNovice - NOVICE_BAND, Math.min(1, aimNovice + NOVICE_BAND)];
  const byDay: Readonly<Record<number, Overrides>> = {
    // The spectacle: hundreds of stones clear fast, so Sunday may run a little shorter.
    0: { aimWindow: [0.04, 0.08], clearSkilled: [30, 120] },
    1: { aimWindow: [0.06, 0.12], clearSkilled: [45, 100], breakInNovice: [8, 45], breakInSkilled: [3, 20] },
    2: { aimWindow: [0.05, 0.08] },
    3: { aimWindow: [0.04, 0.07] },
    4: { aimWindow: [0.03, 0.06] },
    5: { aimWindow: [0.025, 0.05] },
    6: { aimWindow: [0.015, 0.035], breakInNovice: [25, 75] },
  };
  return withOverrides({ ...(byDay[weekday] ?? {}), noviceClear: novice });
}
