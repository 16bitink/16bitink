import { describe, expect, it } from 'vitest';
import { PAID_CITIES } from '../content/paid';
import { beginner } from '../src/city/bots/beginner';
import { createCity } from '../src/city/city';
import { PAYDAYS } from '../src/city/clock';
import { SAFFRON } from '../src/city/defs/saffron';
import { sumLedgers } from '../src/city/money';
import { SAVE_VERSION } from '../src/city/save';
import { STEP } from '../src/sim/constants';
import type { CityDef, CityView, Ledger } from '../src/sim/types';
import { cityAtYear, inner, newCity, ok, runDay } from './city-helpers';

/** Twelve paydays a year, three a drawn day (docs/inkroad-design.md "A minute of play"). */
type Row = readonly [string, number, number, number, number, number, readonly number[]];

/**
 * Each review's money, the season's takings, approval and bars, measured with one payday a season (before months):
 * a beginner who acts only at the reviews, from year 1 of Saffron Bay and in year 2 of two paid cities. Nothing it
 * does starts inside a day, so a season paid in three months must end exactly where it did.
 */
const ONCE_A_SEASON: readonly Row[] = [
  ['saffron', 1, 0, 263, 45, 54.944, [43.664, 66.942, 77, 82.379]], ['saffron', 1, 1, 286, 45, 51.481, [40.313, 75.257, 76.25, 80.509]],
  ['saffron', 1, 2, 242, 45, 49.958, [40.292, 76.711, 76.063, 80.261]], ['saffron', 1, 3, 234, 45, 59.254, [64.138, 70.61, 76.016, 82.073]],
  ['saffron', 2, 0, 238, 45, 57.244, [50.239, 64.38, 76.004, 81.917]], ['saffron', 2, 1, 198, 47, 59.178, [56.131, 71.083, 75.63, 83.355]],
  ['saffron', 2, 2, 212, 48, 56.225, [47.12, 71.681, 75.309, 83.456]], ['saffron', 2, 3, 238, 50, 55.693, [49.006, 71.47, 75.083, 83.715]],
  ['saffron', 3, 0, 250, 54, 51.614, [38.143, 65.111, 75.039, 82.185]], ['saffron', 3, 1, 161, 64, 52.647, [48.552, 61.57, 74.202, 75.964]],
  ['saffron', 3, 2, 149, 55, 58.826, [62.951, 61.33, 74.59, 77.431]], ['saffron', 3, 3, 176, 62, 62.16, [63.846, 62.555, 74.014, 78.476]],
  ['saffron', 4, 0, 256, 80, 56.6, [47.156, 58.406, 73.869, 74.755]], ['saffron', 4, 1, 283, 81, 56.371, [52.335, 60.161, 74.01, 74.41]],
  ['saffron', 4, 2, 323, 83, 54.052, [47.104, 60.974, 73.684, 74.241]], ['saffron', 4, 3, 304, 78, 52.84, [46.802, 64.037, 73.623, 70.295]],
  ['harbour', 2, 0, 5033, 60, 52.165, [38.641, 60.816, 77, 73.336]], ['harbour', 2, 1, 4928, 70, 50.141, [41.936, 63.446, 75.246, 74.677]],
  ['harbour', 2, 2, 4960, 71, 51.575, [46.973, 70.605, 74.856, 72.604]], ['harbour', 2, 3, 5003, 72, 49.729, [40.933, 71.245, 74.605, 74.168]],
  ['rivers', 2, 0, 5021, 90, 50.467, [35.096, 61.816, 77, 67.907]], ['rivers', 2, 1, 5011, 90, 43.153, [28.926, 54.39, 76.25, 66.672]],
  ['rivers', 2, 2, 4978, 94, 40.193, [29.163, 60.113, 75.616, 67.012]], ['rivers', 2, 3, 5003, 95, 39.694, [30.644, 63.735, 75.48, 68.322]],
];

const takings = (books: readonly Ledger[]): number => Object.values(sumLedgers(books).income).reduce((a, b) => a + b, 0);

/** A year at its card, rich, without playing the years before. */
function rich(def: CityDef, seed: number, year: number): CityView {
  const v = createCity(def, seed);
  const c = inner(v);
  c.money = 5000;
  while (v.year < year) { c.phase = 'yearEnd'; v.apply({ t: 'next' }); }
  return v;
}

function reviews(v: CityView, years: number): Row[] {
  const rows: Row[] = [];
  const last = v.year + years - 1;
  while (v.year <= last && v.phase !== 'replaced' && v.phase !== 'cityDone') {
    if (v.phase === 'day') {
      runDay(v);
      const bars = Object.values(v.bars).map((b) => Math.round(b * 1000) / 1000);
      rows.push([v.def.id, v.year, v.season, v.money, takings(v.books), Math.round(v.approval * 1000) / 1000, bars]);
      continue;
    }
    if (v.phase === 'review') beginner.act(v, 'review', 0);
    v.apply({ t: 'next' });
  }
  return rows;
}

describe('months', () => {
  it('a year makes twelve paydays, at the three points of each drawn day', () => {
    const v = newCity();
    const c = inner(v);
    ok(v, { t: 'next' });
    const paid: [number, number][] = [];
    let books = c.books;
    while (v.year === 1 && v.phase !== 'yearEnd') {
      if (v.phase !== 'day') { v.apply({ t: 'next' }); continue; }
      v.advance(STEP);
      if (c.books !== books) { paid.push([v.season, Math.round(c.clock)]); books = c.books; }
    }
    expect(paid).toHaveLength(12);
    expect(paid).toEqual([0, 1, 2, 3].flatMap((s) => PAYDAYS.map((at): [number, number] => [s, at])));
    expect(v.month).toBe(11);
  }, 60_000);

  it('a season paid in three months ends where it did with one payday: money, takings, approval, bars', () => {
    const rows = [
      ...reviews(createCity(SAFFRON, 7), 4),
      ...['harbour', 'rivers'].flatMap((id) => reviews(rich(PAID_CITIES.find((d) => d.id === id)!, 3, 2), 1)),
    ];
    expect(rows).toEqual(ONCE_A_SEASON);
  }, 120_000);

  it('approval moves at each payday, a third of the way, and the bills come a third at a time', () => {
    const v = cityAtYear(3);
    const c = inner(v);
    const dawn = v.approval;
    const steps: number[] = [];
    for (const at of PAYDAYS.slice(0, 2)) { while (c.clock < at + 1) v.advance(1); steps.push(v.approval); }
    runDay(v);
    steps.push(v.approval);
    expect(steps.every((a) => a !== dawn)).toBe(true);
    const grant = v.def.years[2]!.grant;
    expect(v.books.every((l) => Math.abs(l.income.budget - grant / 3) < 1)).toBe(true);
    expect(sumLedgers(v.books).income.budget).toBe(grant);
    expect(v.lastBars.approval).toBe(dawn);
  });

  it('works begun inside a month last the rest of it and then the months the quote says', () => {
    const v = cityAtYear(3);
    const c = inner(v);
    v.advance(70);
    const r = c.net.roads.find((x) => x.type === 'street' && v.quote({ t: 'upgrade', road: x.id, type: 'avenue' }).ok)!;
    // April is under way (paydays behind: 1): the rest of April, then May, June and July. Open again in August.
    expect(v.quote({ t: 'upgrade', road: r.id, type: 'avenue' })).toMatchObject({ works: 3, opens: 5 });
    ok(v, { t: 'upgrade', road: r.id, type: 'avenue' });
    const works = (): number => c.net.roads.find((x) => x.id === r.id)!.works;
    expect(works()).toBe(4);
    runDay(v);
    expect(works()).toBe(2);
    v.apply({ t: 'next' });
    while (c.clock < PAYDAYS[1] - 2) v.advance(1);
    expect(works()).toBe(1);
    v.advance(3);
    expect(works()).toBe(0);
    expect(v.month).toBe(5);
  });
});

describe('month saves', () => {
  it('a save at a review round-trips, month and books included', () => {
    const v = cityAtYear(2);
    runDay(v);
    const json = JSON.stringify(v.save());
    const back = createCity(SAFFRON, 7, JSON.parse(json));
    expect([back.phase, back.month, back.books.length]).toEqual(['review', 2, 3]);
    expect(JSON.stringify(back.save())).toBe(json);
  });

  it('a save in a day keeps the paydays it had, and does not pay them twice', () => {
    const v = cityAtYear(2);
    const dawn = v.approval;
    v.advance(90);
    const month0 = v.lastLedger;
    const back = createCity(SAFFRON, 7, JSON.parse(JSON.stringify(v.save())));
    expect([back.phase, back.clock, back.month, back.approval]).toEqual(['day', 0, 1, dawn]);
    runDay(back);
    expect(back.books).toHaveLength(3);
    expect(back.books[0]).toEqual(month0);
    expect(sumLedgers(back.books).income.budget).toBe(back.def.years[1]!.grant);
  });

  it('an old save (one payday a season) loads at the start of its season, with its works in months', () => {
    const v = cityAtYear(3);
    runDay(v);
    ok(v, { t: 'next' });
    const r = inner(v).net.roads.find((x) => x.type === 'street' && v.quote({ t: 'upgrade', road: x.id, type: 'avenue' }).ok)!;
    const now = v.save() as Record<string, unknown> & { net: { roads: { id: number; works: number }[] }; books: Ledger[] };
    const { month: _m, books, ...rest } = now;
    const old = {
      ...rest, v: 1, lastLedger: sumLedgers(books),
      net: { ...now.net, roads: now.net.roads.map((x) => (x.id === r.id ? { ...x, works: 1 } : x)) },
    };
    expect(SAVE_VERSION).toBe(2);
    const back = createCity(SAFFRON, 7, JSON.parse(JSON.stringify(old)));
    expect([back.year, back.phase, back.season, back.month]).toEqual([3, 'day', 1, 3]);
    expect(back.roads.find((x) => x.id === r.id)!.works).toBe(3);
    expect(takings(back.books)).toBeCloseTo(takings(books));
  });
});
