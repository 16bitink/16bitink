import { VEHICLES } from '../sim/constants';
import type { Complaint, Id, Pt } from '../sim/types';
import type { Leg, Sore } from './day';
import { centreOf, distToLine } from './geometry';
import { nameOf, nearName } from './places';
import { COMPLAINTS, DRIVER_LINES, localise, residentFor } from './residents';
import { mixSeed } from './rng';
import type { City } from './state';
import { lotById } from './state';
import { CELL } from '../sim/constants';

const MAX_COMPLAINTS = 3;
const MIN_WEIGHT = 2;
const BARE = ['bus', 'tram'];

interface Pile { readonly sore: Sore; readonly weight: number }

/** Add up what hurt by kind and place, so the loudest real problem speaks first. */
function piles(c: City): readonly Pile[] {
  const map = new Map<string, Pile>();
  for (const s of c.day.stats.sores) {
    const key = `${s.kind}:${s.lot ?? `${Math.round(s.at.x / CELL / 3)},${Math.round(s.at.y / CELL / 3)}`}`;
    const was = map.get(key);
    map.set(key, { sore: was && was.sore.n >= s.n ? was.sore : s, weight: (was?.weight ?? 0) + s.weight });
  }
  return [...map.values()].sort((a, b) => b.weight - a.weight);
}

function write(c: City, s: Sore, weight: number, i: number): Complaint {
  const seed = mixSeed(c.seed, c.year, c.season, i, Math.round(s.at.x), Math.round(s.at.y));
  const who = residentFor(seed, c.def.style);
  const lines = COMPLAINTS[s.kind] ?? COMPLAINTS.late!;
  const line = lines[(seed >>> 8) % lines.length]!;
  const place = s.place ?? (s.lot !== null ? lotById(c, s.lot)?.name : undefined) ?? nearName(c, s.at);
  return { who: who.name, animal: who.animal, text: localise(line, c.def.style).replaceAll('{place}', place).replaceAll('{n}', String(s.n)), bar: s.bar, at: s.at, weight };
}

/** Street sores come from the map, not from trips. */
function streetSores(c: City): readonly Sore[] {
  const out: Sore[] = [];
  for (const r of c.net.roads) {
    if (r.works > 0) out.push({ bar: 'streets', kind: 'works', at: r.line[Math.floor(r.line.length / 2)]!, weight: 4, lot: null, n: 0 });
    if (r.type !== 'boulevard' && r.type !== 'highway') continue;
    const home = c.lots.find((l) => l.kind === 'home' && l.level > 0 && distToLine(r.line, centreOf(l)) < CELL * 2.6);
    if (home) out.push({ bar: 'streets', kind: 'noise', at: centreOf(home), weight: 4, lot: home.id, n: 0 });
  }
  return out;
}

/** The top three of the day: different kinds first, then whatever is loudest. */
export function writeComplaints(c: City): readonly Complaint[] {
  c.day.stats.sores.push(...streetSores(c));
  const all = piles(c).filter((p) => p.weight >= MIN_WEIGHT);
  const picked: Pile[] = [];
  const kinds = new Set<string>();
  for (const p of all) {
    if (picked.length >= MAX_COMPLAINTS || kinds.has(p.sore.kind)) continue;
    kinds.add(p.sore.kind);
    picked.push(p);
  }
  if (picked.length === 0) return [happy(c)];
  return picked.map((p, i) => write(c, p.sore, p.weight, i));
}

function happy(c: City): Complaint {
  const homes = c.lots.filter((l) => l.kind === 'home' && l.level > 0);
  const home = homes[mixSeed(c.seed, c.year, c.season) % Math.max(1, homes.length)];
  const at = home ? centreOf(home) : { x: 0, y: 0 };
  return write(c, { bar: 'trips', kind: 'happy', at, weight: 1, lot: home?.id ?? null, n: 0 }, 0, 0);
}

/** The three worst places, for the replaced screen. */
export function worstSpots(c: City): readonly { readonly at: Pt; readonly text: string }[] {
  const why: Readonly<Record<string, string>> = {
    late: 'Long trips from', gaveUp: 'Drivers gave up near', stayed: 'People stopped leaving', search: 'No space to park at', walk: 'Parking far from',
    illegal: 'Double parking at', none: 'Turned away at', pay: 'Too dear:', home: 'Charged at home:', fine: 'Fined too often at', noise: 'Noise by', works: 'Dust by',
  };
  return piles(c).slice(0, MAX_COMPLAINTS).map((p) => ({
    at: p.sore.at, text: `${why[p.sore.kind] ?? 'Trouble at'} ${(p.sore.lot !== null ? lotById(c, p.sore.lot)?.name : undefined) ?? nearName(c, p.sore.at)}`,
  }));
}

const FURIOUS = 0.45;
function lineKind(c: City, i: number, leg: Leg): string {
  const state = c.traffic.cars.state[i];
  if (state === 1) return 'searching';
  if (state === 2) return 'doubled';
  if (state === 3) return 'broken';
  if ((c.traffic.cars.anger[i] ?? 0) > FURIOUS) return 'stuck';
  if (leg.mode === 'taxi') return 'taxi';
  return leg.out ? leg.tour.purpose : 'home';
}

/** What the driver of a car slot says. */
export function driverOf(c: City, i: number): { readonly who: string; readonly animal: string; readonly text: string } | null {
  const cars = c.traffic.cars;
  if (i < 0 || i >= cars.count || !cars.alive[i]) return null;
  const uid = cars.uid[i]!;
  const who = residentFor(mixSeed(uid, c.seed) >>> 3, c.def.style);
  const kind = VEHICLES[cars.kind[i]!] ?? 'car';
  const tag = c.traffic.routeOf(uid)?.tag;
  const leg = tag === undefined || tag < 0 ? undefined : c.day.legs[tag];
  const lines = leg ? DRIVER_LINES[lineKind(c, i, leg)]! : DRIVER_LINES[BARE.includes(kind) ? kind : 'broken']!;
  const text = lines[uid % lines.length]!;
  const names = leg ? { from: nameOf(c, leg.out ? leg.tour.from : leg.tour.to), to: nameOf(c, leg.target) } : { from: '', to: '' };
  return { who: who.name, animal: who.animal, text: localise(text, c.def.style).replaceAll('{to}', names.to).replaceAll('{from}', names.from) };
}

interface Share { readonly name: string; readonly share: number }
const TRACE_MAX = 5;

function shares(names: readonly string[]): readonly Share[] {
  const count = new Map<string, number>();
  for (const n of names) count.set(n, (count.get(n) ?? 0) + 1);
  return [...count].map(([name, n]) => ({ name, share: n / names.length })).sort((a, b) => b.share - a.share || a.name.localeCompare(b.name)).slice(0, TRACE_MAX);
}

export function traceRoad(c: City, road: Id): { readonly from: readonly Share[]; readonly to: readonly Share[] } {
  const legs = c.traffic.carsOn(road).flatMap((uid) => {
    const tag = c.traffic.routeOf(uid)?.tag;
    const leg = tag === undefined || tag < 0 ? undefined : c.day.legs[tag];
    return leg ? [leg] : [];
  });
  if (legs.length === 0) return { from: [], to: [] };
  return { from: shares(legs.map((l) => nameOf(c, l.out ? l.tour.from : l.tour.to))), to: shares(legs.map((l) => nameOf(c, l.target))) };
}

