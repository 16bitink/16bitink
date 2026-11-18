import type { AstroCookies } from 'astro';
import { currentUser } from './owner';

const VISITOR = /^[A-Za-z0-9_-]{8,64}$/;

/** The key a play is stored under: the account when signed in, else the browser's visitor id. */
export const playerKey = (userId: string | null, visitor: string | undefined): string | null =>
  userId ? `u:${userId}` : visitor && VISITOR.test(visitor) ? `v:${visitor}` : null;

/**
 * Every key whose plays are this player's: the account's, plus this browser's
 * visitor id (plays made here before signing in belong to them too).
 */
export function playerKeys(userId: string | null, visitor: string | undefined): readonly string[] {
  const keys = [userId ? `u:${userId}` : null, visitor && VISITOR.test(visitor) ? `v:${visitor}` : null];
  return keys.filter((k): k is string => k !== null);
}

/** The signed-in user's id, or null (also null when the session can't be checked). */
export async function signedInUserId(cookies: AstroCookies): Promise<string | null> {
  try {
    return (await currentUser(cookies))?.userId ?? null;
  } catch (err) {
    console.error('[daily] session check failed', err);
    return null;
  }
}
