import { afterEach, describe, expect, it, vi } from 'vitest';
import { settleWithin } from '../src/lib/client/settleWithin';

describe('settleWithin', () => {
  afterEach(() => vi.useRealTimers());

  it('resolves when the promise resolves in time', async () => {
    await expect(settleWithin(Promise.resolve(7), 100)).resolves.toBeUndefined();
  });

  it('resolves, not rejects, when the promise rejects', async () => {
    await expect(settleWithin(Promise.reject(new Error('AbortError')), 100)).resolves.toBeUndefined();
  });

  it('resolves after the timeout when the promise never settles (Android orientation lock in fullscreen)', async () => {
    vi.useFakeTimers();
    let done = false;
    const p = settleWithin(new Promise<void>(() => undefined), 1000).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await p;
    expect(done).toBe(true);
  });

  it('resolves when the call itself throws', async () => {
    await expect(settleWithin(() => { throw new Error('no lock'); }, 100)).resolves.toBeUndefined();
  });
});
