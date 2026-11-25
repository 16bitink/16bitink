import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appleKeys, checkAppleClaims, checkAppleNonce, KEYS_REFETCH_MIN_MS, newAppleNonce, resetAppleKeys, verifyAppleSignature, type AppleKey } from '../src/lib/apple';
import { appCallbackUrl, redeemPath } from '../src/lib/appSignIn';
import { b64url } from '../src/lib/token';

const CLIENT = 'ink.sixteenbit.games';
const NOW = 1_800_000_000;
const SECRET = 'test-secret-that-is-long-enough-for-hmac-0123456789';
const good = {
  iss: 'https://appleid.apple.com', aud: CLIENT, sub: '001234.abcdef', email: 'Fish@PrivateRelay.AppleID.com',
  email_verified: 'true', nonce: 'n-1', exp: NOW + 600, iat: NOW,
};

async function keyPair(kid: string): Promise<{ jwk: AppleKey; sign: (claims: object, header?: object) => Promise<string> }> {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'],
  );
  const pub = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as JsonWebKey;
  const enc = (o: object): string => b64url(new TextEncoder().encode(JSON.stringify(o)));
  return {
    jwk: { kid, kty: 'RSA', alg: 'RS256', n: pub.n!, e: pub.e! },
    sign: async (claims, header = { alg: 'RS256', kid }) => {
      const input = `${enc(header)}.${enc(claims)}`;
      const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(input));
      return `${input}.${b64url(new Uint8Array(sig))}`;
    },
  };
}

describe('apple claims', () => {
  it('accepts a verified Apple account for this app, lower-casing the email and keeping the first name', () => {
    expect(checkAppleClaims(good, { clientId: CLIENT, nonce: 'n-1', nowSec: NOW, givenName: ' Ink Fish ' }))
      .toEqual({ appleId: '001234.abcdef', email: 'fish@privaterelay.appleid.com', name: 'Ink' });
    expect(checkAppleClaims({ ...good, email_verified: true }, { clientId: CLIENT, nonce: 'n-1', nowSec: NOW })?.name).toBe('');
  });

  it('refuses another issuer or app, a stale or replayed token, and an unverified or missing email', () => {
    const o = { clientId: CLIENT, nonce: 'n-1', nowSec: NOW };
    for (const bad of [
      { iss: 'https://accounts.google.com' }, { aud: 'com.someone.else' }, { nonce: 'n-2' }, { exp: NOW - 1 },
      { email_verified: 'false' }, { email: undefined }, { email: 'nope' }, { sub: '' },
    ]) expect(checkAppleClaims({ ...good, ...bad }, o)).toBeNull();
  });
});

describe('apple signature', () => {
  it("trusts a token only when Apple's key with its kid signed it with RS256", async () => {
    const apple = await keyPair('apple-1');
    const other = await keyPair('apple-1');
    const token = await apple.sign(good);
    expect(await verifyAppleSignature(token, [apple.jwk])).toMatchObject({ sub: good.sub });
    // Signed by someone else with the same kid, or a key Apple doesn't list.
    expect(await verifyAppleSignature(await other.sign(good), [apple.jwk])).toBeNull();
    expect(await verifyAppleSignature(token, [{ ...apple.jwk, kid: 'apple-2' }])).toBeNull();
    // Tampered claims, a downgraded algorithm, or not a JWT at all.
    const [h, , s] = token.split('.');
    expect(await verifyAppleSignature(`${h}.${b64url(new TextEncoder().encode(JSON.stringify({ ...good, sub: 'me' })))}.${s}`, [apple.jwk])).toBeNull();
    expect(await verifyAppleSignature(await apple.sign(good, { alg: 'none', kid: 'apple-1' }), [apple.jwk])).toBeNull();
    expect(await verifyAppleSignature('not.a.jwt', [apple.jwk])).toBeNull();
  });
});

describe('apple nonce', () => {
  it('is ours and good for ten minutes', async () => {
    const nonce = await newAppleNonce(SECRET, NOW);
    expect(await checkAppleNonce(nonce, SECRET, NOW + 599)).toBe(true);
    expect(await checkAppleNonce(nonce, SECRET, NOW + 600)).toBe(false);
    expect(await checkAppleNonce(nonce, `${SECRET}-other`, NOW)).toBe(false);
    expect(await checkAppleNonce(`${nonce}x`, SECRET, NOW)).toBe(false);
    expect(await checkAppleNonce(undefined, SECRET, NOW)).toBe(false);
  });
});

describe('app handoff urls', () => {
  it('hands the app a token or an error on its own scheme, and redeems on the site', () => {
    expect(appCallbackUrl({ token: 'abc_-1' })).toBe('inkgames://auth?t=abc_-1');
    expect(appCallbackUrl({ error: 'Sign-in was cancelled. Nothing changed.' })).toBe('inkgames://auth?error=Sign-in+was+cancelled.+Nothing+changed.');
    expect(redeemPath('a/b+c')).toBe('/auth/app/redeem?t=a%2Fb%2Bc');
  });
});

describe('Apple keys', () => {
  const key = { kid: 'k1', kty: 'RSA', n: 'n', e: 'AQAB' };
  const reply = (keys: unknown[]) => new Response(JSON.stringify({ keys }), { status: 200 });
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetAppleKeys();
    vi.useFakeTimers({ toFake: ['Date'] });
    fetchMock = vi.fn(async () => reply([key]));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('asks Apple with a timeout, then serves the cache', async () => {
    expect(await appleKeys()).toEqual([key]);
    expect(await appleKeys()).toEqual([key]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0]![1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
  });

  it('refetches for an unknown key at most once a minute', async () => {
    await appleKeys();
    await appleKeys(true);
    await appleKeys(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(KEYS_REFETCH_MIN_MS);
    await appleKeys(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not cache an empty list', async () => {
    fetchMock.mockImplementationOnce(async () => reply([]));
    expect(await appleKeys()).toEqual([]);
    expect(await appleKeys()).toEqual([key]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the keys it has when Apple answers with none', async () => {
    await appleKeys();
    vi.advanceTimersByTime(KEYS_REFETCH_MIN_MS);
    fetchMock.mockImplementationOnce(async () => reply([]));
    expect(await appleKeys(true)).toEqual([key]);
  });

  it('shares one request between sign-ins at the same moment', async () => {
    await Promise.all([appleKeys(), appleKeys(), appleKeys(true)]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
