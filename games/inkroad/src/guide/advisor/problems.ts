import { APPROVAL_LETTER, CELL } from '../../sim/constants';
import type { CityView, Lot } from '../../sim/types';
import { inflow } from '../../ui/panels/controls';
import { byPain, dist, doubleParked, fullLots, isRed, junctionName, mid, nearestLot, roadMid, roadOf, sideOf, turnWords, worstMove } from '../places';
import { RED_SCORE, TOP, type Problem } from './types';

/**
 * What is wrong in the city right now, from what the player could see. Pure:
 * the same city says the same. `findProblems` is cheap enough for every second.
 */
const BUSY_WAIT = 8; // seconds: worth a word
const ONE_TURN = 0.45;
const ONE_SIDE = 0.52;
const WALK = 6 * CELL;
const DOUBLES = 2;
const EMPTY = 0.3;
const CROWDED = 0.9;
const LOW_BAR = 45;
const WORN = 0.35;
const FOUND = 0.6;
const DAWN = 34; // before this nothing has been measured
const pc = (n: number): string => `${Math.round(n * 100)}%`;
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function junctions(city: CityView): Problem[] {
  return byPain(city).filter((s) => s.wait >= BUSY_WAIT).slice(0, TOP).map((s) => ({
    id: `j${s.j.id}`, kind: 'junction', bar: 'trips', score: (isRed(s.grade) ? RED_SCORE : 20) + s.wait * 2, place: `${cap(junctionName(city, s.j))}: ${Math.round(s.wait)} s for each car`,
    cause: whyJam(city, s.j.id), at: { x: s.j.x, y: s.j.y }, r: Math.max(34, s.j.radius + 8), ref: s.j.id,
  }));
}

/** Why a junction is slow, in plain words. */
export function whyJam(city: CityView, node: number): string {
  const j = city.junctions.find((x) => x.id === node);
  if (!j) return '';
  const m = worstMove(city, node);
  const f = inflow(city.movements(node));
  if (m && m.share >= ONE_TURN) return `${pc(m.share)} of the waiting is one turn: ${turnWords(city, j, m)}.`;
  if (f.top >= ONE_SIDE) {
    const busiest = [...city.movements(node)].sort((a, b) => b.cars - a.cars)[0];
    const side = busiest ? sideOf(city, j, busiest.fromRoad) : '';
    return j.control === 'roundabout' ? `The stream from the ${side || 'busy side'} never lets the others in.` : `Most cars come from the ${side || 'same side'}, and share one queue.`;
  }
  if (j.control === 'yield') return 'All sides are busy and nobody is told whose turn it is.';
  return 'More cars come than it can carry.';
}

/** How a place's spaces are, as the player would see it. */
function parking(city: CityView): Problem[] {
  if (!city.tools.includes('parking') && !city.tools.includes('kerb')) return [];
  const out: Problem[] = [];
  const taken: Lot[] = [];
  for (const l of fullLots(city)) {
    if (taken.some((t) => dist(mid(t), mid(l)) < WALK)) continue;
    taken.push(l);
    const near = city.carParks.filter((p) => dist(mid(p), mid(l)) < WALK);
    const kerb = city.roads.some((r) => r.kerb && dist(roadMid(r), mid(l)) < WALK);
    out.push({
      id: `p${l.id}`, kind: 'parking', bar: 'parking', score: 40 + Math.min(30, l.w * l.h * l.level), place: `${l.name}: no space left`,
      cause: near.length === 0 && !kerb ? 'There is nowhere to park within a short walk.' : 'Every space is taken, so cars go round and round.', at: mid(l), r: l.w * 24, ref: l.id,
    });
    if (out.length >= 2) break;
  }
  return out;
}

function doubled(city: CityView): Problem[] {
  const list = doubleParked(city);
  if (list.length < DOUBLES) return [];
  const at = list[0]!;
  return [{
    id: 'double', kind: 'double', bar: 'parking', score: 30 + list.length * 6, place: `${list.length} cars double-parked near ${nearestLot(city, at)?.name ?? 'the shops'}`,
    cause: city.policies.inspectors === 0 ? 'Nobody checks, so they stop where they like.' : 'No free space near, and too few inspectors.', at, r: 34, ref: -1,
  }];
}

function prices(city: CityView): Problem[] {
  return city.carParks.filter((p) => p.occupancy > 0 && p.occupancy < EMPTY && city.prices.park > city.priceLimits.park.min && p.access).slice(0, 1).map((p) => ({
    id: `e${p.id}`, kind: 'empty', bar: 'cost', score: 24, place: `Car park by ${nearestLot(city, mid(p))?.name ?? 'the road'}: mostly empty`, cause: `Only ${pc(p.occupancy)} full. At ${city.prices.park} coins people stay away.`, at: mid(p), r: p.w * 24, ref: p.id,
  }));
}

function transit(city: CityView): Problem[] {
  return city.lines.filter((l) => l.crowding > CROWDED && l.works === 0 && l.mini === undefined).slice(0, 1).map((l) => ({
    id: `l${l.id}`, kind: 'crowded', bar: 'trips', score: 38, place: `${l.name}: full`, cause: 'People wait for the next one, or take the car.', at: l.path[0] ?? null, r: 40, ref: l.id,
  }));
}

function cutOff(city: CityView): Problem[] {
  return city.lots.filter((l) => l.level > 0 && !l.access && l.kind !== 'park' && l.kind !== 'square' && l.kind !== 'beach').slice(0, 1).map((l) => ({
    id: `c${l.id}`, kind: 'cutOff', bar: 'trips', score: 90, place: `${l.name}: cut off`, cause: 'No road reaches its door.', at: mid(l), r: l.w * 24, ref: l.id,
  }));
}

/** The biggest thing people paid last month. */
function whyDear(city: CityView): string {
  const i = city.lastLedger.income;
  const paid = ([['fines', 'fines'], ['tolls', 'tolls'], ['parking', 'parking'], ['fares', 'fares'], ['zone', 'the zone charge']] as const).map(([k, name]) => ({ name, n: i[k] })).sort((a, b) => b.n - a.n)[0];
  return paid && paid.n > 0 ? `Most of it is ${paid.name}.` : 'The signs look dear to them.';
}

function bars(city: CityView): Problem[] {
  const out: Problem[] = [];
  const where = (bar: string) => city.complaints.find((c) => c.bar === bar)?.at ?? null;
  if (city.bars.cost < LOW_BAR) out.push({ id: 'cost', kind: 'cost', bar: 'cost', score: 30 + LOW_BAR - city.bars.cost, place: 'People say it is too dear', cause: whyDear(city), at: where('cost'), r: 50, ref: -1 });
  if (city.bars.streets < LOW_BAR) {
    const digging = city.roads.filter((r) => r.works > 0).length + city.projects.length;
    out.push({ id: 'streets', kind: 'streets', bar: 'streets', score: 30 + LOW_BAR - city.bars.streets, place: 'The streets are not nice to live on', cause: digging > 0 ? 'Road works everywhere: noise and dust.' : 'Noise beside the big roads, and cars cutting through.', at: where('streets'), r: 50, ref: -1 });
  }
  if (city.approval < APPROVAL_LETTER && !city.def.years[city.year - 1]?.cannotLose) {
    const [worst] = (['trips', 'parking', 'cost', 'streets'] as const).slice().sort((a, b) => city.bars[a] - city.bars[b]);
    out.push({ id: 'approval', kind: 'approval', bar: worst ?? 'trips', score: 45, place: `Approval ${Math.round(city.approval)}: a Council letter tonight`, cause: `The worst of the four is ${cap(worst ?? 'trips')}. Start there.`, at: where(worst ?? 'trips'), r: 50, ref: -1 });
  }
  return out;
}

function purse(city: CityView): Problem[] {
  const f = city.forecast.nextMonth;
  // Half a year of it would empty the purse.
  if (f >= 0 || city.money + f * 6 > 0) return [];
  return [{ id: 'money', kind: 'money', bar: 'money', score: 60, place: 'The purse is running out', cause: `We lose ${Math.round(-f)} coins a month, and hold ${Math.round(city.money)}.`, at: null, r: 0, ref: -1 }];
}

function old(city: CityView): Problem[] {
  return (city.special?.ageing?.worst ?? []).filter((w) => w.condition < WORN).slice(0, 1).flatMap((w) => {
    const r = roadOf(city, w.road);
    return r ? [{ id: `w${r.id}`, kind: 'worn' as const, bar: 'trips' as const, score: 34 + (WORN - w.condition) * 60, place: `Road by ${nearestLot(city, roadMid(r))?.name ?? 'the edge'}: falling apart`, cause: 'Cars crawl round the holes.', at: roadMid(r), r: 50, ref: r.id }] : [];
  });
}

function places(city: CityView): Problem[] {
  const beach = (city.beaches ?? []).filter((b) => b.state === 'public' && b.visitors > 4 && b.found < FOUND).slice(0, 1).map((b): Problem => ({
    id: `b${b.id}`, kind: 'beach', bar: 'parking', score: 36, place: `${b.name}: only ${pc(b.found)} find a space`, cause: 'The rest stop on the shore road.', at: mid(b.rect), r: b.rect.w * 22, ref: -1,
  }));
  const fuel = (city.fuel ?? []).filter((f) => f.spill).slice(0, 1).flatMap((f): Problem[] => {
    const l = city.lots.find((x) => x.id === f.lot);
    return l ? [{ id: `f${f.lot}`, kind: 'fuel', bar: 'trips', score: 28, place: `${l.name}: the queue stands on the road`, cause: `${f.waiting} cars wait for ${f.pumps} pumps.`, at: mid(l), r: l.w * 24, ref: f.lot }] : [];
  });
  return [...beach, ...fuel];
}

/** Everything wrong now, worst first. */
export function findProblems(city: CityView): readonly Problem[] {
  if (city.phase === 'day' && city.year === 1 && city.season === 0 && city.clock < DAWN && city.dayKind !== 'weekend') return [];
  return [...junctions(city), ...parking(city), ...doubled(city), ...prices(city), ...transit(city), ...cutOff(city), ...bars(city), ...purse(city), ...old(city), ...places(city)]
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

export const topProblems = (city: CityView): readonly Problem[] => findProblems(city).slice(0, TOP);
/** What the badge counts: all that is red, at most three. */
export const redCount = (list: readonly Problem[]): number => Math.min(TOP, list.filter((p) => p.score >= RED_SCORE).length);
