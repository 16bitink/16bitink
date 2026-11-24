/** The design's targets ("Bots, lab and measurements"), per level kind. */
import { MAX_BALLS, MAX_BRICKS } from './constants';
import type { LevelDef } from './types';

export type MetricKey =
  | 'aimWindow' | 'breakInNovice' | 'breakInSkilled' | 'cascade' | 'drought' | 'clearSkilled'
  | 'noviceClear' | 'hunt' | 'luckCV' | 'bricks' | 'peakBalls' | 'bossHits'
  | 'beginnerClear' | 'beginnerTime' | 'shareSkilled' | 'floods' | 'pearlFound';

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

/**
 * The goal's version of the targets (docs/inkbrick-design.md "Variety"):
 * - rescue: the clear time is the time to the rescue, skilled 30-90 s (the board needn't be
 *   cleared: the break-in and the dig to the friend are the level); no last-brick hunt.
 * - pearls: the time to the last pearl, skilled 40-100 s; no hunt.
 * - stones (Few Stones): no clock, so no clear time, hunt or luck; novice clears = novice runs
 *   that reach `need`; the skilled bot's median share broken at least halfway from need to all.
 * - tide: as clear, plus floods (the decent bot's median) at most 1.
 */
export const RESCUE_TIME: readonly [number, number] = [30, 90];
export const PEARLS_TIME: readonly [number, number] = [40, 100];
export const TIDE_FLOODS: readonly [number, number] = [0, 1];

export function goalTargets(targets: readonly Target[], level: LevelDef): Target[] {
  const goal = level.goal ?? 'clear';
  if (goal === 'clear' || level.boss) return [...targets];
  const drop = (keys: readonly MetricKey[]) => targets.filter((t) => !keys.includes(t.key));
  if (goal === 'rescue' || goal === 'pearls') {
    const [lo, hi] = goal === 'rescue' ? RESCUE_TIME : PEARLS_TIME;
    const label = goal === 'rescue' ? 'rescue skilled' : 'last pearl skilled';
    return drop(['hunt']).map((t) => (t.key === 'clearSkilled' ? { ...t, label, lo, hi } : t));
  }
  if (goal === 'stones') {
    const need = level.need ?? 0;
    return [
      ...drop(['clearSkilled', 'hunt', 'luckCV']).map((t) => (t.key === 'noviceClear' ? { ...t, label: 'novice reaches need' } : t)),
      { key: 'shareSkilled', label: 'share skilled', lo: (need + 1) / 2, hi: 1, unit: '%' },
    ];
  }
  return [...targets, { key: 'floods', label: 'floods (decent)', lo: TIDE_FLOODS[0], hi: TIDE_FLOODS[1], unit: '' }];
}

function withOverrides(overrides: Overrides): Target[] {
  return BASE.map((t) => {
    const o = overrides[t.key];
    return o ? { ...t, lo: o[0], hi: o[1] } : t;
  });
}

/**
 * Chapter 1 (free: every new player's first look). The owner's call, 2026-11-24: no narrow
 * entrances (no gap in or beside stone under CH1_MIN_GAP cells; test/chapter1.test.ts), no
 * unbreakable bricks on Level 1, and nothing that takes five minutes to chew through. So the way in
 * is wide, the break-in comes early, and the level is judged on a beginner too.
 */
export const CH1_MIN_GAP = 8;
const CH1_BASE: Overrides = { aimWindow: [0.08, 1], breakInNovice: [0, 30], breakInSkilled: [0, 15], cascade: [0.15, 1], clearSkilled: [15, 90] };
/** The share of novices and beginners who clear it, and the beginner's median clear in seconds. */
interface Ease { readonly novice: number; readonly beginner: number; readonly seconds: number }
/** Levels 1-3, 4-9 and Brumm. */
const CH1_EASE: readonly [Ease, Ease, Ease] = [
  { novice: 0.95, beginner: 0.9, seconds: 120 }, { novice: 0.9, beginner: 0.8, seconds: 150 }, { novice: 0.8, beginner: 0.6, seconds: 180 },
];

function ch1Targets(level: LevelDef): Target[] {
  const ease = CH1_EASE[level.boss ? 2 : level.number <= 3 ? 0 : 1];
  const o: Overrides = { ...CH1_BASE, noviceClear: [ease.novice, 1] };
  const base = (level.boss ? bossTargets() : goalTargets(BASE, level)).map((t) => {
    const r = o[t.key];
    return r ? { ...t, lo: r[0], hi: r[1] } : t;
  });
  return [
    ...base,
    { key: 'beginnerClear', label: 'beginner clears', lo: ease.beginner, hi: 1, unit: '%' },
    { key: 'beginnerTime', label: 'beginner clear', lo: 0, hi: ease.seconds, unit: 's' },
  ];
}

/** Targets for a campaign level: chapter 1 for beginners (ch1Targets), boss levels harder. */
export function levelTargets(level: LevelDef): Target[] {
  if (level.chapter === 1) return ch1Targets(level);
  if (level.boss) return bossTargets();
  return goalTargets(BASE, level);
}

/**
 * The novice clear rate each weekday aims at (0 = Sunday): Monday ~85%, down to ~58% on Saturday.
 * Sunday's spectacle (hundreds of stones) is for everyone: novices clear it 76-100%.
 */
export const DAILY_NOVICE_AIM: readonly number[] = [0.88, 0.85, 0.78, 0.72, 0.68, 0.64, 0.58];
const NOVICE_BAND = 0.12;

/** Targets for a daily by local weekday (0 = Sunday): Monday is a warm-up, Saturday the hard one; `level` adds its goal's version. */
export function dailyTargets(weekday: number, level?: LevelDef): Target[] {
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
  const base = withOverrides({ ...(byDay[weekday] ?? {}), noviceClear: novice });
  return level ? goalTargets(base, level) : base;
}
