import type { Bar, Letter } from '../sim/types';
import { APPROVAL_LETTER } from '../sim/constants';
import { mean } from './day';
import { builtArea, cellsToBlock, clamp, distToLine } from './geometry';
import { CELL, ROADS } from '../sim/constants';
import type { City, DayReport } from './state';
import { has } from './state';
import { APPROVAL_EASE, EXPECT_RANGE, FUMES, HABIT, NOISE_PER_HOME, OUTRAGE, PARKING_STRETCH, PARKING_TALK, STREETS, TRIPS_STRETCH, WEIGHTS, WORST_PULL } from './tune';

/** Cars idling at a jam beside people's windows, and the day's lorries. */
function fumes(c: City): number {
  const homes = c.lots.filter((l) => l.kind === 'home' && l.level > 0);
  const cells = Math.max(1, homes.reduce((n, l) => n + builtArea(l), 0));
  const jam = c.net.junctions.filter((j) => j.arms.length >= 3).reduce((sum, j) => {
    const s = c.traffic.junctionStats(j.id);
    if (s.wait <= FUMES.from) return sum;
    const near = homes.filter((l) => cellsToBlock(l, j) <= FUMES.cells).reduce((n, l) => n + builtArea(l), 0);
    return sum + ((s.wait - FUMES.from) * s.cars * near * FUMES.per) / cells;
  }, 0);
  const lorries = Math.max(0, c.day.plan.filter((t) => t.purpose === 'truck').length - FUMES.lorriesFrom) * FUMES.perLorry;
  return Math.min(FUMES.max, jam) + Math.min(FUMES.lorriesMax, lorries);
}

/** Calm streets: works, noise beside big roads, crashes, double parking, cut-through traffic, trees. */
export function streetsScore(c: City): number {
  const works = c.net.roads.filter((r) => r.works > 0);
  const digging = works.reduce((n, r) => n + (r.nightWorks ? STREETS.nightWorks : STREETS.works), 0) + c.projects.length * (c.policies.nightWorks ? STREETS.nightWorks : STREETS.project);
  const s = c.day.stats;
  const calm = c.lots.reduce((n, l) => n + (l.level > 0 && (l.kind === 'park' || l.kind === 'square') ? STREETS.landscape : 0), 0);
  return clamp(STREETS.base + calm - digging - noise(c) - fumes(c) - s.crashes * STREETS.crash - s.doubled * STREETS.double, 0, 100);
}

/** Noise: homes beside busy or big roads. */
function noise(c: City): number {
  const homes = c.lots.filter((l) => l.kind === 'home' && l.level > 0);
  const quiet = has(c, 'quiet') ? 0.6 : 1;
  let sum = 0;
  let cells = 0;
  for (const l of homes) {
    const at = { x: (l.gx + l.w / 2) * CELL, y: (l.gy + l.h / 2) * CELL };
    cells += builtArea(l);
    for (const r of c.net.roads) {
      if (r.level === -1 || distToLine(r.line, at) > CELL * (r.level === 1 ? 3.5 : 2.6)) continue;
      const flow = c.traffic.roadStats(r.id).flow;
      const cut = r.type === 'street' ? Math.max(0, flow - STREETS.cutFrom) * STREETS.cut * 0.1 : 0;
      sum += builtArea(l) * (ROADS[r.type].noise - 1 + cut + (r.level === 1 ? 1.5 : 0)) * quiet;
    }
  }
  return cells === 0 ? 0 : (sum / cells) * NOISE_PER_HOME * 20;
}

const TRIPS_NONE = 65;
/** A day's mean, stretched so that a bad day reads as one; the bottom is soft, so nothing is ever past help. */
export function stretch(points: number, s: { readonly from: number; readonly by: number; readonly soft: number }): number {
  const v = (points - s.from) * s.by;
  return v >= s.soft ? Math.min(100, v) : s.soft * Math.exp((v - s.soft) / s.soft);
}

/** "Eight coins? EIGHT?" Only for what is really charged somewhere. */
function outrage(c: City): number {
  const bays = c.parks.length > 0 || c.net.roads.some((r) => r.kerb);
  const tolls = c.net.roads.some((r) => r.toll) && c.prices.zone === 0;
  const on = { park: bays, parkPeak: bays, fine: c.policies.inspectors > 0, toll: tolls, tollPeak: tolls, fare: c.lines.length > 0, zone: true } as const;
  return (Object.keys(OUTRAGE) as (keyof typeof OUTRAGE)[]).reduce((n, k) => n + (on[k] ? Math.max(0, c.prices[k] - OUTRAGE[k][0]) * OUTRAGE[k][1] : 0), 0);
}

/** The day's parking: everybody's mean, and the talk of the town. */
function parkingBar(c: City): number {
  const s = c.day.stats;
  if (s.parking.w <= 0) return c.bars.parking;
  const all = mean(s.parking, 0);
  const worst = c.lots.filter((l) => l.level > 0 && l.kind !== 'home').flatMap((l) => {
    const t = s.lots.get(l.id)?.parking;
    return t && t.w >= PARKING_TALK.busy ? [{ sum: t.sum, w: t.w }] : [];
  }).sort((a, b) => a.sum / a.w - b.sum / b.w).slice(0, PARKING_TALK.lots);
  const w = worst.reduce((n, t) => n + t.w, 0);
  const talk = w > 0 ? Math.min(all, worst.reduce((n, t) => n + t.sum, 0) / w) : all;
  return stretch(all + (talk - all) * PARKING_TALK.share, PARKING_STRETCH);
}

/** The day in numbers. */
export function reportDay(c: City): DayReport {
  const s = c.day.stats;
  const found: Record<string, number> = {};
  for (const [k, t] of s.found) found[k] = mean(t, 1);
  return {
    trips: stretch(mean(s.trips, TRIPS_NONE), TRIPS_STRETCH), parking: parkingBar(c), cost: clamp(mean(s.cost, c.bars.cost) - outrage(c), 0, 100), streets: streetsScore(c),
    count: s.count, gaveUp: s.gaveUp, stayed: s.stayed, onTime: s.count > 0 ? s.onTime / s.count : 1,
    transit: s.count > 0 ? s.transit / s.count : 0, doubled: s.doubled, fines: s.fines, fined: s.fined,
    meanRatio: mean(s.ratio, 1), meanPay: mean(s.pay, 0), meanSeconds: mean(s.seconds, 0), found, riders: s.riders,
  };
}

export const BAR_EASE = 0.75;

/** Move the bars to what the day was like, then approval to the bars. */
export function settleApproval(c: City, r: DayReport): void {
  const ease = (was: number, now: number): number => was + (now - was) * BAR_EASE;
  c.lastBars = { ...c.bars, approval: c.approval };
  c.bars = { trips: ease(c.bars.trips, r.trips), parking: ease(c.bars.parking, r.parking), cost: ease(c.bars.cost, r.cost), streets: ease(c.bars.streets, r.streets) };
  c.approval = c.approval + (approvalOf(c.bars) - c.approval) * APPROVAL_EASE;
  c.yearApprovals = [...c.yearApprovals, c.approval];
  c.yearHabits = [...c.yearHabits, { ratio: r.meanRatio, pay: r.meanPay, transit: r.transit }];
}

export function approvalOf(bars: Readonly<Record<Bar, number>>): number {
  const keys = Object.keys(WEIGHTS) as Bar[];
  const avg = keys.reduce((n, k) => n + bars[k] * WEIGHTS[k], 0);
  const worst = Math.min(...keys.map((k) => bars[k]));
  return clamp(avg * (1 - WORST_PULL) + worst * WORST_PULL, 0, 100);
}

export const worstBar = (bars: Readonly<Record<Bar, number>>): Bar =>
  (Object.keys(bars) as Bar[]).reduce((w, k) => (bars[k] < bars[w] ? k : w), 'trips' as Bar);

const LETTER_TEXT: Readonly<Record<Bar, string>> = {
  trips: 'The Council was late to its own meeting about being late. Do something about the roads.',
  parking: 'A councillor has been circling the market since Tuesday. Please find him a space.',
  cost: 'Residents say the authority is a cash machine with horns. Charge them less, or give them more.',
  streets: 'The windows rattle, the dust settles on the tea. Make the streets calm again.',
};

export function writeLetter(c: City): Letter | null {
  if (c.approval >= APPROVAL_LETTER) return null;
  const worst = worstBar(c.bars);
  return { year: c.year, season: c.season, approval: Math.round(c.approval), worst, text: LETTER_TEXT[worst] };
}

const avg = (list: readonly number[], none: number): number => (list.length === 0 ? none : list.reduce((n, v) => n + v, 0) / list.length);

/** Last year's miracle becomes this year's normal. */
export function adaptExpectations(c: City): void {
  const ratio = avg(c.yearHabits.map((h) => h.ratio), c.expect.trip);
  const pay = avg(c.yearHabits.map((h) => h.pay), c.expect.pay);
  c.expect = {
    trip: clamp(c.expect.trip + (ratio - c.expect.trip) * HABIT, EXPECT_RANGE.min, EXPECT_RANGE.max),
    pay: Math.max(0, c.expect.pay + (pay - c.expect.pay) * HABIT),
  };
}
