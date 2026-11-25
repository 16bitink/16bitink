import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BIND_COOKIE } from '../src/lib/appSignIn';
import { hashSecret } from '../src/lib/emailSignIn';
import { fakeCookies } from './authCookies';

const collectHandoff = vi.fn();
const finishSignIn = vi.fn();

vi.mock('../src/lib/db', () => ({ db: async () => undefined }));
vi.mock('../src/lib/db/appHandoffRepo', () => ({ collectHandoff: (...a: unknown[]) => collectHandoff(...a) }));
vi.mock('../src/lib/signIn', () => ({ finishSignIn: (...a: unknown[]) => finishSignIn(...a) }));

const { redeemHandoff } = await import('../src/lib/appRedeem');

const NOW = new Date('2026-11-25T12:00:00Z');
const who = { kind: 'google', user: { googleId: 'g-1', email: 'crab@example.com', name: 'Crab' } } as const;
const url = (t = 'the-token') => new URL(`https://16bit.ink/auth/app/redeem?t=${t}`);

describe('redeeming an app sign-in', () => {
  beforeEach(() => {
    collectHandoff.mockReset();
    finishSignIn.mockReset().mockResolvedValue(undefined);
  });

  it('signs in the web view holding the bind cookie, once, and keeps the token out of Referer and caches', async () => {
    collectHandoff.mockResolvedValue({ who, ret: '/play/inkpin' });
    const { cookies, deleted } = fakeCookies({ [BIND_COOKIE]: 'web-view-secret' });
    const res = await redeemHandoff(cookies, url(), NOW);
    expect(collectHandoff).toHaveBeenCalledWith(await hashSecret('the-token'), await hashSecret('web-view-secret'), NOW);
    expect(finishSignIn).toHaveBeenCalledWith(cookies, url(), who, NOW);
    expect(res).toBeInstanceOf(Response);
    const r = res as Response;
    expect(r.status).toBe(303);
    expect(r.headers.get('location')).toBe('/play/inkpin');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('referrer-policy')).toBe('no-referrer');
    expect(deleted).toContain(BIND_COOKIE);
  });

  it('without the bind cookie, does not even look the token up (so it stays usable)', async () => {
    const { cookies } = fakeCookies();
    expect(await redeemHandoff(cookies, url(), NOW)).toEqual({ error: expect.stringMatching(/expired/), ret: '/' });
    expect(collectHandoff).not.toHaveBeenCalled();
    expect(finishSignIn).not.toHaveBeenCalled();
  });

  it('with another web view\'s cookie (no handoff found), signs no one in', async () => {
    collectHandoff.mockResolvedValue(null);
    const { cookies } = fakeCookies({ [BIND_COOKIE]: 'someone-else' });
    expect(await redeemHandoff(cookies, url(), NOW)).toEqual({ error: expect.stringMatching(/expired/), ret: '/' });
    expect(finishSignIn).not.toHaveBeenCalled();
  });

  it('refuses a missing or oversized token', async () => {
    const { cookies } = fakeCookies({ [BIND_COOKIE]: 'web-view-secret' });
    expect(await redeemHandoff(cookies, new URL('https://16bit.ink/auth/app/redeem'), NOW)).toMatchObject({ error: expect.any(String) });
    expect(await redeemHandoff(cookies, url('x'.repeat(101)), NOW)).toMatchObject({ error: expect.any(String) });
    expect(collectHandoff).not.toHaveBeenCalled();
  });

  it('says so when the database fails', async () => {
    collectHandoff.mockRejectedValue(new Error('down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { cookies } = fakeCookies({ [BIND_COOKIE]: 'web-view-secret' });
    expect(await redeemHandoff(cookies, url(), NOW)).toEqual({ error: expect.stringMatching(/went wrong/), ret: '/' });
  });
});
