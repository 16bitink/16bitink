import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/env', () => ({ optionalEnv: () => undefined, requireEnv: () => '' }));
vi.mock('../src/lib/db', () => ({ db: async () => undefined }));
vi.mock('../src/lib/db/purchaseRepo', () => ({ setPaymentStatus: async () => 0 }));

const { throttled } = await import('../src/lib/playRefunds');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('the daily refund sync', () => {
  it('runs once a day, however many requests come in', async () => {
    const task = vi.fn(async () => undefined);
    const tick = throttled(task, DAY, HOUR);
    tick(0);
    tick(1);
    await settle();
    tick(DAY - 1);
    expect(task).toHaveBeenCalledTimes(1);
    tick(DAY);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('never runs twice at once', async () => {
    let finish = (): void => undefined;
    const task = vi.fn(() => new Promise<void>((r) => (finish = r)));
    const tick = throttled(task, 0, 0);
    tick(0);
    tick(1);
    expect(task).toHaveBeenCalledTimes(1);
    finish();
    await settle();
    tick(2);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('retries a failed run after an hour, not a day', async () => {
    const task = vi.fn(async () => {
      throw new Error('Google down');
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const tick = throttled(task, DAY, HOUR);
    tick(0);
    await settle();
    tick(HOUR - 1);
    expect(task).toHaveBeenCalledTimes(1);
    tick(HOUR);
    expect(task).toHaveBeenCalledTimes(2);
  });
});
