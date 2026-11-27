import { describe, expect, it } from 'vitest';
import { PAYDAYS, WEEKEND_AT } from '../src/city/clock';
import { tripAccess } from '../src/city/places';
import { setRoad } from '../src/sim/network';
import { closedForWorks } from '../src/sim/roadGeom';
import type { Access } from '../src/sim/trafficTypes';
import type { CityView, Lot, Road } from '../src/sim/types';
import { cityAtYear, inner, ok, runDay } from './city-helpers';
import { TeleportWatch } from './teleport-helpers';

/** Road works close a road to cars, in a whole city (docs/inkroad-build.md "Road works close the road"). */
const roadOf = (a: Access | null): number => (a && 'road' in a ? a.road : -1);
const parkedIn = (v: CityView, lot: Lot): number[] => (v.parking ?? []).find((p) => p.key === `lot:${lot.id}`)?.cars.map((x) => x.uid) ?? [];

/** Saffron Bay, year 3, 20 s into the first workday: a street with cars on it, a cut-off block and one with another road. */
function scene(): { v: CityView; road: Road; cut: Lot; other: Lot } {
  const v = cityAtYear(3);
  const c = inner(v);
  v.advance(20);
  let best: { road: Road; cut: Lot; other: Lot; cars: number } | null = null;
  for (const r of c.net.roads) {
    if (r.type !== 'street' || !v.quote({ t: 'upgrade', road: r.id, type: 'avenue' }).ok) continue;
    const net = c.net;
    c.net = setRoad(net, r.id, { works: 1 });
    const lots = c.lots.filter((l) => l.level > 0 && l.access?.road === r.id && parkedIn(v, l).length > 0);
    const cut = lots.find((l) => roadOf(tripAccess(c, l)) === r.id);
    const other = lots.find((l) => roadOf(tripAccess(c, l)) !== r.id);
    c.net = net;
    const cars = c.traffic.carsOn(r.id).length;
    if (cut && other && (!best || cars > best.cars)) best = { road: r, cut, other, cars };
  }
  if (!best || best.cars === 0) throw new Error('no street with traffic, a cut-off block and a block with another road');
  return { v, road: best.road, cut: best.cut, other: best.other };
}

describe('road works close the road, in a city', () => {
  it('upgrading a street closes it: no car drives it, cut-off blocks keep their cars, nothing teleports, it reopens', () => {
    const { v, road, cut, other } = scene();
    const c = inner(v);
    const watch = new TeleportWatch(v);
    const kept = parkedIn(v, cut);
    // Begun 20 s into March: the rest of March, then three whole months; open again in July.
    expect(v.quote({ t: 'upgrade', road: road.id, type: 'avenue' })).toMatchObject({ works: 3, closes: true, opens: 4 });
    ok(v, { t: 'upgrade', road: road.id, type: 'avenue' });
    const at = c.clock;
    expect(closedForWorks(c.net.roads.find((r) => r.id === road.id)!)).toBe(true);
    // The block with another road in reach comes and goes by it; the other keeps its driveway and is cut off.
    expect(roadOf(tripAccess(c, other))).not.toBe(road.id);
    expect(c.day.spots.get(`lot:${other.id}`)!.access).toEqual(tripAccess(c, other));
    expect(roadOf(tripAccess(c, cut))).toBe(road.id);
    // Cars on it, or already turning into it, when the works began may drive on and off it; nobody else ever enters.
    const allowed = new Set(c.traffic.carsOn(road.id));
    const entered = new Set<number>();
    let lastOn = at, lost = 0;
    while (v.phase === 'day') {
      watch.step();
      const t = c.traffic.cars;
      const moving = c.traffic.carsOn(road.id).filter((uid) => { const i = t.slotOf.get(uid); return i !== undefined && t.state[i]! < 2; });
      if (c.clock - at < 3) for (const uid of moving) allowed.add(uid);
      for (const uid of moving) if (!allowed.has(uid)) entered.add(uid);
      if (moving.length > 0) lastOn = c.clock;
      if (c.clock < WEEKEND_AT && kept.some((uid) => !parkedIn(v, cut).includes(uid))) lost++;
    }
    expect([...entered]).toEqual([]);
    expect(lastOn).toBeLessThan(WEEKEND_AT);
    expect(lost).toBe(0);
    expect(watch.counts()).toEqual({});
    // The month it began in does not count: after the season one month of works is still to go.
    expect(c.net.roads.find((r) => r.id === road.id)!).toMatchObject({ works: 1, type: 'avenue' });
    v.apply({ t: 'next' });
    while (c.clock < PAYDAYS[0] + 1) v.advance(1);
    // June's payday: the works are done, the road is open, the cones are gone.
    const after = c.net.roads.find((r) => r.id === road.id)!;
    expect(after).toMatchObject({ works: 0, type: 'avenue' });
    expect(closedForWorks(after)).toBe(false);
    expect(tripAccess(c, other)).toEqual(c.lots.find((l) => l.id === other.id)!.access);
  }, 120_000);

  it('works always end: night works (open by day) and precast (no works at all)', () => {
    const v = cityAtYear(3);
    const c = inner(v);
    const street = (): Road => c.net.roads.find((r) => r.type === 'street' && v.quote({ t: 'upgrade', road: r.id, type: 'avenue' }).ok)!;
    c.policies = { ...c.policies, nightWorks: true };
    const night = street();
    expect(v.quote({ t: 'upgrade', road: night.id, type: 'avenue' })).toMatchObject({ works: 3, closes: false });
    ok(v, { t: 'upgrade', road: night.id, type: 'avenue' });
    expect(closedForWorks(c.net.roads.find((r) => r.id === night.id)!)).toBe(false);
    runDay(v);
    expect(c.net.roads.filter((r) => r.works > 0)).toEqual([]);
    // Precast: an upgrade with no works, and the quote says none.
    c.techs = [...c.techs, 'precast'];
    const quick = street();
    expect(v.quote({ t: 'upgrade', road: quick.id, type: 'avenue' })).toMatchObject({ works: 0 });
    ok(v, { t: 'upgrade', road: quick.id, type: 'avenue' });
    expect(c.net.roads.find((r) => r.id === quick.id)!.works).toBe(0);
  }, 120_000);
});
