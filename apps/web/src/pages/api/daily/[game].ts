import type { APIRoute } from 'astro';
import { DAILY_CONTENT } from '../../../games/daily.server';
import { classifyDate, mayServe } from '../../../lib/dailyDates';
import { fail, json } from '../../../lib/http';
import { ownership } from '../../../lib/owner';

export const prerender = false;

/**
 * A game's daily level for `?date=YYYY-MM-DD` (the player's local date): today's for anyone,
 * past dates only for owners of the game, future dates never.
 */
export const GET: APIRoute = async ({ params, cookies, url }) => {
  const game = params.game ?? '';
  const source = Object.hasOwn(DAILY_CONTENT, game) ? DAILY_CONTENT[game] : undefined;
  if (!source) return fail(404, 'Unknown game');
  const date = url.searchParams.get('date') ?? '';
  const access = classifyDate(date, Date.now());
  if (access === 'invalid') return fail(400, 'Invalid date');
  if (access === 'future') return fail(403, 'That day has not come yet');
  try {
    const owner = access === 'past' ? (await ownership(cookies, game, url)) !== null : false;
    if (!mayServe(access, owner)) return fail(403, 'Full game not unlocked');
    const level = source(date);
    if (level === null || level === undefined) {
      // Today's level missing means the frozen days ran out: generate more (npm run gen in the game).
      if (access === 'today') console.error('[daily] no level for today', { game, date });
      return fail(404, 'No daily level for that day');
    }
    return json({ success: true, data: level }, 200, { 'cache-control': 'private, no-store' });
  } catch (err) {
    console.error('[daily] level failed', { game, date, err });
    return fail(500, 'Could not load the daily level');
  }
};
