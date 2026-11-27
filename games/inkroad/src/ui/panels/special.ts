import type { Road, TransitLine } from '../../sim/types';
import { esc } from '../dom';
import { num, pct } from '../format';
import { kv, meter, priceTag, quoted, toggleRow, type PanelCtx } from './shared';

/** The panels of cities 3 to 5: speed tolls, ageing, the freeway and minibuses, in plain words. */
export const POOR = 0.45;

const words = (c: number): string => (c >= 0.75 ? 'Good' : c >= 0.55 ? 'Fair' : c >= POOR ? 'Tired' : c >= 0.22 ? 'Poor' : 'Falling apart');

/** The speed-toll switch for a road, and what the gates are doing. */
export function speedTollRow(c: PanelCtx, r: Road): string {
  const t = c.city.special?.speedTolls;
  if (!t || !c.city.tools.includes('toll')) return '';
  const q = quoted(c.city, { t: 'speedToll', road: r.id, on: !r.speedToll });
  if (!r.speedToll && !q.ok) return '';
  const gate = t.gates.find((g) => g.road === r.id);
  const note = gate ? `<p class="small dim">Speed now ${gate.speed}. The price rises when it drops under ${gate.low} and falls above ${gate.high}. Now <b>${num(t.price)}</b>, never over ${num(t.max)}.</p>` : '';
  return `${toggleRow('Speed toll', !!r.speedToll, 'road', 'speedToll')}${note}`;
}

/** Condition bar with Repair and Replace and their prices. */
export function ageingBlock(c: PanelCtx, r: Road): string {
  if (!c.city.special?.ageing || r.condition === undefined || r.flyover) return '';
  const rep = quoted(c.city, { t: 'repair', road: r.id });
  const rpl = quoted(c.city, { t: 'replace', road: r.id });
  const why = [rep, rpl].find((q) => !q.ok && q.why && r.works === 0)?.why;
  const match = r.bridge && rpl.ok && rpl.warn ? `<p class="small dim">${esc(rpl.warn)}</p>` : '';
  return `<h3>Condition</h3>${kv('Surface', `${words(r.condition)}, ${pct(r.condition)}`)}${meter(r.condition, r.condition < POOR)}
    <div class="choices"><button class="btn" data-act="mend" data-v="repair" ${rep.ok ? '' : 'disabled'} title="${esc(rep.why ?? 'Three months of works')}">Repair ${rep.ok ? priceTag(rep) : ''}</button>
    <button class="btn" data-act="mend" data-v="replace" ${rpl.ok ? '' : 'disabled'} title="${esc(rpl.why ?? 'Six months, as new')}">Replace ${rpl.ok ? priceTag(rpl) : ''}</button></div>
    ${match}${why ? `<p class="small dim">${esc(why)}</p>` : ''}
    <p class="small dim">Repair: three months, a bit better. Replace: six months, as new.</p>`;
}

/** A piece of the old freeway may become a boulevard. */
export function freewayBlock(c: PanelCtx, r: Road): string {
  const f = c.city.special?.freeway;
  if (!f || !r.freeway) return '';
  if (!f.open) return '<p class="small dim">Part of the old freeway. The Council still likes it.</p>';
  const q = quoted(c.city, { t: 'boulevard', road: r.id });
  return `<h3>Old freeway</h3><p class="small">Fast and loud, and nobody can cross it. As a boulevard it loses some traffic (half of it drives next door, some stops coming), gains a park, and people grumble while it is dug.</p>
    <button class="btn" data-act="boulevard" ${q.ok ? '' : 'disabled'} title="${esc(q.why ?? '')}">Turn into a boulevard ${q.ok ? priceTag(q) : ''}</button>${q.ok ? '' : `<p class="small dim">${esc(q.why ?? '')}</p>`}`;
}

/** The minibus panel: licence it or buy it out. */
export function minibusPanel(c: PanelCtx, l: TransitLine): string {
  const m = c.city.special?.minibuses;
  const info = m?.lines.find((x) => x.line === l.id);
  if (!m || !info) return '';
  const lic = quoted(c.city, { t: 'minibus', line: l.id, deal: 'license' });
  const buy = quoted(c.city, { t: 'minibus', line: l.id, deal: 'buyOut' });
  const head = info.state === 'licensed'
    ? `<p class="small dim">Licensed. It behaves, and pays the authority <b>${num(info.fee)}</b> a season.</p>`
    : '<p class="small dim">Nobody asked for it. It stops anywhere, blocks the lane and takes your riders.</p>';
  const protest = m.protest > 0 ? `<p class="warn small">The minibus drivers are protesting: ${m.protest} more ${m.protest === 1 ? 'season' : 'seasons'}.</p>` : '';
  const deals = info.state === 'licensed' ? '' : `<button class="btn" data-act="mini" data-v="license" ${lic.ok ? '' : 'disabled'}>Licence it, and take <b>${num(info.fee)}</b> a season</button>
    <button class="btn" data-act="mini" data-v="buyOut" ${buy.ok ? '' : 'disabled'}>Buy it out ${priceTag(buy)}</button>`;
  return `${head}${kv('Riders last season', num(l.riders))}${protest}${deals}
    ${info.state === 'private' ? '<p class="small dim">Or give it a better bus: an express line on bus lanes wears it down. They will protest.</p>' : ''}`;
}
