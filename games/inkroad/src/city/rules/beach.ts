import { APPROVAL_GOOD } from '../../sim/constants';
import type { BeachCase, BeachDef, BeachView, CityView, Lot } from '../../sim/types';
import { no, priced, type Handler } from '../commands/shared';
import { areaOf, cellsToBlock, centreOf, clamp, type Block } from '../geometry';
import { earn, total } from '../money';
import { blockAccess } from '../net';
import { refreshAccess } from '../places';
import { shownYear } from '../standing';
import type { City } from '../state';
import { emit } from '../state';
import { HOME_TOURS, JOBS, LEVEL_PULL, OWNERSHIP, PARK_RADIUS, PURPOSE } from '../tune';
import { beachServed } from './beachSites';
import { LEAN_WHY, planLine } from './beachTexts';
import { ruleState, setRule, type BeachRecord } from './state';

/**
 * Beaches: a year after it is announced the Council decides what becomes of
 * a beach. Sold: villas rise, the authority gets a share, the sea is closed to
 * everybody else. Public: everyone comes, most of all on summer middays, and
 * needs somewhere to leave the car (beachDay.ts, beachSites.ts).
 */
export const BEACH = {
  /** The sand's path to the road may be longer than a driveway, cells. */
  reach: 4.5,
  /** Books are thin under this many seasons of income. */
  poorSeasons: 0.6,
  /** Homes are short when there are this many jobs for each worker. */
  jobsPerWorker: 2,
  trips: 60, streets: 72,
  /** A sale brings people with more cars. */
  owners: 0.012,
  villaLevel: 3,
  /** Everybody likes a ribbon: approval on the day a public beach opens. */
  ribbon: 2.5,
} as const;
/** Villas and hotels on sold sand. */
export const BEACHFRONT = 'Beachfront';

export const beachDefs = (c: City): readonly BeachDef[] => c.def.beaches ?? [];
export const recordOf = (c: City, id: string): BeachRecord | undefined => ruleState(c).beaches[id];
export function setRecord(c: City, id: string, patch: Partial<BeachRecord>): void {
  const was = recordOf(c, id);
  if (was) setRule(c, { beaches: { ...ruleState(c).beaches, [id]: { ...was, ...patch } } });
}
export const beachLot = (c: City, b: Pick<BeachDef, 'name'>): Lot | undefined => c.lots.find((l) => l.kind === 'beach' && l.name === b.name);
export const publicBeaches = (c: City): readonly BeachDef[] => beachDefs(c).filter((b) => recordOf(c, b.id)?.state === 'public');

/** How far the way in may be: paths over sand are longer than driveways. */
export const reachOf = (l: Pick<Lot, 'kind' | 'district'>): number | undefined => (l.kind === 'beach' || l.district === BEACHFRONT ? BEACH.reach : undefined);

// ---------------------------------------------------------------- the Council's mind

interface Lean { readonly lean: 'sell' | 'public'; readonly why: string }

function seasonIncome(c: City): number {
  const { parking, fines, tolls, fares, zone, budget } = c.lastLedger.income;
  return total({ parking, fines, tolls, fares, zone, budget });
}

/** Jobs for each worker living here. */
export function jobsPerWorker(c: City): number {
  let workers = 0;
  let jobs = 0;
  for (const l of c.lots) {
    if (l.level === 0) continue;
    if (l.kind === 'home') workers += areaOf(l) * (HOME_TOURS[l.level] ?? 0) * PURPOSE.work;
    jobs += areaOf(l) * (JOBS[l.kind] ?? 0) * (LEVEL_PULL[l.level] ?? 0);
  }
  return jobs / Math.max(1, workers);
}

/** Poor books or too few homes sell; good trips or calm streets keep it open. */
export function leanOf(c: City): Lean {
  const poor = c.money < seasonIncome(c) * BEACH.poorSeasons;
  const homes = jobsPerWorker(c) > BEACH.jobsPerWorker;
  const trips = c.bars.trips >= BEACH.trips;
  const streets = c.bars.streets >= BEACH.streets;
  const sell = (poor ? 2 : 0) + (homes ? 1 : 0);
  const open = (trips ? 1 : 0) + (streets ? 1 : 0);
  if (sell > open || (homes && sell === open)) return { lean: 'sell', why: poor ? LEAN_WHY.poor : LEAN_WHY.homes };
  return { lean: 'public', why: trips && streets ? LEAN_WHY.calm : trips ? LEAN_WHY.trips : streets ? LEAN_WHY.streets : LEAN_WHY.habit };
}

/** January: a beach whose year has come goes on the Council's table; villas sold last year are lived in. */
export function yearBeaches(c: City): void {
  for (const b of beachDefs(c)) {
    // A year that was skipped (tests, the dev page): nobody asked the Director.
    if (b.decideYear < c.year) decide(c, b, 'out');
    if (b.decideYear !== c.year || recordOf(c, b.id)) continue;
    const { lean, why } = leanOf(c);
    const fresh: BeachRecord = { state: 'open', lean, why, advice: null, line: '', year: c.year, unbooked: 0, visitors: 0, found: 1 };
    setRule(c, { beaches: { ...ruleState(c).beaches, [b.id]: fresh } });
  }
  const levels = new Map(beachDefs(c).flatMap((b) => b.plots.map((p) => [p.name, p.level ?? BEACH.villaLevel] as const)));
  if (!c.lots.some((l) => l.district === BEACHFRONT && l.opensYear === c.year)) return;
  c.lots = c.lots.map((l) => (l.district === BEACHFRONT && l.opensYear === c.year ? { ...l, level: levels.get(l.name) ?? l.level } : l));
  refreshAccess(c);
}

// ---------------------------------------------------------------- the decision

type Advice = 'sell' | 'public' | 'out';
const WORD = { sold: 'sold it', public: 'kept it open for everyone' } as const;

function lineFor(c: City, advice: Advice, lean: 'sell' | 'public', state: 'sold' | 'public'): string {
  const approval = Math.round(c.approval);
  if (advice === 'out') return `You stayed out of it, and the Council ${WORD[state]}.`;
  if (advice === lean) return `You agreed with the Council. It ${WORD[state]}, and is still surprised.`;
  return c.approval >= APPROVAL_GOOD ? `Approval ${approval}: the Council followed your advice and ${WORD[state]}.`
    : `Approval ${approval} is under ${APPROVAL_GOOD}: the Council heard you out and ${WORD[state]}.`;
}

function decide(c: City, b: BeachDef, advice: Advice): void {
  const rec = recordOf(c, b.id);
  if (!rec || rec.state !== 'open') return;
  const wish = advice !== 'out' && c.approval >= APPROVAL_GOOD ? advice : rec.lean;
  const state = wish === 'sell' ? 'sold' : 'public';
  setRecord(c, b.id, { state, advice, line: lineFor(c, advice, rec.lean, state) });
  if (state === 'sold') sell(c, b); else open(c, b);
}

const newLot = (c: City, b: Block, name: string, kind: Lot['kind'], more: Pick<Lot, 'level' | 'opensYear' | 'maxLevel' | 'district' | 'variant'>): Lot =>
  ({ id: c.lots.length, name, kind, gx: b.gx, gy: b.gy, w: b.w, h: b.h, access: null, ...more });

function sell(c: City, b: BeachDef): void {
  for (const [i, p] of b.plots.entries()) {
    c.lots = [...c.lots, newLot(c, p, p.name, p.kind, { level: 0, opensYear: c.year + 1, maxLevel: p.kind === 'home' ? 4 : 1, district: BEACHFRONT, variant: i })];
  }
  earn(c, 'grant', b.share);
  // The books of the season begin at dawn: it is written there too.
  if (c.phase === 'yearStart') setRecord(c, b.id, { unbooked: b.share });
  if (!c.def.rules.licences) c.ownership = Math.min(OWNERSHIP.max, c.ownership + BEACH.owners);
  emit(c, { t: 'toast', who: 'pim', text: `${b.name} is sold. Our share: ${b.share} coins. They smell of sunscreen.` });
}

function open(c: City, b: BeachDef): void {
  const made = newLot(c, b, b.name, 'beach', { level: 1, opensYear: c.year, maxLevel: 1, district: b.name, variant: 0 });
  c.lots = [...c.lots, { ...made, access: blockAccess(c.net, made, BEACH.reach) }];
  // A surface car park that was here already is beach parking now.
  c.parks = c.parks.map((p) => (!p.beach && beachServed(c, p.kind, p) ? { ...p, beach: true } : p));
  c.approval = clamp(c.approval + BEACH.ribbon, 0, 100);
  emit(c, { t: 'toast', who: 'zaza', text: `${b.name} is everyone's. Everyone will come by car, I can already hear them.` });
}

/** The first dawn: nobody asked the Director in time, so the Council goes its way. The sale is written into the season's books. */
export function dawnBeaches(c: City): void {
  for (const b of beachDefs(c)) {
    const rec = recordOf(c, b.id);
    if (!rec) continue;
    if (rec.state === 'open') decide(c, b, 'out');
    if (rec.unbooked > 0) {
      c.ledger = { ...c.ledger, income: { ...c.ledger.income, grant: c.ledger.income.grant + rec.unbooked } };
      setRecord(c, b.id, { unbooked: 0 });
    }
  }
}

export const beach: Handler<'beach'> = {
  quote(c, cmd) {
    const b = beachDefs(c).find((x) => x.id === cmd.id);
    const rec = b && recordOf(c, b.id);
    if (!b || !rec) return no('The Council is not asking yet');
    if (rec.state !== 'open') return no('The Council has decided');
    if (c.phase !== 'yearStart') return no('The Council asks in January');
    return priced(c, 0);
  },
  run(c, cmd) {
    const b = beachDefs(c).find((x) => x.id === cmd.id)!;
    decide(c, b, cmd.advice);
    return centreOf(b);
  },
};

// ---------------------------------------------------------------- what the view reads

const viewCache = new WeakMap<City, { readonly key: readonly unknown[]; readonly list: readonly BeachView[] }>();
const NONE: readonly BeachView[] = [];

/** The same array until something in it changes. */
export function beachViews(c: City): readonly BeachView[] {
  if (beachDefs(c).length === 0) return NONE;
  const key = [c.rule?.beaches, c.parks.length, c.net.version, c.lots.length];
  const have = viewCache.get(c);
  if (have && have.key.every((v, i) => v === key[i])) return have.list;
  const list = beachDefs(c).map((b) => viewOf(c, b));
  viewCache.set(c, { key, list });
  return list;
}

function viewOf(c: City, b: BeachDef): BeachView {
  const rec = recordOf(c, b.id);
  const rect = { gx: b.gx, gy: b.gy, w: b.w, h: b.h };
  const near = [...c.day.spots.values()].filter((s) => (s.kind === 'kerb' || s.kind === 'park') && cellsToBlock(b, s.at) <= PARK_RADIUS);
  const own = new Set(c.parks.filter((p) => p.beach).map((p) => p.id));
  return {
    id: b.id, name: b.name, rect, state: rec?.state ?? 'open', visitors: rec?.visitors ?? 0, found: rec?.found ?? 1,
    beachSpaces: near.reduce((n, s) => n + (s.kind === 'park' && own.has(s.id) ? s.spaces : 0), 0), spaces: near.reduce((n, s) => n + s.spaces, 0),
    reachable: blockAccess(c.net, b, BEACH.reach) !== null, decideYear: b.decideYear,
  };
}

export function beachCase(c: City): CityView['beach'] {
  if (c.phase !== 'yearStart') return undefined;
  const mine = beachDefs(c).filter((b) => b.decideYear === c.year);
  const b = mine.find((x) => recordOf(c, x.id)?.state === 'open') ?? mine[mine.length - 1];
  const rec = b && recordOf(c, b.id);
  if (!b || !rec) return undefined;
  return {
    id: b.id, name: b.name, lean: rec.lean, why: rec.why, follows: c.approval >= APPROVAL_GOOD, approval: Math.round(c.approval), needs: APPROVAL_GOOD,
    share: b.share, plots: b.plots.length, ...(rec.state !== 'open' && rec.advice ? { done: { state: rec.state, advice: rec.advice, line: rec.line } } : {}),
  };
}

/** Announced a year ahead. */
export const beachPlan = (c: City): readonly string[] =>
  beachDefs(c).filter((b) => b.decideYear === c.year + 1).map((b) => planLine(shownYear(c.def, b.decideYear), b.name));
