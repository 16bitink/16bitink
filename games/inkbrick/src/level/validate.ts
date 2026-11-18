import { COLS, ROWS, type BrickDef, type BrickKind, type LevelDef, type PickupKind } from '../sim/types';

/**
 * Checks an untrusted payload (the server's paid levels, a daily's JSON) is a
 * LevelDef before the game plays it. Returns the level or the first problem
 * found, never throws. Bricks must sit on the 36 x 64 grid.
 */
const KINDS: readonly BrickKind[] = ['soft', 'tough', 'stone', 'x3', 'keg', 'pickup', 'ice', 'key', 'gate'];
const PICKUPS: readonly PickupKind[] = ['wide', 'plus3', 'fireball'];
/** The design's budget is 1,500 bricks; a little room for hand-made levels. */
export const MAX_BRICKS = 2000;

export type Checked<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly problem: string };

type Obj = Readonly<Record<string, unknown>>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isInt = (x: unknown): x is number => Number.isInteger(x);
const optStr = (x: unknown): boolean => x === undefined || typeof x === 'string';
const optNum = (x: unknown): boolean => x === undefined || isNum(x);

function brickProblem(b: unknown, i: number): string | null {
  if (!isObj(b)) return `brick ${i} is not an object`;
  const { x, y, w, h, kind } = b;
  if (!isInt(x) || !isInt(y) || !isInt(w) || !isInt(h)) return `brick ${i} has a non-integer box`;
  if (w < 1 || h < 1 || x < 0 || y < 0 || x + w > COLS || y + h > ROWS) return `brick ${i} is off the grid`;
  if (!KINDS.includes(kind as BrickKind)) return `brick ${i} has an unknown kind`;
  if (!optNum(b.hp) || !optStr(b.link) || !optNum(b.tint) || !optStr(b.floe)) return `brick ${i} has a bad field`;
  if (b.drop !== undefined && !PICKUPS.includes(b.drop as PickupKind)) return `brick ${i} has an unknown drop`;
  return null;
}

const arrayOf = (x: unknown, each: (e: unknown) => boolean): boolean => x === undefined || (Array.isArray(x) && x.every(each));
const isPoint = (p: unknown): boolean => isObj(p) && isNum(p.x) && isNum(p.y);

function piecesProblem(o: Obj): string | null {
  if (!arrayOf(o.floes, (f) => isObj(f) && typeof f.id === 'string' && isNum(f.dx) && isNum(f.dy) && isNum(f.period))) return 'bad floes';
  if (!arrayOf(o.shutters, (s) => isObj(s) && [s.x, s.y, s.w, s.h, s.open, s.closed, s.phase].every(isNum))) return 'bad shutters';
  if (!arrayOf(o.spinners, (s) => isObj(s) && [s.x, s.y, s.length, s.period, s.phase].every(isNum))) return 'bad spinners';
  if (!arrayOf(o.whirlpools, (w) => isObj(w) && isPoint(w.a) && isPoint(w.b))) return 'bad whirlpools';
  if (o.boss !== undefined && !(isObj(o.boss) && isNum(o.boss.hits) && isNum(o.boss.shieldW) && isNum(o.boss.speed))) return 'bad boss';
  if (o.dark !== undefined && typeof o.dark !== 'boolean') return 'bad dark';
  return null;
}

export function checkLevel(x: unknown): Checked<LevelDef> {
  if (!isObj(x)) return { ok: false, problem: 'level is not an object' };
  if (typeof x.id !== 'string' || typeof x.name !== 'string') return { ok: false, problem: 'level has no id or name' };
  if (!isInt(x.number) || !isInt(x.chapter) || !isNum(x.par)) return { ok: false, problem: `level ${x.id}: bad number, chapter or par` };
  if (!optStr(x.tip) || !optStr(x.layout)) return { ok: false, problem: `level ${x.id}: bad tip or layout` };
  if (!Array.isArray(x.bricks) || x.bricks.length === 0 || x.bricks.length > MAX_BRICKS) return { ok: false, problem: `level ${x.id}: bad brick list` };
  for (let i = 0; i < x.bricks.length; i++) {
    const p = brickProblem(x.bricks[i], i);
    if (p) return { ok: false, problem: `level ${x.id}: ${p}` };
  }
  const pieces = piecesProblem(x);
  if (pieces) return { ok: false, problem: `level ${x.id}: ${pieces}` };
  // Shape checked: the JSON's fields are the LevelDef's.
  return { ok: true, value: x as unknown as LevelDef };
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
