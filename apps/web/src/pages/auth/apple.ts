import type { APIRoute } from 'astro';
import { checkAppleNonce, DEFAULT_APPLE_CLIENT_ID, verifyAppleIdToken } from '../../lib/apple';
import { redeemPath } from '../../lib/appSignIn';
import { optionalEnv, requireSecret } from '../../lib/env';
import { safeReturnPath } from '../../lib/google';
import { fail, json } from '../../lib/http';
import { issueHandoff } from '../../lib/signIn';

export const prerender = false;

/**
 * Sign in with Apple, from the iOS app: `{ identityToken, nonce, givenName?, return? }`,
 * answering `{ url }`, the page its web view opens to finish (lib/appSignIn.ts).
 * The app calls this itself, not a web page, so there's no Origin to check:
 * Apple's signature, our nonce and the token's audience are the proof.
 */
export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json().catch(() => null)) as { identityToken?: unknown; nonce?: unknown; givenName?: unknown; return?: unknown } | null;
  const token = body?.identityToken;
  if (typeof token !== 'string' || token.length > 5000) return fail(400, 'Sign in with Apple sent nothing to check.');
  const nowSec = Math.floor(Date.now() / 1000);
  try {
    const secret = requireSecret('ENTITLEMENT_SECRET');
    if (!(await checkAppleNonce(body?.nonce, secret, nowSec))) return fail(400, 'That sign-in took too long. Please try again.');
    const user = await verifyAppleIdToken(token, {
      clientId: optionalEnv('APPLE_CLIENT_ID') ?? DEFAULT_APPLE_CLIENT_ID,
      nonce: body!.nonce as string,
      nowSec,
      givenName: typeof body?.givenName === 'string' ? body.givenName : undefined,
    });
    if (!user) return fail(401, 'Apple could not confirm a verified email for that account.');
    const ret = safeReturnPath(typeof body?.return === 'string' ? body.return.slice(0, 500) : null);
    const handoff = await issueHandoff({ kind: 'apple', user }, ret, new Date(nowSec * 1000));
    return json({ success: true, data: { url: redeemPath(handoff) } }, 200, { 'cache-control': 'no-store' });
  } catch (err) {
    console.error('[auth/apple] sign-in failed', err);
    return fail(503, 'Something went wrong signing you in. Please try again.');
  }
};
