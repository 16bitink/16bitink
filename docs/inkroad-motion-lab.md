# InkRoad motion lab

The owner, November 27: "find a way of testing the car behavior automatically and iterating on it, we need tests for every situation".

`test/motion.test.ts` plays whole seasons and says *that* the car motion rules break (docs/inkroad-build.md "Car motion rules"). The motion lab says *where* and *in which situation*: each scenario is a tiny city with a script of cars, played through the real code, and every rule break comes with a car, a time, a value against its limit and a pose.

## What a scenario is

- A tiny map: `size`, `roads` (cells, type, one-way), `gates`, `lots` (blocks), `controls` (yield, signal, roundabout), `kerbs` (roads that get paid bays; other streets keep a bare kerb), `carParks`, `fill` (places filled to the last space before the start).
- Actors (kinds: `arrive`, `parked`, `through`, `rider`, `blocker`):
  - `arrive`: drives in from a gate at a time, parks in a given place (`{ kerb: cell }`, `{ street: cell }`, `{ lot: name }`, `{ park: n }`) or wherever the city sends it, stays, leaves for `home`. `onlyThere` makes the driver try nothing else (then the city's last resort: double parking). `vehicle`: car, van, truck.
  - `parked`: stands in a place (and slot) from the start, leaves at `leaveAt` for gate `to`, or never.
  - `through`: drives gate to gate.
- `flows`: background traffic, one car every `every` seconds between `start` and `until` (named `bg`).
- `seconds` to play, and `expectations`: the scenario's own checks.

It runs the real `createCity`, the city's legs, parking, manoeuvre, door and crossing code and `traffic.step`. Only the day's demand is replaced: after dawn the plan, happenings and warm-up cars are cleared (`quiet` in `test/motion/lab.ts`) and the script starts the actors through the city's own `newLeg` and `drive`. Every drawn car is sampled 6 frames a sim step through the renderer's pure code (`MotionWatch`: `glideAt`, `ManoeuvreCore`, `layoutPlace`). Fixed seed (`LAB_SEED`), fixed headways: the same run every time.

Two map facts every scenario needs: traffic routes junction to junction, so a road straight from gate to gate has no route, and a car from a gate cannot aim at a place on the gate's own road. Put the places on a road between two junctions (see `STREET_EW` in `test/motion/scenarios.ts`). Car parks need a cell of room from the road; blocks may touch it.

## The trace and the checks

Per car per frame: x, y, heading, speed (negative in reverse), gear (D, R, P), state (moving, manoeuvre, parked), what it is doing (its track, or the manoeuvre's mode/dir/phase), body size, and who (actor id, `bg`, `fill`).

Every scenario gets the generic checks:

| Rule | Where | Limit |
|---|---|---|
| slip | MotionWatch | heading within 0.1 rad of each frame's move |
| too tight, turns in place | MotionWatch | radius at least 0.9 R_MIN (16.6 px); no heading change standing still |
| reverse on the road, reverse too fast | MotionWatch | reverse only in a manoeuvre, at most 7.2 px/s |
| too fast on a curve | MotionWatch | √(a·R) at the played pace, ×1.25 slack |
| jumps | MotionWatch | over 150 px/s between two frames |
| bodies overlap | MotionWatch | oriented boxes, 0.4 px touch allowed |
| cuts across without a gap | MotionWatch | a moving car within 1 s of a manoeuvring body |
| drives on the left | `test/motion/checks.ts` | a moving car on a two-way road, lined up with it, away from junctions, over 1.5 px left of the middle |
| crosses a kerb | `test/motion/checks.ts` | joining or leaving the paved band (half width + 2 px, + 11 px on streets and bay roads) more than 24 px from every way in (block and car park accesses, gates) |

Expectation helpers (`test/motion/checks.ts`): `parksIn(r, 'A', 'kerb:')`, `leavesBy(r, 'A', s)`, `passesBy(r, 'B', s)`, `brakesUnder(r, 'B', px/s²)`, `clean(r, 'A')` (no violation by A), `standsOffRoad`, `wasInside(r, 'A', rect)`, `anticlockwise(r, 'A', junction)`, and the raw pieces: `parkIns`, `parkOuts`, `firstManoeuvre`, `closest`, `lotDoor`, `samplesOf`, `hardestBrake`.

## Running it

- `npm run motion -- all`: one line per scenario: PASS or FAIL, violations by rule, expectations.
- `npm run motion -- park.kerb`: a named one (an id or its start) also prints its expectations, the violation timeline (time, frame, who, rule, value vs limit, pose, detail) and an ASCII top-down frame at the first violation (`.` road, `#` kerb, `+` block, `%` car park, cars as boxes with their letter, nose in capitals, `o` background, `p` parked, `!` and `^` the car at fault).
  - `--who A`, `--rule slip` filter the timeline; `--log n` shows n lines; `--frame n` draws that frame instead.
- Switches, without editing code: `--switch PLANNED_TIMES=on ROOMY_CORNERS=on GAP_ACCEPT=on`, `--on` (all), `--both` (defaults, then all on), or `MOTION_SWITCHES=PLANNED_TIMES,ROOMY_CORNERS npm run motion -- all`. In code: `runScenario(s, { PLANNED_TIMES: true })` or `setSwitches` (`src/sim/switches.ts`); set them before a city is made (ROOMY_CORNERS sizes junctions when the network is built).
- `--json`: the counts and failing expectations, for updating the ratchet.
- `npm run motion -- list`: the catalogue, built or todo.
- `npm run motion -- table`: the catalogue table below (each id's verdict and count with the switches off and all on, and its main failure), in markdown.
- `npx vitest run test/motion`: the ratchet, about 1 s.
- Eyes: `npm run dev`, then http://localhost:5181/motion.html?s=park.forecourt.far-lane (add `&PLANNED_TIMES=1&ROOMY_CORNERS=1&GAP_ACCEPT=1`). Pick a scenario and switches; it runs in the browser. Road ribbons, kerbs, blocks, car parks and their slots, cars as oriented boxes with heading arrows (yellow outline: manoeuvring; `R`: reversing), trails (orange in reverse). Play, pause, frame by frame (arrow keys, shift for a second), speed 0.1x to 4x, drag to pan, wheel to zoom. Violations are red ticks on the timeline and red on the car; the list jumps to each.

## The ratchet

`test/motion/scenarios.test.ts` runs every built scenario with the switches off and on. For each: violation counts per rule may not rise, and an expectation that passes may not start failing (`KNOWN`). A fix shows up as a count going down: lower the table to the new numbers (`npm run motion -- all --both --json`). `MOTION_STRICT=1` asks for zero and every expectation. Situations without a scenario are `it.todo`.

## Adding a scenario

Copy one from `test/motion/scenarios.ts`, add it to `SCENARIOS`, mark its catalogue entry `built: true` in `test/motion/catalogue.ts`, run `npm run motion -- <id> --both`, then add its counts and failing expectations to `KNOWN`.

```ts
export const LEAVE_BUSY: Scenario = {
  id: 'park.kerb.leave-busy',
  title: 'Leaving a kerb bay into a busy lane',
  expect: 'A in a kerb bay waits at its slot until the lane has a 3 s gap, then pulls out; no car behind brakes over 400 px/s²',
  ...STREET_EW,                       // map, gates, the Shop block
  kerbs: [[6, 4]],
  actors: [{ kind: 'parked', id: 'A', spot: { kerb: [6, 4] }, slot: 4, lot: 'Shop', leaveAt: 2, to: 'E' }],
  flows: [{ from: 'W', to: 'E', every: 2.5 }],
  seconds: 30,
  expectations: (r) => [leavesBy(r, 'A', 30), brakesUnder(r, 'bg', 400), clean(r, 'A')],
};
```

### Hooks for setting a situation up

All generic, all in `test/motion/lab.ts` (`Scenario`, `Actor`):

- `setup?: (v: CityView) => void`: called in boot after kerbs and car parks, before dawn. Use `must(v, cmd)` (throws when refused) for `flyover` (then `finishWorks(v)` plays whole days until the works are done: a flyover takes two seasons) and for bus lines (`line`, `lineVehicles`). A bus line's own buses stay when the day's warm-up cars are cleared, and are named `bus` in the trace.
- `map?: string[]`: terrain rows (size[1] rows of size[0] chars: `.` ground, `~` water, `b` sand). Water under a road makes it a bridge.
- `beaches?: { name, cell, w, h }[]`: each becomes a `CityDef` beach (decide year 1) and boot sends `{ t: 'beach', advice: 'public' }`, so its sand spot exists. Park there with `spot: { sand: name }`.
- through actor `to: string | Cell`: a gate id, or a cell (the junction there, else the road through it). A street that ends without a gate is a dead end; a car sent to its end must turn round (the lone car arrives at the node: see drive.deadend.turn). Flows take the same `to`.
- `{ kind: 'blocker', id, at, cell, hold, state? }`: a broken-down vehicle (`traffic.block`) holds the lane through `cell` for `hold` s. A car stuck behind it gives up after 60 s, so the scenario must run 100 s or so.
- arrive actor: `fuel: true` makes the trip a stop of a tour chain at a petrol lot (`lot` is the station), so a car finding all four pumps busy queues in the lane (`queueAtPump`); fill pumps with `parked` actors on `{ lot: 'Pump' }`. `mode: 'taxi'` makes it a taxi dropping its rider at the lot's kerb.
- `{ kind: 'rider', id, at, lot, home }`: the rider's way home by taxi (the city's `callTaxi`): a taxi comes from the nearest gate, waits at the kerb, takes them home. The taxi is named `id`.
- `Sample.z`: the drawn height (flyover decks up, underpasses down).

Limits met: a lone road from gate to gate with no junction never spawns a car (give the lab street a side street); a one-way street's gate at its exit end is an entry only for the other direction, never reachable (send cars to the other end).

## The catalogue

Generated by `npm run motion -- table` (November 27, after fix round 1b: docs/inkroad-build.md "Car motion rules"; drive.works.closed added with road works closing the road). "Defaults" is today's game; "on" is PLANNED_TIMES, ROOMY_CORNERS, GAP_ACCEPT and ROAD_STOPS all on. A verdict is PASS only with every expectation met and no rule broken. The expectation text of each id is in `test/motion/catalogue.ts` (`npm run motion -- list`).

| Id | Defaults (switches off) | Switches on | Main failure (today) |
|---|---|---|---|
| park.kerb.parallel-traffic | FAIL, 138 violations | FAIL, 33 violations | off: 78 reverse too fast (manoeuvre), 26 too fast on a curve (moving). on: 25 too fast on a curve (moving), 8 too tight (moving) |
| park.forecourt.far-lane | FAIL, 77 violations | FAIL, 39 violations | off: A waits for B before crossing. on: A waits for B before crossing; A parks off the road; A leaves and is gone by 36 s |
| park.carpark.gate-aisle | FAIL, 216 violations | FAIL, 38 violations | off: 75 too fast on a curve (manoeuvre), 73 reverse too fast (manoeuvre). on: A leaves and is gone by 36 s |
| drive.cross.right | FAIL, 36 violations | FAIL, 48 violations | off: 29 too tight (moving), 7 too fast on a curve (moving). on: 48 too fast on a curve (moving) |
| drive.roundabout.exits | FAIL, 665 violations | FAIL, 665 violations | off: 494 too fast on a curve (moving), 170 too tight (moving). on: 494 too fast on a curve (moving), 170 too tight (moving) |
| park.double.park-leave | FAIL, 192 violations | FAIL, 42 violations | off: 76 jumps (manoeuvre), 42 too fast on a curve (moving). on: 27 too fast on a curve (moving), 12 too tight (moving) |
| park.kerb.far-side | FAIL, 211 violations | FAIL, 44 violations | off: A never crosses the oncoming lane head-on. on: A never crosses the oncoming lane head-on |
| park.kerb.one-way | FAIL, 384 violations | FAIL, 160 violations | off: A stands nose east, front first; A pulls out forward; C pulls out forward. on: 132 too fast on a curve (moving), 20 too tight (moving) |
| park.kerb.leave-busy | FAIL, 46 violations | PASS, 0 | off: A sets out only with a 3 s gap in the lane |
| park.kerb.neighbour-swap | FAIL, 181 violations | FAIL, 33 violations | off: 111 reverse too fast (manoeuvre), 26 too fast on a curve (manoeuvre). on: 17 too tight (moving), 16 too fast on a curve (moving) |
| park.street.unmarked | FAIL, 135 violations | FAIL, 30 violations | off: A pulls over with a forward S, not reversing in; A pulls out forward. on: 22 too fast on a curve (moving), 8 too tight (moving) |
| park.forecourt.near-lane | FAIL, 76 violations | FAIL, 37 violations | off: A stands square to the kerb. on: A stands square to the kerb; A leaves and is gone by 36 s |
| park.van.two-slots | FAIL, 140 violations | FAIL, 34 violations | off: the van stands across both free slots. on: the van stands across both free slots |
| drive.cross.left | FAIL, 45 violations | FAIL, 53 violations | off: A starts across only with a 3 s gap. on: 43 too fast on a curve (moving), 10 too tight (moving) |
| drive.cross.straight | PASS, 0 | PASS, 0 | clean |
| drive.follow.queue | FAIL, 184 violations | FAIL, 59 violations | off: 76 jumps (manoeuvre), 26 too fast on a curve (moving). on: 27 too fast on a curve (moving), 12 too tight (moving) |
| drive.yield.go | PASS, 0 | PASS, 0 | clean |
| drive.signal.cycle | PASS, 0 | PASS, 0 | clean |
| drive.lanes.change | FAIL, 506 violations | FAIL, 358 violations | off: 359 too fast on a curve (moving), 76 jumps (manoeuvre). on: 321 too fast on a curve (moving), 26 too tight (moving) |
| drive.t.all | FAIL, 163 violations | FAIL, 212 violations | off: 87 too fast on a curve (moving), 76 too tight (moving). on: 198 too fast on a curve (moving), 14 too tight (moving) |
| drive.gate.inout | FAIL, 442 violations | FAIL, 619 violations | off: 336 too tight (moving), 106 too fast on a curve (moving). on: 604 too fast on a curve (moving), 15 too tight (moving) |
| drive.diagonal | FAIL, 1485 violations | FAIL, 1513 violations | off: 1414 too fast on a curve (moving), 71 too tight (moving). on: 1496 too fast on a curve (moving), 17 too tight (moving) |
| drive.oneway | FAIL, 197 violations | FAIL, 108 violations | off: 195 too fast on a curve (moving), 2 too tight (moving). on: 108 too fast on a curve (moving) |
| drive.flyover.ramps | FAIL, 342 violations | FAIL, 269 violations | off: 342 too fast on a curve (moving). on: 269 too fast on a curve (moving) |
| drive.bridge | PASS, 0 | PASS, 0 | clean |
| drive.bus.stop | PASS, 0 | PASS, 0 | clean |
| drive.deadend.turn | FAIL, 404 violations | FAIL, 165 violations | off: A never turns on the spot (no heading change while standing). on: B (a van) turned round too; A is through by 40 s |
| drive.jam.giveup | FAIL, 309 violations | FAIL, 85 violations | off: A pulled over to the shoulder (stood off its lane). on: 73 too fast on a curve (moving), 7 bodies overlap (manoeuvre) |
| drive.works.closed | FAIL, 1349 violations | FAIL, 1543 violations | off: 935 too fast on a curve (moving), 414 too tight (moving). on: 1529 too fast on a curve (moving), 14 too tight (moving) |
| park.carpark.multi-entrance | FAIL, 135 violations | FAIL, 33 violations | off: 41 too fast on a curve (manoeuvre), 41 jumps (manoeuvre). on: A is not drawn for the stay; A leaves and is gone by 36 s |
| park.carpark.underground | FAIL, 135 violations | FAIL, 33 violations | off: A is never drawn deeper than 12 px inside the box. on: A is not drawn for the stay; A is never drawn deeper than 12 px inside the box; A leaves and is gone by 36 s |
| park.night.home | FAIL, 154 violations | FAIL, 71 violations | off: 64 jumps (manoeuvre), 46 too fast on a curve (moving). on: B drives in before it stands |
| city.road-removed | FAIL, 0 violations | FAIL, 0 violations | off: no car teleports. on: no car teleports |
| city.year-start | PASS, 0 | PASS, 0 | clean |
| park.taxi.drop | FAIL, 181 violations | FAIL, 53 violations | off: it pulled out forward. on: 40 too fast on a curve (moving), 13 too tight (moving) |
| park.taxi.pick | FAIL, 171 violations | FAIL, 26 violations | off: it pulled out forward or turned round with a three-point turn at walking pace. on: 6 too tight (moving), 6 too fast on a curve (moving) |
| park.petrol.queue | FAIL, 514 violations | FAIL, 137 violations | off: nothing overlaps at the station. on: A and B took a pump each; C and D found every pump in use and queued in the lane; nothing overlaps at the station |
| park.beach.sand | FAIL, 116 violations | FAIL, 33 violations | off: 40 reverse too fast (manoeuvre), 26 jumps (manoeuvre). on: A stands on the sand; A left through the same access; A leaves and is gone by 40 s |

38 situations: 38 built, 0 todo.

What the first six showed (phase 1):
- With the switches off, the manoeuvres are rushed (reverse at 9 to 135 px/s against 7.2, jumps of 4 to 7 px a frame): the city's short fixed holds squeeze the drawn path. PLANNED_TIMES removes nearly all of it (kerb 138 to 34, car park 216 to 38, double parking 192 to 50) but its long holds make A late to leave in three scenarios.
- Pulling over to a kerb bay, a driveway or a double-parking spot starts with a swerve at full speed (49 to 55 px/s on a 9 to 20 px radius) before the manoeuvre takes over: the moving car's own swing to the kerb (`too tight (moving)`, `too fast on a curve (moving)` at 5 to 6.6 s in the first scenarios).
- The far-lane forecourt does not wait for oncoming B with either setting (A turns at 5.4 to 5.6 s, B passes the driveway at 7.1 to 7.5 s), and cuts B off twice.
- Junction turns and roundabouts are taken at street speed: the curve-speed rule is the biggest count everywhere moving cars turn.
- The double-parked lorry swings its body over the parked kerb cars (`bodies overlap` with `fill` cars).

## Files

- `test/motion/lab.ts`: scenario types, the tiny city, the script (`Director`), `runScenario`, the trace.
- `test/motion/checks.ts`: the trace checks (drives on the left, crosses a kerb) and expectation helpers.
- `test/motion/ascii.ts`: the ASCII frame.
- `test/motion/scenarios.ts` (the first six), `scenarios.parking.ts`, `scenarios.driving.ts`, `scenarios.city.ts` (each with its own ratchet table) and `all.ts` (the list): the built scenarios. `test/motion/catalogue.ts`: every situation. `test/motion/scenarios.test.ts`: the ratchet.
- `dev/motion.mjs` + `dev/motionCli.ts`: `npm run motion`. `dev/motion.html` + `dev/motionPage.ts`: the replay page.
- `src/sim/switches.ts`: the switches as one config object (the only engine change of this phase; `PLANNED_TIMES` is now read through `plannedTimes()` in `src/city/manoeuvre.ts` and `src/city/door.ts`, `ROOMY_CORNERS` through `roomyCorners()` in `src/sim/netCore.ts` and the kerb fillet in `src/render/ground/roadShape.ts`; defaults unchanged, both off).
- `test/motion-helpers.ts` (MotionWatch) gained hooks for the lab (`before` each step, `onFrame`), the pose, frame, value and limit on each finding, and `lastEvents`; the season test uses it as before.
