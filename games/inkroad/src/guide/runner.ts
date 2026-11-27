import type { ProgressBook } from './progress';
import { noProgress, withYear } from './progress';
import type { Frame, GuideView, Memo, Part, Script, Step, Who } from './types';

export const REWARD_MS = 5200;
const MIN_SHOW_MS = 1100;
const YEAR_END = 8;
const BEFORE = -1;

/** Where in the year we are, as steps count it. */
export function stageOf(v: Pick<GuideView, 'city'>): number {
  const { phase, season } = v.city;
  if (phase === 'yearStart') return BEFORE;
  if (phase === 'day') return season * 2;
  if (phase === 'review') return season * 2 + 1;
  return YEAR_END;
}

const CARD_OF: Readonly<Record<string, string>> = { review: 'review', yearEnd: 'yearEnd' };
const text = (s: Step['say'] | undefined, v: GuideView, m: Memo): string => (typeof s === 'function' ? s(v, m) : s ?? '');

interface Reward { readonly text: string; readonly who: Who; readonly until: number }

/** Walks a script: waits, shows, notices what was done, rewards, remembers. */
export class Runner {
  private script: Script | null = null;
  private i = 0;
  private memo: Memo = {};
  private startedAt = -1;
  private released = false;
  private reward: Reward | null = null;
  private hinting = false;
  private done = new Set<string>();

  constructor(private readonly book: ProgressBook) {}

  /** Open a year. A year begun again tells its story again; a finished one does not. `over`: the year before has ended. */
  load(script: Script | null, fresh: boolean, over = false): void {
    if (over) this.remember(true);
    const was = script ? this.book.get().years[script.key] : undefined;
    this.script = script && !was?.end ? script : null;
    this.done = new Set(fresh ? [] : was?.ids ?? []);
    this.i = 0;
    this.memo = {};
    this.startedAt = -1;
    this.reward = null;
    this.released = false;
  }

  get off(): boolean {
    return this.book.get().off;
  }

  get running(): boolean {
    return this.script !== null && !this.off;
  }

  private get step(): Step | null {
    return this.script?.steps[this.i] ?? null;
  }

  /** The parts introduced so far; null = everything shows. */
  shown(): ReadonlySet<Part> | null {
    if (!this.running || !this.script!.hides) return null;
    const upTo = this.startedAt >= 0 ? this.i + 1 : this.i;
    const hint = this.hinting ? this.step?.hint?.reveals ?? [] : [];
    return new Set([...this.script!.steps.slice(0, upTo).flatMap((s) => [...(s.reveals ?? []), ...(this.done.has(s.id) ? s.hint?.reveals ?? [] : [])]), ...hint]);
  }

  /** The step's button, or the reward's. */
  ok(nowMs: number, v: GuideView): void {
    if (this.reward) { this.reward = null; return; }
    const s = this.step;
    if (s?.ok && this.startedAt >= 0) this.complete(s, v, nowMs, true);
  }

  /** The player wants time to run although the step stopped it. */
  release(): void {
    this.released = true;
  }

  skip(): void {
    this.book.set({ ...this.book.get(), off: true });
    this.reward = null;
  }

  setOff(off: boolean): void {
    this.book.set(off ? { ...this.book.get(), off: true } : { ...noProgress(), off: false });
  }

  private remember(end: boolean): void {
    if (this.script) this.book.set(withYear(this.book.get(), this.script.key, { ids: [...this.done], end }));
  }

  private move(): void {
    this.i++;
    this.startedAt = -1;
    this.hinting = false;
    this.released = false;
  }

  private complete(s: Step, v: GuideView, nowMs: number, seen: boolean): void {
    this.done.add(s.id);
    const said = seen ? s.reward?.(v, this.memo) ?? null : null;
    this.move();
    this.reward = said ? { text: said, who: s.who ?? 'dewy', until: nowMs + REWARD_MS } : null;
    this.remember(this.step === null);
  }

  tick(v: GuideView, nowMs: number): Frame | null {
    if (!this.running) return null;
    if (this.reward) {
      if (nowMs < this.reward.until && v.card === null) return this.rewardFrame(this.reward);
      this.reward = null;
    }
    for (let n = 0; n <= this.script!.steps.length; n++) {
      const s = this.step;
      if (!s) { this.finish(); return null; }
      const turn = this.turn(s, v, nowMs);
      if (turn === 'wait') return null;
      if (turn === 'show') return this.frame(s, v);
      if (this.reward) return this.rewardFrame(this.reward);
    }
    return null;
  }

  /** One look at the current step: wait for its moment, show it, or move on. */
  private turn(s: Step, v: GuideView, nowMs: number): 'wait' | 'show' | 'moved' {
    const stage = stageOf(v);
    if (this.done.has(s.id) || s.stage < stage) { this.done.add(s.id); this.move(); return 'moved'; }
    if (s.stage > stage || v.card !== (CARD_OF[v.city.phase] ?? null)) return 'wait';
    if (s.skipIf?.(v, this.memo)) { this.done.add(s.id); this.move(); return 'moved'; }
    const fresh = this.startedAt < 0;
    if (fresh) {
      if (s.when && !s.when(v, this.memo)) return 'wait';
      this.startedAt = nowMs;
      this.released = false;
      s.enter?.(v, this.memo);
    }
    if (s.until?.(v, this.memo) && (fresh || nowMs - this.startedAt > MIN_SHOW_MS || s.pause)) { this.complete(s, v, nowMs, !fresh); return 'moved'; }
    this.hinting = !!s.hint && nowMs - this.startedAt > s.hint.afterMs;
    if (s.back?.when(v, this.memo)) { this.goBack(s.back.to); return 'moved'; }
    return 'show';
  }

  private goBack(id: string): void {
    const to = this.script!.steps.findIndex((x) => x.id === id);
    if (to < 0 || to >= this.i) return;
    for (const x of this.script!.steps.slice(to, this.i)) this.done.delete(x.id);
    this.i = to;
    this.startedAt = -1;
    this.hinting = false;
    this.released = false;
  }

  private finish(): void {
    this.remember(true);
    this.script = null;
  }

  private frame(s: Step, v: GuideView): Frame {
    const m = this.memo;
    const h = this.hinting ? s.hint : undefined;
    return {
      id: s.id, kind: 'step', who: s.who ?? 'dewy', why: text(s.why, v, m), say: h?.say ?? text(s.say, v, m), bullets: s.bullets ?? [], ok: s.ok ?? null,
      target: h?.target ?? s.target?.(v, m) ?? null, marks: s.marks?.(v, m) ?? [], look: s.look?.(v, m) ?? null,
      pause: !!s.pause && !this.released, dim: !!s.pause && !this.released && !this.hinting, rate: s.rate?.(v) ?? 1,
    };
  }

  private rewardFrame(r: Reward): Frame {
    return { id: `reward:${r.text}`, kind: 'reward', who: r.who, why: '', say: r.text, bullets: [], ok: 'Next', target: null, marks: [], look: null, pause: false, dim: false, rate: 1 };
  }
}
