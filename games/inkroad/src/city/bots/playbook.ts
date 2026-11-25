import type { CityView, Command } from '../../sim/types';
import { movesTonight, type Family, type Move } from './moves';
import { bestSite } from './movesBuild';
import { sickest, type Sick } from './tools';

/**
 * What a sensible player would do tonight with one kind of answer: no trying things on copies,
 * just the next step of each kind for the place that hurts. The first one that can be paid is taken.
 */
const WAIT = { yield: 8, round: 8, signal: 7, smart: 9 } as const;
const PARKING_LOW = 70;
/** Seconds waited at a junction in a day, all cars together, before it is worth money. */
const PAIN = 500;
const ROADS_BELOW = 60;
/** A flyover is for a purse that can stand it. */
const SPARE = 60;
const SPACE_KINDS = ['multi', 'lot', 'under'] as const;

const ok = (city: CityView, cmds: readonly Command[]): boolean => cmds.length > 0 && cmds.every((cmd) => city.quote(cmd).ok);
const build = (name: string, kind: string, cmds: readonly Command[], slow = 0): Move => ({ name, kind, family: 'build', cmds, slow });

/** The next thing to build at a sick junction. */
function junctionStep(city: CityView, s: Sick): Move | null {
  const node = s.node.id;
  const at = `${s.node.cell.gx},${s.node.cell.gy}`;
  const control = (to: 'roundabout' | 'signal' | 'smart'): Move | null =>
    (ok(city, [{ t: 'control', node, control: to }]) ? build(`${to} ${at}`, `control ${at}`, [{ t: 'control', node, control: to }]) : null);
  const now = s.node.control;
  if (now === 'yield' && s.wait >= WAIT.yield) return control('roundabout') ?? control('smart') ?? control('signal');
  if (now === 'roundabout' && s.wait >= WAIT.round) return control('smart') ?? widen(city, s, at) ?? (city.controls.includes('smart') ? null : control('signal'));
  if (now === 'signal' && s.wait >= WAIT.signal) return control('smart') ?? widen(city, s, at) ?? lift(city, s, at);
  return now === 'smart' && s.wait >= WAIT.smart ? widen(city, s, at) ?? lift(city, s, at) : null;
}

/** Two lanes on the arms that still have one, the busiest first. */
function widen(city: CityView, s: Sick, at: string): Move | null {
  const arms = s.node.arms.map((id) => city.roads.find((r) => r.id === id)!).filter((r) => r && r.type === 'street' && ok(city, [{ t: 'upgrade', road: r.id, type: 'avenue' }]))
    .sort((a, b) => city.roadStats(b.id).flow - city.roadStats(a.id).flow).slice(0, 2);
  return arms.length > 0 ? build(`widen ${at}`, `widen ${at}`, arms.map((r) => ({ t: 'upgrade', road: r.id, type: 'avenue' })), 1) : null;
}

function lift(city: CityView, s: Sick, at: string): Move | null {
  for (const m of [...city.movements(s.node.id)].filter((x) => !x.flyover && x.cars > 3).sort((a, b) => b.cars * b.wait - a.cars * a.wait).slice(0, 3)) {
    for (const level of [1, -1] as const) {
      const cmd: Command = { t: 'flyover', node: s.node.id, fromRoad: m.fromRoad, toRoad: m.toRoad, level };
      const q = city.quote(cmd);
      if (q.ok && q.cost + SPARE <= city.money) return build(`flyover ${at}`, `flyover ${at}`, [cmd], 2);
    }
  }
  return null;
}

/** More spaces where people complain of none. */
function spaces(city: CityView): readonly Move[] {
  if (city.bars.parking >= PARKING_LOW) return [];
  return city.complaints.filter((x) => x.bar === 'parking').flatMap(({ at }, i) => {
    for (const kind of SPACE_KINDS) {
      const site = city.parkKinds.includes(kind) ? bestSite(city, kind, at) : null;
      if (site) return [build(`park ${kind}`, `park ${i}`, [site])];
    }
    return [];
  });
}

function buildSteps(city: CityView): readonly Move[] {
  const steps = sickest(city, 4).filter((s) => s.pain >= PAIN).slice(0, 4).flatMap((s) => junctionStep(city, s) ?? []);
  const park = spaces(city);
  const road = movesTonight(city, ['build']).filter((m) => m.kind === 'road').slice(0, 1);
  const parkFirst = city.bars.parking < city.bars.trips ? park : [];
  const fresh = road.filter((m) => m.name === `road of year ${city.year}`);
  return [...parkFirst, ...fresh, ...steps, ...park, ...(city.bars.trips < ROADS_BELOW ? road : [])];
}

// ---------------------------------------------------------------- prices
const FAIR = { park: 2, parkPeak: 4, toll: 1, tollPeak: 3, costLow: 58 } as const;
const TOLLS = 2;

function priceSteps(city: CityView): readonly Move[] {
  const all = movesTonight(city, ['price']);
  const kind = (k: string): Move | undefined => all.find((m) => m.kind === k);
  const out: (Move | undefined)[] = [];
  const dear = city.bars.cost < FAIR.costLow;
  if (dear) return kind('park') && city.prices.park > 1 ? all.filter((m) => m.name === 'park down') : [];
  if (city.bars.parking < 76) out.push(...all.filter((m) => m.kind.startsWith('kerb')));
  if (city.prices.parkPeak < FAIR.parkPeak) out.push(kind('peak'));
  if (city.prices.park < FAIR.park) out.push(all.find((m) => m.name === 'park up'));
  if (city.bars.trips < 72 && city.roads.filter((r) => r.toll).length < TOLLS) out.push(kind('toll'));
  if (city.prices.tollPeak < FAIR.tollPeak) out.push(kind('peakToll'));
  if (city.prices.zone < 2) out.push(kind('zone'));
  return out.filter((m): m is Move => m !== undefined);
}

// ---------------------------------------------------------------- transit and rules
/** Lines this full are worth another one. */
const BUSY = 0.35;
const NOISY = 66;
function transitSteps(city: CityView): readonly Move[] {
  const all = movesTonight(city, ['transit']);
  const more = all.filter((m) => m.name.startsWith('more'));
  const full = city.lines.length === 0 || city.lines.some((l) => l.crowding > BUSY);
  const lines = !full ? [] : all.filter((m) => m.kind === 'bus' || m.kind === 'tram' || m.kind === 'boat');
  const metro = all.filter((m) => m.kind === 'metro');
  const lanes = city.lines.some((l) => l.crowding > BUSY) ? all.filter((m) => m.kind === 'buslane').slice(0, 1) : [];
  const ride = all.filter((m) => m.kind === 'ride');
  return [...more, ...metro, ...lines.filter((m) => m.kind !== 'bus'), ...lines.filter((m) => m.kind === 'bus').slice(0, 1), ...lanes, ...ride, ...all.filter((m) => m.kind === 'fare')];
}

function policySteps(city: CityView): readonly Move[] {
  const all = movesTonight(city, ['policy']);
  const kinds = ['truckHours', 'permits', ...(city.policies.inspectors < 3 ? ['inspectors'] : []), ...(city.policies.taxis < 2 ? ['taxis'] : []), 'nightWorks', ...(city.bars.streets < NOISY ? ['truckBan'] : []), 'license'];
  return kinds.flatMap((k) => all.filter((m) => m.kind === k).slice(0, 1));
}

const STEPS: Readonly<Record<Family, (city: CityView) => readonly Move[]>> = { build: buildSteps, price: priceSteps, transit: transitSteps, policy: policySteps };
export const stepsOf = (city: CityView, family: Family): readonly Move[] => STEPS[family](city);

export const costOf = (city: CityView, m: Move): number => m.cmds.reduce((n, cmd) => n + city.quote(cmd).cost, 0);

/** Do the first affordable steps, one of a kind, keeping a reserve. Returns their names. */
export function follow(city: CityView, steps: readonly Move[], max: number, reserve: number): readonly string[] {
  const kinds = new Set<string>();
  const done: string[] = [];
  for (const m of steps) {
    if (done.length >= max) break;
    if (kinds.has(m.kind) || !ok(city, m.cmds) || costOf(city, m) > city.money - reserve) continue;
    if (!m.cmds.every((cmd) => city.apply(cmd).ok)) continue;
    kinds.add(m.kind);
    done.push(m.name);
  }
  return done;
}

