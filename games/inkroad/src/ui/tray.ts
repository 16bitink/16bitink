import { overlaysFor } from '../app/overlays';
import type { Overlay, WorldPort } from '../app/worldPort';
import type { Complaint, Letter } from '../sim/types';
import { Dirty, esc, Router } from './dom';
import { pic } from './pics';

const OVERLAY_NAMES: Readonly<Record<Exclude<Overlay, 'none'>, string>> = { flow: 'Flow', parking: 'Parking', anger: 'Anger', money: 'Money', condition: 'Repairs' };
/** Until the painter makes one: a cracked road in ink. */
const CONDITION_ICON = '<svg class="pic" viewBox="0 0 40 40"><rect x="4" y="9" width="32" height="22" rx="3" fill="#8b898f" stroke="#2a2832" stroke-width="2.5"/><path d="M12 9l5 8-4 5 6 9M27 9l-3 7 5 5" fill="none" stroke="#2a2832" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="31" cy="27" r="4" fill="#c8962a" stroke="#2a2832" stroke-width="2"/></svg>';
const overlayIcon = (o: Exclude<Overlay, 'none'>): string => (o === 'condition' ? CONDITION_ICON : pic(`ov-${o}`));
export const MAX_LETTERS = 3;
export const TICKER_MS = 5200;

/** Overlay buttons, the complaints ticker and the Council letters tray. */
export class Tray {
  private readonly dirty = new Dirty();
  private sorted: readonly Complaint[] = [];

  constructor(
    private readonly ovs: HTMLElement, private readonly ticker: HTMLElement, private readonly env: HTMLElement,
    router: Router, private readonly world: () => WorldPort | null, openLetter: (i: number) => void,
  ) {
    router.add({
      ov: (v) => {
        const w = this.world();
        if (w) w.setOverlay(w.overlay === v ? 'none' : (v as Overlay));
      },
      complaint: (v) => {
        const c = this.sorted[Number(v)];
        const w = this.world();
        if (c && w) w.focusOn(c.at);
      },
      letter: (v) => openLetter(Number(v)),
    });
  }

  private buttons(list: readonly Exclude<Overlay, 'none'>[]): void {
    this.ovs.innerHTML = list.map((o) => `<button class="btn iconbtn lab" data-act="ov" data-v="${o}" data-k="ov-${o}" title="${OVERLAY_NAMES[o]}" aria-label="${OVERLAY_NAMES[o]}">${overlayIcon(o)}<span class="tl">${OVERLAY_NAMES[o]}</span></button>`).join('');
  }

  update(complaints: readonly Complaint[], letters: readonly Letter[], overlay: Overlay, nowMs: number, ageing = false): void {
    const list = overlaysFor(ageing);
    if (this.dirty.changed('ovs', list.length)) this.buttons(list);
    for (const o of list) this.ovs.querySelector(`[data-k="ov-${o}"]`)?.classList.toggle('on', o === overlay);
    this.letters(letters);
    this.complaint(complaints, nowMs);
  }

  private letters(letters: readonly Letter[]): void {
    if (!this.dirty.changed('letters', letters)) return;
    this.env.hidden = letters.length === 0;
    const slots = Array.from({ length: MAX_LETTERS }, (_, i) =>
      letters[i] ? `<button class="btn" data-act="letter" data-v="${i}" aria-label="Council letter ${i + 1}">${pic('letter')}</button>` : '<span class="slot"></span>');
    this.env.innerHTML = `<span class="hand small dim">Letters</span>${slots.join('')}`;
  }

  private complaint(list: readonly Complaint[], nowMs: number): void {
    if (this.dirty.changed('complaints', list)) this.sorted = [...list].sort((a, b) => b.weight - a.weight);
    this.ticker.hidden = this.sorted.length === 0;
    if (!this.sorted.length) return;
    const i = Math.floor(nowMs / TICKER_MS) % this.sorted.length;
    if (!this.dirty.changed('tick', `${i}|${this.sorted[i]!.text}`)) return;
    const c = this.sorted[i]!;
    this.ticker.dataset.v = String(i);
    this.ticker.innerHTML = `${pic(`resident-${c.animal}`)}<div><p>${esc(c.text)}</p><small>${esc(c.who)}</small></div>`;
  }
}
