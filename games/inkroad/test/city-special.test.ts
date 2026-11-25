import { describe, expect, it } from 'vitest';
import { HILLS } from '../content/hills';
import { ISLES } from '../content/isles';
import { RIVERS } from '../content/rivers';
import type { CityDef, CityView, Command, ToolId, YearDef } from '../src/sim/types';
import { createCity } from '../src/city/city';
import { SAFFRON } from '../src/city/defs/saffron';
import { worstSpots, writeComplaints } from '../src/city/voices';
import { auction, LICENCE, licencePain } from '../src/city/rules/licences';
import { bridgeMatch, meanCondition } from '../src/city/rules/ageing';
import { freewayStreets, throughShare } from '../src/city/rules/freeway';
import { wornFactor } from '../src/city/rules/ground';
import { specialMoves, specialYearEnd } from '../src/city/rules/botMoves';
import { fareShare, isBrt, laneShare } from '../src/city/rules/minibus';
import { wirePrice } from '../src/city/rules/speedTolls';
import { FRESH_RULES, readRules } from '../src/city/rules/state';
import { COMPLAINTS } from '../src/city/residents';
import { measure } from '../src/city/goals';
import { capacity } from '../src/city/transit';
import { cityProblems } from '../src/city/validate';
import { inner, ok, runDay } from './city-helpers';

const ALL: readonly ToolId[] = ['street', 'avenue', 'boulevard', 'remove', 'junction', 'kerb', 'parking', 'toll', 'bus', 'buslane', 'boat', 'square', 'oneway'];
/** Ten plain years with every tool, so a rule can be tried without the content. */
function open(def: CityDef, rules: Partial<CityDef['rules']> = {}): CityDef {
  const years = Array.from({ length: 10 }, (_, i): YearDef => ({
    year: i + 1, name: `Year ${i + 1}`, cannotLose: true, grant: 100, intro: [], tools: i === 0 ? ALL : [], goal: { kind: 'approval', target: 50, text: 'Fine' }, events: [],
  }));
  return { ...def, years, startMoney: 4000, rules: { ...def.rules, ...rules } };
}
function start(def: CityDef, year = 1): CityView {
  const v = createCity(def, 5);
  while (v.year < year) { inner(v).phase = 'yearEnd'; v.apply({ t: 'next' }); }
  v.apply({ t: 'next' });
  return v;
}
const why = (v: CityView, cmd: Command): string => { const q = v.quote(cmd); expect(q.ok).toBe(false); return q.why ?? ''; };
const night = (v: CityView): void => { runDay(v); expect(v.phase).toBe('review'); };
const again = (v: CityView, def: CityDef): CityView => createCity(def, 5, JSON.parse(JSON.stringify(v.save())));
const DASH = /[–—]/;

describe('special rules elsewhere', () => {
  it('cost nothing in the first cities', () => {
    const v = start(SAFFRON, 2);
    expect(v.special).toBeUndefined();
    expect(inner(v).rule).toBeUndefined();
    expect(throughShare(inner(v))).toBe(1);
    for (const cmd of [{ t: 'licences', quota: 100 }, { t: 'repair', road: 1 }, { t: 'boulevard', road: 1 }, { t: 'minibus', line: 1, deal: 'license' }, { t: 'speedToll', road: 1, on: true }, { t: 'tollLimit', max: 4 }] as const) expect(v.quote(cmd).ok).toBe(false);
    expect(specialMoves(v)).toEqual([]);
  });

  it('every text is free of dashes, and the drafts are sound', () => {
    for (const lines of Object.values(COMPLAINTS)) for (const l of lines) expect(l).not.toMatch(DASH);
    for (const def of [ISLES, HILLS, RIVERS]) expect(cityProblems(def)).toEqual([]);
  });

  it('reads a broken save as a fresh start', () => {
    expect(readRules(null)).toEqual(FRESH_RULES);
    expect(readRules({ licences: 'x', toll: { max: 'y' }, minis: [], freeway: { done: 1, digs: 'no' } })).toEqual(FRESH_RULES);
  });
});

describe('targets of their own', () => {
  it('read from the city', () => {
    const v = start(ISLES, 5);
    const c = inner(v);
    for (const kind of ['cars', 'licencePrice', 'speedKept', 'minis', 'condition', 'freeway']) expect(Number.isFinite(measure(c, kind, 1).value)).toBe(true);
    expect(measure(c, 'cars', 100, true).met).toBe(true);
    expect(measure(c, 'condition', 100, true).value).toBe(100);
  });

  it('markets leave room for car parks', () => {
    const v = start(open(ISLES));
    for (const l of v.lots.filter((x) => x.kind === 'market' || (x.kind === 'office' && x.level > 0))) {
      let sites = 0;
      for (let dx = -6; dx <= 9; dx++) for (let dy = -6; dy <= 8; dy++) if (v.quote({ t: 'carPark', kind: 'under', at: { gx: l.gx + dx, gy: l.gy + dy } }).ok) sites += 1;
      expect(`${l.name} ${sites >= 4}`).toBe(`${l.name} true`);
    }
  });
});

describe('Twin Isles: licences', () => {
  it('few licences are dear, many are cheap, none sells nothing', () => {
    expect(auction(1000, 200).price).toBeGreaterThan(auction(1000, 800).price);
    expect(auction(1000, 0)).toMatchObject({ sold: 0, income: 0, price: LICENCE.maxPrice });
    expect(auction(0, 500)).toMatchObject({ sold: 0, price: 1 });
    expect(auction(300, 900).sold).toBe(300);
  });

  it('is set at the year\'s end and bounds the cars next year', () => {
    const def = open(ISLES, { licences: { from: 1, wish: 0.95 } });
    const at = (quota: number): CityView => {
      const v = start(def);
      expect(why(v, { t: 'licences', quota: 100 })).toMatch(/year/);
      inner(v).phase = 'yearEnd';
      expect(v.special!.licences!.open).toBe(true);
      expect(why(v, { t: 'licences', quota: 150 })).toMatch(/hundreds/);
      expect(why(v, { t: 'licences', quota: 9_000_000 })).toMatch(/residents/);
      ok(v, { t: 'licences', quota });
      const money = v.money;
      const f = v.special!.licences!.forecast;
      v.apply({ t: 'next' });
      expect(v.special!.licences!.lastSold).toBe(f.sold);
      expect(v.money - money).toBe(f.income);
      return v;
    };
    const few = at(100);
    const many = at(1200);
    expect(inner(few).ownership).toBeLessThan(inner(many).ownership);
    expect(few.special!.licences!.lastPrice).toBeGreaterThan(many.special!.licences!.lastPrice);
    expect(licencePain(inner(few))).toBeGreaterThan(licencePain(inner(many)));
    const back = again(few, def);
    expect(back.special!.licences).toEqual(few.special!.licences);
  });

  it('a dear licence hurts the Cost bar and is complained about', () => {
    const v = start(open(ISLES, { licences: { from: 1, wish: 0.95 } }));
    const c = inner(v);
    c.rule = { ...c.rule!, licences: { ...c.rule!.licences!, price: 34 } };
    night(v);
    expect(v.bars.cost).toBeLessThan(70);
    expect(c.day.stats.sores.some((s) => s.kind === 'licence')).toBe(true);
    expect(v.complaints.some((x) => x.bar === 'cost')).toBe(true);
  });
});

describe('Twin Isles: tolls that follow the speed', () => {
  const def = open(ISLES, { speedTolls: { from: 1 } });
  const gate = (v: CityView) => v.roads.find((r) => r.bridge && !r.fixed)!;

  it('a gate becomes a speed gate, charges the wire\'s price and goes back', () => {
    const v = start(def);
    const r = gate(v);
    ok(v, { t: 'speedToll', road: r.id, on: true });
    expect(gate(v)).toMatchObject({ toll: true, speedToll: true });
    expect(why(v, { t: 'speedToll', road: r.id, on: true })).toMatch(/already/);
    expect(why(v, { t: 'speedToll', road: v.roads.find((x) => x.fixed)!.id, on: true })).toMatch(/ministry/);
    expect(wirePrice(inner(v))).not.toBeNull();
    night(v);
    expect(v.special!.speedTolls!.gates).toHaveLength(1);
    expect(v.special!.speedTolls!.kept).toBeGreaterThanOrEqual(0);
    ok(v, { t: 'tollLimit', max: 2 });
    expect(why(v, { t: 'tollLimit', max: 99 })).toMatch(/Between/);
    expect(again(v, def).special!.speedTolls!.max).toBe(2);
    ok(v, { t: 'speedToll', road: r.id, on: false });
    expect(wirePrice(inner(v))).toBeNull();
  });

  it('the price climbs while the road crawls, up to the limit, and falls when it flies', () => {
    const v = start(def);
    ok(v, { t: 'speedToll', road: gate(v).id, on: true });
    const c = inner(v);
    const real = c.traffic;
    const pace = (speedRatio: number): void => { c.traffic = new Proxy(real, { get: (t, k) => (k === 'roadStats' ? () => ({ flow: 20, speedRatio, queue: 0 }) : Reflect.get(t, k)) }); };
    pace(0.1);
    while (v.phase === 'day' && v.clock < 40) v.advance(5);
    expect(v.special!.speedTolls!.price).toBe(v.special!.speedTolls!.max);
    pace(1);
    while (v.phase === 'day' && v.clock < 106) v.advance(5);
    expect(v.special!.speedTolls!.price).toBe(0);
  });

  it('the tunnel is a tunnel', () => {
    const v = start(ISLES, 5);
    expect(v.roads.some((r) => r.tunnel && r.bridge)).toBe(true);
    expect(v.roads.filter((r) => r.bridge && !r.tunnel && !r.fixed).length).toBeGreaterThan(0);
  });
});

describe('Seven Hills', () => {
  it('steep streets are slow and only streets climb', () => {
    const v = start(open(HILLS, { minibuses: { from: 99 } }));
    const hill = (r: (typeof v.roads)[number]): number => r.cells.filter((x) => HILLS.map[x.gy]![x.gx] === 'h').length / r.cells.length;
    const steep = [...v.roads].filter((r) => r.type === 'street').sort((a, b) => hill(b) - hill(a))[0]!;
    const flat = v.roads.find((r) => r.type === 'street' && r.cells.every((x) => HILLS.map[x.gy]![x.gx] === '.'))!;
    const speed = (id: number): number => v.links.find((l) => l.road === id)!.freeSpeed;
    expect(speed(steep.id)).toBeLessThan(speed(flat.id) * 0.95);
    expect(why(v, { t: 'upgrade', road: steep.id, type: 'avenue' })).toMatch(/hill/);
    expect(speed(again(v, open(HILLS)).roads.length > 0 ? steep.id : flat.id)).toBe(speed(steep.id));
  });

  it('minibuses fill an empty corridor, keep their fares, and can be licensed or bought', () => {
    const def = open(HILLS, { minibuses: { from: 1 } });
    const v = start(def);
    const mini = v.lines.find((l) => l.mini)!;
    expect(mini.mini).toBe('private');
    const c = inner(v);
    expect(fareShare(c, mini.id)).toBe(0);
    expect(why(v, { t: 'removeLine', line: mini.id })).toMatch(/ours/);
    expect(why(v, { t: 'lineVehicles', line: mini.id, vehicles: 1 })).toMatch(/not work for us/);
    night(v);
    expect(v.special!.minibuses!.lines).toHaveLength(1);
    expect(v.lastLedger.costs.transit).toBe(0);
    ok(v, { t: 'minibus', line: mini.id, deal: 'license' });
    expect(fareShare(c, mini.id)).toBeGreaterThan(0);
    expect(why(v, { t: 'minibus', line: mini.id, deal: 'license' })).toMatch(/licence/);
    expect(again(v, def).lines.find((l) => l.id === mini.id)!.mini).toBe('licensed');
    const money = v.money;
    ok(v, { t: 'minibus', line: mini.id, deal: 'buyOut' });
    expect(v.lines).toHaveLength(0);
    expect(v.money).toBeLessThan(money);
  });

  it('a better bus on the same corridor wears one down', () => {
    const v = start(open(HILLS, { minibuses: { from: 1 } }));
    const mini = v.lines.find((l) => l.mini)!;
    ok(v, { t: 'line', mode: 'bus', stops: mini.stops });
    const own = v.lines.find((l) => !l.mini)!;
    ok(v, { t: 'lineVehicles', line: own.id, vehicles: 6 });
    for (let i = 0; i < 4 && v.lines.some((l) => l.id === mini.id); i++) { night(v); if (v.season < 3) v.apply({ t: 'next' }); }
    expect(v.lines.some((l) => l.id === mini.id)).toBe(false);
  });

  it('an express on bus lanes is a corridor, and the private ones protest it', () => {
    const v = start(open(HILLS, { minibuses: { from: 1 } }));
    const along = v.roads.filter((r) => !r.fixed && !r.bridge && r.cells.every((x) => x.gy === 16) && r.cells.some((x) => x.gx < 26));
    for (const r of along) ok(v, { t: 'upgrade', road: r.id, type: 'avenue' });
    for (const r of along) ok(v, { t: 'busLane', road: r.id, on: true });
    ok(v, { t: 'line', mode: 'express', stops: [{ gx: 5, gy: 16 }, { gx: 24, gy: 16 }] });
    const c = inner(v);
    const x = v.lines.find((l) => l.mode === 'express')!;
    expect(laneShare(c, x)).toBeGreaterThan(0.8);
    expect(isBrt(c, x)).toBe(true);
    night(v);
    expect(v.special!.minibuses!.protest).toBeGreaterThan(0);
    const streets = v.bars.streets;
    v.apply({ t: 'next' });
    night(v);
    expect(v.bars.streets).toBeLessThan(streets);
    expect(c.day.stats.sores.some((s) => s.kind === 'protest')).toBe(true);
  });

  it('boats carry more here', () => {
    const v = start(open(HILLS, { minibuses: { from: 99 } }));
    ok(v, { t: 'line', mode: 'boat', stops: [{ gx: 25, gy: 20 }, { gx: 31, gy: 20 }] });
    const here = capacity(inner(v), v.lines[0]!, 'am');
    const plain = createCity(open(HILLS, { ferries: 1, minibuses: { from: 99 } }), 5);
    plain.apply({ t: 'next' });
    ok(plain, { t: 'line', mode: 'boat', stops: [{ gx: 25, gy: 20 }, { gx: 31, gy: 20 }] });
    expect(here).toBeGreaterThan(capacity(inner(plain), plain.lines[0]!, 'am') * 1.5);
  });
});

describe('Cross Rivers', () => {
  it('old roads start worn, new ones do not, and use wears them', () => {
    const def = open(RIVERS);
    const v = start(def);
    const bridge = v.roads.find((r) => r.bridge)!;
    expect(bridge.condition).toBeLessThan(0.6);
    const before = meanCondition(inner(v));
    ok(v, { t: 'road', cells: [{ gx: 31, gy: 28 }, { gx: 33, gy: 30 }, { gx: 33, gy: 33 }], type: 'street' });
    expect(v.roads[v.roads.length - 1]!.condition).toBe(1);
    night(v);
    expect(meanCondition(inner(v))).toBeLessThan(before + 0.05);
    expect(v.roads.find((r) => r.id === bridge.id)!.condition).toBeLessThan(bridge.condition!);
    expect(again(v, def).roads.find((r) => r.id === bridge.id)!.condition).toBe(v.roads.find((r) => r.id === bridge.id)!.condition);
    expect(v.special!.ageing!.worst.length).toBeGreaterThan(0);
  });

  it('a worn road is slow until it is repaired or replaced; the Council pays for bridges', () => {
    const v = start(open(RIVERS, { ageing: { match: 1 } }));
    const c = inner(v);
    const bridge = v.roads.find((r) => r.bridge && r.cells.some((x) => x.gx === 18))!;
    const speed = (id: number): number => v.links.find((l) => l.road === id)!.freeSpeed;
    const slow = speed(bridge.id);
    expect(wornFactor(0)).toBeLessThan(wornFactor(0.5));
    expect(bridgeMatch(c)).toBe(0.6);
    expect(v.quote({ t: 'replace', road: bridge.id }).warn).toMatch(/Council pays/);
    ok(v, { t: 'replace', road: bridge.id });
    expect(why(v, { t: 'repair', road: bridge.id })).toMatch(/shovels/);
    night(v);
    v.apply({ t: 'next' });
    night(v);
    expect(speed(bridge.id)).toBeGreaterThan(slow);
    expect(why(v, { t: 'replace', road: bridge.id })).toMatch(/new/);
    const street = v.roads.find((r) => !r.bridge && !r.freeway && (r.condition ?? 1) < 0.7)!;
    ok(v, { t: 'repair', road: street.id });
    expect(v.roads.find((r) => r.id === street.id)!.condition).toBeGreaterThan(street.condition!);
  });

  it('a bridge that is nearly gone carries no lorries, and holes are eaten by wheels', () => {
    const v = start(open(RIVERS));
    const c = inner(v);
    c.net = { ...c.net, roads: c.net.roads.map((r) => ({ ...r, condition: 0.05 })) };
    night(v);
    expect(v.roads.filter((r) => r.bridge).every((r) => r.truckBan)).toBe(true);
    expect(c.day.stats.sores.some((s) => s.kind === 'pothole')).toBe(true);
    expect(worstSpots(c).length).toBeGreaterThan(0);
  });

  it('nobody crosses the freeway, until it is a boulevard with a park', () => {
    const def = open(RIVERS, { freeway: { from: 1 } });
    const v = start(def);
    const piece = v.roads.find((r) => r.freeway && r.cells.some((x) => x.gx === 25))!;
    const inside = v.roads.filter((r) => r.freeway).flatMap((r) => r.cells.slice(1, -1));
    const tries = inside.map(({ gx, gy }) => v.quote({ t: 'road', cells: [{ gx, gy: gy - 2 }, { gx, gy: gy + 2 }], type: 'street' }));
    expect(tries.some((q) => /freeway/.test(q.why ?? ''))).toBe(true);
    expect(tries.every((q) => !q.ok)).toBe(true);
    expect(why(v, { t: 'upgrade', road: piece.id, type: 'street' })).toMatch(/boulevard/);
    expect(why(v, { t: 'remove', road: piece.id })).toMatch(/boulevard/);
    expect(why(v, { t: 'boulevard', road: v.roads.find((r) => r.fixed)!.id })).toMatch(/freeway/);
    const calm = v.approval;
    const pieces = v.roads.filter((r) => r.freeway).length;
    ok(v, { t: 'boulevard', road: piece.id });
    expect(v.approval).toBeLessThan(calm);
    expect(v.roads.find((r) => r.id === piece.id)).toMatchObject({ type: 'boulevard', freeway: false, condition: 1 });
    expect(v.special!.freeway).toMatchObject({ left: pieces - 1, digging: 1, done: 0 });
    const lots = v.lots.length;
    night(v);
    const dug = freewayStreets(inner(v));
    inner(v).day.stats.sores = [];
    v.apply({ t: 'next' });
    night(v);
    expect(v.special!.freeway).toMatchObject({ digging: 0, done: 1 });
    expect(v.lots.length).toBe(lots + 1);
    expect(v.lots[lots]!.kind).toBe('park');
    expect(throughShare(inner(v))).toBeLessThan(1);
    v.apply({ t: 'next' });
    night(v);
    expect(freewayStreets(inner(v))).toBeGreaterThan(dug + 3);
    expect(again(v, def).special!.freeway).toEqual(v.special!.freeway);
    expect(writeComplaints(inner(v)).length).toBeGreaterThan(0);
  });

  it('has ideas for the planner, and buys licences at the year\'s end', () => {
    const v = start(open(RIVERS, { freeway: { from: 1 } }));
    expect(specialMoves(v).map((m) => m.kind)).toEqual(expect.arrayContaining(['repair', 'boulevard']));
    const isles = start(open(ISLES, { licences: { from: 1, wish: 0.95 }, speedTolls: { from: 1 } }));
    expect(specialMoves(isles).some((m) => m.kind === 'speedToll')).toBe(true);
    inner(isles).phase = 'yearEnd';
    specialYearEnd(isles);
    expect(isles.special!.licences!.forecast.dear).toBe(false);
  });
});
