import { generateKeyPairSync, createVerify } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { playClient, tokenAssertion, type PlayProductPurchase } from '../src/lib/googlePlay';
import { gameForPlayProduct, minorUnits, playVerdict } from '../src/lib/playPurchases';
import { ownedGames, type PurchaseRecord } from '../src/lib/purchases';

const user = { userId: '65f0c0ffee0000000000aa01', email: 'Fish@Example.com' };
const paid: PlayProductPurchase = {
  purchaseState: 0, acknowledgementState: 0, orderId: 'GPA.1234-5678-9012-34567', purchaseTimeMillis: '1800000000000',
  obfuscatedExternalAccountId: user.userId, regionCode: 'US',
};

describe('Play products', () => {
  it('maps <slug>_full to a game we sell, and nothing else', () => {
    expect(gameForPlayProduct('inkfish_full')).toBe('inkfish');
    expect(gameForPlayProduct('inkfish')).toBeNull();
    expect(gameForPlayProduct('nope_full')).toBeNull();
    expect(gameForPlayProduct('all_full')).toBeNull();
  });
});

describe('a Play purchase', () => {
  it('becomes a paid record for the buyer, keyed and refunded by its order', () => {
    const v = playVerdict(paid, { game: 'inkfish', user, price: { amount: 4.99, currency: 'USD' } });
    expect(v).toEqual({
      ok: true,
      record: {
        sessionId: 'play:GPA.1234-5678-9012-34567', paymentIntent: 'play:GPA.1234-5678-9012-34567', game: 'inkfish',
        email: 'fish@example.com', userId: user.userId, customerId: null, amount: 499, currency: 'usd', livemode: true,
        status: 'paid', paidAt: new Date(1_800_000_000_000),
      },
    });
  });

  it('never goes to another account than the one the app tagged it with', () => {
    expect(playVerdict({ ...paid, obfuscatedExternalAccountId: '65f0c0ffee0000000000bb02' }, { game: 'inkfish', user })).toEqual({ ok: false, status: 'other-account' });
    expect(playVerdict({ ...paid, obfuscatedExternalAccountId: undefined }, { game: 'inkfish', user })).toEqual({ ok: false, status: 'other-account' });
  });

  it('waits for a pending payment and refuses a cancelled one', () => {
    expect(playVerdict({ ...paid, purchaseState: 2 }, { game: 'inkfish', user })).toEqual({ ok: false, status: 'pending' });
    expect(playVerdict({ ...paid, purchaseState: 1 }, { game: 'inkfish', user })).toEqual({ ok: false, status: 'cancelled' });
  });

  it('marks a license tester purchase as test mode, with no money', () => {
    const v = playVerdict({ ...paid, purchaseType: 0 }, { game: 'inkfish', user, price: { amount: 4.99, currency: 'USD' } });
    expect(v.ok && v.record).toMatchObject({ livemode: false, amount: 0 });
  });

  it('counts a promo code as owned but free', () => {
    const v = playVerdict({ ...paid, purchaseType: 1 }, { game: 'inkfish', user, price: { amount: 4.99, currency: 'USD' } });
    expect(v.ok && v.record).toMatchObject({ livemode: true, amount: 0 });
  });

  it('refuses a purchase without an order id', () => {
    expect(playVerdict({ ...paid, orderId: undefined }, { game: 'inkfish', user })).toEqual({ ok: false, status: 'invalid' });
  });

  it('stores prices in the smallest currency unit', () => {
    expect(minorUnits(4.99, 'USD')).toBe(499);
    expect(minorUnits(500, 'JPY')).toBe(500);
    expect(minorUnits(4.99, 'nope')).toBe(0);
    expect(minorUnits(-1, 'USD')).toBe(0);
  });
});

describe('license testers', () => {
  const test: PurchaseRecord = {
    sessionId: 'play:GPA.1', paymentIntent: 'play:GPA.1', game: 'inkfish', email: null, userId: user.userId, customerId: null,
    amount: 0, currency: 'usd', livemode: false, status: 'paid', paidAt: new Date(0),
  };

  it('unlock only while PLAY_TEST_PURCHASES is on', () => {
    expect(ownedGames([test], { allowTestMode: false })).toEqual([]);
    expect(ownedGames([test], { allowTestMode: false, allowPlayTests: true })).toEqual(['inkfish']);
  });

  it('never turn on Stripe test purchases', () => {
    expect(ownedGames([{ ...test, sessionId: 'cs_test_1' }], { allowTestMode: false, allowPlayTests: true })).toEqual([]);
  });
});

describe('Google Play API client', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const account = { client_email: 'play@ink.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() };

  it('signs the token request as the service account', () => {
    const jwt = tokenAssertion(account, 1_800_000_000);
    const [head, body, sig] = jwt.split('.');
    expect(createVerify('RSA-SHA256').update(`${head}.${body}`).verify(publicKey, Buffer.from(sig, 'base64url'))).toBe(true);
    expect(JSON.parse(Buffer.from(body, 'base64url').toString())).toEqual({
      iss: account.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token',
      iat: 1_800_000_000, exp: 1_800_003_600,
    });
  });

  const reply = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status });

  it('reuses its access token and follows refund pages', async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.startsWith('https://oauth2.googleapis.com/')) return reply({ access_token: 'at', expires_in: 3600 });
      if (u.includes('pageSelection.token=p2')) return reply({ voidedPurchases: [{ orderId: 'GPA.2' }] });
      return reply({ voidedPurchases: [{ orderId: 'GPA.1' }], tokenPagination: { nextPageToken: 'p2' } });
    });
    const client = playClient('ink.sixteenbit.games', account, fetchFn as typeof fetch);
    expect(await client.voidedSince(1)).toEqual([{ orderId: 'GPA.1' }, { orderId: 'GPA.2' }]);
    const urls = fetchFn.mock.calls.map(([u]) => String(u));
    expect(urls.filter((u) => u.includes('oauth2'))).toHaveLength(1);
    expect(urls[1]).toBe('https://androidpublisher.googleapis.com/androidpublisher/v3/applications/ink.sixteenbit.games/purchases/voidedpurchases?type=0&pageSelection.maxResults=1000&startTime=1');
  });

  it("leaves the refund window to Google unless a start is given", async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request) => (String(url).includes('oauth2') ? reply({ access_token: 'at' }) : reply({})));
    expect(await playClient('ink.sixteenbit.games', account, fetchFn as typeof fetch).voidedSince()).toEqual([]);
    expect(String(fetchFn.mock.calls[1][0])).toBe('https://androidpublisher.googleapis.com/androidpublisher/v3/applications/ink.sixteenbit.games/purchases/voidedpurchases?type=0&pageSelection.maxResults=1000');
  });

  it('acknowledges at the purchase token', async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request, _init?: RequestInit) => (String(url).includes('oauth2') ? reply({ access_token: 'at' }) : new Response(null, { status: 204 })));
    await playClient('ink.sixteenbit.games', account, fetchFn as typeof fetch).acknowledge('inkfish_full', 'tok/1');
    expect(String(fetchFn.mock.calls[1][0])).toBe('https://androidpublisher.googleapis.com/androidpublisher/v3/applications/ink.sixteenbit.games/purchases/products/inkfish_full/tokens/tok%2F1:acknowledge');
    expect(fetchFn.mock.calls[1][1]).toMatchObject({ method: 'POST', headers: { authorization: 'Bearer at' } });
  });
});
