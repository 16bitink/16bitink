import type { Role } from '../admins';
import type { AppleUser } from '../apple';
import type { HandoffIdentity } from '../appSignIn';
import { nameFromEmail } from '../emailSignIn';
import type { GoogleUser } from '../google';
import { generatePlayerId, normalizePlayerId } from '../playerId';
import type { UserId } from '../userId';
import { revokeUserTokens } from './oauthRepo';
import { User } from './userModel';

const DUPLICATE_KEY = 11000;

const isDuplicateKey = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: unknown }).code === DUPLICATE_KEY;

const ID_ONLY = { _id: 1 } as const;
const OLDEST_FIRST = { createdAt: 1 } as const;

async function upsertGoogleUser(g: GoogleUser, role: Role, now: Date): Promise<UserId> {
  const set = { email: g.email, name: g.name, lastSignInAt: now, role };
  const own = await User.findOneAndUpdate({ googleId: g.googleId }, { $set: set }, { projection: ID_ONLY }).lean().exec();
  if (own) return own._id.toHexString();
  // An account made by signing in with this email, not yet tied to a Google account, becomes this one:
  // Google has verified the address, so it is the same person.
  const joined = await User.findOneAndUpdate(
    { email: g.email, googleId: { $exists: false } },
    { $set: { ...set, googleId: g.googleId } },
    { sort: OLDEST_FIRST, projection: ID_ONLY },
  ).lean().exec();
  if (joined) return joined._id.toHexString();
  const user = await User.findOneAndUpdate(
    { googleId: g.googleId },
    { $set: set, $setOnInsert: { googleId: g.googleId } },
    { upsert: true, returnDocument: 'after', projection: ID_ONLY },
  ).lean().exec();
  if (!user) throw new Error('User upsert returned nothing');
  return user._id.toHexString();
}

/** The user for this Google account (or the email account it joins), created on first sign-in, with `role` as of now. */
export async function signInGoogleUser(g: GoogleUser, role: Role, now: Date): Promise<UserId> {
  try {
    return await upsertGoogleUser(g, role, now);
  } catch (err) {
    // Two first sign-ins at once: one created the user, so the retry finds it.
    if (!isDuplicateKey(err)) throw err;
    return upsertGoogleUser(g, role, now);
  }
}

/** Who an Apple sign-in turned out to be: the account, and the email it goes by (its own, not Apple's of today). */
export interface AppleSignIn {
  readonly userId: UserId;
  readonly email: string;
}

/**
 * Apple can hand back a different email later (say, a private relay address
 * the player switched to), so an account keeps the email and name it has:
 * Apple's are used only to create one. Overwriting would cut the account off
 * from its real address: an email sign-in with it would then make a second,
 * empty account, and the role (worked out from the email) could change.
 */
async function upsertAppleUser(a: AppleUser, roleOf: (email: string) => Role, now: Date): Promise<AppleSignIn> {
  const own = await User.findOne({ appleId: a.appleId }, { email: 1 }).lean().exec();
  if (own) {
    await User.updateOne({ _id: own._id }, { $set: { lastSignInAt: now, role: roleOf(own.email) } });
    return { userId: own._id.toHexString(), email: own.email };
  }
  const set = { lastSignInAt: now, role: roleOf(a.email) };
  // As with Google: an account with this (Apple-verified) email and no Apple account yet is the same person's.
  const joined = await User.findOneAndUpdate(
    { email: a.email, appleId: { $exists: false } },
    { $set: { ...set, appleId: a.appleId } },
    { sort: OLDEST_FIRST, projection: ID_ONLY },
  ).lean().exec();
  if (joined) return { userId: joined._id.toHexString(), email: a.email };
  const user = await User.findOneAndUpdate(
    { appleId: a.appleId },
    { $set: set, $setOnInsert: { appleId: a.appleId, email: a.email, name: a.name || nameFromEmail(a.email) } },
    { upsert: true, returnDocument: 'after', projection: { email: 1 } },
  ).lean().exec();
  if (!user) throw new Error('User upsert returned nothing');
  return { userId: user._id.toHexString(), email: user.email };
}

/**
 * The user for this Apple account (or the account with its email it joins),
 * created on first sign-in, with its role as of now: `roleOf` the account's
 * own email, which may not be the one Apple sent this time.
 */
export async function signInAppleUser(a: AppleUser, roleOf: (email: string) => Role, now: Date): Promise<AppleSignIn> {
  try {
    return await upsertAppleUser(a, roleOf, now);
  } catch (err) {
    // Two first sign-ins at once: one created the user, so the retry finds it.
    if (!isDuplicateKey(err)) throw err;
    return upsertAppleUser(a, roleOf, now);
  }
}

/**
 * The user with this (proven) email, Google account or not, created on first
 * sign-in, with `role` as of now. Emails aren't unique in the database, so two
 * first sign-ins at the same instant could make two users; each emailed code
 * works once, which keeps that to someone racing their own two emails.
 */
export async function signInEmailUser(email: string, role: Role, now: Date): Promise<UserId> {
  const found = await User.findOneAndUpdate({ email }, { $set: { lastSignInAt: now, role } }, { sort: OLDEST_FIRST, projection: ID_ONLY })
    .lean().exec();
  if (found) return found._id.toHexString();
  const created = await User.create({ email, name: nameFromEmail(email), lastSignInAt: now, role });
  return created._id.toHexString();
}

const PLAYER_ID_ATTEMPTS = 5;

/** The user's player id, given one now if they have none yet. `generate` is for tests. */
export async function ensurePlayerId(userId: UserId, generate: () => string = generatePlayerId): Promise<string> {
  for (let attempt = 0; attempt < PLAYER_ID_ATTEMPTS; attempt++) {
    const user = await User.findById(userId, { playerId: 1 }).lean().exec();
    if (!user) throw new Error(`No user ${userId}`);
    if (user.playerId) return user.playerId;
    try {
      // Only if still unset: a concurrent request may have just given them one, and the re-read finds it.
      await User.updateOne({ _id: user._id, playerId: { $exists: false } }, { $set: { playerId: generate() } });
    } catch (err) {
      // Another player already has that id (rare at 40 bits): draw again.
      if (!isDuplicateKey(err)) throw err;
    }
  }
  throw new Error(`Could not assign a player id to ${userId}`);
}

/** The name the header shows for this user, or null when there is no such user. */
export async function findName(userId: UserId): Promise<string | null> {
  const user = await User.findById(userId, { name: 1 }).lean().exec();
  return user?.name ?? null;
}

/**
 * Whether this Google or Apple sign-in would land in an admin account: the
 * one tied to it already, or one with its email that it would join.
 */
export async function isAdminAccount(who: HandoffIdentity): Promise<boolean> {
  const own = who.kind === 'google' ? { googleId: who.user.googleId } : { appleId: who.user.appleId };
  return (await User.exists({ $or: [own, { email: who.user.email }], role: 'admin' })) !== null;
}

/** The user's current role, or null when there is no such user. */
export async function findRole(userId: UserId): Promise<Role | null> {
  const user = await User.findById(userId, { role: 1 }).lean().exec();
  return user?.role ?? null;
}

/** The user's email if they are an admin right now; null otherwise. */
export async function findAdminEmail(userId: UserId): Promise<string | null> {
  const user = await User.findById(userId, { role: 1, email: 1 }).lean().exec();
  return user?.role === 'admin' ? user.email : null;
}

/** Makes exactly these emails admins: listed users are promoted, other admins demoted. Returns how many changed. */
export async function syncAdminRoles(adminEmails: ReadonlySet<string>): Promise<number> {
  const emails = [...adminEmails];
  const leaving = await User.find({ email: { $nin: emails }, role: 'admin' }, { _id: 1 }).lean().exec();
  const [up, down] = await Promise.all([
    User.updateMany({ email: { $in: emails }, role: { $ne: 'admin' } }, { $set: { role: 'admin' } }),
    User.updateMany({ email: { $nin: emails }, role: 'admin' }, { $set: { role: 'user' } }),
  ]);
  // Former admins are signed out of connected apps, so tokens don't wake up if they're made admin again.
  await revokeUserTokens(leaving.map((u) => u._id.toHexString()));
  return up.modifiedCount + down.modifiedCount;
}

export interface UserSummary {
  readonly id: UserId;
  readonly email: string;
  readonly name: string;
  /** Absent until the player first needs one. */
  readonly playerId?: string;
  readonly role: Role;
  readonly createdAt: Date;
  readonly lastSignInAt: Date;
}

export interface UserPage {
  readonly users: readonly UserSummary[];
  readonly total: number;
}

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function searchFilter(search: string) {
  const q = search.trim();
  if (!q) return {};
  const pattern = new RegExp(escapeRegex(q), 'i');
  const playerId = normalizePlayerId(q);
  return { $or: [{ email: pattern }, { name: pattern }, ...(playerId ? [{ playerId }] : [])] };
}

/** Users, newest first, optionally only those whose email or name contains `search`, or whose player id it is. */
export async function listUsers(opts: { readonly search: string; readonly page: number; readonly perPage: number }): Promise<UserPage> {
  const filter = searchFilter(opts.search);
  const [docs, total] = await Promise.all([
    User.find(filter, { email: 1, name: 1, playerId: 1, role: 1, createdAt: 1, lastSignInAt: 1 })
      .sort({ createdAt: -1 }).skip(opts.page * opts.perPage).limit(opts.perPage).lean().exec(),
    User.countDocuments(filter),
  ]);
  const users = docs.map((d) => ({
    id: d._id.toHexString(), email: d.email, name: d.name, playerId: d.playerId, role: d.role, createdAt: d.createdAt, lastSignInAt: d.lastSignInAt,
  }));
  return { users, total };
}

/** Accounts made with `from <= createdAt < to`, not counting admins (the team testing). */
export async function countNewUsers(range: { readonly from: Date; readonly to: Date }): Promise<number> {
  return User.countDocuments({ createdAt: { $gte: range.from, $lt: range.to }, role: { $ne: 'admin' } }).exec();
}

export interface PlayerAccountRow {
  readonly id: UserId;
  readonly createdAt: Date;
  /** Absent until the player first needs one. */
  readonly playerId?: string;
}

/** Every account that isn't an admin's, newest first; only those made with `from <= createdAt < to` when a range is given. */
export async function listPlayerAccounts(joined?: { readonly from: Date; readonly to: Date }): Promise<PlayerAccountRow[]> {
  const filter = { role: { $ne: 'admin' as const }, ...(joined ? { createdAt: { $gte: joined.from, $lt: joined.to } } : {}) };
  const docs = await User.find(filter, { createdAt: 1, playerId: 1 }).sort({ createdAt: -1 }).lean().exec();
  return docs.map((d) => ({ id: d._id.toHexString(), createdAt: d.createdAt, ...(d.playerId ? { playerId: d.playerId } : {}) }));
}
