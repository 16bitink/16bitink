/**
 * Every situation the motion lab must cover (docs/inkroad-motion-lab.md keeps the same list with its results).
 * A situation with a scenario in all.ts runs; the rest are `it.todo` in scenarios.test.ts until a scenario is written. (`built` is informational.)
 */
export interface Situation { readonly id: string; readonly expect: string; readonly built?: boolean }

export const CATALOGUE: readonly Situation[] = [
  // ---- parking in and out
  { id: 'park.kerb.parallel-traffic', built: true, expect: 'A backs into a kerb bay with an S from ahead while B follows; pulls out forward into a gap and leaves' },
  { id: 'park.kerb.far-side', built: true, expect: 'A parks in a bay on the far (left) kerb only by going round, never across the oncoming lane head-on; leaves on its own side' },
  { id: 'park.kerb.one-way', built: true, expect: 'On a one-way street A parks on either kerb, front first in the direction of travel, and pulls out forward' },
  { id: 'park.kerb.leave-busy', built: true, expect: 'A in a kerb bay waits at its slot until the lane has a 3 s gap, then pulls out; no car behind brakes over 400 px/s²' },
  { id: 'park.kerb.neighbour-swap', built: true, expect: 'B leaves a bay while A arrives for the one beside it: no overlap, A waits for B to clear, both in R_MIN arcs' },
  { id: 'park.street.unmarked', built: true, expect: 'A pulls over to a bare kerb (no bays) with a forward S, stops parallel, later pulls out forward' },
  { id: 'park.forecourt.near-lane', built: true, expect: 'From the near lane A backs into a forecourt space with an S, square to the kerb; leaves forward' },
  { id: 'park.forecourt.far-lane', built: true, expect: 'From the far lane A waits for oncoming B to pass, turns across with a 3 s gap, ends in a forecourt space; nothing overlaps' },
  { id: 'park.carpark.gate-aisle', built: true, expect: 'A enters a surface car park through its gate, drives the aisle, lines up on its bay column and goes straight in; leaves the same way' },
  { id: 'park.carpark.multi-entrance', built: true, expect: 'A drives into a multi-storey entrance and disappears inside the box (no slots drawn), comes out of the same mouth later' },
  { id: 'park.carpark.underground', built: true, expect: 'As the multi-storey: an underground ramp mouth, no car drawn over the box' },
  { id: 'park.beach.sand', built: true, expect: 'A turns off at the beach lot access onto the sand, parks in a sand slot, leaves through the same access' },
  { id: 'park.double.park-leave', built: true, expect: 'A double-parks with a forward S beside the full kerb, B behind it waits or passes; A pulls back into the lane forward and leaves' },
  { id: 'park.petrol.queue', built: true, expect: 'Three cars arrive at a petrol station: one per pump, the rest queue in the lane end to end, no overlap, each leaves forward' },
  { id: 'park.taxi.drop', built: true, expect: 'A taxi stops at the kerb with a forward S, drops off for 3 s, pulls out into a gap' },
  { id: 'park.taxi.pick', built: true, expect: 'A taxi comes to fetch a rider, waits 4 s at the kerb, leaves for the rider\'s destination' },
  { id: 'park.van.two-slots', built: true, expect: 'A van (or lorry) takes two kerb slots, its body inside both, neighbours never overlap it' },
  { id: 'park.night.home', built: true, expect: 'Household cars come home at night and park in their own spaces; no car is put in place without driving' },
  // ---- driving
  { id: 'drive.follow.queue', built: true, expect: 'Cars follow at a safe gap and queue behind a stopped one; none overlaps, none brakes over 400 px/s²' },
  { id: 'drive.yield.go', built: true, expect: 'At a yield junction A stops for a car on the main road, then goes; no overlap in the box' },
  { id: 'drive.signal.cycle', built: true, expect: 'At signals cars stop on red and go on green; the queue clears without overlaps' },
  { id: 'drive.cross.right', built: true, expect: 'At a one-cell crossroads A turns right from the right lane into the right lane, on an arc no tighter than R_MIN, no slip' },
  { id: 'drive.cross.left', built: true, expect: 'A turns left across oncoming traffic: waits for a 3 s gap, holds the lane while crossing, ends in the right lane' },
  { id: 'drive.cross.straight', built: true, expect: 'A goes straight over a crossroads with cross traffic: no overlap, no cut-off' },
  { id: 'drive.diagonal', built: true, expect: 'A drives a 45° street and turns from it onto a straight one and back: heading follows the road, R_MIN at the bends, kerbs never crossed' },
  { id: 'drive.t.all', built: true, expect: 'At a T junction every turn (right, left, straight on the bar) keeps to the right and R_MIN' },
  { id: 'drive.roundabout.exits', built: true, expect: 'Cars enter a roundabout and take every exit (first, second, third, back): anticlockwise, right lane, no overlap' },
  { id: 'drive.lanes.change', built: true, expect: 'On an avenue cars change lanes with a smooth S (no slip), never into a car beside them' },
  { id: 'drive.deadend.turn', built: true, expect: 'At a dead end A turns round with a three-point turn (or a U where it fits), never on the spot' },
  { id: 'drive.oneway', built: true, expect: 'On a one-way street cars use both lanes in the one direction; none drives against it' },
  { id: 'drive.flyover.ramps', built: true, expect: 'Cars take a flyover ramp up and down: smooth heading, no jump in z, no overlap with cars below' },
  { id: 'drive.bridge', built: true, expect: 'Cars cross a bridge over water on their lane, no slip' },
  { id: 'drive.bus.stop', built: true, expect: 'A bus pulls into its stop and out again with forward S moves; cars behind wait or pass, no overlap' },
  { id: 'drive.gate.inout', built: true, expect: 'Cars enter at a map gate and leave at another without appearing or vanishing away from the gate' },
  { id: 'drive.jam.giveup', built: true, expect: 'A car stuck in a jam gives up and pulls over to the shoulder with a forward S, then drives off when it can' },
  // ---- the city changing under the cars
  { id: 'city.road-removed', built: true, expect: 'A road with parked cars is removed: the cars drive away or are moved with a drawn move, never teleport' },
  { id: 'city.year-start', built: true, expect: 'A new year starts (or a save is loaded): no car jumps, appears or vanishes away from a gate or a drawn move' },
];
