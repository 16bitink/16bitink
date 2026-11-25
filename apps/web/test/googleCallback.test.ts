import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appState } from '../src/lib/appSignIn';
import { FLOW_COOKIE, signFlow, type SignInFlow } from '../src/lib/session';
import { b64url } from '../src/lib/token';
import { fakeCookies } from './authCookies';

const SECRET = 'test-secret-that-is-long-enough-for-hmac-0123456789';
const CLIENT = 'client-id.apps.googleusercontent.com';
const issueHandoff = vi.fn();
const finishSignIn = vi.fn();
let secretOk = true;

vi.mock('../src/lib/env', () => ({
  requireSecret: () => { if (!secretOk) throw new Error('no secret'); return SECRET; },
  requireEnv: (name: string) => (name === 'GOOGLE_CLIENT_ID' ? CLIENT : 'client-secret'),
  optionalEnv: () => undefined,
}));
vi.mock('../src/lib/signIn', () => ({
  ADMIN_APP_REFUSED: 'admins: use the browser',
  issueHandoff: (...a: unknown[]) => issueHandoff(...a),
  finishSignIn: (...a: unknown[]) => finishSignIn(...a),
}));

const { googleCallback } = await import('../src/lib/googleCallback');

const NOW = 1_800_000_000;
const BIND = 'b'.repeat(64);
const webFlow: SignInFlow = { v: 1, state: 'web-state', nonce: 'n-1', verifier: 'v-1', ret: '/play/inkpin', exp: NOW + 600 };
const appFlow: SignInFlow = { ...webFlow, state: appState('random'), app: true, bind: BIND };

const idToken = (claims: Record<string, unknown>) =>
  `${b64url(new TextEncoder().encode('{"alg":"RS256"}'))}.${b64url(new TextEncoder().encode(JSON.stringify(claims)))}.sig`;
const goodClaims = {
  iss: 'https://accounts.google.com', aud: CLIENT, nonce: 'n-1', exp: NOW + 300,
  email_verified: true, sub: 'g-1', email: 'Crab@Example.com', given_name: 'Crab',
};
const user = { googleId: 'g-1', email: 'crab@example.com', name: 'Crab' };

async function call(flow: SignInFlow | null, query: Record<string, string>) {
  const { cookies } = fakeCookies(flow ? { [FLOW_COOKIE]: await signFlow(flow, SECRET) } : {});
  const url = new URL(`https://16bit.ink/auth/google/callback?${new URLSearchParams(query)}`);
  return { result: await googleCallback(cookies, url, NOW), cookies, url };
}
const location = (r: unknown) => new URL((r as Response).headers.get('location')!);

describe('Google callback', () => {
  beforeEach(() => {
    secretOk = true;
    issueHandoff.mockReset().mockResolvedValue('handoff-token');
    finishSignIn.mockReset().mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id_token: idToken(goodClaims) }), { status: 200 })));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('signs a browser in and goes back where it was headed', async () => {
    const { result, cookies, url } = await call(webFlow, { state: 'web-state', code: 'c' });
    expect(finishSignIn).toHaveBeenCalledWith(cookies, url, { kind: 'google', user }, new Date(NOW * 1000));
    expect((result as Response).headers.get('location')).toBe('/play/inkpin');
    expect((result as Response).headers.get('cache-control')).toBe('no-store');
    expect(issueHandoff).not.toHaveBeenCalled();
  });

  it('from the app, parks the sign-in for the web view that started it and hands the token to the app', async () => {
    const { result } = await call(appFlow, { state: appFlow.state, code: 'c' });
    expect(issueHandoff).toHaveBeenCalledWith({ kind: 'google', user }, BIND, '/play/inkpin', new Date(NOW * 1000));
    expect(finishSignIn).not.toHaveBeenCalled();
    const to = location(result);
    expect(`${to.protocol}//${to.host}`).toBe('inkgames://auth');
    expect(to.searchParams.get('t')).toBe('handoff-token');
  });

  it('from the app, refuses an admin account, back in the app', async () => {
    issueHandoff.mockResolvedValue(null);
    const { result } = await call(appFlow, { state: appFlow.state, code: 'c' });
    expect(location(result).searchParams.get('error')).toBe('admins: use the browser');
  });

  it('from the app, goes back to the app when the flow cookie is gone (the state says it was the app)', async () => {
    const { result } = await call(null, { state: appState('random'), code: 'c' });
    expect(location(result).protocol).toBe('inkgames:');
    expect(location(result).searchParams.get('error')).toMatch(/expired/);
  });

  it('from the app, goes back to the app when the flow cannot be read at all', async () => {
    secretOk = false;
    const { result } = await call(appFlow, { state: appFlow.state, code: 'c' });
    expect(location(result).searchParams.get('error')).toMatch(/expired/);
  });

  it('from the app, goes back to the app when the player cancels or Google fails', async () => {
    expect(location((await call(appFlow, { state: appFlow.state, error: 'access_denied' })).result).searchParams.get('error')).toMatch(/cancelled/);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
    expect(location((await call(appFlow, { state: appFlow.state, code: 'c' })).result).searchParams.get('error')).toMatch(/went wrong/);
  });

  it('from the app, refuses a flow that names no web view', async () => {
    const { bind: _, ...noBind } = appFlow;
    const { result } = await call(noBind, { state: appFlow.state, code: 'c' });
    expect(location(result).searchParams.get('error')).toMatch(/expired/);
    expect(issueHandoff).not.toHaveBeenCalled();
  });

  it('in a browser, shows a page for a stale or forged callback', async () => {
    expect((await call(null, { state: 'web-state', code: 'c' })).result).toEqual({ error: expect.stringMatching(/expired/), ret: '/' });
    expect((await call(webFlow, { state: 'other', code: 'c' })).result).toEqual({ error: expect.stringMatching(/expired/), ret: '/' });
    expect(finishSignIn).not.toHaveBeenCalled();
  });

  it('rejects a token for another client or nonce', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id_token: idToken({ ...goodClaims, nonce: 'other' }) }), { status: 200 })));
    expect((await call(webFlow, { state: 'web-state', code: 'c' })).result).toEqual({ error: expect.stringMatching(/verified email/), ret: '/play/inkpin' });
  });
});
