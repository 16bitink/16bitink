import type { APIRoute } from 'astro';
import { newAppleNonce } from '../../../lib/apple';
import { requireSecret } from '../../../lib/env';
import { fail, json } from '../../../lib/http';

export const prerender = false;

/** A fresh nonce for the app to give Apple's sheet; /auth/apple then checks the token carries it. */
export const GET: APIRoute = async () => {
  try {
    const nonce = await newAppleNonce(requireSecret('ENTITLEMENT_SECRET'), Math.floor(Date.now() / 1000));
    return json({ success: true, data: { nonce } }, 200, { 'cache-control': 'no-store' });
  } catch (err) {
    console.error('[auth/apple/nonce] failed', err);
    return fail(503, 'Sign in with Apple is unavailable right now.');
  }
};
