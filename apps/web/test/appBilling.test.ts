import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncAppPurchases } from '../src/lib/client/appBilling';

const purchase = (game: string, acknowledged = false) => ({ game, productId: `${game}_full`, token: `tok-${game}`, state: 'purchased' as const, acknowledged });

function app(purchases: unknown[], products: unknown[]) {
  const getProducts = vi.fn(async () => products);
  vi.stubGlobal('window', { InkApp: { isApp: true, billing: 'play', getProducts, purchase: vi.fn(), getPurchases: async () => purchases } });
  const fetch = vi.fn(async () => new Response(JSON.stringify({ success: true, data: { status: 'owned' } })));
  vi.stubGlobal('fetch', fetch);
  return { getProducts, fetch };
}

const sentBodies = (fetch: ReturnType<typeof vi.fn>): unknown[] => fetch.mock.calls.map((c) => JSON.parse((c as [string, RequestInit])[1].body as string));

describe('catching up on store purchases in the app', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends each unsaved purchase with its store price, so the sales stats are right', async () => {
    const { getProducts, fetch } = app(
      [purchase('inkfish'), purchase('inkcrab', true)],
      [{ game: 'inkfish', productId: 'inkfish_full', price: '$4.99', amount: 4.99, currency: 'USD' }],
    );
    const owned: string[] = [];
    await syncAppPurchases((g) => owned.push(g));
    expect(getProducts).toHaveBeenCalledWith(['inkfish']);
    expect(sentBodies(fetch)).toEqual([{ productId: 'inkfish_full', token: 'tok-inkfish', price: { amount: 4.99, currency: 'USD' } }]);
    expect(owned).toEqual(['inkfish']);
  });

  it('still saves the purchase when the store has no price to give', async () => {
    const { fetch } = app([purchase('inkfish')], []);
    await syncAppPurchases(() => undefined);
    expect(sentBodies(fetch)).toEqual([{ productId: 'inkfish_full', token: 'tok-inkfish' }]);
  });

  it('asks the store nothing when every purchase is saved already', async () => {
    const { getProducts, fetch } = app([purchase('inkfish', true)], []);
    await syncAppPurchases(() => undefined);
    expect(getProducts).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
