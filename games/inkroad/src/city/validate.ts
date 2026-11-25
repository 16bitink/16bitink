import type { CityDef, LotDef, LotKind, ToolId } from '../sim/types';
import { expandCells } from '../sim/netPlan';
import { isCommission } from './commissions';
import { blocksMeet, vertexInBlock } from './geometry';
import { isMetric } from './goals';
import { beachProblems } from './validateBeach';

/** Checks a city's data before it is played (the paid cities come from the server). Returns every problem found. */
const KINDS: readonly LotKind[] = ['home', 'market', 'shops', 'office', 'school', 'hospital', 'mall', 'stadium', 'port', 'fair', 'park', 'square', 'landmark'];
const FIXED: Readonly<Partial<Record<LotKind, readonly [number, number]>>> = { market: [4, 3], school: [4, 3], hospital: [4, 3], mall: [6, 4], stadium: [6, 5], port: [6, 3], fair: [6, 5], landmark: [4, 3] };
const PLOTS: ReadonlySet<LotKind> = new Set<LotKind>(['home', 'shops', 'office']);
const TOOLS: readonly ToolId[] = ['street', 'avenue', 'boulevard', 'highway', 'remove', 'junction', 'flyover', 'underpass', 'kerb', 'parking', 'toll', 'bus', 'buslane', 'tram', 'metro', 'boat', 'oneway', 'square', 'zone'];
const ROAD_TYPES = ['street', 'avenue', 'boulevard', 'highway'];
const LETTERS = /^[.~#hpb]+$/;
export const BOUNDS = { cols: 96, rows: 72, lots: 120, roads: 120, gates: 10, beaches: 4, plots: 4, years: 10, text: 400, money: 5000 } as const;
/** Em and en dashes never reach a player. */
const DASH = /[–—]/;

type Obj = Readonly<Record<string, unknown>>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isInt = (x: unknown): x is number => Number.isInteger(x);
const num = (x: unknown, lo: number, hi: number): boolean => typeof x === 'number' && x >= lo && x <= hi;
const text = (x: unknown): boolean => typeof x === 'string' && x.length <= BOUNDS.text && !DASH.test(x);
const list = (x: unknown, max: number): x is readonly unknown[] => Array.isArray(x) && x.length <= max;
const pair = (x: unknown): x is readonly [number, number] => Array.isArray(x) && x.length === 2 && x.every(isInt);

function shape(x: unknown): string[] {
  if (!isObj(x)) return ['not a city'];
  const out: string[] = [];
  const map = x.map;
  if (!list(map, BOUNDS.rows) || map.length === 0 || !map.every((r) => typeof r === 'string' && r.length <= BOUNDS.cols && LETTERS.test(r) && r.length === (map[0] as string).length)) out.push('bad map');
  if (!text(x.id) || !text(x.name) || !text(x.blurb)) out.push('bad texts');
  if (!num(x.startMoney, 0, BOUNDS.money) || !isInt(x.number)) out.push('bad numbers');
  if (!isObj(x.rules) || !num(x.rules.carOwnership, 0, 1) || !num(x.rules.landPrice, 0, 100)) out.push('bad rules');
  if (!list(x.roads, BOUNDS.roads) || !x.roads.every((r) => isObj(r) && ROAD_TYPES.includes(r.type as string) && list(r.cells, 200) && r.cells.length > 1 && r.cells.every(pair))) out.push('bad roads');
  if (!list(x.lots, BOUNDS.lots) || !x.lots.every((l) => isObj(l) && KINDS.includes(l.kind as LotKind) && text(l.name) && text(l.district) && [l.gx, l.gy, l.w, l.h, l.opensYear].every(isInt))) out.push('bad lots');
  if (!list(x.gates, BOUNDS.gates) || !x.gates.every((g) => isObj(g) && text(g.id) && text(g.name) && pair(g.cell) && num(g.weight, 0, 10))) out.push('bad gates');
  if (x.beaches !== undefined && (!list(x.beaches, BOUNDS.beaches) || !x.beaches.every(beachShape))) out.push('bad beaches');
  if (!list(x.years, BOUNDS.years) || x.years.length === 0 || !x.years.every(yearShape)) out.push('bad years');
  return out;
}

const isRect = (r: Obj): boolean => [r.gx, r.gy, r.w, r.h].every((n) => isInt(n) && n >= 0 && n < BOUNDS.cols) && (r.w as number) > 0 && (r.h as number) > 0;

function beachShape(b: unknown): boolean {
  if (!isObj(b) || !text(b.id) || !text(b.name) || !isRect(b) || !isInt(b.decideYear) || b.decideYear < 2 || !num(b.share, 0, 2000)) return false;
  return list(b.plots, BOUNDS.plots) && b.plots.length > 0
    && b.plots.every((p) => isObj(p) && text(p.name) && (p.kind === 'home' || p.kind === 'landmark') && isRect(p) && (p.level === undefined || num(p.level, 1, 4)));
}

function yearShape(y: unknown, i: number): boolean {
  if (!isObj(y) || y.year !== i + 1 || !text(y.name) || !num(y.grant, 0, 1000)) return false;
  if (!list(y.intro, 6) || !y.intro.every((l) => isObj(l) && text(l.text) && text(l.who))) return false;
  if (!list(y.tools, TOOLS.length) || !y.tools.every((t) => TOOLS.includes(t as ToolId))) return false;
  if (!isObj(y.goal) || !text(y.goal.text) || !num(y.goal.target, -1e6, 1e6) || typeof y.goal.kind !== 'string' || !isMetric(y.goal.kind)) return false;
  if (!list(y.events, 12) || !y.events.every((e) => isObj(e) && isInt(e.season) && text(e.kind))) return false;
  if (y.commissions !== undefined && (!list(y.commissions, 4) || !y.commissions.every((id) => typeof id === 'string' && isCommission(id)))) return false;
  return (y.plan === undefined || (list(y.plan, 6) && y.plan.every(text))) && (y.coach === undefined || (list(y.coach, 10) && y.coach.every((s) => isObj(s) && text(s.text))));
}

function lotProblems(def: CityDef, l: LotDef): string[] {
  const out: string[] = [];
  const cols = def.map[0]!.length;
  if (l.gx < 1 || l.gy < 1 || l.gx + l.w > cols - 1 || l.gy + l.h > def.map.length - 1) out.push(`${l.name} is off the map`);
  const size = FIXED[l.kind];
  if (size && (l.w !== size[0] || l.h !== size[1])) out.push(`${l.name} must be ${size[0]} x ${size[1]}`);
  if (PLOTS.has(l.kind) && (l.w % 2 !== 0 || l.h % 2 !== 0)) out.push(`${l.name} must be whole plots of 2 x 2`);
  for (let y = l.gy; y <= l.gy + l.h; y++) for (let x = l.gx; x <= l.gx + l.w; x++) if ('~#pb'.includes(def.map[y]?.[x] ?? '~')) out.push(`${l.name} stands on '${def.map[y]?.[x]}' at ${x},${y}`);
  for (const r of def.roads) for (const c of expandCells(r.cells.map(([gx, gy]) => ({ gx, gy })))) if (vertexInBlock(l, c)) out.push(`a road runs through ${l.name} at ${c.gx},${c.gy}`);
  return out;
}

function layout(def: CityDef): string[] {
  const out = def.lots.flatMap((l) => lotProblems(def, l));
  def.lots.forEach((a, i) => def.lots.slice(i + 1).forEach((b) => { if (blocksMeet(a, b)) out.push(`${a.name} overlaps ${b.name}`); }));
  const names = def.lots.map((l) => l.name);
  out.push(...beachProblems(def));
  const gates = def.gates.map((g) => g.name);
  out.push(...names.filter((n, i) => names.indexOf(n) !== i).map((n) => `two lots are called ${n}`));
  for (const y of def.years) for (const e of y.events) if (e.at && e.at !== 'bridge' && !names.includes(e.at) && !gates.includes(e.at)) out.push(`year ${y.year}: no place called ${e.at}`);
  return out;
}

export function cityProblems(x: unknown): readonly string[] {
  const bad = shape(x);
  return bad.length > 0 ? bad : layout(x as CityDef);
}

/** The city, or an error listing everything wrong with it. */
export function checkCity(x: unknown): CityDef {
  const problems = cityProblems(x);
  if (problems.length > 0) throw new Error(`Bad city: ${problems.join('; ')}`);
  return x as CityDef;
}

