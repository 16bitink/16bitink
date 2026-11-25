import { CELL } from '../sim/constants';
import type { Cell, CityView, Id, Junction, Lot, Movement, Pt, Road } from '../sim/types';

/** Plain questions about the city, for steps and for the advisor. Pure. */
const MIN_ARMS = 3;
const FEW_CARS = 3;
const FULL = 0.97;

export const ptOf = (c: Cell): Pt => ({ x: c.gx * CELL, y: c.gy * CELL });
export const mid = (b: { readonly gx: number; readonly gy: number; readonly w: number; readonly h: number }): Pt => ({ x: (b.gx + b.w / 2) * CELL, y: (b.gy + b.h / 2) * CELL });
export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);
/** The 'kind' of a goal before its argument, and the argument. */
export function goalParts(city: Pick<CityView, 'def' | 'year'>): { readonly head: string; readonly arg: string } {
  const kind = city.def.years[city.year - 1]?.goal.kind ?? '';
  const i = kind.search(/[@:]/);
  return i < 0 ? { head: kind, arg: '' } : { head: kind.slice(0, i), arg: kind.slice(i + 1) };
}

export const junctionOf = (city: Pick<CityView, 'junctions'>, id: Id): Junction | undefined => city.junctions.find((j) => j.id === id);
export const roadOf = (city: Pick<CityView, 'roads'>, id: Id): Road | undefined => city.roads.find((r) => r.id === id);
export const realJunctions = (city: Pick<CityView, 'junctions'>): readonly Junction[] => city.junctions.filter((j) => !j.ramp && j.arms.length >= MIN_ARMS);

/** The junction the year's goal names, or the one with most arms. */
export function mainJunction(city: CityView): Junction | null {
  const { head, arg } = goalParts(city);
  const all = realJunctions(city);
  if (head === 'wait') {
    const [gx, gy] = arg.split(',').map(Number);
    const named = all.find((j) => j.cell.gx === gx && j.cell.gy === gy);
    if (named) return named;
  }
  return [...all].sort((a, b) => b.arms.length - a.arms.length || a.id - b.id)[0] ?? null;
}

/** Junctions by the waiting they cause now, worst first. */
export function byPain(city: CityView): readonly { readonly j: Junction; readonly wait: number; readonly cars: number; readonly grade: string }[] {
  return realJunctions(city).map((j) => ({ j, ...city.junctionStats(j.id) })).filter((s) => s.cars >= FEW_CARS)
    .sort((a, b) => b.wait * Math.sqrt(b.cars) - a.wait * Math.sqrt(a.cars) || a.j.id - b.j.id);
}

export const RED = new Set(['D', 'E', 'F']);
export const isRed = (grade: string): boolean => RED.has(grade);
export const isCalm = (grade: string): boolean => grade === 'A' || grade === 'B';

export function worstMove(city: CityView, node: Id): Movement | null {
  return [...city.movements(node)].filter((m) => !m.flyover && m.cars > 0).sort((a, b) => b.share - a.share || b.wait - a.wait)[0] ?? null;
}

/** The nearest named block to a place: 'Pepper Market'. */
export function nearestLot(city: Pick<CityView, 'lots'>, at: Pt, kinds?: readonly Lot['kind'][]): Lot | null {
  const open = city.lots.filter((l) => l.level > 0 && (!kinds || kinds.includes(l.kind)));
  return [...open].sort((a, b) => dist(mid(a), at) - dist(mid(b), at))[0] ?? null;
}

/** 'the crossroads by Ladder Shops'. */
export function junctionName(city: CityView, j: Junction): string {
  if (j.gate) return j.gate;
  const shape = j.arms.length >= 4 ? 'the crossroads' : 'the corner';
  const main = mainJunction(city);
  if (main?.id === j.id && city.def.number === 1 && city.year === 1) return shape;
  const lot = nearestLot(city, j);
  return lot ? `${shape} by ${lot.name}` : shape;
}

/** Shops, markets and malls with every space taken, the fullest and biggest first. */
export function fullLots(city: CityView): readonly Lot[] {
  return city.lots.filter((l) => l.level > 0 && ['market', 'shops', 'mall', 'office', 'stadium', 'fair', 'hospital'].includes(l.kind) && city.lotMood(l.id).parking >= FULL)
    .sort((a, b) => weight(b) - weight(a) || a.id - b.id);
}
const DRAW: Readonly<Partial<Record<Lot['kind'], number>>> = { mall: 4, market: 3, fair: 4, stadium: 3, shops: 2, hospital: 1, office: 1 };
const weight = (l: Lot): number => (DRAW[l.kind] ?? 1) * l.w * l.h * l.level;

/** Where cars stand double-parked now. */
export function doubleParked(city: Pick<CityView, 'cars'>): readonly Pt[] {
  const c = city.cars;
  const out: Pt[] = [];
  for (let i = 0; i < c.count; i++) if (c.alive[i] === 1 && c.state[i] === 2) out.push({ x: c.x[i]!, y: c.y[i]! });
  return out;
}

const COMPASS = ['east', 'south', 'west', 'north'] as const;
/** The compass side a road comes in from. */
export function sideOf(city: Pick<CityView, 'roads'>, j: Junction, roadId: Id): string {
  const pts = roadOf(city, roadId)?.line ?? [];
  if (pts.length < 2) return '';
  const first = dist(pts[0]!, j) < dist(pts[pts.length - 1]!, j);
  const far = first ? pts[Math.min(3, pts.length - 1)]! : pts[Math.max(0, pts.length - 4)]!;
  const q = Math.round(Math.atan2(far.y - j.y, far.x - j.x) / (Math.PI / 2));
  return COMPASS[((q % 4) + 4) % 4]!;
}

const TURNS = ['straight on', 'turning right', 'turning back', 'turning left'] as const;
/** 'from the north, turning left'. */
export function turnWords(city: Pick<CityView, 'roads'>, j: Junction, m: Movement): string {
  const [a, b] = m.arrow;
  const y = m.arrow[m.arrow.length - 2];
  const z = m.arrow[m.arrow.length - 1];
  const from = sideOf(city, j, m.fromRoad);
  if (!a || !b || !y || !z || !from) return 'one turn';
  const turn = Math.atan2(z.y - y.y, z.x - y.x) - Math.atan2(b.y - a.y, b.x - a.x);
  const q = ((Math.round(turn / (Math.PI / 2)) % 4) + 4) % 4;
  return `from the ${from}, ${TURNS[q]}`;
}

/** A vertex a bus could stop at, nearest to a place. */
export function stopNear(city: Pick<CityView, 'roads'>, at: Pt): Cell | null {
  let best: { c: Cell; d: number } | null = null;
  for (const r of city.roads) {
    if (r.flyover || r.type === 'highway' || r.bridge || r.level !== 0) continue;
    const inner = r.cells.slice(1, -1);
    for (const cell of inner.length > 0 ? inner : r.cells) {
      const d = dist(ptOf(cell), at);
      if (!best || d < best.d) best = { c: cell, d };
    }
  }
  return best?.c ?? null;
}

/** The middle of a road. */
export function roadMid(r: Road): Pt {
  const p = r.line[Math.floor(r.line.length / 2)];
  return p ?? { x: 0, y: 0 };
}

/** Ground roads, the nearest to a place first. */
export function roadsNear(city: Pick<CityView, 'roads'>, at: Pt, cells: number): readonly Road[] {
  const d = (r: Road): number => Math.min(...r.line.map((p) => dist(p, at)));
  return city.roads.filter((r) => r.level === 0 && !r.flyover && r.line.length > 1).map((r) => ({ r, d: d(r) })).filter((x) => x.d <= cells * CELL).sort((a, b) => a.d - b.d || a.r.id - b.r.id).map((x) => x.r);
}
