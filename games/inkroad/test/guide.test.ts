import { describe, expect, it } from 'vitest';
import { PAID_CITIES } from '../content/paid';
import { SAFFRON } from '../src/city/defs/saffron';
import { cellGraph, findDetour } from '../src/guide/detour';
import { mainJunction } from '../src/guide/places';
import { GUIDE_KEY, parseProgress } from '../src/guide/progress';
import { Runner, stageOf } from '../src/guide/runner';
import { scriptFor } from '../src/guide/scripts';
import { coachSteps } from '../src/guide/scripts/fromCoach';
import type { CityDef, CityView } from '../src/sim/types';
import type { Script } from '../src/guide/types';
import { book, Hand, MemoryStore, saffron } from './guide-helpers';

const MAX_WORDS = 14;
const ready = (store = new MemoryStore()): { hand: Hand; runner: Runner; store: MemoryStore } => {
  const city = saffron();
  const runner = new Runner(book(store));
  runner.load(scriptFor(SAFFRON, 1), true);
  return { hand: new Hand(city, runner), runner, store };
};

/** Follow the guide alone until a season's day or night ends, as somebody who knows nothing. */
function play(h: Hand, until: (c: CityView) => boolean, max = 900): void {
  for (let i = 0; i < max && !until(h.city); i++) {
    const f = h.tick();
    if (f) { h.follow(f); continue; }
    if (h.city.phase === 'day') h.run(4);
    else if (h.city.phase === 'yearEnd') { const t = h.city.techChoices[0]; if (t) h.city.apply({ t: 'tech', id: t.id }); h.city.apply({ t: 'next' }); } else h.city.apply({ t: 'next' });
  }
}

describe('year 1 for a newcomer', () => {
  const { hand, runner } = ready();
  hand.city.apply({ t: 'next' });
  play(hand, (c) => c.phase === 'review');

  it('leads to the roundabout, explains approval, then the night', () => {
    expect(hand.seen).toEqual(expect.arrayContaining(['welcome', 'watch', 'tap', 'arrows', 'build', 'clear', 'approval', 'letters', 'speed']));
    expect(mainJunction(hand.city)?.control).toBe('roundabout');
    expect(hand.seen.some((s) => s.startsWith('reward:Cleared!'))).toBe(true);
  });
  it('walks through the first night and the street, and it helps', () => {
    play(hand, (c) => c.season === 1 && c.phase === 'review');
    expect(hand.seen).toEqual(expect.arrayContaining(['books', 'todo', 'go-summer', 'why-street', 'pick-street', 'drag', 'build-street', 'take-it']));
    expect(hand.seen.some((s) => /^reward:\d+ cars a minute now skip/.test(s))).toBe(true);
  });
  it('reveals the screen step by step, all of it by winter', () => {
    expect(runner.shown()?.has('approval')).toBe(true);
    expect(runner.shown()?.has('goal')).toBe(false);
    play(hand, (c) => c.phase === 'yearStart' && c.year === 2);
    expect(hand.seen).toEqual(expect.arrayContaining(['goal', 'plan', 'advisor', 'plates']));
    runner.load(null, true, true);
    expect(runner.running).toBe(false);
    expect(runner.shown()).toBeNull();
  });
  it('speaks in short plain lines', () => {
    for (const s of hand.said) {
      expect(s.split(/\s+/).length, s).toBeLessThanOrEqual(MAX_WORDS);
      expect(s).not.toMatch(/[–—]/);
    }
  });
});

describe('the runner', () => {
  it('lets a player who builds at once skip what is done', () => {
    const { hand } = ready();
    hand.city.apply({ t: 'next' });
    const j = mainJunction(hand.city)!;
    hand.city.apply({ t: 'control', node: j.id, control: 'roundabout' });
    play(hand, (c) => c.phase === 'review');
    expect(hand.seen).not.toContain('tap');
    expect(hand.seen).not.toContain('build');
    expect(hand.seen).toContain('approval');
  });
  it('goes back a step when the player lets go of the junction', () => {
    const { hand } = ready();
    hand.city.apply({ t: 'next' });
    for (let i = 0; i < 200 && hand.tick()?.id !== 'arrows'; i++) { const f = hand.tick(0); if (f) hand.follow(f); }
    hand.selection = null;
    expect(hand.tick()?.id).toBe('tap');
  });
  it('holds time only while a step says so, until the player lets it run', () => {
    const { hand, runner } = ready();
    hand.city.apply({ t: 'next' });
    expect(hand.tick()?.pause).toBe(true);
    runner.release();
    expect(hand.tick()?.pause).toBe(false);
  });
  it('can be skipped, and everything shows', () => {
    const { hand, runner } = ready();
    hand.city.apply({ t: 'next' });
    expect(runner.shown()).not.toBeNull();
    runner.skip();
    expect(hand.tick()).toBeNull();
    expect(runner.shown()).toBeNull();
  });
  it('comes back where it was after a reload, and does not tell a finished year again', () => {
    const { hand, store } = ready();
    hand.city.apply({ t: 'next' });
    play(hand, (c) => c.season === 1 && c.phase === 'day');
    const again = new Runner(book(store));
    again.load(scriptFor(SAFFRON, 1), false);
    const h2 = new Hand(hand.city, again);
    expect(h2.tick()?.id).toBe('why-street');
    play(hand, (c) => c.year === 2);
    hand.runner.load(null, true, true);
    const done = new Runner(book(store));
    done.load(scriptFor(SAFFRON, 1), true);
    expect(done.running).toBe(false);
  });
  it('waits for a step\'s time of year', () => {
    const script: Script = { key: 'x', steps: [{ id: 'a', stage: 3, say: 'Hello', ok: 'Next' }] };
    const r = new Runner(book());
    r.load(script, true);
    const h = new Hand(saffron(), r);
    h.city.apply({ t: 'next' });
    expect(h.tick()).toBeNull();
    expect(stageOf({ city: h.city })).toBe(0);
  });
});

describe('progress', () => {
  it('survives nonsense', () => {
    expect(parseProgress('{"v":9}').off).toBe(false);
    expect(parseProgress('nope').years).toEqual({});
    expect(parseProgress(JSON.stringify({ v: 1, off: true, years: { '1:1': { ids: ['a', 4], end: true }, x: 3 } }))).toEqual({ v: 1, off: true, years: { '1:1': { ids: ['a'], end: true } } });
  });
  it('keeps its own record', () => {
    const store = new MemoryStore();
    new Runner(book(store)).skip();
    expect(store.map.has(GUIDE_KEY)).toBe(true);
    expect(new Runner(book(store)).off).toBe(true);
  });
});

describe('every script', () => {
  const defs = [SAFFRON, ...(PAID_CITIES as readonly CityDef[])];
  it('has one for each year with something to teach, with its own step ids', () => {
    for (const d of defs) for (let y = 1; y <= 10; y++) {
      const s = scriptFor(d, y);
      const ids = s?.steps.map((x) => x.id) ?? [];
      expect(new Set(ids).size, `${d.id} ${y}`).toBe(ids.length);
    }
    for (let y = 1; y <= 9; y++) expect(scriptFor(SAFFRON, y), `Saffron ${y}`).not.toBeNull();
  });
  it('keeps fixed lines short and plain', () => {
    for (const d of defs) for (let y = 1; y <= 10; y++) for (const s of scriptFor(d, y)?.steps ?? []) {
      if (s.id.startsWith('coach-')) continue;
      for (const t of [s.why, s.say, s.ok]) if (typeof t === 'string') {
        expect(t.split(/\s+/).length, t).toBeLessThanOrEqual(MAX_WORDS);
        expect(t).not.toMatch(/[–—]/);
      }
    }
  });
  it('turns coach lines into steps', () => {
    const steps = coachSteps([{ text: 'Tap the red one.', at: 'worstJunction', until: 'selected:junction' }]);
    const r = new Runner(book());
    r.load({ key: 'c', steps }, true);
    const h = new Hand(saffron(), r);
    h.city.apply({ t: 'next' });
    expect(h.tick()?.say).toBe('Tap the red one.');
    h.selection = { kind: 'junction', id: 1 };
    expect(h.tick()).toBeNull();
  });
});

describe('detours', () => {
  it('finds the short street that skips the crossroads', () => {
    const c = saffron();
    c.apply({ t: 'next' });
    const j = mainJunction(c)!;
    const d = findDetour(c, j.id)!;
    expect(d).not.toBeNull();
    expect(d.newS).toBeLessThan(d.nowS - 5);
    expect(d.oldWay.some((x) => x.gx === j.cell.gx && x.gy === j.cell.gy)).toBe(true);
    expect(c.quote({ t: 'road', cells: d.cells, type: 'street' }).ok).toBe(true);
    expect(findDetour(c, j.id, 1)).toBeNull();
  });
  it('respects one-way roads', () => {
    const g = cellGraph([{ id: 1, type: 'street', a: 1, b: 2, cells: [{ gx: 0, gy: 0 }, { gx: 1, gy: 0 }], line: [], level: 0, links: [], oneWay: true, dir: -1 } as never]);
    expect(g.has('0,0')).toBe(false);
    expect(g.get('1,0')?.[0]?.to).toBe('0,0');
  });
});
