import type { ToolId } from '../sim/types';
import { esc, Router } from './dom';
import { pic } from './pics';

export const TOOL_NAMES: Readonly<Record<ToolId, string>> = {
  street: 'Street', avenue: 'Avenue', boulevard: 'Boulevard', highway: 'Highway', remove: 'Remove', junction: 'Junction', flyover: 'Flyover',
  underpass: 'Underpass', kerb: 'Kerb bays', parking: 'Car park', toll: 'Toll gate', bus: 'Bus line', buslane: 'Bus lane', tram: 'Tram',
  metro: 'Metro', boat: 'Water bus', oneway: 'One way', square: 'Square', zone: 'Zone charge',
};

export const TOOL_GROUPS: readonly { readonly name: string; readonly tools: readonly ToolId[] }[] = [
  { name: 'Roads', tools: ['street', 'avenue', 'boulevard', 'highway', 'oneway', 'square', 'remove'] },
  { name: 'Junctions', tools: ['junction', 'flyover', 'underpass'] },
  { name: 'Parking', tools: ['kerb', 'parking'] },
  { name: 'Prices', tools: ['toll', 'zone'] },
  { name: 'Transit', tools: ['bus', 'buslane', 'tram', 'metro', 'boat'] },
];

export const TOOL_SHORT: Readonly<Record<ToolId, string>> = {
  street: 'Street', avenue: 'Avenue', boulevard: 'Boulevard', highway: 'Highway', remove: 'Remove', junction: 'Junction', flyover: 'Flyover',
  underpass: 'Underpass', kerb: 'Kerb', parking: 'Car park', toll: 'Toll', bus: 'Bus', buslane: 'Bus lane', tram: 'Tram', metro: 'Metro', boat: 'Ferry',
  oneway: 'One way', square: 'Square', zone: 'Zone',
};

export const MAX_TOOLS = 19;
const MAX_COLS = 3;
const ONE_ROW = 5;
/** Up to this many tools the bar stays open; more and it folds into group buttons. */
export const OPEN_BAR_MAX = 4;
const PHONE_ONLY_LABEL = (name: string): string => `<span class="tl">${name}</span>`;

/** The groups that have an unlocked tool, with those tools (at most MAX_TOOLS in all). */
export function visibleGroups(unlocked: readonly ToolId[]): { name: string; tools: ToolId[] }[] {
  let left = MAX_TOOLS;
  const out: { name: string; tools: ToolId[] }[] = [];
  for (const g of TOOL_GROUPS) {
    const tools = g.tools.filter((t) => unlocked.includes(t)).slice(0, left);
    left -= tools.length;
    if (tools.length) out.push({ name: g.name, tools });
  }
  return out;
}

/** Columns of the panel, so it hugs its buttons: one row while there are few, then three. */
export function columns(sizes: readonly number[]): number {
  const total = sizes.reduce((a, b) => a + b, 0);
  return total <= ONE_ROW ? total : MAX_COLS;
}

const toolButton = (t: ToolId, fresh: boolean): string =>
  `<button class="btn tbtn" data-act="tool" data-v="${t}" data-k="tool-${t}" title="${esc(TOOL_NAMES[t])}" aria-label="${esc(TOOL_NAMES[t])}">${pic(`tool-${t}`)}<span class="tl">${esc(TOOL_SHORT[t])}</span>${fresh ? '<span class="ribbon">NEW</span>' : ''}</button>`;

/** The toolbar: groups of tools, each collapsing to one group button on a phone. */
export class Toolbar {
  private key = '';
  private openGroup = '';

  constructor(private readonly el: HTMLElement, router: Router, private readonly pick: (t: ToolId | null) => void) {
    router.add({
      tool: (v, b) => this.pick(b.classList.contains('on') ? null : (v as ToolId)),
      group: (v) => {
        this.openGroup = this.openGroup === v ? '' : v;
        this.syncOpen();
      },
    });
  }

  /** Redraws when the unlocked tools or the new ones change. */
  render(unlocked: readonly ToolId[], fresh: readonly ToolId[]): void {
    const key = `${unlocked.join()}|${fresh.join()}`;
    if (key === this.key) return;
    this.key = key;
    const groups = visibleGroups(unlocked);
    this.el.hidden = groups.length === 0;
    this.el.classList.toggle('slim', groups.reduce((n, g) => n + g.tools.length, 0) > OPEN_BAR_MAX);
    const cols = columns(groups.map((g) => g.tools.length));
    this.el.style.setProperty('--cols', String(cols));
    this.el.innerHTML = groups.map((g) => `<div class="tgrp" data-g="${g.name}" style="--n:${Math.min(cols, g.tools.length)}"><span class="gname">${g.name}</span>
      <button class="btn gbtn" data-act="group" data-v="${g.name}" aria-label="${g.name}" title="${g.name}">${pic(`tool-${g.tools[0]}`)}${PHONE_ONLY_LABEL(g.name)}${g.tools.some((t) => fresh.includes(t)) ? '<span class="ribbon">NEW</span>' : ''}</button>
      <div class="trow">${g.tools.map((t) => toolButton(t, fresh.includes(t))).join('')}</div></div>`).join('');
    this.syncOpen();
  }

  private syncOpen(): void {
    for (const g of this.el.querySelectorAll<HTMLElement>('.tgrp')) g.classList.toggle('open', g.dataset.g === this.openGroup);
  }

  /** Marks the held tool, and closes the phone popover once a tool is chosen. */
  mark(tool: ToolId | null): void {
    for (const b of this.el.querySelectorAll<HTMLElement>('.tbtn')) b.classList.toggle('on', b.dataset.v === tool);
    for (const g of this.el.querySelectorAll<HTMLElement>('.tgrp')) g.classList.toggle('has-on', !!tool && !!g.querySelector(`[data-v="${tool}"]`));
    if (tool && this.openGroup) {
      this.openGroup = '';
      this.syncOpen();
    }
  }
}
