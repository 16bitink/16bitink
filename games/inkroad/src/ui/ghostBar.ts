import type { Ghost, WorldPort } from '../app/worldPort';
import { Dirty, esc, Router } from './dom';
import { num } from './format';

/** The bar under a drawn, unbuilt change: price, works, warning, Build and Cancel. */
export class GhostBar {
  private readonly dirty = new Dirty();

  constructor(private readonly el: HTMLElement, router: Router, private readonly world: () => WorldPort | null, private readonly onBuilt: () => void, private readonly onRefused: (why: string) => void) {
    router.add({
      build: () => {
        const q = this.world()?.confirm();
        if (!q) return;
        if (q.ok) this.onBuilt();
        else this.onRefused(q.why ?? 'That cannot be built.');
      },
      cancel: () => this.world()?.cancel(),
    });
  }

  update(g: Ghost | null, money: number): void {
    this.el.hidden = !g;
    const key = g ? `${g.label}|${g.quote.ok}|${g.quote.cost}|${g.quote.land}|${g.quote.works}|${g.quote.warn ?? ''}|${g.quote.note ?? ''}|${g.quote.why ?? ''}|${g.dragging}|${money >= g.quote.cost}` : '';
    if (!g || !this.dirty.changed('g', key)) return;
    const q = g.quote;
    const total = q.cost;
    const poor = total > money;
    const lines = [
      q.land > 0 ? `<span class="small dim">Includes <span class="coin">${num(q.land)}</span> for land</span>` : '',
      q.works > 0 ? `<span class="small dim">${q.works} ${q.works === 1 ? 'season' : 'seasons'} of road works</span>` : '',
      q.note ? `<span class="small note">${esc(q.note)}</span>` : '',
      q.warn ? `<span class="warn small">${esc(q.warn)}</span>` : '',
      !q.ok && q.why ? `<span class="why">${esc(q.why)}</span>` : '',
      q.ok && poor ? '<span class="why">Not enough money yet</span>' : '',
    ].join('');
    this.el.innerHTML = `<div class="info"><b>${esc(g.label)} <span class="coin">${num(total)}</span></b>${lines}</div>
      <button class="btn" data-act="cancel">Cancel</button>
      <button class="btn go" data-act="build" ${!q.ok || g.dragging ? 'disabled' : ''}>Build</button>`;
  }
}

const PARK_NAMES: Readonly<Record<string, string>> = { lot: 'Surface', multi: 'Multi-storey', under: 'Underground', ride: 'Park and ride' };

/** While the car park tool is held: which kind to place. */
export class KindBar {
  private readonly dirty = new Dirty();
  /** The kind in hand. */
  current = 'lot';

  constructor(private readonly el: HTMLElement, router: Router, private readonly world: () => WorldPort | null) {
    router.add({ park: (v) => { this.current = v; this.world()?.setTool('parking', { park: v as 'lot' }); } });
  }

  update(tool: string | null, kinds: readonly string[], ghost: boolean): void {
    if (tool !== 'parking') this.current = 'lot';
    const show = tool === 'parking' && !ghost && kinds.length > 1;
    this.el.hidden = !show;
    if (!show || !this.dirty.changed('k', kinds.join())) return;
    this.el.innerHTML = kinds.map((k) => `<button class="btn sm" data-act="park" data-v="${k}">${PARK_NAMES[k] ?? k}</button>`).join('');
  }
}
