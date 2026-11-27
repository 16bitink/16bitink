import type { Body } from './vehicleSize';
/** Everything one running Traffic holds, passed between its parts. */
import type { Rng } from './rng';
import type { CarStore } from './store';
import type { World } from './world';
import type { Arrival } from './trafficTypes';
import type { Pt } from './types';
import type { Routes } from './routes';
import type { Measure } from './measure';
import type { Services } from './services';

export interface Sim {
  world: World;
  readonly cars: CarStore;
  readonly rng: Rng;
  time: number;
  tick: number;
  tollNow: number;
  /** Weather: 1 = normal. */
  speed: number;
  trucksAllowed: boolean;
  arrivals: Arrival[];
  gaveUp: Arrival[];
  honks: Pt[];
  readonly routes: Routes;
  readonly measure: Measure;
  readonly services: Services;
  /** The city's parked cars round a box (src/sim/turning.ts plans turns clear of them). */
  parked?: (x0: number, y0: number, x1: number, y1: number) => readonly Body[];
}

export function receipt(sim: Sim, i: number): Arrival {
  const c = sim.cars;
  return {
    uid: c.uid[i]!, slot: i, tag: c.tag[i]!, seconds: sim.time - c.born[i]!, waited: c.waited[i]!, tolls: c.tolls[i]!, at: { x: c.x[i]!, y: c.y[i]! }, a: c.heading[i]!,
  };
}
