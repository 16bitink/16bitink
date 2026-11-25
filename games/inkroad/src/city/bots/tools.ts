import { CELL } from '../../sim/constants';
import type { CarParkKind, Cell, CityView, Command, Id, Junction, Pt, Quote } from '../../sim/types';
import { blocksMeet, distToLine, vertexInBlock } from '../geometry';
import { defCells, DROPPED } from '../standing';
import { PARKS } from '../tune';

/** Moves the bots share. They only use what a player can: CityView. */
export interface Bot {
  readonly name: string;
  /** Called at dawn, after each peak, and on every card, before it is closed. */
  act(city: CityView, moment: 'yearStart' | 'dawn' | 'noon' | 'evening' | 'review' | 'yearEnd', attempt: number): void;
}

export const tryIt = (city: CityView, cmd: Command): boolean => city.quote(cmd).ok && city.apply(cmd).ok;

export interface Sick { readonly node: Junction; readonly wait: number; readonly pain: number }

/** Junctions by how much waiting they cause, worst first. */
export function sickest(city: CityView, minWait: number): readonly Sick[] {
  return city.junctions
    .filter((j) => j.arms.length >= 3)
    .map((node) => { const s = city.junctionStats(node.id); return { node, wait: s.wait, pain: s.wait * s.cars }; })
    .filter((s) => s.wait >= minWait)
    .sort((a, b) => b.pain - a.pain || a.node.id - b.node.id);
}

export const worstMovement = (city: CityView, node: Id) =>
  [...city.movements(node)].filter((m) => !m.flyover).sort((a, b) => b.cars * b.wait - a.cars * a.wait)[0];

/** Lift the worst turn of a junction if the desk allows it. */
export function liftWorst(city: CityView, node: Id, budget: number): boolean {
  const ranked = [...city.movements(node)].filter((m) => !m.flyover && m.cars > 2).sort((a, b) => b.cars * b.wait - a.cars * a.wait).slice(0, 3);
  for (const m of ranked) {
    for (const level of [1, -1] as const) {
      const cmd: Command = { t: 'flyover', node, fromRoad: m.fromRoad, toRoad: m.toRoad, level };
      const q = city.quote(cmd);
      if (q.ok && q.cost <= budget) return city.apply(cmd).ok;
    }
  }
  return false;
}

const roadsNear = (city: CityView, at: Pt, cells: number) =>
  city.roads.filter((r) => r.level === 0 && !r.flyover && distToLine(r.line, at) <= cells * CELL).sort((a, b) => distToLine(a.line, at) - distToLine(b.line, at));

/** Kerb bays on the nearest road, or null. */
export function kerbNear(city: CityView, at: Pt): boolean {
  return roadsNear(city, at, 4).some((r) => !r.kerb && tryIt(city, { t: 'kerb', road: r.id, on: true }));
}

/** The bots know the Master Plan by heart: they never park on a plot or a road that is still to come, however far. */
export function offPlan(city: CityView, kind: CarParkKind, at: Cell): boolean {
  const b = { gx: at.gx, gy: at.gy, w: PARKS[kind].w, h: PARKS[kind].h };
  if (city.lots.some((l) => l.level === 0 && l.opensYear !== DROPPED && blocksMeet(l, b))) return false;
  return !city.def.roads.some((r) => (r.opensYear ?? 1) > city.year && defCells(r).some((x) => vertexInBlock(b, x)));
}

/** The cheapest site for a car park within a few cells of a place. */
export function parkNear(city: CityView, at: Pt, kinds: readonly ('lot' | 'multi' | 'under' | 'ride')[], budget: number): boolean {
  const c: Cell = { gx: Math.round(at.x / CELL), gy: Math.round(at.y / CELL) };
  let best: { cmd: Command; q: Quote; score: number } | null = null;
  for (const kind of kinds) {
    for (let dx = -6; dx <= 6; dx++) {
      for (let dy = -6; dy <= 6; dy++) {
        const cmd = { t: 'carPark', kind, at: { gx: c.gx + dx, gy: c.gy + dy } } as const;
        if (!offPlan(city, kind, cmd.at)) continue;
        const q = city.quote(cmd);
        if (!q.ok || q.cost > budget) continue;
        const score = q.cost / (kind === 'multi' || kind === 'under' ? 2.2 : 1) + (Math.abs(dx) + Math.abs(dy)) * 6;
        if (!best || score < best.score) best = { cmd, q, score };
      }
    }
  }
  return best ? city.apply(best.cmd).ok : false;
}

/** Nearest vertex to a point that a bus could stop at. */
export function stopNear(city: CityView, at: Pt): Cell | null {
  let best: { c: Cell; d: number } | null = null;
  for (const r of city.roads) {
    if (r.flyover || r.type === 'highway' || r.bridge) continue;
    for (const cell of r.cells.slice(1, -1).length > 0 ? r.cells.slice(1, -1) : r.cells) {
      const d = Math.hypot(cell.gx * CELL - at.x, cell.gy * CELL - at.y);
      if (!best || d < best.d) best = { c: cell, d };
    }
  }
  return best?.c ?? null;
}

/** A line through named blocks, dropping stops that are too close together. */
export function lineThrough(city: CityView, mode: 'bus' | 'tram' | 'metro', names: readonly string[], reserve: number): boolean {
  const gap = mode === 'metro' ? 3 : 2;
  const stops: Cell[] = [];
  for (const n of names) {
    const l = city.lots.find((x) => x.name === n && x.level > 0);
    const s = l ? stopNear(city, { x: (l.gx + l.w / 2) * CELL, y: (l.gy + l.h / 2) * CELL }) : null;
    if (s && stops.every((p) => Math.hypot(p.gx - s.gx, p.gy - s.gy) >= gap)) stops.push(s);
  }
  const cmd: Command = { t: 'line', mode, stops };
  const q = city.quote(cmd);
  return q.ok && city.money - q.cost >= reserve && city.apply(cmd).ok;
}

export const lotPoint = (city: CityView, name: string): Pt | null => {
  const l = city.lots.find((x) => x.name === name);
  return l ? { x: (l.gx + l.w / 2) * CELL, y: (l.gy + l.h / 2) * CELL } : null;
};
