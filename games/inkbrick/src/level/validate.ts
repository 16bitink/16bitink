import {
  COLS, GOAL_KINDS, RESCUE_WHO, ROWS, RULE_KINDS, type BrickDef, type BrickKind, type GoalKind, type LevelDef, type PickupKind,
  type RescueWho, type RuleKind,
} from '../sim/types';
import { levelProblems } from '../sim/validate';

/**
 * Checks an untrusted payload (the server's paid levels, a daily's JSON) is a LevelDef before
 * the game plays it. Every number is bounded, every list's length and every enum checked, then
 * the Sim's own layout checks run (overlaps, links, goals' fields). Returns the level or the
 * first problem found, never throws. Bricks must sit on the 36 x 64 grid.
 */
const KINDS: readonly BrickKind[] = ['soft', 'tough', 'stone', 'x3', 'keg', 'pickup', 'ice', 'key', 'gate', 'lever'];
const PICKUPS: readonly PickupKind[] = ['wide', 'plus3', 'fireball'];
/** The design's budget is 1,500 bricks; a little room for hand-made levels. */
export const MAX_BRICKS = 2000;
/** Bounds of an untrusted level's lists and numbers. */
export const BOUNDS = {
  id: 64, name: 80, tip: 240, layout: 32, link: 32,
  number: 50, chapter: 5, par: 3600, hp: 9, tint: 63,
  floes: 16, shutters: 16, spinners: 8, whirlpools: 8, bumpers: 12, flips: 16, crabs: 6, pearls: 5,
  /** Cells a floe may slide, seconds a cycle may take, Brumm's hits and speed. */
  floeSlide: COLS, period: 120, bossHits: 200, bossSpeed: 40,
} as const;

export type Checked<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly problem: string };

type Obj = Readonly<Record<string, unknown>>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isInt = (x: unknown): x is number => Number.isInteger(x);
const inRange = (x: unknown, lo: number, hi: number): boolean => isNum(x) && x >= lo && x <= hi;
const intIn = (x: unknown, lo: number, hi: number): boolean => isInt(x) && (x as number) >= lo && (x as number) <= hi;
const strUpTo = (x: unknown, n: number): boolean => typeof x === 'string' && x.length <= n;
const optStr = (x: unknown, n: number): boolean => x === undefined || strUpTo(x, n);
const optIn = (x: unknown, lo: number, hi: number): boolean => x === undefined || inRange(x, lo, hi);
const oneOf = <T>(x: unknown, list: readonly T[]): x is T => list.includes(x as T);
/** A cell on the grid. */
const isCell = (p: unknown): boolean => isObj(p) && intIn(p.x, 0, COLS - 1) && intIn(p.y, 0, ROWS - 1);

function brickProblem(b: unknown, i: number): string | null {
  if (!isObj(b)) return `brick ${i} is not an object`;
  const { x, y, w, h, kind } = b;
  if (!isInt(x) || !isInt(y) || !isInt(w) || !isInt(h)) return `brick ${i} has a non-integer box`;
  if (w < 1 || h < 1 || x < 0 || y < 0 || x + w > COLS || y + h > ROWS) return `brick ${i} is off the grid`;
  if (!oneOf(kind, KINDS)) return `brick ${i} has an unknown kind`;
  if (!(b.hp === undefined || intIn(b.hp, 1, BOUNDS.hp)) || !optStr(b.link, BOUNDS.link) || !(b.tint === undefined || intIn(b.tint, 0, BOUNDS.tint)) || !optStr(b.floe, BOUNDS.link)) return `brick ${i} has a bad field`;
  if (b.drop !== undefined && !oneOf(b.drop, PICKUPS)) return `brick ${i} has an unknown drop`;
  if (b.hidden !== undefined && typeof b.hidden !== 'boolean') return `brick ${i} has a bad hidden flag`;
  if (b.armour !== undefined && typeof b.armour !== 'boolean') return `brick ${i} has a bad armour flag`;
  return null;
}

/** undefined, or a list of at most `max` items each passing `each`. */
const listOf = (x: unknown, max: number, each: (e: unknown) => boolean): boolean => x === undefined || (Array.isArray(x) && x.length <= max && x.every(each));

const P = BOUNDS.period;
const isFloe = (f: unknown): boolean => isObj(f) && strUpTo(f.id, BOUNDS.link) && inRange(f.dx, -BOUNDS.floeSlide, BOUNDS.floeSlide) && inRange(f.dy, -ROWS, ROWS) && inRange(f.period, 0, P);
const isShutter = (s: unknown): boolean => isObj(s) && intIn(s.x, 0, COLS - 1) && intIn(s.y, 0, ROWS - 1) && intIn(s.w, 1, COLS) && intIn(s.h, 1, ROWS) && inRange(s.open, 0, P) && inRange(s.closed, 0, P) && inRange(s.phase, -P, P);
const isSpinner = (s: unknown): boolean => isObj(s) && inRange(s.x, 0, COLS - 1) && inRange(s.y, 0, ROWS - 1) && inRange(s.length, 1, COLS) && inRange(s.period, -P, P) && inRange(s.phase, -P, P);
const isBumper = (b: unknown): boolean => isObj(b) && inRange(b.x, 0, COLS * 15) && inRange(b.y, 0, ROWS * 15) && inRange(b.r, 1, 60);
const isFlip = (f: unknown): boolean => isObj(f) && intIn(f.x, 0, COLS - 1) && intIn(f.y, 0, ROWS - 1) && intIn(f.w, 1, COLS) && intIn(f.h, 1, ROWS) && strUpTo(f.link, BOUNDS.link) && typeof f.on === 'boolean';
const isCrab = (c: unknown): boolean => isObj(c) && intIn(c.y, 0, ROWS - 1) && intIn(c.x0, 0, COLS - 1) && intIn(c.x1, 0, COLS - 1) && inRange(c.speed, 0, 40) && inRange(c.phase, 0, 1);

function piecesProblem(o: Obj): string | null {
  if (!listOf(o.floes, BOUNDS.floes, isFloe)) return 'bad floes';
  if (!listOf(o.shutters, BOUNDS.shutters, isShutter)) return 'bad shutters';
  if (!listOf(o.spinners, BOUNDS.spinners, isSpinner)) return 'bad spinners';
  if (!listOf(o.whirlpools, BOUNDS.whirlpools, (w) => isObj(w) && isCell(w.a) && isCell(w.b))) return 'bad whirlpools';
  if (o.boss !== undefined) {
    const b = o.boss;
    if (!isObj(b) || !intIn(b.hits, 1, BOUNDS.bossHits) || !intIn(b.shieldW, 1, COLS) || !inRange(b.speed, 0, BOUNDS.bossSpeed)) return 'bad boss';
    if (![b.x, b.w, b.trackX0, b.trackX1].every((v) => v === undefined || intIn(v, 0, COLS)) || ![b.y, b.h, b.shieldY].every((v) => v === undefined || intIn(v, 0, ROWS))) return 'bad boss';
  }
  if (o.dark !== undefined && typeof o.dark !== 'boolean') return 'bad dark';
  if (!listOf(o.bumpers, BOUNDS.bumpers, isBumper)) return 'bad bumpers';
  if (!listOf(o.flips, BOUNDS.flips, isFlip)) return 'bad flips';
  if (!listOf(o.crabs, BOUNDS.crabs, isCrab)) return 'bad crabs';
  return null;
}

function goalProblem(o: Obj): string | null {
  if (o.goal !== undefined && !oneOf<GoalKind>(o.goal, GOAL_KINDS)) return 'unknown goal';
  if (o.rule !== undefined && !oneOf<RuleKind>(o.rule, RULE_KINDS)) return 'unknown rule';
  if (o.ruleDir !== undefined && o.ruleDir !== 1 && o.ruleDir !== -1) return 'bad ruleDir';
  if (o.rescue !== undefined && !(isCell(o.rescue) && oneOf<RescueWho>((o.rescue as Obj).who, RESCUE_WHO))) return 'bad rescue';
  if (!listOf(o.pearls, BOUNDS.pearls, isCell)) return 'bad pearls';
  if (o.stones !== undefined && !intIn(o.stones, 1, 20)) return 'bad stones';
  if (!optIn(o.need, 0, 1)) return 'bad need';
  if (o.tide !== undefined && !(isObj(o.tide) && inRange(o.tide.every, 0, P) && intIn(o.tide.line, 0, ROWS - 1))) return 'bad tide';
  if (o.dailyPearl !== undefined && !isCell(o.dailyPearl)) return 'bad daily pearl';
  if (o.tomorrow !== undefined && !(isObj(o.tomorrow) && oneOf<RuleKind>(o.tomorrow.rule, RULE_KINDS) && oneOf<GoalKind>(o.tomorrow.goal, GOAL_KINDS))) return 'bad tomorrow';
  return null;
}

export function checkLevel(x: unknown): Checked<LevelDef> {
  if (!isObj(x)) return { ok: false, problem: 'level is not an object' };
  if (!strUpTo(x.id, BOUNDS.id) || !strUpTo(x.name, BOUNDS.name)) return { ok: false, problem: 'level has no id or name' };
  const id = x.id as string;
  if (!intIn(x.number, 0, BOUNDS.number) || !intIn(x.chapter, 0, BOUNDS.chapter) || !(inRange(x.par, 0, BOUNDS.par) && (x.par as number) > 0)) return { ok: false, problem: `level ${id}: bad number, chapter or par` };
  if (!optStr(x.tip, BOUNDS.tip) || !optStr(x.layout, BOUNDS.layout)) return { ok: false, problem: `level ${id}: bad tip or layout` };
  if (!Array.isArray(x.bricks) || x.bricks.length === 0 || x.bricks.length > MAX_BRICKS) return { ok: false, problem: `level ${id}: bad brick list` };
  for (let i = 0; i < x.bricks.length; i++) {
    const p = brickProblem(x.bricks[i], i);
    if (p) return { ok: false, problem: `level ${id}: ${p}` };
  }
  const shape = piecesProblem(x) ?? goalProblem(x);
  if (shape) return { ok: false, problem: `level ${id}: ${shape}` };
  // Shape checked: the JSON's fields are the LevelDef's. Then what the Sim would refuse.
  const level = x as unknown as LevelDef;
  const layout = levelProblems(level);
  if (layout.length > 0) return { ok: false, problem: `level ${id}: ${layout[0]}` };
  return { ok: true, value: level };
}

/** A list of levels (the paid content); one bad level rejects the whole payload. */
export function checkLevels(x: unknown): Checked<readonly LevelDef[]> {
  if (!Array.isArray(x)) return { ok: false, problem: 'levels payload is not a list' };
  const out: LevelDef[] = [];
  for (const item of x) {
    const c = checkLevel(item);
    if (!c.ok) return c;
    out.push(c.value);
  }
  return { ok: true, value: out };
}

export type { BrickDef };
