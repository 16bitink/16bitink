/**
 * How well bots play, per chapter (design doc "Bots": aim error, reaction
 * time, kiting, focus fire), plus the role knobs a level can't set.
 */
export interface Difficulty {
  /** Standard spread of aim, radians. */
  readonly aimError: number;
  /** Seconds between decisions. */
  readonly reaction: number;
  /** Chance to keep range (retreat while firing) when it outranges the target. */
  readonly kite: number;
  /** Prefers the weakest visible enemy. */
  readonly focus: boolean;
  /** Backs off to repair below this share of HP (when losing). */
  readonly fleeHp: number;
  /** Share of decisions it holds fire (slow trigger finger). */
  readonly hesitate: number;
}

/** Chapter 1 is the easy chapter: wide aim, slow to react (sim-tuned, Nov 14). */
export const CH1_BOTS: Difficulty = { aimError: 0.28, reaction: 0.5, kite: 0.3, focus: false, fleeHp: 0.25, hesitate: 0.35 };
/** Chapter 2 (Dust Flats): a little sharper and quicker than chapter 1. */
export const CH2_BOTS: Difficulty = { aimError: 0.25, reaction: 0.45, kite: 0.4, focus: false, fleeHp: 0.25, hesitate: 0.3 };

/** Chapter 3 (Mirefen): a step sharper again. */
export const CH3_BOTS: Difficulty = { aimError: 0.23, reaction: 0.42, kite: 0.45, focus: false, fleeHp: 0.25, hesitate: 0.28 };

/** Chapter 4 (Frostridge): a step sharper again (all three clans' veterans, pushed north). */
export const CH4_BOTS: Difficulty = { aimError: 0.21, reaction: 0.4, kite: 0.5, focus: false, fleeHp: 0.25, hesitate: 0.26 };

/** Chapter 5 (Deepwood), the last chapter: the sharpest bots (the Iron Hive, the clans' old masters). */
export const CH5_BOTS: Difficulty = { aimError: 0.19, reaction: 0.38, kite: 0.55, focus: false, fleeHp: 0.25, hesitate: 0.24 };

/** The bots' skill for a level, by its chapter (1–10 chapter 1, 11–20 chapter 2, 21–30 chapter 3, 31–40 chapter 4, 41–50 chapter 5). */
export function botsFor(level: number): Difficulty {
  if (level > 40 && level <= 50) return CH5_BOTS;
  if (level > 30 && level <= 50) return CH4_BOTS;
  if (level > 20 && level <= 50) return CH3_BOTS;
  return level > 10 && level <= 50 ? CH2_BOTS : CH1_BOTS;
}

/** The player's stand-in in the sim: a decent casual player. */
export const PLAYER_BOT: Difficulty = { aimError: 0.14, reaction: 0.28, kite: 0.6, focus: true, fleeHp: 0.3, hesitate: 0 };
export const ACE_BOT: Difficulty = { aimError: 0.1, reaction: 0.25, kite: 0.8, focus: true, fleeHp: 0.3, hesitate: 0.1 };

/** How far an unalerted bot spots you, by role (alerted or fighting: VISION). */
export const ROLE_SIGHT = { guard: 340, patrol: 380, turret: 400, wave: 440, hunter: 440, convoy: 300, runner: 300 } as const;
/** A guard fights this far from its post, then goes back. */
export const GUARD_LEASH = 320;
/** Guards and patrols within this of a guard that's hit or sees you join in. */
export const ALARM_RADIUS = 420;
/** An alerted bot hunts the alarm's spot this long. */
export const ALERT_TIME = 25;
/** Convoys and runners shoot back for this long after being hit. */
export const SHOOT_BACK = 4;
