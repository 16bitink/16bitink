/**
 * Day milestones: total days played across every game's dailies (never a
 * consecutive streak). Each of 3, 7, 14, 30, 50 and 100 days gives Skip a new
 * raft and a new stone trail (art keys raft-<n>, trail-<n>). Kept forever
 * once reached; nothing here can be lost.
 */
export type LookSlot = 'raft' | 'trail';

export interface Look {
  readonly key: string;
  readonly slot: LookSlot;
  readonly name: string;
  /** Total days played that unlock it (0: from the start). */
  readonly days: number;
}

export const MILESTONE_DAYS = [3, 7, 14, 30, 50, 100] as const;

export const DEFAULT_RAFT: Look = { key: '', slot: 'raft', name: 'Driftwood raft', days: 0 };
export const DEFAULT_TRAIL: Look = { key: '', slot: 'trail', name: 'No trail', days: 0 };

const RAFT_NAMES = ['Striped raft', 'Patched-sail raft', 'Pennant raft', 'Blue banner raft', 'Red-sail longboat', 'Rainbow-sail raft'] as const;
const TRAIL_NAMES = ['Bubble trail', 'Sparkle trail', 'Leaf trail', 'Sea-spray trail', 'Golden trail', 'Rainbow trail'] as const;

export const MILESTONE_LOOKS: readonly Look[] = MILESTONE_DAYS.flatMap((days, i) => [
  { key: `raft-${days}`, slot: 'raft' as const, name: RAFT_NAMES[i]!, days },
  { key: `trail-${days}`, slot: 'trail' as const, name: TRAIL_NAMES[i]!, days },
]);

export const ALL_LOOKS: readonly Look[] = [DEFAULT_RAFT, ...MILESTONE_LOOKS.filter((l) => l.slot === 'raft'), DEFAULT_TRAIL, ...MILESTONE_LOOKS.filter((l) => l.slot === 'trail')];

/** The next milestone to look forward to (its raft), or null when every one is reached. */
export const nextMilestone = (totalDays: number): Look | null => MILESTONE_LOOKS.find((l) => l.slot === 'raft' && l.days > totalDays) ?? null;

/** The raft reached by exactly this total (the end card's "new look!"). */
export const lookReachedAt = (totalDays: number): Look | null => MILESTONE_LOOKS.find((l) => l.slot === 'raft' && l.days === totalDays) ?? null;

/** The picked key if it's earned (a save from another device may name one), else the default. */
export const wornLook = (key: string, totalDays: number): string =>
  key !== '' && MILESTONE_LOOKS.some((l) => l.key === key && l.days <= totalDays) ? key : '';
