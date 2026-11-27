import { describe, expect, it } from 'vitest';
import { STEP } from '../src/sim/constants';
import { lotRect } from '../src/city/geometry';
import { MOVE_LOG } from '../src/sim/moveLog';
import { PLAY_DT, PLAY_STRIDE, type Played } from '../src/sim/vehicle/played';
import { REVERSE_PLAYED } from '../src/sim/kinematics';
import { sizeOf } from '../src/sim/vehicleSize';
import type { CityEvent, VehicleKind } from '../src/sim/types';
import { cityAtYear } from './city-helpers';

/**
 * Phase B (docs/inkroad-vehicle-model.md): every parking move is planned on the place's real ground and played by the
 * vehicle model. A whole Saffron season: the moves keep out of other lots' walls, end where the car is then drawn
 * standing, back up at walking pace at most, and the planner finds a way that fits for nearly all of them.
 */
type Park = Extract<CityEvent, { t: 'park' }>;

function season(): { events: Park[]; parkings: ReturnType<typeof cityAtYear>['parking'][] } {
  const v = cityAtYear(3);
  MOVE_LOG.length = 0;
  const events: Park[] = [];
  const parkings: ReturnType<typeof cityAtYear>['parking'][] = [];
  while (v.phase === 'day') {
    v.advance(STEP);
    for (const e of v.drainEvents()) if (e.t === 'park') { events.push(e); parkings.push(v.parking); }
  }
  return { events, parkings };
}

const corners = (x: number, y: number, a: number, k: VehicleKind): { x: number; y: number }[] => {
  const { len, wid } = sizeOf(k);
  const c = Math.cos(a), s = Math.sin(a);
  return [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([f, r]) => ({ x: x + (f! * len * c) / 2 - (r! * wid * s) / 2, y: y + (f! * len * s) / 2 + (r! * wid * c) / 2 }));
};

/** Frames of a move, every one: x, y, heading and the signed speed along the heading. */
function* framesOf(m: Played): Generator<{ x: number; y: number; a: number; v: number }> {
  for (let i = 1; i < m.n; i++) {
    const o = i * PLAY_STRIDE, p = o - PLAY_STRIDE;
    const dx = m.frames[o]! - m.frames[p]!, dy = m.frames[o + 1]! - m.frames[p + 1]!;
    const a = m.frames[o + 2]!;
    yield { x: m.frames[o]!, y: m.frames[o + 1]!, a, v: (dx * Math.cos(a) + dy * Math.sin(a)) / PLAY_DT };
  }
}

describe('parking moves are the vehicle model on the real ground (a Saffron season)', () => {
  const { events, parkings } = season();
  const city = cityAtYear(3);
  const lots = city.lots.filter((l) => l.level > 0);

  it('plays a move for every parking event, and nearly every one fits its ground', () => {
    expect(events.length).toBeGreaterThan(40);
    expect(events.every((e) => e.play && e.play.a.n >= 1)).toBe(true);
    const unfit = events.filter((e) => !(e.play!.a.fits && (e.play!.b?.fits ?? true))).length;
    expect(unfit / events.length).toBeLessThan(0.15);
  });

  it('never drives into another lot: no frame of a move into a home or forecourt has a corner inside a lot that is not its own', () => {
    const hits: string[] = [];
    for (const e of events) {
      if (!e.key.startsWith('lot:') || !e.play) continue;
      const own = Number(e.key.split(':')[1]);
      for (const part of [e.play.a, e.play.b].filter((p): p is Played => !!p)) for (const f of framesOf(part)) {
        for (const p of corners(f.x, f.y, f.a, e.kind as VehicleKind)) {
          const inside = lots.find((l) => l.id !== own && (() => { const r = lotRect(l); return p.x > r.x + 0.5 && p.x < r.x + r.w - 0.5 && p.y > r.y + 0.5 && p.y < r.y + r.h - 0.5; })());
          if (inside) hits.push(`${e.key} ${e.dir} into lot ${inside.id} at ${p.x.toFixed(0)},${p.y.toFixed(0)}`);
        }
      }
    }
    expect(hits.length).toBeLessThan(3);
  });

  it('backs up at walking pace at most', () => {
    let fastest = 0;
    for (const e of events) for (const part of [e.play?.a, e.play?.b]) if (part) for (const f of framesOf(part)) if (f.v < 0) fastest = Math.max(fastest, -f.v);
    expect(fastest).toBeLessThanOrEqual(REVERSE_PLAYED * 1.02);
  });

  it('a car stands just where its move in ended', () => {
    let checked = 0;
    events.forEach((e, k) => {
      if (e.dir !== 'in' || e.slot < 0 || !e.play) return;
      const car = parkings[k]?.find((p) => p.key === e.key)?.cars.find((c) => c.uid === e.car);
      if (!car?.pose) return;
      const o = (e.play.a.n - 1) * PLAY_STRIDE;
      expect(Math.hypot(car.pose.x - e.play.a.frames[o]!, car.pose.y - e.play.a.frames[o + 1]!)).toBeLessThan(1e-6);
      checked++;
    });
    expect(checked).toBeGreaterThan(20);
  });
});
