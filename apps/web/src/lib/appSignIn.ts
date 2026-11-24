import type { AppleUser } from './apple';
import type { GoogleUser } from './google';

/**
 * Signing in from the iOS/Android app. Google refuses to sign anyone in
 * inside an app's web view, and Apple's sheet is native, so the proof of who
 * the player is arrives outside the web view the games run in. It is parked
 * as a one-time handoff (db/appHandoffRepo.ts); the app then opens
 * REDEEM_PATH?t=… in its web view, which signs that web view in as any
 * browser would (lib/signIn.ts). Pure rules only.
 */

/** Where the system sign-in sheet hands back to the app (its `scheme` in app.json). */
export const APP_CALLBACK = 'inkgames://auth';
export const REDEEM_PATH = '/auth/app/redeem';
/** Time for the app to open the redeem page once the sheet closes. */
export const HANDOFF_MAX_AGE_SEC = 2 * 60;

/** Who proved they're signing in, waiting for the app's web view to collect it. */
export type HandoffIdentity =
  | { readonly kind: 'google'; readonly user: GoogleUser }
  | { readonly kind: 'apple'; readonly user: AppleUser };

/** Back to the app with a handoff token, or with what went wrong (the app shows it). */
export function appCallbackUrl(result: { readonly token: string } | { readonly error: string }): string {
  const q = 'token' in result ? new URLSearchParams({ t: result.token }) : new URLSearchParams({ error: result.error });
  return `${APP_CALLBACK}?${q}`;
}

/** The page the app opens in its web view to finish signing in. */
export const redeemPath = (token: string): string => `${REDEEM_PATH}?t=${encodeURIComponent(token)}`;
