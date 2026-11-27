/**
 * The one collision rule (src/sim/sweeps.ts): moves played off the lanes are checked against each other over time,
 * body box against body box; a held last pose (a car waiting at the lane edge) and a reserved way into the lane count
 * whatever the time; moving cars keep out of where a move on the road will still pass.
 */
import { describe, expect, it } from 'vitest';
import { delayed, Sweeps } from '../../src/sim/sweeps';
import { PLAY_DT, type Played } from '../../src/sim/vehicle/played';

const LEN = 16, WID = 8.3;

/** A body driven straight from (x0, y0) along heading a, `d` px in `seconds`. */
function straight(x0: number, y0: number, a: number, d: number, seconds: number): Played {
  const n = Math.round(seconds / PLAY_DT) + 1;
  const frames = new Float64Array(n * 3);
  for (let k = 0; k < n; k++) {
    const u = (k / (n - 1)) * d;
    frames.set([x0 + Math.cos(a) * u, y0 + Math.sin(a) * u, a], k * 3);
  }
  return { frames, n, seconds: (n - 1) * PLAY_DT, end: { x: 0, y: 0, th: a, u: 0, dir: 1, delta: 0, a: 0 }, fits: true, word: '' };
}

describe('sweeps: moves against moves over time', () => {
  it('two moves through one point at the same time touch; the same paths seconds apart do not', () => {
    const w = new Sweeps();
    w.put(1, straight(0, 0, 0, 100, 5), 0, LEN, WID, false);
    const across = straight(50, -50, Math.PI / 2, 100, 5);
    expect(w.hit(across, 0, LEN, WID, 2)).toBe(1);
    expect(w.hit(across, 10, LEN, WID, 2)).toBe(-1);
    // A car never hits its own move.
    expect(w.hit(across, 0, LEN, WID, 1)).toBe(-1);
  });

  it('a held last pose (waiting at the lane edge) is in the way whenever the new move passes it', () => {
    const w = new Sweeps();
    w.put(1, straight(0, 0, 0, 40, 2), 0, LEN, WID, true);
    expect(w.hit(straight(40, -50, Math.PI / 2, 100, 5), 30, LEN, WID, 2)).toBe(1);
    // A move that would stop on that pose and stand there is refused too.
    expect(w.hit(straight(40, -60, Math.PI / 2, 60, 3), 0, LEN, WID, 2, true)).toBe(1);
    w.drop(1);
    expect(w.hit(straight(40, -50, Math.PI / 2, 100, 5), 30, LEN, WID, 2)).toBe(-1);
  });

  it('the way a waiting car will take into the lane is reserved whatever the time', () => {
    const w = new Sweeps();
    w.put(1, straight(0, 0, 0, 10, 1), 0, LEN, WID, true, straight(10, 0, 0, 80, 4));
    expect(w.hit(straight(60, -50, Math.PI / 2, 100, 5), 500, LEN, WID, 2)).toBe(1);
  });

  it('a delayed move stands at its first pose first', () => {
    const m = straight(0, 0, 0, 30, 2);
    const d = delayed(m, 1.5);
    expect(d.seconds).toBeCloseTo(m.seconds + 1.5, 6);
    expect([d.frames[0], d.frames[1], d.frames[2]]).toEqual([0, 0, 0]);
    expect(d.frames[Math.round(1.5 / PLAY_DT) * 3]).toBe(0);
  });

  it('a move on the road shows moving cars where it will still pass; a move into a space only where it is', () => {
    const w = new Sweeps();
    w.put(1, straight(0, 0, 0, 100, 5), 0, LEN, WID, false, undefined, true);
    w.put(2, straight(0, 50, 0, 100, 5), 0, LEN, WID, false);
    const now = w.bodiesNow(1);
    expect(now.filter((b) => b.id === 1 && b.future).length).toBeGreaterThan(10);
    expect(now.filter((b) => b.id === 2).length).toBe(1);
    // Over: nothing left of either (neither holds its end).
    expect(w.bodiesNow(6)).toEqual([]);
  });
});
