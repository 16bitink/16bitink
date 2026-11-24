/**
 * Chapter 1's rules (owner, 2026-11-24): every new player's first look, so no narrow entrances and
 * no unbreakable bricks at all on Level 1. The measurements are the lab's; these pin the layout.
 */
import { describe, expect, it } from 'vitest';
import { CH1_LEVELS } from '../src/level/ch1/index';
import { checkLevel } from '../src/level/validate';
import { runBot } from '../src/sim/measure';
import { CH1_MIN_GAP, levelTargets } from '../src/sim/targets';
import { insideOf, wallMask, cellIndex } from '../src/sim/grid';
import { COLS, ROWS, type LevelDef } from '../src/sim/types';

/** Every gap (cells) between stone, or stone and the board's edge, along the stone's own rows. */
function stoneGaps(level: LevelDef): { y: number; x: number; w: number }[] {
  const mask = wallMask(level, false);
  const out: { y: number; x: number; w: number }[] = [];
  for (let y = 0; y < ROWS; y++) {
    const row = Array.from({ length: COLS }, (_, x) => mask[cellIndex(x, y)] === 1);
    if (!row.some(Boolean)) continue;
    for (let x = 0, from = 0; x <= COLS; x++) {
      if (x < COLS && !row[x]) continue;
      if (x > from) out.push({ y, x: from, w: x - from });
      from = x + 1;
    }
  }
  return out;
}

const open = (extra: Partial<LevelDef> = {}): LevelDef => ({
  id: 't-zone', name: 'T', number: 0, chapter: 1, par: 60,
  bricks: [{ x: 0, y: 12, w: 3, h: 1, kind: 'soft' }], ...extra,
});

describe('chapter 1 is for beginners', () => {
  it('Level 1 has no unbreakable bricks', () => {
    const kinds = new Set(CH1_LEVELS[0]!.bricks.map((b) => b.kind));
    for (const k of ['stone', 'gate', 'lever'] as const) expect(kinds.has(k)).toBe(false);
  });

  it.each(CH1_LEVELS.map((l) => [l.number, l] as const))('Level %i has no entrance narrower than the chapter allows', (_n, level) => {
    expect(stoneGaps(level).filter((g) => g.w < CH1_MIN_GAP)).toEqual([]);
  });

  it.each(CH1_LEVELS.map((l) => [l.number, l] as const))('Level %i still has its break-in moment', (_n, level) => {
    expect(insideOf(level).some((v) => v === 1)).toBe(true);
  });

  it('every piece shows its own art: only plain bricks are tinted', () => {
    const hidden = CH1_LEVELS.flatMap((l) => l.bricks.filter((b) => b.tint !== undefined && b.kind !== 'soft' && b.kind !== 'tough').map((b) => `${l.id} ${b.kind} ${b.x},${b.y}`));
    expect(hidden).toEqual([]);
  });

  it('is judged on a beginner, not only on the novice', () => {
    const keys = levelTargets(CH1_LEVELS[0]!).map((t) => t.key);
    expect(keys).toEqual(expect.arrayContaining(['beginnerClear', 'beginnerTime']));
    expect(levelTargets({ ...open(), chapter: 2, number: 11 }).map((t) => t.key)).not.toContain('beginnerClear');
  });

  it('the beginner loses more hearts than the novice', () => {
    const level = CH1_LEVELS[2]!;
    const lost = (k: 'beginner' | 'novice') => Array.from({ length: 12 }, (_, i) => runBot(level, k, 500 + i, null, 120)).reduce((n, r) => n + r.heartsLost, 0);
    expect(lost('beginner')).toBeGreaterThan(lost('novice'));
  });
});

describe('a declared break-in zone', () => {
  const zone = [{ x: 0, y: 0, w: 36, h: 4 }];

  it('is the inside, minus walls', () => {
    const level = open({ inside: zone, bricks: [...open().bricks, { x: 5, y: 3, w: 2, h: 1, kind: 'stone' }] });
    const mask = insideOf(level);
    expect(mask[cellIndex(0, 0)]).toBe(1);
    expect(mask[cellIndex(5, 3)]).toBe(0);
    expect(mask[cellIndex(0, 4)]).toBe(0);
  });

  it('a level without one is measured from its walls, as before', () => {
    expect(insideOf(open()).some((v) => v === 1)).toBe(false);
  });

  it('passes the payload check, and a bad one does not', () => {
    expect(checkLevel(open({ inside: zone })).ok).toBe(true);
    for (const bad of [[{ x: 30, y: 0, w: 10, h: 4 }], [{ x: 0, y: 0, w: 0, h: 4 }], 'all', [{ x: 0.5, y: 0, w: 2, h: 2 }]]) {
      expect(checkLevel({ ...open(), inside: bad }).ok).toBe(false);
    }
  });
});
