import type { Ghost, Selection } from '../src/app/worldPort';
import { createCity } from '../src/city/city';
import { SAFFRON } from '../src/city/defs/saffron';
import { answersFor } from '../src/guide/advisor/answers';
import { topProblems } from '../src/guide/advisor/problems';
import { junctionOf } from '../src/guide/places';
import { noProgress, ProgressBook, type Store } from '../src/guide/progress';
import { Runner } from '../src/guide/runner';
import type { Frame, GuideView } from '../src/guide/types';
import type { CityView, Command, ToolId } from '../src/sim/types';

export class MemoryStore implements Store {
  readonly map = new Map<string, string>();
  getItem(k: string): string | null { return this.map.get(k) ?? null; }
  setItem(k: string, v: string): void { this.map.set(k, v); }
}

export const book = (store: Store = new MemoryStore()): ProgressBook => new ProgressBook(store);
export const GAME_SEED = 1000 + 7919;
export const saffron = (): CityView => createCity(SAFFRON, GAME_SEED);
export { noProgress };

const CARD: Readonly<Record<string, string>> = { review: 'review', yearEnd: 'yearEnd', yearStart: 'yearStart' };

/** A hand without a screen: it holds a tool, a ghost and a selection, and does what a frame asks. */
export class Hand {
  tool: ToolId | null = null;
  ghost: Ghost | null = null;
  selection: Selection = null;
  speed = 1;
  now = 0;
  readonly seen: string[] = [];
  readonly said: string[] = [];

  constructor(readonly city: CityView, readonly runner: Runner) {}

  view(): GuideView {
    return {
      city: this.city, tool: this.tool, ghost: this.ghost, selection: this.selection, overlay: 'none', stops: 0, parkKind: 'lot', card: CARD[this.city.phase] ?? null, speed: this.speed, phone: false,
    };
  }

  propose(cmd: Command): void {
    this.ghost = { cmd, quote: this.city.quote(cmd), label: '', at: { x: 0, y: 0 }, dragging: false };
  }

  build(): void {
    if (this.ghost) this.city.apply(this.ghost.cmd);
    this.ghost = null;
  }

  /** One look at the guide, a moment later. */
  tick(ms = 1500): Frame | null {
    this.now += ms;
    const f = this.runner.tick(this.view(), this.now);
    if (f && this.seen.at(-1) !== f.id) { this.seen.push(f.id); this.said.push(f.why, f.say); }
    return f;
  }

  /** Do what the frame marks: tap the junction, the tool, the button; drag; wait. */
  follow(f: Frame): void {
    const t = f.target;
    if (f.ok && f.kind === 'reward') return this.runner.ok(this.now, this.view());
    if (f.id === 'find-it') return this.fixWorst();
    if (t?.t === 'spot' && t.tap) {
      const j = this.city.junctions.find((x) => Math.hypot(x.x - t.at.x, x.y - t.at.y) < 1);
      if (j) { this.selection = { kind: 'junction', id: j.id }; return; }
    }
    if (t?.t === 'tool') { this.tool = t.tool; return; }
    if (t?.t === 'drag') { this.propose({ t: 'road', type: 'street', cells: t.line.map((p) => ({ gx: p.x / 40, gy: p.y / 40 })) }); return; }
    if (t?.t === 'ui' && t.tap) return this.press(t.sel[0]!, f);
    if (f.ok) return this.runner.ok(this.now, this.view());
    if (!f.pause) this.run();
  }

  /** What the advisor would offer first. */
  private fixWorst(): void {
    const p = topProblems(this.city).find((x) => x.kind === 'junction');
    const a = p ? answersFor(this.city, p)[0] : undefined;
    if (a?.act.t === 'control') this.city.apply({ t: 'control', node: a.act.node, control: a.act.control });
    else if (a?.act.t === 'street') this.city.apply({ t: 'road', type: 'street', cells: a.act.plan.cells });
    else this.run();
  }

  private press(sel: string, f: Frame): void {
    if (sel.includes('data-act=build')) return this.build();
    if (sel.includes('data-k=sp4')) { this.speed = 4; return; }
    if (sel.includes('data-act=next')) { this.city.apply({ t: 'next' }); return; }
    const control = /data-act=control\]\[data-v=(\w+)/.exec(sel)?.[1];
    if (control && this.selection?.kind === 'junction') {
      this.city.apply({ t: 'control', node: this.selection.id, control: control as 'roundabout' });
      this.selection = null;
      return;
    }
    if (f.ok) this.runner.ok(this.now, this.view());
  }

  run(seconds = 2): void {
    this.city.advance(seconds);
  }
}

export const controlAt = (c: CityView, id: number): string => junctionOf(c, id)?.control ?? '';
