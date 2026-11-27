import { APPROVAL_GOOD, LETTERS_TO_LOSE, MONTHS_PER_SEASON, STEP } from '../sim/constants';
import { addFlyover, planFlyover, setRoad } from '../sim/network';
import type { Network } from '../sim/trafficTypes';
import type { CarPark, Project, Road, TransitLine } from '../sim/types';
import { bump, moveApproval, reportDay, settleApproval, worstBar, writeLetter } from './approval';
import { reviewCommissions } from './commissions';
import { growLots, updateMoods } from './growth';
import { closeBooks, earn, lastMonths, spend, unearned } from './money';
import { commitNetwork } from './network';
import { meanOccupancy } from './parking';
import { warnPurse } from './purse';
import { monthRules, nightRules, reportRules } from './rules';
import { cityTime } from './clock';

import type { City, DayReport, Measures } from './state';
import { emit, has, yearDef } from './state';
import { BAILOUT_TO, DEBT_LIMIT, FLYOVER, INTEREST, PARKS, RIBBON, STAFF_PER_INSPECTOR, STAFF_PER_RANK, TRANSIT } from './tune';
import { feelZone } from './zone';
import { capacity, isRunning, runsOnRoad, syncServices } from './transit';
import { worstSpots, writeComplaints } from './voices';

/** Keep the day's measurements: the traffic clears its own at dawn. */
export function takeMeasures(c: City): Measures {
  return {
    junctions: new Map(c.net.junctions.map((j) => [j.id, c.traffic.junctionStats(j.id)])),
    roads: new Map(c.net.roads.map((r) => [r.id, c.traffic.roadStats(r.id)])),
    movements: new Map(c.net.junctions.filter((j) => j.arms.length >= 3).map((j) => [j.id, c.traffic.movements(j.id)])),
  };
}

/** Roads cost nothing a month: they wear, and are mended by hand (rules/ageing.ts). Car parks have staff and lights. */
export const parksCost = (c: City): number => c.parks.reduce((n, p) => n + PARKS[p.kind].upkeep, 0);
export const transitCost = (c: City): number => Math.round(c.lines.reduce((n, l) => n + (l.works === 0 && !l.mini ? l.vehicles * TRANSIT[l.mode].run * (runsOnRoad(l) && has(c, 'electric') ? 0.67 : 1) : 0), 0));
export const staffCost = (c: City): number => c.policies.inspectors * STAFF_PER_INSPECTOR + c.policies.taxis * STAFF_PER_RANK;
export const interestCost = (c: City): number => (c.money < 0 ? Math.ceil(-c.money * INTEREST) : 0);

/** This month's part of a season's sum in whole coins: the three parts always add up to the whole. */
const monthPart = (whole: number, month: number): number =>
  Math.round((whole * (month + 1)) / MONTHS_PER_SEASON) - Math.round((whole * month) / MONTHS_PER_SEASON);

/** A month's bills and grant: a third of a season's. */
function payBills(c: City): void {
  for (const m of c.oncePaid ? [0, 1, 2] : [c.month]) {
    spend(c, 'parks', monthPart(parksCost(c), m));
    spend(c, 'transit', monthPart(transitCost(c), m));
    spend(c, 'staff', monthPart(staffCost(c), m));
    spend(c, 'interest', monthPart(interestCost(c), m));
    earn(c, 'budget', monthPart(yearDef(c).grant, m));
  }
}

/** A road's works are over: it opens again. */
function openRoad(c: City, net: Network, r: Road): Network {
  emit(c, { t: 'opened', road: r.id, at: r.line[Math.floor(r.line.length / 2)]! });
  return setRoad(net, r.id, { works: 0, worksEnd: undefined });
}

/** A flyover's works are over: its deck opens, or its money comes back if its road went. */
function openFlyover(c: City, net: Network, p: Project): Network | null {
  const plan = planFlyover(net, p.node, p.fromRoad, p.toRoad, p.level);
  if (!plan.ok) { earn(c, 'grant', FLYOVER.base); emit(c, { t: 'toast', who: 'dewy', text: 'The flyover lost its road. The Council gave part of the money back.' }); return null; }
  const out = addFlyover(net, plan);
  const road = out.roads[out.roads.length - 1]!;
  emit(c, { t: 'opened', road: road.id, at: plan.line[Math.floor(plan.line.length / 2)] ?? { x: 0, y: 0 } });
  bump(c, RIBBON.flyover);
  return out;
}

/** Works that run on the clock and are over by now: roads reopen, flyovers and lines open. True if a road or deck opened. */
function endTimedWorks(c: City): { readonly net: Network; readonly opened: boolean; readonly lines: boolean } {
  // Within a step of the end counts: the day's last step stops a hair before the season's end.
  const now = cityTime(c) + STEP;
  const over = (end: number | undefined): boolean => end !== undefined && end <= now;
  let net = c.net;
  let opened = false;
  for (const r of c.net.roads) if (r.works > 0 && over(r.worksEnd)) { net = openRoad(c, net, r); opened = true; }
  const due = c.projects.filter((p) => over(p.ends));
  c.projects = due.length > 0 ? c.projects.filter((p) => !over(p.ends)) : c.projects;
  for (const p of due) { const built = openFlyover(c, net, p); if (built) { net = built; opened = true; } }
  const lines = c.lines.some((l) => l.works > 0 && over(l.ends));
  if (lines) {
    for (const l of c.lines) if (l.works > 0 && over(l.ends)) bump(c, RIBBON.line);
    c.lines = c.lines.map((l): TransitLine => (l.works > 0 && over(l.ends) ? { ...l, works: 0 } : l));
  }
  return { net, opened, lines };
}

/** Once a second of the day: works whose time is up open there and then, not at the next payday. */
export function tickWorks(c: City): void {
  const done = endTimedWorks(c);
  if (done.opened) commitNetwork(c, done.net);
  if (done.lines) syncServices(c);
}

/** Works move on a month: works counted in paydays (a burst pipe, the old freeway, old saves) count one down. */
function advanceWorks(c: City, night: boolean): void {
  const timed = endTimedWorks(c);
  let net = timed.net;
  let opened = timed.opened;
  for (const r of net.roads) {
    if (r.works === 0 || r.worksEnd !== undefined) continue;
    const works = Math.max(0, r.works - 1);
    if (works === 0) { net = openRoad(c, net, r); opened = true; } else net = setRoad(net, r.id, { works });
  }
  const due: Project[] = [];
  c.projects = c.projects.flatMap((p) => {
    if (p.ends !== undefined) return [p];
    if (p.left > 1) return [{ ...p, left: p.left - 1 }];
    due.push(p);
    return [];
  });
  for (const p of due) { const built = openFlyover(c, net, p); if (built) { net = built; opened = true; } }
  const paid = (l: TransitLine): boolean => l.works > 0 && l.ends === undefined;
  const lineOpens = timed.lines || c.lines.some((l) => paid(l) && l.works === 1);
  for (const l of c.lines) if (paid(l) && l.works === 1) bump(c, RIBBON.line);
  c.lines = c.lines.map((l) => (paid(l) ? { ...l, works: l.works - 1 } : l));
  // Only the counts changed: the cars drive on the same roads, so the traffic keeps its own.
  if (night || opened) commitNetwork(c, net); else c.net = net;
  if (lineOpens && !night) syncServices(c);
  if (!night) monthRules(c);
}

function settleParks(c: City): void {
  c.parks = c.parks.map((p): CarPark => {
    const s = c.day.spots.get(`park:${p.id}`);
    return { ...p, used: 0, occupancy: s ? meanOccupancy(s) : 0 };
  });
}

function settleLines(c: City): void {
  c.lines = c.lines.map((l) => {
    if (!isRunning(l)) return { ...l, riders: 0, crowding: 0 };
    const load = (p: 'am' | 'pm'): number => (c.day.stats.lineLoad.get(`${l.id}:${p}`) ?? 0) / capacity(c, l, p);
    return { ...l, riders: c.day.stats.lineRiders.get(l.id) ?? 0, crowding: Math.max(load('am'), load('pm')) };
  });
}

/** Debt: the Council lends once (and writes a letter). The second time is the end. */
function checkDebt(c: City): void {
  if (c.money >= DEBT_LIMIT) return;
  c.bailouts += 1;
  if (c.bailouts > 1) { replace(c, 'The authority ran out of money twice. The Council ran out of patience once.'); return; }
  earn(c, 'grant', BAILOUT_TO - c.money);
  addLetter(c, { year: c.year, season: c.season, approval: Math.round(c.approval), worst: 'cost', text: 'The Council has paid your bills. It will not enjoy doing so again.' });
}

function addLetter(c: City, letter: NonNullable<ReturnType<typeof writeLetter>>): void {
  c.letters = [...c.letters, letter];
  emit(c, { t: 'letter', letter });
}

function replace(c: City, text: string): void {
  c.replacedWhy = { text, spots: worstSpots(c) };
  c.phase = 'replaced';
}

const REPLACED_TEXT = {
  trips: 'The residents could not get anywhere. The Council could not either.',
  parking: 'There was nowhere to stop. So the Council stopped you.',
  cost: 'The city felt like a toll gate with houses.',
  streets: 'Noise, dust and bent bumpers. The Council wants its windows back.',
} as const;

function checkLetters(c: City): void {
  if (yearDef(c).cannotLose) return;
  const letter = writeLetter(c);
  if (letter) addLetter(c, letter);
  checkDebt(c);
  if (c.phase !== 'replaced' && c.letters.length >= LETTERS_TO_LOSE) replace(c, REPLACED_TEXT[worstBar(c.bars)]);
}

/** The day so far as its night would judge it, the special rules' bends in, leaving no trace: their night is still to come. */
function reportSoFar(c: City): DayReport {
  const keep = { rule: c.rule, ownership: c.ownership, sores: c.day.stats.sores.length };
  const r = reportRules(c, reportDay(c));
  if (keep.rule) c.rule = keep.rule; else delete c.rule;
  c.ownership = keep.ownership;
  c.day.stats.sores.length = keep.sores;
  return r;
}

/**
 * A month's end inside the day: approval so far, bills and grant, works. The day runs on.
 * A day restarted from its save passes paydays it had already: what drivers paid then is not this month's.
 */
export function settleMonth(c: City, month: number): void {
  if (month < c.month) { c.ledger = unearned(c.ledger); return; }
  // One payday a season (tests): the works move on, the bills and approval wait for the night.
  if (c.oncePaid) { advanceWorks(c, false); c.month = (month + 1) as City['month']; return; }
  moveApproval(c, reportSoFar(c), (month + 1) / MONTHS_PER_SEASON);
  payBills(c);
  advanceWorks(c, false);
  closeBooks(c);
  c.month = (month + 1) as City['month'];
}

/** Night of a drawn day, the season's last payday: everything that happens between the last car and the review card. */
export function settleSeason(c: City): void {
  c.measures = takeMeasures(c);
  const report = reportRules(c, reportDay(c));
  c.report = report;
  settleApproval(c, report);
  feelZone(c, report);
  c.complaints = writeComplaints(c);
  settleParks(c);
  settleLines(c);
  payBills(c);
  reviewCommissions(c);
  updateMoods(c);
  growLots(c);
  c.traffic.endDay();
  advanceWorks(c, true);
  nightRules(c);
  c.priceBase = c.prices;
  closeBooks(c);
  c.phase = 'review';
  warnPurse(c);
  checkLetters(c);
  emit(c, { t: 'phase', phase: c.phase });
}

/** The year's plates: survive, approval, the target. */
export function yearPlates(c: City, goalMet: boolean): number {
  return 1 + (yearMeanApproval(c) >= APPROVAL_GOOD ? 1 : 0) + (goalMet ? 1 : 0);
}
export const yearMeanApproval = (c: City): number =>
  (c.yearApprovals.length === 0 ? c.approval : c.yearApprovals.reduce((n, v) => n + v, 0) / c.yearApprovals.length);

/** What the books should say next month if nothing changes: a month of the last three's takings, a third of a season's bills. */
export function forecast(c: City): number {
  const i = lastMonths(c).income;
  const takings = i.parking + i.fines + i.tolls + i.fares + i.zone;
  return Math.round((takings + yearDef(c).grant - parksCost(c) - transitCost(c) - staffCost(c) - interestCost(c)) / MONTHS_PER_SEASON);
}

