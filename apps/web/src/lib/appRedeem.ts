import type { AstroCookies } from 'astro';
import { BIND_COOKIE, NO_LEAK, REDEEM_PATH } from './appSignIn';
import { db } from './db';
import { collectHandoff } from './db/appHandoffRepo';
import { hashSecret } from './emailSignIn';
import { finishSignIn } from './signIn';

const EXPIRED = 'That sign-in has expired. Please try again.';

/** Why the sign-in failed (shown on the page), and where "Try again" returns to. */
export interface RedeemError {
  readonly error: string;
  readonly ret: string;
}

/**
 * The app's web view lands on REDEEM_PATH once Google's or Apple's sheet has
 * proven who the player is (lib/appSignIn.ts): the one-time token in `t`
 * signs this web view in, with its own cookies, so its saves and purchases
 * move into the account as in any browser. Only the web view that started
 * the sign-in can: the handoff names its BIND_COOKIE, so a link sent to
 * anyone else finds nothing (and stays usable for the real web view).
 * Returns the redirect onward, or the error to show on the page.
 */
export async function redeemHandoff(cookies: AstroCookies, url: URL, now: Date): Promise<Response | RedeemError> {
  const token = url.searchParams.get('t');
  const bind = cookies.get(BIND_COOKIE)?.value;
  if (!token || token.length > 100 || !bind || bind.length > 100) return { error: EXPIRED, ret: '/' };
  try {
    await db();
    const got = await collectHandoff(await hashSecret(token), await hashSecret(bind), now);
    if (!got) return { error: EXPIRED, ret: '/' };
    await finishSignIn(cookies, url, got.who, now);
    cookies.delete(BIND_COOKIE, { path: REDEEM_PATH });
    // A Response of our own, so NO_LEAK holds on the redirect too (the page's cookies are still added).
    return new Response(null, { status: 303, headers: { location: got.ret, ...NO_LEAK } });
  } catch (err) {
    console.error('[auth/app/redeem] sign-in failed', err);
    return { error: 'Something went wrong signing you in. Please try again.', ret: '/' };
  }
}
