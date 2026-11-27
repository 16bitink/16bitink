import { describe, expect, it } from 'vitest';
import type { BeachCase, BeachView, CityView } from '../src/sim/types';
import { beachCard } from '../src/ui/cards/beach';
import { beachPanel } from '../src/ui/panels/beach';
import type { PanelCtx } from '../src/ui/panels/shared';
import type { UiEnv } from '../src/ui/types';

const CASE: BeachCase = { id: 'pearl', name: 'Pearl Beach', lean: 'sell', why: 'The books are thin.', follows: false, approval: 52, needs: 60, share: 130, plots: 3 };
const VIEW: BeachView = { id: 'pearl', name: 'Pearl Beach', rect: { gx: 6, gy: 3, w: 6, h: 2 }, state: 'public', visitors: 22, found: 0.41, beachSpaces: 18, spaces: 40, reachable: true, decideYear: 3 };
const city = (beaches: readonly BeachView[] = [VIEW]) => ({ year: 3, def: { number: 1 }, beaches }) as unknown as CityView;
const env = { city: city(), phone: false } as unknown as UiEnv;
const panel = (b: Partial<BeachView>) => beachPanel({ city: city([{ ...VIEW, ...b }]) } as unknown as PanelCtx, 0);

describe('the beach on screen', () => {
  it('asks with three answers, the lean and whether the Council listens', () => {
    const html = beachCard(env, CASE);
    for (const v of ['sell', 'public', 'out']) expect(html).toContain(`data-act="beach" data-v="${v}"`);
    expect(html).toMatch(/leans to selling/);
    expect(html).toMatch(/approval is 52\. Under 60/);
    for (const who of ['Sulo', 'Pim', 'Dewy']) expect(html).toContain(who);
    expect(beachCard(env, { ...CASE, lean: 'public', follows: true, approval: 64 })).toMatch(/leans to a public beach.*will follow your advice/s);
    expect(html).not.toMatch(/[–—]/);
    expect(beachCard({ ...env, phone: true }, CASE)).toMatch(/leans to selling.*Under 60.*data-v="public"/s);
  });

  it('says what came of it, then goes on with the year', () => {
    const html = beachCard(env, { ...CASE, done: { state: 'sold', advice: 'sell', line: 'The Council sold it.' } });
    expect(html).toContain('The Council sold it.');
    expect(html).toContain('data-act="beachok"');
    expect(html).toContain('year 4');
    expect(beachCard(env, { ...CASE, done: { state: 'public', advice: 'out', line: 'x' } })).toMatch(/beach parking/);
  });

  it('a tapped beach tells who came and whether they found a space', () => {
    expect(panel({})).toMatch(/22.*41%.*18 spaces.*40.*Beach parking: pick/s);
    expect(panel({ found: 0.95 })).not.toMatch(/pick the parking tool/);
    expect(panel({ reachable: false })).toMatch(/No road reaches/);
    expect(panel({ state: 'open' })).toMatch(/decides in year 3/);
    expect(panel({ state: 'sold' })).toMatch(/Sold to property owners/);
    expect(beachPanel({ city: city([]) } as unknown as PanelCtx, 0)).toMatch(/Gone/);
  });
});
