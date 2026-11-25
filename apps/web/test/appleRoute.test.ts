import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newAppleNonce } from '../src/lib/apple';
import { hashSecret } from '../src/lib/emailSignIn';

const SECRET = 'test-secret-that-is-long-enough-for-hmac-0123456789';
const verifyAppleIdToken = vi.fn();
const useAppleNonce = vi.fn();
const issueHandoff = vi.fn();

vi.mock('../src/lib/env', () => ({ requireSecret: () => SECRET, optionalEnv: () => undefined }));
vi.mock('../src/lib/apple', async (orig) => ({
  ...(await orig<typeof import('../src/lib/apple')>()),
  verifyAppleIdToken: (...a: unknown[]) => verifyAppleIdToken(...a),
}));
vi.mock('../src/lib/db', () => ({ db: async () => undefined }));
vi.mock('../src/lib/db/appleNonceRepo', () => ({ useAppleNonce: (...a: unknown[]) => useAppleNonce(...a) }));
vi.mock('../src/lib/signIn', () => ({ ADMIN_APP_REFUSED: 'admins: use the browser', issueHandoff: (...a: unknown[]) => issueHandoff(...a) }));

const { POST } = await import('../src/pages/auth/apple');

const BIND = 'b'.repeat(64);
const user = { appleId: '001.abc', email: 'fish@example.com', name: 'Ink' };

async function call(body: Record<string, unknown>) {
  const request = new Request('https://16bit.ink/auth/apple', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const res = (await POST({ request } as never)) as Response;
  return { status: res.status, body: (await res.json()) as { success?: boolean; data?: { url?: string }; error?: string } };
}

describe('POST /auth/apple', () => {
  let nonce: string;

  beforeEach(async () => {
    nonce = await newAppleNonce(SECRET, Math.floor(Date.now() / 1000));
    verifyAppleIdToken.mockReset().mockResolvedValue(user);
    useAppleNonce.mockReset().mockResolvedValue(true);
    issueHandoff.mockReset().mockResolvedValue('handoff-token');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('checks Apple\'s token, uses up the nonce and answers the page that finishes in the web view', async () => {
    const { status, body } = await call({ identityToken: 'jwt', nonce, bind: BIND, givenName: 'Ink', return: '/play/inkpin' });
    expect(status).toBe(200);
    expect(body.data?.url).toBe('/auth/app/redeem?t=handoff-token');
    expect(verifyAppleIdToken).toHaveBeenCalledWith('jwt', expect.objectContaining({ nonce, givenName: 'Ink' }));
    expect(useAppleNonce).toHaveBeenCalledWith(await hashSecret(nonce), expect.any(Date));
    expect(issueHandoff).toHaveBeenCalledWith({ kind: 'apple', user }, BIND, '/play/inkpin', expect.any(Date));
  });

  it('needs the web view\'s bind', async () => {
    expect((await call({ identityToken: 'jwt', nonce })).status).toBe(400);
    expect((await call({ identityToken: 'jwt', nonce, bind: 'short' })).status).toBe(400);
    expect(verifyAppleIdToken).not.toHaveBeenCalled();
  });

  it('refuses a nonce we did not hand out, before asking Apple', async () => {
    expect((await call({ identityToken: 'jwt', nonce: 'made-up', bind: BIND })).status).toBe(400);
    expect(verifyAppleIdToken).not.toHaveBeenCalled();
  });

  it('refuses a token Apple does not vouch for, without using up the nonce', async () => {
    verifyAppleIdToken.mockResolvedValue(null);
    expect((await call({ identityToken: 'jwt', nonce, bind: BIND })).status).toBe(401);
    expect(useAppleNonce).not.toHaveBeenCalled();
    expect(issueHandoff).not.toHaveBeenCalled();
  });

  it('works only once per nonce', async () => {
    useAppleNonce.mockResolvedValue(false);
    const { status, body } = await call({ identityToken: 'jwt', nonce, bind: BIND });
    expect(status).toBe(400);
    expect(body.error).toMatch(/already used/);
    expect(issueHandoff).not.toHaveBeenCalled();
  });

  it('refuses an admin account', async () => {
    issueHandoff.mockResolvedValue(null);
    expect(await call({ identityToken: 'jwt', nonce, bind: BIND })).toEqual({ status: 403, body: { success: false, error: 'admins: use the browser' } });
  });

  it('keeps the return path on this site', async () => {
    await call({ identityToken: 'jwt', nonce, bind: BIND, return: 'https://evil.example' });
    expect(issueHandoff).toHaveBeenCalledWith(expect.anything(), BIND, '/', expect.any(Date));
  });

  it('says so when something fails', async () => {
    verifyAppleIdToken.mockRejectedValue(new Error('Apple keys request failed (500)'));
    expect((await call({ identityToken: 'jwt', nonce, bind: BIND })).status).toBe(503);
  });
});
