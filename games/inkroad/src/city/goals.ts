import type { JunctionStats, YearGoal } from '../sim/types';
import { junctionAt } from '../sim/network';
import { mean } from './day';
import { RULE_METRICS } from './rules/metrics';
import type { City } from './state';
import { yearDef } from './state';

/** Targets are small strings: 'wait@22,18', 'found@market', 'bar:trips', 'riders', 'share', 'lost', 'double', 'worstWait', 'approval'. */
interface Metric { readonly unit: string; readonly low: boolean; readonly read: (c: City, now: Numbers, arg: string) => number }

/** What targets are read from: the last day's report, or today so far. */
interface Numbers {
  readonly count: number; readonly gaveUp: number; readonly stayed: number; readonly onTime: number; readonly transit: number;
  readonly doubled: number; readonly fined: number; readonly riders: number;
  found(key: string): number;
  wait(node: number): JunctionStats | undefined;
}

const BUSY = 12; // drawn cars a day before a junction counts
/** Today's numbers show once this much has happened; until then, yesterday's. */
const ENOUGH_TRIPS = 8;
const ENOUGH_CARS = 3;

function lastDay(c: City): Numbers {
  const r = c.report;
  return {
    count: r?.count ?? 0, gaveUp: r?.gaveUp ?? 0, stayed: r?.stayed ?? 0, onTime: r?.onTime ?? 0, transit: r?.transit ?? 0,
    doubled: r?.doubled ?? 0, fined: r?.fined ?? 0, riders: r?.riders ?? 0,
    found: (key) => r?.found[key] ?? 0,
    wait: (node) => c.measures.junctions.get(node),
  };
}

function today(c: City): Numbers {
  const s = c.day.stats;
  const before = lastDay(c);
  const wait = (node: number): JunctionStats | undefined => {
    const live = c.traffic.junctionStats(node);
    return live.cars >= ENOUGH_CARS ? live : before.wait(node) ?? live;
  };
  if (s.count < ENOUGH_TRIPS) return { ...before, wait };
  return {
    count: s.count, gaveUp: s.gaveUp, stayed: s.stayed, onTime: s.onTime / s.count, transit: s.transit / s.count, doubled: s.doubled, fined: s.fined, riders: s.riders,
    found: (key) => mean(s.found.get(key), before.found(key)), wait,
  };
}

function waitAt(c: City, now: Numbers, arg: string): number {
  const [gx, gy] = arg.split(',').map(Number);
  const j = junctionAt(c.net, { gx: gx ?? 0, gy: gy ?? 0 });
  return j ? now.wait(j.id)?.wait ?? 0 : 0;
}

function worstWait(c: City, now: Numbers): number {
  const all = c.net.junctions.filter((j) => j.arms.length >= 3 && !j.ramp).flatMap((j) => { const s = now.wait(j.id); return s && s.cars >= BUSY ? [s.wait] : []; });
  return Math.max(0, ...all);
}

const PC = 100;
const METRICS: Readonly<Record<string, Metric>> = {
  ...RULE_METRICS,
  wait: { unit: 's', low: true, read: waitAt },
  worstWait: { unit: 's', low: true, read: worstWait },
  found: { unit: '%', low: false, read: (_, now, arg) => PC * now.found(`kind:${arg}`) },
  foundIn: { unit: '%', low: false, read: (_, now, arg) => PC * now.found(`district:${arg}`) },
  double: { unit: 'cars', low: true, read: (_, now) => now.doubled },
  fined: { unit: 'fines', low: true, read: (_, now) => now.fined },
  riders: { unit: 'riders', low: false, read: (_, now) => now.riders },
  share: { unit: '%', low: false, read: (_, now) => PC * now.transit },
  lost: { unit: '%', low: true, read: (_, now) => (now.count > 0 ? (PC * (now.gaveUp + now.stayed)) / now.count : 0) },
  onTime: { unit: '%', low: false, read: (_, now) => PC * now.onTime },
  support: { unit: '%', low: false, read: (c) => (c.vote.kept ? 100 : c.vote.support) },
  approval: { unit: '', low: false, read: (c) => c.approval },
  bar: { unit: '', low: false, read: (c, _, arg) => c.bars[arg as keyof typeof c.bars] ?? 0 },
};

const parse = (kind: string): { readonly name: string; readonly arg: string } => {
  const i = kind.search(/[@:]/);
  return i < 0 ? { name: kind, arg: '' } : { name: kind.slice(0, i), arg: kind.slice(i + 1) };
};

export const isMetric = (kind: string): boolean => parse(kind).name in METRICS;

export interface Reading { readonly value: number; readonly met: boolean; readonly unit: string; readonly low: boolean }
export function measure(c: City, kind: string, target: number, live = false): Reading {
  const { name, arg } = parse(kind);
  const m = METRICS[name];
  if (!m) throw new Error(`Unknown target ${kind}`);
  const value = Math.round(m.read(c, live ? today(c) : lastDay(c), arg) * 10) / 10;
  return { value, met: (live || c.report !== null) && (m.low ? value <= target : value >= target), unit: m.unit, low: m.low };
}

/** 0..1 towards a target, for a bar on the desk. */
export function progressOf(c: City, kind: string, target: number): number {
  const r = measure(c, kind, target);
  if (r.met) return 1;
  if (!c.report) return 0;
  return Math.max(0, Math.min(1, r.low ? target / Math.max(0.001, r.value) : r.value / Math.max(0.001, target)));
}

/** The year's target, read live while a day runs. */
export function yearGoal(c: City): YearGoal {
  const g = yearDef(c).goal;
  const r = measure(c, g.kind, g.target, c.phase === 'day');
  return { text: g.text, value: r.value, target: g.target, met: r.met, unit: r.unit };
}
