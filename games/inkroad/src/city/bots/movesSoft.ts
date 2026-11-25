import { CELL } from '../../sim/constants';
import type { Cell, CityView, Command, Policies } from '../../sim/types';
import { BOATS, BUSES, METROS } from './atlas';
import type { Family, Move } from './moves';
import { bestSite } from './movesBuild';
import { stopNear } from './tools';

/** Answers without concrete: prices, lines, rules. */
const one = (family: Family) => (name: string, kind: string, cmds: readonly Command[], slow = 0): Move => ({ name, kind, family, cmds, slow });

// ---------------------------------------------------------------- transit
function stopsFor(city: CityView, names: readonly string[], gap: number): readonly Cell[] {
  const stops: Cell[] = [];
  for (const n of names) {
    const l = city.lots.find((x) => x.name === n && x.level > 0);
    const s = l ? stopNear(city, { x: (l.gx + l.w / 2) * CELL, y: (l.gy + l.h / 2) * CELL }) : null;
    if (s && stops.every((p) => Math.hypot(p.gx - s.gx, p.gy - s.gy) >= gap)) stops.push(s);
  }
  return stops;
}

const taken = (city: CityView, mode: string, stops: readonly Cell[]): boolean =>
  city.lines.some((l) => l.mode === mode && l.stops.length > 0 && stops.length > 0 && l.stops[0]!.gx === stops[0]!.gx && l.stops[0]!.gy === stops[0]!.gy);

function lineMoves(city: CityView, mode: 'bus' | 'tram' | 'metro', lists: readonly (readonly string[])[], gap: number, slow: number): Move[] {
  if (!city.tools.includes(mode)) return [];
  return lists.flatMap((names) => {
    const stops = stopsFor(city, names, gap);
    return stops.length > 1 && !taken(city, mode, stops) ? [one('transit')(`${mode} ${names[0]}`, mode, [{ t: 'line', mode, stops }], slow)] : [];
  });
}

const boatMoves = (city: CityView): Move[] =>
  (!city.tools.includes('boat') ? [] : (BOATS[city.def.id] ?? []).flatMap((stops) => (taken(city, 'boat', stops) ? [] : [one('transit')('boat', 'boat', [{ t: 'line', mode: 'boat', stops }], 1)])));

const FULL = 0.7;
const EMPTY = 0.15;
function fleetMoves(city: CityView): Move[] {
  const move = one('transit');
  return city.lines.flatMap((l) => {
    if (l.works > 0) return [];
    if (l.crowding > FULL && l.vehicles < 6) return [move(`more ${l.mode}`, 'fleet', [{ t: 'lineVehicles', line: l.id, vehicles: Math.min(6, l.vehicles + 2) }])];
    return l.crowding < EMPTY && l.vehicles > 1 ? [move(`fewer ${l.mode}`, 'fleet', [{ t: 'lineVehicles', line: l.id, vehicles: l.vehicles - 1 }])] : [];
  });
}

function laneMoves(city: CityView): Move[] {
  if (!city.tools.includes('buslane')) return [];
  const used = city.roads.filter((r) => !r.busLane && r.type !== 'street' && city.lines.some((l) => l.works === 0 && r.cells.slice(1, -1).some((x) => l.path.some((p) => Math.abs(p.x - x.gx * CELL) + Math.abs(p.y - x.gy * CELL) < CELL / 2))));
  return used.sort((a, b) => city.roadStats(b.id).flow - city.roadStats(a.id).flow).slice(0, 2).map((r) => one('transit')(`bus lane ${r.id}`, 'buslane', [{ t: 'busLane', road: r.id, on: true }]));
}

function rideMoves(city: CityView): Move[] {
  if (!city.parkKinds.includes('ride')) return [];
  const ends = city.lines.filter((l) => l.works === 0).flatMap((l) => [l.stops[0]!, l.stops[l.stops.length - 1]!]);
  return ends.slice(0, 3).flatMap((s) => {
    const site = bestSite(city, 'ride', { x: s.gx * CELL, y: s.gy * CELL });
    return site ? [one('transit')('park and ride', 'ride', [site])] : [];
  });
}

export function transitMoves(city: CityView): readonly Move[] {
  const lists = BUSES[city.def.id] ?? [];
  const fare = city.phase === 'review' && city.priceLimits.fare.open && city.prices.fare > city.priceLimits.fare.min
    ? [one('transit')('fare down', 'fare', [{ t: 'prices', prices: { fare: city.priceLimits.fare.min } }])] : [];
  return [
    ...lineMoves(city, 'bus', lists, 2, 0), ...lineMoves(city, 'tram', lists.slice(0, 3), 2, 2), ...lineMoves(city, 'metro', METROS[city.def.id] ?? [], 3, 3),
    ...boatMoves(city), ...fleetMoves(city), ...laneMoves(city), ...rideMoves(city), ...fare,
  ];
}

// ---------------------------------------------------------------- prices
const busyRoads = (city: CityView) =>
  [...city.roads].filter((r) => !r.toll && !r.fixed && !r.flyover).sort((a, b) => city.roadStats(b.id).flow - city.roadStats(a.id).flow);

const FULL_LOT = 0.85;
function kerbMoves(city: CityView): Move[] {
  const full = city.lots.filter((l) => l.level > 0 && l.kind !== 'home' && city.lotMood(l.id).parking > FULL_LOT).map((l) => ({ x: (l.gx + l.w / 2) * CELL, y: (l.gy + l.h / 2) * CELL }));
  return [...city.complaints.filter((x) => x.bar === 'parking').map((x) => x.at), ...full].slice(0, 4).map((at) => ({ at })).flatMap((moan) => {
    const near = city.roads.filter((r) => !r.kerb && r.level === 0 && !r.flyover && r.type !== 'highway' && !r.bridge)
      .map((r) => ({ r, d: Math.min(...r.line.map((p) => Math.hypot(p.x - moan.at.x, p.y - moan.at.y))) })).sort((a, b) => a.d - b.d)[0];
    return near && near.d < CELL * 5 ? [one('price')('kerb bays', `kerb ${near.r.id}`, [{ t: 'kerb', road: near.r.id, on: true }])] : [];
  });
}

export function priceMoves(city: CityView): readonly Move[] {
  const move = one('price');
  const L = city.priceLimits;
  const tolls = busyRoads(city).slice(0, 3).map((r) => move(`toll ${r.id}`, 'toll', [{ t: 'toll', road: r.id, on: true }]));
  const out = [...kerbMoves(city), ...(city.tools.includes('toll') ? tolls : [])];
  if (city.phase !== 'review') return out;
  const set = (name: string, kind: string, prices: Partial<CityView['prices']>): void => { out.push(move(name, kind, [{ t: 'prices', prices }])); };
  if (L.park.open) {
    if (city.prices.parkPeak < L.parkPeak.max) set('peak park up', 'peak', { parkPeak: L.parkPeak.max });
    if (city.prices.park < L.park.max) set('park up', 'park', { park: L.park.max, parkPeak: L.parkPeak.max });
    if (city.prices.park > L.park.min) set('park down', 'park', { park: L.park.min, parkPeak: L.parkPeak.min });
  }
  if (L.toll.open && city.roads.some((r) => r.toll)) {
    if (city.prices.tollPeak < L.tollPeak.max) set('peak toll up', 'peakToll', { tollPeak: L.tollPeak.max });
    if (city.prices.toll > L.toll.min) set('toll off peak', 'offToll', { toll: L.toll.min });
  }
  if (L.zone.open && city.prices.zone < L.zone.max) set('zone up', 'zone', { zone: L.zone.max });
  return out;
}

// ---------------------------------------------------------------- rules
export function policyMoves(city: CityView): readonly Move[] {
  const move = one('policy');
  const open = (k: keyof Policies): boolean => city.openPolicies.includes(k);
  const p = city.policies;
  const out: Move[] = [];
  const rule = (kind: string, policies: Partial<Policies>): void => { out.push(move(kind, kind, [{ t: 'policies', policies }])); };
  if (open('truckHours') && !p.truckHours) rule('truckHours', { truckHours: true });
  if (open('taxis') && p.taxis < 3) rule('taxis', { taxis: Math.min(3, p.taxis + 2) });
  if (open('permits') && !p.permits) rule('permits', { permits: true });
  if (open('nightWorks') && !p.nightWorks) rule('nightWorks', { nightWorks: true });
  if (open('inspectors') && p.inspectors < 5) rule('inspectors', { inspectors: Math.min(5, p.inspectors + 2) });
  if (open('inspectors') && city.phase === 'review' && city.prices.fine < city.priceLimits.fine.max && city.priceLimits.fine.open) out.push(move('fine up', 'fine', [{ t: 'prices', prices: { fine: city.priceLimits.fine.max } }]));
  const noisy = [...city.roads].filter((r) => !r.truckBan && !r.fixed && r.level === 0).sort((a, b) => city.roadStats(b.id).flow - city.roadStats(a.id).flow).slice(0, 2);
  for (const r of noisy) out.push(move(`lorry ban ${r.id}`, 'truckBan', [{ t: 'truckBan', road: r.id, on: true }]));
  return out;
}
