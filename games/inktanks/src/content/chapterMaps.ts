import type { Land } from '../logic/land';
import type { Pt } from '../logic/vec';
import { chapter1Land, SPOT_BOX as BOX1, SPOTS as SPOTS1 } from './ch1/chapterLand';
import { chapter2Land, SPOT_BOX as BOX2, SPOTS as SPOTS2 } from './ch2/chapterLand';
import { chapter3Land, SPOT_BOX as BOX3, SPOTS as SPOTS3 } from './ch3/chapterLand';
import { chapter4Land, SPOT_BOX as BOX4, SPOTS as SPOTS4 } from './ch4/chapterLand';
import { chapter5Land, SPOT_BOX as BOX5, SPOTS as SPOTS5 } from './ch5/chapterLand';

/** A chapter's map: its painted land and the ten level spots on it (spot i is the chapter's level i + 1). */
export interface ChapterMap {
  readonly spots: readonly Pt[];
  readonly box: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly land: () => Land;
}

/** By chapter index (0 = chapter 1). Chapters without a map yet show chapter 1's. */
export const CHAPTER_MAPS: readonly ChapterMap[] = [
  { spots: SPOTS1, box: BOX1, land: chapter1Land },
  { spots: SPOTS2, box: BOX2, land: chapter2Land },
  { spots: SPOTS3, box: BOX3, land: chapter3Land },
  { spots: SPOTS4, box: BOX4, land: chapter4Land },
  { spots: SPOTS5, box: BOX5, land: chapter5Land },
];

export const chapterMap = (index: number): ChapterMap => CHAPTER_MAPS[index] ?? CHAPTER_MAPS[0]!;
