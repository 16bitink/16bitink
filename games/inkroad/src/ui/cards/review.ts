import { esc } from '../dom';
import { dateLine, shownYear } from '../format';
import type { UiEnv } from '../types';
import { panesHtml, type Pane } from './panes';
import { approvalHtml, commissionsHtml, ledgerHtml, policiesHtml, pricesHtml, voteHtml } from './reviewParts';
import { cardHtml } from './shell';
import { tollLimitHtml } from './specialParts';

export const LAST_SEASON = 3;

/** The night review: books, approval and complaints, then prices, policies and commissions. */
export function reviewCard(env: UiEnv, tab = 0, waited = false): string {
  const { city } = env;
  const last = city.season === LAST_SEASON;
  const panes: Pane[] = [
    { id: 'books', label: 'Books', col: 0, html: ledgerHtml(city.ledger) },
    { id: 'complaints', label: 'Complaints', col: 0, html: approvalHtml(env) },
    { id: 'prices', label: 'Prices', col: 1, html: pricesHtml(env) + tollLimitHtml(city) + policiesHtml(env) },
    { id: 'council', label: 'Council', col: 1, html: commissionsHtml(env) + voteHtml(env, waited) },
  ];
  return cardHtml({
    title: 'Night review', sub: dateLine(shownYear(city), city.season), cls: 'review',
    body: panesHtml(panes, env.phone, tab),
    foot: `<span class="grow small dim">${esc(`Goal: ${city.goal.text}`)}</span><button class="btn go big" data-act="next">${last ? 'Finish the year' : 'Next season'}</button>`,
  });
}
