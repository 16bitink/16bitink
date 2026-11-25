import { HANDOFF_MAX_AGE_SEC, type HandoffIdentity } from '../appSignIn';
import { AppHandoff } from './appHandoffModel';

/** Who signed in, and where they were headed. */
export interface Collected {
  readonly who: HandoffIdentity;
  readonly ret: string;
}

/** Parks a proven sign-in under `tokenHash` for HANDOFF_MAX_AGE_SEC, for the web view whose BIND_COOKIE hashes to `bindHash`. */
export async function createHandoff(tokenHash: string, bindHash: string, who: HandoffIdentity, ret: string, now: Date): Promise<void> {
  const providerId = who.kind === 'google' ? who.user.googleId : who.user.appleId;
  await AppHandoff.create({
    tokenHash, bindHash, kind: who.kind, providerId, email: who.user.email, name: who.user.name, ret,
    createdAt: now, expiresAt: new Date(now.getTime() + HANDOFF_MAX_AGE_SEC * 1000),
  });
}

/**
 * Uses up the handoff: who signed in, or null when it is unknown, used,
 * expired or not this web view's (`bindHash` differs). A wrong web view
 * leaves it unused, so a link sent to someone else can't spoil the real one.
 */
export async function collectHandoff(tokenHash: string, bindHash: string, now: Date): Promise<Collected | null> {
  const doc = await AppHandoff.findOneAndUpdate(
    { tokenHash, bindHash, usedAt: { $exists: false }, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
    { projection: { kind: 1, providerId: 1, email: 1, name: 1, ret: 1 } },
  ).lean().exec();
  if (!doc) return null;
  const who: HandoffIdentity = doc.kind === 'google'
    ? { kind: 'google', user: { googleId: doc.providerId, email: doc.email, name: doc.name } }
    : { kind: 'apple', user: { appleId: doc.providerId, email: doc.email, name: doc.name } };
  return { who, ret: doc.ret };
}
