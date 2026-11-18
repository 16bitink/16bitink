import type { LevelDef } from '../sim/types';
import { CH1_LEVELS } from './ch1/index';
import { checkLevels } from './validate';

/**
 * The campaign: 5 chapters of 10 levels, numbers run on (chapter 2 starts at
 * Level 11). Chapter 1 is bundled; 11-50 come from the server for owners
 * (host.loadContent), validated before they are installed.
 */
export interface Chapter {
  readonly index: number;
  readonly name: string;
  readonly first: number;
  readonly last: number;
  /** What the chapter brings, for the map's card. */
  readonly blurb: string;
  /** Art key of the chapter's surround (painted around the board). */
  readonly surround: string;
}

export const LEVELS_PER_CHAPTER = 10;
export const FREE_LEVELS = 10;
export const TOTAL_LEVELS = 50;

export const CHAPTERS: readonly Chapter[] = [
  { index: 0, name: 'Kelp Cove', first: 1, last: 10, blurb: 'Sandcastles, driftwood, powder kegs and x3 shells.', surround: 'bg-1-wide' },
  { index: 1, name: 'Ice Floe', first: 11, last: 20, blurb: 'Ice that shatters in waves and sliding floes.', surround: 'bg-2-wide' },
  { index: 2, name: 'The Harbour', first: 21, last: 30, blurb: 'Keys, gates and shutters on the docks.', surround: 'bg-3-wide' },
  { index: 3, name: 'Sea Cave', first: 31, last: 40, blurb: 'Whirlpools, spinners and the dark.', surround: 'bg-4-wide' },
  { index: 4, name: "Brumm's Fort", first: 41, last: 50, blurb: 'Everything at once, and Brumm himself.', surround: 'bg-5-wide' },
];

export const chapterOf = (n: number): Chapter =>
  CHAPTERS[Math.min(CHAPTERS.length - 1, Math.max(0, Math.floor((n - 1) / LEVELS_PER_CHAPTER)))]!;

const byNumber = new Map<number, LevelDef>(CH1_LEVELS.map((l) => [l.number, l]));

export const levelFor = (n: number): LevelDef | null => byNumber.get(n) ?? null;
export const hasLevel = (n: number): boolean => byNumber.has(n);

/** Installs the server's paid levels. Throws with the problem when the payload isn't a level list. */
export function installPaidLevels(payload: unknown): number {
  const c = checkLevels(payload);
  if (!c.ok) throw new Error(`paid levels rejected: ${c.problem}`);
  let added = 0;
  for (const l of c.value) {
    if (l.number > FREE_LEVELS && l.number <= TOTAL_LEVELS) {
      byNumber.set(l.number, l);
      added++;
    }
  }
  return added;
}

export type Gate = 'play' | 'locked' | 'paywall' | 'coming';

export interface GateContext {
  /** Levels cleared (any shell). */
  readonly cleared: (n: number) => boolean;
  readonly owned: boolean;
  readonly allOpen: boolean;
}

/** Whether level n can be played now, and if not, why. */
export function gate(n: number, ctx: GateContext): Gate {
  if (n > FREE_LEVELS && !ctx.owned) return 'paywall';
  if (!hasLevel(n)) return 'coming';
  if (n === 1 || ctx.allOpen || ctx.cleared(n - 1)) return 'play';
  return 'locked';
}
