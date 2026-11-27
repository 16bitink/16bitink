import { esc } from '../dom';
import { pic } from '../pics';

export const OFFICIALS = {
  dewy: { name: 'Dewy', job: 'Traffic engineer' },
  miko: { name: 'Miko', job: 'Head of parking' },
  juma: { name: 'Juma', job: 'Buses and metro' },
  pim: { name: 'Pim', job: 'Treasurer' },
  sulo: { name: 'Sulo', job: 'Chair of the Council' },
} as const;
export type Official = keyof typeof OFFICIALS;

export interface Shell { readonly title: string; readonly sub?: string; readonly stamp?: string; readonly body: string; readonly foot: string; readonly cls?: string }

/** A paper card with tape, a title, an optional stamp, a body and a button row. */
export function cardHtml(s: Shell): string {
  return `<div class="card paper taped ${s.cls ?? ''}"><div class="head"><div><h2>${esc(s.title)}</h2>${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ''}</div>${s.stamp ?? ''}</div>
    <div class="cbody">${s.body}</div><div class="foot">${s.foot}</div></div>`;
}

/** One speech bubble; a second line from the same official has no portrait or caption of its own. */
export const speaker = (who: Official, text: string, again = false): string =>
  `<div class="speaker${again ? ' again' : ''}">${again ? '<span class="pic"></span>' : pic(`portrait-${who}`)}<div class="speech">${again ? '' : `<small>${OFFICIALS[who].name}, ${OFFICIALS[who].job.toLowerCase()}</small>`}${esc(text)}</div></div>`;

export const stamp = (text: string, cls = ''): string => `<span class="stamp ${cls}">${esc(text)}</span>`;
export const section = (title: string, html: string): string => `<div class="sec"><h3>${esc(title)}</h3>${html}</div>`;
