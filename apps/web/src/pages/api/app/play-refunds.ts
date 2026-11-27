import type { APIRoute } from 'astro';
import { createHash, timingSafeEqual } from 'node:crypto';
import { db } from '../../../lib/db';
import { setPaymentStatus } from '../../../lib/db/purchaseRepo';
import { requireSecret } from '../../../lib/env';
import { fail, json } from '../../../lib/http';
import { play } from '../../../lib/play';
import { playPurchaseId } from '../../../lib/playPurchases';

export const prerender = false;

/** Google lists voided purchases for the last 30 days. */
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const digest = (v: string): Buffer => createHash('sha256').update(v).digest();

function authorized(request: Request): boolean {
  const header = request.headers.get('authorization') ?? '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  return given.length > 0 && timingSafeEqual(digest(given), digest(requireSecret('PLAY_SYNC_SECRET')));
}

/**
 * Takes back Google Play purchases that were refunded, charged back or
 * cancelled, as the Stripe webhook does for Stripe ones. Called by a
 * scheduler (daily is plenty) with `Authorization: Bearer $PLAY_SYNC_SECRET`.
 * Idempotent: each run re-applies the last 30 days.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!authorized(request)) return fail(401, 'Unauthorized');
  try {
    const voided = await play().voidedSince(Date.now() - WINDOW_MS);
    await db();
    let revoked = 0;
    for (const v of voided) {
      if (v.orderId) revoked += await setPaymentStatus(playPurchaseId(v.orderId), 'refunded');
    }
    console.info('[app/play-refunds] synced', { voided: voided.length, revoked });
    return json({ success: true, data: { voided: voided.length, revoked } });
  } catch (err) {
    console.error('[app/play-refunds] failed', err);
    return fail(502, 'Could not sync refunds from Google Play');
  }
};
