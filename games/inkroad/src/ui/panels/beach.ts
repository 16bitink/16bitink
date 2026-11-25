import { esc } from '../dom';
import { num, pct, shownYear } from '../format';
import { kv, meter, type PanelCtx } from './shared';

/** What a tapped beach says: its fate, who comes, whether they find a space. */
const FEW = 0.7;

export function beachPanel(c: PanelCtx, index: number): string {
  const b = c.city.beaches[index];
  if (!b) return '<h2>Beach</h2><p class="dim">Gone.</p>';
  const head = `<h2>${esc(b.name)}</h2>`;
  if (b.state === 'sold') return `${head}<p class="small dim">Sold to property owners. The sea is theirs, the complaints are ours.</p>`;
  if (b.state === 'open') return `${head}<p class="small dim">Protected sand: no roads or buildings. The Council decides in year ${shownYear(c.city, b.decideYear)}: villas, or a public beach.</p>`;
  const road = b.reachable ? '' : '<p class="warn small">No road reaches the sand.</p>';
  const found = b.visitors > 0 ? `${kv('Found a space', pct(b.found))}${meter(b.found, b.found < FEW)}` : '';
  const hint = b.spaces === 0 || b.found < FEW ? '<p class="small">Beach parking: pick the parking tool and place a surface car park within 3 cells of the sand.</p>' : '';
  return `${head}<p class="small dim">Public beach</p>${kv('Cars last season', num(b.visitors))}${found}
    ${kv('Beach parking', `${num(b.beachSpaces)} spaces`)}${kv('All spaces in a walk', num(b.spaces))}${road}${hint}`;
}
