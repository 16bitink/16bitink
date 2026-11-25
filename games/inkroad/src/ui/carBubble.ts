import type { WorldPort } from '../app/worldPort';
import type { CityView } from '../sim/types';
import { esc } from './dom';
import { pic } from './pics';

/**
 * What a driver says, over the driver's car: now and then somebody in a queue
 * speaks up, one at a time; a tapped car speaks until you let go.
 */
const FIRST_MS = 5000;
const GAP_MS = [7000, 12000] as const;
const SAY_MS = 5200;
const MARGIN = 10;
const DROVE_OFF = 70; // css px: the queue moved, so the talk is over
const TOP_ROOM = 150; // below this a bubble hangs under its car

interface Talk { readonly slot: number; readonly uid: number; readonly until: number; readonly tapped: boolean }

export class CarBubble {
  private talk: Talk | null = null;
  private nextMs = -1;
  private lastText = '';
  private turn = 0;
  private from: { readonly x: number; readonly y: number } | null = null;

  constructor(private readonly el: HTMLElement, private readonly world: () => WorldPort | null, private readonly free: () => { readonly left: number; readonly right: number }) {
    el.hidden = true;
  }

  update(city: CityView, nowMs: number, busy: boolean): void {
    const w = this.world();
    if (!w || city.phase !== 'day') return this.hide();
    const s = w.selection;
    if (s?.kind === 'car') {
      const uid = s.uid ?? city.cars.uid[s.slot]!;
      if (!this.talk || this.talk.uid !== uid) this.say(city, { slot: s.slot, uid, until: Infinity, tapped: true });
    } else if (this.talk?.tapped) this.hide();
    if (this.talk && !this.talk.tapped && (busy || nowMs > this.talk.until || this.onTag())) this.hide();
    if (this.talk) return;
    if (this.nextMs < 0) this.nextMs = nowMs + FIRST_MS;
    if (busy || nowMs < this.nextMs) return;
    this.nextMs = nowMs + GAP_MS[0] + (GAP_MS[1] - GAP_MS[0]) * ((this.turn++ * 0.618) % 1);
    const t = w.talker();
    if (t) this.say(city, { ...t, until: nowMs + SAY_MS, tapped: false });
  }

  private say(city: CityView, t: Talk): void {
    const d = city.driver(t.slot);
    if (!d || (!t.tapped && d.text === this.lastText)) return;
    this.lastText = d.text;
    this.talk = t;
    this.from = null;
    this.el.innerHTML = `${pic(`resident-${d.animal}`)}<div><small>${esc(d.who)}</small><p>${esc(d.text)}</p></div>`;
    this.el.hidden = false;
    this.el.classList.remove('in');
    void this.el.offsetWidth;
    this.el.classList.add('in');
    this.draw();
  }

  /** Over a jam tag: the tag matters more. */
  private onTag(): boolean {
    const b = this.el.getBoundingClientRect();
    return [...this.el.parentElement!.querySelectorAll('.jamtag button')].some((t) => {
      const r = t.getBoundingClientRect();
      return r.width > 0 && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
    });
  }

  private hide(): void {
    if (!this.talk) return;
    this.talk = null;
    this.el.hidden = true;
  }

  /** Follow the car. Every drawn frame. */
  draw(): void {
    if (!this.talk) return;
    const w = this.world();
    const p = w?.carAt(this.talk.slot, this.talk.uid);
    if (!p) {
      if (this.talk.tapped) w?.select(null);
      return this.hide();
    }
    this.from ??= p;
    if (!this.talk.tapped && Math.hypot(p.x - this.from.x, p.y - this.from.y) > DROVE_OFF) return this.hide();
    const box = this.el.parentElement!;
    const half = this.el.offsetWidth / 2;
    const { left, right } = this.free();
    const x = Math.min(box.clientWidth - right - half - MARGIN, Math.max(left + half + MARGIN, p.x));
    const below = p.y < TOP_ROOM;
    this.el.classList.toggle('below', below);
    this.el.style.setProperty('--tail', `${Math.round(Math.min(half - 22, Math.max(22 - half, p.x - x)))}px`);
    this.el.style.transform = `translate3d(${Math.round(x - half)}px,${Math.round(p.y + (below ? 20 : -16 - this.el.offsetHeight))}px,0)`;
  }
}
