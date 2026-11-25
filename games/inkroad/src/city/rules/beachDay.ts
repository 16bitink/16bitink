import { mean } from '../day';
import type { Place } from '../day';
import { areaOf, centreOf, clamp, distPt } from '../geometry';
import { CELL } from '../../sim/constants';
import { gateNodes } from '../places';
import { createDice, mixSeed, type Dice } from '../rng';
import { sore } from '../score';
import type { City, DayReport } from '../state';
import { emit } from '../state';
import { HOME_TOURS } from '../tune';
import type { BeachDef } from '../../sim/types';
import { beachDefs, beachLot, publicBeaches, recordOf, setRecord } from './beach';

/** A day at the sea: who drives there, and what the city feels about its beaches at night. */
export const SEA = {
  /** Cars on a plain day: some, and more for every home cell. */
  base: 7, perHomeCell: 0.055, max: 46,
  /** Spring, summer, autumn, winter. */
  season: [0.6, 1.9, 0.7, 0.25],
  from: 28, to: 62, stay: [20, 32], outside: 0.25, near: 18,
  /** The summer weekend: sandcastles. */
  contest: { season: 1, tours: 8, perYear: 0.6, from: 36, to: 50 },
  /** Streets points. */
  joy: 2.5, joyMax: 6, sour: -3, par: 0.55, some: 4,
  closed: 2, shock: 4, fade: 0.65,
} as const;
/** The kind of person, for their dice (see WHO in demand.ts). */
const BATHER = 71;
const FICKLE = 5;

interface SeaDraw { readonly from: Place; readonly to: Place; readonly purpose: 'event'; readonly leave: number; readonly stay: number; readonly owns?: boolean; readonly who: readonly number[] }

/** Cars that would like to go to this beach today. */
export function bathers(c: City, b: BeachDef): number {
  const cells = c.lots.reduce((n, l) => n + (l.kind === 'home' && l.level > 0 ? areaOf(l) : 0), 0);
  return Math.round(Math.min(SEA.max, (SEA.base + cells * SEA.perHomeCell) * (SEA.season[c.season] ?? 1) * (b.pull ?? 1)));
}

const contestTours = (c: City): number => (c.season === SEA.contest.season ? Math.round(SEA.contest.tours + SEA.contest.perYear * c.year) : 0);

/** A home, the bigger and nearer the likelier. */
function pickHome(c: City, dice: Dice, b: BeachDef): Place | null {
  const homes = c.lots.filter((l) => l.kind === 'home' && l.level > 0 && l.access);
  const at = centreOf(b);
  const weights = homes.map((l) => areaOf(l) * (HOME_TOURS[l.level] ?? 0) * Math.exp(-distPt(at, centreOf(l)) / (SEA.near * CELL)));
  let left = dice.next() * weights.reduce((n, w) => n + w, 0);
  for (let i = 0; i < homes.length; i++) { left -= weights[i]!; if (left <= 0) return { lot: homes[i]!.id }; }
  return homes.length > 0 ? { lot: homes[homes.length - 1]!.id } : null;
}

function pickGate(c: City, dice: Dice): Place | null {
  const nodes = gateNodes(c);
  const open = c.def.gates.filter((g) => (g.opensYear ?? 1) <= c.year && nodes.has(g.id));
  return open.length > 0 ? { gate: nodes.get(dice.pick(open).id)! } : null;
}

/** Everybody's trip to the sea, each with their own dice. */
export function beachDraws(c: City): readonly SeaDraw[] {
  const out: SeaDraw[] = [];
  for (const [k, b] of publicBeaches(c).entries()) {
    const lot = beachLot(c, b);
    if (!lot?.access) continue;
    const plain = bathers(c, b);
    const all = plain + contestTours(c);
    for (let i = 0; i < all; i++) {
      const who = [BATHER, k, i, i % FICKLE === FICKLE - 1 ? c.year * 4 + c.season : -1];
      const dice = createDice(mixSeed(c.seed, ...who));
      const outside = dice.chance(SEA.outside);
      const from = outside ? pickGate(c, dice) : pickHome(c, dice, b);
      if (!from) continue;
      const w = i < plain ? SEA : SEA.contest;
      out.push({ from, to: { lot: lot.id }, purpose: 'event', leave: dice.range(w.from, w.to), stay: dice.range(SEA.stay[0], SEA.stay[1]), ...(outside ? { owns: true } : {}), who });
    }
  }
  return out;
}

/** Dawn: a word about the sandcastles. */
export function dawnSea(c: City): void {
  if (c.season !== SEA.contest.season) return;
  const b = publicBeaches(c)[0];
  if (b && beachLot(c, b)?.access) emit(c, { t: 'toast', who: 'miko', text: `Sandcastle weekend at ${b.name}. Every castle arrives by car.` });
}

/** Night: what the day at the sea was like. Streets points. */
export function nightSea(c: City, r: DayReport): number {
  let streets = 0;
  for (const b of beachDefs(c)) {
    const rec = recordOf(c, b.id);
    if (rec?.state === 'public') streets += publicNight(c, b);
    if (rec?.state === 'sold') streets -= soldNight(c, b, rec.year);
  }
  return r.count > 0 ? streets : 0;
}

function publicNight(c: City, b: BeachDef): number {
  const lot = beachLot(c, b);
  const tally = lot && c.day.stats.lots.get(lot.id)?.parking;
  const visitors = Math.round(tally?.w ?? 0);
  const found = mean(c.day.stats.found.get(`district:${b.name}`), 1);
  setRecord(c, b.id, { visitors, found });
  if (visitors < SEA.some) return 0;
  if (found < SEA.par) sore(c, { bar: 'streets', kind: 'shoreFull', at: centreOf(b), weight: 2 + (SEA.par - found) * 6, lot: lot?.id ?? null, n: visitors });
  return clamp(SEA.joy + (found - SEA.par) * (SEA.joyMax - SEA.joy) / (1 - SEA.par) + Math.min(0, found - SEA.par) * 6, SEA.sour, SEA.joyMax);
}

function soldNight(c: City, b: BeachDef, year: number): number {
  const seasons = (c.year - year) * 4 + c.season;
  const pain = SEA.closed + SEA.shock * SEA.fade ** seasons;
  sore(c, { bar: 'streets', kind: 'seaClosed', at: centreOf(b), weight: pain, lot: null, n: 0, place: b.name });
  return pain;
}
