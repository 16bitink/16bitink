import { eventOn, seasonOf } from '@16bitink/game-sdk';
import { CHAPTER_1 } from '../../src/level/chapter1';
import { CHAPTER_2 } from '../../src/level/chapter2';
import { CHAPTER_6 } from '../../src/level/chapter6';
import { dailyId } from '../../src/level/daily';
import type { CoverDef, LevelDef, SolidDef } from '../../src/level/types';

/**
 * Hand-written daily levels for the dev harness and the tests, until the
 * generator (src/gen) freezes real ones: a winter farm on ice, Christmas
 * Eve, a reef summer day with a rival, a golden chase in the barrens, and
 * New Year's Eve. Each is a function of its date (the id is the date's).
 */
export type Sample = (date: string) => LevelDef;

const farm = (i: number): LevelDef => CHAPTER_1[i]!;
const present = (x: number, y: number, w = 46, h = 40): SolidDef => ({ kind: 'rect', look: 'present', x, y, w, h });
const presentRound = (x: number, y: number, r = 22): SolidDef => ({ kind: 'circle', look: 'present', x, y, r });
const cabbages = (x: number, y: number, r = 53): CoverDef => ({ look: 'cabbage', x, y, r });

/** The farm in snow, on ice: "Ice: you slide when you turn". */
export const winterFarmIce: Sample = (date) => {
  const base = farm(1);
  return {
    ...base, id: dailyId(date), name: 'Frozen Pond', place: 'farm', season: 'winter', rule: 'ice',
    prey: [{ kind: 'mouse', count: 5 }, { kind: 'rat', count: 1 }], target: 390, par: 45,
    tomorrow: { place: 'barrens', snake: 'hognose', rule: 'night' },
  };
};

/** Christmas Eve: the candy cane corn snake, presents for solids, cookies to feast on, on ice. */
export const christmasEve: Sample = (date) => {
  const base = farm(0);
  return {
    ...base, id: dailyId(date), name: 'Christmas Eve', snake: 'candycane', place: 'farm', season: 'winter', rule: 'ice', event: 'christmasEve',
    prey: [{ kind: 'mouse', count: 4 }], target: 330, par: 45,
    solids: [present(600, 90, 60, 50), present(680, 120), presentRound(760, 80), present(230, 420, 70, 46), presentRound(800, 400, 26)],
    cover: [cabbages(110, 100, 58), cabbages(480, 470, 50)],
    treats: { kind: 'cookie', count: 4 }, goal: { kind: 'feast', food: 'cookie', count: 8 },
    teach: ['steer', 'eat'],
    tomorrow: { place: 'barrens', snake: 'candycane', rule: 'night', event: 'christmas' },
  };
};

/** A summer day on the reef, with a rival krait after the same gobies. */
export const reefRival: Sample = (date) => {
  const base = CHAPTER_6[0]!;
  return {
    ...base, id: dailyId(date), name: 'Two Kraits', place: 'reef', season: 'summer', rule: 'rival', target: 380, par: 50,
    enemies: [{ kind: 'rival', from: 4 }],
    teach: [],
    tomorrow: { place: 'dunes', snake: 'sidewinder', rule: 'hotDay' },
  };
};

/** The golden chase in the barrens: catch the golden frog three times. */
export const barrensGolden: Sample = (date) => {
  const base = CHAPTER_2[0]!;
  return {
    ...base, id: dailyId(date), name: 'The Golden Frog', place: 'barrens', season: 'autumn', rule: 'looseKnots',
    goal: { kind: 'golden', count: 3 }, target: 360, par: 60, teach: [],
    cover: [...(base.cover ?? []), { look: 'blueberry', x: 300, y: 430, r: 50 }, { look: 'fern', x: 860, y: 300, r: 48 }],
    tomorrow: { place: 'heath', snake: 'adder', rule: 'fog' },
  };
};

/** New Year's Eve: the rainbow boa at night, fireworks lighting the farm, confetti stars. */
export const newYearsEve: Sample = (date) => {
  const base = farm(2);
  return {
    ...base, id: dailyId(date), name: "New Year's Eve", snake: 'rainbowboa', place: 'farm', season: 'winter', rule: 'night', event: 'newYearsEve', dark: true,
    prey: [{ kind: 'mouse', count: 4 }, { kind: 'rat', count: 1 }], target: 380, par: 60, goal: { kind: 'feast', food: 'confetti', count: 6 },
    treats: { kind: 'confetti', count: 3 }, teach: [],
    tomorrow: { place: 'mountains', snake: 'rainbowboa', rule: 'goldRush', event: 'newYear' },
  };
};

/** The samples in the order the dev host hands them out (today first). */
export const SAMPLES: readonly { readonly key: string; readonly make: Sample }[] = [
  { key: 'ice', make: winterFarmIce },
  { key: 'xmas', make: christmasEve },
  { key: 'rival', make: reefRival },
  { key: 'golden', make: barrensGolden },
  { key: 'newyear', make: newYearsEve },
];

/**
 * The sample for `date` when sample `first` is today's: today gets `first`, yesterday the next, and so on round the list.
 * Stamped for the date it's served for: its season is the date's, and its event stays only when the date is that event's.
 */
export function sampleOn(date: string, today: string, first: number): LevelDef | null {
  const back = Math.round((Date.parse(today) - Date.parse(date)) / 86_400_000);
  if (back < 0) return null;
  const level = JSON.parse(JSON.stringify(SAMPLES[(first + back) % SAMPLES.length]!.make(date))) as LevelDef;
  const { event, ...rest } = level;
  return { ...rest, season: seasonOf(date), ...(event && event === eventOn(date) ? { event } : {}) };
}
