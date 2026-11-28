import { describe, expect, it } from 'vitest';
import { createCity } from '../src/city/city';
import { callTaxi } from '../src/city/kerbside';
import { finish, newLeg } from '../src/city/legs';
import { STEP } from '../src/sim/constants';
import { PAID_CITIES } from '../content/paid';
import type { CityView } from '../src/sim/types';
import { cityAtYear, inner } from './city-helpers';
import { TeleportWatch } from './teleport-helpers';

/** A city jumped to the first day of a year (Old Harbour is the first paid city). */
function harbourAt(year: number): CityView {
  const v = createCity(PAID_CITIES[0]!, 3);
  const c = inner(v);
  c.money = 9000;
  while (v.year < year) { c.phase = 'yearEnd'; v.apply({ t: 'next' }); }
  v.apply({ t: 'next' });
  return v;
}

const CASES: readonly { readonly name: string; readonly make: () => CityView }[] = [
  { name: 'Saffron Bay year 3', make: () => cityAtYear(3) },
  { name: 'Saffron Bay year 6', make: () => cityAtYear(6) },
  { name: 'Old Harbour year 4', make: () => harbourAt(4) },
];

describe('cars never teleport (a whole season: workday, night, weekend)', () => {
  for (const k of CASES) {
    it(`${k.name}: every car arrives and leaves by road, every move animated`, () => {
      const w = new TeleportWatch(k.make());
      w.season();
      const counts = w.counts();
      if (process.env.TELEPORT_LOG) console.log(k.name, w.steps, 'steps', w.events, 'park events', `\n${Object.entries(counts).map(([why, n]) => `  ${n}\t${why}`).join('\n')}\n${w.found.filter((f) => !process.env.TELEPORT_CAUSE || f.cause.includes(process.env.TELEPORT_CAUSE)).slice(0, Number(process.env.TELEPORT_LOG) || 0).map((f) => `  @${f.clock} #${f.uid} ${f.cause}: ${f.detail}`).join('\n')}`);
      expect(w.events).toBeGreaterThan(100);
      expect(counts).toEqual({});
    }, 120_000);
  }
});

describe('vehicle handoffs near buildings', () => {
  function setup() {
    const c = inner(cityAtYear(3));
    c.traffic.startDay();
    const gates = c.net.junctions.filter((j) => j.gate !== undefined);
    const lot = c.lots.find((l) => l.level > 0 && l.access && gates.some((j) =>
      c.traffic.estimate({ gate: j.id }, l.access!, 1).reachable))!;
    const home = { lot: lot.id };
    const gate = { gate: gates.find((j) => c.traffic.estimate({ gate: j.id }, lot.access!, 1).reachable)!.id };
    const tour = { id: 1, from: gate, to: home, purpose: 'shop' as const, leave: 0, until: null, stay: 10, owns: false, value: 1, seed: 0.5 };
    return { c, gates, lot, home, gate, tour };
  }

  it('keeps a car at its last driven pose if no parking handoff exists', () => {
    const { c, lot, gate, tour } = setup();
    const leg = newLeg(c, tour, true, { mode: 'car', minutes: 0, seconds: 0, coins: 0, spot: null, lines: [] });
    const uid = c.traffic.spawn({ from: gate, to: lot.access!, kind: 'car', value: 1, tag: 0 });
    expect(uid).toBeGreaterThan(0);
    let arrived = false;
    for (let t = 0; t < 120 && !arrived; t += STEP) {
      c.traffic.step();
      arrived = c.traffic.drainArrivals().some((a) => a.uid === uid);
    }
    expect(arrived).toBe(true);
    const at = c.traffic.poseOf(uid)!;
    finish(c, leg, uid);
    for (let i = 0; i < 30; i++) c.traffic.step();
    expect(c.traffic.poseOf(uid)).toMatchObject({ x: at.x, y: at.y, a: at.a, v: 0 });
    const slot = c.traffic.cars.uid.indexOf(uid);
    expect(c.traffic.cars.state[slot]).not.toBe(4);
  });

  it('dispatches a taxi from an intercity gate to a local pickup', () => {
    const { c, gates, home, gate, tour } = setup();
    const rider = newLeg(c, { ...tour, from: home, to: gate }, true, { mode: 'taxi', minutes: 0, seconds: 0, coins: 0, spot: null, lines: [] });
    expect(callTaxi(c, rider)).toBe(true);
    const pickup = c.day.legs.find((l) => l.then === rider)!;
    expect(pickup.from).toHaveProperty('gate');
    expect(pickup.target).toEqual(home);
    const at = c.traffic.poseOf(pickup.uid)!;
    expect(Math.min(...gates.map((j) => Math.hypot(at.x - j.x, at.y - j.y)))).toBeLessThan(30);
  });
});
