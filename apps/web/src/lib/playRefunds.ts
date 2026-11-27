import { db } from './db';
import { setPaymentStatus } from './db/purchaseRepo';
import { optionalEnv } from './env';
import { play } from './play';
import { voidedIds } from './playPurchases';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Takes back Google Play purchases that were refunded, charged back or
 * cancelled, as the Stripe webhook does for Stripe ones. Idempotent: each run
 * re-applies Google's default window, the last 30 days (no startTime: Google
 * refuses one older than 30 days, and now minus 30 days is by the time it checks).
 */
export async function syncPlayRefunds(): Promise<{ voided: number; revoked: number }> {
  const voided = await play().voidedSince();
  await db();
  let revoked = 0;
  for (const v of voided) {
    // Saved under its order id, or its token's hash when Google gave no order id.
    for (const id of voidedIds(v)) revoked += await setPaymentStatus(id, 'refunded');
  }
  console.info('[play-refunds] synced', { voided: voided.length, revoked });
  return { voided: voided.length, revoked };
}

/**
 * Runs `task` at most once per `everyMs`, never twice at once. A failed run
 * is retried an hour later instead of a day.
 */
export function throttled(task: () => Promise<unknown>, everyMs: number, retryMs: number): (nowMs: number) => void {
  let next = 0;
  let running = false;
  return (nowMs) => {
    if (running || nowMs < next) return;
    running = true;
    next = nowMs + everyMs;
    task()
      .catch((err: unknown) => {
        next = nowMs + retryMs;
        console.error('[play-refunds] sync failed', err);
      })
      .finally(() => {
        running = false;
      });
  };
}

const daily = throttled(syncPlayRefunds, DAY_MS, 60 * 60 * 1000);

/**
 * Called on requests (middleware.ts): the server syncs Play refunds itself,
 * once a day per instance (and after each deploy), so no scheduler is needed.
 * Off until PLAY_SERVICE_ACCOUNT is set.
 */
export function syncPlayRefundsDaily(nowMs: number): void {
  if (optionalEnv('PLAY_SERVICE_ACCOUNT')) daily(nowMs);
}
