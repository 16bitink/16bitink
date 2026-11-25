import { describe, expect, it } from 'vitest';
import { isBindHash } from '../src/lib/appSignIn';
import { hashSecret } from '../src/lib/emailSignIn';

describe('app sign-in bind', () => {
  it('takes a SHA-256 hash, as /auth/app/bind gives it', async () => {
    expect(isBindHash(await hashSecret('secret'))).toBe(true);
  });

  it('refuses anything else', () => {
    for (const v of [undefined, null, '', 'abc', 'A'.repeat(64), 'g'.repeat(64), 'a'.repeat(65), 42]) expect(isBindHash(v)).toBe(false);
  });
});
