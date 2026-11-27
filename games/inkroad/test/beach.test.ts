import { describe, expect, it } from 'vitest';
import { PAID_CITIES } from '../content/paid';
import { beginner } from '../src/city/bots/beginner';
import { playYear } from '../src/city/bots/play';
import { createCity } from '../src/city/city';
import { SAFFRON } from '../src/city/defs/saffron';
import { cellsToBlock } from '../src/city/geometry';
import { BEACH, leanOf, recordOf } from '../src/city/rules/beach';
import { readRules } from '../src/city/rules/state';
import { emptyLedger } from '../src/city/state';
import { cityProblems } from '../src/city/validate';
import { createNetwork, planRoad } from '../src/sim/network';
import type { Cell, CityView } from '../src/sim/types';
import { inner, newCity, ok, runDay } from './city-helpers';

const cell = (gx: number, gy: number): Cell => ({ gx, gy });
const DECIDES = 3;

/** January of a year, rich. The approval is set before the Council looks at it. */
function january(year: number, approval = 70, def = SAFFRON): CityView {
  const v = def === SAFFRON ? newCity() : createCity(def, 7);
  const c = inner(v);
  c.money = 5000;
  while (v.year < year) { c.phase = 'yearEnd'; c.approval = approval; v.apply({ t: 'next' }); }
  return v;
}
function decided(advice: 'sell' | 'public', season = 0): CityView {
  const v = january(DECIDES);
  ok(v, { t: 'beach', id: 'pearl', advice });
  ok(v, { t: 'next' });
  while (v.season < season) { runDay(v); ok(v, { t: 'next' }); }
  return v;
}
const pearl = (v: CityView) => v.beaches.find((b) => b.id === 'pearl')!;

describe('protected sand', () => {
  const map = ['..........', '..bbbbb...', '..bbbbb...', '~~~~~~~~~~', '..bb......', '..........'];
  const net = createNetwork(map, [{ cells: [[9, 0], [9, 2]], type: 'highway', fixed: true }, { cells: [[0, 5], [8, 5]], type: 'street' }], []);
  const plan = (...cells: [number, number][]) => planRoad(net, cells.map(([x, y]) => cell(x, y)), 'street');

  it('refuses a road on the beach and shows the sand', () => {
    const p = plan([1, 1], [5, 1]);
    expect(p.why).toBe('The beach is protected');
    expect(p.at).toEqual({ gx: 1.5, gy: 0.5, w: 1, h: 1 });
    expect(plan([4, 0], [4, 2]).why).toBe('The beach is protected');
  });

  it('lets a short straight approach lead to a bridge, and nothing longer or bent', () => {
    expect(plan([4, 0], [4, 5]).ok).toBe(true);
    expect(plan([2, 0], [2, 5]).ok).toBe(true);
    expect(plan([4, 0], [5, 1], [5, 5]).why).toBe('The beach is protected');
  });

  it('every city with beaches is sound, and each beach can be reached by a road of its year or the next', () => {
    for (const def of [SAFFRON, ...PAID_CITIES]) {
      expect(cityProblems(def)).toEqual([]);
      for (const b of def.beaches ?? []) {
        const n = createNetwork(def.map, def.roads.filter((r) => (r.opensYear ?? 1) <= b.decideYear), def.gates);
        const near = n.roads.filter((r) => !r.bridge && r.type !== 'highway').some((r) => r.line.some((p) => cellsToBlock(b, p) <= BEACH.reach));
        expect(near, b.name).toBe(true);
      }
    }
    expect(cityProblems({ ...SAFFRON, beaches: [{ ...SAFFRON.beaches![0], gy: 1 }] }).join()).toMatch(/stands on/);
    expect(cityProblems({ ...SAFFRON, beaches: [{ id: 'x' }] })).toContain('bad beaches');
  });
});

describe('the Council decides', () => {
  it('announces it a year ahead, asks in January, and not before', () => {
    const v = january(DECIDES - 1);
    expect(v.masterPlan[0]).toBe('Year 3: the Council decides about Pearl Beach. Villas, or a public beach');
    expect(v.beach).toBeUndefined();
    expect(v.quote({ t: 'beach', id: 'pearl', advice: 'sell' }).why).toMatch(/not asking/);
    expect(pearl(v)).toMatchObject({ state: 'open', decideYear: 3 });
    expect(v.quote({ t: 'road', cells: [cell(8, 5), cell(8, 3)], type: 'street' }).why).toBe('The beach is protected');
    expect(v.quote({ t: 'carPark', kind: 'lot', at: cell(7, 3) }).why).toMatch(/not decided about Pearl Beach/);
  });

  it('follows advice from 60 on, and its own lean under that', () => {
    const good = january(DECIDES, 63);
    const other = good.beach!.lean === 'sell' ? 'public' : 'sell';
    expect(good.beach).toMatchObject({ follows: true, needs: 60 });
    ok(good, { t: 'beach', id: 'pearl', advice: other });
    expect(pearl(good).state).toBe(other === 'sell' ? 'sold' : 'public');
    expect(good.beach!.done!.line).toMatch(/followed your advice/);
    expect(good.quote({ t: 'beach', id: 'pearl', advice: 'sell' }).why).toMatch(/has decided/);
    const weak = january(DECIDES, 52);
    expect(weak.beach!.follows).toBe(false);
    const lean = weak.beach!.lean;
    ok(weak, { t: 'beach', id: 'pearl', advice: lean === 'sell' ? 'public' : 'sell' });
    expect(pearl(weak).state).toBe(lean === 'sell' ? 'sold' : 'public');
    expect(weak.beach!.done!.line).toMatch(/under 60/);
  });

  it('goes its own way when nobody says a word', () => {
    const v = january(DECIDES);
    const lean = v.beach!.lean;
    ok(v, { t: 'next' });
    expect(pearl(v).state).toBe(lean === 'sell' ? 'sold' : 'public');
    expect(v.beach).toBeUndefined();
  });

  it('leans to sell with thin books or too few homes, to public when trips and streets are good', () => {
    const c = inner(january(DECIDES));
    c.books = [{ ...emptyLedger(), income: { ...emptyLedger().income, budget: 100 } }];
    c.bars = { trips: 70, parking: 70, cost: 70, streets: 80 };
    expect(leanOf(c).lean).toBe('public');
    c.bars = { trips: 50, parking: 70, cost: 70, streets: 60 };
    c.money = 5;
    expect(leanOf(c)).toMatchObject({ lean: 'sell' });
    c.money = 500;
    expect(leanOf(c).lean).toBe('public');
  });

  it('sold: coins into the season\'s books, villas a year later, the sea closed and talked about', () => {
    const v = january(DECIDES);
    const money = v.money;
    const owned = inner(v).ownership;
    ok(v, { t: 'beach', id: 'pearl', advice: 'sell' });
    const share = SAFFRON.beaches![0]!.share;
    expect(v.money).toBe(money + share);
    expect(inner(v).ownership).toBeGreaterThan(owned);
    expect(v.lots.filter((l) => l.district === 'Beachfront').map((l) => [l.level, l.opensYear])).toEqual([[0, 4], [0, 4], [0, 4]]);
    ok(v, { t: 'next' });
    expect(v.money).toBe(money + share);
    expect(v.ledger.income.grant).toBe(share);
    runDay(v);
    expect(inner(v).day.stats.sores.some((s) => s.kind === 'seaClosed')).toBe(true);
    expect(v.quote({ t: 'carPark', kind: 'lot', at: cell(13, 3) }).why).toMatch(/private now|Water|protected/);
    const c = inner(v);
    c.phase = 'yearEnd';
    ok(v, { t: 'next' });
    const villas = v.lots.filter((l) => l.district === 'Beachfront');
    expect(villas.every((l) => l.level === 3 && l.access !== null)).toBe(true);
  });

  it('public: a place, not a block; a surface car park beside it is beach parking, nothing else fits the sand', () => {
    const v = decided('public');
    expect(v.lots.some((l) => l.kind === 'beach')).toBe(false);
    expect(v.lots).toBe(v.lots);
    expect(v.beaches).toBe(v.beaches);
    expect(pearl(v)).toMatchObject({ state: 'public', reachable: true, spaces: 0 });
    const site = { t: 'carPark', kind: 'lot', at: cell(10, 5) } as const;
    expect(v.quote(site)).toMatchObject({ ok: true, note: 'Beach parking: Pearl Beach' });
    expect(v.quote({ t: 'carPark', kind: 'lot', at: cell(8, 2) }).why).toMatch(/water/i);
    ok(v, site);
    expect(v.carParks[0]!.beach).toBe(true);
    // A surface car park holds the bays it draws (src/sim/slotGeometry.ts): every one is beach parking.
    expect(pearl(v).beachSpaces).toBe(pearl(v).spaces);
    expect(pearl(v).spaces).toBeGreaterThanOrEqual(14);
    const far = v.quote({ t: 'carPark', kind: 'lot', at: cell(25, 19) });
    expect(far.note).toBeUndefined();
    expect(v.quote({ t: 'road', cells: [cell(9, 8), cell(9, 4)], type: 'street' }).why).toBe('The beach is protected');
  });
});

describe('a day at the sea', () => {
  /** Two years played by the beginner, so that people can get there at all. */
  const played = (() => {
    let save: string | null = null;
    return (): CityView => {
      if (save === null) {
        const v = newCity();
        while (v.year < DECIDES) playYear(v, beginner, 0);
        save = JSON.stringify(v.save());
      }
      const v = createCity(SAFFRON, 7, JSON.parse(save));
      inner(v).money = 2000;
      inner(v).approval = 70;
      return v;
    };
  })();
  const summer = (parks: boolean) => {
    const v = played();
    ok(v, { t: 'beach', id: 'pearl', advice: 'public' });
    ok(v, { t: 'next' });
    const planned = (): number => inner(v).day.plan.filter((t) => 'lot' in t.to && inner(v).lots[t.to.lot]?.kind === 'beach').length;
    const spring = planned();
    runDay(v);
    if (parks) ok(v, { t: 'carPark', kind: 'lot', at: cell(10, 5) });
    ok(v, { t: 'next' });
    const wish = planned();
    runDay(v);
    return { v, spring, wish, summer: pearl(v), parking: inner(v).report!.parking };
  };

  it('summer fills the shore: without spaces nobody finds one, with them most do', () => {
    const none = summer(false);
    const some = summer(true);
    expect(some.wish).toBeGreaterThan(some.spring * 2);
    expect(some.summer.visitors).toBeGreaterThan(5);
    expect(none.summer.found).toBeLessThan(0.4);
    expect(some.summer.found).toBeGreaterThan(0.6);
    expect(some.parking).toBeGreaterThan(none.parking);
    expect(inner(none.v).day.stats.sores.some((s) => s.lot !== null && inner(none.v).lots[s.lot]?.kind === 'beach')).toBe(true);
  });

  it('is the same every time, and survives a save', () => {
    const a = summer(true).v;
    const b = summer(true).v;
    expect(JSON.stringify(a.save())).toBe(JSON.stringify(b.save()));
    const back = createCity(SAFFRON, 7, JSON.parse(JSON.stringify(a.save())));
    expect(pearl(back)).toMatchObject({ state: 'public', visitors: pearl(a).visitors, found: pearl(a).found });
    expect(inner(back).lots.some((l) => l.kind === 'beach' && l.access !== null)).toBe(true);
    expect(recordOf(inner(back), 'pearl')).toEqual(recordOf(inner(a), 'pearl'));
    expect(readRules({ beaches: { pearl: { state: 'lava' } } }).beaches).toEqual({});
  });

  it('a city without beaches has none of it', () => {
    const v = createCity(PAID_CITIES[0]!, 1);
    expect(v.beaches).toEqual([]);
    expect(v.beach).toBeUndefined();
    expect(v.quote({ t: 'beach', id: 'pearl', advice: 'sell' }).ok).toBe(false);
  });
});
