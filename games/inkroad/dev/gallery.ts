import { createNetwork, addFlyover, planFlyover, setControl, setRoad } from '../src/sim/network';
import type { CityView, RoadDef } from '../src/sim/types';
import type { Network } from '../src/sim/trafficTypes';

/** Every kind of road, junction, deck and sign on one map, over a real city's lots and cars: for looking at the painting. */
const ROADS: readonly RoadDef[] = [
  { cells: [[0, 6], [55, 6]], type: 'boulevard' }, { cells: [[8, 2], [8, 36]], type: 'avenue' }, { cells: [[20, 2], [20, 30]], type: 'boulevard' },
  { cells: [[0, 18], [36, 18]], type: 'avenue' }, { cells: [[36, 18], [55, 18]], type: 'street' }, { cells: [[8, 18], [18, 28], [20, 28], [32, 28]], type: 'street' },
  { cells: [[20, 18], [32, 30], [32, 36]], type: 'street' }, { cells: [[32, 6], [32, 18]], type: 'street' }, { cells: [[26, 2], [26, 18]], type: 'highway' },
  { cells: [[20, 24], [32, 24]], type: 'avenue' }, { cells: [[0, 28], [8, 28]], type: 'highway' }, { cells: [[44, 6], [44, 30]], type: 'avenue' },
  { cells: [[32, 18], [44, 6]], type: 'street' }, { cells: [[12, 12], [20, 12]], type: 'street' }, { cells: [[14, 12], [14, 16], [12, 18]], type: 'street' },
];

const nodeAt = (n: Network, gx: number, gy: number): number => n.junctions.find((j) => j.cell.gx === gx && j.cell.gy === gy)?.id ?? -1;

function lift(n: Network, gx: number, gy: number, level: 1 | -1, from: number, to: number): Network {
  const j = n.junctions.find((q) => q.id === nodeAt(n, gx, gy));
  if (!j) return n;
  const plan = planFlyover(n, j.id, j.arms[from % j.arms.length]!, j.arms[to % j.arms.length]!, level);
  if (!plan.ok) { console.warn('[gallery]', gx, gy, plan.why); return n; }
  return addFlyover(n, plan);
}

export function galleryNetwork(map: readonly string[]): Network {
  let n = createNetwork(map, ROADS, [{ id: 'w', cell: [0, 18] }, { id: 'e', cell: [55, 6] }, { id: 'w2', cell: [0, 6] }]);
  const control = (gx: number, gy: number, c: 'signal' | 'roundabout' | 'smart'): void => { n = setControl(n, nodeAt(n, gx, gy), c); };
  control(8, 6, 'signal');
  control(20, 6, 'smart');
  control(8, 18, 'roundabout');
  control(20, 18, 'roundabout');
  control(32, 18, 'signal');
  control(44, 18, 'roundabout');
  control(20, 24, 'signal');
  n = lift(n, 8, 18, 1, 0, 3);
  n = lift(n, 20, 18, -1, 1, 3);
  n = lift(n, 8, 6, 1, 2, 1);
  n = lift(n, 44, 18, 1, 0, 2);
  n = lift(n, 44, 18, 1, 1, 3);
  n = lift(n, 44, 18, 1, 3, 0);
  const busy = n.roads.filter((r) => !r.flyover && r.line.length > 1);
  busy.slice(3, 5).forEach((r) => { n = setRoad(n, r.id, { busLane: true }); });
  busy.slice(6, 8).forEach((r) => { n = setRoad(n, r.id, { kerb: true }); });
  busy.slice(9, 11).forEach((r) => { n = setRoad(n, r.id, { works: 1 }); });
  busy.slice(12, 14).forEach((r) => { n = setRoad(n, r.id, { toll: true }); });
  busy.slice(15, 17).forEach((r) => { n = setRoad(n, r.id, { oneWay: true }); });
  return n;
}

/** The city with its roads swapped for the gallery's and no lots in the way. */
export function galleryCity(city: CityView): CityView {
  const n = galleryNetwork(city.def.map);
  const own: Partial<CityView> = { roads: n.roads, links: n.links, junctions: n.junctions, version: 999, lots: city.lots.map((l) => ({ ...l, level: 0 as const, opensYear: 99 })), carParks: [], hour: 13 };
  return new Proxy(city, { get: (t, k) => (k in own ? own[k as keyof CityView] : Reflect.get(t, k)) });
}
