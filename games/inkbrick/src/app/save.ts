/**
 * InkBrick's save: shells per level, best times, the picked raft and trail,
 * sound. Versioned JSON in host.storage; account copies merge with
 * mergeSave (shells OR, best times min), so no device ever loses progress.
 */
export const SAVE_KEY = 'inkbrick.save';
export const SAVE_VERSION = 1;

export type Shells = readonly [boolean, boolean, boolean];

export interface SaveData {
  readonly v: number;
  /** Level number → [cleared, no heart lost, under par]. */
  readonly shells: Readonly<Record<string, Shells>>;
  /** Level number → best clear time in seconds. */
  readonly best: Readonly<Record<string, number>>;
  /** Picked looks (art keys), '' for the default. */
  readonly raft: string;
  readonly trail: string;
  readonly sound: boolean;
}

export const newSave = (): SaveData => ({ v: SAVE_VERSION, shells: {}, best: {}, raft: '', trail: '', sound: true });

export interface Loaded {
  readonly save: SaveData;
  readonly problem: string | null;
}

type Obj = Readonly<Record<string, unknown>>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);

function parseShells(x: unknown): Record<string, Shells> {
  const out: Record<string, Shells> = {};
  if (!isObj(x)) return out;
  for (const [k, v] of Object.entries(x)) {
    if (Array.isArray(v) && v.length === 3 && v.every((b) => typeof b === 'boolean')) out[k] = [v[0], v[1], v[2]] as Shells;
  }
  return out;
}

function parseBest(x: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObj(x)) return out;
  for (const [k, v] of Object.entries(x)) if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = v;
  return out;
}

/** Reads a stored save; anything unreadable gives a fresh save and says why. Never throws. */
export function parseSave(raw: string | null): Loaded {
  if (!raw) return { save: newSave(), problem: null };
  let x: unknown;
  try {
    x = JSON.parse(raw);
  } catch {
    return { save: newSave(), problem: 'save is not JSON' };
  }
  if (!isObj(x) || x.v !== SAVE_VERSION) return { save: newSave(), problem: 'save has another version' };
  return {
    save: {
      v: SAVE_VERSION,
      shells: parseShells(x.shells),
      best: parseBest(x.best),
      raft: typeof x.raft === 'string' ? x.raft : '',
      trail: typeof x.trail === 'string' ? x.trail : '',
      sound: x.sound !== false,
    },
    problem: null,
  };
}

export const serializeSave = (s: SaveData): string => JSON.stringify(s);

/** Both copies' progress: every shell either earned, the better of two best times. Looks and sound stay `mine`. */
export function mergeSave(mine: SaveData, theirs: SaveData): SaveData {
  const shells: Record<string, Shells> = { ...theirs.shells };
  for (const [k, m] of Object.entries(mine.shells)) {
    const t = shells[k];
    shells[k] = t ? [m[0] || t[0], m[1] || t[1], m[2] || t[2]] : m;
  }
  const best: Record<string, number> = { ...theirs.best };
  for (const [k, m] of Object.entries(mine.best)) best[k] = Math.min(m, best[k] ?? Infinity);
  return { ...mine, shells, best };
}

/** The save after a level: shells only ever gained, best time only ever lowered. */
export function recordClear(s: SaveData, n: number, got: Shells, seconds: number): SaveData {
  const k = String(n);
  const had = s.shells[k] ?? [false, false, false];
  const shells = { ...s.shells, [k]: [had[0] || got[0], had[1] || got[1], had[2] || got[2]] as Shells };
  const best = got[0] ? { ...s.best, [k]: Math.min(seconds, s.best[k] ?? Infinity) } : s.best;
  return { ...s, shells, best };
}

export const cleared = (s: SaveData, n: number): boolean => s.shells[String(n)]?.[0] === true;
export const shellCount = (s: SaveData): number => Object.values(s.shells).reduce((a, m) => a + m.filter(Boolean).length, 0);
