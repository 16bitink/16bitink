/**
 * Placing a day's goal on its board (docs/inkbrick-design.md "Variety"): the rescue friend deep
 * inside, far from the way in; 3-5 pearls spread between the inside and the field; the Rising
 * Tide's line and pace; the daily's hidden pearl off the obvious path; and the rules the
 * generator applies itself (goldRush, kegDay).
 */
import { BRICK_ROW_MAX, LAUNCH_X, TIDE_FLOOR_ROW } from '../sim/constants';
import { cellIndex, forEachCell, insideMask, wallMask } from '../sim/grid';
import { minus } from '../sim/kit';
import { pick, randInt, type Rng } from '../sim/rng';
import {
  CELL, COLS, RESCUE_SIZE, RESCUE_WHO, ROWS, type BrickDef, type CellPoint, type LevelDef, type RescueDef, type TideDef,
} from '../sim/types';
import type { DayPlan } from './plan';

const LAUNCH_COL = Math.floor(LAUNCH_X / CELL);
/** Pearls at least this many cells apart (Chebyshev), so each is its own shot. */
const PEARL_SPACING = 6;
/** Rising Tide: seconds until the lowest brick would reach the line if nothing were cleared (measured: 6 rows at 4 s each floods the decent bot 1.2 times, at 6 s 0.4, at 8 s 0). */
export const TIDE_FIRST_FLOOD = 40;
/** Rows between the lowest brick and the danger line. */
export const TIDE_LINE_GAP = 6;
export const TIDE_EVERY: readonly [number, number] = [5, 12];
export const GOLD_RUSH_SHARE = 0.12;
export const KEG_DAY_SHARE = 0.1;

interface Spot { readonly x: number; readonly y: number }

/** Cells a goal may not take: stone, and the bricks that do a job (keys, gates, levers, armour, floes). */
function stoneCells(level: LevelDef): Uint8Array {
  const m = new Uint8Array(COLS * ROWS);
  const fixed = (b: BrickDef) => b.kind === 'stone' || b.kind === 'gate' || b.kind === 'lever' || b.kind === 'key' || b.armour === true || b.floe !== undefined;
  for (const b of level.bricks) if (fixed(b)) forEachCell(b, (x, y) => (m[cellIndex(x, y)] = 1));
  for (const f of [...(level.flips ?? []), ...(level.shutters ?? [])]) forEachCell({ ...f, kind: 'stone' }, (x, y) => (m[cellIndex(x, y)] = 1));
  return m;
}

/** Breadth-first distance (cells) from the inside's mouths through the inside, -1 elsewhere. */
function insideDepth(inside: Uint8Array): Int32Array {
  const d = new Int32Array(COLS * ROWS).fill(-1);
  const q: number[] = [];
  for (let c = 0; c < inside.length; c++) {
    if (!inside[c]) continue;
    const x = c % COLS;
    const y = (c - x) / COLS;
    const edge = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([nx, ny]) => nx! >= 0 && nx! < COLS && ny! >= 0 && ny! < ROWS && !inside[ny! * COLS + nx!]);
    if (edge) {
      d[c] = 0;
      q.push(c);
    }
  }
  for (let i = 0; i < q.length; i++) {
    const c = q[i]!;
    const x = c % COLS;
    const y = (c - x) / COLS;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const n = ny * COLS + nx;
      if (!inside[n] || (d[n] ?? 0) >= 0) continue;
      d[n] = (d[c] ?? 0) + 1;
      q.push(n);
    }
  }
  return d;
}

function cellsOf(spots: readonly Spot[], size = 1): BrickDef[] {
  return spots.map((s) => ({ x: s.x, y: s.y, w: size, h: size, kind: 'stone' as const }));
}

/** The friend: a 2 x 2 spot deep inside (among the deepest), its bricks taken away. */
export function placeRescue(level: LevelDef, rng: Rng): { bricks: BrickDef[]; rescue: RescueDef } | null {
  const inside = insideMask(wallMask(level));
  const depth = insideDepth(inside);
  const stone = stoneCells(level);
  const spots: { x: number; y: number; d: number }[] = [];
  for (let y = 3; y + RESCUE_SIZE - 1 <= BRICK_ROW_MAX; y++) {
    for (let x = 0; x + RESCUE_SIZE <= COLS; x++) {
      let d = Infinity;
      for (let dy = 0; dy < RESCUE_SIZE; dy++) for (let dx = 0; dx < RESCUE_SIZE; dx++) {
        const c = cellIndex(x + dx, y + dy);
        d = inside[c] && !stone[c] ? Math.min(d, depth[c]!) : -Infinity;
      }
      if (d > 0) spots.push({ x, y, d });
    }
  }
  if (spots.length === 0) return null;
  spots.sort((a, b) => b.d - a.d || a.y - b.y || a.x - b.x);
  const s = pick(rng, spots.slice(0, Math.min(6, spots.length)));
  const rescue: RescueDef = { x: s.x, y: s.y, who: pick(rng, RESCUE_WHO) };
  return { bricks: minus(level.bricks, cellsOf([s], RESCUE_SIZE)), rescue };
}

/** Cells a pearl may take: not stone, on the brick rows, away from the straight launch line low down. */
function pearlCandidates(level: LevelDef): { inside: Spot[]; outside: Spot[] } {
  const inside = insideMask(wallMask(level));
  const stone = stoneCells(level);
  const ins: Spot[] = [];
  const out: Spot[] = [];
  for (let y = 4; y <= 44; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      const c = cellIndex(x, y);
      if (stone[c]) continue;
      if (Math.abs(x - LAUNCH_COL) <= 2 && y > 30) continue;
      (inside[c] ? ins : out).push({ x, y });
    }
  }
  return { inside: ins, outside: out };
}

function spread(rng: Rng, pool: readonly Spot[], taken: Spot[], n: number): Spot[] {
  const got: Spot[] = [];
  for (let tries = 0; tries < 400 && got.length < n && pool.length > 0; tries++) {
    const s = pick(rng, pool);
    if ([...taken, ...got].every((t) => Math.max(Math.abs(t.x - s.x), Math.abs(t.y - s.y)) >= PEARL_SPACING)) got.push(s);
  }
  return got;
}

/** 3-5 pearls: about half inside (the payoff), the rest out in the field where a bank shot finds them. */
export function placePearls(level: LevelDef, rng: Rng, avoid: readonly Spot[]): { bricks: BrickDef[]; pearls: CellPoint[] } | null {
  const n = randInt(rng, 3, 5);
  const c = pearlCandidates(level);
  const inN = c.inside.length > 0 ? Math.ceil(n / 2) : 0;
  const taken = [...avoid];
  const pearls = spread(rng, c.inside, taken, inN);
  pearls.push(...spread(rng, c.outside, [...taken, ...pearls], n - pearls.length));
  if (pearls.length < 3) return null;
  return { bricks: minus(level.bricks, cellsOf(pearls)), pearls };
}

/**
 * The daily's hidden pearl: off the obvious path, so finding it is a little treasure hunt: a cell
 * deep inside or high in the field, far from the launch column, never on a goal pearl or the friend.
 */
export function placeDailyPearl(level: LevelDef, rng: Rng, avoid: readonly Spot[]): { bricks: BrickDef[]; pearl: CellPoint } | null {
  const inside = insideMask(wallMask(level));
  const depth = insideDepth(inside);
  const c = pearlCandidates(level);
  const far = (s: Spot) => Math.abs(s.x - LAUNCH_COL) >= 8 && avoid.every((a) => Math.max(Math.abs(a.x - s.x), Math.abs(a.y - s.y)) >= 4);
  const deep = c.inside.filter((s) => far(s) && depth[cellIndex(s.x, s.y)]! >= 3);
  const high = c.outside.filter((s) => far(s) && s.y <= 20);
  const pool = deep.length > 0 && (high.length === 0 || rng() < 0.7) ? deep : high.length > 0 ? high : c.outside.filter(far);
  if (pool.length === 0) return null;
  const s = pick(rng, pool);
  return { bricks: minus(level.bricks, cellsOf([s])), pearl: { x: s.x, y: s.y } };
}

/** Rising Tide: the line TIDE_LINE_GAP rows under the lowest brick (at most row 57), and a pace that floods in ~40 s if nothing is cleared. */
export function tideFor(level: LevelDef): TideDef {
  const low = Math.max(...level.bricks.filter((b) => b.kind !== 'stone' && b.kind !== 'gate' && b.kind !== 'lever').map((b) => b.y + b.h - 1));
  const line = Math.min(TIDE_FLOOR_ROW, low + TIDE_LINE_GAP);
  const steps = Math.max(1, line - low);
  const every = Math.max(TIDE_EVERY[0], Math.min(TIDE_EVERY[1], Math.round(TIDE_FIRST_FLOOD / steps)));
  return { every, line };
}

/** goldRush and kegDay: the generator's own rules, a share of the plain sandcastle turned into x3 shells or kegs. */
export function applyRuleBricks(bricks: readonly BrickDef[], plan: DayPlan, rng: Rng): BrickDef[] {
  if (plan.rule !== 'goldRush' && plan.rule !== 'kegDay') return [...bricks];
  const share = plan.rule === 'goldRush' ? GOLD_RUSH_SHARE : KEG_DAY_SHARE;
  const kind = plan.rule === 'goldRush' ? 'x3' : 'keg';
  return bricks.map((b) => (b.kind === 'soft' && !b.armour && !b.floe && rng() < share ? { ...b, kind } : b));
}

export function spotsOf(level: Pick<LevelDef, 'rescue' | 'pearls' | 'dailyPearl'>): Spot[] {
  const out: Spot[] = [...(level.pearls ?? [])];
  if (level.rescue) for (let dy = 0; dy < RESCUE_SIZE; dy++) for (let dx = 0; dx < RESCUE_SIZE; dx++) out.push({ x: level.rescue.x + dx, y: level.rescue.y + dy });
  if (level.dailyPearl) out.push(level.dailyPearl);
  return out;
}
