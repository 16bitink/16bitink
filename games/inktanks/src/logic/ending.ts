import { CHAPTERS, medalCount, passed, TOTAL_LEVELS, type MedalBook } from './campaign';
import { rankOf, type RankDef } from './rank';
import type { Progress } from './workshop';

/** The last level: beating it wins the war and opens the ending. */
export const FINAL_LEVEL = TOTAL_LEVELS;

/** Medals a level can give (the main objective and two bonuses). */
const MEDALS_PER_LEVEL = 3;

export interface ChapterRecord {
  readonly name: string;
  readonly rival: string;
  readonly medals: number;
  readonly of: number;
}

/** The war in numbers, for the ending screen. */
export interface WarRecord {
  readonly rank: RankDef;
  readonly xp: number;
  readonly missions: number;
  readonly medals: number;
  readonly medalsOf: number;
  readonly chapters: readonly ChapterRecord[];
  /** Every blueprint ever picked up (spent or not). */
  readonly blueprints: number;
  /** Part families unlocked in the workshop. */
  readonly families: number;
  /** Medals still to win: something to come back for, never a must. */
  readonly medalsLeft: number;
}

export const wonTheWar = (medals: MedalBook): boolean => passed(medals, FINAL_LEVEL);

export function warRecord(p: Progress): WarRecord {
  const chapters = CHAPTERS.map((c): ChapterRecord => {
    let medals = 0;
    for (let n = c.first; n <= c.last; n++) medals += medalCount(p.medals, n);
    return { name: c.name, rival: c.rival, medals, of: (c.last - c.first + 1) * MEDALS_PER_LEVEL };
  });
  const medals = chapters.reduce((s, c) => s + c.medals, 0);
  const medalsOf = TOTAL_LEVELS * MEDALS_PER_LEVEL;
  let missions = 0;
  for (let n = 1; n <= TOTAL_LEVELS; n++) if (passed(p.medals, n)) missions++;
  const blueprints = Object.values(p.intelTotal).reduce((s: number, v) => s + (v ?? 0), 0);
  return { rank: rankOf(p.xp), xp: p.xp, missions, medals, medalsOf, chapters, blueprints, families: p.unlocked.length, medalsLeft: medalsOf - medals };
}
