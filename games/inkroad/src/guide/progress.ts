/** What the guide remembers between visits, in its own small record. */
export const GUIDE_KEY = 'inkroad.guide';
const VERSION = 1;
const MAX_IDS = 80;
const MAX_YEARS = 60;

export interface YearDone { readonly ids: readonly string[]; readonly end: boolean }
export interface GuideProgress { readonly v: number; readonly off: boolean; readonly years: Readonly<Record<string, YearDone>> }

export interface Store { getItem(key: string): string | null; setItem(key: string, value: string): void }

export const noProgress = (): GuideProgress => ({ v: VERSION, off: false, years: {} });

const isObj = (x: unknown): x is Readonly<Record<string, unknown>> => typeof x === 'object' && x !== null && !Array.isArray(x);

function parseYear(x: unknown): YearDone | null {
  if (!isObj(x) || !Array.isArray(x.ids)) return null;
  return { ids: x.ids.filter((i): i is string => typeof i === 'string').slice(0, MAX_IDS), end: x.end === true };
}

/** Anything unreadable is a fresh start. Never throws. */
export function parseProgress(raw: string | null): GuideProgress {
  if (!raw) return noProgress();
  try {
    const x: unknown = JSON.parse(raw);
    if (!isObj(x) || x.v !== VERSION) return noProgress();
    const years: Record<string, YearDone> = {};
    for (const [k, v] of Object.entries(isObj(x.years) ? x.years : {}).slice(0, MAX_YEARS)) {
      const y = parseYear(v);
      if (y) years[k] = y;
    }
    return { v: VERSION, off: x.off === true, years };
  } catch {
    return noProgress();
  }
}

export const withYear = (p: GuideProgress, key: string, y: YearDone): GuideProgress => ({ ...p, years: { ...p.years, [key]: y } });

/** The record in the host's storage; a store that fails just forgets. */
export class ProgressBook {
  private now: GuideProgress;

  constructor(private readonly store: Store | null) {
    this.now = parseProgress(this.read());
  }

  private read(): string | null {
    try {
      return this.store?.getItem(GUIDE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  get(): GuideProgress {
    return this.now;
  }

  set(p: GuideProgress): void {
    this.now = p;
    try {
      this.store?.setItem(GUIDE_KEY, JSON.stringify(p));
    } catch (e) {
      console.warn('[inkroad] could not save the guide', e);
    }
  }
}
