import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isAppState } from '../src/lib/appSignIn';
import { FLOW_COOKIE, verifyFlow } from '../src/lib/session';
import { fakeCookies } from './authCookies';

const SECRET = 'test-secret-that-is-long-enough-for-hmac-0123456789';
let configured = true;

vi.mock('../src/lib/env', () => ({
  requireSecret: () => SECRET,
  requireEnv: () => { if (!configured) throw new Error('GOOGLE_CLIENT_ID is not set'); return 'client-id'; },
}));

const { GET } = await import('../src/pages/auth/google');

const BIND = 'b'.repeat(64);

async function call(query: string) {
  const url = new URL(`https://16bit.ink/auth/google?${query}`);
  const { cookies, jar } = fakeCookies();
  const redirect = (to: string, status: number) => new Response(null, { status, headers: { location: to } });
  const res = (await GET({ url, cookies, redirect } as never)) as Response;
  const flow = await verifyFlow(jar.get(FLOW_COOKIE), SECRET, Math.floor(Date.now() / 1000));
  return { res, location: res.headers.get('location') ?? '', flow };
}

describe('GET /auth/google', () => {
  beforeEach(() => {
    configured = true;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('from the app, remembers the web view and marks the state as the app\'s', async () => {
    const { location, flow } = await call(`return=%2Fplay%2Finkpin&app=1&bind=${BIND}`);
    expect(location).toMatch(/^https:\/\/accounts\.google\.com\//);
    expect(flow).toMatchObject({ app: true, bind: BIND, ret: '/play/inkpin' });
    expect(isAppState(flow!.state)).toBe(true);
    expect(new URL(location).searchParams.get('state')).toBe(flow!.state);
  });

  it('in a browser, leaves the state unmarked', async () => {
    const { flow } = await call('return=%2F');
    expect(flow?.app).toBeUndefined();
    expect(isAppState(flow!.state)).toBe(false);
  });

  it('from the app without a bind, goes back to the app with an error', async () => {
    const { res, location, flow } = await call('app=1');
    expect(res.status).toBe(303);
    expect(location).toMatch(/^inkgames:\/\/auth\?error=/);
    expect(flow).toBeNull();
  });

  it('when sign-in is unavailable, goes back to the app from the app, and shows a 503 in a browser', async () => {
    configured = false;
    expect((await call(`app=1&bind=${BIND}`)).location).toMatch(/^inkgames:\/\/auth\?error=/);
    expect((await call('')).res.status).toBe(503);
  });
});
