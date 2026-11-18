/**
 * The engine rules of the day, as numbers (board px and seconds). The
 * generator and docs/inksnake-daily.md ("Engine notes") read these.
 */

/** Sweet Tooth: prey (and treats) this close to the head drift towards it at this speed. */
export const LURE = { reach: 90, speed: 30 } as const;
/** Ice: turning is this much slower, and speed eases towards what it should be over this long. */
export const ICE = { turn: 0.55, carry: 0.4 } as const;
/** Blizzard: a steady push across the board, turning to a new direction every so often, eased in over `ease`. */
export const BLIZZARD = { push: 40, every: [8, 12], ease: 1.5 } as const;
/** Fog: the night layer with a ring of sight this many times the night's. */
export const FOG_SIGHT = 2.2;
/** Hot Day: the snake and its prey this much faster (prey: their whole lives run faster). */
export const HOT_DAY = 1.25;
/** Gold Rush: every `every`-th prey to arrive is golden: `growth` and `points` times the meal, and it lives `quick` times faster. */
export const GOLD_RUSH = { every: 4, growth: 3, points: 3, quick: 1.15 } as const;
/**
 * The golden goal: the golden prey sees the snake `fear` times as far and
 * lives `quick` times faster; it runs for cover within `cover` px and sits
 * tight there until the head comes within `bolt` px. The next one comes
 * `next` s after a catch, at least `away` px from the head.
 */
export const GOLDEN = { fear: 1.5, quick: 1.2, cover: 260, bolt: 70, next: 1.4, away: 260, points: 30 } as const;
/** Treats: a little growth and no lump; `reach` past the head's edge; back `respawn` s after one is taken. */
export const TREAT = { growth: 12, points: 5, reach: 9, respawn: [1, 2], away: 150 } as const;
/** Rival: arrives after `from` s; the player's species, this much narrower, slower and shorter. */
export const RIVAL = { from: 4, width: 0.9, speed: 0.75, length: 0.9 } as const;
