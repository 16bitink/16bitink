/** A card's body as panes: two columns on a laptop, one tab at a time on a phone. */
export interface Pane { readonly id: string; readonly label: string; readonly col: 0 | 1; readonly html: string; readonly full?: boolean }

const tabBar = (panes: readonly Pane[], tab: number): string =>
  `<div class="tabs">${panes.map((p, i) => `<button class="btn tab${i === tab ? ' on' : ''}" data-act="tab" data-v="${i}" data-tab="${p.id}">${p.label}</button>`).join('')}</div>`;

/** Empty panes are dropped; on a phone the active one shows under a tab bar. */
export function panesHtml(all: readonly Pane[], phone: boolean, tab: number): string {
  const panes = all.filter((p) => p.html.trim() !== '');
  if (phone) {
    const i = Math.min(Math.max(0, tab), panes.length - 1);
    return `${panes.length > 1 ? tabBar(panes, i) : ''}<div class="pane" data-pane="${panes[i]?.id ?? ''}">${panes[i]?.html ?? ''}</div>`;
  }
  const col = (c: 0 | 1): string => panes.filter((p) => !p.full && p.col === c).map((p) => `<div class="pane" data-pane="${p.id}">${p.html}</div>`).join('');
  return `${panes.filter((p) => p.full).map((p) => `<div class="pane" data-pane="${p.id}">${p.html}</div>`).join('')}<div class="cols"><div class="col">${col(0)}</div><div class="col">${col(1)}</div></div>`;
}

export const paneCount = (all: readonly Pane[]): number => all.filter((p) => p.html.trim() !== '').length;
