import type { Ghost, WorldPort } from '../app/worldPort';
import { Dirty, esc, Router } from './dom';
import { num } from './format';

/** The bar under a drawn, unbuilt change: price, works, warning, Build and Cancel. */
export class GhostBar {
  private readonly dirty = new Dirty();

  constructor(private readonly el: HTMLElement, router: Router, private readonly world: () => WorldPort | null, private readonly onBuilt: () => void, private readonly onRefused: (why: string) => void) {
    router.add({ build: () => this.build(), cancel: () => this.world()?.cancel(), undo: () => this.world()?.undoStop() });
  }

  /** Build what the ghost shows (the Build button, or Enter once the road is finished). */
  build(): void {
    const g = this.world()?.ghost;
    if (!g || g.dragging) return;
    const q = this.world()?.confirm();
    if (!q) return;
    if (q.ok) this.onBuilt();
    else this.onRefused(q.why ?? 'That cannot be built.');
  }

  update(g: Ghost | null, money: number): void {
    this.el.hidden = !g;
    const key = g ? `${g.label}|${g.quote.ok}|${g.quote.cost}|${g.quote.land}|${g.quote.works}|${g.quote.warn ?? ''}|${g.quote.note ?? ''}|${g.quote.why ?? ''}|${g.dragging}|${g.undoable ?? false}|${money >= g.quote.cost}` : '';
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
      ${g.undoable ? '<button class="btn" data-act="undo">Undo</button>' : ''}
      <button class="btn" data-act="cancel">Cancel</button>
      <button class="btn go" data-act="build" ${!q.ok || g.dragging ? 'disabled' : ''}>Build</button>`;
  }
}

const ROAD_NAMES: Readonly<Record<string, string>> = { street: 'Street', avenue: 'Avenue', boulevard: 'Boulevard', highway: 'Highway' };

/** The slim bar while a road tool is in hand and nothing is drawn: what to do next. */
export class HintBar {
  private readonly dirty = new Dirty();

  constructor(private readonly el: HTMLElement, router: Router, private readonly world: () => WorldPort | null) {
    router.add({ done: () => this.world()?.setTool(null), 'hint-undo': () => this.world()?.undoStop(), 'hint-cancel': () => this.world()?.cancel() });
  }

  /** The words and buttons for a road tool in hand; null when no bar belongs. */
  static content(tool: string | null, touch: boolean, points: number): { text: string; buttons: string } | null {
    const name = tool ? ROAD_NAMES[tool] : undefined;
    if (!name) return null;
    const btn = (act: string, label: string): string => `<button class="btn" data-act="${act}">${label}</button>`;
    if (points > 0) {
      return { text: `${name}: ${touch ? 'tap where it bends or ends' : 'click where it ends'}`, buttons: (touch ? btn('hint-undo', 'Undo') : '') + btn('hint-cancel', 'Cancel') };
    }
    return touch ? { text: `${name}: tap to start, tap to bend`, buttons: btn('done', 'Done') } : { text: `${name}: click to start, click to bend, Enter to build, Esc to stop`, buttons: '' };
  }

  update(tool: string | null, ghost: boolean, touch: boolean, points: number): void {
    const c = ghost ? null : HintBar.content(tool, touch, points);
    this.el.hidden = !c;
    if (!c || !this.dirty.changed('h', `${c.text}|${c.buttons}`)) return;
    this.el.innerHTML = `<div class="info"><b>${esc(c.text)}</b></div>${c.buttons}`;
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
