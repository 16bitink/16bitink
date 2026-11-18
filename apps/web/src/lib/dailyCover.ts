import { coverVariant } from './covers';
import { findGame } from '../data/games';

/** A small cover image for a game's daily card and calendar marks; undefined when its cover files aren't built yet. */
export function dailyCover(slug: string): string | undefined {
  const cover = findGame(slug)?.cover;
  if (!cover) return undefined;
  try {
    return coverVariant(cover, 640, 'webp');
  } catch (err) {
    console.warn('[daily] cover not built for', slug, err);
    return undefined;
  }
}
