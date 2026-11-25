import type { AstroCookies } from 'astro';
import { parseAdminEmails, roleFor } from './admins';
import { db } from './db';
import type { AppleUser } from './apple';
import type { HandoffIdentity } from './appSignIn';
import { createHandoff } from './db/appHandoffRepo';
import { hashSecret } from './emailSignIn';
import { randomToken } from './google';
import { ensurePlayerId, findName, signInAppleUser, signInEmailUser, signInGoogleUser } from './db/userRepo';
import { optionalEnv, requireSecret } from './env';
import type { GoogleUser } from './google';
import { accountGames, claimBrowserPurchases } from './owner';
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from './session';

/** Who proved they're signing in: a Google or Apple account, or someone who opened the email we sent an address. */
export type Identity =
  | { readonly kind: 'google'; readonly user: GoogleUser }
  | { readonly kind: 'apple'; readonly user: AppleUser }
  | { readonly kind: 'email'; readonly email: string };

/**
 * The last step of every sign-in: finds or makes the account, hands it the
 * purchases this browser holds, and sets the session cookie. Throws when the
 * database can't be reached; callers say so to the player.
 */
export async function finishSignIn(cookies: AstroCookies, url: URL, who: Identity, now: Date): Promise<void> {
  const secret = requireSecret('ENTITLEMENT_SECRET');
  await db();
  const email = who.kind === 'email' ? who.email : who.user.email;
  const role = roleFor(email, parseAdminEmails(optionalEnv('ADMIN_EMAILS')));
  const userId = who.kind === 'google'
    ? await signInGoogleUser(who.user, role, now)
    : who.kind === 'apple' ? await signInAppleUser(who.user, role, now) : await signInEmailUser(email, role, now);
  const [, , name] = await Promise.all([
    ensurePlayerId(userId),
    claimBrowserPurchases(cookies, userId),
    // Apple says the name only the first time: after that it's the account's.
    who.kind === 'google' ? who.user.name : findName(userId),
  ]);
  // After the claim, so games bought on this browser are in the list.
  const games = await accountGames(email, userId, url);
  const iat = Math.floor(now.getTime() / 1000);
  const token = await signSession({ v: 2, userId, email, name: name ?? '', games, iat, exp: iat + SESSION_MAX_AGE }, secret);
  cookies.set(SESSION_COOKIE, token, {
    path: '/', httpOnly: true, secure: import.meta.env.PROD, sameSite: 'lax', maxAge: SESSION_MAX_AGE,
  });
}

/**
 * For the app: parks a sign-in proven outside its web view and returns the
 * one-time token its web view redeems (pages/auth/app/redeem.astro), where
 * finishSignIn then runs with the web view's own cookies. `bindHash` ties it
 * to the web view that started the sign-in (lib/appSignIn.ts).
 */
export async function issueHandoff(who: HandoffIdentity, bindHash: string, ret: string, now: Date): Promise<string> {
  await db();
  const token = randomToken();
  await createHandoff(await hashSecret(token), bindHash, who, ret, now);
  return token;
}
