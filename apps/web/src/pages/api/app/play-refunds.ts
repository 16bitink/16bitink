import type { APIRoute } from 'astro';
import { createHash, timingSafeEqual } from 'node:crypto';
import { requireSecret } from '../../../lib/env';
import { fail, json } from '../../../lib/http';
import { syncPlayRefunds } from '../../../lib/playRefunds';

export const prerender = false;

const digest = (v: string): Buffer => createHash('sha256').update(v).digest();

function authorized(request: Request, secret: string): boolean {
  const header = request.headers.get('authorization') ?? '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  return given.length > 0 && timingSafeEqual(digest(given), digest(secret));
}

/**
 * Syncs Google Play refunds now, with `Authorization: Bearer $PLAY_SYNC_SECRET`.
 * The server already does it daily by itself (lib/playRefunds.ts); this is for
 * running it by hand or from a scheduler.
 */
export const POST: APIRoute = async ({ request }) => {
  let secret: string;
  try {
    secret = requireSecret('PLAY_SYNC_SECRET');
  } catch (err) {
    // Missing or too short: say so, instead of an unhandled 500.
    console.error('[app/play-refunds] not set up', err instanceof Error ? err.message : err);
    return fail(503, 'Refund sync is not set up: PLAY_SYNC_SECRET is missing or too short.');
  }
  if (!authorized(request, secret)) return fail(401, 'Unauthorized');
  try {
    return json({ success: true, data: await syncPlayRefunds() });
  } catch (err) {
    console.error('[app/play-refunds] failed', err);
    return fail(502, 'Could not sync refunds from Google Play');
  }
};
