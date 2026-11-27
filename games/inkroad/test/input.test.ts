import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindKeys, type KeyActs } from '../src/app/input';

/** No DOM here: a tiny window that only dispatches keydown. */
const listeners = new Set<(e: KeyboardEvent) => void>();
vi.stubGlobal('addEventListener', (_t: string, f: (e: KeyboardEvent) => void) => listeners.add(f));
vi.stubGlobal('removeEventListener', (_t: string, f: (e: KeyboardEvent) => void) => listeners.delete(f));
const press = (key: string): void => listeners.forEach((f) => f({ key, target: null, preventDefault: () => {} } as unknown as KeyboardEvent));

const acts = (steps: number): KeyActs & { menus: number } => {
  let left = steps;
  const a = {
    menus: 0, setSpeed: () => {}, togglePause: () => {}, mute: () => {}, hasCity: () => true,
    menu: () => { a.menus++; }, back: () => (left > 0 ? (left--, true) : false),
  };
  return a;
};

describe('keys', () => {
  let off: (() => void) | null = null;
  afterEach(() => { off?.(); });

  it('Esc steps back out of the tool before it opens the menu', () => {
    const a = acts(2); // a road half drawn, then the tool in hand
    off = bindKeys(a);
    press('Escape');
    press('Escape');
    expect(a.menus).toBe(0);
    press('Escape');
    expect(a.menus).toBe(1);
  });
});
