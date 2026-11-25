import type { AstroCookies } from 'astro';
import { appCallbackUrl, isAppState, isBindHash, NO_LEAK } from './appSignIn';
import { requireEnv, requireSecret } from './env';
import { CALLBACK_PATH, GOOGLE_TOKEN_URL, checkIdToken, decodeJwtPayload } from './google';
import { FLOW_COOKIE, verifyFlow, type SignInFlow } from './session';
import { ADMIN_APP_REFUSED, finishSignIn, issueHandoff } from './signIn';

const FAILED = 'Something went wrong signing you in. Please try again.';

/** Why the sign-in failed (shown on the page), and where "Try again" returns to. */
export interface CallbackError {
  readonly error: string;
  readonly ret: string;
}

/**
 * Google sends the player back here (pages/auth/google/callback.astro): checks
 * the callback is the one we started, swaps the code for Google's ID token,
 * and signs this browser in. Started from the app, it instead parks the
 * sign-in for the app's web view and hands back to the app, failures too,
 * since the player is in the app's sign-in sheet (lib/appSignIn.ts). Returns
 * the response to send, or the error to show on the page.
 */
export async function googleCallback(cookies: AstroCookies, url: URL, nowSec: number): Promise<Response | CallbackError> {
  const params = url.searchParams;
  // Unreadable (or no secret configured): as good as expired, and the app still hears about it below.
  let flow: SignInFlow | null = null;
  try {
    flow = await verifyFlow(cookies.get(FLOW_COOKIE)?.value, requireSecret('ENTITLEMENT_SECRET'), nowSec);
  } catch (err) {
    console.error('[auth/google/callback] could not read the flow', err);
  }
  cookies.delete(FLOW_COOKIE, { path: '/auth/google' });

  // The state says so too, for when the flow cookie is gone.
  const app = flow?.app === true || isAppState(params.get('state'));
  let error: string | null = null;
  let ret = '/';
  let handoff: string | null = null;

  if (params.get('error')) {
    error = 'Sign-in was cancelled. Nothing changed.';
  } else if (!flow || params.get('state') !== flow.state || !params.get('code') || (app && !isBindHash(flow.bind))) {
    // A stale tab, a second click, or a forged callback (or, from the app, one that names no web view).
    error = 'That sign-in link has expired. Please try again.';
  } else {
    ret = flow.ret;
    try {
      const clientId = requireEnv('GOOGLE_CLIENT_ID');
      const res = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: params.get('code')!,
          client_id: clientId,
          client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
          redirect_uri: `${url.origin}${CALLBACK_PATH}`,
          grant_type: 'authorization_code',
          code_verifier: flow.verifier,
        }),
      });
      const body = (await res.json().catch(() => null)) as { id_token?: unknown } | null;
      if (!res.ok || typeof body?.id_token !== 'string') throw new Error(`Google token exchange failed (${res.status})`);
      const user = checkIdToken(decodeJwtPayload(body.id_token), { clientId, nonce: flow.nonce, nowSec });
      const now = new Date(nowSec * 1000);
      if (!user) {
        error = 'Google could not confirm a verified email for that account.';
      } else if (app) {
        handoff = await issueHandoff({ kind: 'google', user }, flow.bind!, ret, now);
        if (!handoff) error = ADMIN_APP_REFUSED;
      } else {
        await finishSignIn(cookies, url, { kind: 'google', user }, now);
      }
    } catch (err) {
      console.error('[auth/google/callback] sign-in failed', err);
      error = FAILED;
    }
  }
  if (app) {
    const to = handoff ? appCallbackUrl({ token: handoff }) : appCallbackUrl({ error: error ?? FAILED });
    return new Response(null, { status: 303, headers: { location: to, ...NO_LEAK } });
  }
  if (!error) return new Response(null, { status: 303, headers: { location: ret, ...NO_LEAK } });
  return { error, ret };
}
