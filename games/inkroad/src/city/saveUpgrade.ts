import { MONTHS_PER_SEASON } from '../sim/constants';
import { SAVE_VERSION } from './save';

/**
 * Version 1 saves counted in seasons: one payday a season. Brought up to months they load at the start of
 * their season (a review's at its end), every works and deadline three times as many paydays, the last
 * season's books spread over its three months. Anything malformed is left for saveProblem to refuse.
 */
type Obj = Readonly<Record<string, unknown>>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const num = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const times = (key: string) => (o: unknown): unknown => (isObj(o) ? { ...o, [key]: num(o[key]) * MONTHS_PER_SEASON } : o);
const each = (list: unknown, f: (o: unknown) => unknown): unknown => (Array.isArray(list) ? list.map(f) : list);

const third = (rec: unknown): unknown => (isObj(rec) ? Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, num(v) / MONTHS_PER_SEASON])) : rec);
const month = (l: unknown): unknown => (isObj(l) ? { income: third(l.income), costs: third(l.costs) } : l);

function commission(o: unknown): unknown {
  if (!isObj(o)) return o;
  const { seasonsLeft, endsSeason, ...rest } = o;
  return { ...rest, monthsLeft: num(seasonsLeft) * MONTHS_PER_SEASON, endsMonth: num(endsSeason) * MONTHS_PER_SEASON + MONTHS_PER_SEASON - 1 };
}

function rule(r: unknown): unknown {
  if (!isObj(r) || !isObj(r.freeway)) return r;
  return { ...r, freeway: { ...r.freeway, digs: each(r.freeway.digs, times('left')) } };
}

export function upgradeSave(x: unknown): unknown {
  if (!isObj(x) || x.v !== 1) return x;
  const { lastLedger, ...rest } = x;
  const net = isObj(x.net) ? { ...x.net, roads: each(x.net.roads, times('works')) } : x.net;
  const started = x.phase === 'day' || x.phase === 'yearStart';
  return {
    ...rest, v: SAVE_VERSION, month: started ? 0 : MONTHS_PER_SEASON - 1, net,
    books: isObj(lastLedger) ? [month(lastLedger), month(lastLedger), month(lastLedger)] : [],
    lines: each(x.lines, times('works')), projects: each(x.projects, times('left')), commissions: each(x.commissions, commission),
    ...(x.rule !== undefined ? { rule: rule(x.rule) } : {}),
  };
}
