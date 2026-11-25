import type { APIRoute } from 'astro';
import { APPLE_NONCE_MAX_AGE_SEC, checkAppleNonce, DEFAULT_APPLE_CLIENT_ID, verifyAppleIdToken } from '../../lib/apple';
import { isBindHash, redeemPath } from '../../lib/appSignIn';
import { db } from '../../lib/db';
import { useAppleNonce } from '../../lib/db/appleNonceRepo';
import { hashSecret } from '../../lib/emailSignIn';
import { optionalEnv, requireSecret } from '../../lib/env';
import { safeReturnPath } from '../../lib/google';
import { fail, json } from '../../lib/http';
import { ADMIN_APP_REFUSED, issueHandoff } from '../../lib/signIn';

export const prerender = false;

/**
 * Sign in with Apple, from the iOS app: `{ identityToken, nonce, bind, givenName?, return? }`,
 * `bind` being the hash its web view got from /auth/app/bind,
 * answering `{ url }`, the page its web view opens to finish (lib/appSignIn.ts).
 * The app calls this itself, not a web page, so there's no Origin to check:
 * Apple's signature, our nonce (good once) and the token's audience are the proof.
 */
export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json().catch(() => null)) as { identityToken?: unknown; nonce?: unknown; bind?: unknown; givenName?: unknown; return?: unknown } | null;
  const token = body?.identityToken;
  if (typeof token !== 'string' || token.length > 5000) return fail(400, 'Sign in with Apple sent nothing to check.');
  const bind = body?.bind;
  if (!isBindHash(bind)) return fail(400, 'That sign-in has expired. Please try again.');
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
    // Once only: the token carries the nonce, so this keeps the token from signing anyone in twice.
    await db();
    const fresh = await useAppleNonce(await hashSecret(body!.nonce as string), new Date((nowSec + APPLE_NONCE_MAX_AGE_SEC) * 1000));
    if (!fresh) return fail(400, 'That sign-in was already used. Please try again.');
    const ret = safeReturnPath(typeof body?.return === 'string' ? body.return.slice(0, 500) : null);
    const handoff = await issueHandoff({ kind: 'apple', user }, bind, ret, new Date(nowSec * 1000));
    if (!handoff) return fail(403, ADMIN_APP_REFUSED);
    return json({ success: true, data: { url: redeemPath(handoff) } }, 200, { 'cache-control': 'no-store' });
  } catch (err) {
    console.error('[auth/apple] sign-in failed', err);
    return fail(503, 'Something went wrong signing you in. Please try again.');
  }
};
