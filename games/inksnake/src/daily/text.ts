import { addDays, EVENTS, nextEvent } from '@16bitink/game-sdk';
import { CHAPTER_NAMES } from '../level/levels';
import { TREAT_NAMES, isTreatKind } from '../level/daily';
import { PLACES, type LevelDef, type Place } from '../level/types';
import { BOSS_ENTRIES } from '../logic/chapters/index';
import { goldenKind } from '../logic/daily/golden';
import { preyPlural, preySpec } from '../logic/prey';
import { SNAKE_SPECS, type SnakeId } from '../logic/species';
import { EVENT_SNAKE } from './snakeFacts';

/** The words on the daily's cards. */

/** "The Reef". */
export const placeName = (place: Place): string => CHAPTER_NAMES[PLACES.indexOf(place)] ?? 'The Farm';

/** The place's chapter number, 1-based. */
export const chapterNumber = (place: Place): number => PLACES.indexOf(place) + 1;

export const snakeName = (id: SnakeId): string => SNAKE_SPECS[id].name;

/** What the day asks, in a line. */
export function goalLine(level: LevelDef): string {
  const g = level.goal;
  if (!g) return 'Grow to full length';
  if (g.kind === 'golden') return `Catch the golden ${preySpec(goldenKind(level)).name} ${g.count} times, and grow`;
  if (g.kind === 'feast') return `Eat ${g.count} ${isTreatKind(g.food) ? TREAT_NAMES[g.food].many : preyPlural(g.food)}, and grow`;
  if (g.kind === 'rush') return `Grow to full length within ${g.seconds} seconds`;
  return `Drive off ${BOSS_ENTRIES[level.boss?.kind ?? '']?.text.name ?? 'the boss'}`;
}

/** Winter's aside: snakes brumate in the cold, so this one is braving it. */
export function winterLine(level: LevelDef): string | null {
  if (level.season !== 'winter') return null;
  return `Too cold to sleep in: the ${snakeName(level.snake)} is out hunting in the snow.`;
}

/** From a week before an event: "Christmas Eve Hunt in 6 days: the candy cane corn snake". Null when none is near. */
export function eventTeaser(date: string): string | null {
  const next = nextEvent(addDays(date, 1), 6);
  if (!next) return null;
  const snake = EVENT_SNAKE[next.id];
  const when = next.inDays === 0 ? 'tomorrow' : `in ${next.inDays + 1} days`;
  return `${EVENTS[next.id].name} Hunt ${when}${snake ? `: the ${snakeName(snake)}` : ''}`;
}
