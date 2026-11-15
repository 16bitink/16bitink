import type { TrackId } from './tracks';

/** The screens that have a say in which track plays. */
export type MusicScreen = 'menu' | 'map' | 'briefing' | 'workshop' | 'results' | 'mission' | 'ending';

/** One mission track per chapter (0-based), in campaign order. */
export const MISSION_TRACKS: readonly TrackId[] = ['meadowlands', 'dustflats', 'mirefen', 'frostridge', 'deepwood'];

/** The track for a screen: the theme everywhere but a mission (its chapter's track) and the ending (the victory theme). */
export function trackFor(screen: MusicScreen, chapter = 0): TrackId {
  if (screen === 'ending') return 'victory';
  if (screen === 'mission') return MISSION_TRACKS[Math.min(MISSION_TRACKS.length - 1, Math.max(0, Math.floor(chapter)))]!;
  return 'theme';
}

/** Where the music sits (0..1 of the master): full on the menus, lower in a mission under the effects, lower still when paused. */
export const MUSIC_LEVEL = { screens: 0.5, mission: 0.34, paused: 0.18 } as const;

/** A track's gain when it is wanted from now on; the fade lengths are in seconds. */
export const MUSIC_FADE_S = 1.2;

/** How many decoded tracks stay in memory (most recently heard last). Returns the ids to let go. */
export function evict<T>(order: readonly T[], kept: number): T[] {
  return order.slice(0, Math.max(0, order.length - kept));
}
