import { describe, expect, it } from 'vitest';
import { commitNetwork } from '../src/city/network';
import { busyWorn, WEAR, wear, wornStreets } from '../src/city/rules/ageing';
import { patchRoad } from '../src/city/rules/ground';
import { parksCost } from '../src/city/settle';
import type { City } from '../src/city/state';
import { writeComplaints } from '../src/city/voices';
import { findProblems } from '../src/guide/advisor/problems';
import { closedForWorks } from '../src/sim/roadGeom';
import type { Id, Road, RoadStats } from '../src/sim/types';
import { cityAtYear, inner, ok, runDay } from './city-helpers';

/** Roads cost nothing a month; they wear by use and are mended by hand (docs/inkroad-build.md "Roads wear, repairs by hand"). */
const SEASONS_TO_YEAR_3 = 9;
const SEASONS_IN_TEN_YEARS = 36;
const BUSY_LANE = 90; // a season's cars on a lane of Saffron Bay's busiest streets (planner, years 1 to 10)
const QUIET_LANE = 5; // the quietest tenth

const stats = (cars: number): RoadStats => ({ flow: 0, speedRatio: 1, queue: 0, cars });
const streets = (c: City): readonly Road[] => c.net.roads.filter((r) => r.type === 'street' && !r.flyover && r.works === 0);
function setCars(c: City, cars: ReadonlyMap<Id, number>): void {
  c.measures = { ...c.measures, roads: new Map(c.net.roads.map((r) => [r.id, stats(cars.get(r.id) ?? 0)])) };
}
function setCondition(c: City, id: Id, condition: number): void {
  commitNetwork(c, patchRoad(c.net, id, { condition }));
}
const condOf = (c: City, id: Id): number => c.net.roads.find((r) => r.id === id)!.condition ?? 1;

describe('no road upkeep', () => {
  it('a city that builds nothing pays no road costs: only car parks have a running cost', () => {
    const v = cityAtYear(3);
    const c = inner(v);
    expect(c.parks).toHaveLength(0);
    expect(parksCost(c)).toBe(0);
    runDay(v);
    const costs = v.books.reduce((n, l) => n + Object.values(l.costs).reduce((a, b) => a + b, 0), 0);
    expect(costs).toBe(0);
    expect(v.forecast.nextMonth).toBeGreaterThan(0);
  });
});

describe('wear', () => {
  it('a busy street wears fast, a quiet one barely: first repair about year 3, the quiet one lasts the ten years', () => {
    const c = inner(cityAtYear(3));
    const [busy, quiet] = streets(c);
    setCars(c, new Map([[busy!.id, BUSY_LANE], [quiet!.id, QUIET_LANE]]));
    for (let i = 0; i < SEASONS_TO_YEAR_3; i++) wear(c);
    expect(condOf(c, busy!.id)).toBeGreaterThan(0.5);
    expect(condOf(c, busy!.id)).toBeLessThan(0.65);
    expect(condOf(c, quiet!.id)).toBeGreaterThan(0.9);
    for (let i = SEASONS_TO_YEAR_3; i < SEASONS_IN_TEN_YEARS; i++) wear(c);
    expect(condOf(c, quiet!.id)).toBeGreaterThan(0.6);
    expect(condOf(c, busy!.id)).toBe(0);
  });

  it('Cross Rivers keeps its faster ageing', () => {
    expect(WEAR.old.season).toBeGreaterThan(WEAR.normal.season);
    expect(WEAR.old.perCar).toBeGreaterThan(WEAR.normal.perCar);
  });
});

describe('complaints follow use', () => {
  it('of two equally worn roads, the busy one costs the Streets points and gets the complaint; the empty one costs about nothing', () => {
    const v = cityAtYear(3);
    const c = inner(v);
    v.advance(60);
    const used = c.net.roads.filter((r) => !r.flyover).map((r) => ({ r, cars: c.traffic.roadStats(r.id).cars ?? 0 })).sort((a, b) => b.cars - a.cars);
    const busy = used[0]!.r;
    const empty = used.find((u) => u.cars === 0)!.r;
    expect(wornStreets(c)).toBeCloseTo(0);
    setCondition(c, busy.id, 0.3);
    setCondition(c, empty.id, 0.3);
    const both = wornStreets(c);
    setCondition(c, empty.id, 1);
    expect(both).toBeLessThan(-0.5);
    expect(wornStreets(c) / both).toBeGreaterThan(0.99);
    setCondition(c, empty.id, 0.3);
    setCars(c, new Map(used.map((u) => [u.r.id, u.cars])));
    expect(busyWorn(c).map((h) => h.road.id)).toEqual([busy.id]);
    c.day.stats.sores = [];
    expect(writeComplaints(c).some((x) => x.bar === 'streets' && /road by/.test(x.text))).toBe(true);
    const dewy = findProblems(v).find((p) => p.kind === 'worn');
    expect(dewy?.ref).toBe(busy.id);
    expect(dewy?.place).toMatch(/busy: repair it/);
  });
});

describe('repairs by hand', () => {
  it('quote, a month of works with the road closed, as new after; the books call it Repairs', () => {
    const v = cityAtYear(3);
    const c = inner(v);
    const [road, fine] = streets(c);
    setCondition(c, road!.id, 0.4);
    expect(v.quote({ t: 'repair', road: fine!.id })).toMatchObject({ ok: false, why: expect.stringMatching(/still good/) });
    const q = v.quote({ t: 'repair', road: road!.id });
    expect(q).toMatchObject({ ok: true, works: 1, closes: true });
    expect(q.cost).toBeGreaterThan(0);
    const before = v.ledger.costs.repairs;
    ok(v, { t: 'repair', road: road!.id });
    const r = c.net.roads.find((x) => x.id === road!.id)!;
    expect(r.condition).toBe(1);
    expect(r.works).toBe(1);
    expect(closedForWorks(r)).toBe(true);
    expect(v.ledger.costs.repairs - before).toBe(q.cost);
    expect(v.ledger.costs.building).toBe(0);
    // Mending the whole town would cost far more than the few busy roads.
    const all = streets(c).filter((x) => x.id !== road!.id).reduce((n, x) => { setCondition(c, x.id, 0.4); return n + v.quote({ t: 'repair', road: x.id }).cost; }, 0);
    expect(all).toBeGreaterThan(q.cost * 5);
  });
});
