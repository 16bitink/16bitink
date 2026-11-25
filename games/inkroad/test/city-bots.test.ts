import { describe, expect, it } from 'vitest';
import { PAID_CITIES } from '../content/paid';
import { beginner, greedy, nobody } from '../src/city/bots/beginner';
import { beginnerSaves, FAMILY_NAMES, familyRows } from '../src/city/bots/families';
import { lasting } from '../src/city/bots/lasting';
import { FAMILIES, movesTonight } from '../src/city/bots/moves';
import { planner } from '../src/city/bots/planner';
import { play, type YearRow } from '../src/city/bots/play';
import { stepsOf } from '../src/city/bots/playbook';
import { SAFFRON } from '../src/city/defs/saffron';
import { cityAtYear as replayTo } from '../src/city/replay';
import { cityAtYear, runDay } from './city-helpers';

const last = <T>(list: readonly T[]): T => list[list.length - 1]!;
const mean = (list: readonly number[]): number => list.reduce((n, v) => n + v, 0) / list.length;
const SLOW = 90_000;

describe('the lab targets, quickly', () => {
  it('doing nothing is lost in year 4 or 5; a beginner lives longer', () => {
    const idle = play(SAFFRON, 1, nobody);
    expect(last(idle).replaced).toBe(true);
    expect([4, 5]).toContain(last(idle).year);
    expect(idle[0]!.replaced).toBe(false);
    const first = play(SAFFRON, 1, beginner, { to: 4, retries: 2 });
    expect(last(first).year).toBe(4);
    expect(first[0]!.approval).toBeGreaterThan(idle[0]!.approval - 2);
  }, SLOW);

  it('a beginner reaches the end, with retries', () => {
    const rows = play(SAFFRON, 1, beginner, { retries: 6 });
    expect(last(rows)).toMatchObject({ year: 10, replaced: false });
  }, SLOW);

  it('a planner keeps the city happy and its purse light', () => {
    const rows: readonly YearRow[] = play(SAFFRON, 1, planner);
    expect(rows.every((r) => !r.replaced)).toBe(true);
    expect(mean(rows.map((r) => r.plates))).toBeGreaterThanOrEqual(2);
    expect(mean(rows.slice(3).map((r) => r.approval))).toBeGreaterThan(58);
    expect(mean(rows.slice(4).map((r) => r.money / (r.income / 4)))).toBeLessThan(2.5);
  }, SLOW);

  it('prices alone never win', () => {
    const rows = play(SAFFRON, 1, greedy);
    expect(last(rows).replaced).toBe(true);
    expect(last(rows).year).toBeLessThanOrEqual(6);
  }, SLOW);

  it('every year from five on has at least two sorts of answer', () => {
    const saves = beginnerSaves(SAFFRON, 1);
    const rows = FAMILY_NAMES.flatMap((name) => familyRows(SAFFRON, 1, name, saves, 5, 6));
    for (const year of [5, 6]) {
      const of = (bot: string): number => rows.find((r) => r.year === year && r.bot === bot)!.to;
      const gains = FAMILIES.map((f) => of(f) - of('nobody'));
      expect(gains.filter((g) => g >= 3).length).toBeGreaterThanOrEqual(2);
      expect(Math.max(...gains)).toBeGreaterThanOrEqual(5);
    }
  }, SLOW);

  it('nothing lasts: half the good junctions of year 3 are gone by year 7', () => {
    const r = lasting(SAFFRON, 1);
    expect(r.good).toBeGreaterThan(0);
    expect(r.kept / r.good).toBeGreaterThanOrEqual(0.5);
  }, SLOW);

  it('every paid city plays', () => {
    for (const def of PAID_CITIES) {
      const rows = play(def, 2, beginner, { to: 2 });
      expect(rows.map((r) => r.year)).toEqual([1, 2]);
    }
  }, SLOW);

  it('a year without a save can be reached by a bot', () => {
    const city = replayTo(SAFFRON, 3, 3);
    expect([city.year, city.phase]).toEqual([3, 'yearStart']);
  }, SLOW);

  it('there is always something to try', () => {
    const v = cityAtYear(5);
    runDay(v);
    const moves = movesTonight(v, FAMILIES);
    for (const family of FAMILIES) expect(moves.some((m) => m.family === family)).toBe(true);
    for (const family of FAMILIES) for (const m of stepsOf(v, family)) expect(m.cmds.length).toBeGreaterThan(0);
  });
});
