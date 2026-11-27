import { describe, expect, it } from 'vitest';
import { Coach } from '../src/logic/coach';

describe('coach on a touch screen', () => {
  it('tells a level\'s twist with a mouse, and skips it on a touch screen', () => {
    const mouse = new Coach(['knot'], ['Night falls']);
    mouse.observe([], 0.1, false);
    expect(mouse.current(false)).toBe('Night falls');

    const touch = new Coach(['knot'], ['Night falls']);
    touch.observe([], 0.1, true);
    expect(touch.current(true)).toBe('Don\'t bite your own body!');
  });

  it('skips a hint with no touch words straight away, so the next one shows', () => {
    const touch = new Coach(['nightcanopy', 'bats']);
    touch.observe([], 0.1, true);
    expect(touch.current(true)).toBe('Glide into bats to catch them');
  });
});
