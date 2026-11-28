import { describe, expect, it } from 'vitest';
import { approvalOf, settleApproval, streetsScore } from '../src/city/approval';
import { emptyDay, emptyStats, lotTally, add, type Leg, type Tour } from '../src/city/day';
import { growLots, moodOf, updateMoods, driftOwnership } from '../src/city/growth';
import { bank, operating, sumLedgers } from '../src/city/money';
import { buildSpots, chooseSpot, priceAt, searchMinutes } from '../src/city/parking';
import { measure, progressOf } from '../src/city/goals';
import { pickMode, type Choice } from '../src/city/modes';
import { curve, scoreParking, scorePay, scoreTrip } from '../src/city/score';
import { settleSeason } from '../src/city/settle';
import { catchChance, daring } from '../src/city/legs';
import { saffronCell } from '../src/city/defs/saffronMap';
import { cityAtYear, inner, newCity, ok, runDay } from './city-helpers';

const tour = (lot: number, to: number): Tour => ({ id: 0, from: { lot }, to: { lot: to }, purpose: 'shop', leave: 0, until: null, stay: 5, owns: true, value: 0.3, seed: 0.5 });
const leg = (lot: number, to: number, free = 10): Leg => ({ tour: tour(lot, to), out: true, mode: 'car', start: 0, free, tag: 0, spot: null, tried: [], paid: 0, lines: [], done: false, target: { lot: to }, heldAt: -1, from: null, to: null, leaving: null, tolls: 0 });

describe('money', () => {
  it('banks whole coins from fractions, and a floated stream keeps a quarter', () => {
    const c = inner(newCity());
    const start = c.money;
    for (let i = 0; i < 10; i++) bank(c, 'parking', 1, { x: 0, y: 0 });
    const normal = c.money - start;
    expect(Number.isInteger(c.money)).toBe(true);
    expect(c.ledger.income.parking).toBe(normal);
    c.floated = ['parking'];
    const before = c.money;
    for (let i = 0; i < 10; i++) bank(c, 'parking', 1, { x: 0, y: 0 });
    expect(c.money - before).toBeLessThanOrEqual(Math.ceil(normal / 4) + 1);
  });

  it('refuses what it can not pay, in plain words, and spends what it can', () => {
    const v = newCity();
    const c = inner(v);
    const cells = [saffronCell(32, 24), saffronCell(36, 24)].map(([gx, gy]) => ({ gx, gy }));
    c.money = 1;
    expect(v.quote({ t: 'road', cells, type: 'street' }).why).toMatch(/Too dear: \d+ of 1/);
    c.money = 400;
    const q = v.quote({ t: 'road', cells, type: 'street' });
    ok(v, { t: 'road', cells, type: 'street' });
    expect(v.money).toBe(400 - q.cost);
    expect(v.ledger.costs.building + v.ledger.costs.land).toBe(q.cost);
  });

  it('pays the bills and the Council budget month by month, a season of them in a day', () => {
    const v = newCity();
    ok(v, { t: 'next' });
    const before = v.money;
    runDay(v);
    const grant = v.def.years[0]!.grant;
    const season = sumLedgers(v.books);
    expect(v.books).toHaveLength(3);
    expect(season.income.budget).toBe(grant);
    expect(v.books.every((l) => Math.abs(l.income.budget - grant / 3) <= 0.5)).toBe(true);
    expect(v.money).toBe(before + grant + operating(season));
  });

  it('debt: the Council lends once, with a letter; the second time is the end', () => {
    const v = cityAtYear(3);
    const c = inner(v);
    c.money = -900;
    runDay(v);
    expect(v.money).toBeGreaterThan(0);
    expect(v.letters).toHaveLength(1);
    ok(v, { t: 'next' });
    c.money = -900;
    runDay(v);
    expect(v.phase).toBe('replaced');
    expect(v.replacedWhy!.text.length).toBeGreaterThan(10);
  });
});

describe('approval', () => {
  it('is pulled down by the worst bar', () => {
    const even = approvalOf({ trips: 60, parking: 60, cost: 60, streets: 60 });
    expect(even).toBeCloseTo(60);
    expect(approvalOf({ trips: 60, parking: 60, cost: 0, streets: 120 })).toBeLessThan(45);
  });

  it('moves towards the day, not all at once', () => {
    const c = inner(newCity());
    c.approval = 50;
    c.opening = { bars: c.bars, approval: 50 };
    settleApproval(c, { ...EMPTY_REPORT, trips: 100, parking: 100, cost: 100, streets: 100 });
    expect(c.approval).toBeGreaterThan(50);
    expect(c.approval).toBeLessThan(90);
    expect(c.lastBars.approval).toBe(50);
  });

  it('three letters and you are replaced, but never in year 1', () => {
    const bad = (year: number) => {
      const v = cityAtYear(year);
      const c = inner(v);
      for (let i = 0; i < 4 && c.phase === 'day'; i++) {
        c.bars = { trips: 0, parking: 0, cost: 0, streets: 0 };
        c.approval = 5;
        c.opening = { bars: c.bars, approval: c.approval };
        c.day.stats = emptyStats();
        settleSeason(c);
        if (v.phase === 'review') v.apply({ t: 'next' });
      }
      return v;
    };
    const v = bad(3);
    expect(v.phase).toBe('replaced');
    expect(v.letters).toHaveLength(3);
    expect(bad(1).letters).toHaveLength(0);
  });

  it('streets score falls with works and double parking', () => {
    const v = cityAtYear(6);
    const c = inner(v);
    const calm = streetsScore(c);
    c.day.stats.doubled = 30;
    c.projects = [{ id: 1, node: 1, fromRoad: 1, toRoad: 2, level: 1, line: [], left: 2 }];
    expect(streetsScore(c)).toBeLessThan(calm - 10);
  });
});

const EMPTY_REPORT = { trips: 50, parking: 50, cost: 50, streets: 50, count: 10, gaveUp: 0, stayed: 0, onTime: 1, transit: 0, doubled: 0, fines: 0, fined: 0, meanRatio: 1, meanPay: 0, meanSeconds: 10, found: {}, riders: 0 };

describe('scoring', () => {
  it('a faster trip than expected scores more', () => {
    expect(curve([[1, 100], [2, 0]], 1.5)).toBe(50);
    expect(curve([[1, 100], [2, 0]], 9)).toBe(0);
    const c = inner(newCity());
    scoreTrip(c, leg(0, 10), 8);
    const good = c.day.stats.trips.sum;
    scoreTrip(c, leg(0, 10), 60);
    expect(c.day.stats.trips.sum - good).toBeLessThan(good);
    expect(c.day.stats.onTime).toBe(1);
    expect(c.day.stats.sores).toHaveLength(1);
  });

  it('walking far, searching and paying all hurt', () => {
    const c = inner(newCity());
    scoreParking(c, leg(0, 10), 'ok', 0);
    const best = c.day.stats.parking.sum;
    scoreParking(c, { ...leg(0, 10), tried: ['a', 'b'] }, 'ok', 5);
    expect(c.day.stats.parking.sum - best).toBeLessThan(best / 2);
    scorePay(c, leg(0, 10), 0);
    const free = c.day.stats.cost.sum;
    scorePay(c, leg(0, 10), 5);
    expect(c.day.stats.cost.sum - free).toBeLessThan(free / 2);
  });
});

describe('parking', () => {
  it('a driver picks the cheaper place, and a full one looks slow', () => {
    const v = cityAtYear(2);
    const c = inner(v);
    const market = c.lots.find((l) => l.name === 'Pepper Market')!;
    const own = chooseSpot(c, { lot: market.id }, 20, false, [])!;
    expect(own.kind).toBe('private');
    own.used = own.spaces;
    expect(searchMinutes(c, own)).toBeGreaterThan(5);
    ok(v, { t: 'kerb', road: market.access!.road, on: true });
    const other = chooseSpot(c, { lot: market.id }, 20, false, [own.key])!;
    expect(other.kind).toBe('kerb');
    c.prices = { ...c.prices, park: 2, parkPeak: 4 };
    expect(priceAt(c, other, 20, false)).toBe(4);
    expect(priceAt(c, other, 50, false)).toBe(2);
    c.policies = { ...c.policies, permits: true };
    expect(priceAt(c, other, 50, true)).toBe(0);
  });

  it('parked cars keep their place when the map changes', () => {
    const v = cityAtYear(2);
    const c = inner(v);
    const spot = [...c.day.spots.values()][0]!;
    spot.used = 1;
    buildSpots(c);
    expect(c.day.spots.get(spot.key)).toBe(spot);
  });

  it('inspectors and fines make double parking rarer', () => {
    const c = inner(cityAtYear(3));
    const free = daring(c);
    c.policies = { ...c.policies, inspectors: 3 };
    expect(catchChance(c)).toBeGreaterThan(0.5);
    expect(daring(c)).toBeLessThan(free);
  });
});

describe('choices', () => {
  it('the cheapest way wins most often, not always', () => {
    const way = (mode: Choice['mode'], minutes: number): Choice => ({ mode, minutes, seconds: minutes, coins: 0, spot: null, lines: [] });
    const list = [way('car', 10), way('transit', 13)];
    const picks = Array.from({ length: 100 }, (_, i) => pickMode(list, i / 100)!.mode);
    const cars = picks.filter((m) => m === 'car').length;
    expect(cars).toBeGreaterThan(55);
    expect(cars).toBeLessThan(90);
    expect(pickMode([], 0.5)).toBeNull();
  });
});

describe('growth', () => {
  it('happy blocks grow in time, sad shops shrink, ownership drifts', () => {
    const c = inner(cityAtYear(5));
    const home = c.lots.find((l) => l.name === 'Palm Row')!;
    const shop = c.lots.find((l) => l.name === 'Carpet Market')!;
    c.lots = c.lots.map((l) => (l.id === shop.id ? { ...l, level: 3 } : l));
    for (let i = 0; i < 24; i++) {
      c.day = { ...emptyDay(), spots: c.day.spots };
      add(lotTally(c.day.stats, home.id).trips, 95);
      add(lotTally(c.day.stats, home.id).parking, 95);
      add(lotTally(c.day.stats, shop.id).trips, 5);
      updateMoods(c);
      growLots(c);
    }
    expect(c.lots[home.id]!.level).toBeGreaterThan(1);
    expect(c.lots[shop.id]!.level).toBeLessThan(3);
    expect(moodOf(c, shop.id).trips).toBeLessThan(20);
    expect(c.events.some((e) => e.t === 'grew')).toBe(true);
    const was = c.ownership;
    driftOwnership(c);
    expect(c.ownership).toBeGreaterThan(was);
  });
});

describe('targets', () => {
  it('reads every kind used, and knows which way is good', () => {
    const c = inner(newCity());
    c.report = { ...EMPTY_REPORT, doubled: 3, found: { 'kind:market': 0.5 } };
    expect(measure(c, 'double', 5).met).toBe(true);
    expect(measure(c, 'double', 2).met).toBe(false);
    expect(measure(c, 'found@market', 60).value).toBe(50);
    expect(progressOf(c, 'found@market', 100)).toBeCloseTo(0.5);
    expect(() => measure(c, 'nonsense', 1)).toThrow();
    expect(measure(c, 'approval', 50).met).toBe(true);
  });
});
