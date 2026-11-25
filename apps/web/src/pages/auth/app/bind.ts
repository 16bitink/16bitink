import type { APIRoute } from 'astro';
import { BIND_COOKIE, BIND_MAX_AGE_SEC, REDEEM_PATH } from '../../../lib/appSignIn';
import { hashSecret } from '../../../lib/emailSignIn';
import { randomToken } from '../../../lib/google';
import { json } from '../../../lib/http';

export const prerender = false;

/**
 * Before the app opens Google's or Apple's sheet, its web view (the sign-in
 * page) asks for a fresh BIND_COOKIE here and gets back its hash, which the
 * app carries through the sheet onto the handoff; redeeming then needs this
 * cookie (lib/appSignIn.ts). A POST, so the origin check keeps other sites
 * from asking, and the cookie is httpOnly, so no page can read the secret.
 */
export const POST: APIRoute = async ({ cookies }) => {
  const secret = randomToken();
  cookies.set(BIND_COOKIE, secret, {
    path: REDEEM_PATH, httpOnly: true, secure: import.meta.env.PROD, sameSite: 'lax', maxAge: BIND_MAX_AGE_SEC,
  });
  return json({ success: true, data: { bind: await hashSecret(secret) } }, 200, { 'cache-control': 'no-store' });
};
