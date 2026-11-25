import { YEARS_PER_CITY } from '../sim/constants';

/**
 * InkRoad's save: for each city the furthest year reached, the best plates of
 * each year, one snapshot taken at the start of each year, and an autosave from
 * the last season review. Versioned JSON in host.storage; account copies merge
 * (further progress wins, best plates) so no device loses anything.
 */
export const SAVE_KEY = 'inkroad.save';
export const SAVE_VERSION = 1;
export const MAX_CITIES = 5;
export const MAX_PLATES = 3;
/** A snapshot bigger than this (as JSON) is dropped rather than stored. */
export const MAX_SNAPSHOT_CHARS = 1_500_000;
/** `reached` is 1..10 while playing year `reached`, and 11 once the city is finished. */
export const FINISHED = YEARS_PER_CITY + 1;

export interface AutoSave { readonly year: number; readonly season: number; readonly snap: unknown }

export interface CitySave {
  readonly reached: number;
  /** Best plates per year, index 0 = year 1. */
  readonly plates: readonly number[];
  /** Year number (as text) to the city's snapshot at that year's start. */
  readonly years: Readonly<Record<string, unknown>>;
  readonly auto: AutoSave | null;
}

export interface SaveData {
  readonly v: number;
  readonly sound: boolean;
  /** Where Continue goes. */
  readonly last: { readonly city: number; readonly year: number } | null;
  readonly cities: Readonly<Record<string, CitySave>>;
}

export const newCitySave = (): CitySave => ({ reached: 1, plates: new Array<number>(YEARS_PER_CITY).fill(0), years: {}, auto: null });
export const newSave = (): SaveData => ({ v: SAVE_VERSION, sound: true, last: null, cities: {} });

type Obj = Readonly<Record<string, unknown>>;
export const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);

const clampInt = (x: unknown, lo: number, hi: number, dflt: number): number =>
  typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.floor(x))) : dflt;

function snapshotOk(x: unknown): boolean {
  if (!isObj(x)) return false;
  try {
    return JSON.stringify(x).length <= MAX_SNAPSHOT_CHARS;
  } catch {
    return false;
  }
}

function parsePlates(x: unknown): number[] {
  const out = new Array<number>(YEARS_PER_CITY).fill(0);
  if (Array.isArray(x)) for (let i = 0; i < YEARS_PER_CITY; i++) out[i] = clampInt(x[i], 0, MAX_PLATES, 0);
  return out;
}

function parseYears(x: unknown, reached: number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!isObj(x)) return out;
  for (const [k, v] of Object.entries(x)) {
    const y = Number(k);
    if (Number.isInteger(y) && y >= 1 && y <= Math.min(reached, YEARS_PER_CITY) && snapshotOk(v)) out[String(y)] = v;
  }
  return out;
}

function parseAuto(x: unknown): AutoSave | null {
  if (!isObj(x) || !snapshotOk(x.snap)) return null;
  return { year: clampInt(x.year, 1, YEARS_PER_CITY, 1), season: clampInt(x.season, 0, 3, 0), snap: x.snap };
}

function parseCity(x: unknown): CitySave | null {
  if (!isObj(x)) return null;
  const reached = clampInt(x.reached, 1, FINISHED, 1);
  return { reached, plates: parsePlates(x.plates), years: parseYears(x.years, reached), auto: parseAuto(x.auto) };
}

export interface Loaded { readonly save: SaveData; readonly problem: string | null }

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
  const cities: Record<string, CitySave> = {};
  if (isObj(x.cities)) {
    for (const [k, v] of Object.entries(x.cities)) {
      const n = Number(k);
      const c = Number.isInteger(n) && n >= 1 && n <= MAX_CITIES ? parseCity(v) : null;
      if (c) cities[String(n)] = c;
    }
  }
  const last = isObj(x.last) ? { city: clampInt(x.last.city, 1, MAX_CITIES, 1), year: clampInt(x.last.year, 1, YEARS_PER_CITY, 1) } : null;
  return { save: { v: SAVE_VERSION, sound: x.sound !== false, last, cities }, problem: null };
}

export const serializeSave = (s: SaveData): string => JSON.stringify(s);

const later = (a: AutoSave | null, b: AutoSave | null): AutoSave | null => {
  if (!a || !b) return a ?? b;
  return b.year * 4 + b.season > a.year * 4 + a.season ? b : a;
};

function mergeCity(a: CitySave, b: CitySave): CitySave {
  return {
    reached: Math.max(a.reached, b.reached),
    plates: a.plates.map((p, i) => Math.max(p, b.plates[i] ?? 0)),
    years: { ...b.years, ...a.years },
    auto: later(a.auto, b.auto),
  };
}

/** Both copies' progress: the further year, the best plates, every year snapshot, the later autosave. Sound and Continue stay `mine`. */
export function mergeSave(mine: SaveData, theirs: SaveData): SaveData {
  const cities: Record<string, CitySave> = { ...theirs.cities };
  for (const [k, m] of Object.entries(mine.cities)) {
    const t = cities[k];
    cities[k] = t ? mergeCity(m, t) : m;
  }
  return { ...mine, last: mine.last ?? theirs.last, cities };
}

export const citySave = (s: SaveData, city: number): CitySave => s.cities[String(city)] ?? newCitySave();
const withCity = (s: SaveData, city: number, c: CitySave): SaveData => ({ ...s, cities: { ...s.cities, [String(city)]: c } });

/** The save after a year starts: its snapshot kept, progress moved up, and Continue pointing here. */
export function recordYearStart(s: SaveData, city: number, year: number, snap: unknown): SaveData {
  const c = citySave(s, city);
  const years = snapshotOk(snap) ? { ...c.years, [String(year)]: snap } : c.years;
  return { ...withCity(s, city, { ...c, reached: Math.max(c.reached, year), years, auto: null }), last: { city, year } };
}

/** The save after a season review: the autosave replaced. */
export function recordAuto(s: SaveData, city: number, year: number, season: number, snap: unknown): SaveData {
  if (!snapshotOk(snap)) return s;
  return withCity(s, city, { ...citySave(s, city), auto: { year, season, snap } });
}

/** The save after a year ends: plates only ever rise; the city moves on (or is finished after year 10). */
export function recordYearEnd(s: SaveData, city: number, year: number, plates: number): SaveData {
  const c = citySave(s, city);
  const next = c.plates.map((p, i) => (i === year - 1 ? Math.max(p, clampInt(plates, 0, MAX_PLATES, 0)) : p));
  return withCity(s, city, { ...c, plates: next, reached: Math.max(c.reached, year + 1), auto: null });
}

export const totalPlates = (c: CitySave): number => c.plates.reduce((a, b) => a + b, 0);
export const isFinished = (c: CitySave): boolean => c.reached >= FINISHED;
/** Whether any city has been played, for "Continue". */
export const started = (s: SaveData): boolean => Object.keys(s.cities).length > 0;

/** Years of a city that can be opened: every year reached (one without a snapshot is replayed by the city). */
export const savedYears = (c: CitySave): number[] =>
  Array.from({ length: Math.min(c.reached, YEARS_PER_CITY) }, (_, i) => i + 1);
