import { readToken, signToken, fromB64url } from './token';

/**
 * Sign in with Apple, from the iOS app: the app shows Apple's own sheet and
 * sends us the identity token Apple gave it. Unlike Google's (which we take
 * straight from Google's token endpoint), this one passes through the app,
 * so its RS256 signature is checked against Apple's published keys.
 */

export const APPLE_ISSUER = 'https://appleid.apple.com';
export const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
/** The iOS app's bundle id: Apple's tokens name it as their audience. */
export const DEFAULT_APPLE_CLIENT_ID = 'ink.sixteenbit.games';
/** How long a nonce we hand the app stays good: time to show Apple's sheet and sign in. */
export const APPLE_NONCE_MAX_AGE_SEC = 10 * 60;
const NONCE_PURPOSE = 'apple-nonce';

export interface AppleUser {
  /** Apple's stable account id for this app (the token's `sub`). */
  readonly appleId: string;
  /** Verified, lower-cased; may be a private relay address the player chose to hide behind. */
  readonly email: string;
  /** First name: Apple says it only the first time, through the app, so it may be empty. */
  readonly name: string;
}

/** One key from Apple's JWKS. */
export interface AppleKey {
  readonly kid: string;
  readonly kty: string;
  readonly alg?: string;
  readonly n: string;
  readonly e: string;
}

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/**
 * A signed, expiring nonce for the app to pass to Apple. Apple puts it in the
 * token, so a token is good only while its nonce is, and only once:
 * /auth/apple uses the nonce up (db/appleNonceRepo.ts).
 */
export async function newAppleNonce(secret: string, nowSec: number): Promise<string> {
  const n = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
  return signToken({ v: 1, n, exp: nowSec + APPLE_NONCE_MAX_AGE_SEC }, secret, NONCE_PURPOSE);
}

/** Whether `nonce` is one we handed out, still good. */
export async function checkAppleNonce(nonce: unknown, secret: string, nowSec: number): Promise<boolean> {
  if (typeof nonce !== 'string' || nonce.length > 400) return false;
  const p = (await readToken(nonce, secret, NONCE_PURPOSE)) as { v?: unknown; exp?: unknown } | null;
  return p?.v === 1 && typeof p.exp === 'number' && p.exp > nowSec;
}

interface Jwt {
  readonly header: Record<string, unknown>;
  readonly claims: Record<string, unknown>;
  readonly signed: Uint8Array<ArrayBuffer>;
  readonly signature: Uint8Array<ArrayBuffer>;
}

function splitJwt(jwt: string): Jwt | null {
  const parts = jwt.split('.');
  if (parts.length !== 3 || parts.some((p) => !p)) return null;
  try {
    const json = (s: string): Record<string, unknown> | null => {
      const v = JSON.parse(new TextDecoder().decode(fromB64url(s))) as unknown;
      return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;
    };
    const header = json(parts[0]!);
    const claims = json(parts[1]!);
    if (!header || !claims) return null;
    return { header, claims, signed: new TextEncoder().encode(`${parts[0]}.${parts[1]}`), signature: fromB64url(parts[2]!) };
  } catch {
    return null;
  }
}

/** The token's claims when Apple's key `kid` signed it (RS256), else null. */
export async function verifyAppleSignature(jwt: string, keys: readonly AppleKey[]): Promise<Record<string, unknown> | null> {
  const t = splitJwt(jwt);
  if (!t || t.header.alg !== 'RS256' || typeof t.header.kid !== 'string') return null;
  const jwk = keys.find((k) => k.kid === t.header.kid && k.kty === 'RSA');
  if (!jwk) return null;
  try {
    const key = await crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, t.signature, t.signed);
    return ok ? t.claims : null;
  } catch {
    return null;
  }
}

interface CheckOptions {
  readonly clientId: string;
  /** The nonce the app says it asked with: must be the one in the token. */
  readonly nonce: string;
  readonly nowSec: number;
  /** The first name the app got from Apple's sheet, if any (Apple tells it only once). */
  readonly givenName?: string;
}

/** The Apple account, when the (signature-checked) claims hold up. */
export function checkAppleClaims(c: Record<string, unknown>, o: CheckOptions): AppleUser | null {
  const verified = c.email_verified === true || c.email_verified === 'true';
  const valid =
    c.iss === APPLE_ISSUER &&
    c.aud === o.clientId &&
    c.nonce === o.nonce &&
    typeof c.exp === 'number' && c.exp > o.nowSec &&
    typeof c.sub === 'string' && c.sub.length > 0 &&
    typeof c.email === 'string' && c.email.includes('@') &&
    verified;
  if (!valid) return null;
  const email = (c.email as string).toLowerCase();
  const name = text(o.givenName).split(/\s+/)[0]?.slice(0, 60) ?? '';
  return { appleId: c.sub as string, email, name };
}

let cachedKeys: { keys: readonly AppleKey[]; at: number } | null = null;
/** When we last asked Apple, cache or not: a token naming an unknown key refetches at most this often. */
let lastFetchAt = 0;
let inFlight: Promise<readonly AppleKey[]> | null = null;
const KEYS_TTL_MS = 60 * 60 * 1000;
export const KEYS_REFETCH_MIN_MS = 60 * 1000;
const KEYS_TIMEOUT_MS = 5000;

async function fetchAppleKeys(): Promise<readonly AppleKey[]> {
  lastFetchAt = Date.now();
  // A hung request must not stall the sign-in.
  const res = await fetch(APPLE_KEYS_URL, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(KEYS_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Apple keys request failed (${res.status})`);
  const body = (await res.json()) as { keys?: unknown };
  const keys = Array.isArray(body.keys)
    ? (body.keys as unknown[]).filter((k): k is AppleKey => {
      const o = k as Record<string, unknown>;
      return typeof o?.kid === 'string' && typeof o.n === 'string' && typeof o.e === 'string' && typeof o.kty === 'string';
    })
    : [];
  // An empty list is a bad answer, not Apple's keys: keep what we had, and ask again next time.
  if (keys.length) cachedKeys = { keys, at: Date.now() };
  return keys.length ? keys : cachedKeys?.keys ?? [];
}

/**
 * Apple's signing keys, cached for an hour. `fresh` (a token named a key we
 * don't have: Apple may have rotated them) refetches, but at most once a
 * minute, so made-up key ids can't send every sign-in to Apple. Sign-ins at
 * the same moment share one request.
 */
export async function appleKeys(fresh = false): Promise<readonly AppleKey[]> {
  const now = Date.now();
  const cacheGood = cachedKeys !== null && now - cachedKeys.at < KEYS_TTL_MS;
  const mayRefetch = now - lastFetchAt >= KEYS_REFETCH_MIN_MS;
  if (cachedKeys && (fresh ? !mayRefetch : cacheGood)) return cachedKeys.keys;
  inFlight ??= fetchAppleKeys().finally(() => { inFlight = null; });
  return inFlight;
}

/** For tests: forgets the cached keys and when they were fetched. */
export function resetAppleKeys(): void {
  cachedKeys = null;
  lastFetchAt = 0;
  inFlight = null;
}

/** Checks an identity token end to end: Apple's signature (refetching keys once if it names one we don't have), then its claims. */
export async function verifyAppleIdToken(jwt: string, o: CheckOptions): Promise<AppleUser | null> {
  const kid = splitJwt(jwt)?.header.kid;
  if (typeof kid !== 'string') return null;
  let keys = await appleKeys();
  if (!keys.some((k) => k.kid === kid)) keys = await appleKeys(true);
  const claims = await verifyAppleSignature(jwt, keys);
  return claims ? checkAppleClaims(claims, o) : null;
}
