import type { MatchReport } from '../match/report';
import { FINAL_LEVEL } from '../ending';
import { RANKS, XP } from '../rank';
import type { Family } from '../parts';
import { addGadgetIntel, addIntel, grantFamily, keepProtos, type Progress } from '../workshop';
import type { LevelDef } from '../level/types';
import { bonusMet } from './bonus';

export type Medals = readonly [boolean, boolean, boolean];

export interface Outcome {
  readonly passed: boolean;
  /** Objectives done this time. */
  readonly done: Medals;
  /** Medals after merging with the ones already held (medals only add up). */
  readonly medals: Medals;
  /** Medals earned for the first time. */
  readonly fresh: Medals;
  readonly firstWin: boolean;
  readonly xp: number;
  /** The level's prize family, when this run fitted it (unlocked in the workshop from now on). */
  readonly prize: Family | null;
}

export function outcome(def: LevelDef, r: MatchReport, prev: Medals | undefined): Outcome {
  const passed = r.passedMain;
  const done: Medals = [passed, passed && bonusMet(def.bonus[0], r), passed && bonusMet(def.bonus[1], r)];
  const old = prev ?? [false, false, false];
  const medals: Medals = [old[0] || done[0], old[1] || done[1], old[2] || done[2]];
  const fresh: Medals = [done[0] && !old[0], done[1] && !old[1], done[2] && !old[2]];
  const firstWin = fresh[0];
  // Objective XP once per medal; kills pay every time, your wingmen's too (the squad's commander is credited).
  const xp = (fresh[0] ? XP.main : 0) + (fresh[1] ? XP.bonus : 0) + (fresh[2] ? XP.bonus : 0) + (r.kills + (r.squadKills ?? 0)) * XP.kill + (firstWin ? XP.firstWin : 0);
  const prize = def.prize !== undefined && r.picks.some((p) => p.family === def.prize) ? def.prize : null;
  return { passed, done, medals, fresh, firstWin, xp, prize };
}

/** Applies a played mission to progress: intel is kept win or lose, XP and medals only go up. */
/** The General's threshold: the last level's win always reaches it. */
const GENERAL_XP = RANKS[RANKS.length - 1]!.xp;

export function applyOutcome(p: Progress, def: LevelDef, r: MatchReport): { progress: Progress; outcome: Outcome } {
  const o = outcome(def, r, p.medals[def.number]);
  const gained = addGadgetIntel(addIntel(p, r.intel), r.gadgetIntel ?? {});
  // A prize taken in the field is kept win or lose, like blueprints.
  const prized = o.prize ? grantFamily(gained, o.prize) : gained;
  // An ace's prototype you fitted is kept too (a Brigadier can fit it in the workshop).
  const withIntel = keepProtos(prized, r.picks);
  // Winning the war makes you a General, whatever the XP (the ending says so).
  const xp = o.passed && def.number === FINAL_LEVEL ? Math.max(withIntel.xp + o.xp, GENERAL_XP) : withIntel.xp + o.xp;
  return { progress: { ...withIntel, xp, medals: { ...withIntel.medals, [def.number]: o.medals } }, outcome: o };
}
