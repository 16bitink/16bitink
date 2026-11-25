import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { UsedAppleNonce } from '../src/lib/db/appleNonceModel';
import { useAppleNonce } from '../src/lib/db/appleNonceRepo';
import { connectDb, disconnectDb } from '../src/lib/db/connection';

// Integration test: needs a throwaway MongoDB, e.g.
// MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm test
const uri = process.env.MONGODB_TEST_URI;
const EXPIRES = new Date('2026-11-25T12:10:00Z');

describe.skipIf(!uri)('Sign in with Apple nonces (MongoDB)', () => {
  beforeAll(async () => {
    await connectDb(uri!);
    await UsedAppleNonce.syncIndexes();
  });
  beforeEach(async () => {
    await UsedAppleNonce.deleteMany({});
  });
  afterAll(async () => {
    await UsedAppleNonce.deleteMany({});
    await disconnectDb();
  });

  it('works once', async () => {
    expect(await useAppleNonce('n-1', EXPIRES)).toBe(true);
    expect(await useAppleNonce('n-1', EXPIRES)).toBe(false);
    expect(await useAppleNonce('n-2', EXPIRES)).toBe(true);
  });

  it('works once even when two sign-ins race', async () => {
    const results = await Promise.all([useAppleNonce('n-3', EXPIRES), useAppleNonce('n-3', EXPIRES)]);
    expect(results.sort()).toEqual([false, true]);
  });
});
