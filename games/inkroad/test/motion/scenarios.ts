/**
 * The worked scenarios (docs/inkroad-motion-lab.md): one of each kind, written out in full as examples to copy.
 * Cells are 40 px; roads run between grid vertices; a block sits beside the road it faces.
 */
import { lotRect } from '../../src/city/geometry';
import type { Scenario } from './lab';
import { anticlockwise, brakesUnder, clean, closest, expect, firstManoeuvre, leavesBy, lotDoor, parksIn, passesBy, standsOffRoad, wasInside } from './checks';
import { CROSS_GAP } from '../../src/city/manoeuvre';

/**
 * A straight two-way street west to east along row 4, gates at both ends, a shop block north of it. Traffic routes
 * junction to junction: a car from a gate cannot aim at a place on the gate's own road, nor can a road run gate to
 * gate with no junction. So side streets to gates SW and SE make T junctions at (3, 4) and (11, 4), and the places
 * are on the road between them.
 */
const STREET_EW = {
  size: [14, 9] as const,
  roads: [{ cells: [[0, 4], [13, 4]] as const }, { cells: [[3, 4], [3, 8]] as const }, { cells: [[11, 4], [11, 8]] as const }],
  gates: [{ id: 'W', cell: [0, 4] as const }, { id: 'E', cell: [13, 4] as const }, { id: 'SW', cell: [3, 8] as const }, { id: 'SE', cell: [11, 8] as const }],
  lots: [{ name: 'Shop', kind: 'shops' as const, cell: [5, 1] as const, w: 3, h: 2 }],
};

export const KERB_PARALLEL: Scenario = {
  id: 'park.kerb.parallel-traffic',
  title: 'Kerb bay: parallel in and out with traffic behind',
  expect: 'A backs into a kerb bay with an S from ahead of it while B follows; later pulls out forward into a gap in the eastbound flow and leaves east',
  ...STREET_EW,
  kerbs: [[6, 4]],
  actors: [
    { kind: 'arrive', id: 'A', at: 0.5, from: 'W', home: 'E', lot: 'Shop', spot: { kerb: [6, 4] }, stay: 29 },
    { kind: 'through', id: 'B', at: 1.6, from: 'W', to: 'E' },
  ],
  flows: [{ from: 'W', to: 'E', every: 4, start: 18, until: 34 }, { from: 'E', to: 'W', every: 5, start: 2 }],
  seconds: 82,
  expectations: (r) => [
    parksIn(r, 'A', 'kerb:'),
    leavesBy(r, 'A', 82),
    passesBy(r, 'B', 45),
    brakesUnder(r, 'B', 400),
    clean(r, 'A'),
  ],
};

/** The far-lane forecourt: the shop is north of the street, so a car from the west turns across the westbound lane. */
export const FORECOURT_FAR: Scenario = {
  id: 'park.forecourt.far-lane',
  title: 'Forecourt from the far lane, oncoming traffic',
  expect: 'From the far lane A waits for oncoming B to pass, turns in nose first, forward across the road with a 3 s gap (never backing across a lane), ends in a forecourt space; nothing overlaps',
  ...STREET_EW,
  actors: [
    { kind: 'arrive', id: 'A', at: 0.5, from: 'W', home: 'E', lot: 'Shop', spot: { lot: 'Shop' }, stay: 27 },
    { kind: 'through', id: 'B', at: 2.5, from: 'E', to: 'W' },
  ],
  flows: [{ from: 'E', to: 'W', every: 6, start: 9 }],
  seconds: 76,
  expectations: (r) => {
    const door = lotDoor(r, 'Shop');
    const turn = firstManoeuvre(r, 'A');
    const b = closest(r, 'B', door);
    // B passes the shop's driveway before A starts across, or A starts while B is still a 3 s gap away.
    const waited = turn !== undefined && (b.t <= turn || b.t - turn >= CROSS_GAP);
    return [
      parksIn(r, 'A', 'lot:'),
      expect('A waits for B before crossing', waited, `A turns at ${turn?.toFixed(1) ?? '-'} s, B at the driveway at ${b.t.toFixed(1)} s`),
      standsOffRoad(r, 'A'),
      leavesBy(r, 'A', 76),
      clean(r, 'A'),
    ];
  },
};

/** A surface car park (3 x 2 cells) north of the street, its gate on the street. */
export const CARPARK_GATE: Scenario = {
  id: 'park.carpark.gate-aisle',
  title: 'Surface car park: through the gate, along the aisle, into a bay',
  expect: 'A enters a surface car park through its gate, drives the aisle, lines up on its bay column and goes straight in; leaves the same way',
  ...STREET_EW,
  lots: [{ name: 'Shop', kind: 'shops', cell: [9, 1], w: 2, h: 2 }],
  carParks: [{ kind: 'lot', at: [5, 1] }],
  actors: [{ kind: 'arrive', id: 'A', at: 0.5, from: 'W', home: 'E', lot: 'Shop', spot: { park: 0 }, stay: 25 }],
  flows: [{ from: 'E', to: 'W', every: 7, start: 3 }],
  seconds: 100,
  expectations: (r) => {
    const c = (r.city as unknown as { c: import('../../src/city/state').City }).c;
    return [parksIn(r, 'A', 'park:'), wasInside(r, 'A', lotRect(c.parks[0]!)), leavesBy(r, 'A', 100), clean(r, 'A')];
  },
};

/** One-cell crossroads: streets along row 5 and column 5, gates at all four ends. */
const CROSS = {
  size: [11, 11] as const,
  roads: [{ cells: [[5, 0], [5, 10]] as const }, { cells: [[0, 5], [10, 5]] as const }],
  gates: [{ id: 'N', cell: [5, 0] as const }, { id: 'S', cell: [5, 10] as const }, { id: 'W', cell: [0, 5] as const }, { id: 'E', cell: [10, 5] as const }],
};

export const CROSS_RIGHT: Scenario = {
  id: 'drive.cross.right',
  title: 'Right turn at a one-cell crossroads',
  expect: 'At a one-cell crossroads A turns right from the right lane into the right lane, on an arc no tighter than R_MIN, no slip',
  ...CROSS,
  actors: [{ kind: 'through', id: 'A', at: 0.5, from: 'S', to: 'E' }],
  flows: [{ from: 'W', to: 'E', every: 5, start: 1 }, { from: 'N', to: 'S', every: 6, start: 2 }],
  seconds: 20,
  expectations: (r) => [passesBy(r, 'A', 20), clean(r, 'A'), brakesUnder(r, 'A', 400)],
};

export const ROUNDABOUT: Scenario = {
  id: 'drive.roundabout.exits',
  title: 'Roundabout: first, second and third exit',
  expect: 'Cars enter a roundabout and take every exit (first, second, third, back): anticlockwise, right lane, no overlap',
  ...CROSS,
  controls: [{ cell: [5, 5], control: 'roundabout' }],
  actors: [
    { kind: 'through', id: 'A', at: 0.5, from: 'S', to: 'E' },
    { kind: 'through', id: 'B', at: 2.5, from: 'S', to: 'N' },
    { kind: 'through', id: 'C', at: 4.5, from: 'S', to: 'W' },
  ],
  flows: [{ from: 'W', to: 'E', every: 6, start: 1 }],
  seconds: 26,
  expectations: (r) => {
    const c = (r.city as unknown as { c: import('../../src/city/state').City }).c;
    const j = c.net.junctions.find((x) => x.arms.length === 4)!;
    return ['A', 'B', 'C'].flatMap((who) => [passesBy(r, who, 26), anticlockwise(r, who, j), clean(r, who)]);
  },
};

/** The kerb full on both sides and nowhere else to stand: a lorry stops in the lane (double parks), delivers, drives on. */
export const DOUBLE_PARK: Scenario = {
  id: 'park.double.park-leave',
  title: 'Double parking beside a full kerb, then leaving',
  expect: 'A double-parks with a forward S beside the full kerb, B behind it waits or passes; A pulls back into the lane forward and leaves',
  ...STREET_EW,
  // Side streets as avenues: no bare kerb to stand at (only streets have one), so the lorry double-parks.
  roads: [{ cells: [[0, 4], [13, 4]] }, { cells: [[3, 4], [3, 8]], type: 'avenue' }, { cells: [[11, 4], [11, 8]], type: 'avenue' }],
  lots: [{ name: 'Square', kind: 'square', cell: [5, 1], w: 3, h: 2 }],
  kerbs: [[6, 4]],
  fill: [{ kerb: [6, 4] }],
  actors: [
    { kind: 'arrive', id: 'A', at: 0.5, from: 'W', home: 'E', lot: 'Square', spot: { kerb: [6, 4] }, stay: 25, vehicle: 'truck', onlyThere: true },
    { kind: 'through', id: 'B', at: 2, from: 'W', to: 'E' },
  ],
  seconds: 80,
  expectations: (r) => [parksIn(r, 'A', 'double:'), leavesBy(r, 'A', 80), passesBy(r, 'B', 65), brakesUnder(r, 'B', 400), clean(r, 'A')],
};

export const SCENARIOS: readonly Scenario[] = [KERB_PARALLEL, FORECOURT_FAR, CARPARK_GATE, CROSS_RIGHT, ROUNDABOUT, DOUBLE_PARK];
