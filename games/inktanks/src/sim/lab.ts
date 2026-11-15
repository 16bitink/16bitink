import { chapterLevels, labLevel } from './levels';
import { sumIntel } from '../logic/intel';
import type { LoadedLevel } from '../logic/level/load';
import { parseTank } from '../logic/level/load';
import { bonusText } from '../logic/mission/bonus';
import { outcome } from '../logic/mission/outcome';
import type { Loadout } from '../logic/parts';
import { rankOf } from '../logic/rank';
import { asciiMap, MAP_LEGEND } from './asciiMap';
import { intelLine, runChapter } from './chapter';
import { GADGETS, type GadgetKind } from '../logic/match/types';
import { runMission, type RunResult } from './runMission';

/**
 * The level lab, the one tool for tuning levels:
 *   lab -- --level 3                 10 seeds of level 3, the map, a summary
 *   lab -- --level 3 --seeds 30      more seeds
 *   lab -- --level 3 --tank cannon2/medium1/halftracks1    another player tank
 *   lab -- --level 3 --kits 2        repair kits (Corporal and up carry 2)
 *   lab -- --level 3 --gadget smoke  the stand-in's gadget (mines, oil, smoke, none; default mines)
 *   lab -- --level 3 --no-map        skip the map
 *   lab -- --map 3                   only the map
 *   lab -- --all --seeds 10          one summary line per level
 *   lab -- --chapter --seeds 3       the whole-chapter no-grind check
 *   lab -- --campaign --seeds 2      all 50 levels in one run, workshop progress carried
 *   lab -- --all --ch 2              chapter 2's levels (paid, from content/paid.ts); --chapter --ch 2 too; --ch 3, --ch 4, --ch 5 likewise
 * The player's seat is a bot ("a decent casual player"); its default tank
 * per level is what the chapter run fits by then (TYPICAL_TANK).
 */
export interface LabArgs {
  level: number | null;
  seeds: number;
  seed: number;
  tank: string | null;
  kits: number | null;
  gadget: GadgetKind | null;
  map: boolean;
  mapOnly: boolean;
  all: boolean;
  chapter: boolean;
  /** --campaign: all 50 levels in one run, progress carried (the chapter run across chapters). */
  campaign: boolean;
  /** Which chapter --all and --chapter run (default 1). */
  ch: number;
}

/**
 * The tank the campaign run (lab --campaign, seed 1) has fitted when it reaches
 * each level: measured Nov 15 after chapter gear grades (chapter 2 enemies Mk
 * II–III, 3 III–IV, 4 and 5 IV–V) and the rank pace fix. Re-measure after big changes.
 */
export const TYPICAL_TANK: Readonly<Record<number, string>> = {
  1: 'machinegun1/light1/wheels1', 2: 'machinegun1/light1/wheels1', 3: 'cannon1/medium1/halftracks1', 4: 'cannon1/medium1/halftracks1', 5: 'cannon1/medium1/halftracks1', 6: 'cannon1/medium1/wheels2', 7: 'cannon1/medium1/wheels2', 8: 'cannon1/medium1/wheels2', 9: 'cannon1/medium1/wheels2', 10: 'cannon1/medium1/wheels2',
  11: 'cannon1/medium2/tracks2', 12: 'cannon1/medium2/tracks2', 13: 'cannon1/medium2/halftracks2', 14: 'cannon1/medium2/halftracks2', 15: 'cannon1/medium2/halftracks2', 16: 'cannon2/medium2/halftracks2', 17: 'cannon2/medium2/halftracks2', 18: 'cannon2/medium3/halftracks3', 19: 'cannon2/medium3/halftracks3', 20: 'cannon2/medium3/halftracks3',
  21: 'cannon2/medium3/halftracks3', 22: 'cannon2/medium3/halftracks3', 23: 'cannon3/medium3/halftracks3', 24: 'cannon3/medium3/halftracks3', 25: 'cannon3/medium3/halftracks3', 26: 'cannon3/medium4/halftracks4', 27: 'cannon3/medium4/halftracks4', 28: 'cannon3/medium4/halftracks4', 29: 'cannon3/medium4/halftracks4', 30: 'cannon3/medium4/halftracks4',
  31: 'cannon3/medium4/halftracks4', 32: 'cannon3/medium4/halftracks4', 33: 'cannon4/medium4/halftracks4', 34: 'cannon4/medium4/halftracks4', 35: 'cannon4/medium4/halftracks4', 36: 'cannon4/medium4/halftracks4', 37: 'cannon4/medium4/halftracks4', 38: 'cannon4/medium4/halftracks4', 39: 'cannon4/medium4/halftracks4', 40: 'cannon4/medium4/halftracks4',
  41: 'cannon4/medium4/halftracks4', 42: 'cannon4/medium4/halftracks4', 43: 'cannon4/medium4/halftracks4', 44: 'cannon4/medium4/halftracks4', 45: 'cannon4/medium4/halftracks4', 46: 'cannon5/medium5/halftracks5', 47: 'cannon5/medium5/halftracks5', 48: 'cannon5/medium5/halftracks5', 49: 'cannon5/medium5/halftracks5', 50: 'cannon5/medium5/halftracks5',
};
/** Repair kits the chapter run carries by then (a Corporal carries 2). */
const TYPICAL_KITS = (level: number): number => (level >= 3 ? 2 : 1);

export function parseArgs(argv: readonly string[]): LabArgs {
  const a: LabArgs = { level: null, seeds: 10, seed: 1, tank: null, kits: null, gadget: 'mines', map: true, mapOnly: false, all: false, chapter: false, campaign: false, ch: 1 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]!;
    const v = argv[i + 1];
    const n = Number(v);
    if (k === '--level' && Number.isFinite(n)) a.level = n;
    else if (k === '--map' && Number.isFinite(n)) [a.level, a.mapOnly] = [n, true];
    else if (k === '--seeds' && Number.isFinite(n)) a.seeds = n;
    else if (k === '--seed' && Number.isFinite(n)) a.seed = n;
    else if (k === '--kits' && Number.isFinite(n)) a.kits = n;
    else if (k === '--tank' && v) a.tank = v;
    else if (k === '--ch' && Number.isFinite(n)) a.ch = n;
    else if (k === '--gadget' && v) {
      if (v !== 'none' && !(GADGETS as readonly string[]).includes(v)) throw new Error(`lab: --gadget ${v}: want ${GADGETS.join(', ')} or none`);
      a.gadget = v === 'none' ? null : (v as GadgetKind);
    }
    else if (k === '--no-map') a.map = false;
    else if (k === '--all') a.all = true;
    else if (k === '--chapter') a.chapter = true;
    else if (k === '--campaign') a.campaign = true;
    else continue;
    if (!k.startsWith('--no') && k !== '--all' && k !== '--chapter' && k !== '--campaign') i++;
  }
  if (!a.all && !a.chapter && !a.campaign && a.level === null) throw new Error('lab: give --level N, --map N, --all or --chapter');
  if (a.level !== null) labLevel(a.level);
  if (a.tank) parseTank(a.tank);
  return a;
}

const avg = (xs: readonly number[]): number => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const pct = (x: number): string => `${Math.round(x * 100)}%`;
export const fmt = (s: number): string => {
  const r = Math.round(s);
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`;
};

function runs(level: LoadedLevel, a: LabArgs): { loadout: Loadout; kits: number; results: RunResult[] } {
  const n = level.def.number;
  const loadout = parseTank(a.tank ?? TYPICAL_TANK[n] ?? TYPICAL_TANK[1]!);
  const kits = a.kits ?? TYPICAL_KITS(n);
  const results = Array.from({ length: a.seeds }, (_, i) => runMission({ level, seed: a.seed + i, player: { loadout, kits, gadget: a.gadget } }));
  return { loadout, kits, results };
}

function medalsOf(level: LoadedLevel, r: RunResult): string {
  const o = outcome(level.def, r.report!, undefined);
  return o.done.map((d) => (d ? 'x' : '.')).join('');
}

/** One line per seed. */
export function seedLine(level: LoadedLevel, seed: number, r: RunResult): string {
  const rep = r.report!;
  const foes = r.tanks.filter((t) => t.team !== 0 && (t.role === 'tank' || t.role === 'truck'));
  return `  seed ${String(seed).padStart(3)}  ${r.passed ? 'PASS' : 'fail'}  ${fmt(r.time).padStart(5)}  medals ${medalsOf(level, r)}  kills ${String(rep.kills).padStart(2)}  intel ${String(rep.intelCount).padStart(2)}  hp ${pct(r.playerHp).padStart(4)}  foes left ${foes.filter((t) => t.alive).length}/${foes.length}  alarm ${rep.alarm ? 'yes' : 'no '}  amb ${String(r.ambushHits).padStart(2)}  gad ${r.gadgetsUsed}  spot ${String(r.spotted).padStart(2)}  end: ${r.reason}`;
}

/** The summary line the tuning loop reads. */
export function summaryLine(level: LoadedLevel, results: readonly RunResult[]): string {
  const d = level.def;
  const outs = results.map((r) => outcome(d, r.report!, undefined));
  const times = results.map((r) => r.time);
  const passTimes = results.filter((r) => r.passed).map((r) => r.time);
  const share = (i: number) => pct(avg(outs.map((o) => (o.done[i] ? 1 : 0))));
  const ends = new Map<string, number>();
  for (const r of results) ends.set(r.reason, (ends.get(r.reason) ?? 0) + 1);
  return `L${d.number} ${d.name} (${d.type}): pass ${results.filter((r) => r.passed).length}/${results.length}  time ${fmt(avg(passTimes.length ? passTimes : times))} (${fmt(Math.min(...times))}–${fmt(Math.max(...times))})  medals main ${share(0)} b1 ${share(1)} b2 ${share(2)}  kills ${avg(results.map((r) => r.report!.kills)).toFixed(1)}  intel ${avg(results.map((r) => r.report!.intelCount)).toFixed(1)}  ambush ${avg(results.map((r) => r.ambushHits)).toFixed(1)}  gadgets ${avg(results.map((r) => r.gadgetsUsed)).toFixed(1)}  spotted ${avg(results.map((r) => r.spotted)).toFixed(1)}  ends: ${[...ends].map(([k, v]) => `${k} ${v}`).join(', ')}`;
}

export function levelReport(a: LabArgs): string {
  const level = labLevel(a.level!);
  const d = level.def;
  const lines: string[] = [];
  if (a.map || a.mapOnly) lines.push(`Level ${d.number} ${d.name}: ${d.map.cols}×${d.map.rows} screens, ${d.type}`, asciiMap(level), MAP_LEGEND, '');
  if (a.mapOnly) return lines.join('\n');
  const { loadout, kits, results } = runs(level, a);
  const tank = `${loadout.gun.family}${loadout.gun.mk}/${loadout.hull.family}${loadout.hull.mk}/${loadout.drive.family}${loadout.drive.mk}`;
  lines.push(`Level ${d.number} ${d.name}, ${a.seeds} seeds from ${a.seed}, player bot on ${tank} with ${kits} kit(s), gadget ${a.gadget ?? 'none'}${d.timeLimit ? `, timer ${fmt(d.timeLimit)}` : ''}`);
  lines.push(`  bonus 1: ${bonusText(d.bonus[0])}   bonus 2: ${bonusText(d.bonus[1])}`);
  results.forEach((r, i) => lines.push(seedLine(level, a.seed + i, r)));
  lines.push(summaryLine(level, results));
  lines.push(`  sim ms per run ${Math.round(avg(results.map((r) => r.ms)))}  flow fields per run ${Math.round(avg(results.map((r) => r.flowBuilds)))}`);
  return lines.join('\n');
}

export function chapterReport(a: LabArgs): string {
  const lines: string[] = [];
  let ok = 0;
  const levels = a.campaign ? [1, 2, 3, 4, 5].flatMap((c) => chapterLevels(c)) : chapterLevels(a.ch);
  for (let s = 0; s < a.seeds; s++) {
    const r = runChapter(levels, a.seed + s);
    if (r.verdict.ok) ok++;
    lines.push(`${a.campaign ? 'Campaign' : `Chapter ${a.ch}`}, seed ${a.seed + s}`);
    lines.push('  lv name                 tries  medals  XP    rank            intel  tank at start                   ends  | parts fitted from the ground');
    for (const row of r.rows) {
      const medals = row.outcome.done.map((x) => (x ? 'x' : '.')).join('');
      lines.push(`  ${String(row.level).padStart(2)} ${row.name.padEnd(20)} ${String(row.attempts).padStart(5)}  ${medals.padEnd(6)} ${String(row.xp).padStart(5)}  ${row.rank.padEnd(15)} ${String(sumIntel(row.intel)).padStart(5)}  ${row.loadout.padEnd(31)} ${row.ends.join(', ')}  | ${row.picks}`);
    }
    const p = r.progress;
    lines.push(`  end: ${rankOf(p.xp).name} (${p.xp} XP), bonus medals ${pct(r.bonusShare)}, total intel ${intelLine(p.intelTotal)}`);
    lines.push(`  unlocked ${p.unlocked.join(', ')}; Mk ${Object.entries(p.mk).map(([k, v]) => `${k} ${v}`).join(', ')}`);
    lines.push(`  no-grind: ${r.verdict.ok ? 'PASS' : 'FAIL'}: ${r.verdict.detail}`);
  }
  lines.push(`No-grind check passed on ${ok} of ${a.seeds} seeds.`);
  return lines.join('\n');
}

export function allReport(a: LabArgs): string {
  return chapterLevels(a.ch).map((level) => summaryLine(level, runs(level, a).results)).join('\n');
}

export function main(argv: readonly string[]): string {
  const a = parseArgs(argv);
  if (a.chapter || a.campaign) return chapterReport(a);
  if (a.all) return allReport(a);
  return levelReport(a);
}
