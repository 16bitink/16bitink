/**
 * Driveways and turning round (the owner, November 27: "check frame by frame how cars enter and leave the street,
 * they still do magic, they might do very fast rounds around places they need to enter. check how they do U turn").
 * Each scenario asks what a real car does: into and out of a home's driveway at a manoeuvre's pace, across the far
 * lane only into a gap, and turning round only where it fits at R_MIN (a three-point turn or round the block
 * otherwise). `roundsAtPace`: no swing of 120 degrees faster than an R_MIN arc at the manoeuvre pace.
 */
import type { City } from '../../src/city/state';
import { CROSS_GAP } from '../../src/city/manoeuvre';
import type { RunResult, Scenario } from './lab';
import { anticlockwise, clean, closest, expect, firstManoeuvre, leavesBy, lotDoor, parksIn, passesBy, quickestRound, roundsAtPace, samplesOf, standsOffRoad } from './checks';

const cityOf = (r: RunResult): City => (r.city as unknown as { c: City }).c;

/** As STREET_EW (scenarios.ts): a two-way street on row 4, T junctions to gates SW and SE, places between them. */
const STREET = {
  size: [14, 9] as const,
  roads: [{ cells: [[0, 4], [13, 4]] as const }, { cells: [[3, 4], [3, 8]] as const }, { cells: [[11, 4], [11, 8]] as const }],
  gates: [{ id: 'W', cell: [0, 4] as const }, { id: 'E', cell: [13, 4] as const }, { id: 'SW', cell: [3, 8] as const }, { id: 'SE', cell: [11, 8] as const }],
};

/** No swing round within this many px of a junction's middle (a U-turn in the box). */
const BOX = 30;

/** A U-turn in a junction's box: one visit within BOX px of its middle that turns the car 150 degrees or more. */
function roundsAwayFromJunctions(r: RunResult, who: string): ReturnType<typeof expect> {
  const list = samplesOf(r, who).filter((s) => s.state !== 'parked');
  for (const j of cityOf(r).net.junctions.filter((x) => x.arms.length >= 3)) {
    let turned = 0;
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1]!, b = list[i]!;
      const inside = Math.hypot(b.x - j.x, b.y - j.y) < BOX && Math.hypot(a.x - j.x, a.y - j.y) < BOX && b.frame - a.frame <= 2;
      turned = inside ? turned + Math.atan2(Math.sin(b.a - a.a), Math.cos(b.a - a.a)) : 0;
      if (Math.abs(turned) >= U_TURN) return expect(`${who} never turns round inside a junction`, false, `U in the box at ${j.x},${j.y} at ${b.t.toFixed(1)} s`);
    }
  }
  return expect(`${who} never turns round inside a junction`, true, 'no U in any junction box');
}

const U_TURN = (5 * Math.PI) / 6;

const DRIVE_NEAR: Scenario = {
  id: 'park.driveway.near-lane',
  title: 'Into a home driveway from the near lane, and out again',
  expect: 'From the near lane A turns into its driveway at a manoeuvre\'s pace (no swing faster than an R_MIN arc), stands off the road, later leaves forward the way it came',
  ...STREET,
  lots: [{ name: 'Home', kind: 'home', cell: [6, 5], w: 2, h: 2 }],
  actors: [{ kind: 'arrive', id: 'A', at: 0.5, from: 'W', home: 'E', lot: 'Home', spot: { lot: 'Home' }, stay: 25 }],
  flows: [{ from: 'E', to: 'W', every: 7, start: 3 }],
  seconds: 90,
  expectations: (r) => [parksIn(r, 'A', 'lot:'), standsOffRoad(r, 'A'), roundsAtPace(r, 'A'), leavesBy(r, 'A', 90), clean(r, 'A')],
};

const DRIVE_FAR: Scenario = {
  id: 'park.driveway.far-lane',
  title: 'Into a home driveway across the oncoming lane',
  expect: 'From the far lane A waits for oncoming B, crosses with a 3 s gap into its driveway at a manoeuvre\'s pace; nothing overlaps, no fast swing',
  ...STREET,
  lots: [{ name: 'Home', kind: 'home', cell: [6, 2], w: 2, h: 2 }],
  actors: [
    { kind: 'arrive', id: 'A', at: 0.5, from: 'W', home: 'E', lot: 'Home', spot: { lot: 'Home' }, stay: 25 },
    { kind: 'through', id: 'B', at: 2.5, from: 'E', to: 'W' },
  ],
  seconds: 90,
  expectations: (r) => {
    const door = lotDoor(r, 'Home');
    const turn = firstManoeuvre(r, 'A');
    const b = closest(r, 'B', door);
    const waited = turn !== undefined && (b.t <= turn || b.t - turn >= CROSS_GAP);
    return [
      parksIn(r, 'A', 'lot:'),
      expect('A waits for B before crossing', waited, `A turns at ${turn?.toFixed(1) ?? '-'} s, B at the driveway at ${b.t.toFixed(1)} s`),
      standsOffRoad(r, 'A'), roundsAtPace(r, 'A'), leavesBy(r, 'A', 90), clean(r, 'A'),
    ];
  },
};

const DRIVE_LEAVE_FAR: Scenario = {
  id: 'park.driveway.leave-far',
  title: 'Out of a home driveway towards the far direction',
  expect: 'A in a driveway south of the street leaves for the west: waits for a gap in the eastbound lane, pulls out across it into the westbound lane at a manoeuvre\'s pace, never a fast swing',
  ...STREET,
  lots: [{ name: 'Home', kind: 'home', cell: [6, 5], w: 2, h: 2 }],
  actors: [{ kind: 'parked', id: 'A', spot: { lot: 'Home' }, lot: 'Home', leaveAt: 2, to: 'W' }],
  flows: [{ from: 'W', to: 'E', every: 4, start: 0, until: 14 }],
  seconds: 90,
  expectations: (r) => [leavesBy(r, 'A', 90), roundsAtPace(r, 'A'), clean(r, 'A')],
};

const WAY_BEHIND: Scenario = {
  id: 'park.kerb.way-behind',
  title: 'A kerb car whose way on is behind it, on a narrow street',
  expect: 'A in a kerb bay facing east leaves for the west gate on a one-lane-each-way street: turns round only as a real car can (a three-point turn at walking pace, or round by the side streets), never a fast swing or a U in the box',
  ...STREET,
  lots: [{ name: 'Shop', kind: 'shops', cell: [5, 5], w: 3, h: 2 }],
  kerbs: [[6, 4]],
  actors: [{ kind: 'parked', id: 'A', spot: { kerb: [6, 4] }, slot: 4, lot: 'Shop', leaveAt: 2, to: 'W' }],
  seconds: 100,
  expectations: (r) => [leavesBy(r, 'A', 100), roundsAtPace(r, 'A'), roundsAwayFromJunctions(r, 'A'), clean(r, 'A')],
};

/** A block to drive round: row 4 from gate W to gate E, crossed at columns 4 and 8 by a loop through rows 1 and 7. */
const BLOCK = {
  size: [13, 9] as const,
  roads: [
    { cells: [[0, 4], [12, 4]] as const }, { cells: [[4, 1], [4, 7]] as const }, { cells: [[8, 1], [8, 7]] as const },
    { cells: [[4, 1], [8, 1]] as const }, { cells: [[4, 7], [8, 7]] as const },
  ],
  gates: [{ id: 'W', cell: [0, 4] as const }, { id: 'E', cell: [12, 4] as const }],
};

const UTURN_CROSS: Scenario = {
  id: 'drive.uturn.crossroads',
  title: 'Going back the way it faces, with crossroads ahead',
  expect: 'A in a kerb bay facing east leaves for the west gate: no U-turn in the crossroads (a street U does not fit at R_MIN), it drives round the block or turns round where it fits, at a real pace',
  ...BLOCK,
  lots: [{ name: 'Shop', kind: 'shops', cell: [5, 5], w: 2, h: 1 }],
  kerbs: [[6, 4]],
  actors: [{ kind: 'parked', id: 'A', spot: { kerb: [6, 4] }, slot: 4, lot: 'Shop', leaveAt: 2, to: 'W' }],
  flows: [{ from: 'E', to: 'W', every: 6, start: 4, until: 30 }],
  seconds: 60,
  expectations: (r) => [leavesBy(r, 'A', 60), roundsAtPace(r, 'A'), roundsAwayFromJunctions(r, 'A'), clean(r, 'A')],
};

/** The side street at column 3 runs south to a dead end at row 8 (no gate). */
const DEAD_END = (type?: 'avenue' | 'boulevard') => ({
  size: [14, 10] as const,
  roads: [{ cells: [[0, 4], [13, 4]] as const }, { cells: [[3, 4], [3, 8]] as const, ...(type ? { type } : {}) }],
  gates: [{ id: 'W', cell: [0, 4] as const }, { id: 'E', cell: [13, 4] as const }],
});

/** Both headings down and up the dead-end street: the car turned round in it. */
function turnedInStreet(r: RunResult, who: string): ReturnType<typeof expect> {
  const list = samplesOf(r, who).filter((s) => s.state !== 'parked' && s.y > 5 * 40);
  const ok = list.some((s) => Math.sin(s.a) > 0.9) && list.some((s) => Math.sin(s.a) < -0.9);
  return expect(`${who} turned round in the dead-end street`, ok, `${list.length} frames there`);
}

const reversed = (r: RunResult, who: string): number => samplesOf(r, who).filter((s) => s.gear === 'R' && s.state === 'moving').length;

const UTURN_DEADEND: Scenario = {
  id: 'drive.uturn.deadend',
  title: 'Cars leaving homes on a dead-end street, and one sent to its end',
  expect: 'Cars leaving homes on a dead-end street, A sent to its end and D to the far side of it, turn round at the end with a three-point turn at walking pace (a street U does not fit at R_MIN), never a tight U',
  ...DEAD_END(),
  lots: [{ name: 'East', kind: 'home', cell: [4, 6], w: 2, h: 2 }, { name: 'West', kind: 'home', cell: [1, 6], w: 2, h: 2 }],
  actors: [
    { kind: 'through', id: 'A', at: 1, from: 'W', to: [3, 8] },
    { kind: 'parked', id: 'B', spot: { lot: 'East' }, lot: 'East', leaveAt: 3, to: 'W' },
    { kind: 'parked', id: 'C', spot: { lot: 'West' }, lot: 'West', leaveAt: 20, to: 'E' },
    { kind: 'through', id: 'D', at: 30, from: 'E', to: [3, 6] },
  ],
  seconds: 70,
  expectations: (r) => [
    turnedInStreet(r, 'A'), turnedInStreet(r, 'D'),
    expect('D, sent past its place on the far side, backed up in a three-point turn at the end', reversed(r, 'D') > 0, `${reversed(r, 'D')} frames backing up on the road`),
    passesBy(r, 'D', 70), roundsAtPace(r, 'D'), clean(r, 'D'),
    expect('B or C turned round at the end with a three-point turn', reversed(r, 'B') + reversed(r, 'C') > 0, `${reversed(r, 'B')} + ${reversed(r, 'C')} frames backing up on the road`),
    leavesBy(r, 'B', 70), leavesBy(r, 'C', 70),
    roundsAtPace(r, 'A'), roundsAtPace(r, 'B'), roundsAtPace(r, 'C'), clean(r, 'A'), clean(r, 'B'), clean(r, 'C'),
  ],
};

const UTURN_AVENUE: Scenario = {
  id: 'drive.uturn.avenue',
  title: 'Turning round at the end of an avenue',
  expect: 'A car leaving a home on a dead-end avenue towards its end turns round there with a three-point turn (outer lanes 27 px apart, under 2 R_MIN); nothing turns tighter than R_MIN or faster than a real car',
  ...DEAD_END('avenue'),
  lots: [{ name: 'East', kind: 'home', cell: [4, 6], w: 2, h: 2 }, { name: 'West', kind: 'home', cell: [1, 6], w: 2, h: 2 }],
  actors: [
    { kind: 'parked', id: 'A', spot: { lot: 'East' }, lot: 'East', leaveAt: 2, to: 'W' },
    { kind: 'parked', id: 'B', spot: { lot: 'West' }, lot: 'West', leaveAt: 20, to: 'E' },
  ],
  seconds: 70,
  expectations: (r) => [
    expect('A or B turned round at the end with a three-point turn', reversed(r, 'A') + reversed(r, 'B') > 0, `${reversed(r, 'A')} + ${reversed(r, 'B')} frames backing up on the road`),
    leavesBy(r, 'A', 70), leavesBy(r, 'B', 70), roundsAtPace(r, 'A'), roundsAtPace(r, 'B'), clean(r, 'A'), clean(r, 'B'),
  ],
};

const CROSS = {
  size: [11, 11] as const,
  roads: [{ cells: [[0, 5], [10, 5]] as const }, { cells: [[5, 0], [5, 10]] as const }],
  gates: [{ id: 'N', cell: [5, 0] as const }, { id: 'S', cell: [5, 10] as const }, { id: 'W', cell: [0, 5] as const }, { id: 'E', cell: [10, 5] as const }],
};

const UTURN_RING: Scenario = {
  id: 'drive.uturn.roundabout',
  title: 'All the way round a roundabout and back out',
  expect: 'A enters a roundabout from the south and leaves by the south arm again: anticlockwise, at the speed its radius allows (√(a·R)), no swing faster than a real car',
  ...CROSS,
  controls: [{ cell: [5, 5], control: 'roundabout' }],
  actors: [{ kind: 'through', id: 'A', at: 0.5, from: 'S', to: 'S' }, { kind: 'through', id: 'B', at: 3, from: 'W', to: 'E' }],
  seconds: 40,
  expectations: (r) => {
    const j = cityOf(r).net.junctions.find((x) => x.arms.length === 4)!;
    return [passesBy(r, 'A', 40), anticlockwise(r, 'A', j), roundsAtPace(r, 'A'), clean(r, 'A'), clean(r, 'B')];
  },
};

export const TURNS: readonly Scenario[] = [DRIVE_NEAR, DRIVE_FAR, DRIVE_LEAVE_FAR, WAY_BEHIND, UTURN_CROSS, UTURN_DEADEND, UTURN_AVENUE, UTURN_RING];


