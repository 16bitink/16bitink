import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppHandoff } from '../src/lib/db/appHandoffModel';
import { collectHandoff, createHandoff } from '../src/lib/db/appHandoffRepo';
import { connectDb, disconnectDb } from '../src/lib/db/connection';

// Integration test: needs a throwaway MongoDB, e.g.
// MONGODB_TEST_URI=mongodb://localhost:27017/16bitink_test pnpm test
const uri = process.env.MONGODB_TEST_URI;
const NOW = new Date('2026-11-24T12:00:00Z');
const later = (sec: number): Date => new Date(NOW.getTime() + sec * 1000);
const apple = { kind: 'apple', user: { appleId: '001.abc', email: 'fish@example.com', name: 'Ink' } } as const;
const google = { kind: 'google', user: { googleId: 'g-1', email: 'crab@example.com', name: 'Crab' } } as const;

describe.skipIf(!uri)('app sign-in handoff (MongoDB)', () => {
  beforeAll(async () => {
    await connectDb(uri!);
    await AppHandoff.syncIndexes();
  });
  beforeEach(async () => {
    await AppHandoff.deleteMany({});
  });
  afterAll(async () => {
    await AppHandoff.deleteMany({});
    await disconnectDb();
  });

  it('gives back who signed in and where to, once', async () => {
    await createHandoff('h-1', 'b-1', apple, '/play/inkpin', NOW);
    await createHandoff('h-2', 'b-2', google, '/', NOW);
    expect(await collectHandoff('h-1', 'b-1', later(5))).toEqual({ who: apple, ret: '/play/inkpin' });
    expect(await collectHandoff('h-1', 'b-1', later(6))).toBeNull();
    expect(await collectHandoff('h-2', 'b-2', later(6))).toEqual({ who: google, ret: '/' });
  });

  it('is gone after two minutes, and an unknown token finds nothing', async () => {
    await createHandoff('h-3', 'b-3', apple, '/', NOW);
    expect(await collectHandoff('h-3', 'b-3', later(120))).toBeNull();
    expect(await collectHandoff('nope', 'b-3', later(1))).toBeNull();
  });

  it('is only for the web view that started it, and another one does not use it up', async () => {
    await createHandoff('h-4', 'b-4', google, '/', NOW);
    expect(await collectHandoff('h-4', 'someone-else', later(1))).toBeNull();
    expect(await collectHandoff('h-4', 'b-4', later(2))).toEqual({ who: google, ret: '/' });
  });
});
