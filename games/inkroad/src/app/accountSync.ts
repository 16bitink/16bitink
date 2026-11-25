import type { ProgressStore } from '@16bitink/game-sdk';
import { mergeSave, newSave, parseSave, type SaveData } from './save';

/**
 * Keeps the signed-in player's account save in step with this device's, as
 * InkTanks does: pull once on boot, push soon after each local save, merge
 * when another device saved first. Never blocks play; offline it warns.
 */
export const PULL_TIMEOUT_MS = 4000;
export const PUSH_DELAY_MS = 1500;

export function parseRemoteSave(x: unknown): SaveData | null {
  if (x === null || x === undefined) return null;
  let raw: string;
  try {
    raw = JSON.stringify(x);
  } catch {
    return null;
  }
  const loaded = parseSave(raw);
  return loaded.problem ? null : loaded.save;
}

const progressOf = (s: SaveData): string =>
  JSON.stringify(Object.entries(s.cities).sort().map(([k, c]) => [k, c.reached, c.plates, Object.keys(c.years).sort()]));

/** Whether the account's copy lacks progress this device has. */
export function accountBehind(remote: SaveData | null, mine: SaveData): boolean {
  if (!remote) return progressOf(mine) !== progressOf(newSave());
  return progressOf(mergeSave(remote, mine)) !== progressOf(remote);
}

export interface SaveIo {
  current(): SaveData;
  adopt(s: SaveData): void;
}

export class AccountSync {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private synced = false;
  private pulling: Promise<void> | null = null;

  constructor(private readonly store: ProgressStore | undefined, private readonly io: SaveIo) {}

  pull(): Promise<void> {
    this.pulling ??= this.pullOnce().finally(() => {
      this.pulling = null;
    });
    return this.pulling;
  }

  private async pullOnce(): Promise<void> {
    if (!this.store) return;
    try {
      const remote = parseRemoteSave(await withTimeout(this.store.load(), PULL_TIMEOUT_MS));
      const merged = remote ? mergeSave(this.io.current(), remote) : this.io.current();
      if (remote) this.io.adopt(merged);
      this.synced = true;
      if (accountBehind(remote, merged)) this.push();
    } catch (err) {
      console.warn("[inkroad] could not load your account's save; playing on this device's", err);
    }
  }

  schedule(): void {
    if (!this.store) return;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), PUSH_DELAY_MS);
  }

  flush(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
    this.push();
  }

  private push(): void {
    if (!this.store) return;
    if (!this.synced) {
      void this.pull();
      return;
    }
    let pending: Promise<void>;
    try {
      pending = this.store.save(this.io.current(), (theirs) => {
        const remote = parseRemoteSave(theirs);
        if (!remote) return this.io.current();
        const merged = mergeSave(this.io.current(), remote);
        this.io.adopt(merged);
        return merged;
      });
    } catch (err) {
      pending = Promise.reject(err);
    }
    pending.catch((err: unknown) => console.warn('[inkroad] could not save to your account', err));
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
