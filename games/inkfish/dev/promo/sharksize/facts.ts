import type { SharkId } from './art/ids';
import { STEPS, type Verdict } from './ladder';
import { T } from './timeline';

/**
 * Every number on screen that isn't the step counter, each with its stamp
 * (script.md's stage directions, corrected by its fact-check): the tags in
 * the top band, the ghosts (a claimed or recorded size drawn as a dashed
 * outline from the same snout tip, stamped, crossed out or shrunk to the
 * real one), the extra sharks (the male mako, the basking pup, the whale
 * sharks you'd meet, the newborn) and the poses (the blacktip standing on
 * its tail beside you). Every number is in both US and metric units.
 */

export type TagInk = 'paper' | 'yellow' | 'green' | 'red';

export interface Tag {
  readonly at: number;
  readonly until: number;
  readonly text: string;
  readonly stamp?: Verdict;
  readonly sub?: string;
  /** When it's struck through in red (a myth, or "harmless" cracking). */
  readonly cross?: number;
  readonly ink?: TagInk;
}

export interface Ghost {
  readonly shark: SharkId;
  readonly from: number;
  readonly until: number;
  /** Metres. */
  readonly length: number;
  readonly label: string;
  readonly stamp: Verdict | '?';
  readonly stampAt: number;
  readonly cross?: number;
  /** Shrinks to the real size at `shrinkAt`, relabelled. */
  readonly shrink?: { readonly at: number; readonly length: number; readonly label: string; readonly stamp: Verdict };
  /** Raised above the step's shark by this many of its own lengths' depth (stacked ghosts). */
  readonly lift?: number;
}

export interface Extra {
  readonly shark: SharkId;
  readonly from: number;
  readonly until: number;
  /** Metres at `from` and (if it grows) at `until`. */
  readonly length: number;
  readonly grow?: number;
  /** Where its snout sits, metres: right of the anchor, and up from the sand. */
  readonly x: number;
  readonly y: number;
}

/** The step's shark standing on its tail beside you, at `length` metres. */
export interface Stand {
  readonly step: number;
  readonly from: number;
  readonly until: number;
  readonly length: number;
}

const tag = (at: number, until: number, text: string, stamp?: Verdict, sub?: string, more: Partial<Tag> = {}): Tag => ({ at, until, text, stamp, sub, ...more });

export const TAGS: readonly Tag[] = [
  // 0 · cold open
  tag(T.you0 + 0.3, T.twelve0, 'YOU · 5 FT 9 IN · 1.75 M', undefined, undefined, { ink: 'yellow' }),
  tag(T.eight0, T.thirty0 - 0.2, '8 IN TO 41 FT · 20 CM TO 12.6 M', 'MEASURED', '12 REAL SHARKS'),
  // 1 · dwarf lanternshark, cookiecutter
  tag(T.smallestShark, T.eat1, 'SMALLEST SHARK IN THE WORLD?', 'PROBABLY', 'FEW SPECIMENS MEASURED'),
  tag(T.seventeen, T.eat1 + 1, 'AS DEEP AS 1,740 FT · 530 M', 'MEASURED', 'FOUND 750–1,740 FT · 230–530 M'),
  tag(T.nobody, T.step2, 'ITS DIET: NEVER PUBLISHED', 'PROBABLY', 'RELATIVES EAT SHRIMP, SQUID, FISH'),
  tag(T.cookieBite, T.teeth, 'BITES ROUND PLUGS OUT OF TUNA AND WHALES', 'REPORTED'),
  tag(T.teeth, T.harmless, 'LOSES ITS WHOLE LOWER ROW OF TEETH… AND SWALLOWS IT', 'REPORTED'),
  tag(T.calcium, T.harmless + 1.5, 'MAY RECYCLE THE CALCIUM', 'PROBABLY'),
  tag(T.harmless, T.step3 - 0.3, 'HARMLESS TO YOU', 'REPORTED', undefined, { cross: T.lastNot, ink: 'green' }),
  // 2 · spiny dogfish, blacktip reef
  tag(T.female2, T.websites + 2, 'GROWN FEMALE: 7–10 LB · 3.2–4.5 KG', 'MEASURED'),
  tag(T.time2, T.step4 - 0.3, 'PREGNANCY: UP TO 24 MONTHS', 'REPORTED'),
  tag(T.backbone - 0.6, T.step4 - 0.3, 'LONGEST OF ANY ANIMAL WITH A BACKBONE?', 'THOUGHT TO BE'),
  tag(T.snakes, T.recorded2, 'HAS EATEN LAND SNAKES AND SEA SNAKES', 'REPORTED'),
  tag(T.fiveEleven, T.fromHere, 'BIGGEST: 5 FT 11 IN · 1.8 M · = 1.03 YOU', 'MEASURED', 'JUST TALLER THAN YOU'),
  tag(T.fromHere, STEPS[4]!.from + 1.5, 'FROM HERE ON: EVERY SHARK IS BIGGER THAN YOU', undefined, undefined, { ink: 'yellow' }),
  // 3 · bull shark (the map is its own card)
  tag(T.mullet + 0.2, T.fresh - 0.1, 'EATS MULLET, CATFISH, STINGRAYS, YOUNG SHARKS', 'REPORTED'),
  tag(T.fresh, T.amazon - 0.9, 'CAN LIVE IN FRESH WATER', 'REPORTED'),
  tag(T.saltier, T.remember, 'SALTIER THAN THE SEA: UP TO 53 PPT', 'REPORTED', 'SEA WATER IS ABOUT 35 PPT'),
  tag(T.remember, T.game - 0.3, 'REMEMBER THE BULL', undefined, undefined, { ink: 'yellow' }),
  // 5 · mako, the bunch, great hammerhead
  tag(T.males, T.howFast, 'MALES: 6.5–7 FT · 2–2.15 M', 'REPORTED'),
  tag(T.tuna5, T.howFast + 0.5, 'HUNTS TUNA AND SWORDFISH', 'REPORTED'),
  tag(T.called, T.bunch, 'STILL CALLED THE FASTEST SHARK', 'REPORTED'),
  tag(T.others, T.average5, 'MAY EAT OTHER HAMMERHEADS', 'REPORTED', 'WHEN FOOD RUNS SHORT'),
  tag(T.average5, T.twenty5 + 1, 'ADULTS AVERAGE OVER 500 LB · 230 KG', 'REPORTED'),
  tag(T.record5, T.thirteen - 0.3, 'RECORD CATCH: 991 LB · 450 KG', 'MEASURED', 'SARASOTA, FLORIDA'),
  // 6 · tiger
  tag(T.pounds6, T.anything, '850–1,400 LB · 385–635 KG', 'REPORTED'),
  tag(T.eats6, T.anything, 'EATS SEA TURTLES, RAYS, SEABIRDS, DOLPHINS', 'REPORTED'),
  tag(T.anything, T.twentyFour6, '"EATS ANYTHING. EVEN GARBAGE."', undefined, undefined, { cross: T.harbours }),
  tag(T.harbours, T.twentyFour6 + 1.5, 'THOSE STORIES: HARBOUR AND RIVER-MOUTH SHARKS', 'REPORTED'),
  // 7 · Greenland (the age is its own card)
  tag(T.herring7, T.age, 'EATS HERRING, COD, SKATES… SOMETIMES SEALS', 'REPORTED'),
  tag(T.age, T.lenses - 0.4, 'FAMOUS FOR ITS AGE', undefined, undefined, { ink: 'yellow' }),
  // 8 · great white
  tag(T.seals8, T.thirtyFoot, 'EATS SEALS, SEA LIONS, EVEN DOLPHINS', 'REPORTED'),
  tag(T.y1870, T.australia, '1870: 36 FT · 10.9 M', 'A MISTAKE', 'RE-MEASURED NEARER 16 FT · 5 M'),
  tag(T.menu, T.jump - 0.3, 'SEALS: ON THE MENU · YOU: MOSTLY NOT', undefined, undefined, { ink: 'yellow' }),
  // 9 · basking
  tag(T.pups, T.mouth9, 'NEWBORN PUPS: 5–6 FT · 1.5–1.8 M', 'REPORTED', 'ABOUT AS LONG AS YOU'),
  tag(T.female9, T.mouth9 + 1, 'FEMALES MAY GROW UP AT 12–16 YEARS', 'ESTIMATED'),
  tag(T.tons, T.oneLeft, 'UP TO ~2,000 TONS · ~2 MILLION LITRES OF WATER AN HOUR', 'REPORTED'),
  tag(T.catching, T.oneLeft, "WHAT'S IT CATCHING?", undefined, undefined, { ink: 'yellow' }),
  // 10 · megalodon, whale shark
  tag(T.skeleton, T.backbone10 + 1, 'NO COMPLETE MEGALODON SKELETON EVER FOUND', 'REPORTED'),
  tag(T.feet100, T.estimate10, '100 FT · 30 M', 'NO SOURCE FOUND', undefined, { cross: T.nope }),
  tag(T.grownUp10, T.bestMeasured, 'GROWN UP AT ~30 FT · 9 M', 'REPORTED'),
  tag(T.read60, T.oneReport, '60 FT · 18 M?', undefined, undefined, { cross: T.oneReport - 0.2 }),
  tag(T.mostMeet, T.what11 - 0.3, "MOST YOU'D MEET: 13–26 FT · 4–8 M", 'MEASURED'),
  // 11 · the twist
  tag(T.basking11, T.born, 'BOTH FILTER-FEED', 'REPORTED'),
  tag(T.born, T.grows, 'BORN 22–25 IN · 55–64 CM', 'MEASURED'),
  tag(T.grows, T.none, 'GROWS TO 41.5 FT · 12.65 M', 'MEASURED', 'ON FOOD YOU CAN BARELY SEE'),
  tag(T.none, T.which, 'YOU EATEN: 0', undefined, undefined, { ink: 'green' }),
];

const ft = (m: number): string => `${(m * 3.281).toFixed(1).replace(/\.0$/, '')} FT · ${m} M`;

export const GHOSTS: readonly Ghost[] = [
  // The cold open's 30 ft great white (paid off in block 8).
  { shark: 'greatWhite', from: T.thirty0, until: T.source0, length: 9.14, label: '30 FT · 9.1 M', stamp: '?', stampAt: T.notHere },
  {
    shark: 'dogfish', from: T.websites, until: T.time2, length: 2.0, label: '6.6 FT · 2 M', stamp: 'UNVERIFIED', stampAt: T.websites + 1.2, cross: T.measured2,
    shrink: { at: T.fourFeet, length: 1.24, label: 'MAX 4.1 FT · 1.24 M', stamp: 'MEASURED' },
  },
  { shark: 'hammerhead', from: T.twenty5, until: T.thirteen - 0.4, length: 6.1, label: '20 FT · 6.1 M · = 3.49 YOU', stamp: 'REPORTED', stampAt: T.aReport },
  {
    shark: 'tiger', from: T.twentyFour6, until: T.matter, length: 7.4, label: '24 FT · 7.4 M · 6,860 LB · 3,110 KG', stamp: 'NEVER CHECKED', stampAt: T.checked, cross: T.checked + 0.7,
    shrink: { at: T.eighteen, length: 5.5, label: `${ft(5.5)} · = 3.14 YOU · NO NAMED SHARK`, stamp: 'REPORTED' },
  },
  {
    shark: 'greenland', from: T.twentyFour7, until: T.herring7, length: 7.3, label: '24 FT · 7.3 M', stamp: 'UNVERIFIED', stampAt: T.twentyFour7 + 1.1, cross: T.accepted,
    shrink: { at: T.accepted + 0.4, length: 6.4, label: 'ACCEPTED MAX: 21 FT · 6.4 M', stamp: 'MEASURED' },
  },
  {
    shark: 'greatWhite', from: T.thirtyFoot, until: T.numberOne, length: 9.14, label: '30 FT · 9.1 M · = 5.2 YOU', stamp: 'NEVER MEASURED', stampAt: T.exist, cross: T.exist + 0.6,
    shrink: { at: T.australia, length: 5.94, label: '19.5 FT · 5.94 M · = 3.39 YOU · AUSTRALIA', stamp: 'MEASURED' },
  },
  { shark: 'greatWhite', from: T.estimated8 + 0.6, until: T.numberOne, length: 6.4, label: 'CUBA: 21 FT · 6.4 M', stamp: 'ESTIMATED', stampAt: T.estimated8 + 1.2, lift: 1.4 },
  { shark: 'greatWhite', from: T.estimated8 + 1.6, until: T.numberOne, length: 7.13, label: 'MALTA: 23.4 FT · 7.13 M', stamp: 'ESTIMATED', stampAt: T.argued, lift: 2.6 },
  {
    shark: 'basking', from: T.read49, until: T.pups, length: 15.2, label: '49.9 FT · 15.2 M', stamp: 'UNVERIFIED', stampAt: T.reportedly, cross: T.reportedly + 0.6,
    shrink: { at: T.measured9, length: 12.27, label: '40.3 FT · 12.27 M · = 7.01 YOU · BAY OF FUNDY, 1851', stamp: 'MEASURED' },
  },
  { shark: 'megalodon', from: T.backbone10, until: T.realGiant, length: 16.4, label: '~54 FT · 16.4 M · = 9.37 YOU · 2025 STUDY', stamp: 'ESTIMATED', stampAt: T.feet54 + 0.3 },
  { shark: 'megalodon', from: T.feet80, until: T.realGiant, length: 24.3, label: 'AT MOST 80 FT · 24.3 M · = 13.9 YOU', stamp: 'ESTIMATED', stampAt: T.feet80 + 0.9, lift: 0.9 },
  { shark: 'whaleShark', from: T.bestMeasured, until: T.mostMeet, length: 12.65, label: 'BEST MEASURED: 41.5 FT · 12.65 M · = 7.23 YOU', stamp: 'MEASURED', stampAt: T.sevenYou10 },
  { shark: 'whaleShark', from: T.oneReport, until: T.mostMeet, length: 18.8, label: '61.7 FT · 18.8 M · = 10.7 YOU · ONE SHARK, INDIA, 2001', stamp: 'ESTIMATED', stampAt: T.india, lift: 0.9 },
];

export const EXTRAS: readonly Extra[] = [
  { shark: 'mako', from: T.males, until: T.howFast + 1, length: 2.07, x: 0.6, y: 0.15 },
  { shark: 'basking', from: T.pups, until: T.mouth9, length: 1.65, x: -2.1, y: 0.35 },
  { shark: 'whaleShark', from: T.mostMeet + 0.2, until: T.what11, length: 4, x: 1.5, y: 6.2 },
  { shark: 'whaleShark', from: T.mostMeet + 0.6, until: T.what11, length: 6, x: 8, y: 7.4 },
  { shark: 'whaleShark', from: T.mostMeet + 1, until: T.what11, length: 8, x: 2, y: 9.6 },
  { shark: 'basking', from: T.basking11, until: T.born, length: 7, x: 3.5, y: 4.6 },
  { shark: 'whaleShark', from: T.born, until: T.none + 1, length: 0.6, grow: 12.65, x: 1.2, y: 6.2 },
];

export const STANDS: readonly Stand[] = [{ step: 3, from: T.recorded2, until: T.fromHere + 0.4, length: 1.8 }];

/** The tag band's rows (top of the frame) and each tag's row: the first row free when it appears. */
export const TAG_ROWS = [64, 184, 304, 424] as const;
export const TAG_X = 1270;
export const TAG_MAX_W = 1180;

export const TAG_ROW: readonly number[] = (() => {
  const busy: number[] = TAG_ROWS.map(() => -Infinity);
  const order = TAGS.map((_, i) => i).sort((a, b) => TAGS[a]!.at - TAGS[b]!.at);
  const out: number[] = TAGS.map(() => -1);
  for (const i of order) {
    const tg = TAGS[i]!;
    const row = busy.findIndex((until) => until <= tg.at);
    out[i] = row;
    if (row >= 0) busy[row] = tg.until + 0.35;
  }
  return out;
})();

/** The ghosts' labels: centred over the ghost, kept this far inside the frame (stage.ts draws them). */
export const GHOST_LABEL_W = 980;
export const GHOST_LABEL_X: readonly [number, number] = [20 + GHOST_LABEL_W / 2, 1900 - GHOST_LABEL_W / 2];
