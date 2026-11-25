import type { AppleUser } from './apple';
import type { GoogleUser } from './google';

/**
 * Signing in from the iOS/Android app. Google refuses to sign anyone in
 * inside an app's web view, and Apple's sheet is native, so the proof of who
 * the player is arrives outside the web view the games run in. It is parked
 * as a one-time handoff (db/appHandoffRepo.ts); the app then opens
 * REDEEM_PATH?t=… in its web view, which signs that web view in as any
 * browser would (lib/signIn.ts). Pure rules only.
 *
 * A token alone would be a login CSRF: anyone could get one for their own
 * account and send the link to someone else, whose browser would then sign
 * in as them (and hand their account this browser's purchases). So before
 * either sheet opens, the web view gets a random BIND_COOKIE of its own
 * (pages/auth/app/bind.ts); its hash travels through Google's or Apple's
 * flow onto the handoff, and redeeming needs the matching cookie.
 */

/** Where the system sign-in sheet hands back to the app (its `scheme` in app.json). */
export const APP_CALLBACK = 'inkgames://auth';
export const REDEEM_PATH = '/auth/app/redeem';
/** Time for the app to open the redeem page once the sheet closes. */
export const HANDOFF_MAX_AGE_SEC = 2 * 60;

/** For pages with a bearer credential in the address (a code, a token): keep it out of Referer and caches. */
export const NO_LEAK = { 'referrer-policy': 'no-referrer', 'cache-control': 'no-store' } as const;

/** The web view's own secret for one sign-in: only the web view that started it can redeem it. */
export const BIND_COOKIE = 'ink_app_bind';
export const BIND_PATH = '/auth/app/bind';
/** Time for the whole sign-in: the sheet (as long as Google's flow, FLOW_MAX_AGE) and then the redeem. */
export const BIND_MAX_AGE_SEC = 12 * 60;

/** Whether `v` can be a BIND_COOKIE's hash (SHA-256, hex), as it arrives from the app. */
export const isBindHash = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);

/** Who proved they're signing in, waiting for the app's web view to collect it. */
export type HandoffIdentity =
  | { readonly kind: 'google'; readonly user: GoogleUser }
  | { readonly kind: 'apple'; readonly user: AppleUser };

/**
 * Google's `state` for a sign-in started from the app. The callback must go
 * back to the app whatever happens, even when the flow cookie is gone
 * (expired, or never set): left on a web page inside the sheet, the player's
 * "Try again" would sign in the sheet's cookie jar, not the web view's. The
 * marker only decides where errors go; the state check still needs the cookie.
 */
const APP_STATE_PREFIX = 'app.';
export const appState = (random: string): string => `${APP_STATE_PREFIX}${random}`;
export const isAppState = (state: string | null): boolean => state?.startsWith(APP_STATE_PREFIX) === true;

/** Where a failed app sign-in goes: back to the app, which shows `error`, with no-store. */
export const appErrorResponse = (error: string): Response =>
  new Response(null, { status: 303, headers: { location: appCallbackUrl({ error }), ...NO_LEAK } });

/** Back to the app with a handoff token, or with what went wrong (the app shows it). */
export function appCallbackUrl(result: { readonly token: string } | { readonly error: string }): string {
  const q = 'token' in result ? new URLSearchParams({ t: result.token }) : new URLSearchParams({ error: result.error });
  return `${APP_CALLBACK}?${q}`;
}

/** The page the app opens in its web view to finish signing in. */
export const redeemPath = (token: string): string => `${REDEEM_PATH}?t=${encodeURIComponent(token)}`;
