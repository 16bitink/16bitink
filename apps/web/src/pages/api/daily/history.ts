import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { dailyHistory } from '../../../lib/db/dailyPlayRepo';
import { playerKeys, signedInUserId } from '../../../lib/dailyPlayer';
import { fail, json } from '../../../lib/http';

export const prerender = false;

/**
 * This player's days across every game's dailies: the account's when signed in, plus this
 * browser's (`?visitor=` is its analytics id). Nothing for an unknown player.
 */
export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const keys = playerKeys(await signedInUserId(cookies), url.searchParams.get('visitor') ?? undefined);
    if (keys.length === 0) return json({ success: true, data: { days: [] } }, 200, { 'cache-control': 'private, no-store' });
    await db();
    return json({ success: true, data: { days: await dailyHistory(keys) } }, 200, { 'cache-control': 'private, no-store' });
  } catch (err) {
    console.error('[daily] history failed', err);
    return fail(500, 'Could not load your days');
  }
};
