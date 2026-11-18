import { describe, it } from 'vitest';
import { INKSNAKE_PAID_CHAPTERS } from '../content/paid';
import { CHAPTER_1 } from '../src/level/chapter1';
import type { DailyRule } from '../src/level/daily';
import type { LevelDef } from '../src/level/types';
import { goldenKind } from '../src/logic/daily/golden';
import { playLevel } from './bot';

/**
 * Not a check: measures how the bot plays each engine rule on every
 * place's first level (MEASURE=1 pnpm vitest run test/dailyMeasure.test.ts),
 * for docs/inksnake-daily.md's engine notes.
 */
const RULES: readonly (DailyRule | 'golden' | 'none')[] = ['none', 'lure', 'looseKnots', 'goldRush', 'ice', 'blizzard', 'fog', 'hotDay', 'rival', 'golden'];
const FIRSTS: readonly LevelDef[] = [CHAPTER_1[0]!, ...INKSNAKE_PAID_CHAPTERS.map((c) => c[0]!)];

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

describe.skipIf(!env.MEASURE)('bot per rule', () => {
  it('measures', () => {
    const rows: string[] = [];
    for (const base of FIRSTS) {
      const place = base.id.split('-')[0]!;
      const cells = RULES.map((rule) => {
        const level: LevelDef = rule === 'none' ? base
          : rule === 'golden' ? { ...base, id: 'daily-2026-12-20', place: base.place ?? (place as LevelDef['place']), goal: { kind: 'golden', count: 3 } }
          : { ...base, id: 'daily-2026-12-20', rule };
        const runs = [0, 1, 2].map((seed) => playLevel(level, 300, seed));
        const wins = runs.filter((r) => r.won);
        const t = wins.length ? Math.round(wins.reduce((a, r) => a + r.time, 0) / wins.length) : 0;
        return `${wins.length}/3 ${t}s`;
      });
      rows.push(`| ${place} (${goldenKind(base)}) | ${cells.join(' | ')} |`);
    }
    console.info(`| place (golden kind) | ${RULES.join(' | ')} |\n${rows.join('\n')}`);
  }, 600_000);
});
