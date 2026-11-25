import type { Selection, WorldPort } from '../app/worldPort';
import { Dirty, Router } from './dom';
import { beachPanel } from './panels/beach';
import { carParkPanel, carPanel, linePanel, lotPanel, MAX_VEHICLES } from './panels/misc';
import { junctionPanel, moveSplit } from './panels/junction';
import { roadPanel, roadSwitch } from './panels/road';
import { pct } from './format';
import type { PanelCtx } from './panels/shared';
import type { CityView } from '../sim/types';

export const LIVE_MS = 1000;
const X_BUTTON = '<button class="btn x" data-act="deselect" aria-label="Close">x</button>';

/** The selection panel: what the player tapped, with its numbers and levers. Redraws once a second, never while a thumb is on it. */
export class SelectionPanel {
  private readonly dirty = new Dirty();
  private holding = false;
  private lastDraw = 0;
  private sel: Selection = null;
  private ctx!: PanelCtx;

  constructor(private readonly el: HTMLElement, router: Router, private readonly world: () => WorldPort | null, private readonly refresh: () => PanelCtx) {
    el.addEventListener('pointerdown', () => {
      this.holding = true;
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave'] as const) el.addEventListener(ev, () => {
      this.holding = false;
    });
    router.add({
      deselect: () => this.world()?.select(null),
      control: (v) => this.node((id) => {
        if (this.ctx.acts.apply({ t: 'control', node: id, control: v as 'yield' }).ok) this.world()?.select(null); // stand back and watch it
      }, false),
      split: (v, input) => this.node((id) => {
        const s = moveSplit(this.ctx, id, Number(input.dataset.i), Number(v));
        s?.forEach((x, i) => {
          const b = this.el.querySelector(`[data-k="split-${i}"]`);
          if (b) b.textContent = pct(x);
        });
      }, false),
      flyover: (v) => this.node((id) => {
        const [fromRoad, toRoad] = v.split(':').map(Number);
        this.world()?.startFlyover(id, v && fromRoad !== undefined && toRoad !== undefined ? { fromRoad, toRoad } : null);
      }, false),
      upgrade: (v) => this.road((id) => this.ctx.acts.apply({ t: 'upgrade', road: id, type: v as 'street' }), true),
      squareRoad: () => this.road((id) => this.ctx.acts.apply({ t: 'square', road: id }), true),
      removeRoad: () => this.road((id) => this.ctx.acts.apply({ t: 'remove', road: id }), true, true),
      road: (v) => this.roadSwitch(v),
      mend: (v) => this.road((id) => this.ctx.acts.apply({ t: v === 'repair' ? 'repair' : 'replace', road: id }), true),
      boulevard: () => this.road((id) => this.ctx.acts.apply({ t: 'boulevard', road: id }), true),
      mini: (v) => this.on('line', (id) => this.ctx.acts.apply({ t: 'minibus', line: id, deal: v === 'buyOut' ? 'buyOut' : 'license' }), true),
      removePark: () => this.on('carPark', (id) => this.ctx.acts.apply({ t: 'removePark', park: id }), true),
      removeLine: () => this.on('line', (id) => this.ctx.acts.apply({ t: 'removeLine', line: id }), true),
      veh: (v) => this.on('line', (id) => {
        const l = this.ctx.city.lines.find((x) => x.id === id);
        if (l) this.ctx.acts.apply({ t: 'lineVehicles', line: id, vehicles: Math.min(MAX_VEHICLES, Math.max(1, l.vehicles + Number(v))) });
      }, true),
    });
  }

  private on(kind: 'carPark' | 'line' | 'junction' | 'road', fn: (id: number) => void, redraw: boolean, clear = false): void {
    const s = this.sel;
    if (!s || s.kind !== kind) return;
    fn(s.id);
    if (clear) this.world()?.select(null);
    else if (redraw) this.draw(true);
  }

  private node(fn: (id: number) => void, redraw: boolean): void {
    this.on('junction', fn, redraw);
  }

  private road(fn: (id: number) => void, redraw: boolean, clear = false): void {
    this.on('road', fn, redraw, clear);
  }

  private roadSwitch(which: string): void {
    this.road((id) => {
      const r = this.ctx.city.roads.find((x) => x.id === id);
      const cmd = r ? roadSwitch(r, which) : null;
      if (cmd) this.ctx.acts.apply(cmd);
    }, true);
  }

  update(sel: Selection, city: CityView, nowMs: number): void {
    this.ctx = this.refresh();
    const key = sel ? `${sel.kind}:${'id' in sel ? sel.id : sel.slot}` : '';
    const moved = this.dirty.changed('sel', key);
    this.sel = sel;
    this.el.hidden = !sel;
    if (!sel) return;
    if (moved || (!this.holding && nowMs - this.lastDraw > LIVE_MS)) this.draw(moved || !this.holding, city);
  }

  private draw(force: boolean, _city?: CityView): void {
    const s = this.sel;
    if (!s || (!force && this.holding)) return;
    this.lastDraw = performance.now();
    const c = this.ctx;
    const body = s.kind === 'car' ? carPanel(c, s.slot) : s.kind === 'junction' ? junctionPanel(c, s.id) : s.kind === 'road' ? roadPanel(c, s.id)
      : s.kind === 'carPark' ? carParkPanel(c, s.id) : s.kind === 'lot' ? lotPanel(c, s.id) : s.kind === 'beach' ? beachPanel(c, s.id) : linePanel(c, s.id);
    const top = this.el.scrollTop;
    this.el.innerHTML = X_BUTTON + body;
    this.el.scrollTop = top;
  }
}
