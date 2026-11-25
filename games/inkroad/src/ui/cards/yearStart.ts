import { briefing } from '../../guide/briefing';
import { esc } from '../dom';
import { shownYear } from '../format';
import { pic } from '../pics';
import type { UiEnv } from '../types';
import { cardHtml, speaker } from './shell';

const GOAL_ICON = '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="19" fill="#fffaf0" stroke="#2a2832" stroke-width="3"/><circle cx="24" cy="24" r="11" fill="none" stroke="#b83227" stroke-width="4"/><circle cx="24" cy="24" r="4" fill="#b83227"/></svg>';

const line = (icon: string, label: string, text: string): string => `<div class="bl">${icon}<div><small>${label}</small><p>${esc(text)}</p></div></div>`;

/** Year start: who it is about, then three lines: this year, your goal, what is new. The rest waits until it is needed. */
export function yearStartCard(env: UiEnv): string {
  const { city } = env;
  const def = city.def.years[city.year - 1];
  const b = briefing(city);
  const said = def?.intro[0];
  const toolIcon = city.newTools.find((t) => t !== 'remove');
  const body = `${said ? `<div class="speakers">${speaker(said.who, said.text)}</div>` : ''}<div class="brief">
    ${line(pic(`city-${city.def.number}`, 'round'), 'This year', b.now)}
    ${line(GOAL_ICON, 'Your goal', b.goal)}
    ${line(pic(toolIcon ? `tool-${toolIcon}` : 'portrait-zaza'), 'You can now', b.can)}</div>`;
  return cardHtml({
    title: `Year ${shownYear(city)}: ${def?.name ?? city.def.name}`, sub: city.def.name, cls: 'start', body,
    foot: `${def?.cannotLose ? '<span class="grow small dim">You cannot lose this year.</span>' : ''}<button class="btn go big" data-act="next">Start the year</button>`,
  });
}
