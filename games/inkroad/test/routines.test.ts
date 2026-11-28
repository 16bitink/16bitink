import { describe, expect, it } from 'vitest';
import { DAY, STEP, WEEKEND } from '../src/sim/constants';
import { clockAt, hourAt, NIGHT_END, WEEKEND_AT } from '../src/city/clock';
import { garageAccess } from '../src/city/door';
import { polyLength } from '../src/city/geometry';
import { QUIET_HOUR } from '../src/city/hops';
import type { Place } from '../src/city/day';
import { freeSeconds } from '../src/city/modes';
import { LEAVE_PAD } from '../src/city/tune';
import { createCity } from '../src/city/city';
import { SAFFRON } from '../src/city/defs/saffron';
import { fleetOf, type FleetCar } from '../src/city/households';
import { buildSpots, roughSpot } from '../src/city/parking';
import { setRecord } from '../src/city/rules/beach';
import type { City } from '../src/city/state';
import type { CityView } from '../src/sim/types';
import { cityAtYear, inner, runDay, runYear } from './city-helpers';

/** Steps the season in fixed steps, calling `look` after each. */
function stepThrough(v: CityView, seconds: number, look: (c: City) => void): void {
  const c = inner(v);
  for (let t = 0; t < seconds && v.phase === 'day'; t += STEP) { v.advance(STEP); look(c); }
}

/** Driving, held at an exit, parked for a stay it will drive home from, or pulled in at a building for the night. */
const onItsWay = (c: City, car: FleetCar): boolean =>
  !!car.leg || !car.where || c.day.waiting.some((l) => l.car === car.uid) || c.day.stays.some((s) => s.leg.car === car.uid);

const atHome = (c: City, car: FleetCar): boolean => {
  const h = fleetOf(c).households.get(car.household)!;
  return (car.where?.spot.key ?? car.garage) === `lot:${h.lot}`;
};

/** Every household car is somewhere: parked outdoors or inside, driving, or out of town. */
function whereabouts(c: City): { readonly standing: number; readonly driving: number; readonly away: number; readonly lost: number } {
  const alive = new Set<number>();
  const cars = c.traffic.cars;
  for (let i = 0; i < cars.count; i++) if (cars.alive[i]) alive.add(cars.uid[i]!);
  let standing = 0; let driving = 0; let away = 0; let lost = 0;
  for (const car of fleetOf(c).cars.values()) {
    if (car.where && car.where.spot.cars.includes(car.where) && c.day.spots.get(car.where.spot.key) === car.where.spot) standing += 1;
    else if (garageAccess(c, car.garage)) standing += 1;
    else if (car.leg && !car.leg.done && alive.has(car.leg.uid)) driving += 1;
    else if (car.away) away += 1;
    else lost += 1;
  }
  return { standing, driving, away, lost };
}

describe('the season clock', () => {
  it('runs a workday, a short night and a weekend, then the review; the hour wraps', () => {
    const v = cityAtYear(2);
    const events: string[] = [];
    const hours: number[] = [];
    stepThrough(v, DAY + WEEKEND + 1, () => { for (const e of v.drainEvents()) events.push(e.t); if (v.phase === 'day') hours.push(v.hour); });
    expect(events.filter((e) => e === 'weekend')).toHaveLength(1);
    expect(v.phase).toBe('review');
    expect(Math.max(...hours)).toBeLessThan(24);
    expect(Math.min(...hours)).toBeGreaterThanOrEqual(0);
    const wrap = hours.findIndex((h, i) => i > 0 && h < hours[i - 1]! - 12);
    expect(wrap).toBeGreaterThan(0);
  });

  it('counts each drawn day from 0 and says which it is', () => {
    const v = cityAtYear(2);
    v.advance(DAY - 1);
    expect([v.dayKind, v.dayLength]).toEqual(['work', DAY]);
    v.advance(2);
    expect([v.dayKind, v.dayLength]).toEqual(['weekend', WEEKEND]);
    expect(v.clock).toBeLessThan(2);
    expect(v.hour).toBeLessThan(2);
  });

  it('turns hours into the clock and back, on both days', () => {
    for (const kind of ['work', 'weekend'] as const) {
      for (const h of [8, 12.5, 17, 21]) expect(hourAt(clockAt(h, kind), 'day')).toBeCloseTo(h, 5);
    }
    expect(clockAt(9, 'weekend')).toBeGreaterThan(NIGHT_END);
    expect(clockAt(1, 'weekend')).toBeLessThan(NIGHT_END);
    expect(clockAt(1, 'weekend')).toBeGreaterThanOrEqual(WEEKEND_AT);
  });
});

describe('households and their days', () => {
  it('chain stops: a drop-off before work, the shop on the way home', () => {
    const v = cityAtYear(3);
    const chains = [...inner(v).day.chains.values()].flat();
    const drop = chains.find((ch) => {
      const k = ch.stops.map((s) => s.kind);
      const w = k.indexOf('work');
      return w > 0 && (k[w - 1] === 'school' || k[w - 1] === 'nursery');
    });
    expect(drop).toBeDefined();
    const shop = chains.find((ch) => { const k = ch.stops.map((s) => s.kind); const w = k.lastIndexOf('work'); return w >= 0 && k[w + 1] === 'shop'; });
    expect(shop).toBeDefined();
    for (const ch of chains) for (let i = 1; i < ch.stops.length; i++) expect(ch.stops[i]!.at).toBeGreaterThanOrEqual(ch.stops[i - 1]!.at - 1);
  });

  it('a car stands at each stop of its day, and at home at night', () => {
    const v = cityAtYear(3);
    const c = inner(v);
    const ch = [...c.day.chains.values()].flat().find((x) => x.car !== null && x.now === -1 && x.stops.length >= 2 && x.stops.every((s) => 'lot' in s.place))!;
    const car = fleetOf(c).cars.get(ch.car!)!;
    // Exercise this itinerary independently of the queue generated by other scheduled departures.
    c.day.plan = c.day.plan.filter((tour, i) => i < c.day.next || tour.chain === ch);
    const seen: string[] = [];
    stepThrough(v, DAY + 2, () => { const k = car.where?.spot.key ?? car.garage; if (k && seen[seen.length - 1] !== k) seen.push(k); });
    const home = `lot:${fleetOf(c).households.get(ch.household)!.lot}`;
    expect(seen[0]).toBe(home);
    if (ch.car !== null) expect(new Set(seen).size).toBeGreaterThanOrEqual(2);
    stepThrough(v, NIGHT_END - DAY - 1.8, () => {});
    // Nobody is put home by hand any more: at night a car is home, on its way home by road, or pulled in for the night.
    const astray = [...fleetOf(c).cars.values()].filter((x) => !atHome(c, x) && !onItsWay(c, x));
    expect(astray.map((x) => `${x.uid} at ${x.where?.spot.key}`)).toEqual([]);
  });

  it('never loses a household car: on the road, standing, or out of town, all season', () => {
    const v = cityAtYear(4);
    const c = inner(v);
    const total = fleetOf(c).cars.size;
    expect(total).toBeGreaterThan(20);
    let driving = 0;
    stepThrough(v, DAY + WEEKEND, () => {
      for (const e of v.drainEvents()) {
        if (e.t !== 'park' || e.dir !== 'out' || e.slot !== -1 || !e.play?.b) continue;
        const { a, b } = e.play;
        const end = (a.n - 1) * 3;
        expect(Math.hypot(a.frames[end]! - b.frames[0]!, a.frames[end + 1]! - b.frames[1]!)).toBeLessThan(0.01);
      }
      if (Math.round(c.clock / STEP) % 10 !== 0) return;
      const w = whereabouts(c);
      expect(w.lost).toBe(0);
      expect(w.standing + w.driving + w.away).toBe(total);
      driving = Math.max(driving, w.driving);
    });
    expect(driving).toBeGreaterThan(5);
  });

  it('calls at a petrol station when the tank runs low', () => {
    const v = cityAtYear(4);
    const c = inner(v);
    expect(c.lots.some((l) => l.kind === 'fuel' && l.level > 0)).toBe(true);
    for (const car of fleetOf(c).cars.values()) car.tank = 0.05;
    runDay(v);
    const chains = [...c.day.workChains.values(), ...c.day.chains.values()].flat();
    expect(chains.some((ch) => ch.stops.some((s) => s.kind === 'fuel'))).toBe(true);
    expect(v.fuel.reduce((n, f) => n + f.served, 0)).toBeGreaterThan(0);
    expect([...fleetOf(c).cars.values()].some((x) => x.tank === 1 || x.tank > 0.9)).toBe(true);
  });

  it('keeps existing cars across a live review and the next year', () => {
    const v = createCity(SAFFRON, 7);
    v.apply({ t: 'next' });
    const c = inner(v);
    const traffic = c.traffic;
    const fleet = [...fleetOf(c).cars.keys()];
    const road = c.net.roads.find((r) => r.level === 0 && polyLength(r.line) > 240)!;
    const uid = traffic.block({ road: road.id, s: polyLength(road.line) / 2 }, Infinity, 3, 'car');
    const pose = traffic.poseOf(uid);
    expect(pose).not.toBeNull();
    runDay(v);
    expect(v.phase).toBe('review');
    v.apply({ t: 'next' });
    expect(c.traffic.poseOf(uid)).toEqual(pose);
    runYear(v);
    expect(v.phase).toBe('yearStart');
    expect(c.traffic).toBe(traffic);
    expect(c.traffic.poseOf(uid)).toEqual(pose);
    expect(fleet.every((id) => fleetOf(c).cars.has(id))).toBe(true);
  });

  it('loads a saved dawn with household cars in their home parking', () => {
    const v = createCity(SAFFRON, 7);
    const back = createCity(SAFFRON, 7, JSON.parse(JSON.stringify(v.save())));
    const b = inner(back);
    expect([...fleetOf(b).cars.values()].every((x) => atHome(b, x))).toBe(true);
    const home = (back.parking ?? []).filter((p) => p.kind === 'home').flatMap((p) => p.cars.filter((k) => k.household !== undefined));
    const indoors = [...fleetOf(b).cars.values()].filter((car) => car.garage);
    expect(home.length + indoors.length).toBe(fleetOf(b).cars.size);
  });

  it('answers who lives in a home and what they do', () => {
    const v = cityAtYear(3);
    v.advance(40);
    const c = inner(v);
    const [lot, homes] = [...fleetOf(c).byLot].find(([, h]) => h.length > 0)!;
    const list = v.residents(lot);
    expect(list).toHaveLength(homes.length);
    const goes = list.find((r) => r.day.length > 0)!;
    expect(goes.day[goes.day.length - 1]!.label).toBe('Home');
    expect(v.household(goes.id)?.who).toBe(goes.who);
    const driving = [...c.day.chains.values()].flat().find((ch) => ch.car !== null && fleetOf(c).cars.get(ch.car)!.leg);
    if (driving) {
      const slot = v.carOf(driving.household);
      expect(slot).toBeGreaterThanOrEqual(0);
      expect(v.driver(slot)?.household).toBe(driving.household);
    }
  });
});

describe('the night', () => {
  it('ends a workday with no visitor standing anywhere, and only late households still out', () => {
    for (const year of [3, 5]) {
      const v = cityAtYear(year);
      const c = inner(v);
      stepThrough(v, DAY + 0.2, () => {});
      expect(v.dayKind).toBe('weekend');
      // Every visitor still standing at midnight is leaving now, by road: its stay is over, or it waits for a gap.
      const leaving = new Set([...c.day.stays.filter((s) => s.until <= c.clock + STEP).map((s) => s.parked), ...c.day.waiting.map((l) => l.leaving)]);
      const outsiders = [...c.day.spots.values()].flatMap((s) => s.cars.filter((e) => e.household === undefined && !leaving.has(e)).map(() => s.key));
      const why = c.day.stays.filter((s) => !s.leg.tour.chain).map((s) => `${s.leg.tour.purpose}:${s.until.toFixed(0)}`).join(' ') + ' wait ' + c.day.waiting.map((l) => `${l.tour.purpose}${l.heldAt.toFixed(0)}`).join(' ');
      expect(outsiders, why).toEqual([]);
      const late = clockAt(22, 'work');
      for (const car of fleetOf(c).cars.values()) {
        // Standing away from home; cars on the road or held at a jammed exit (some since the evening) are on their way.
        if (atHome(c, car) || car.leg || car.away || c.day.waiting.some((l) => l.car === car.uid)) continue;
        const day = (c.day.chains.get(car.household) ?? []).find((ch) => ch.car === car.uid);
        // Out at midnight only if their day was meant to bring them home after ten: a stop that ends late, or a long way back from it.
        const back = (p: Place): number => freeSeconds(c, p, day!.home) * LEAVE_PAD;
        const info = day?.stops.map((s) => `${s.kind}@${s.at.toFixed(0)}-${(s.until ?? s.at + s.stay).toFixed(0)}`).join(',') + ` now ${day?.now} where ${car.where?.spot.key} leg ${car.leg ? 'driving' : '-'}`;
        // The day as lived: a stop reached late (a jam on the way) ends late too.
        const ends = (s: NonNullable<typeof day>['stops'][number], i: number): number => Math.max(s.until ?? 0, s.at + (day!.late[i] ?? 0) + s.stay);
        expect(day?.stops.some((s, i) => ends(s, i) + back(s.place) > late), `${car.uid} out at midnight: ${info}`).toBe(true);
      }
    }
  });

  it('lets nobody in by a gate, or through, after the quiet hour', () => {
    const v = cityAtYear(4);
    const c = inner(v);
    const quiet = clockAt(QUIET_HOUR, 'work');
    expect(c.day.plan.filter((t) => 'gate' in t.from && t.purpose !== 'truck' && t.purpose !== 'event' && t.leave > quiet)).toEqual([]);
  });
});

describe('where cars stand when they may not', () => {
  it('a small street when every bay near is full, the sand by a public beach', () => {
    const v = cityAtYear(4);
    const c = inner(v);
    const lot = c.lots.find((l) => l.kind === 'shops' && l.level > 0 && [...c.day.spots.values()].some((s) => s.kind === 'street' && Math.hypot(s.at.x - (l.gx + l.w / 2) * 48, s.at.y - (l.gy + l.h / 2) * 48) < 48 * 6))
      ?? c.lots.find((l) => l.level > 0 && l.kind !== 'home')!;
    const rough = roughSpot(c, { lot: lot.id }, []);
    if (rough) expect(rough.kind).toBe('street');
    setRecord(c, 'pearl', { state: 'public' });
    buildSpots(c);
    const sand = c.day.spots.get('sand:pearl');
    expect(sand?.kind).toBe('sand');
    const beach = sand!.id;
    expect(roughSpot(c, { lot: beach }, [])?.kind).toMatch(/sand|street/);
    expect(roughSpot(c, { lot: beach }, [...c.day.spots.values()].filter((s) => s.kind === 'street').map((s) => s.key))?.kind).toBe('sand');
  });

  it('shows double-parked and street cars on their road, with a place along it and a side', () => {
    const v = cityAtYear(5);
    const c = inner(v);
    c.prices = { ...c.prices, fine: 0 };
    const kinds = new Set<string>();
    let roadOk = true;
    stepThrough(v, DAY - 10, () => {
      if (Math.round(c.clock / STEP) % 20 !== 0) return;
      for (const p of v.parking ?? []) {
        kinds.add(p.kind);
        if (p.kind === 'kerb' || p.kind === 'street' || p.kind === 'double') roadOk &&= p.road !== undefined && p.cars.every((x) => x.s !== undefined && (x.side === 1 || x.side === -1));
      }
    });
    expect(kinds.has('home')).toBe(true);
    expect(kinds.has('private')).toBe(true);
    expect(roadOk).toBe(true);
    expect([...kinds].some((k) => k === 'double' || k === 'street')).toBe(true);
  });

  it('keeps a household car\'s uid and tint from home to work', () => {
    const v = cityAtYear(3);
    const c = inner(v);
    const ch = [...c.day.chains.values()].flat().find((x) => x.car !== null && x.stops[0]?.kind === 'work')!;
    const car = fleetOf(c).cars.get(ch.car!)!;
    const seen = new Map<string, number>();
    stepThrough(v, 60, () => {
      for (const p of v.parking ?? []) for (const x of p.cars) if (x.uid === car.uid) seen.set(p.key, x.tint);
    });
    expect(seen.size).toBeGreaterThanOrEqual(1);
    expect([...seen.values()].every((t) => t === car.tint)).toBe(true);
  });
});
