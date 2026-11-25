import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '../src/lib/admins';
import { SESSION_COOKIE, verifySession } from '../src/lib/session';
import { fakeCookies } from './authCookies';

const SECRET = 'test-secret-that-is-long-enough-for-hmac-0123456789';
const ACCOUNT = '65f0c0ffee0000000000aa01';
const signInAppleUser = vi.fn();
const accountGames = vi.fn();

vi.mock('../src/lib/env', () => ({
  requireSecret: () => SECRET,
  optionalEnv: (name: string) => (name === 'ADMIN_EMAILS' ? 'boss@example.com' : undefined),
}));
vi.mock('../src/lib/db', () => ({ db: async () => undefined }));
vi.mock('../src/lib/db/userRepo', () => ({
  signInAppleUser: (...a: unknown[]) => signInAppleUser(...a),
  signInGoogleUser: vi.fn(),
  signInEmailUser: vi.fn(),
  ensurePlayerId: async () => 'p-1',
  findName: async () => 'Boss',
  isAdminAccount: vi.fn(),
}));
vi.mock('../src/lib/owner', () => ({
  claimBrowserPurchases: async () => undefined,
  accountGames: (...a: unknown[]) => accountGames(...a),
}));

const { finishSignIn } = await import('../src/lib/signIn');

describe('finishing an Apple sign-in when Apple sends a relay address', () => {
  beforeEach(() => {
    // The account is the admin's own, with its real email; Apple now sends a relay address.
    signInAppleUser.mockReset().mockImplementation(async (_a: unknown, roleOf: (e: string) => Role) => {
      expect(roleOf('boss@example.com')).toBe('admin');
      expect(roleOf('relay@privaterelay.appleid.com')).toBe('user');
      return { userId: ACCOUNT, email: 'boss@example.com' };
    });
    accountGames.mockReset().mockResolvedValue(['inkfish']);
  });

  it('goes by the account\'s stored email for the session and the purchase lookup', async () => {
    const { cookies, jar } = fakeCookies();
    const url = new URL('https://16bit.ink/auth/app/redeem');
    const who = { kind: 'apple', user: { appleId: '001.abc', email: 'relay@privaterelay.appleid.com', name: '' } } as const;
    await finishSignIn(cookies, url, who, new Date('2026-11-25T12:00:00Z'));
    expect(accountGames).toHaveBeenCalledWith('boss@example.com', ACCOUNT, url);
    const session = await verifySession(jar.get(SESSION_COOKIE), SECRET, Math.floor(new Date('2026-11-25T12:00:00Z').getTime() / 1000));
    expect(session).toMatchObject({ userId: ACCOUNT, email: 'boss@example.com', name: 'Boss', games: ['inkfish'] });
  });
});
