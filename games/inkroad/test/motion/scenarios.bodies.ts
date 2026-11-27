/**
 * A body in the way of each kind of move (docs/inkroad-vehicle-model.md "Phase B, round 3": one collision rule for
 * everything). Each scenario puts a car where a move would sweep, so the move must wait, plan again or go another way,
 * never through it: a pull-out with a car stopped in front of its driveway, a car parking while a neighbour pulls out
 * across its way, two cars leaving one forecourt together, and traffic coming up to a car turning in.
 */
import type { RunResult, Scenario } from './lab';
import { clean, expect, leavesBy, parkIns, parkOuts, samplesOf } from './checks';
import { bodiesOverlap } from '../../src/sim/vehicleSize';

const STREET = {
  size: [14, 9] as const,
  roads: [{ cells: [[0, 4], [13, 4]] as const }, { cells: [[3, 4], [3, 8]] as const }, { cells: [[11, 4], [11, 8]] as const }],
  gates: [{ id: 'W', cell: [0, 4] as const }, { id: 'E', cell: [13, 4] as const }, { id: 'SW', cell: [3, 8] as const }, { id: 'SE', cell: [11, 8] as const }],
};

/** Frames in which two named actors' drawn bodies overlap. */
function touches(r: RunResult, a: string, b: string): number {
  const bs = new Map(samplesOf(r, b).map((s) => [s.frame, s]));
  return samplesOf(r, a).filter((s) => {
    const o = bs.get(s.frame);
    return !!o && bodiesOverlap({ x: s.x, y: s.y, a: s.a, len: s.len, wid: s.wid }, { x: o.x, y: o.y, a: o.a, len: o.len, wid: o.wid }, 0.4);
  }).length;
}

const apart = (r: RunResult, a: string, b: string): ReturnType<typeof expect> => {
  const n = touches(r, a, b);
  return expect(`${a} and ${b} never overlap`, n === 0, `${n} frames`);
};

/** A car broken down in the lane in front of A's driveway: A waits in its space, never pulls out into it. */
const PULLOUT_BLOCKED: Scenario = {
  id: 'body.pullout.blocked',
  title: 'Pulling out of a driveway with a car stopped in front of it',
  expect: 'A in a driveway leaves while X stands broken down in the lane in front of it: A waits in its space (or plans a way round X), never sweeps through X; it leaves once X is gone',
  ...STREET,
  lots: [{ name: 'Home', kind: 'home', cell: [6, 5], w: 2, h: 2 }],
  actors: [
    { kind: 'blocker', id: 'X', at: 0, cell: [6, 4], hold: 25, state: 3 },
    { kind: 'parked', id: 'A', spot: { lot: 'Home' }, lot: 'Home', leaveAt: 2, to: 'E' },
  ],
  seconds: 90,
  expectations: (r) => [leavesBy(r, 'A', 90), apart(r, 'A', 'X'), clean(r, 'A')],
};

/** B pulls out of the forecourt just as A turns in: one of them waits, neither drives through the other. */
const IN_AND_OUT: Scenario = {
  id: 'body.forecourt.in-out',
  title: 'Turning into a forecourt while a neighbour pulls out of it',
  expect: 'B leaves the forecourt as A arrives to park there: each move is checked against the other over time (the one collision rule), so one waits; the two bodies never overlap',
  ...STREET,
  lots: [{ name: 'Shop', kind: 'shops', cell: [6, 5], w: 3, h: 2 }],
  actors: [
    { kind: 'parked', id: 'B', spot: { lot: 'Shop' }, lot: 'Shop', leaveAt: 3, to: 'E' },
    { kind: 'arrive', id: 'A', at: 0.5, from: 'W', home: 'E', lot: 'Shop', spot: { lot: 'Shop' }, stay: 20 },
  ],
  seconds: 90,
  expectations: (r) => [
    expect('A parks', parkIns(r, 'A').length > 0, `${parkIns(r, 'A').length} park events`),
    expect('B pulls out', parkOuts(r, 'B').length > 0, `${parkOuts(r, 'B').length} out events`),
    apart(r, 'A', 'B'),
  ],
};

/** Two cars leave one home's driveway at the same time: the second waits for the first's way out. */
const TWO_OUT: Scenario = {
  id: 'body.driveway.two-out',
  title: 'Two cars leaving one driveway at once',
  expect: 'A and B in the same driveway both leave at 2 s: the second waits until the first has gone (it never waits at the lane edge on top of it), both leave',
  ...STREET,
  lots: [{ name: 'Home', kind: 'home', cell: [6, 5], w: 2, h: 2 }],
  actors: [
    { kind: 'parked', id: 'A', spot: { lot: 'Home' }, lot: 'Home', leaveAt: 2, to: 'E' },
    { kind: 'parked', id: 'B', spot: { lot: 'Home' }, lot: 'Home', leaveAt: 2, to: 'W' },
  ],
  seconds: 120,
  expectations: (r) => [leavesBy(r, 'A', 120), leavesBy(r, 'B', 120), apart(r, 'A', 'B')],
};

/** Traffic comes up behind a car turning into a kerb space: it stops behind the swept body, never into it. */
const FOLLOW_INTO: Scenario = {
  id: 'body.kerb.follow',
  title: 'Following a car that backs into a kerb space',
  expect: 'A backs into a kerb bay while B follows close behind: B stops short of the body A sweeps (the moving car keeps its gap to the move, not to the sim\'s point), never into it',
  ...STREET,
  lots: [{ name: 'Shop', kind: 'shops', cell: [5, 5], w: 3, h: 2 }],
  kerbs: [[6, 4]],
  actors: [
    { kind: 'arrive', id: 'A', at: 0.5, from: 'W', home: 'E', lot: 'Shop', spot: { kerb: [6, 4] }, stay: 15 },
    { kind: 'through', id: 'B', at: 1.6, from: 'W', to: 'E' },
  ],
  seconds: 80,
  expectations: (r) => [apart(r, 'A', 'B'), clean(r, 'B')],
};

export const BODIES: readonly Scenario[] = [PULLOUT_BLOCKED, IN_AND_OUT, TWO_OUT, FOLLOW_INTO];
