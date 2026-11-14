import { INKTANKS_PAID_LEVELS } from '../../content/paid';
import { CH1_LEVELS } from '../content/ch1/levels';
import { ALL_KINDS } from '../content/kinds';
import { loadLevel, type LoadedLevel } from '../logic/level/load';

/**
 * Every level the lab and the sim can run: chapter 1 and the paid levels
 * (content/paid.ts, server-only data the sim reads directly). Paid levels
 * are loaded lazily, so a broken one only fails the lab run that asks for it.
 */
let paid: readonly LoadedLevel[] | null = null;

export function paidLevels(): readonly LoadedLevel[] {
  paid ??= INKTANKS_PAID_LEVELS.map((d) => loadLevel(d, ALL_KINDS));
  return paid;
}

export function labLevel(n: number): LoadedLevel {
  const l = CH1_LEVELS.find((x) => x.def.number === n) ?? (n > 10 ? paidLevels().find((x) => x.def.number === n) : undefined);
  if (!l) throw new Error(`no level ${n} (chapter 1: 1–10; paid levels built: ${INKTANKS_PAID_LEVELS.map((d) => d.number).join(', ') || 'none'})`);
  return l;
}

/** A chapter's levels (1-based chapter), for --all and --chapter. */
export function chapterLevels(chapter: number): readonly LoadedLevel[] {
  return chapter === 1 ? CH1_LEVELS : paidLevels().filter((l) => Math.ceil(l.def.number / 10) === chapter);
}
