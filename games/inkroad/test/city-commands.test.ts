import { describe, expect, it } from 'vitest';
import type { Command, TransitMode } from '../src/sim/types';
import { PAID_CITIES } from '../content/paid';
import { createCity } from '../src/city/city';
import { bestRide, capacity } from '../src/city/transit';
import { feelZone } from '../src/city/zone';
import { linePath } from '../src/city/transit';
import { settleSeason } from '../src/city/settle';
import { catchChance } from '../src/city/legs';
import { cityAtYear, inner, newCity, ok, runDay } from './city-helpers';

const at = (v: ReturnType<typeof newCity>, gx: number, gy: number) => v.junctions.find((j) => j.cell.gx === gx && j.cell.gy === gy)!.id;
const roadThrough = (v: ReturnType<typeof newCity>, gx: number, gy: number) =>
  v.roads.find((r) => !r.flyover && r.cells.slice(1, -1).some((c) => c.gx === gx && c.gy === gy))!;
const cell = (gx: number, gy: number) => ({ gx, gy });
const why = (v: ReturnType<typeof newCity>, cmd: Command): string => { const q = v.quote(cmd); expect(q.ok).toBe(false); return q.why ?? ''; };

describe('roads', () => {
  it('draws a street, bumps the version and gives the price of land', () => {
    const v = cityAtYear(1);
    const before = v.version;
    const cmd: Command = { t: 'road', cells: [cell(32, 24), cell(36, 20), cell(36, 18)], type: 'street' };
    const q = v.quote(cmd);
    expect(q.ok).toBe(true);
    expect(q.land).toBeGreaterThan(0);
    expect(q.cost).toBeGreaterThan(q.land);
    ok(v, cmd);
    expect(v.version).toBeGreaterThan(before);
    expect(v.drainEvents().some((e) => e.t === 'built')).toBe(true);
  });

  it('says why not', () => {
    const v = cityAtYear(1);
    expect(why(v, { t: 'road', cells: [cell(20, 20), cell(18, 20)], type: 'street' })).toBe('Palm Row stands here');
    expect(why(v, { t: 'road', cells: [cell(33, 24), cell(34, 24)], type: 'avenue' })).toMatch(/toolbox/);
    expect(why(v, { t: 'remove', road: v.roads.find((r) => r.fixed)!.id })).toMatch(/ministry/);
    expect(why(v, { t: 'remove', road: roadThrough(v, 22, 12).id })).toMatch(/would be cut off/);
    expect(why(v, { t: 'remove', road: 9999 })).toMatch(/Nothing/);
    expect(why(v, { t: 'kerb', road: roadThrough(v, 22, 12).id, on: true })).toMatch(/toolbox/);
  });

  it('widens with three months of works, and the works end with the season', () => {
    const v = cityAtYear(3);
    const r = roadThrough(v, 12, 18);
    ok(v, { t: 'upgrade', road: r.id, type: 'avenue' });
    expect(v.roads.find((x) => x.id === r.id)!.works).toBe(3);
    expect(why(v, { t: 'upgrade', road: r.id, type: 'avenue' })).toMatch(/already/);
    runDay(v);
    expect(v.roads.find((x) => x.id === r.id)!.works).toBe(0);
    expect(v.drainEvents().some((e) => e.t === 'opened')).toBe(true);
  });

  it('switches: one way, kerb bays, tolls, bus lanes', () => {
    const v = cityAtYear(7);
    const r = roadThrough(v, 22, 12);
    ok(v, { t: 'kerb', road: r.id, on: true });
    expect(why(v, { t: 'kerb', road: r.id, on: true })).toMatch(/already/);
    ok(v, { t: 'kerb', road: r.id, on: false });
    ok(v, { t: 'toll', road: v.roads.find((x) => x.bridge)!.id, on: true });
    expect(why(v, { t: 'busLane', road: r.id, on: true })).toMatch(/lane/);
    const lane = roadThrough(v, 20, 24);
    ok(v, { t: 'oneWay', road: lane.id, dir: 1 });
    expect(v.roads.find((x) => x.id === lane.id)!.oneWay).toBe(true);
    ok(v, { t: 'oneWay', road: lane.id, dir: 0 });
    ok(v, { t: 'truckBan', road: lane.id, on: true });
  });
});

describe('junctions', () => {
  it('circle, signals, green split, and no smart ones without the technology', () => {
    const v = cityAtYear(4);
    const node = at(v, 22, 18);
    ok(v, { t: 'control', node, control: 'roundabout' });
    expect(why(v, { t: 'control', node, control: 'roundabout' })).toMatch(/already/);
    ok(v, { t: 'control', node, control: 'signal' });
    const n = v.junctions.find((j) => j.id === node)!.split.length;
    ok(v, { t: 'split', node, split: n === 2 ? [0.7, 0.3] : Array.from({ length: n }, () => 1 / n) });
    expect(why(v, { t: 'split', node, split: [1] })).toMatch(/green/);
    expect(why(v, { t: 'control', node, control: 'smart' })).toMatch(/technology/);
    inner(v).techs = ['smart'];
    ok(v, { t: 'control', node, control: 'smart' });
    expect(why(newCity(), { t: 'control', node: at(newCity(), 22, 18), control: 'signal' })).toMatch(/toolbox/);
  });

  it('a flyover takes six months, then opens', () => {
    const v = cityAtYear(6);
    const node = at(v, 22, 18);
    const arms = v.junctions.find((j) => j.id === node)!.arms;
    const pairs = arms.flatMap((a) => arms.filter((b) => b !== a).map((b) => [a, b] as const));
    const pair = pairs.find(([a, b]) => v.quote({ t: 'flyover', node, fromRoad: a, toRoad: b, level: 1 }).ok)!;
    const cmd: Command = { t: 'flyover', node, fromRoad: pair[0], toRoad: pair[1], level: 1 };
    ok(v, cmd);
    expect(v.projects).toHaveLength(1);
    expect(why(v, cmd)).toMatch(/Already/);
    expect(v.roads.some((r) => r.flyover)).toBe(false);
    for (let i = 0; i < 2; i++) { inner(v).day.plan = []; runDay(v); v.apply({ t: 'next' }); }
    expect(v.projects).toHaveLength(0);
    expect(v.roads.some((r) => r.flyover)).toBe(true);
  });
});

describe('car parks', () => {
  it('needs sand and a road, knows the Master Plan, can be taken away', () => {
    const v = cityAtYear(2);
    expect(why(v, { t: 'carPark', kind: 'lot', at: cell(28, 10) })).toMatch(/stands here/);
    expect(why(v, { t: 'carPark', kind: 'lot', at: cell(37, 20) })).toMatch(/float/);
    expect(why(v, { t: 'carPark', kind: 'multi', at: cell(26, 15) })).toMatch(/toolbox/);
    expect(why(v, { t: 'carPark', kind: 'lot', at: cell(8, 21) })).toBe('Blueprint Offices opens here in year 4');
    const site = [...Array(30).keys()].flatMap((x) => [cell(5 + x, 9), cell(5 + x, 13)]).find((c) => v.quote({ t: 'carPark', kind: 'lot', at: c }).ok)!;
    ok(v, { t: 'carPark', kind: 'lot', at: site });
    expect(v.carParks[0]!.spaces).toBeGreaterThan(5);
    ok(v, { t: 'removePark', park: v.carParks[0]!.id });
    expect(v.carParks).toHaveLength(0);
  });
});

describe('the desk', () => {
  it('prices move one step, only at the review', () => {
    const v = cityAtYear(2);
    expect(why(v, { t: 'prices', prices: { park: 2 } })).toMatch(/review/);
    runDay(v);
    const was = v.prices.park;
    ok(v, { t: 'prices', prices: { park: was + 1 } });
    expect(why(v, { t: 'prices', prices: { park: was + 2 } })).toMatch(/step/i);
    expect(why(v, { t: 'prices', prices: { toll: 2 } })).toMatch(/toolbox/);
    expect(why(v, { t: 'prices', prices: { park: 1.5 } })).toMatch(/price/i);
    expect(v.priceLimits.fine.open).toBe(false);
  });

  it('policies, commissions, floating', () => {
    const v = cityAtYear(4);
    ok(v, { t: 'policies', policies: { inspectors: 3, permits: true } });
    expect(why(v, { t: 'policies', policies: { inspectors: 9 } })).toMatch(/menu/);
    expect(why(v, { t: 'policies', policies: { nightWorks: true } })).toMatch(/toolbox/);
    expect(catchChance(inner(v))).toBeGreaterThan(0);
    const job = v.commissions[0]!;
    const money = v.money;
    ok(v, { t: 'commission', id: job.id, take: true });
    expect(v.money).toBe(money + job.upfront);
    runDay(v);
    expect(v.commissions[0]!.state).not.toBe('offered');
    inner(v).books = [{ ...v.lastLedger, income: { ...v.lastLedger.income, parking: 20 } }];
    const before = v.money;
    ok(v, { t: 'float', stream: 'parking' });
    expect(v.money).toBe(before + 100);
    expect(why(v, { t: 'float', stream: 'parking' })).toMatch(/Sold/);
  });

  it('a missed commission is paid back', () => {
    const v = cityAtYear(3);
    const c = inner(v);
    const job = v.commissions[0]!;
    ok(v, { t: 'commission', id: job.id, take: true });
    c.commissions = c.commissions.map((x) => ({ ...x, monthsLeft: 3, kind: 'riders', target: 1e6 }));
    const money = v.money;
    settleSeason(c);
    expect(v.commissions[0]!.state).toBe('failed');
    expect(v.lastLedger.costs.interest).toBeGreaterThanOrEqual(job.upfront);
    expect(v.money).toBeLessThan(money + 60);
  });
});

describe('lines', () => {
  const draw = (v: ReturnType<typeof newCity>, mode: TransitMode, stops: readonly { gx: number; gy: number }[]): Command => ({ t: 'line', mode, stops });

  it('a bus follows the roads, runs, carries people and costs money', () => {
    const v = cityAtYear(5);
    const c = inner(v);
    expect(why(v, draw(v, 'bus', [cell(22, 12)]))).toMatch(/two stops/);
    expect(why(v, draw(v, 'bus', [cell(22, 12), cell(1, 37)]))).toMatch(/roads/);
    expect(why(v, draw(v, 'bus', [cell(22, 12), cell(22, 13)]))).toMatch(/close/);
    ok(v, draw(v, 'bus', [cell(22, 11), cell(22, 21), cell(18, 24)]));
    const l = v.lines[0]!;
    expect(l.path.length).toBeGreaterThan(2);
    expect(capacity(c, l, 'am')).toBeGreaterThan(1);
    const ride = bestRide(c, { x: 22 * 40, y: 11 * 40 }, { x: 18 * 40, y: 25 * 40 }, 'am')!;
    expect(ride.lines).toEqual([l.id]);
    ok(v, { t: 'lineVehicles', line: l.id, vehicles: 4 });
    expect(why(v, { t: 'lineVehicles', line: l.id, vehicles: 9 })).toMatch(/Between/);
    runDay(v);
    expect(v.lastLedger.costs.transit).toBeGreaterThan(0);
    ok(v, { t: 'removeLine', line: l.id });
    expect(v.lines).toHaveLength(0);
  });

  it('a metro is matched by the Council and takes nine months', () => {
    const v = cityAtYear(9);
    const cmd = draw(v, 'metro', [cell(11, 14), cell(22, 14), cell(30, 18), cell(44, 18)]);
    const q = v.quote(cmd);
    expect(q.works).toBe(9);
    expect(q.warn).toMatch(/Council pays/);
    ok(v, cmd);
    expect(bestRide(inner(v), { x: 11 * 40, y: 14 * 40 }, { x: 44 * 40, y: 18 * 40 }, 'am')).toBeNull();
    // Nine paydays.
    for (let i = 0; i < 9; i++) settleSeason(inner(v));
    expect(v.lines[0]!.works).toBe(0);
    const a = { x: 11 * 40, y: 14 * 40 };
    expect(bestRide(inner(v), a, { x: 44 * 40, y: 18 * 40 }, 'am')!.lines).toHaveLength(1);
    ok(v, draw(v, 'metro', [cell(22, 13), cell(22, 24)]));
    for (let i = 0; i < 9; i++) settleSeason(inner(v));
    expect(bestRide(inner(v), a, { x: 22 * 40, y: 25 * 40 }, 'am')!.changes).toBe(1);
  });

  it('straight paths for metro and boats', () => {
    const v = cityAtYear(1);
    expect(linePath(inner(v), 'metro', [cell(1, 1), cell(5, 5)])).toHaveLength(2);
  });
});

describe('Old Harbour', () => {
  const harbour = () => {
    const v = createCity(PAID_CITIES[0]!, 3);
    const c = inner(v);
    c.money = 9000;
    while (v.year < 6) { c.phase = 'yearEnd'; v.apply({ t: 'next' }); }
    v.apply({ t: 'next' });
    return v;
  };

  it('walls do not move, and decks stay out', () => {
    const v = harbour();
    expect(why(v, { t: 'upgrade', road: roadThrough(v, 28, 22).id, type: 'avenue' })).toMatch(/walls/);
    expect(v.lots.filter((l) => l.level > 0 && !l.access).map((l) => l.name)).toEqual([]);
  });

  it('the charge is paid at the gates, felt, then voted on', () => {
    const v = harbour();
    const c = inner(v);
    runDay(v);
    expect(why(v, { t: 'vote', keep: true })).toMatch(/feel/);
    ok(v, { t: 'prices', prices: { zone: 1 } });
    expect(v.roads.filter((r) => r.toll).length).toBe(3);
    const low = v.vote!.support;
    c.prices = { ...c.prices, zone: 2 };
    v.apply({ t: 'next' });
    runDay(v);
    expect(v.vote!.seasons).toBe(1);
    expect(v.lastLedger.income.zone).toBeGreaterThan(0);
    feelZone(c, { ...c.report!, trips: 95, streets: 95, transit: 0.3 });
    expect(v.vote!.support).toBeGreaterThan(low);
    v.apply({ t: 'next' });
    ok(v, { t: 'vote', keep: true });
    feelZone(c, { ...c.report!, trips: 95, streets: 95, transit: 0.3 });
    expect(v.vote!.kept).toBe(true);
  });

  it('can be dropped', () => {
    const v = harbour();
    runDay(v);
    ok(v, { t: 'prices', prices: { zone: 1 } });
    ok(v, { t: 'vote', keep: false });
    expect(v.prices.zone).toBe(0);
    expect(v.roads.some((r) => r.toll)).toBe(false);
  });

  it('a street becomes a square', () => {
    const v = harbour();
    const square = v.roads.find((r) => v.quote({ t: 'square', road: r.id }).ok)!;
    ok(v, { t: 'square', road: square.id });
    expect(v.lots.some((l) => l.kind === 'square')).toBe(true);
    const back = createCity(PAID_CITIES[0]!, 3, JSON.parse(JSON.stringify(v.save())));
    expect(back.lots.some((l) => l.kind === 'square')).toBe(true);
  });
});

describe('voices', () => {
  it('complaints name real places and drivers talk', () => {
    const v = cityAtYear(2);
    v.advance(30);
    const slot = [...Array(v.cars.count).keys()].find((i) => v.cars.alive[i])!;
    const d = v.driver(slot)!;
    expect(d.text).not.toMatch(/[{}]/);
    expect(v.driver(-1)).toBeNull();
    const busy = v.roads.map((r) => v.trace(r.id)).find((t) => t.to.length > 0)!;
    expect(busy.from.reduce((n, s) => n + s.share, 0)).toBeGreaterThan(0.5);
    runDay(v);
    expect(v.complaints.length).toBeGreaterThan(0);
    for (const x of v.complaints) expect(x.text).not.toMatch(/[{}–—]/);
    expect(v.lotMood(v.lots[0]!.id).trips).toBeGreaterThan(0);
  });
});
