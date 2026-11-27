import type { Selection } from '../../app/worldPort';
import { ProgressBook, type Store } from '../../guide/progress';
import { Runner, stageOf } from '../../guide/runner';
import { scriptFor } from '../../guide/scripts';
import type { Frame, GuideView, Part, Target, Who } from '../../guide/types';
import type { CityView, Pt, ToolId } from '../../sim/types';
import { div, Dirty, Router } from '../dom';
import type { UiEnv } from '../types';
import { bestPlace, boxOf, type Box, grow } from './dom';
import { boxHtml, GuideLayer } from './layer';

/** A one-line nudge outside any script: an advisor's answer, 'show me'. */
export interface Tip {
  readonly who?: Who;
  readonly why?: string;
  readonly say: (v: GuideView) => string;
  readonly target: (v: GuideView) => Target | null;
  readonly until: (v: GuideView) => boolean;
  readonly look?: readonly Pt[];
  readonly ms: number;
}

const PLACE_EVERY_MS = 250;
const PAD = 8;
const LOOK_MS = 700;
const LOOK_PAD = { w: 150, h: 130 } as const;
const MAX_LOOK_ZOOM = 2.4;
const MIN_LOOK_ZOOM = 0.7;
const STOPPED_MS = 1500;
const PARTS: readonly Part[] = ['approval', 'goal', 'speed', 'ovs', 'ticker', 'advisor', 'forecast'];
const NONE: Frame = { id: '', kind: 'tip', who: 'dewy', why: '', say: '', bullets: [], ok: null, target: null, marks: [], look: null, pause: false, dim: false, rate: 1 };

/** The guide on screen: asks the runner what to show, stops time, moves the camera, draws. */
export class GuideUi {
  private readonly runner: Runner;
  private readonly layer: GuideLayer;
  private readonly el: HTMLElement;
  private readonly box: HTMLElement;
  private readonly dirty = new Dirty();
  private view: GuideView | null = null;
  private frame: Frame | null = null;
  private city: CityView | null = null;
  private tipNow: (Tip & { until0: number; id: number }) | null = null;
  private tips = 0;
  private stops = 0;
  private lastSpeed = 1;
  private stoppedAt = 0;
  private placedAt = 0;
  private lookedAt = '';
  parkKind = 'lot';

  constructor(private readonly root: HTMLElement, private readonly env: () => UiEnv, store: Store | null) {
    this.runner = new Runner(new ProgressBook(store));
    this.el = div(root, 'guide');
    this.layer = new GuideLayer(root, this.el, () => env().world);
    this.box = div(this.el, 'gbox paper');
    this.box.hidden = true;
    new Router(this.el).add({
      gok: () => this.ok(),
      gskip: () => { this.runner.skip(); this.env().acts.toast('Ask me any time: tap What now?', 'dewy'); },
    });
  }

  private ok(): void {
    if (this.tipNow && this.frame?.kind === 'tip') this.tipNow = null;
    else if (this.view) this.runner.ok(performance.now(), this.view);
  }

  get off(): boolean {
    return this.runner.off;
  }

  setOff(off: boolean): void {
    this.runner.setOff(off);
    this.city = null;
  }

  /** Showing a step (not only a tip): the advisor keeps quiet. */
  get busy(): boolean {
    return this.frame !== null && this.frame.kind !== 'tip';
  }

  /** The parts shown so far; null = all. */
  get parts(): ReadonlySet<Part> | null {
    return this.runner.shown();
  }

  tools(all: readonly ToolId[]): readonly ToolId[] {
    const p = this.parts;
    return !p || p.has('tools') ? all : all.filter((t) => p.has(`tool:${t}`));
  }

  tip(t: Tip): void {
    this.tipNow = { ...t, until0: performance.now() + t.ms, id: ++this.tips };
  }

  /** A tool's first stop makes no ghost; the world only says what to do next. */
  noteHint(text: string): void {
    if (text.startsWith('Now tap the next stop')) this.stops = 1;
  }

  /** A speed button was pressed: time runs, whatever the step wanted. */
  released(): void {
    this.runner.release();
  }

  private look(nowMs: number): GuideView {
    const { city, world, speed, phone } = this.env();
    const tool = world?.tool ?? null;
    const ghost = world?.ghost ?? null;
    if (ghost?.cmd.t === 'line') this.stops = ghost.cmd.stops.length;
    else if (this.dirty.changed('tool', tool)) this.stops = 0;
    void nowMs;
    return { city, tool, ghost, selection: (world?.selection ?? null) as Selection, overlay: world?.overlay ?? 'none', stops: this.stops, parkKind: this.parkKind, card: this.env().card, speed, phone };
  }

  update(nowMs: number): void {
    const { city, cityNo, speed } = this.env();
    const key = `${cityNo}:${city.year}`;
    if (city !== this.city || this.dirty.changed('year', key)) {
      const over = city === this.city;
      this.dirty.changed('year', key);
      this.city = city;
      this.tipNow = null;
      this.runner.load(scriptFor(city.def, city.year), stageOf({ city }) < 0, over);
    }
    const v = this.look(nowMs);
    this.view = v;
    if (speed !== this.lastSpeed && speed > 0 && this.lastSpeed === 0) this.runner.release();
    this.lastSpeed = speed;
    this.frame = this.env().world ? this.pickFrame(v, nowMs) : null;
    this.pace(this.frame, speed);
    this.camera(this.frame);
    this.parts2classes();
    this.layer.show(this.frame);
    this.layer.draw(nowMs);
    this.drawBox(nowMs);
  }

  private pickFrame(v: GuideView, nowMs: number): Frame | null {
    const step = this.runner.tick(v, nowMs);
    const t = this.tipNow;
    if (t && (nowMs > t.until0 || t.until(v))) this.tipNow = null;
    if (this.tipNow && (!step || !step.pause || step.id === 'find-it')) {
      const tip = this.tipNow;
      return { ...NONE, id: `tip${tip.id}`, who: tip.who ?? 'dewy', why: tip.why ?? '', say: tip.say(v), ok: 'OK', target: tip.target(v), look: tip.look ?? null, pause: step?.pause ?? false };
    }
    return step && this.stopped(step, v, nowMs) ? { ...step, id: `${step.id}!`, why: 'Time is stopped.', say: 'Press 1x to let it run.', target: { t: 'ui', sel: ['[data-k=sp1]'], tap: true } } : step;
  }

  /** A step that waits for the day, while the player has stopped the day. */
  private stopped(s: Frame, v: GuideView, nowMs: number): boolean {
    const still = v.speed === 0 && !s.pause && !s.ok && v.city.phase === 'day' && s.kind === 'step';
    if (!still) this.stoppedAt = nowMs;
    return still && nowMs - this.stoppedAt > STOPPED_MS;
  }

  private pace(f: Frame | null, speed: number): void {
    const hold = !!f?.pause;
    this.env().acts.pace(hold, f?.rate ?? 1);
    if (hold && speed > 1) this.env().acts.slow();
  }

  /** Watching needs no tool in hand: the buildings come back. */
  private handsFree(f: Frame | null): void {
    const world = this.env().world;
    if (!f || !world?.tool || f.pause || f.kind === 'tip' || f.id.startsWith('coach-') || f.target?.t === 'tool') return;
    world.setTool(null);
  }

  /** Bring what a new step is about into the free part of the screen. */
  private camera(f: Frame | null): void {
    const world = this.env().world;
    const id = f?.id ?? '';
    if (id === this.lookedAt) return;
    this.lookedAt = id;
    this.handsFree(f);
    if (!world || !f?.look || f.look.length === 0) return;
    const xs = f.look.map((p) => p.x);
    const ys = f.look.map((p) => p.y);
    const at = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
    const a = world.screenOf(at);
    const b = world.screenOf({ x: at.x + 100, y: at.y });
    if (!a || !b) return;
    const now = (b.x - a.x) / 100;
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    const fit = Math.min((this.root.clientWidth - LOOK_PAD.w * 2) / Math.max(1, w), (this.root.clientHeight - LOOK_PAD.h * 2) / Math.max(1, h));
    const zoom = Math.max(MIN_LOOK_ZOOM, Math.min(now, fit, MAX_LOOK_ZOOM));
    world.focusOn(at, { ms: LOOK_MS, zoom });
  }

  private parts2classes(): void {
    const p = this.parts;
    for (const part of PARTS) this.root.classList.toggle(`gh-${part}`, p !== null && !p.has(part));
    this.root.classList.toggle('guiding', this.busy);
    this.root.classList.toggle('gheld', !!this.frame?.pause);
  }

  private drawBox(nowMs: number): void {
    const f = this.frame;
    this.box.hidden = !f;
    if (!f) return;
    const html = boxHtml(f);
    const fresh = this.dirty.changed('id', f.id);
    if (this.dirty.changed('html', html)) this.box.innerHTML = html;
    if (fresh) {
      this.box.className = `gbox paper ${f.kind}`;
      this.box.style.animation = 'none';
      void this.box.offsetWidth;
      this.box.style.animation = '';
      if (f.kind === 'reward') this.env().acts.sfx('stamp');
      this.scrollTo(f.target);
    }
    if (fresh || nowMs - this.placedAt > PLACE_EVERY_MS) this.place(nowMs);
  }

  private scrollTo(t: Target | null): void {
    if (t?.t !== 'ui') return;
    for (const s of t.sel) {
      const el = this.root.querySelector<HTMLElement>(s);
      if (el?.offsetParent) return el.scrollIntoView({ block: 'nearest' });
    }
  }

  /** Put the box where it hides neither the target nor the panels in use. */
  private place(nowMs: number): void {
    this.placedAt = nowMs;
    const rr = this.root.getBoundingClientRect();
    const size = { w: this.box.offsetWidth, h: this.box.offsetHeight };
    const W = rr.width;
    const H = rr.height;
    const card = this.env().card !== null;
    const bar = this.root.querySelector('.hud .bar');
    const top = (card || !bar ? 0 : boxOf(bar, rr).y + boxOf(bar, rr).h) + PAD + 6;
    const bottom = H - size.h - PAD - 4;
    const mid = (W - size.w) / 2;
    const tools = this.root.querySelector<HTMLElement>('.hud .tools');
    const left = tools && tools.offsetParent && !card ? Math.min(boxOf(tools, rr).x + boxOf(tools, rr).w + PAD, 290) : PAD;
    const right = W - size.w - PAD;
    const places = [{ x: mid, y: bottom }, { x: left, y: bottom }, { x: mid, y: top }, { x: left, y: top }, { x: right, y: bottom }, { x: right, y: top }, { x: left, y: (H - size.h) / 2 }];
    const avoid: { box: Box; weight: number }[] = [];
    if (this.layer.targetBox) avoid.push({ box: grow(this.layer.targetBox, 12), weight: 6 });
    const add = (sel: string, weight: number): void => { for (const el of this.root.querySelectorAll<HTMLElement>(sel)) if (el.offsetParent) avoid.push({ box: boxOf(el, rr), weight }); };
    add('.hud .sel', 3);
    add('.hud .ghostbar', 4);
    add('.hud .kinds', 4);
    add('.hud .adv', 3);
    add('.cards .foot', 2);
    const t = this.frame?.target;
    if (!t || t.t === 'ui' || t.t === 'tool') add('.hud .tools', 1);
    const p = places[bestPlace(places, size, avoid)]!;
    this.box.style.left = `${Math.round(Math.max(PAD, Math.min(p.x, right)))}px`;
    this.box.style.top = `${Math.round(Math.max(PAD, p.y))}px`;
  }

  /** The map moved: what is pinned to it follows in the same frame. */
  pinned(): void {
    this.layer.draw(performance.now());
  }

  /** Space the box takes at the bottom, for the camera. */
  get bottomCover(): number {
    if (this.box.hidden) return 0;
    return this.box.offsetTop > this.root.clientHeight / 2 ? this.root.clientHeight - this.box.offsetTop + PAD : 0;
  }

  hide(): void {
    this.frame = null;
    this.city = null;
    this.layer.show(null);
    this.box.hidden = true;
    for (const part of PARTS) this.root.classList.remove(`gh-${part}`);
    this.root.classList.remove('guiding', 'gheld');
  }
}
