import { APPROVAL_GOOD, CELL, LETTERS_TO_LOSE, ROADS } from '../sim/constants';
import { addFlyover, planFlyover, setRoad } from '../sim/network';
import type { CarPark, Project } from '../sim/types';
import { reportDay, settleApproval, worstBar, writeLetter } from './approval';
import { reviewCommissions } from './commissions';
import { growLots, updateMoods } from './growth';
import { earn, operating, spend } from './money';
import { commitNetwork } from './network';
import { meanOccupancy } from './parking';
import { warnPurse } from './purse';
import { nightRules, reportRules } from './rules';
import { polyLength } from './geometry';

import type { City, Measures } from './state';
import { emit, has, yearDef } from './state';
import { BAILOUT_TO, DEBT_LIMIT, FLYOVER, INTEREST, PARKS, RIBBON, STAFF_PER_INSPECTOR, STAFF_PER_RANK, TRANSIT } from './tune';
import { feelZone } from './zone';
import { capacity, isRunning, runsOnRoad } from './transit';
import { worstSpots, writeComplaints } from './voices';

/** Keep the day's measurements: the traffic clears its own at dawn. */
export function takeMeasures(c: City): Measures {
  return {
    junctions: new Map(c.net.junctions.map((j) => [j.id, c.traffic.junctionStats(j.id)])),
    roads: new Map(c.net.roads.map((r) => [r.id, c.traffic.roadStats(r.id)])),
    movements: new Map(c.net.junctions.filter((j) => j.arms.length >= 3).map((j) => [j.id, c.traffic.movements(j.id)])),
  };
}

const AGE_UPKEEP = 0.03; // roads get dearer as the city ages
export function upkeepCost(c: City): number {
  const roads = c.net.roads.reduce((n, r) => n + (polyLength(r.line) / CELL) * ROADS[r.type].upkeep * (r.level === 0 ? 1 : 3), 0);
  const parks = c.parks.reduce((n, p) => n + PARKS[p.kind].upkeep, 0);
  return Math.round((roads + parks) * (1 + AGE_UPKEEP * (c.year - 1)));
}
export const transitCost = (c: City): number => Math.round(c.lines.reduce((n, l) => n + (l.works === 0 && !l.mini ? l.vehicles * TRANSIT[l.mode].run * (runsOnRoad(l) && has(c, 'electric') ? 0.67 : 1) : 0), 0));
export const staffCost = (c: City): number => c.policies.inspectors * STAFF_PER_INSPECTOR + c.policies.taxis * STAFF_PER_RANK;
export const interestCost = (c: City): number => (c.money < 0 ? Math.ceil(-c.money * INTEREST) : 0);

function payBills(c: City): void {
  spend(c, 'upkeep', upkeepCost(c));
  spend(c, 'transit', transitCost(c));
  spend(c, 'staff', staffCost(c));
  spend(c, 'interest', interestCost(c));
  earn(c, 'budget', yearDef(c).grant);
}

const ribbon = (c: City, points: number): void => { c.approval = Math.min(100, c.approval + points); };

/** Works move on a season: roads reopen, flyovers and lines open. */
function advanceWorks(c: City): void {
  let net = c.net;
  for (const r of c.net.roads) {
    if (r.works === 0) continue;
    const works = Math.max(0, r.works - 1);
    net = setRoad(net, r.id, { works });
    if (works === 0) emit(c, { t: 'opened', road: r.id, at: r.line[Math.floor(r.line.length / 2)]! });
  }
  const due: Project[] = [];
  c.projects = c.projects.flatMap((p) => {
    if (p.left > 1) return [{ ...p, left: p.left - 1 }];
    due.push(p);
    return [];
  });
  for (const p of due) {
    const plan = planFlyover(net, p.node, p.fromRoad, p.toRoad, p.level);
    if (!plan.ok) { earn(c, 'grant', FLYOVER.base); emit(c, { t: 'toast', who: 'zaza', text: 'The flyover lost its road. The Council gave part of the money back.' }); continue; }
    net = addFlyover(net, plan);
    const road = net.roads[net.roads.length - 1]!;
    emit(c, { t: 'opened', road: road.id, at: plan.line[Math.floor(plan.line.length / 2)] ?? { x: 0, y: 0 } });
    ribbon(c, RIBBON.flyover);
  }
  for (const l of c.lines) if (l.works === 1) ribbon(c, RIBBON.line);
  c.lines = c.lines.map((l) => (l.works > 0 ? { ...l, works: l.works - 1 } : l));
  commitNetwork(c, net);
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

/** Night of a drawn day: everything that happens between the last car and the review card. */
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
  advanceWorks(c);
  nightRules(c);
  c.priceBase = c.prices;
  c.lastLedger = c.ledger;
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

/** What the books should say next season if nothing changes. */
export function forecast(c: City): number {
  const inNow = operating(c.lastLedger) + c.lastLedger.costs.upkeep + c.lastLedger.costs.transit + c.lastLedger.costs.staff + c.lastLedger.costs.interest;
  return Math.round(inNow + yearDef(c).grant - upkeepCost(c) - transitCost(c) - staffCost(c) - interestCost(c));
}

