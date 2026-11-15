import { describe, expect, it } from 'vitest';
import { FINAL_LEVEL, warRecord, wonTheWar } from '../src/logic/ending';
import { applyOutcome } from '../src/logic/mission/outcome';
import { newProgress, type Progress } from '../src/logic/workshop';
import type { Medals } from '../src/logic/mission/outcome';

const allLevels = (m: Medals): Record<number, Medals> => Object.fromEntries(Array.from({ length: 50 }, (_, i) => [i + 1, m]));

describe('the ending', () => {
  it('the war is won by passing level 50, not before', () => {
    expect(FINAL_LEVEL).toBe(50);
    expect(wonTheWar({})).toBe(false);
    expect(wonTheWar({ 49: [true, true, true] })).toBe(false);
    expect(wonTheWar({ 50: [true, false, false] })).toBe(true);
  });

  it('counts the war: missions, medals per chapter, blueprints, families and what is left to win', () => {
    const p: Progress = { ...newProgress(), xp: 12600, medals: { ...allLevels([true, true, false]), 1: [true, true, true] }, intelTotal: { cannon: 300, medium: 200 } };
    const r = warRecord(p);
    expect(r.missions).toBe(50);
    expect(r.medals).toBe(101);
    expect(r.medalsOf).toBe(150);
    expect(r.medalsLeft).toBe(49);
    expect(r.chapters.map((c) => c.medals)).toEqual([21, 20, 20, 20, 20]);
    expect(r.chapters[4]).toMatchObject({ name: 'Deepwood', of: 30 });
    expect(r.blueprints).toBe(500);
    expect(r.families).toBe(p.unlocked.length);
    expect(r.rank.id).toBe('general');
  });

  it('a perfect war leaves nothing to win', () => {
    expect(warRecord({ ...newProgress(), medals: allLevels([true, true, true]) }).medalsLeft).toBe(0);
  });

  it('winning level 50 makes you a General even a little short of the XP', () => {
    const def = { number: 50, bonus: [{ kind: 'kills', n: 99 }, { kind: 'kills', n: 99 }] } as never;
    const report = { passedMain: true, kills: 0, intel: {}, gadgetIntel: {}, picks: [] } as never;
    const p = applyOutcome({ ...newProgress(), xp: 12000 }, def, report).progress;
    expect(warRecord(p).rank.id).toBe('general');
    // Already past it: XP is never lowered.
    expect(applyOutcome({ ...newProgress(), xp: 20000 }, def, report).progress.xp).toBeGreaterThan(20000);
  });

  it('a loss on level 50 does not win the war', () => {
    const def = { number: 50, bonus: [{ kind: 'kills', n: 1 }, { kind: 'kills', n: 2 }] } as never;
    const report = { passedMain: false, kills: 0, intel: {}, gadgetIntel: {}, picks: [] } as never;
    expect(wonTheWar(applyOutcome(newProgress(), def, report).progress.medals)).toBe(false);
  });
});
