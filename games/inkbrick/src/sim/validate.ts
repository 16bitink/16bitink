/** Level checks: a bad layout throws while loading, listing every problem. */
import {
  BRICK_ROW_MAX, BRICK_ROW_MIN, BUMPER_R_MAX, BUMPER_R_MIN, MAX_BRICKS, PADDLE_Y, PEARLS_MAX, PEARLS_MIN, STONES_MAX, STONES_MIN,
  TIDE_FLOOR_ROW,
} from './constants';
import {
  BOARD_W, CELL, COLS, CRAB_W, GOAL_KINDS, RESCUE_SIZE, RESCUE_WHO, ROWS, RULE_KINDS, type LevelDef,
} from './types';

const MAX_LISTED = 12;

export class LevelError extends Error {
  constructor(readonly levelId: string, readonly problems: readonly string[]) {
    super(`level ${levelId}:\n  ${problems.slice(0, MAX_LISTED).join('\n  ')}${problems.length > MAX_LISTED ? `\n  ...and ${problems.length - MAX_LISTED} more` : ''}`);
    this.name = 'LevelError';
  }
}

function isCellInt(n: number): boolean {
  return Number.isInteger(n);
}

export function levelProblems(level: LevelDef): string[] {
  const problems: string[] = [];
  if (level.bricks.length > MAX_BRICKS) problems.push(`${level.bricks.length} bricks (budget ${MAX_BRICKS})`);
  const floeIds = new Set((level.floes ?? []).map((f) => f.id));
  const owner = new Map<string, number>();
  const links = new Map<string, { key: number; gate: number }>();
  level.bricks.forEach((b, i) => {
    const where = `brick ${i} (${b.kind} at ${b.x},${b.y})`;
    if (![b.x, b.y, b.w, b.h].every(isCellInt) || b.w < 1 || b.h < 1) problems.push(`${where}: x/y/w/h must be whole cells, w/h >= 1`);
    if (b.x < 0 || b.x + b.w > COLS) problems.push(`${where}: outside columns 0-${COLS - 1}`);
    if (b.y < BRICK_ROW_MIN || b.y + b.h - 1 > BRICK_ROW_MAX) problems.push(`${where}: outside rows ${BRICK_ROW_MIN}-${BRICK_ROW_MAX}`);
    if (b.floe !== undefined && !floeIds.has(b.floe)) problems.push(`${where}: unknown floe '${b.floe}'`);
    if ((b.kind === 'key' || b.kind === 'gate') && !b.link) problems.push(`${where}: ${b.kind} needs a link`);
    if (b.link && (b.kind === 'key' || b.kind === 'gate')) {
      const l = links.get(b.link) ?? { key: 0, gate: 0 };
      links.set(b.link, b.kind === 'key' ? { ...l, key: l.key + 1 } : b.kind === 'gate' ? { ...l, gate: l.gate + 1 } : l);
    }
    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = b.x; x < b.x + b.w; x++) {
        const k = `${b.floe ?? ''}:${x},${y}`;
        const other = owner.get(k);
        if (other !== undefined) problems.push(`${where}: overlaps brick ${other} at ${x},${y}`);
        else owner.set(k, i);
      }
    }
  });
  for (const [link, n] of links) {
    if (n.key === 0 || n.gate === 0) problems.push(`link '${link}' needs a key and a gate`);
  }
  problems.push(...variety(level, owner));
  if (!(level.par > 0)) problems.push('par must be > 0 seconds');
  if (level.boss && (level.boss.hits < 1 || level.boss.speed < 0)) problems.push('boss needs hits >= 1 and speed >= 0');
  if (level.bricks.length === 0 && !level.boss) problems.push('no bricks');
  if (ROWS < BRICK_ROW_MAX) problems.push('grid too small');
  return problems;
}

/** Limits of the variety fields (docs/inkbrick-design.md "Variety"). */
export const LIMITS = {
  tideEvery: [2, 60], tideLine: [20, TIDE_FLOOR_ROW], bumpers: 12, flips: 16, crabs: 6, crabSpeed: 20,
} as const;

const inRows = (y: number, h = 1): boolean => Number.isInteger(y) && y >= BRICK_ROW_MIN && y + h - 1 <= BRICK_ROW_MAX;
const inCols = (x: number, w = 1): boolean => Number.isInteger(x) && x >= 0 && x + w <= COLS;

/** Problems with goals, rules and the new pieces. `owner` maps still cells ':x,y' to bricks. */
function variety(level: LevelDef, owner: ReadonlyMap<string, number>): string[] {
  const out: string[] = [];
  const goal = level.goal ?? 'clear';
  const onBrick = (x: number, y: number): boolean => owner.has(`:${x},${y}`);
  if (!GOAL_KINDS.includes(goal)) out.push(`unknown goal '${String(goal)}'`);
  if (level.rule !== undefined && !RULE_KINDS.includes(level.rule)) out.push(`unknown rule '${String(level.rule)}'`);
  if (level.ruleDir !== undefined && level.ruleDir !== 1 && level.ruleDir !== -1) out.push('ruleDir must be 1 or -1');
  if (goal === 'rescue') {
    const r = level.rescue;
    if (!r) out.push("goal 'rescue' needs rescue: { x, y, who }");
    else {
      if (!inCols(r.x, RESCUE_SIZE) || !inRows(r.y, RESCUE_SIZE)) out.push(`rescue at ${r.x},${r.y}: off the brick area`);
      if (!RESCUE_WHO.includes(r.who)) out.push(`rescue: unknown friend '${String(r.who)}'`);
      for (let y = r.y; y < r.y + RESCUE_SIZE; y++) for (let x = r.x; x < r.x + RESCUE_SIZE; x++) if (onBrick(x, y)) out.push(`rescue at ${r.x},${r.y}: on a brick at ${x},${y}`);
    }
  }
  if (goal === 'pearls') {
    const ps = level.pearls ?? [];
    if (ps.length < PEARLS_MIN || ps.length > PEARLS_MAX) out.push(`goal 'pearls' needs ${PEARLS_MIN}-${PEARLS_MAX} pearls, got ${ps.length}`);
    for (const p of ps) {
      if (!inCols(p.x) || !inRows(p.y)) out.push(`pearl at ${p.x},${p.y}: off the brick area`);
      else if (onBrick(p.x, p.y)) out.push(`pearl at ${p.x},${p.y}: on a brick`);
    }
  }
  if (goal === 'stones') {
    if (!Number.isInteger(level.stones) || level.stones! < STONES_MIN || level.stones! > STONES_MAX) out.push(`goal 'stones' needs stones ${STONES_MIN}-${STONES_MAX}`);
    if (!(typeof level.need === 'number' && level.need >= 0 && level.need <= 1)) out.push("goal 'stones' needs need in 0..1");
  }
  if (goal === 'tide') out.push(...tideProblems(level));
  out.push(...pieceProblems(level, onBrick));
  return out;
}

function tideProblems(level: LevelDef): string[] {
  const t = level.tide;
  if (!t) return ["goal 'tide' needs tide: { every, line }"];
  const out: string[] = [];
  if (!(t.every >= LIMITS.tideEvery[0] && t.every <= LIMITS.tideEvery[1])) out.push(`tide.every must be ${LIMITS.tideEvery[0]}-${LIMITS.tideEvery[1]} s`);
  if (!Number.isInteger(t.line) || t.line < LIMITS.tideLine[0] || t.line > LIMITS.tideLine[1]) out.push(`tide.line must be a row ${LIMITS.tideLine[0]}-${LIMITS.tideLine[1]}`);
  const low = Math.max(-1, ...level.bricks.filter((b) => b.kind !== 'stone' && b.kind !== 'gate' && b.kind !== 'lever').map((b) => b.y + b.h - 1));
  if (low >= t.line) out.push(`tide.line ${t.line} is at or above the lowest brick (row ${low})`);
  if (level.boss) out.push('a Rising Tide level has no Brumm');
  return out;
}

function pieceProblems(level: LevelDef, onBrick: (x: number, y: number) => boolean): string[] {
  const out: string[] = [];
  const bumpers = level.bumpers ?? [];
  if (bumpers.length > LIMITS.bumpers) out.push(`${bumpers.length} bumpers (at most ${LIMITS.bumpers})`);
  for (const b of bumpers) {
    if (!(b.r >= BUMPER_R_MIN && b.r <= BUMPER_R_MAX)) out.push(`bumper at ${b.x},${b.y}: r must be ${BUMPER_R_MIN}-${BUMPER_R_MAX} px`);
    if (!(b.x >= b.r && b.x <= BOARD_W - b.r && b.y >= BRICK_ROW_MIN * CELL + b.r && b.y <= PADDLE_Y - 4 * CELL - b.r)) out.push(`bumper at ${b.x},${b.y}: off the field`);
  }
  const flips = level.flips ?? [];
  if (flips.length > LIMITS.flips) out.push(`${flips.length} flip walls (at most ${LIMITS.flips})`);
  const levers = new Set(level.bricks.filter((b) => b.kind === 'lever').map((b) => b.link ?? ''));
  for (const b of level.bricks) if (b.kind === 'lever' && !flips.some((f) => f.link === b.link)) out.push(`lever at ${b.x},${b.y}: no flip wall with link '${b.link ?? ''}'`);
  for (const f of flips) {
    if (![f.x, f.y, f.w, f.h].every(Number.isInteger) || f.w < 1 || f.h < 1 || !inCols(f.x, f.w) || !inRows(f.y, f.h)) out.push(`flip at ${f.x},${f.y}: off the brick area`);
    if (!f.link || !levers.has(f.link)) out.push(`flip at ${f.x},${f.y}: no lever with link '${f.link}'`);
    for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) if (onBrick(x, y)) out.push(`flip at ${f.x},${f.y}: over a brick at ${x},${y}`);
  }
  const crabs = level.crabs ?? [];
  if (crabs.length > LIMITS.crabs) out.push(`${crabs.length} crabs (at most ${LIMITS.crabs})`);
  for (const c of crabs) {
    if (!inRows(c.y, 2) || !inCols(c.x0, CRAB_W) || !inCols(c.x1, CRAB_W) || c.x1 < c.x0) out.push(`crab on row ${c.y}: track ${c.x0}-${c.x1} off the brick area`);
    if (!(c.speed >= 0 && c.speed <= LIMITS.crabSpeed) || !(c.phase >= 0 && c.phase <= 1)) out.push(`crab on row ${c.y}: speed 0-${LIMITS.crabSpeed} cells/s, phase 0..1`);
  }
  for (const p of level.whirlpools ?? []) {
    for (const e of [p.a, p.b]) if (onBrick(e.x, e.y)) out.push(`whirlpool end at ${e.x},${e.y}: on a brick`);
  }
  const d = level.dailyPearl;
  if (d && (!inCols(d.x) || !inRows(d.y) || onBrick(d.x, d.y))) out.push(`daily pearl at ${d.x},${d.y}: off the brick area or on a brick`);
  if (level.tomorrow && (!RULE_KINDS.includes(level.tomorrow.rule) || !GOAL_KINDS.includes(level.tomorrow.goal))) out.push('tomorrow: unknown rule or goal');
  return out;
}

export function assertLevel(level: LevelDef): void {
  const problems = levelProblems(level);
  if (problems.length > 0) throw new LevelError(level.id, problems);
}
