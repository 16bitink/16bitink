import { ALL_LOOKS, type Look, type LookSlot } from '../app/milestones';
import { artUrl } from '../render/art';
import { esc, render } from './dom';

/**
 * Skip's looks: rafts and stone trails earned by days played (3, 7, 14, 30,
 * 50, 100). Earned looks are kept for good; the panel only picks which one
 * Skip wears. Unearned ones show how many days they need.
 */
export interface WardrobeData {
  readonly totalDays: number;
  readonly raft: string;
  readonly trail: string;
}

export interface WardrobeActs {
  pick(slot: LookSlot, key: string): void;
  back(): void;
}

function lookHtml(l: Look, d: WardrobeData, i: number): string {
  const earned = l.days <= d.totalDays;
  const on = (l.slot === 'raft' ? d.raft : d.trail) === l.key;
  const pic = l.key ? artUrl(l.key) : (l.slot === 'raft' ? artUrl('raft-plain') : null);
  const style = pic ? `background-image:url(${pic})` : `background:${l.slot === 'raft' ? '#9a6a3a' : '#ece0c4'}`;
  const label = earned ? esc(l.name) : `${esc(l.name)}<br><span class="t18 dim">${l.days} days</span>`;
  return `<button class="look${on ? ' on' : ''}" data-act="l${i}" ${earned ? '' : 'disabled'}><span class="pic" style="${style}"></span>${label}</button>`;
}

export function showWardrobe(root: HTMLElement, d: WardrobeData, a: WardrobeActs): void {
  const acts: Record<string, () => void> = { back: a.back };
  ALL_LOOKS.forEach((l, i) => (acts[`l${i}`] = () => a.pick(l.slot, l.key)));
  const section = (slot: LookSlot, title: string): string =>
    `<h3 class="t32">${title}</h3><div class="looks">${ALL_LOOKS.map((l, i) => (l.slot === slot ? lookHtml(l, d, i) : '')).join('')}</div>`;
  render(root, 'card', `<div class="panel col" style="width:min(560px,96vw)">
    <h2 class="t44" style="text-align:center">Skip's looks</h2>
    <p class="center" style="text-align:center">${d.totalDays} ${d.totalDays === 1 ? 'day' : 'days'} played. Every daily you play counts, in any game.</p>
    ${section('raft', 'Rafts')}${section('trail', 'Stone trails')}
    <div class="row center"><button class="btn" data-act="back">Done</button></div>
  </div>`, acts);
}
