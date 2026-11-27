import { MONTHS_PER_SEASON, STEP } from '../sim/constants';
import { setRoad } from '../sim/network';
import { isPeak, NIGHT_END, PAYDAYS, periodAt, SEASON_END, WEEKEND_AT } from './clock';
import type { Leg, Tour } from './day';
import { emptyDay } from './day';
import { planDay, planWeekend } from './demand';
import { busyCars, lateLeg, nightSweep, sendStrandedHome, smallHours } from './hops';
import { buildFleet, parkAllAtHome } from './households';
import { parkingView } from './stand';
import { createDice } from './rng';
import { tickRules } from './rules';
import { wirePrice } from './rules/speedTolls';
import { happen, pipeRoad, todayPlan } from './happenings';
import { arrive, closeWorkday, gaveUp, leaveAll, retryWaiting, startTour } from './legs';
import { commitNetwork } from './network';
import { buildSpots, publishParks, sampleSpots } from './parking';
import { accessOf } from './places';
import { scoreLost, scorePricedOut, scoreTrip } from './score';
import { settleMonth, tickWorks } from './settle';
import type { City } from './state';
import { emit, has } from './state';
import { pointOf } from './places';
import { COST, PREWARM } from './tune';
import { answerPrices } from './payers';
import { syncServices } from './transit';

const RETRY_EVERY = 0.5;
const WATCH_EVERY = 1;
const HONKS_PER_STEP = 2;
const RED = new Set(['D', 'E', 'F']);
const CALM = new Set(['A', 'B']);
/** Seconds a household waits for its car before trying to set off again. */
const BUSY_WAIT = 2;
/** The parking view is rebuilt at most this often (seconds). */
const PARKING_EVERY = 0.5;

/** Everyone's first day is the same one: a good jam, in the right place. */
export const FIRST_MORNING = { seed: 24 };
function firstMorning<T>(c: City, plan: () => T): T {
  if (c.year > 1 || c.season > 0) return plan();
  const own = c.dice;
  c.dice = createDice(FIRST_MORNING.seed);
  const out = plan();
  c.dice = own;
  return out;
}

/** Dawn: plan the day and open the roads. */
export function startDay(c: City): void {
  c.clock = -PREWARM;
  c.carry = 0;
  c.opening = { bars: c.bars, approval: c.approval };
  c.day = emptyDay();
  buildSpots(c);
  c.fleet = buildFleet(c);
  parkAllAtHome(c);
  c.traffic.startDay();
  const pipe = pipeRoad(c);
  // A burst pipe digs for the rest of the season: it is done at the season's last payday.
  if (pipe !== null) commitNetwork(c, setRoad(c.net, pipe, { works: MONTHS_PER_SEASON - c.month }));
  syncServices(c);
  const today = todayPlan(c);
  c.weather = { speed: today.speed, crashes: 0 };
  c.day.agenda = [...today.agenda];
  c.day.plan = firstMorning(c, () => answerPrices(c, planDay(c, today.crowds, today.schoolRate)));
  c.parking = parkingView(c);
  conditions(c);
  preWarm(c);
}

/** The morning is already under way when the curtain rises; what happened before it makes no sound. */
function preWarm(c: City): void {
  const heard = c.events;
  while (c.clock < -STEP / 2) stepDay(c);
  c.clock = 0;
  c.events = heard;
}

/** Tolls and speeds change with the hour. */
function conditions(c: City): void {
  const p = periodAt(c.clock);
  if (c.day.period === p) return;
  c.day.period = p;
  applyConditions(c);
}

export function applyConditions(c: City): void {
  c.traffic.setConditions({
    tollNow: wirePrice(c) ?? (c.prices.zone > 0 ? c.prices.zone : isPeak(c.clock) ? c.prices.tollPeak : c.prices.toll), speed: c.weather.speed, trucksAllowed: !c.policies.truckHours || !isPeak(c.clock),
  });
}

/** Some people leave later when the peak is bad (once each). */
function retime(c: City, t: Tour): boolean {
  if (t.until === null && t.purpose !== 'shop') return false;
  if (!isPeak(c.clock) || c.day.retimed.has(t.id)) return false;
  const a = accessOf(c, t.from);
  const b = accessOf(c, t.to);
  if (!a || !b) return false;
  const jam = c.report ? c.report.meanRatio : 1;
  const push = Math.max(0, jam - COST.retimeFrom) * 0.4 + (has(c, 'forecast') ? 0.08 : 0);
  c.day.retimed.add(t.id);
  if (c.dice.next() >= Math.min(COST.retimeMax, push)) return false;
  insert(c, { ...t, leave: c.clock + c.dice.range(8, 20) });
  return true;
}

function insert(c: City, t: Tour): void {
  const rest = c.day.plan.slice(c.day.next);
  const i = rest.findIndex((x) => x.leave > t.leave);
  const at = i < 0 ? rest.length : i;
  c.day.plan = [...c.day.plan.slice(0, c.day.next), ...rest.slice(0, at), t, ...rest.slice(at)];
}

function depart(c: City): void {
  let busy: Set<number> | null = null;
  for (;;) {
    const t = c.day.plan[c.day.next];
    if (!t || t.leave > c.clock) return;
    c.day.next += 1;
    // A car is never in two places: a day whose car is still out (a late night) waits until it is free.
    const car = t.chain?.car ?? null;
    if (car !== null && (busy ??= busyCars(c)).has(car)) { insert(c, { ...t, leave: c.clock + BUSY_WAIT }); continue; }
    if (!retime(c, t)) startTour(c, t);
  }
}

/** Tell the view when a junction turns red or calms down. */
function watch(c: City): void {
  for (const j of c.net.junctions) {
    if (j.arms.length < 3) continue;
    const grade = c.traffic.junctionStats(j.id).grade;
    if (RED.has(grade) && !c.day.red.has(j.id)) { c.day.red.add(j.id); emit(c, { t: 'jammed', node: j.id }); }
    if (CALM.has(grade) && c.day.red.delete(j.id)) emit(c, { t: 'cleared', node: j.id });
  }
}

const every = (c: City, seconds: number): boolean => Math.floor(c.clock / seconds) !== Math.floor((c.clock - STEP) / seconds);

const crossed = (c: City, at: number): boolean => c.clock >= at - STEP / 2 && c.clock - STEP < at - STEP / 2;

/** The workday is over: the weekend's title. The small hours are over: everyone is home, and the weekend's plan begins. */
function nightAndWeekend(c: City): void {
  if (crossed(c, WEEKEND_AT)) { closeWorkday(c); emit(c, { t: 'weekend' }); }
  if (!crossed(c, NIGHT_END)) return;
  smallHours(c);
  const shared = c.day.shared;
  const weekend = answerPrices(c, planWeekend(c));
  c.day.shared = [...shared, ...c.day.shared];
  c.day.plan = [...c.day.plan.slice(0, c.day.next), ...[...c.day.plan.slice(c.day.next), ...weekend].sort((a, b) => a.leave - b.leave || a.id - b.id)];
}

/** One fixed step of the season, with its mid-day paydays. Returns true when the weekend's night falls. */
export function stepDay(c: City): boolean {
  c.clock += STEP;
  nightAndWeekend(c);
  conditions(c);
  while (c.clock > 0 && c.day.agenda[0] && c.day.agenda[0].at <= c.clock) {
    const e = c.day.agenda.shift()!;
    happen(c, e.kind, e.place);
  }
  depart(c);
  leaveAll(c);
  retryWaiting(c, every(c, RETRY_EVERY));
  holdCrossings(c);
  c.traffic.step();
  for (const a of c.traffic.drainArrivals()) arrive(c, a);
  for (const a of c.traffic.drainGaveUp()) gaveUp(c, a);
  for (const at of c.traffic.drainHonks().slice(0, HONKS_PER_STEP)) emit(c, { t: 'honk', at });
  if (every(c, WATCH_EVERY)) { tickWorks(c); sendStrandedHome(c); sampleSpots(c); publishParks(c); watch(c); if (tickRules(c)) applyConditions(c); }
  if (c.day.parkingDirty && (c.day.parkingNow || every(c, PARKING_EVERY))) { c.day.parkingDirty = false; c.day.parkingNow = false; c.parking = parkingView(c); }
  // The months that end inside the day; the last one ends with it.
  for (let m = 0; m < MONTHS_PER_SEASON - 1; m++) if (crossed(c, PAYDAYS[m]!)) settleMonth(c, m);
  return c.clock >= SEASON_END - STEP / 2;
}

/** Night: whoever is still on the road gets home late. */
export function endDay(c: City): void {
  nightSweep(c);
  c.parking = parkingView(c);
  for (const s of c.day.shared) scorePricedOut(c, s, s.coins);
  for (const leg of c.day.waiting) scoreLost(c, leg, pointOf(c, leg.out ? leg.tour.from : leg.tour.to), 'gaveUp');
  c.day.waiting = [];
  for (const leg of c.day.legs) if (!leg.done) lateLeg(c, leg);
}

/** Cars that waited for their gap across the road now hold the far lanes while their bodies are in them. */
function holdCrossings(c: City): void {
  const due = c.day.crossings.filter((k) => k.from <= c.clock + 1e-6);
  if (due.length === 0) return;
  c.day.crossings = c.day.crossings.filter((k) => k.from > c.clock + 1e-6);
  for (const k of due) c.traffic.holdAcross(k.at, k.a, k.seconds);
}
