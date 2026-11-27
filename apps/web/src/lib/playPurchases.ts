import { createHash } from 'node:crypto';
import { findGame, isPurchasable } from '../data/games';
import type { PlayProductPurchase } from './googlePlay';
import type { PurchaseRecord } from './purchases';
import type { UserId } from './userId';

/**
 * Google Play purchases from the Android app, as purchase records. Pure
 * rules only; the route (pages/api/app/purchase.ts) asks Google first.
 *
 * Each game sells one non-consumable product, `<slug>_full`. A Play purchase
 * keeps the record shape of a Stripe one: its id, and the "payment" a refund
 * names, are both `play:<orderId>`, so refunds reuse setPaymentStatus. A
 * purchase Google gives no order id (a promo code may come without one) is
 * `play:token:<sha256 of its token>` instead.
 */

export const PLAY_PREFIX = 'play:';

export const playProductId = (slug: string): string => `${slug}_full`;

/** The game a Play product unlocks, if it is one we sell. */
export function gameForPlayProduct(productId: string): string | null {
  const m = /^([a-z0-9-]{1,40})_full$/.exec(productId);
  const game = m ? findGame(m[1]) : undefined;
  return isPurchasable(game) ? game.slug : null;
}

export const playPurchaseId = (orderId: string): string => `${PLAY_PREFIX}${orderId}`;

/** The id of a purchase without an order id: its token, hashed (tokens are long, and secret enough not to store as is). */
export const playTokenId = (token: string): string => `${PLAY_PREFIX}token:${createHash('sha256').update(token).digest('hex')}`;

/** The purchase ids a voided purchase may have been saved under. */
export function voidedIds(v: { readonly orderId?: string; readonly purchaseToken?: string }): string[] {
  return [...(v.orderId ? [playPurchaseId(v.orderId)] : []), ...(v.purchaseToken ? [playTokenId(v.purchaseToken)] : [])];
}

export const isPlayPurchase = (r: Pick<PurchaseRecord, 'sessionId'>): boolean => r.sessionId.startsWith(PLAY_PREFIX);

/** A license tester's purchase: no money changed hands. */
export const isPlayTest = (p: PlayProductPurchase): boolean => p.purchaseType === 0;

export type PlayVerdict =
  | { readonly ok: true; readonly record: PurchaseRecord }
  | { readonly ok: false; readonly status: 'pending' | 'cancelled' | 'other-account' | 'invalid' };

export interface PlayContext {
  readonly game: string;
  /** The purchase token Google was asked about. */
  readonly token: string;
  readonly user: { readonly userId: UserId; readonly email: string };
  /**
   * The price the store showed the buyer, as the app reported it (stats only: never trusted for access).
   * What the buyer paid, before Google's fee: the same basis as a Stripe purchase's amount_total.
   */
  readonly price?: { readonly amount: number; readonly currency: string };
}

/**
 * Whether Google's answer about a purchase gives `ctx.user` the game. The app
 * tags each purchase with the buyer's user id, so a token taken from someone
 * else's phone, or bought while another account was signed in, never moves.
 */
export function playVerdict(p: PlayProductPurchase, ctx: PlayContext): PlayVerdict {
  if (p.purchaseState === 2) return { ok: false, status: 'pending' };
  if (p.purchaseState !== 0) return { ok: false, status: 'cancelled' };
  if (p.obfuscatedExternalAccountId !== ctx.user.userId) return { ok: false, status: 'other-account' };
  const paidMs = Number(p.purchaseTimeMillis);
  if (!Number.isFinite(paidMs)) return { ok: false, status: 'invalid' };
  const id = p.orderId ? playPurchaseId(p.orderId) : playTokenId(ctx.token);
  // Promo codes and license testers pay nothing.
  const charged = p.purchaseType === undefined && ctx.price ? ctx.price : null;
  return {
    ok: true,
    record: {
      sessionId: id,
      game: ctx.game,
      email: ctx.user.email.toLowerCase(),
      userId: ctx.user.userId,
      customerId: null,
      paymentIntent: id,
      amount: charged ? minorUnits(charged.amount, charged.currency) : 0,
      currency: (charged?.currency ?? 'usd').toLowerCase(),
      livemode: !isPlayTest(p),
      status: 'paid',
      paidAt: new Date(paidMs),
    },
  };
}

/** A price in the currency's smallest unit, as Stripe amounts are (2.99 USD → 299, 500 JPY → 500). */
export function minorUnits(amount: number, currency: string): number {
  let digits = 2;
  try {
    digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 0;
  }
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 10 ** digits) : 0;
}
