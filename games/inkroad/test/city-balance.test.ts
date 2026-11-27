import { describe, expect, it } from 'vitest';
import { PAID_CITIES } from '../content/paid';
import { reportDay, stretch } from '../src/city/approval';
import { FREE_CITIES } from '../src/city/cities';
import { createCity } from '../src/city/city';
import { planDay } from '../src/city/demand';
import { answerPrices } from '../src/city/payers';
import { purseLimit, takeBack, warnPurse } from '../src/city/purse';
import type { City } from '../src/city/state';
import { TRIPS_STRETCH } from '../src/city/tune';
import { laneShare } from '../src/city/transit';
import { cityAtYear, inner, newCity, ok, runDay } from './city-helpers';

const plan = (c: City) => planDay(c, [], 0);

describe('the same people every day', () => {
  it('a day is the same trips as the day before, but for the few', () => {
    const c = inner(cityAtYear(4));
    const key = (c2: City): readonly string[] => plan(c2).map((t) => `${JSON.stringify(t.from)}${JSON.stringify(t.to)}${t.purpose}${t.leave.toFixed(3)}`);
    const a = new Set(key(c));
    c.season = 2;
    const b = key(c);
    expect(b.filter((k) => a.has(k)).length / b.length).toBeGreaterThan(0.6);
  });
});

describe('what prices do', () => {
  function paid(peak: number, off: number): { readonly tours: number; readonly peak: number; readonly shared: number } {
    const v = cityAtYear(6);
    const c = inner(v);
    for (const r of v.roads) if (!r.kerb) v.apply({ t: 'kerb', road: r.id, on: true });
    c.prices = { ...c.prices, park: off, parkPeak: peak };
    const out = answerPrices(c, plan(c));
    return { tours: out.length, peak: out.filter((t) => t.leave >= 10 && t.leave < 42).length, shared: c.day.shared.length };
  }

  it('payers share cars, and more of them where it is dearer', () => {
    const cheap = paid(1, 1);
    const dear = paid(4, 4);
    expect(dear.tours).toBeLessThan(cheap.tours);
    expect(dear.shared).toBeGreaterThan(cheap.shared);
    expect(paid(0, 0).shared).toBe(0);
  });

  it('a dear peak sends people out of it', () => {
    const flat = paid(2, 2);
    const peaked = paid(4, 1);
    expect(peaked.peak / peaked.tours).toBeLessThan(flat.peak / flat.tours);
  });

  it('a toll counts by the gates on the way', () => {
    const v = cityAtYear(7);
    const c = inner(v);
    // The main street by the west gate, which every driver from Dune Road takes.
    const busy = v.roads.find((r) => !r.fixed && r.cells.some((x) => x.gx === 7 && x.gy === 18))!;
    ok(v, { t: 'toll', road: busy.id, on: true });
    answerPrices(c, plan(c));
    expect(c.day.shared.length).toBeGreaterThan(0);
  });

  it('the sign itself annoys: greedy prices cost more than they charge', () => {
    const v = newCity();
    ok(v, { t: 'next' });
    const c = inner(v);
    const calm = reportDay(c).cost;
    c.parks = [{ id: 1, kind: 'lot', gx: 1, gy: 1, w: 3, h: 2, spaces: 1, used: 0, access: null, occupancy: 0 }];
    c.prices = { ...c.prices, park: 8, parkPeak: 8 };
    expect(reportDay(c).cost).toBeLessThan(calm - 20);
  });
});

describe('the purse', () => {
  it('unspent money goes home at the year end, after a warning', () => {
    const v = cityAtYear(3, 100);
    const c = inner(v);
    runDay(v);
    const limit = purseLimit(c);
    c.money = limit;
    takeBack(c);
    expect(c.money).toBe(limit);
    c.money = limit + 500;
    c.season = 1;
    v.drainEvents();
    warnPurse(c);
    expect(v.drainEvents().some((e) => e.t === 'toast' && e.who === 'pim')).toBe(true);
    takeBack(c);
    expect(c.money).toBeLessThan(limit + 500);
    expect(c.money).toBeGreaterThan(limit);
  });
});

describe('the bars', () => {
  it('the stretch is straight in the middle and soft at the bottom', () => {
    expect(stretch(100, TRIPS_STRETCH)).toBe(100);
    expect(stretch(70, TRIPS_STRETCH) - stretch(65, TRIPS_STRETCH)).toBeCloseTo(5 * TRIPS_STRETCH.by);
    expect(stretch(20, TRIPS_STRETCH)).toBeGreaterThan(0);
    expect(stretch(20, TRIPS_STRETCH)).toBeLessThan(stretch(30, TRIPS_STRETCH));
  });

  it('a block with nowhere to park is heard of all over town', () => {
    const v = cityAtYear(4);
    runDay(v);
    const c = inner(v);
    const before = reportDay(c).parking;
    const market = c.lots.find((l) => l.kind === 'market')!;
    c.day.stats.lots.get(market.id)!.parking.sum = 0;
    c.day.stats.lots.get(market.id)!.parking.w = 20;
    expect(reportDay(c).parking).toBeLessThan(before);
  });
});

describe('red lanes', () => {
  it('a line knows how much of its way is red', () => {
    const v = cityAtYear(6);
    const road = v.roads.find((r) => r.type === 'avenue' && r.cells.length > 6)!;
    const a = road.cells[1]!;
    const b = road.cells[road.cells.length - 2]!;
    ok(v, { t: 'line', mode: 'bus', stops: [a, b] });
    expect(laneShare(inner(v), v.lines[0]!)).toBe(0);
    ok(v, { t: 'busLane', road: road.id, on: true });
    expect(laneShare(inner(v), v.lines[0]!)).toBeGreaterThan(0.8);
  });
});

describe("the Council's roads", () => {
  it('every one of them opens, and every gate can be reached', () => {
    for (const def of [...FREE_CITIES, ...PAID_CITIES].filter((d) => ['saffron', 'harbour', 'isles'].includes(d.id))) {
      const v = createCity(def, 1);
      const c = inner(v);
      while (v.year < def.years.length) {
        const due = def.roads.filter((r) => r.opensYear === v.year + 1).length;
        const roads = v.roads.length;
        c.phase = 'yearEnd';
        ok(v, { t: 'next' });
        expect(v.roads.length, `${def.id} year ${v.year}`).toBeGreaterThanOrEqual(roads + due);
        const home = c.lots.find((l) => l.level > 0 && l.access)!.access!;
        for (const g of def.gates.filter((x) => (x.opensYear ?? 1) <= v.year)) {
          const node = v.junctions.find((j) => j.gate === g.id);
          expect(node && c.traffic.estimate({ gate: node.id }, home, 1).reachable, `${def.id} year ${v.year}: ${g.id}`).toBe(true);
        }
      }
    }
  });
});
