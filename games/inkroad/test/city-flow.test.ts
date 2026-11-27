import { describe, expect, it } from 'vitest';
import { DAY, WEEKEND } from '../src/sim/constants';
import { createCity } from '../src/city/city';
import { SAFFRON } from '../src/city/defs/saffron';
import { cityAtYear, inner, newCity, ok, runDay, runYear, SEED } from './city-helpers';

describe('the year', () => {
  it('runs card, four days with reviews, year end, next year', () => {
    const v = newCity();
    expect(v.phase).toBe('yearStart');
    v.advance(50);
    expect(v.clock).toBe(0);
    for (let s = 0; s < 4; s++) {
      ok(v, { t: 'next' });
      expect([v.phase, v.season]).toEqual(['day', s]);
      runDay(v);
      expect(v.phase).toBe('review');
    }
    ok(v, { t: 'next' });
    expect(v.phase).toBe('yearEnd');
    expect(v.plates).toHaveLength(1);
    expect(v.techChoices).toHaveLength(3);
    ok(v, { t: 'tech', id: v.techChoices[0]!.id });
    expect(v.techs).toHaveLength(1);
    ok(v, { t: 'next' });
    expect([v.year, v.phase]).toEqual([2, 'yearStart']);
  });

  it('only moves in the day, in fixed steps, and ends at night', () => {
    const v = newCity();
    ok(v, { t: 'next' });
    v.advance(1.05);
    expect(v.clock).toBeCloseTo(1);
    expect(v.apply({ t: 'next' }).ok).toBe(false);
    v.advance(DAY);
    // A season is a workday and then a weekend: night falls after the weekend.
    expect([v.phase, v.dayKind]).toEqual(['day', 'weekend']);
    v.advance(WEEKEND);
    expect(v.phase).toBe('review');
    expect(v.hour).toBeGreaterThan(22);
  });

  it('opens districts, roads, tools and gates by the year', () => {
    const v = cityAtYear(4);
    expect(v.lots.find((l) => l.name === 'Blueprint Offices')!.level).toBeGreaterThan(0);
    expect(v.lots.find((l) => l.name === 'The Great Mall')!.level).toBe(0);
    expect(v.junctions.some((j) => j.gate === 'north' && j.arms.length > 0)).toBe(true);
    expect(v.controls).toContain('signal');
    expect(v.tools).toContain('parking');
    expect(v.tools).not.toContain('bus');
    expect(v.lots.filter((l) => l.level > 0).every((l) => l.access)).toBe(true);
  });

  it('every block of year 10 has a driveway and the last year ends the city', () => {
    const v = cityAtYear(10);
    expect(v.lots.filter((l) => !l.access).map((l) => l.name)).toEqual([]);
    inner(v).phase = 'yearEnd';
    ok(v, { t: 'next' });
    expect(v.phase).toBe('cityDone');
    expect(v.apply({ t: 'next' }).ok).toBe(false);
  });

  it('is deterministic', () => {
    const play = () => { const v = newCity(); runYear(v); return JSON.stringify(v.save()); };
    expect(play()).toBe(play());
  });
});

describe('saves', () => {
  it('a save at a year start restores exactly', () => {
    const a = newCity();
    ok(a, { t: 'next' });
    runDay(a);
    runYear(a);
    const json = JSON.stringify(a.save());
    const b = createCity(SAFFRON, 99, JSON.parse(json));
    expect(JSON.stringify(b.save())).toBe(json);
    runYear(a);
    runYear(b);
    expect(JSON.stringify(b.save())).toBe(JSON.stringify(a.save()));
  });

  it('a save in a day starts the day again with what was built, and gives back what drivers paid (its paydays stay paid)', () => {
    const v = cityAtYear(2);
    const node = v.junctions.find((j) => j.cell.gx === 22 && j.cell.gy === 18)!.id;
    ok(v, { t: 'control', node, control: 'roundabout' });
    const before = v.money;
    v.advance(90);
    const march = v.lastLedger;
    const bills = march.costs.parks + march.costs.transit + march.costs.staff + march.costs.interest;
    const back = createCity(SAFFRON, SEED, JSON.parse(JSON.stringify(v.save())));
    expect(back.phase).toBe('day');
    expect(back.clock).toBe(0);
    expect(back.money).toBe(before + march.income.budget - bills);
    expect(back.junctions.find((j) => j.id === node)!.control).toBe('roundabout');
  });

  it('refuses a broken save and starts anew', () => {
    const v = newCity();
    const good = v.save() as object;
    for (const bad of [42, {}, { ...good, v: 0 }, { ...good, city: 'x' }, { ...good, money: 'lots' }, { ...good, year: 44 }, { ...good, lots: [] }, { ...good, net: { roads: 1 } }]) {
      expect(createCity(SAFFRON, SEED, bad).year).toBe(1);
    }
  });
});
