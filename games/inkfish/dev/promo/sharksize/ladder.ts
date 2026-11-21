import type { SharkId } from './art/ids';
import { T } from './timeline';

/**
 * The size ladder: twelve real sharks, smallest to biggest, each with the
 * length the ladder uses (script.md's table, a typical adult), its "= N YOU"
 * next to a 5 ft 9 in (1.75 m) you, its evidence stamp, and the real meal it
 * gulps on screen. Megalodon is not a step: it only ever appears as an
 * ESTIMATED ghost (facts.ts).
 */

export type Evidence = 'MEASURED' | 'ESTIMATED' | 'REPORTED';
/** Stamps that aren't evidence but verdicts (the myths). */
export type Verdict = Evidence | 'NO SOURCE FOUND' | 'NEVER MEASURED' | 'A MISTAKE' | 'PROBABLY' | 'THOUGHT TO BE' | 'NEVER CHECKED' | 'UNVERIFIED';

export type MealId = 'shrimp' | 'squid' | 'herring' | 'reefFish' | 'mullet' | 'tuna' | 'stingray' | 'ray' | 'cod' | 'seal' | 'hidden' | 'plankton';

export interface Meal {
  readonly id: MealId;
  /** The meal's length, metres (to scale with the shark). */
  readonly length: number;
  /** When it's gulped (the jaw shuts on it). */
  readonly at: number;
  readonly label: string;
}

export interface Step {
  readonly id: SharkId;
  readonly name: string;
  /** The ladder's length, metres. */
  readonly length: number;
  readonly size: string;
  readonly stamp: Evidence;
  /** A small line under the stamp: what the ladder's number is. */
  readonly basis: string;
  /** When it glides in (the camera's zoom starts), and how long the zoom takes. */
  readonly from: number;
  readonly zoom: number;
  readonly meal: Meal;
}

/** You: 5 ft 9 in. */
export const YOU_M = 1.75;

/** "= N YOU": two decimals under ten, one above. */
export function youOf(metres: number): string {
  const n = metres / YOU_M;
  return String(Number(n.toFixed(n >= 10 ? 1 : 2)));
}

const meal = (id: MealId, length: number, at: number, label: string): Meal => ({ id, length, at, label });

export const STEPS: readonly Step[] = [
  {
    id: 'lanternshark', name: 'DWARF LANTERNSHARK', length: 0.2, size: '7.9 IN · 20 CM', stamp: 'MEASURED', basis: 'BIGGEST FEMALE',
    from: T.this0 - 0.1, zoom: 1.1, meal: meal('shrimp', 0.025, T.shrimp + 0.4, 'TINY SHRIMP · PROBABLY'),
  },
  {
    id: 'cookiecutter', name: 'COOKIECUTTER SHARK', length: 0.45, size: '1.5 FT · 45 CM', stamp: 'MEASURED', basis: 'ADULTS 41–56 CM · 16–22 IN',
    from: T.step2 - 0.1, zoom: 2, meal: meal('squid', 0.12, T.squid + 0.5, 'SQUID'),
  },
  {
    id: 'dogfish', name: 'SPINY DOGFISH', length: 1.0, size: '3.3 FT · 1 M', stamp: 'MEASURED', basis: 'MOST 70–100 CM · 2.3–3.3 FT',
    from: T.step3 - 0.1, zoom: 2, meal: meal('herring', 0.25, T.herring2 + 0.4, 'HERRING'),
  },
  {
    id: 'blacktip', name: 'BLACKTIP REEF SHARK', length: 1.5, size: '4.9 FT · 1.5 M', stamp: 'MEASURED', basis: 'USUALLY UNDER 1.6 M · 5.2 FT',
    from: T.step4 - 0.1, zoom: 1.8, meal: meal('reefFish', 0.2, T.reefFish + 0.5, 'REEF FISH'),
  },
  {
    id: 'bull', name: 'BULL SHARK', length: 2.6, size: '8.5 FT · 2.6 M', stamp: 'REPORTED', basis: 'COMMON LENGTH',
    from: T.bull - 0.2, zoom: 2, meal: meal('mullet', 0.4, T.mullet + 0.3, 'MULLET'),
  },
  {
    id: 'mako', name: 'SHORTFIN MAKO', length: 2.9, size: '9.5 FT · 2.9 M', stamp: 'REPORTED', basis: 'GROWN FEMALE',
    from: T.mako - 0.3, zoom: 1.6, meal: meal('tuna', 0.6, T.tuna5 + 0.5, 'TUNA'),
  },
  {
    id: 'hammerhead', name: 'GREAT HAMMERHEAD', length: 3.7, size: '12.1 FT · 3.7 M', stamp: 'REPORTED', basis: 'COMMON LENGTH',
    from: T.hammer - 0.2, zoom: 1.8, meal: meal('stingray', 0.7, T.stingrays + 0.5, 'STINGRAY'),
  },
  {
    id: 'tiger', name: 'TIGER SHARK', length: 4.0, size: '13.1 FT · 4 M', stamp: 'REPORTED', basis: 'ADULTS 3.25–4.25 M · 10.7–13.9 FT',
    from: T.thirteen - 0.2, zoom: 1.8, meal: meal('ray', 0.8, T.eats6 + 1.2, 'RAY'),
  },
  {
    id: 'greenland', name: 'GREENLAND SHARK', length: 4.3, size: '14.1 FT · 4.3 M', stamp: 'REPORTED', basis: 'TYPICAL 2.4–4.3 M · 8–14 FT',
    from: T.fourteen - 0.2, zoom: 1.8, meal: meal('cod', 0.6, T.herring7 + 0.8, 'COD'),
  },
  {
    id: 'greatWhite', name: 'GREAT WHITE', length: 4.6, size: '15.1 FT · 4.6 M', stamp: 'REPORTED', basis: 'GROWN FEMALE',
    from: T.fifteen - 0.2, zoom: 1.8, meal: meal('seal', 1.5, T.seals8 + 0.6, 'SEAL'),
  },
  {
    id: 'basking', name: 'BASKING SHARK', length: 7.0, size: '23 FT · 7 M', stamp: 'REPORTED', basis: 'COMMON LENGTH',
    from: T.jump - 0.2, zoom: 2.2, meal: meal('hidden', 0.4, T.catching + 0.4, '?'),
  },
  {
    id: 'whaleShark', name: 'WHALE SHARK', length: 10, size: '32.8 FT · 10 M', stamp: 'REPORTED', basis: 'GROWN ADULT',
    from: T.realGiant - 0.2, zoom: 2.4, meal: meal('plankton', 0.003, T.plankton + 0.6, 'PLANKTON'),
  },
];

/** The step on the ladder at t: -1 before the first (the cold open). */
export function stepAt(t: number): number {
  let i = -1;
  STEPS.forEach((s, k) => {
    if (t >= s.from) i = k;
  });
  return i;
}
