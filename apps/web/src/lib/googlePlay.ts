import { createSign } from 'node:crypto';

/**
 * The Google Play Developer API, for the Android app's in-app purchases:
 * check a purchase, acknowledge it, and list refunds. Signs in as a service
 * account (Play Console > Users and permissions, with "View financial data"
 * and "Manage orders"), whose JSON key is the PLAY_SERVICE_ACCOUNT variable.
 */

const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

export interface ServiceAccount {
  readonly client_email: string;
  readonly private_key: string;
}

/** The fields of a ProductPurchase (purchases.products.get) we read. */
export interface PlayProductPurchase {
  /** 0 purchased, 1 cancelled, 2 pending. */
  readonly purchaseState?: number;
  /** 0 not yet acknowledged, 1 acknowledged. */
  readonly acknowledgementState?: number;
  /** Set only off the standard flow: 0 test (a license tester), 1 promo code, 2 rewarded ad. */
  readonly purchaseType?: number;
  readonly orderId?: string;
  readonly purchaseTimeMillis?: string;
  /** What the app passed as obfuscatedAccountId: the buyer's 16bit.ink user id. */
  readonly obfuscatedExternalAccountId?: string;
  readonly regionCode?: string;
}

export interface VoidedPurchase {
  readonly orderId?: string;
  readonly purchaseToken?: string;
  readonly voidedTimeMillis?: string;
}

export function parseServiceAccount(json: string): ServiceAccount {
  const v = JSON.parse(json) as Partial<ServiceAccount>;
  if (typeof v.client_email !== 'string' || typeof v.private_key !== 'string') {
    throw new Error('PLAY_SERVICE_ACCOUNT is not a service account key (needs client_email and private_key)');
  }
  return { client_email: v.client_email, private_key: v.private_key };
}

const b64url = (v: string | Buffer): string => Buffer.from(v).toString('base64url');

/** A signed JWT asking Google for an access token (the JWT bearer grant). */
export function tokenAssertion(account: ServiceAccount, nowSec: number): string {
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: TOKEN_URL, iat: nowSec, exp: nowSec + 3600 }));
  const signature = createSign('RSA-SHA256').update(`${head}.${body}`).sign(account.private_key);
  return `${head}.${body}.${b64url(signature)}`;
}

export class PlayApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export interface PlayClient {
  getProductPurchase(productId: string, token: string): Promise<PlayProductPurchase>;
  acknowledge(productId: string, token: string): Promise<void>;
  /**
   * In-app purchases refunded, charged back or cancelled since `startMs`, or
   * in Google's default window, the last 30 days, without it. Google refuses a
   * start older than 30 days, so never pass exactly now minus 30 days.
   */
  voidedSince(startMs?: number): Promise<VoidedPurchase[]>;
}

export function playClient(packageName: string, account: ServiceAccount, fetchFn: typeof fetch = fetch): PlayClient {
  let cached: { token: string; expires: number } | null = null;

  async function accessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (cached && cached.expires - 60 > now) return cached.token;
    const res = await fetchFn(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: tokenAssertion(account, now) }),
    });
    const body = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
    if (!res.ok || !body?.access_token) throw new PlayApiError(res.status, 'Google refused the service account sign-in');
    cached = { token: body.access_token, expires: now + (body.expires_in ?? 3600) };
    return cached.token;
  }

  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetchFn(`${API}/${encodeURIComponent(packageName)}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${await accessToken()}`, ...(init.body ? { 'content-type': 'application/json' } : {}) },
    });
    const text = await res.text();
    if (!res.ok) throw new PlayApiError(res.status, `Google Play API ${res.status}: ${text.slice(0, 300)}`);
    return (text ? JSON.parse(text) : {}) as T;
  }

  const tokenPath = (productId: string, token: string): string =>
    `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`;

  return {
    getProductPurchase: (productId, token) => call<PlayProductPurchase>(tokenPath(productId, token)),
    acknowledge: async (productId, token) => {
      await call(`${tokenPath(productId, token)}:acknowledge`, { method: 'POST', body: '{}' });
    },
    voidedSince: async (startMs) => {
      const out: VoidedPurchase[] = [];
      let page: string | undefined;
      do {
        const q = new URLSearchParams({ type: '0', 'pageSelection.maxResults': '1000' });
        if (page) q.set('pageSelection.token', page);
        else if (startMs !== undefined) q.set('startTime', String(startMs));
        const body = await call<{ voidedPurchases?: VoidedPurchase[]; tokenPagination?: { nextPageToken?: string } }>(`/purchases/voidedpurchases?${q}`);
        out.push(...(body.voidedPurchases ?? []));
        page = body.tokenPagination?.nextPageToken || undefined;
      } while (page);
      return out;
    },
  };
}
