import { HANDOFF_MAX_AGE_SEC, type HandoffIdentity } from '../appSignIn';
import { AppHandoff } from './appHandoffModel';

/** Who signed in, and where they were headed. */
export interface Collected {
  readonly who: HandoffIdentity;
  readonly ret: string;
}

/** Parks a proven sign-in under `tokenHash` for HANDOFF_MAX_AGE_SEC. */
export async function createHandoff(tokenHash: string, who: HandoffIdentity, ret: string, now: Date): Promise<void> {
  const providerId = who.kind === 'google' ? who.user.googleId : who.user.appleId;
  await AppHandoff.create({
    tokenHash, kind: who.kind, providerId, email: who.user.email, name: who.user.name, ret,
    createdAt: now, expiresAt: new Date(now.getTime() + HANDOFF_MAX_AGE_SEC * 1000),
  });
}

/** Uses up the handoff: who signed in, or null when it is unknown, used or expired. */
export async function collectHandoff(tokenHash: string, now: Date): Promise<Collected | null> {
  const doc = await AppHandoff.findOneAndUpdate(
    { tokenHash, usedAt: { $exists: false }, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
    { projection: { kind: 1, providerId: 1, email: 1, name: 1, ret: 1 } },
  ).lean().exec();
  if (!doc) return null;
  const who: HandoffIdentity = doc.kind === 'google'
    ? { kind: 'google', user: { googleId: doc.providerId, email: doc.email, name: doc.name } }
    : { kind: 'apple', user: { appleId: doc.providerId, email: doc.email, name: doc.name } };
  return { who, ret: doc.ret };
}
