import type { ProgressStore } from '@16bitink/game-sdk';
import { newSave, parseSave, type SaveData } from './save';
import { mergeSave } from './saveMerge';

/** How long boot waits for the account's save before playing on this device's. */
export const PULL_TIMEOUT_MS = 4000;
/** Saves close together (a run of workshop buys) go to the account as one. */
export const PUSH_DELAY_MS = 1500;

/**
 * The account's copy (untrusted) as a save, or null when there is none or it
 * can't be read (garbage, another version): then this device's save stands.
 * Never throws.
 */
export function parseRemoteSave(x: unknown): SaveData | null {
  if (x === null || x === undefined) return null;
  let raw: string | undefined;
  try {
    raw = JSON.stringify(x);
  } catch {
    return null;
  }
  const loaded = parseSave(raw);
  return loaded.problem ? null : loaded.save;
}

/** JSON with object keys sorted, so two equal saves compare equal whatever order they were built in. */
function canon(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canon).join(',')}]`;
  if (typeof x === 'object' && x !== null) {
    const o = x as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canon(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(x) ?? 'null';
}

/** Whether the account's copy lacks something `mine` has (sound aside: it is per device). An empty account lacks nothing a fresh game has. */
export function accountBehind(remote: SaveData | null, mine: SaveData): boolean {
  if (!remote) return canon({ ...mine, sound: true }) !== canon(newSave());
  return canon({ ...mergeSave(remote, mine), sound: remote.sound }) !== canon(remote);
}

export interface SaveIo {
  /** The save in play. */
  current(): SaveData;
  /** Takes a merged save as the one in play and stores it on this device (without pushing it again). */
  adopt(s: SaveData): void;
}

/**
 * Keeps the signed-in player's account save in step with this device's.
 * Pull once on boot; schedule a push after each local save. Never blocks
 * play: offline or failing, it warns and the game plays on the local save.
 */
export class AccountSync {
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** True once the account's save was read and folded in: until then a push would overwrite what it never saw. */
  private synced = false;
  private pulling: Promise<void> | null = null;

  constructor(
    private readonly store: ProgressStore | undefined,
    private readonly io: SaveIo,
    private readonly opts: { readonly pullTimeoutMs?: number; readonly pushDelayMs?: number } = {},
  ) {}

  /** Folds the account's save into this device's (and pushes this device's when the account is behind). Never rejects. */
  pull(): Promise<void> {
    this.pulling ??= this.pullOnce().finally(() => {
      this.pulling = null;
    });
    return this.pulling;
  }

  private async pullOnce(): Promise<void> {
    if (!this.store) return;
    try {
      const remote = parseRemoteSave(await withTimeout(this.store.load(), this.opts.pullTimeoutMs ?? PULL_TIMEOUT_MS));
      const merged = remote ? mergeSave(this.io.current(), remote) : this.io.current();
      if (remote) this.io.adopt(merged);
      this.synced = true;
      if (accountBehind(remote, merged)) this.push();
    } catch (err) {
      console.warn("[inktanks] could not load your account's save; playing on this device's", err);
    }
  }

  /** A local save happened: push it soon (several close together go as one). */
  schedule(): void {
    if (!this.store) return;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.opts.pushDelayMs ?? PUSH_DELAY_MS);
  }

  /** Pushes a scheduled save now (before leaving). */
  flush(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
    this.push();
  }

  private push(): void {
    if (!this.store) return;
    // Boot's pull failed (offline): pull first, which pushes this save if the account is behind.
    if (!this.synced) {
      void this.pull();
      return;
    }
    let pending: Promise<void>;
    try {
      pending = this.store.save(this.io.current(), (theirs) => {
        // Another device saved first: keep both, here and in the account.
        const remote = parseRemoteSave(theirs);
        if (!remote) return this.io.current();
        const merged = mergeSave(this.io.current(), remote);
        this.io.adopt(merged);
        return merged;
      });
    } catch (err) {
      pending = Promise.reject(err);
    }
    pending.catch((err: unknown) => console.warn('[inktanks] could not save to your account', err));
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
