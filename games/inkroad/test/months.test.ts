import { describe, expect, it } from 'vitest';
import { PAID_CITIES } from '../content/paid';
import { beginner } from '../src/city/bots/beginner';
import { createCity } from '../src/city/city';
import { MONTH_SECONDS, PAYDAYS } from '../src/city/clock';
import { SAFFRON } from '../src/city/defs/saffron';
import { sumLedgers } from '../src/city/money';
import { SAVE_VERSION } from '../src/city/save';
import { STEP } from '../src/sim/constants';
import type { CityDef, CityView, Ledger } from '../src/sim/types';
import { cityAtYear, inner, newCity, ok, runDay } from './city-helpers';

/** Twelve paydays a year, three a drawn day (docs/inkroad-design.md "A minute of play"). */
type Row = readonly [string, number, number, number, number, number, readonly number[]];

/**
 * Each review's money, the season's takings, approval and bars: a beginner who acts only at the reviews, from year 1 of
 * Saffron Bay and in year 2 of two paid cities, played twice from the same seed: with three paydays a season, and with
 * one at its night (`oncePaid`, the books before months). Nothing it does starts inside a day, so the two must agree.
 */
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
    const both = (make: () => CityView, years: number): void => {
      const monthly = reviews(make(), years);
      const once = make();
      inner(once).oncePaid = true;
      expect(monthly.length).toBeGreaterThan(0);
      expect(reviews(once, years)).toEqual(monthly);
    };
    both(() => createCity(SAFFRON, 7), 4);
    for (const id of ['harbour', 'rivers']) both(() => rich(PAID_CITIES.find((d) => d.id === id)!, 3, 2), 1);
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

  it('works last a fixed month of clock from their start, across a payday', () => {
    const v = cityAtYear(3);
    const c = inner(v);
    v.advance(70);
    const r = c.net.roads.find((x) => x.type === 'street' && v.quote({ t: 'upgrade', road: x.id, type: 'avenue' }).ok)!;
    // April is under way: a month from now is in May, after April's payday (at the workday's midnight).
    expect(v.quote({ t: 'upgrade', road: r.id, type: 'avenue' })).toMatchObject({ works: 1, opens: 2 });
    const begun = c.clock;
    ok(v, { t: 'upgrade', road: r.id, type: 'avenue' });
    const works = (): number => c.net.roads.find((x) => x.id === r.id)!.works;
    expect(works()).toBe(1);
    while (c.clock < begun + MONTH_SECONDS - 2) v.advance(1);
    expect(c.clock).toBeGreaterThan(PAYDAYS[1]);
    expect(works()).toBe(1);
    v.advance(3);
    expect(works()).toBe(0);
    expect(v.month).toBe(2);
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
