import type { AstroCookies } from 'astro';
import { parseAdminEmails, roleFor } from './admins';
import { db } from './db';
import type { AppleUser } from './apple';
import type { HandoffIdentity } from './appSignIn';
import { createHandoff } from './db/appHandoffRepo';
import { hashSecret } from './emailSignIn';
import { randomToken } from './google';
import { ensurePlayerId, findName, isAdminAccount, signInAppleUser, signInEmailUser, signInGoogleUser } from './db/userRepo';
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
  const admins = parseAdminEmails(optionalEnv('ADMIN_EMAILS'));
  const roleOf = (e: string) => roleFor(e, admins);
  // Apple's email may not be the account's (lib/db/userRepo.ts): the session and the role go by the account's.
  const { userId, email } = who.kind === 'apple'
    ? await signInAppleUser(who.user, roleOf, now)
    : who.kind === 'google'
      ? { userId: await signInGoogleUser(who.user, roleOf(who.user.email), now), email: who.user.email }
      : { userId: await signInEmailUser(who.email, roleOf(who.email), now), email: who.email };
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

/** What an admin hears when signing in from the app (see issueHandoff). */
export const ADMIN_APP_REFUSED = "Admin accounts can't sign in from the app yet. Sign in at 16bit.ink in your browser.";

/**
 * For the app: parks a sign-in proven outside its web view and returns the
 * one-time token its web view redeems (pages/auth/app/redeem.astro), where
 * finishSignIn then runs with the web view's own cookies. `bindHash` ties it
 * to the web view that started the sign-in (lib/appSignIn.ts).
 *
 * Null for an admin account, refused: the token reaches the app through the
 * inkgames:// scheme, which another app could claim and then start its own
 * sign-in to catch it. Until the app gets a verified HTTPS link for this,
 * only player accounts sign in from the app.
 */
export async function issueHandoff(who: HandoffIdentity, bindHash: string, ret: string, now: Date): Promise<string | null> {
  // By the email Apple or Google gave, and by the account it signs in to (whose own email may differ).
  if (roleFor(who.user.email, parseAdminEmails(optionalEnv('ADMIN_EMAILS'))) === 'admin') return null;
  await db();
  if (await isAdminAccount(who)) return null;
  const token = randomToken();
  await createHandoff(await hashSecret(token), bindHash, who, ret, now);
  return token;
}
