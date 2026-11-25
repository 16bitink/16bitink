import { describe, expect, it } from 'vitest';
import { appState, isAppState, isBindHash } from '../src/lib/appSignIn';
import { randomToken } from '../src/lib/google';
import { hashSecret } from '../src/lib/emailSignIn';

describe('app sign-in bind', () => {
  it('takes a SHA-256 hash, as /auth/app/bind gives it', async () => {
    expect(isBindHash(await hashSecret('secret'))).toBe(true);
  });

  it('refuses anything else', () => {
    for (const v of [undefined, null, '', 'abc', 'A'.repeat(64), 'g'.repeat(64), 'a'.repeat(65), 42]) expect(isBindHash(v)).toBe(false);
  });
});

describe('app sign-in state', () => {
  it('marks a sign-in from the app, so its callback goes back to the app without the flow cookie', () => {
    expect(isAppState(appState(randomToken()))).toBe(true);
  });

  it('leaves a web sign-in, and a missing state, alone', () => {
    for (let i = 0; i < 50; i++) expect(isAppState(randomToken())).toBe(false);
    expect(isAppState(null)).toBe(false);
  });
});
