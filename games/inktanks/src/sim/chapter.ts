import type { LoadedLevel } from '../logic/level/load';
import { applyOutcome, type Outcome } from '../logic/mission/outcome';
import { sumIntel } from '../logic/intel';
import { perksOf, rankOf } from '../logic/rank';
import { wingmanLoadouts } from '../logic/wingmanFit';
import { newProgress, type IntelBag, type Progress } from '../logic/workshop';
import { fitBest, noGrindCheck, spendIntel, type NoGrindVerdict } from './policy';
import { runMission } from './runMission';

export interface MissionRow {
  readonly level: number;
  readonly name: string;
  readonly attempts: number;
  /** Why each attempt ended. */
  readonly ends: readonly string[];
  readonly passed: boolean;
  readonly outcome: Outcome;
  readonly intel: IntelBag;
  readonly xp: number;
  readonly rank: string;
  readonly loadout: string;
  readonly time: number;
  /** Parts the stand-in fitted from the ground in its last attempt ("cannon3 hover1"). */
  readonly picks: string;
}

export interface ChapterResult {
  readonly rows: readonly MissionRow[];
  readonly progress: Progress;
  readonly verdict: NoGrindVerdict;
  readonly bonusShare: number;
}

/**
 * The whole-chapter no-grind check: the stand-in player plays each level
 * (retrying on a fail, as the game does, keeping intel either way), spends
 * intel in the workshop between levels, and refits its starting tank.
 * `rankPerks` false leaves out wingmen and call-ins (to measure what they add).
 */
export function runChapter(levels: readonly LoadedLevel[], seed: number, maxAttempts = 6, rankPerks = true): ChapterResult {
  let p = newProgress();
  const rows: MissionRow[] = [];
  for (const level of levels) {
    const def = level.def;
    const ends: string[] = [];
    let attempts = 0;
    let last: Outcome | null = null;
    let intel: IntelBag = {};
    let xp = 0;
    let time = 0;
    let picks = '';
    const loadout = `${p.loadout.gun.family}${p.loadout.gun.mk}/${p.loadout.hull.family}${p.loadout.hull.mk}/${p.loadout.drive.family}${p.loadout.drive.mk}`;
    while (attempts < maxAttempts) {
      attempts++;
      const perks = perksOf(p.xp);
      const r = runMission({ level, seed: seed * 1000 + def.number * 37 + attempts, player: { loadout: p.loadout, research: p.research, kits: perks.repairKits, ...(rankPerks ? { wingmen: perks.wingmen, wingmanLoadouts: wingmanLoadouts(p), supplyDrop: perks.supplyDrop, strike: perks.strike } : {}) } });
      if (!r.report) break;
      const applied = applyOutcome(p, def, r.report);
      p = applied.progress;
      last = applied.outcome;
      intel = Object.fromEntries(Object.entries(r.report.intel).map(([k, v]) => [k, (intel[k as keyof IntelBag] ?? 0) + (v ?? 0)]));
      xp += applied.outcome.xp;
      time += r.time;
      ends.push(r.reason);
      picks = r.report.picks.map((x) => `${x.family}${x.mk}`).join(' ');
      if (r.passed) break;
    }
    p = fitBest(spendIntel(p));
    rows.push({ level: def.number, name: def.name, attempts, ends, passed: last?.passed ?? false, outcome: last!, intel, xp, rank: rankOf(p.xp).name, loadout, time, picks });
  }
  const medals = Object.values(p.medals);
  const bonusShare = medals.reduce((s, m) => s + (m[1] ? 1 : 0) + (m[2] ? 1 : 0), 0) / (2 * levels.length);
  return { rows, progress: p, verdict: noGrindCheck(p), bonusShare };
}

export function intelLine(bag: IntelBag): string {
  return `${sumIntel(bag)} (${Object.entries(bag).map(([k, v]) => `${k} ${v}`).join(', ')})`;
}
