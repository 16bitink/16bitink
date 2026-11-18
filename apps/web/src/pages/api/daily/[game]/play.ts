import type { APIRoute } from 'astro';
import { dailyGame } from '../../../../data/dailies';
import { parseDailyPlay } from '../../../../lib/daily';
import { classifyDate, todayWindow } from '../../../../lib/dailyDates';
import { dailyStanding, saveDailyPlay } from '../../../../lib/db/dailyPlayRepo';
import { db } from '../../../../lib/db';
import { playerKey, signedInUserId } from '../../../../lib/dailyPlayer';
import { fail, isSameOrigin, json } from '../../../../lib/http';

export const prerender = false;

const MAX_BODY = 2000;

/**
 * Saves a daily play (the player's best of the day is kept) and answers with today's standing:
 * how many played and what share of them this play beat. The player is the account when signed in,
 * else the browser's visitor id sent in the body.
 */
export const POST: APIRoute = async ({ params, cookies, request }) => {
  if (!isSameOrigin(request)) return fail(403, 'Cross-origin request rejected');
  const game = params.game ?? '';
  if (!dailyGame(game)) return fail(404, 'Unknown game');
  const text = await request.text().catch(() => '');
  const play = text.length <= MAX_BODY ? parseDailyPlay(text) : null;
  if (!play) return fail(400, 'Invalid play');
  const now = Date.now();
  if (classifyDate(play.date, now) === 'future') return fail(400, 'That day has not come yet');
  // A play of a date before every time zone's today is late whatever the browser says.
  const late = play.late || play.date < todayWindow(now).min;
  try {
    const player = playerKey(await signedInUserId(cookies), play.visitor);
    if (!player) return fail(400, 'No player');
    await db();
    const kept = await saveDailyPlay({ player, game, date: play.date, result: play.result, seconds: play.seconds, breakIn: play.breakIn, shells: play.shells, late });
    return json({ success: true, data: await dailyStanding(game, play.date, kept) });
  } catch (err) {
    console.error('[daily] play save failed', { game, err });
    return fail(500, 'Could not save the play');
  }
};
