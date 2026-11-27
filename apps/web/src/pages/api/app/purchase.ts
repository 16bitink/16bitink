import type { APIRoute } from 'astro';
import { z } from 'zod';
import { db } from '../../../lib/db';
import { findPurchase, savePurchase } from '../../../lib/db/purchaseRepo';
import { PlayApiError } from '../../../lib/googlePlay';
import { fail, isSameOrigin, json } from '../../../lib/http';
import { currentUser } from '../../../lib/owner';
import { play } from '../../../lib/play';
import { gameForPlayProduct, playVerdict } from '../../../lib/playPurchases';

export const prerender = false;

const Body = z.object({
  productId: z.string().min(1).max(100),
  token: z.string().min(1).max(4096),
  /** The store's price as the app showed it: for the sales stats only. */
  price: z.object({ amount: z.number().nonnegative().max(1e7), currency: z.string().regex(/^[A-Za-z]{3}$/) }).optional(),
});

/**
 * A Google Play purchase made in the Android app, sent by the page that asked
 * for it (inside the app's web view, so it carries the player's session).
 * Google is asked whether it is real and paid, and for whom; then the purchase
 * is saved like a Stripe one and acknowledged (Google refunds a purchase not
 * acknowledged within 3 days). Safe to send again: restoring sends it twice.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSameOrigin(request)) return fail(403, 'Cross-origin request rejected');
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, 'Invalid request');
  const { productId, token, price } = parsed.data;
  const game = gameForPlayProduct(productId);
  if (!game) return fail(404, 'This game is not for sale');

  try {
    const user = await currentUser(cookies);
    if (!user) return fail(401, 'Sign in to unlock the full game.');

    let purchase;
    try {
      purchase = await play().getProductPurchase(productId, token);
    } catch (err) {
      // Google answers 400/404 for a token it never issued.
      if (err instanceof PlayApiError && (err.status === 400 || err.status === 404)) return fail(400, 'Google Play does not know this purchase.');
      throw err;
    }

    const verdict = playVerdict(purchase, { game, user, price });
    if (!verdict.ok) {
      switch (verdict.status) {
        case 'pending':
          return json({ success: true, data: { game, status: 'pending' } }, 202);
        case 'cancelled':
          return fail(410, 'This purchase was cancelled or refunded.');
        case 'other-account':
          return fail(409, 'This purchase belongs to another 16bit.ink account. Sign in with that account to play it.');
        default:
          throw new Error('Google Play returned a purchase without an order id or time');
      }
    }

    await db();
    await savePurchase(verdict.record);
    // The first save wins: an order already saved for someone else, or since refunded, stays as it is.
    const saved = await findPurchase(verdict.record.sessionId);
    if (saved && saved.userId !== user.userId) return fail(409, 'This purchase belongs to another 16bit.ink account.');
    if (saved && saved.status !== 'paid') return fail(410, 'This purchase was refunded.');

    if (purchase.acknowledgementState !== 1) {
      try {
        await play().acknowledge(productId, token);
      } catch (err) {
        // Saved already, so the game unlocks; the app sends the purchase again while it stays unacknowledged.
        console.error('[app/purchase] acknowledge failed', { order: verdict.record.sessionId, err });
      }
    }
    console.info('[app/purchase] saved', { order: verdict.record.sessionId, game, test: !verdict.record.livemode });
    return json({ success: true, data: { game, status: 'owned' } });
  } catch (err) {
    console.error('[app/purchase] failed', { productId, err });
    return fail(502, 'Could not confirm the purchase with Google Play. Please try again in a moment.');
  }
};
