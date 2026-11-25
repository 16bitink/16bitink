import type { Letter, Prices } from '../sim/types';
import { Router } from './dom';
import { shownYear } from './format';
import { beachCard } from './cards/beach';
import { cityDoneCard } from './cards/cityDone';
import { letterCard } from './cards/letter';
import { replacedCard } from './cards/replaced';
import { reviewCard } from './cards/review';
import { STAMP_GAP_S, STAMP_START_S, platesEarned, yearEndCard } from './cards/yearEnd';
import { yearStartCard } from './cards/yearStart';
import type { UiEnv } from './types';

export type CardKind = 'yearStart' | 'review' | 'yearEnd' | 'letter' | 'replaced' | 'cityDone';
const POLICY_KEYS = ['inspectors', 'taxis'] as const;

interface Extra { readonly letter?: { readonly l: Letter; readonly n: number }; readonly then?: () => void }

/** The card layer: shows one card at a time over a dimmed map, redraws it after each choice. */
export class Cards {
  private kindNow: CardKind | null = null;
  private peek = false;
  private pickYear = false;
  private animate = true;
  private tab = 0;
  private waited = false;
  /** The beach whose outcome was read. */
  private beachRead = '';
  private extra: Extra = {};
  private timers: ReturnType<typeof setTimeout>[] = [];
  private readonly router: Router;

  constructor(private readonly layer: HTMLElement, private readonly env: () => UiEnv, private readonly nextCity: () => string | null) {
    this.router = new Router(layer);
    this.router.set(this.acts());
    layer.hidden = true;
  }

  get kind(): CardKind | null {
    return this.kindNow;
  }

  show(kind: CardKind, extra: Extra = {}): void {
    this.clearTimers();
    this.kindNow = kind;
    this.extra = extra;
    this.peek = false;
    this.pickYear = false;
    this.animate = true;
    this.tab = 0;
    this.waited = false;
    this.beachRead = '';
    this.draw();
    if (kind === 'yearEnd') this.scheduleStamps();
    if (kind === 'replaced' || kind === 'letter') this.env().acts.sfx('letter');
    this.animate = false;
  }

  hide(): void {
    this.clearTimers();
    this.kindNow = null;
    this.layer.hidden = true;
    this.layer.innerHTML = '';
  }

  /** Redraws the open card from the city's current numbers. */
  redraw(): void {
    if (this.kindNow) this.draw();
  }

  private draw(): void {
    const env = this.env();
    const html = this.html(env);
    this.layer.hidden = false;
    this.layer.classList.toggle('peeking', this.peek);
    const top = this.layer.querySelector('.cbody')?.scrollTop ?? 0;
    this.layer.innerHTML = html;
    const card = this.layer.firstElementChild;
    if (card && !this.animate) card.classList.add('still');
    const body = this.layer.querySelector('.cbody');
    if (body) body.scrollTop = top;
  }

  private html(env: UiEnv): string {
    switch (this.kindNow) {
      case 'yearStart': {
        const b = env.city.beach;
        return b && this.beachRead !== b.id ? beachCard(env, b) : yearStartCard(env);
      }
      case 'review': return reviewCard(env, this.tab, this.waited);
      case 'yearEnd': return yearEndCard(env, this.animate, this.tab);
      case 'letter': return this.extra.letter ? letterCard(this.extra.letter.l, this.extra.letter.n, shownYear(env.city, this.extra.letter.l.year)) : '';
      case 'replaced': return replacedCard(env, this.peek, this.pickYear);
      case 'cityDone': return cityDoneCard(env, this.nextCity());
      default: return '';
    }
  }

  private scheduleStamps(): void {
    const got = platesEarned(this.env().city);
    const at = (i: number): number => (STAMP_START_S + i * STAMP_GAP_S) * 1000;
    [0, 1, 2].forEach((i) => got[i] && this.timers.push(setTimeout(() => this.env().acts.sfx('stamp'), at(i))));
    this.timers.push(setTimeout(() => this.env().acts.sfx('stamp'), at(3)));
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  private acts(): Record<string, (v: string, el: HTMLElement) => void> {
    const apply = (c: Parameters<UiEnv['acts']['apply']>[0]): void => {
      this.env().acts.apply(c);
      this.redraw();
    };
    return {
      next: () => this.env().acts.next(),
      close: () => {
        const then = this.extra.then;
        this.hide();
        then?.();
      },
      price: (v) => {
        const [key, dir] = v.split(':') as [keyof Prices, string];
        const { city } = this.env();
        const lim = city.priceLimits[key];
        const val = Math.min(lim.max, Math.max(lim.min, city.prices[key] + Number(dir) * lim.step));
        apply({ t: 'prices', prices: { [key]: val } });
      },
      pol: (v) => this.policy(v, apply),
      quota: (v) => {
        const l = this.env().city.special?.licences;
        if (l) apply({ t: 'licences', quota: Math.min(l.max, Math.max(l.min, l.quota + Number(v) * l.step)) });
      },
      tollmax: (v) => {
        const t = this.env().city.special?.speedTolls;
        if (t) apply({ t: 'tollLimit', max: Math.min(t.maxRange.max, Math.max(t.maxRange.min, t.max + Number(v))) });
      },
      commission: (v) => {
        const [id, take] = v.split(':');
        apply({ t: 'commission', id: id!, take: take === '1' });
      },
      tab: (v) => {
        this.tab = Number(v);
        this.draw();
      },
      beach: (v) => {
        const b = this.env().city.beach;
        if (!b || b.done) return;
        apply({ t: 'beach', id: b.id, advice: v as 'sell' | 'public' | 'out' });
        this.env().acts.sfx('stamp');
      },
      beachok: () => {
        this.beachRead = this.env().city.beach?.id ?? '';
        this.draw();
      },
      vote: () => apply({ t: 'vote', keep: true }),
      wait: () => {
        this.waited = true;
        this.draw();
      },
      tech: (v) => apply({ t: 'tech', id: v }),
      float: (v) => apply({ t: 'float', stream: v as 'parking' | 'tolls' }),
      spot: (v) => {
        const spot = this.env().city.replacedWhy?.spots[Number(v)];
        if (spot) this.env().world?.focusOn(spot.at);
        this.peek = true;
        this.draw();
      },
      unpeek: () => {
        this.peek = false;
        this.draw();
      },
      pickyear: () => {
        this.pickYear = !this.pickYear;
        this.draw();
      },
      retry: (v) => this.env().acts.retryYear(Number(v)),
      desk: () => this.env().acts.toDesk(),
      buy: () => this.env().acts.buy(this.kindNow === 'cityDone' ? 'free_end' : 'locked'),
    };
  }

  private policy(v: string, apply: (c: Parameters<UiEnv['acts']['apply']>[0]) => void): void {
    const [key, d] = v.split(':') as [string, string];
    const cur = this.env().city.policies;
    if ((POLICY_KEYS as readonly string[]).includes(key)) {
      const k = key as (typeof POLICY_KEYS)[number];
      apply({ t: 'policies', policies: { [k]: Math.max(0, cur[k] + Number(d)) } });
    } else {
      const k = key as 'permits' | 'truckHours' | 'nightWorks';
      apply({ t: 'policies', policies: { [k]: !cur[k] } });
    }
  }
}
