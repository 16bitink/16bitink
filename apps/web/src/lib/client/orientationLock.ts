/** What the screen is locked to as a game starts in fullscreen. */
export type OrientationLock = 'portrait' | 'landscape';

/**
 * The lock for a game's `orientation` (data/games.ts), read from the play page:
 * portrait games (InkBrick) play upright, landscape games on their side, and a
 * game that plays either way (or says nothing) leaves the phone free.
 */
export function orientationLock(orientation: string | undefined): OrientationLock | null {
  return orientation === 'portrait' || orientation === 'landscape' ? orientation : null;
}
