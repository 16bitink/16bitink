import { esc } from '../dom';
import { monthName, seasonLine, shownYear } from '../format';
import type { UiEnv } from '../types';
import { panesHtml, type Pane } from './panes';
import { approvalHtml, commissionsHtml, complaintsHtml, ledgerHtml, policiesHtml, pricesHtml, scoreHtml, seasonBooks, voteHtml } from './reviewParts';
import { cardHtml } from './shell';
import { tollLimitHtml } from './specialParts';

export const LAST_SEASON = 3;

/** The night review: books, approval and complaints, then prices, policies and commissions. */
export function reviewCard(env: UiEnv, tab = 0, waited = false): string {
  const { city } = env;
  const last = city.season === LAST_SEASON;
  const books = `The books, ${monthName(city.month - 2)} to ${monthName(city.month)}`;
  const prices = pricesHtml(env) + tollLimitHtml(city) + policiesHtml(env);
  const council = commissionsHtml(env) + voteHtml(env, waited);
  // With nothing to set on the right (year 1), the complaints take that column and the books keep the left.
  const split = !env.phone && prices.trim() === '' && council.trim() === '';
  const panes: Pane[] = split
    ? [
      { id: 'books', label: 'Books', col: 0, html: ledgerHtml(seasonBooks(city), books) },
      { id: 'approval', label: 'Approval', col: 0, html: scoreHtml(env) },
      { id: 'complaints', label: 'Complaints', col: 1, html: complaintsHtml(env) },
    ]
    : [
      { id: 'books', label: 'Books', col: 0, html: ledgerHtml(seasonBooks(city), books) },
      { id: 'complaints', label: 'Complaints', col: 0, html: approvalHtml(env) },
      { id: 'prices', label: 'Prices', col: 1, html: prices },
      { id: 'council', label: 'Council', col: 1, html: council },
    ];
  return cardHtml({
    title: 'Night review', sub: seasonLine(shownYear(city), city.season), cls: `review${split ? ' twocol' : ''}`,
    body: panesHtml(panes, env.phone, tab),
    foot: `<span class="grow small dim">${esc(`Goal: ${city.goal.text}`)}</span><button class="btn go big" data-act="next">${last ? 'Finish the year' : 'Next season'}</button>`,
  });
}
