/**
 * Buying inside the 16bit.ink app. Stores don't allow Stripe in an app, so
 * there the purchase goes through the app's bridge (`window.InkApp`, from
 * the 16bit-ink-mobile repo) to Google Play, and the server confirms it with
 * Google (pages/api/app/purchase.ts). Ownership then works as for Stripe:
 * the purchase is saved to the signed-in account.
 */

/** A store purchase as the app's bridge reports it. */
export interface AppPurchase {
  readonly game: string;
  readonly productId: string;
  readonly token: string;
  readonly state: 'purchased' | 'pending' | 'unknown';
  /** Acknowledged purchases are saved already: the server acknowledges only after saving. */
  readonly acknowledged: boolean;
}

export interface AppProduct {
  readonly game: string;
  readonly productId: string;
  readonly price: string;
  readonly amount?: number;
  readonly currency?: string;
}

type AppPurchaseResult =
  | { readonly status: 'purchased'; readonly purchase: AppPurchase }
  | { readonly status: 'pending' | 'cancelled' }
  | { readonly status: 'error'; readonly message?: string };

interface InkApp {
  readonly isApp?: boolean;
  /** 'play' in the Android app; absent where the app can't sell (the iOS app, for now). */
  readonly billing?: string;
  readonly getProducts?: (games: readonly string[]) => Promise<AppProduct[]>;
  readonly purchase?: (game: string, accountId: string) => Promise<AppPurchaseResult>;
  readonly getPurchases?: () => Promise<AppPurchase[]>;
}

type Billing = Required<Pick<InkApp, 'getProducts' | 'purchase' | 'getPurchases'>>;

const inkApp = (): InkApp | undefined => (window as unknown as { InkApp?: InkApp }).InkApp;

/** Inside the app (where web checkout must never show). */
export const inApp = (): boolean => inkApp()?.isApp === true;

/** The app's store billing, when this app version can sell. */
export function appBilling(): Billing | null {
  const app = inkApp();
  return app?.billing === 'play' && app.getProducts && app.purchase && app.getPurchases
    ? { getProducts: app.getProducts, purchase: app.purchase, getPurchases: app.getPurchases }
    : null;
}

export type Confirmed = { readonly status: 'owned' | 'pending' } | { readonly error: string };

/** Asks the server to check a store purchase with Google and save it to the signed-in account. */
export async function confirmPurchase(p: AppPurchase, product?: AppProduct): Promise<Confirmed> {
  const price = product && typeof product.amount === 'number' && product.currency ? { amount: product.amount, currency: product.currency } : undefined;
  try {
    const res = await fetch('/api/app/purchase', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: p.productId, token: p.token, price }),
    });
    const body = (await res.json().catch(() => null)) as { success?: boolean; data?: { status?: string }; error?: string } | null;
    if (res.ok && body?.data?.status === 'owned') return { status: 'owned' };
    if (res.ok && body?.data?.status === 'pending') return { status: 'pending' };
    return { error: body?.error ?? 'Could not confirm the purchase. Please try again.' };
  } catch {
    return { error: 'Network error. Your purchase is safe: open the game again to finish unlocking it.' };
  }
}

const PENDING = 'Your purchase is pending. The game unlocks as soon as Google Play confirms the payment.';

/** Buys `game` through the app's store, for the signed-in `userId`; reloads the page once it is unlocked. */
export async function buyInApp(billing: Billing, game: string, userId: string): Promise<{ readonly error?: string }> {
  const [product] = await billing.getProducts([game]).catch(() => [] as AppProduct[]);
  let result: AppPurchaseResult;
  try {
    result = await billing.purchase(game, userId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'The purchase could not start. Please try again.' };
  }
  if (result.status === 'error') return { error: result.message ?? 'The purchase failed. Please try again.' };
  if (result.status !== 'purchased') return result.status === 'pending' ? { error: PENDING } : {};
  const confirmed = await confirmPurchase(result.purchase, product);
  if ('error' in confirmed) return confirmed;
  if (confirmed.status === 'pending') return { error: PENDING };
  window.location.reload();
  return {};
}

/** The store's product for each game, so a confirm can carry its price (for the sales stats). Empty when the store can't say. */
async function productsFor(billing: Billing, games: readonly string[]): Promise<Map<string, AppProduct>> {
  if (games.length === 0) return new Map();
  const products = await billing.getProducts([...new Set(games)]).catch(() => [] as AppProduct[]);
  return new Map(products.map((p) => [p.game, p]));
}

/**
 * Saves store purchases the server hasn't confirmed yet: one paid while the
 * app was closed, a payment that was pending, or a confirm that failed
 * offline. Calls `onOwned` for each game it unlocks. Only when signed in.
 */
export async function syncAppPurchases(onOwned: (game: string) => void): Promise<void> {
  const billing = appBilling();
  if (!billing) return;
  const purchases = (await billing.getPurchases().catch(() => [] as AppPurchase[])).filter((p) => p.state === 'purchased' && !p.acknowledged);
  // The first save of a purchase is the one that counts, price included.
  const products = await productsFor(billing, purchases.map((p) => p.game));
  for (const p of purchases) {
    const confirmed = await confirmPurchase(p, products.get(p.game));
    if ('status' in confirmed && confirmed.status === 'owned') onOwned(p.game);
  }
}

/** A purchase that completes while the page is open (a pending payment going through): saved, then `onOwned`. */
export function watchAppPurchases(onOwned: (game: string) => void): void {
  window.addEventListener('inkapp:purchase', (e) => {
    const p = (e as CustomEvent<AppPurchase>).detail;
    const billing = appBilling();
    if (!billing || !p || p.state !== 'purchased' || p.acknowledged) return;
    void productsFor(billing, [p.game])
      .then((products) => confirmPurchase(p, products.get(p.game)))
      .then((c) => {
        if ('status' in c && c.status === 'owned') onOwned(p.game);
      });
  });
}
