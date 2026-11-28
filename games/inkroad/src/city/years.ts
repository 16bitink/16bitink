import { APPROVAL_GOOD, YEARS_PER_CITY } from '../sim/constants';
import { addRoad, junctionAt, planRoad, setControl } from '../sim/network';
import { expandCells } from '../sim/netPlan';
import type { Network, RoadPlan } from '../sim/trafficTypes';
import type { Cell, RoadDef } from '../sim/types';
import { adaptExpectations } from './approval';
import { offerCommissions } from './commissions';
import { emptyDay } from './day';
import { createTraffic } from '../sim/traffic';
import { yearGoal } from './goals';
import { driftOwnership } from './growth';
import { earn } from './money';
import { buildSpots } from './parking';
import { buildFleet, parkAllAtHome } from './households';
import { parkingView } from './stand';
import { takeBack } from './purse';
import { refreshAccess } from './places';
import { clearForRoads, settlePlots, squeezeIn } from './plots';
import { mixSeed } from './rng';
import { dawnRules, yearRules } from './rules';
import { shapeNet } from './rules/ground';
import { startDay } from './run';
import { yearMeanApproval, yearPlates } from './settle';
import type { City } from './state';
import { emit, emptyLedger } from './state';
import { offerTechs } from './techs';
import { captureParkedPoses } from './network';
import { blockedBy } from './net';
import { AUCTION } from './tune';
import { NO_VOTE } from './zone';
import { repairLines, syncServices } from './transit';

const SEASONS = 4;
const MIN_COUNCIL_PIECE = 3;

const corners = (r: RoadDef): readonly Cell[] => r.cells.map(([gx, gy]) => ({ gx, gy }));

/** The road as drawn or, where the player built in its way, the longest piece of it that still fits. */
function bestPlan(c: City, net: Network, r: RoadDef): RoadPlan | null {
  const blocked = blockedBy(c);
  const whole = planRoad(net, corners(r), r.type, { blocked });
  if (whole.ok) return whole;
  const cells = expandCells(corners(r));
  for (let n = cells.length - 1; n >= MIN_COUNCIL_PIECE; n--) {
    for (let i = 0; i + n <= cells.length; i++) {
      const piece = planRoad(net, cells.slice(i, i + n), r.type, { blocked });
      if (piece.ok) return piece;
    }
  }
  return null;
}

/** The Council's own roads for a year, joined to whatever the player built. */
function councilRoads(c: City, net: Network): Network {
  let out = net;
  for (const r of c.def.roads) {
    if ((r.opensYear ?? 1) !== c.year || c.year === 1) continue;
    const plan = bestPlan(c, out, r);
    if (plan) out = addRoad(out, plan, { fixed: r.fixed ?? false });
  }
  for (const j of c.def.controls ?? []) {
    if ((j.opensYear ?? 1) !== c.year) continue;
    const node = junctionAt(out, { gx: j.cell[0], gy: j.cell[1] });
    if (node) out = setControl(out, node.id, j.control);
  }
  return out;
}

/** March: roads and districts open and the Council's year card goes up. */
export function beginYear(c: City): void {
  c.season = 0;
  c.month = 0;
  c.phase = 'yearStart';
  c.clock = 0;
  if (c.day.endedAt !== undefined) captureParkedPoses(c);
  clearForRoads(c);
  c.net = councilRoads(c, c.net);
  settlePlots(c);
  squeezeIn(c);
  c.lots = c.lots.map((l) => (l.opensYear === c.year && l.level === 0 ? { ...l, level: c.def.lots[l.id]?.level ?? 1 } : l));
  c.yearApprovals = [];
  c.yearHabits = [];
  if (c.vote.kept === false) c.vote = NO_VOTE;
  c.techChoices = [];
  c.ledger = emptyLedger();
  offerCommissions(c);
  if (c.day.endedAt === undefined) {
    c.day = emptyDay();
    freshTraffic(c);
  } else {
    c.net = shapeNet(c, c.net);
    refreshAccess(c);
    repairLines(c);
    c.traffic.setNetwork(c.net);
    syncServices(c);
    buildSpots(c);
    c.parking = parkingView(c);
  }
  yearRules(c);
  emit(c, { t: 'phase', phase: 'yearStart' });
}

export function freshTraffic(c: City): void {
  c.net = shapeNet(c, c.net);
  c.traffic = createTraffic(c.net, mixSeed(c.seed, c.year), true);
  c.services = new Map();
  refreshAccess(c);
  repairLines(c);
  syncServices(c);
  buildSpots(c);
  // A newly initialized city starts with household cars at home.
  c.fleet = buildFleet(c);
  parkAllAtHome(c);
  c.parking = parkingView(c);
}

function beginDay(c: City): void {
  c.month = 0;
  c.ledger = emptyLedger();
  c.phase = 'day';
  emit(c, { t: 'phase', phase: 'day' });
  dawnRules(c);
  startDay(c);
}

/** The Council's review after the fourth season. */
function endYear(c: City): void {
  const goal = yearGoal(c);
  c.plates = [...c.plates.slice(0, c.year - 1), yearPlates(c, goal.met)];
  if (yearMeanApproval(c) >= APPROVAL_GOOD) c.letters = c.letters.slice(1);
  earn(c, 'auction', Math.round(AUCTION.base + AUCTION.perYear * c.year + AUCTION.perApproval * c.approval));
  takeBack(c);
  adaptExpectations(c);
  driftOwnership(c);
  c.techChoices = offerTechs(c);
  c.phase = 'yearEnd';
  emit(c, { t: 'phase', phase: 'yearEnd' });
}

function nextYear(c: City): void {
  if (c.year >= Math.min(YEARS_PER_CITY, c.def.years.length)) { c.phase = 'cityDone'; emit(c, { t: 'phase', phase: 'cityDone' }); return; }
  c.year += 1;
  beginYear(c);
}

/** Close the card that is up. */
export function next(c: City): boolean {
  if (c.phase === 'yearStart') { beginDay(c); return true; }
  if (c.phase === 'review') {
    if (c.season === SEASONS - 1) { endYear(c); return true; }
    c.season = (c.season + 1) as City['season'];
    beginDay(c);
    return true;
  }
  if (c.phase === 'yearEnd') { nextYear(c); return true; }
  return false;
}

