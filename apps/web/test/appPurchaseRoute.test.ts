import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayApiError } from '../src/lib/googlePlay';

const currentUser = vi.fn();
const getProductPurchase = vi.fn();
const acknowledge = vi.fn();
const voidedSince = vi.fn();
const savePurchase = vi.fn();
const findPurchase = vi.fn();
const setPaymentStatus = vi.fn();

const requireSecret = vi.fn((_name: string) => 's'.repeat(40));

vi.mock('../src/lib/env', () => ({ optionalEnv: () => undefined, requireSecret: (name: string) => requireSecret(name) }));
vi.mock('../src/lib/owner', () => ({ currentUser: (...a: unknown[]) => currentUser(...a) }));
vi.mock('../src/lib/db', () => ({ db: async () => undefined }));
vi.mock('../src/lib/db/purchaseRepo', () => ({
  savePurchase: (...a: unknown[]) => savePurchase(...a), findPurchase: (...a: unknown[]) => findPurchase(...a), setPaymentStatus: (...a: unknown[]) => setPaymentStatus(...a),
}));
vi.mock('../src/lib/play', () => ({
  play: () => ({ getProductPurchase: (...a: unknown[]) => getProductPurchase(...a), acknowledge: (...a: unknown[]) => acknowledge(...a), voidedSince: (...a: unknown[]) => voidedSince(...a) }),
}));

const { POST } = await import('../src/pages/api/app/purchase');
const refunds = await import('../src/pages/api/app/play-refunds');

const ORIGIN = 'https://16bit.ink';
const USER = { userId: '65f0c0ffee0000000000aa01', email: 'fish@example.com' };
const PAID = { purchaseState: 0, acknowledgementState: 0, orderId: 'GPA.1', purchaseTimeMillis: '1800000000000', obfuscatedExternalAccountId: USER.userId };

function call(body: unknown, origin = ORIGIN): Promise<Response> {
  const request = new Request(`${ORIGIN}/api/app/purchase`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return POST({ request, url: new URL(request.url), cookies: {} } as never) as Promise<Response>;
}

describe('POST /api/app/purchase', () => {
  beforeEach(() => {
    currentUser.mockReset().mockResolvedValue(USER);
    getProductPurchase.mockReset().mockResolvedValue(PAID);
    acknowledge.mockReset().mockResolvedValue(undefined);
    savePurchase.mockReset().mockResolvedValue(undefined);
    findPurchase.mockReset().mockImplementation(async () => ({ ...savePurchase.mock.calls[0][0] }));
  });

  it('saves a paid purchase to the buyer, then acknowledges it', async () => {
    const res = await call({ productId: 'inkfish_full', token: 'tok', price: { amount: 4.99, currency: 'USD' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { game: 'inkfish', status: 'owned' } });
    expect(getProductPurchase).toHaveBeenCalledWith('inkfish_full', 'tok');
    expect(savePurchase).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'play:GPA.1', userId: USER.userId, amount: 499, game: 'inkfish' }));
    expect(acknowledge).toHaveBeenCalledWith('inkfish_full', 'tok');
    expect(savePurchase.mock.invocationCallOrder[0]).toBeLessThan(acknowledge.mock.invocationCallOrder[0]);
  });

  it('does not acknowledge twice', async () => {
    getProductPurchase.mockResolvedValue({ ...PAID, acknowledgementState: 1 });
    expect((await call({ productId: 'inkfish_full', token: 'tok' })).status).toBe(200);
    expect(acknowledge).not.toHaveBeenCalled();
  });

  it('still unlocks when the acknowledgement fails (the app sends it again)', async () => {
    acknowledge.mockRejectedValue(new Error('down'));
    expect((await call({ productId: 'inkfish_full', token: 'tok' })).status).toBe(200);
  });

  it('needs a signed-in player', async () => {
    currentUser.mockResolvedValue(null);
    expect((await call({ productId: 'inkfish_full', token: 'tok' })).status).toBe(401);
    expect(getProductPurchase).not.toHaveBeenCalled();
  });

  it('refuses another site, and products we do not sell', async () => {
    expect((await call({ productId: 'inkfish_full', token: 'tok' }, 'https://evil.example')).status).toBe(403);
    expect((await call({ productId: 'coins_100', token: 'tok' })).status).toBe(404);
  });

  it('refuses a token Google does not know', async () => {
    getProductPurchase.mockRejectedValue(new PlayApiError(400, 'bad token'));
    expect((await call({ productId: 'inkfish_full', token: 'forged' })).status).toBe(400);
    expect(savePurchase).not.toHaveBeenCalled();
  });

  it("never gives someone else's purchase", async () => {
    getProductPurchase.mockResolvedValue({ ...PAID, obfuscatedExternalAccountId: '65f0c0ffee0000000000bb02' });
    expect((await call({ productId: 'inkfish_full', token: 'tok' })).status).toBe(409);
    expect(savePurchase).not.toHaveBeenCalled();
    expect(acknowledge).not.toHaveBeenCalled();
  });

  it('saves a purchase Google gives no order id, under its hashed token', async () => {
    getProductPurchase.mockResolvedValue({ ...PAID, orderId: undefined, purchaseType: 1 });
    expect((await call({ productId: 'inkfish_full', token: 'tok' })).status).toBe(200);
    expect(savePurchase).toHaveBeenCalledWith(expect.objectContaining({ sessionId: expect.stringMatching(/^play:token:[0-9a-f]{64}$/) }));
    expect(acknowledge).toHaveBeenCalled();
  });

  it('answers pending without saving', async () => {
    getProductPurchase.mockResolvedValue({ ...PAID, purchaseState: 2 });
    const res = await call({ productId: 'inkfish_full', token: 'tok' });
    expect(res.status).toBe(202);
    expect(await res.json()).toMatchObject({ data: { status: 'pending' } });
    expect(savePurchase).not.toHaveBeenCalled();
  });

  it('keeps a refunded order refunded when it is sent again', async () => {
    findPurchase.mockResolvedValue({ sessionId: 'play:GPA.1', userId: USER.userId, status: 'refunded' });
    expect((await call({ productId: 'inkfish_full', token: 'tok' })).status).toBe(410);
    expect(acknowledge).not.toHaveBeenCalled();
  });
});

describe('POST /api/app/play-refunds', () => {
  const sync = (auth?: string): Promise<Response> =>
    refunds.POST({ request: new Request(`${ORIGIN}/api/app/play-refunds`, { method: 'POST', headers: auth ? { authorization: auth } : {} }) } as never) as Promise<Response>;

  beforeEach(() => {
    voidedSince.mockReset().mockResolvedValue([{ orderId: 'GPA.1' }, { purchaseToken: 'no-order' }, { orderId: 'GPA.2' }]);
    setPaymentStatus.mockReset().mockResolvedValue(1);
  });

  it('says so when the sync secret is missing or weak', async () => {
    requireSecret.mockImplementationOnce(() => {
      throw new Error('PLAY_SYNC_SECRET must be at least 32 characters');
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await sync(`Bearer ${'s'.repeat(40)}`);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ success: false, error: expect.stringContaining('PLAY_SYNC_SECRET') });
    expect(voidedSince).not.toHaveBeenCalled();
  });

  it('needs the sync secret', async () => {
    expect((await sync()).status).toBe(401);
    expect((await sync('Bearer wrong')).status).toBe(401);
    expect(voidedSince).not.toHaveBeenCalled();
  });

  it('revokes every voided order', async () => {
    const res = await sync(`Bearer ${'s'.repeat(40)}`);
    expect(await res.json()).toEqual({ success: true, data: { voided: 3, revoked: 3 } });
    expect(setPaymentStatus.mock.calls.map(([id]) => id)).toEqual(['play:GPA.1', expect.stringMatching(/^play:token:[0-9a-f]{64}$/), 'play:GPA.2']);
    // No start time: Google refuses one older than 30 days, and its default is the last 30.
    expect(voidedSince).toHaveBeenCalledWith();
  });
});
