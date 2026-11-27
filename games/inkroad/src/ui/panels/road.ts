import type { Command, Road, RoadType } from '../../sim/types';
import { esc } from '../dom';
import { num, opensMonth, pct } from '../format';
import { kv, meter, priceTag, quoted, toggleRow, type PanelCtx } from './shared';
import { ageingBlock, freewayBlock, speedTollRow } from './special';

const ORDER: readonly RoadType[] = ['street', 'avenue', 'boulevard', 'highway'];
const NAMES: Readonly<Record<RoadType, string>> = { street: 'Street', avenue: 'Avenue', boulevard: 'Boulevard', highway: 'Highway' };
export const TOP_TRACE = 3;
export const BUSY_RATIO = 0.5;

const place = (list: readonly { name: string; share: number }[]): string =>
  list.slice(0, TOP_TRACE).map((p) => `${esc(p.name)} ${pct(p.share)}`).join(', ') || 'nobody yet';

function upgrade(c: PanelCtx, r: Road): string {
  const next = ORDER[ORDER.indexOf(r.type) + 1];
  const tool = next && c.city.tools.includes(next);
  if (!next || !tool || r.level !== 0) return '';
  const q = quoted(c.city, { t: 'upgrade', road: r.id, type: next });
  return `<button class="btn" data-act="upgrade" data-v="${next}" ${q.ok ? '' : 'disabled'} title="${esc(q.why ?? '')}">Widen to ${NAMES[next].toLowerCase()} ${priceTag(q)}</button>`;
}

function switches(c: PanelCtx, r: Road): string {
  const has = (t: Parameters<typeof c.city.tools.includes>[0]): boolean => c.city.tools.includes(t);
  return [
    has('oneway') ? toggleRow('One way', r.oneWay, 'road', 'oneway') : '',
    has('kerb') ? toggleRow('Paid kerb bays', r.kerb, 'road', 'kerb') : '',
    has('toll') ? toggleRow('Toll gate', r.toll, 'road', 'toll') : '',
    has('buslane') ? toggleRow('Bus lane', r.busLane, 'road', 'buslane') : '',
    c.city.policies.truckHours ? toggleRow('Trucks banned', r.truckBan, 'road', 'truckBan') : '',
    speedTollRow(c, r),
  ].join('');
}

/** The road panel: flow, where drivers come from, widen, kerb, toll, bus lane. */
export function roadPanel(c: PanelCtx, id: number): string {
  const r = c.city.roads.find((x) => x.id === id);
  if (!r) return '<h2>Road</h2><p class="dim">Gone.</p>';
  const st = c.city.roadStats(id);
  const tr = c.city.trace(id);
  const title = r.flyover ? (r.level < 0 ? 'Underpass' : 'Flyover') : `${NAMES[r.type]}${r.bridge ? ' bridge' : ''}`;
  return `<h2>${title}</h2>${r.works > 0 ? `<p class="warn small">${worksLine(r, opensMonth(c.city, r.works))}</p>` : ''}
    ${kv('Cars a minute', num(st.flow))}${kv('Speed', pct(st.speedRatio))}${meter(st.speedRatio, st.speedRatio < BUSY_RATIO)}
    ${ageingBlock(c, r)}${freewayBlock(c, r)}
    ${st.queue > 0 ? kv('Queue', `${num(st.queue)} cars`) : ''}
    <h3>Drivers come from</h3><p class="small">${place(tr.from)}</p><h3>Drivers go to</h3><p class="small">${place(tr.to)}</p>
    ${upgrade(c, r)}<div class="toggles">${switches(c, r)}</div>
    ${c.city.tools.includes('square') && r.level === 0 ? '<button class="btn" data-act="squareRoad">Make it a square (no cars)</button>' : ''}
    ${r.fixed ? '' : '<button class="btn" data-act="removeRoad">Remove road</button>'}`;
}

/** The command a road switch sends. */
export function roadSwitch(r: Road, which: string): Command | null {
  switch (which) {
    case 'oneway': return { t: 'oneWay', road: r.id, dir: r.oneWay ? 0 : 1 };
    case 'kerb': return { t: 'kerb', road: r.id, on: !r.kerb };
    case 'toll': return { t: 'toll', road: r.id, on: !r.toll };
    case 'buslane': return { t: 'busLane', road: r.id, on: !r.busLane };
    case 'speedToll': return { t: 'speedToll', road: r.id, on: !r.speedToll };
    case 'truckBan': return { t: 'truckBan', road: r.id, on: !r.truckBan };
    default: return null;
  }
}

/** Dug by day, the road is closed to cars; by night it stays open. */
const worksLine = (r: { readonly nightWorks: boolean }, opens: string): string =>
  `Road works${r.nightWorks ? ' by night' : ''}, done in ${opens}. ${r.nightWorks ? 'Open by day.' : 'Closed to cars.'}`;
