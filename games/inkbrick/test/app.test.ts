import { describe, expect, it } from 'vitest';
import { addDays, countdown, monthGrid, msToMidnight, tomorrowTeaser, weekdayOf } from '../src/app/dates';
import { lookReachedAt, nextMilestone, wornLook } from '../src/app/milestones';
import { mergeSave, newSave, parseSave, recordClear, serializeSave } from '../src/app/save';
import { checkLevel, checkLevels } from '../src/level/validate';
import { boardLayout } from '../src/render/layout';

// The Game agent's pure app logic: saves, dates, milestones, level checks, the board layout.

describe('save', () => {
  it('round-trips and rejects garbage', () => {
    const s = recordClear(newSave(), 3, [true, false, true], 70);
    expect(parseSave(serializeSave(s)).save).toEqual(s);
    expect(parseSave('nope').problem).not.toBeNull();
    expect(parseSave(JSON.stringify({ v: 99 })).problem).not.toBeNull();
  });

  it('only gains shells and lowers best times', () => {
    const a = recordClear(newSave(), 1, [true, true, false], 90);
    const b = recordClear(a, 1, [true, false, true], 120);
    expect(b.shells['1']).toEqual([true, true, true]);
    expect(b.best['1']).toBe(90);
    expect(recordClear(newSave(), 2, [false, false, false], 10).best['2']).toBeUndefined();
  });

  it('merges two devices without losing progress', () => {
    const mine = recordClear({ ...newSave(), raft: 'raft-3' }, 1, [true, false, false], 80);
    const theirs = recordClear(recordClear(newSave(), 1, [true, true, false], 95), 2, [true, false, false], 60);
    const m = mergeSave(mine, theirs);
    expect(m.shells['1']).toEqual([true, true, false]);
    expect(m.shells['2']).toEqual([true, false, false]);
    expect(m.best['1']).toBe(80);
    expect(m.raft).toBe('raft-3');
  });
});

describe('dates', () => {
  it('steps days across months and names weekdays', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(weekdayOf('2026-11-22')).toBe('Sunday');
    expect(tomorrowTeaser('2026-11-20')).toBe('Tomorrow, Saturday: the hard one');
  });

  it('counts down to local midnight', () => {
    expect(msToMidnight(new Date(2026, 10, 17, 23, 0, 0))).toBe(3_600_000);
    expect(countdown(3_661_000)).toBe('1:01:01');
  });

  it('lays a month out Monday first', () => {
    const g = monthGrid(2026, 10);
    expect(g[0]!.slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(g.flat().filter(Boolean)).toHaveLength(30);
  });
});

describe('milestones', () => {
  it('only goes forward and never takes a look away', () => {
    expect(nextMilestone(0)?.days).toBe(3);
    expect(nextMilestone(100)).toBeNull();
    expect(lookReachedAt(7)?.key).toBe('raft-7');
    expect(wornLook('raft-14', 13)).toBe('');
    expect(wornLook('raft-14', 14)).toBe('raft-14');
  });
});

describe('level checks', () => {
  const ok = { id: 'a', name: 'A', number: 1, chapter: 1, par: 90, bricks: [{ x: 0, y: 3, w: 3, h: 1, kind: 'soft' }] };
  it('accepts a level and rejects broken ones', () => {
    expect(checkLevel(ok).ok).toBe(true);
    expect(checkLevel({ ...ok, bricks: [{ x: 35, y: 3, w: 3, h: 1, kind: 'soft' }] }).ok).toBe(false);
    expect(checkLevel({ ...ok, bricks: [{ x: 0, y: 3, w: 3, h: 1, kind: 'fish' }] }).ok).toBe(false);
    expect(checkLevel({ ...ok, boss: { hits: 'x' } }).ok).toBe(false);
    expect(checkLevels([ok, null]).ok).toBe(false);
    expect(checkLevels('no').ok).toBe(false);
  });
});

describe('board layout', () => {
  it('puts the HUD beside the board in landscape, above it on phones', () => {
    const wide = boardLayout(1920, 1080);
    expect(wide.mode).toBe('side');
    expect(wide.h).toBe(1080);
    expect(wide.x).toBeCloseTo((1920 - 607.5) / 2);
    const phone = boardLayout(390, 844);
    expect(phone.mode).toBe('top');
    expect(phone.w).toBeCloseTo(390);
    expect(phone.y).toBeGreaterThanOrEqual(64);
  });
});
