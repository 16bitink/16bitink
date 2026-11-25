import { describe, expect, it } from 'vitest';
import {
  FINISHED, savedYears, citySave, mergeSave, newSave, parseSave, recordAuto, recordYearEnd, recordYearStart, serializeSave, started, totalPlates,
} from '../src/app/save';

const snap = (n: number): unknown => ({ n });

describe('save parse', () => {
  it('gives a fresh save for nothing, junk or another version', () => {
    expect(parseSave(null).problem).toBeNull();
    expect(parseSave('{nope').problem).toMatch(/JSON/);
    expect(parseSave('{"v":99}').problem).toMatch(/version/);
    expect(parseSave('[1,2]').problem).toMatch(/version/);
    expect(parseSave('7').save.cities).toEqual({});
  });
  it('round-trips a real save', () => {
    let s = recordYearStart(newSave(), 1, 1, snap(1));
    s = recordYearEnd(s, 1, 1, 2);
    s = recordYearStart(s, 1, 2, snap(2));
    const back = parseSave(serializeSave(s)).save;
    expect(back).toEqual(s);
    expect(started(back)).toBe(true);
  });
  it('clamps and drops bad fields without throwing', () => {
    const raw = JSON.stringify({
      v: 1, sound: 'x', last: { city: 99, year: -4 },
      cities: {
        '1': { reached: 4.9, plates: [9, -2, 'a', 3, null], years: { '1': { a: 1 }, '7': { a: 1 }, '2': 'str', x: {} }, auto: { year: 3, season: 12, snap: { s: 1 } } },
        '9': { reached: 3 }, '2': 'bad', 'z': {},
      },
    });
    const { save, problem } = parseSave(raw);
    expect(problem).toBeNull();
    expect(save.sound).toBe(true);
    expect(save.last).toEqual({ city: 5, year: 1 });
    expect(Object.keys(save.cities)).toEqual(['1']);
    const c = citySave(save, 1);
    expect(c.reached).toBe(4);
    expect(c.plates.slice(0, 5)).toEqual([3, 0, 0, 3, 0]);
    expect(c.plates).toHaveLength(10);
    expect(Object.keys(c.years)).toEqual(['1']);
    expect(c.auto).toEqual({ year: 3, season: 3, snap: { s: 1 } });
  });
  it('drops a snapshot that is not an object', () => {
    const s = recordAuto(newSave(), 1, 1, 0, 'big string');
    expect(s.cities).toEqual({});
  });
});

describe('save records', () => {
  it('keeps best plates and moves on', () => {
    let s = recordYearStart(newSave(), 1, 1, snap(1));
    s = recordYearEnd(s, 1, 1, 3);
    s = recordYearEnd(s, 1, 1, 1);
    expect(citySave(s, 1).plates[0]).toBe(3);
    expect(citySave(s, 1).reached).toBe(2);
    s = recordYearEnd(s, 1, 10, 2);
    expect(citySave(s, 1).reached).toBe(FINISHED);
    expect(totalPlates(citySave(s, 1))).toBe(5);
  });
  it('autosave is cleared by a new year', () => {
    let s = recordAuto(recordYearStart(newSave(), 1, 1, snap(1)), 1, 1, 2, snap(9));
    expect(citySave(s, 1).auto?.season).toBe(2);
    s = recordYearStart(s, 1, 2, snap(2));
    expect(citySave(s, 1).auto).toBeNull();
  });
});

describe('save merge', () => {
  it('takes the further progress and the best plates', () => {
    let a = recordYearStart(newSave(), 1, 1, snap(1));
    a = recordYearEnd(a, 1, 1, 1);
    let b = recordYearStart(newSave(), 1, 1, snap(1));
    b = recordYearEnd(b, 1, 1, 3);
    b = recordYearStart(b, 1, 2, snap(2));
    b = recordYearEnd(b, 1, 2, 2);
    const m = mergeSave(a, b);
    const c = citySave(m, 1);
    expect(c.reached).toBe(3);
    expect(c.plates.slice(0, 3)).toEqual([3, 2, 0]);
    expect(Object.keys(c.years).sort()).toEqual(['1', '2']);
    expect(mergeSave(b, a)).toEqual(expect.objectContaining({ cities: expect.any(Object) }));
    expect(citySave(mergeSave(b, a), 1).plates).toEqual(c.plates);
  });
  it('keeps the later autosave and cities only one side has', () => {
    const a = recordAuto(recordYearStart(newSave(), 1, 2, snap(2)), 1, 2, 1, snap(21));
    let b = recordAuto(recordYearStart(newSave(), 1, 2, snap(2)), 1, 2, 3, snap(23));
    b = recordYearStart(b, 2, 1, snap(1));
    const m = mergeSave(a, b);
    expect(citySave(m, 1).auto?.season).toBe(3);
    expect(Object.keys(m.cities).sort()).toEqual(['1', '2']);
  });
  it('keeps my sound and Continue', () => {
    const a = { ...newSave(), sound: false };
    const b = recordYearStart(newSave(), 1, 1, snap(1));
    const m = mergeSave(a, b);
    expect(m.sound).toBe(false);
    expect(m.last).toEqual({ city: 1, year: 1 });
  });
});

describe('saved years', () => {
  it('lists every year reached', () => {
    let s = recordYearStart(newSave(), 1, 1, snap(1));
    expect(savedYears(citySave(s, 1))).toEqual([1]);
    s = recordYearEnd(s, 1, 1, 1);
    expect(savedYears(citySave(s, 1))).toEqual([1, 2]);
  });
});
