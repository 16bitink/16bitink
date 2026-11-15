import type { ProgressStore } from '@16bitink/game-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accountBehind, AccountSync, parseRemoteSave } from '../src/logic/accountSave';
import { newSave, SAVE_VERSION, type SaveData } from '../src/logic/save';
import { mergeSave } from '../src/logic/saveMerge';
import { newProgress } from '../src/logic/workshop';

const progressed = (xp: number, levels: number): SaveData => ({
  ...newSave(),
  progress: { ...newProgress(), xp, medals: Object.fromEntries(Array.from({ length: levels }, (_, i) => [i + 1, [true, false, false]])) },
});

/** A fake host.progress, like the site's: load gives the copy fetched up front; save merges when the account moved on. */
function fakeStore(initial: unknown): ProgressStore & { data: unknown; saves: number; moveOn(x: unknown): void } {
  let changed = false;
  const s = {
    data: initial,
    saves: 0,
    load: vi.fn(() => Promise.resolve(initial)),
    save: vi.fn(async (data: unknown, merge: (theirs: unknown) => unknown) => {
      s.saves += 1;
      s.data = changed ? merge(s.data) : data;
      changed = false;
    }),
    moveOn(x: unknown) {
      s.data = x;
      changed = true;
    },
  };
  return s;
}

function harness(store: ProgressStore | undefined, local: SaveData) {
  const io = { save: local, stored: 0 };
  const sync = new AccountSync(store, {
    current: () => io.save,
    adopt: (s) => {
      io.save = s;
      io.stored += 1;
    },
  }, { pullTimeoutMs: 50, pushDelayMs: 100 });
  return { io, sync };
}

const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe('parseRemoteSave', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
    ['a string', 'hello'],
    ['an array', [1, 2]],
    ['garbage object', { foo: 'bar' }],
    ['an old version', { v: 0, progress: newProgress(), sound: true }],
    ['bad progress', { v: SAVE_VERSION, progress: { xp: -1 } }],
    ['a bigint', 10n],
  ])('gives null for %s, never throws', (_what, x) => {
    expect(parseRemoteSave(x)).toBeNull();
  });

  it('reads a real save', () => {
    const s = progressed(500, 3);
    expect(parseRemoteSave(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});

describe('accountBehind', () => {
  it('is behind when missing or lacking progress, not when it holds it all', () => {
    const mine = progressed(500, 3);
    expect(accountBehind(null, mine)).toBe(true);
    expect(accountBehind(null, newSave())).toBe(false);
    expect(accountBehind(null, { ...newSave(), sound: false })).toBe(false);
    expect(accountBehind(progressed(100, 1), mine)).toBe(true);
    expect(accountBehind(mine, mine)).toBe(false);
    expect(accountBehind(progressed(900, 5), mine)).toBe(false);
    expect(accountBehind({ ...mine, sound: !mine.sound }, mine)).toBe(false);
  });
});

describe('AccountSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does nothing when nobody is signed in', async () => {
    const { io, sync } = harness(undefined, progressed(100, 1));
    await sync.pull();
    sync.schedule();
    vi.runAllTimers();
    expect(io.stored).toBe(0);
  });

  it('pulls the account save into a fresh device and pushes nothing back', async () => {
    const remote = progressed(900, 7);
    const store = fakeStore(JSON.parse(JSON.stringify(remote)));
    const { io, sync } = harness(store, newSave());
    await sync.pull();
    expect(io.save).toEqual(remote);
    expect(store.saves).toBe(0);
  });

  it('pushes this device\'s progress when the account has none', async () => {
    const store = fakeStore(null);
    const local = progressed(300, 2);
    const { io, sync } = harness(store, local);
    await sync.pull();
    await settle();
    expect(io.save).toBe(local);
    expect(store.data).toEqual(local);
  });

  it('merges both ways when each has something', async () => {
    const remote = { ...progressed(900, 2), progress: { ...progressed(900, 2).progress, medals: { 1: [true, true, false], 2: [true, false, false] } } } as SaveData;
    const store = fakeStore(JSON.parse(JSON.stringify(remote)));
    const local = { ...newSave(), progress: { ...newProgress(), xp: 100, medals: { 1: [true, false, true] } } } as SaveData;
    const { io, sync } = harness(store, local);
    await sync.pull();
    await settle();
    expect(io.save.progress.medals).toEqual({ 1: [true, true, true], 2: [true, false, false] });
    expect(store.data).toEqual(io.save);
  });

  it.each([
    ['garbage', { nope: true }],
    ['an old version', { v: 0, progress: { xp: 99999 } }],
    ['a number', 7],
  ])('never wipes local progress when the account holds %s', async (_what, junk) => {
    const store = fakeStore(junk);
    const local = progressed(400, 4);
    const { io, sync } = harness(store, local);
    await sync.pull();
    await settle();
    expect(io.save).toBe(local);
    expect(store.data).toEqual(local);
  });

  it('plays on the local save when loading fails or hangs, and pulls again before pushing', async () => {
    const local = progressed(400, 4);
    const failing = { load: vi.fn(() => Promise.reject(new Error('offline'))), save: vi.fn(() => Promise.resolve()) };
    const a = harness(failing, local);
    await expect(a.sync.pull()).resolves.toBeUndefined();
    expect(a.io.save).toBe(local);
    a.sync.schedule();
    vi.advanceTimersByTime(100);
    await settle();
    expect(failing.load).toHaveBeenCalledTimes(2);
    expect(failing.save).not.toHaveBeenCalled();

    const hanging = { load: vi.fn(() => new Promise<unknown>(() => undefined)), save: vi.fn(() => Promise.resolve()) };
    const b = harness(hanging, local);
    const p = b.sync.pull();
    vi.advanceTimersByTime(50);
    await expect(p).resolves.toBeUndefined();
    expect(b.io.save).toBe(local);
  });

  it('a failing save only warns', async () => {
    const store = { load: () => Promise.resolve(null), save: vi.fn(() => Promise.reject(new Error('offline'))) };
    const { sync } = harness(store, progressed(100, 1));
    await sync.pull();
    await settle();
    expect(store.save).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it('several saves close together go to the account as one, the latest', async () => {
    const store = fakeStore(null);
    const { io, sync } = harness(store, newSave());
    await sync.pull();
    await settle();
    const before = store.saves;
    for (let xp = 1; xp <= 5; xp++) {
      io.save = progressed(xp * 100, 1);
      sync.schedule();
      vi.advanceTimersByTime(50);
    }
    expect(store.saves).toBe(before);
    vi.advanceTimersByTime(100);
    await settle();
    expect(store.saves).toBe(before + 1);
    expect(store.data).toEqual(progressed(500, 1));
  });

  it('flush pushes a scheduled save at once', async () => {
    const store = fakeStore(null);
    const { io, sync } = harness(store, newSave());
    await sync.pull();
    await settle();
    const before = store.saves;
    io.save = progressed(700, 2);
    sync.schedule();
    sync.flush();
    await settle();
    expect(store.saves).toBe(before + 1);
    sync.flush();
    expect(store.saves).toBe(before + 1);
  });

  it('when another device saved first, keeps both here and in the account', async () => {
    const store = fakeStore(null);
    const { io, sync } = harness(store, progressed(200, 2));
    await sync.pull();
    await settle();
    const elsewhere = { ...progressed(800, 1), progress: { ...progressed(800, 1).progress, medals: { 1: [true, true, true] } } } as SaveData;
    store.moveOn(JSON.parse(JSON.stringify(elsewhere)));
    sync.schedule();
    vi.advanceTimersByTime(100);
    await settle();
    const want = mergeSave(progressed(200, 2), elsewhere);
    expect(io.save).toEqual(want);
    expect(store.data).toEqual(want);
    expect(io.save.progress.medals).toEqual({ 1: [true, true, true], 2: [true, false, false] });
  });
});
