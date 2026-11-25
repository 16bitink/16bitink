import type { BeachCase } from '../../sim/types';
import { BEACH_SPEECH } from '../../city/rules/beachTexts';
import { esc } from '../dom';
import { num, shownYear } from '../format';
import type { UiEnv } from '../types';
import { cardHtml, speaker, stamp } from './shell';

/** The Council asks about a beach: what each way brings, where it leans, whether it will listen. Then what came of it. */
const list = (items: readonly string[]): string => `<ul class="plan">${items.map((t) => `<li>${t}</li>`).join('')}</ul>`;

function ways(b: BeachCase, phone: boolean): string {
  const sold = [`Our share: <span class="coin">${num(b.share)}</span>, once`, `${b.plots} villas, and drivers who own several cars`, 'The sea is closed to everybody else: Streets falls'];
  const open = ['Everyone comes, most of all on summer middays', 'You may build beach parking beside it, and charge', 'Enough spaces: Parking and Streets rise. Too few: cars circle the shore road'];
  const short = (items: readonly string[]): readonly string[] => (phone ? items.filter((_, i) => i !== 1) : items);
  const way = (title: string, cls: string, talk: string, items: readonly string[]): string => `<div class="way ${cls}"><h3>${title}</h3>${talk}${list(items)}</div>`;
  return `<div class="ways">${way('Sell it', 'sell', speaker('pim', BEACH_SPEECH.pim(b.share)), short(sold))}${way('Open it to everyone', 'open', speaker('zaza', BEACH_SPEECH.zaza), short(open))}</div>`;
}

const leanText = (b: BeachCase): string => `The Council leans to ${b.lean === 'sell' ? 'selling' : 'a public beach'}.`;
const listens = (b: BeachCase): string =>
  `<p class="small ${b.follows ? 'dim' : 'warn'}">${b.follows ? `Your approval is ${b.approval}: the Council will follow your advice.` : `Your approval is ${b.approval}. Under ${b.needs} the Council listens politely and follows its lean.`}</p>`;

/** A phone shows the lean at once, in Sulo's words; a laptop has room for his small talk too. */
const body = (b: BeachCase, phone: boolean): string => (phone
  ? `${speaker('sulo', `${leanText(b)} ${b.why}`)}${listens(b)}${ways(b, true)}`
  : `${speaker('sulo', BEACH_SPEECH.sulo(b.name))}${ways(b, false)}<p class="lean"><b>${leanText(b)}</b> ${esc(b.why)}</p>${listens(b)}`);

function asking(env: UiEnv, b: BeachCase): string {
  const btn = (v: string, text: string, cls: string): string => `<button class="btn ${cls}" data-act="beach" data-v="${v}">${text}</button>`;
  return cardHtml({
    title: b.name, sub: 'The Council decides', cls: 'beachcard', stamp: stamp(`Year ${shownYear(env.city)}`, 'teal'),
    body: body(b, env.phone),
    foot: `${btn('out', 'Stay out of it', '')}${btn('sell', 'Advise to sell', 'gold')}${btn('public', 'Advise a public beach', 'go')}`,
  });
}

function decided(env: UiEnv, b: BeachCase, done: NonNullable<BeachCase['done']>): string {
  const sold = done.state === 'sold';
  const next = sold ? `<p><span class="coin">${num(b.share)}</span> went into our purse. The villas open in year ${shownYear(env.city) + 1}.</p>`
    : '<p>Pick the parking tool: a surface car park within 3 cells of the sand is beach parking. Summer is the test.</p>';
  return cardHtml({
    title: b.name, sub: sold ? 'Sold' : 'A public beach', cls: 'beachcard', stamp: stamp(sold ? 'Sold' : 'Public', sold ? 'red' : 'teal'),
    body: `${speaker('sulo', done.line)}${sold ? speaker('pim', 'Nine pockets. All full. I rattle when I bow.') : speaker('miko', 'I counted the towels. Two for every space we do not have.')}${next}`,
    foot: '<button class="btn go big" data-act="beachok">On with the year</button>',
  });
}

export const beachCard = (env: UiEnv, b: BeachCase): string => (b.done ? decided(env, b, b.done) : asking(env, b));
