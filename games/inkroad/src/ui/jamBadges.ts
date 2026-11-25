import type { WorldPort } from '../app/worldPort';
import type { CityView, Id, Junction, JunctionStats } from '../sim/types';
import { div, Router } from './dom';

/**
 * Paper tags over jammed junctions: the wait in seconds, bigger and shaking as
 * it gets worse. Tap one to open the junction. When the junction runs again
 * the tag flips to green and flies off.
 */
const EVERY_MS = 250;
const MIN_ARMS = 3;
const MAX_TAGS = 9;
const QUIET_AFTER_MS = 5000; // a middling junction's tag fades
const DONE_MS = 2300;
const MIN_LIFE_MS = 2500; // a tag that just came does not celebrate
const EDGE = 0.8; // of the junction's radius: where the tag hangs from

type Grade = JunctionStats['grade'];
export type TagState = 'none' | 'on' | 'quiet' | 'done';
const RED: ReadonlySet<Grade> = new Set(['D', 'E', 'F']);
const CALM: ReadonlySet<Grade> = new Set(['A', 'B']);

/** What a tag does next, from the junction's grade. Pure. */
export function nextState(now: TagState, grade: Grade, age: number, middling: number): TagState {
  if (now === 'done' || now === 'quiet') return now;
  if (RED.has(grade)) return 'on';
  if (now === 'none') return 'none';
  if (CALM.has(grade)) return age > MIN_LIFE_MS ? 'done' : 'quiet';
  return middling > QUIET_AFTER_MS ? 'quiet' : 'on';
}

interface Tag { readonly el: HTMLElement; readonly id: Id; at: { x: number; y: number }; state: TagState; born: number; redAt: number; endAt: number; text: string; grade: Grade }

export class JamBadges {
  private readonly tags = new Map<Id, Tag>();
  private last = -Infinity;
  private city: CityView | null = null;

  constructor(private readonly layer: HTMLElement, router: Router, private readonly world: () => WorldPort | null, private readonly onOpen: () => void) {
    router.add({ jam: (v) => this.open(Number(v)) });
  }

  private open(id: Id): void {
    const j = this.city?.junctions.find((q) => q.id === id);
    const w = this.world();
    if (!j || !w) return;
    if (w.tool !== null && w.tool !== 'junction') w.setTool(null);
    w.select({ kind: 'junction', id, at: { x: j.x, y: j.y } });
    this.onOpen();
  }

  /** The junctions' numbers, a few times a second. */
  update(city: CityView, nowMs: number): void {
    if (city !== this.city) { this.clear(); this.city = city; }
    if (nowMs - this.last < EVERY_MS) return;
    this.last = nowMs;
    if (city.phase !== 'day') return this.clear();
    const real = city.junctions.filter((j) => !j.ramp && j.arms.length >= MIN_ARMS);
    for (const j of real) this.read(j, city.junctionStats(j.id), nowMs);
    for (const t of this.tags.values()) if (!real.some((j) => j.id === t.id)) this.drop(t);
    for (const t of this.tags.values()) if (t.endAt > 0 && nowMs > t.endAt) this.drop(t);
    const on = [...this.tags.values()].filter((t) => t.state === 'on').sort((a, b) => b.grade.localeCompare(a.grade));
    const picked = this.world()?.selection;
    on.forEach((t, i) => t.el.classList.toggle('far', i >= MAX_TAGS || (picked?.kind === 'junction' && picked.id === t.id)));
  }

  private read(j: Junction, s: JunctionStats, nowMs: number): void {
    const t = this.tags.get(j.id);
    if (!t) {
      if (nextState('none', s.grade, 0, 0) === 'on') this.make(j, s, nowMs);
      return;
    }
    if (RED.has(s.grade)) t.redAt = nowMs;
    const next = nextState(t.state, s.grade, nowMs - t.born, nowMs - t.redAt);
    if (next !== t.state) this.turn(t, next, s, nowMs);
    if (t.state === 'on') this.write(t, s);
    t.at = hangs(j);
  }

  private make(j: Junction, s: JunctionStats, nowMs: number): void {
    const el = div(this.layer, 'jamtag');
    el.innerHTML = `<button data-act="jam" data-v="${j.id}" aria-label="Jammed junction"><span class="face"></span></button>`;
    const t: Tag = { el, id: j.id, at: hangs(j), state: 'on', born: nowMs, redAt: nowMs, endAt: 0, text: '', grade: s.grade };
    this.tags.set(j.id, t);
    this.write(t, s);
    this.place(t);
  }

  private write(t: Tag, s: JunctionStats): void {
    const text = `${Math.max(1, Math.round(s.wait))} s`;
    if (text !== t.text) {
      t.text = text;
      t.el.querySelector('.face')!.textContent = text;
    }
    t.grade = s.grade;
    t.el.dataset.g = s.grade;
  }

  private turn(t: Tag, next: TagState, s: JunctionStats, nowMs: number): void {
    t.state = next;
    t.el.classList.toggle('done', next === 'done');
    t.el.classList.toggle('quiet', next === 'quiet');
    t.endAt = nowMs + (next === 'done' ? DONE_MS : 500);
    if (next === 'done') t.el.querySelector('.face')!.innerHTML = `<svg viewBox="0 0 20 16"><path d="M2 8.5 7.5 14 18 2"/></svg>${Math.max(1, Math.round(s.wait))} s`;
  }

  /** Follow the map. Every drawn frame. */
  draw(): void {
    for (const t of this.tags.values()) this.place(t);
  }

  private place(t: Tag): void {
    const p = this.world()?.screenOf(t.at);
    if (p) t.el.style.transform = `translate3d(${Math.round(p.x * 2) / 2}px,${Math.round(p.y * 2) / 2}px,0)`;
  }

  private drop(t: Tag): void {
    t.el.remove();
    this.tags.delete(t.id);
  }

  clear(): void {
    for (const t of [...this.tags.values()]) this.drop(t);
  }
}

/** The north-east corner, on the sand, where the tag hides no lane. */
const hangs = (j: Junction): { x: number; y: number } => ({ x: j.x + j.radius * EDGE, y: j.y - j.radius * EDGE });
