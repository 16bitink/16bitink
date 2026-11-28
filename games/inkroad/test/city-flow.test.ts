import { describe, expect, it } from 'vitest';
import { DAY, WEEKEND } from '../src/sim/constants';
import { createCity } from '../src/city/city';
import { LEGACY_SAFFRON_LAYOUT, saffronCell } from '../src/city/defs/saffronMap';
import { setControl, setRoad } from '../src/sim/network';
import { SAFFRON } from '../src/city/defs/saffron';
import { cityAtYear, inner, newCity, ok, runDay, runYear, SEED } from './city-helpers';

/** A whole year of traffic, twice: longer than the suite's 30 s under load. */
const YEAR_RUN = 60_000;

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
  }, YEAR_RUN);
});

describe('saves', () => {
  it('moves a saved Palm Row away from its avenue and roundabouts while retaining the built roads', () => {
    const old = createCity({ ...SAFFRON, ...LEGACY_SAFFRON_LAYOUT }, SEED);
    const c = inner(old);
    while (c.year < 3) { c.phase = 'yearEnd'; ok(old, { t: 'next' }); }
    c.money = 987;
    const nodes = [18, 24].map((gy) => c.net.junctions.find((j) => j.cell.gx === 22 && j.cell.gy === gy)!);
    const avenue = c.net.roads.find((r) => r.cells.some((p) => p.gx === 22 && p.gy === 20))!;
    c.net = setRoad(c.net, avenue.id, { type: 'avenue' });
    for (const node of nodes) c.net = setControl(c.net, node.id, 'roundabout');
    const palm = c.lots.find((l) => l.name === 'Palm Row')!;
    c.lots = c.lots.map((l) => l.id === palm.id ? { ...l, level: 3 } : l);

    const restored = createCity(SAFFRON, SEED, JSON.parse(JSON.stringify(old.save())));
    expect(restored.money).toBe(987);
    expect(restored.year).toBe(3);
    expect(restored.def.map).toBe(SAFFRON.map);
    expect(restored.roads.map((r) => r.id)).toEqual(expect.arrayContaining(old.roads.map((r) => r.id)));
    expect(restored.roads.find((r) => r.id === avenue.id)?.type).toBe('avenue');
    for (const node of nodes) expect(restored.junctions.find((j) => j.id === node.id)).toMatchObject({ control: 'roundabout' });
    const homes = restored.lots.filter((l) => l.name.startsWith('Palm Row'));
    expect(homes).toHaveLength(2);
    const [x, south] = saffronCell(22, 24);
    for (const home of homes) {
      expect(home).toMatchObject({ level: 3, w: 2, h: 4 });
      expect(home.access).not.toBeNull();
      expect(south - (home.gy + home.h)).toBeGreaterThanOrEqual(3);
      expect(x - (home.gx + home.w)).toBeGreaterThanOrEqual(3);
    }
    expect(homes[0]!.access).not.toEqual(homes[1]!.access);
    const migrated = JSON.stringify(restored.save());
    expect(JSON.stringify(createCity(SAFFRON, SEED, JSON.parse(migrated)).save())).toBe(migrated);
  });

  it('restores a year-start snapshot exactly and replays its saved dawn deterministically', () => {
    const a = newCity();
    ok(a, { t: 'next' });
    runDay(a);
    runYear(a);
    const json = JSON.stringify(a.save());
    const b = createCity(SAFFRON, 99, JSON.parse(json));
    expect(JSON.stringify(b.save())).toBe(json);
    const same = createCity(SAFFRON, SEED, JSON.parse(json));
    runYear(b);
    runYear(same);
    expect(JSON.stringify(b.save())).toBe(JSON.stringify(same.save()));
  }, YEAR_RUN);

  it('a save in a day starts the day again with what was built, and gives back what drivers paid (its paydays stay paid)', () => {
    const v = cityAtYear(2);
    const [gx, gy] = saffronCell(22, 18);
    const node = v.junctions.find((j) => j.cell.gx === gx && j.cell.gy === gy)!.id;
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
