# InkRoad vehicle model (step 1: prototype in the lab)

The owner, November 27: after several rounds of fixes cars still slide, spin on the spot, loop at driveways and make impossible U-turns. "Let's do this properly." The root cause is that no single model decides where a drawn car is: sim lane and junction tracks, the render glide between sim steps, scripted manoeuvre paths squeezed into fixed hold times, and parked poses each draw part of a car's life, with seams between them.

Step 1 (this document) builds one vehicle model, apart from the game, and compares it with today's motion in the motion lab. Nothing in the game uses it yet. Step 2 wires it in (the plan is at the end).

## What was built

| File | What |
|---|---|
| `games/inkroad/src/sim/vehicle/params.ts` | Limits per vehicle kind, real numbers turned into plan px and played seconds |
| `src/sim/vehicle/bicycle.ts` | The kinematic bicycle at the rear axle; the limits are applied inside the step |
| `src/sim/vehicle/path.ts` | Reference paths: legs in one gear, densely sampled (pose, steering curvature, speed cap) |
| `src/sim/vehicle/reedsShepp.ts` | Reeds–Shepp candidates and sampling (ported from PythonRobotics, MIT, credited in the header) |
| `src/sim/vehicle/planner.ts` | RS manoeuvre planning against the ground and other bodies, over several start and goal offers |
| `src/sim/vehicle/turns.ts` | Junction turns as clothoid, arc, clothoid; lane changes as quintic shifts |
| `src/sim/vehicle/speedProfile.ts` | Speed along a leg: curve rule, steering-swing rule, accel and brake passes |
| `src/sim/vehicle/tracker.ts` | The controller and plan player: steering, speed, stops at cusps, gear changes, steering while standing |
| `test/vehicle/invariants.ts` | Physics checks per drawn frame (used for today's motion and the new model alike) |
| `test/vehicle/ground.ts`, `test/vehicle/scene.ts` | One lab scenario run both ways: today's trace, and the same car on the new model |
| `test/vehicle/*.test.ts` | RS against the reference, tracker accuracy, invariants, every situation |
| `dev/vehicle.html` + `dev/vehiclePage.ts` | The side-by-side page; `dev/vehicle.mjs` + `dev/vehicleCli.ts` print the table and the benchmark |

How to run it:
- The page: `npm run dev`, then http://localhost:5181/vehicle.html?s=kerb-parallel. It has play, frame step (arrow keys), slow motion and scrubbing. Other URL options: `&all=1` draws the whole route, `&zoom=1.4`, and `&play=1&until=20` for recording.
- The table: `node dev/vehicle.mjs` (add `--json`, or `--bench`).
- The tests: `npx vitest run test/vehicle`.

## The model

The state is the rear axle (x, y), the body heading θ, speed u ≥ 0 with a gear (forward or reverse), the road-wheel angle δ and the acceleration a. The equations are ẋ = v·cosθ, ẏ = v·sinθ, θ̇ = v·tanδ / L.

Each step is integrated exactly as an arc. The controls are a wanted acceleration and a wanted wheel angle, and the step clamps them:
- δ stays within ±δmax and changes by at most steerRate·dt.
- a stays between −brake and +accel and changes by at most jerk·dt.
- The gear changes only at a standstill.

Because the limits sit inside the step, no controller can make a car slide, pivot, steer faster than its wheels or brake harder than it can. The drawn pose is the middle of the body, `toMiddle` ahead of the rear axle. A car's middle therefore swings out on a turn while its rear axle follows the path: this is off-tracking.

### Limits

The game plays its cars `GAME_PACE` = 1.25 times faster than life (measured by road speed, `src/sim/kinematics.ts`), so each limit is scaled to played time:
- speed × 1.25
- acceleration × 1.25²
- jerk × 1.25³
- steering rate × 1.25

One metre is 3.55 px (a 4.5 m car is drawn 16 px long).

| Limit | Real | Played (car) | Source / reasoning |
|---|---|---|---|
| Wheelbase | 0.6 × body length (2.7 m) | 9.6 px | Golf / Corolla class: 4.3–4.6 m long, 2.64–2.70 m wheelbase |
| Rear axle to middle | 1.35 m (0.9 m rear overhang) | 4.8 px | the same cars |
| Full lock δmax | 28.3° | | Keeps the game's corner: the middle turns no tighter than `R_MIN` = 5.2 m, so the rear axle turns at 5.02 m. A real Golf manages 3.9 m at the rear axle (10.8 m kerb to kerb). Every kind drives this much gentler than its catalogue full lock (factor 1.29). |
| rMin (rear axle) | 5.02 m | 17.8 px | the line above |
| Planned radius | 1.1 × rMin | 19.6 px | Leaves the tracker 10% of the lock for corrections |
| Steering rate (road wheels) | 30°/s | 37.5°/s | A brisk hand-over-hand turn: about 1.3 wheel turns a second at a 15:1 ratio |
| Acceleration | 2.5 m/s² | 13.9 px/s² | City driving uses 1.5–3 (Bokare & Maurya 2017, acceleration of vehicle types) |
| Braking (most) | 3.5 m/s² | 19.4 px/s² | AASHTO Green Book designs stopping at 3.4 m/s² |
| Braking (planned) | 2.2 m/s² | 12.2 px/s² | Under the most, so a stop limited by jerk still lands on its mark |
| Jerk | 3 m/s³ | 20.8 px/s³ | Comfort studies (Hoberock 1977 survey) put normal driving at 2–3 |
| Sideways pull on a curve | 3 m/s² | 16.6 px/s² | The game's `A_LAT`; speed is planned at 85% of it |
| Reverse | 1.5 m/s | 6.65 px/s | The game's `REVERSE_MAX`, walking pace |
| Forward while manoeuvring | 2.5 m/s (9 km/h) | 11.1 px/s | |
| Gear change | 0.5 s | 0.4 s | |

Vans, lorries and buses take their own wheelbase share, rear overhang and catalogue turning circle (`REAL` in `params.ts`), with the same gentleness factor. A lorry's rear axle turns at about 6.0 m, a van's at about 5.4 m.

## The controller

The controller is rear-wheel feedback, the Frenet form of the kinematic car (Samson). The tracker computes:
- the sideways error e of the rear axle from the reference;
- the heading error ψ;
- the curvature it commands: κ = κref·cosψ / (1 − κref·e) − kθ·ψ − kₑ·e·sinψ/ψ.

Some details of how it is set up:
- The gains are critically damped along the path: kθ = 0.9 / wheelbase and kₑ = kθ² / 4.
- κref is read a little ahead. The preview is half the "lag" the speed plan allows, plus 0.15 s of travel, so the wheels swing centred on a change of curvature.
- The law is written in the direction of travel, so reverse uses the same law.

Pure pursuit was built first and is still in the file (`pursuit`). It left 6.6° of heading error at the end of a parallel park and cut corners at the clothoid entries, so it is not used.

This form also fits integration best. The sim already owns progress s and speed along its track (IDM, queues, balance). In the Frenet form, the drawn car keeps only e, ψ and δ of its own, and the sim's s and v drive it forward (see step 2).

The tracker also handles the stops and gears:
- **Speed** follows the leg's profile. For braking, it looks at points 0.25 to 1.4 s ahead and takes the hardest need, (v_there² − u²) / 2d. This starts the braking early enough despite the jerk limit.
- **Cusps:** each leg ends in a stop. At a cusp the car stands for the gear change and turns its wheels for the next leg while standing (dry steering), then sets off.
- **Last leg:** the final leg of a car leaving the map is "open": it runs out at speed, with no stop at the gate.

The speed profile caps the speed at each sample by four things:
- the leg's own cap (the lane's speed, or the manoeuvring pace);
- the curve rule, √(0.85·aLat / κ), using the sharpest curvature the tracker will already be steering for;
- a steering-swing rule: where the wheels must swing by Δδ, the car rolls at most a "lag" distance while they do (3 px manoeuvring, 4 px on roads);
- forward and backward passes for acceleration and braking.

## Reference paths

- **Lanes:** the sim's own lane tracks (`buildWorld`, the same geometry the sim drives).
- **Junction turns:** the sim's turn Bezier is replaced by clothoid in, arc, clothoid out. 60% of the heading change is made in the clothoids, so curvature never jumps. The curve is as wide as the corner allows (up to 2.5 planned radii) and never tighter than the planned radius. Where the corner is too small, the turn starts earlier on the lane in and ends later on the lane out.
- **Straight on with a jog, lane changes:** a quintic sideways shift. A lane change takes 2.5 s of travel where the lanes are long enough, and is never tighter than the planned radius.
- **Roundabouts:** the sim's ring pieces, resampled and smoothed. They are already about R_MIN, so this ring is driven at 15–17 px/s.
- **U-turns, parking, driveways, turning round:** Reeds–Shepp at the planned radius, as described below.
  - Several start and goal poses are offered: points every 4 px along the lane, priced by distance.
  - Every candidate is checked every 1.5 px. The body's corners must be on drivable ground: road bands with the parking band, junction discs, blocks and car parks, slots, and a driveway apron from each slot to its road. The body must also stay clear of parked bodies.
  - The cheapest fitting candidate wins. Reverse costs 1.6 times forward, and each gear change costs 1.5 body lengths.
  - A move into a slot ends with a 5 px straight in the last gear, so the car stands square: it parks within 0.1–0.7 px and 0–4° of the slot.
  - If no U fits at a junction, RS still finds a three-point turn. "Way behind" and the crossroads case come out as a two-point turn out of the kerb space (reverse out at an angle, then forward into the far lane), not a U in the junction box.

**RS source.** PythonRobotics, `PathPlanning/ReedsSheppPath/reeds_shepp_path_planning.py` (Atsushi Sakai, Videh Patel), MIT licence. All 12 word families and their 4 symmetries are ported unchanged. The tests compare candidate counts, shortest lengths, words and segment lengths with the reference's own output in 8 cases, and check that every candidate ends on its goal.

**Hybrid A\*.** It is needed in one case. In `drive.uturn.avenue`, B's driveway pose stands in A's lane, 9 px inside the avenue, and no RS path out of A's slot clears it. Hybrid A* (or waiting for B) would solve that. Every other situation is solved by RS.

## Invariants

`test/vehicle/invariants.ts` checks every drawn frame. The rear axle is found from the drawn middle and heading. The checks are:
- rear-axle slip (rad, and sideways px/s);
- curvature against full lock;
- pivots (heading change while the rear axle stands);
- the rate of change of the wheel angle the curvature implies, against the steering rate;
- acceleration, braking and jerk against their limits;
- speed on a curve against √(aLat / κ);
- body overlaps (oriented boxes; bodies that the car already touches at its start or end slot are left out, because they are a layout fault);
- the biggest jump in one frame.

The same checks run on today's trace of the car (each drawn body separately: a ghost drawn beside the car is its own run) and on the new model.

## Results

The table below gives maxima as ratios against the limits, today / new (1.00 = at the limit). "Moving" counts the seconds the car is drawn moving or manoeuvring.

| Situation (lab scenario) | slip rad | κ / full lock | wheel rate | accel | jerk | curve | overlaps | moving s |
|---|---|---|---|---|---|---|---|---|
| driveway near lane (park.driveway.near-lane) | 0.44 / 0 | 1.73 / 0.98 | 68 / 1.00 | 1339 / 0.91 | 45818 / 1.00 | 53 / 0.49 | 0 / 0 | 12.4 / 34.9 |
| driveway far lane (park.driveway.far-lane) | 0.44 / 0 | 1.73 / 1.00 | 35 / 1.00 | 1346 / 0.91 | 46016 / 1.00 | 84 / 0.43 | 0 / 0 | 12.4 / 35.5 |
| leave driveway, far direction | 0.26 / 0 | 1.00 / 0.92 | 45 / 1.00 | 839 / 0.91 | 25396 / 1.00 | 20 / 0.53 | 0 / 0 | 8.6 / 17.1 |
| way on behind, narrow street | 1.09 / 0 | 7.32 / 1.00 | 165 / 1.00 | 1120 / 0.91 | 40706 / 1.00 | 21 / 0.52 | 0 / 0 | 7.4 / 20.1 |
| U-turn at crossroads | 1.09 / 0 | 7.32 / 1.00 | 165 / 1.00 | 1120 / 0.91 | 40706 / 1.00 | 21 / 0.52 | 0 / 0 | 7.5 / 20.4 |
| turning round at a dead end | 0.74 / 0 | 3.39 / 1.00 | 98 / 1.00 | 2593 / 0.92 | 188049 / 1.00 | 35 / 0.92 | 47 / 0 | 18.7 / 33.4 |
| turning round on an avenue | 0.59 / 0 | 2.49 / 0.99 | 77 / 1.00 | 840 / 0.92 | 25457 / 1.00 | 20 / 0.92 | 0 / 140 | 5.6 / 21.9 |
| U-turn at a roundabout | 0.64 / 0 | 2.75 / 1.00 | 126 / 1.00 | 17 / 0.98 | 865 / 1.00 | 4.1 / 0.88 | 0 / 0 | 8.9 / 23.9 |
| kerb parallel in and out | 0.48 / 0 | 1.94 / 0.91 | 64 / 1.00 | 508 / 0.90 | 41696 / 1.00 | 11 / 0.26 | 0 / 0 | 15.7 / 30.0 |
| forecourt | 0.49 / 0 | 1.96 / 1.00 | 65 / 1.00 | 1778 / 0.91 | 62278 / 1.00 | 38 / 0.39 | 0 / 0 | 14.3 / 43.8 |
| car-park bay | 0.93 / 0 | 1.97 / 0.94 | 44 / 1.00 | 573 / 0.91 | 31390 / 1.00 | 83 / 0.54 | 0 / 0 | 15.9 / 40.8 |
| junction left turn | 0.91 / 0 | 4.78 / 0.90 | 116 / 1.00 | 23 / 0.91 | 934 / 1.00 | 4.6 / 0.92 | 0 / 0 | 7.7 / 10.7 |
| junction right turn | 0.52 / 0 | 2.15 / 0.90 | 79 / 1.00 | 22 / 0.91 | 865 / 1.00 | 2.8 / 0.92 | 0 / 0 | 7.4 / 10.4 |
| lane change | 0.68 / 0 | 2.38 / 0.07 | 143 / 0.49 | 1647 / 0.92 | 82278 / 1.00 | 31 / 0.64 | 21 / 0 | 19.8 / 14.2 |

Pivots are 0 in every case, today and new.

**Manoeuvre times of the new model** (played seconds, from the RS start pose to standing in the slot or joining the lane):

| Situation | Move | Time |
|---|---|---|
| Driveway, near lane | in (RLR, backing in) | 13.0 s |
| | out (LSL) | 8.1 s |
| Driveway, far lane | in (LRL) | 11.6 s |
| | out (LRL) | 9.3 s |
| Leaving a driveway, far direction | out (LSR) | 9.8 s |
| Way behind / crossroads | two-point turn out of the kerb (LRSR) | 13.7 s |
| Dead end | three-point turn round (RSRL) | 18.8 s |
| Kerb parallel | in (LSR + settle) | 8.4 s |
| | out (RSL) | 7.4 s |
| Forecourt | in (LRLR, two gear changes) | 20.1 s |
| | out (RSL) | 10.3 s |
| Car-park bay | in (RSL) | 12.0 s |
| | out (LSR, reversing out) | 13.8 s |

Today's fixed holds (`src/city/moveTimes.ts`) are much shorter. Overall, a car takes 1.5–3 times longer from appearing to gone. There are two reasons:
- The car brakes at 2.2 m/s² before every slow move, where today it arrives at street speed.
- At every change of curvature it rolls slowly while the wheels swing, because steering lock to lock takes 1.5 s.

Junction turns take 35–40% longer. Real physics: a 90° turn at a 5 m radius is about 14 km/h.

**Cost:** 0.62 µs per car per frame with 700 cars stepped together (0.43 ms a frame); `node dev/vehicle.mjs --bench`. RS planning takes 1–11 ms per scene, which covers every move of the run and all start and goal offers.

**Clips** are in `/private/tmp/claude-501/-Users-omegascorp-Projects-16bitink/df8d5ea6-2fd8-4789-b47c-9514eecfeac5/scratchpad/vehicle-clips/`: `01-driveway-near.mp4` to `14-lane-change.mp4` (turns at half speed, the rest at played speed), plus six PNG frames.

## What still looks wrong (new model)

- **Avenue:** B's driveway pose is inside the avenue's northbound lane (a layout or scenario fault). The new model has no clear path out and is drawn through B (140 overlapping frames). It needs Hybrid A* or a wait for B.
- **Far-lane driveway:** `park.driveway.far-lane` puts the Home lot's spaces in the road's south band, so it doesn't test a far-lane entry. The same holds for today's motion. This belongs to the motion-lab agent.
- **Shortcuts across the ground:**
  - The ground lets a car drive anywhere inside a block or car-park rectangle, and across the apron from any slot to its road.
  - The car park has no aisles, so the car-park car reverses out of its bay across the verge into the road, and the way-behind car backs onto the shop's forecourt to turn.
  - Step 2 needs real accesses: the lab already knows "ways in" (`test/motion/checks.ts`).
- **No traffic:** only the chosen car runs on the new model, and other traffic is today's ghosts. Gap acceptance is not modelled. For example, a car backing into a driveway swings its nose over the centre line without looking for oncoming cars.
- **Slow S swings:** where an RS path switches from full lock one way to the other, the car slows to about 2 px/s for a second. Continuous-curvature RS (Fraichard and Scheuer) would let it steer while rolling, and is the next refinement.
- **Slow small rings:** the lab's roundabout ring is about R_MIN, so cars crawl through the entry and exit S at 3–6 px/s.

## Step 2: integration plan

**What replaces what:**
- `glide.ts` is replaced by the bicycle state, integrated per frame.
- The junction Beziers in `nodeBuild.ts`, including U-turns, become clothoid turns. A U-turn is drawn only where `junctionTurn` or a forward RS fits the junction ground. Otherwise the route goes round, or the car makes an RS three-point turn and holds the junction meanwhile.
- `drivePath.ts`, `parkPaths.ts`, `parkMove.ts` and `render/cars/manoeuvre*.ts` are replaced by `planManoeuvre` over the city's real ground: slots, accesses, aisles and parked bodies.
- `parkedCars.ts` poses become the end pose of each move.

**How the sim and the drawn car stay in sync (Frenet).**
- The sim keeps s and v on its tracks, which are now the new references.
- The drawn car keeps e, ψ, δ and a, and is driven by ds/dt from the sim. Its speed limits move into the sim: IDM acceleration ≤ accel, braking ≤ brake, and a per-sample vmax of √(aLat / κ) and the swing rule on each track.
- A manoeuvre is planned once when it starts. Its duration comes from playing the plan once (as in this lab), and the sim holds the lane only while the body is in it. This replaces `moveTimes.ts`, `PLANNED_TIMES` and `holdLonger`.

**At 4× speed:** integrate in sub-steps of ≤ 1/60 played second. Each sub-step costs 0.6 µs per car, so 700 cars at 4× is about 1.7 ms a frame. Cars leave the screen at speed (open last legs).

**Balance.** Manoeuvres take 8–20 s instead of today's short holds, and turns are 35–40% slower. Planning on the step after rebalancing:
- Rerun the bots and the do-nothing city with the new times.
- Retune `src/city/tune.ts` or the demand, as with `PLANNED_TIMES`.
- Consider continuous-curvature RS, which would win back 20–30% of the manoeuvre times.

**Risks:**
1. Ground quality: missing accesses or aisles give RS shortcuts.
2. Blocked moves where RS has no answer (needs a Hybrid A* fallback or a wait).
3. Queues behind longer holds: a jam can cascade.
4. The motion-lab ratchet (`test/motion/`) needs its rules aligned with `test/vehicle/invariants.ts` (the curvature limit at the rear axle, curve-speed slack).

## Step 2, phase A: every moving car drives the model (November 27, not committed)

**What changed.**
- `src/sim/drawn.ts` (new): after every sim step each moving car's drawn car is driven through the step in six sub-steps of 1/60 played second by `src/sim/vehicle/follow.ts` (new; rear-wheel feedback steering, a jerk-limited speed loop that never closes on the sim's point faster than it can still stop on it, never faster than the curve allows). The frames go into `CarStore.frames` (`CarsView.frames`, `sub`); `x, y, heading, speed` are now the drawn pose. `src/render/cars/drawnPose.ts` (new) plays them, in `carLayer.ts` and `test/motion-helpers.ts` alike. `glide.ts` is deleted.
- The reference is the car's tracks for the rear axle (`refAt`: the track it is on, the two it came by, the next one for preview), with the lane-change slide and the kerb swing laid on as quintics in progress (`offEnd`/`offLen` replace `offLeft`/`offH`). `rx, ry, rh` keep the reference pose of the middle; slides start from it, so the reference never steps.
- Junction turns (`nodeBuild.ts` `turnLine`): clothoid, arc, clothoid at `ROAD_R` (a car's planned radius, `src/sim/vehicle/shift.ts`), 45% clothoid; straight on, a quintic jog. `buildWorld` builds twice: `turnTrims` measures how much each lane end must give up for the radius, then lanes are rebuilt shorter (capped by the old room rule; where a corner still doesn't fit the turn is the widest that fits). Ring entries and exits use the same corner turn with a longer clothoid share (`JOIN_SHARE` 0.65, `SPREAD` 0.65, `RING_TRIM` 14). Rings are bigger (`RING_EXTRA` 10 → 22, `src/sim/netCore.ts`; the renderer and `roundaboutFits` follow the junction radius): a street ring of 31 px is driven at about 21 px/s (17 km/h at game pace), its entries at 16 px/s, where a 19 px ring left room only for 12 px entries crawled at 4 px/s. The ring's gap test times the entering car's own pull-away (`timeTo`, `src/sim/grant.ts`) and never assumes ring cars faster than the ring is driven.
- Speed caps from shape (`src/sim/trackCaps.ts`, new): per sample, the curve rule √(0.85·aLat/κ) and a steering rule (the wheels swing at 80% of the steering rate). Turns and ring pieces take their lowest cap as `vmax`; lanes keep the profile (`Track.caps`), which `desired`, `speedAhead` and spawns brake for. `limitSpin`, `TURN`, `slideLength` and `turnSpeed` are gone.
- The sim's speeds are physical: IDM pulls away at 13.9, plans a comfortable 8 (1.4 m/s², under the model's 2.2, so the drawn car's foot never falls behind), brakes at most 19.4 px/s² (`test/vehicle/limits.test.ts`). A driver keeps his gap to what is drawn (`src/sim/path.ts` `bodySlack`): the drawn body is longer than the sim's, a drawn leader may lag its point, and a drawn follower past its own point plans with that (never in the hard room, which would only stop its point dead), the acceleration moves at the jerk limit (urgent braking 3× faster), eases off as it reaches its speed, brakes in earnest when over a cap, and `speedAhead` looks as far as it needs to stop and caps for the line at the end of the next lane. Gate spawns enter no faster than they could stop or turn. Lane changes need room for the whole quintic at the car's speed (`shiftLength`). The kerb swing is 13 px over 60 px at 15 px/s; gate exits are driven at speed.
- Routing knows turns are slow (`slowdown` on each option, `stopLoss` on yield and signal links), so estimates stay within 4 s on empty roads.
- U-turns: unchanged rule (only at dead ends, where `turnRound` makes a forward U if the lanes lie 2 R_MIN apart, else a three-point turn, and on rings). Three-point turns and the sim's `turnBack` are still drawn from the sim's track (no model) and checked by the old rules: **phase B** must make them manoeuvres.
- Handoffs: a car held for a manoeuvre stays where it was last drawn (the 'park' event's pose is the drawn pose); a released car starts on its reference at the step's start; a car the sim puts more than 80 px away (30 px when standing) is re-placed.

**Counts** (season test, moving cars, Saffron Y3 / Y6 / Old Harbour Y4; "before" = today's glide judged by the same vehicle invariants): slip 30130/128802/68844 → 71/0/0 (the 71 are a car turned round on the road and two three-point turns: phase B); too tight 9789/39402/19601 → 5/0/0; steers too fast 22863/100899/43039 → 3/0/0; pulls away too hard 14157/48945/30176 → 3/0/0; brakes too hard 17742/59244/36333 → 3/0/0; jerks 131746/440979/289658 → 15/0/0; too fast on a curve 22321/90007/38104 → 106/265/653; jumps 0 → 1/0/0; bodies overlap 128/1042/296 → 111/428/110. Lab (defaults, all scenarios): moving-car physics rules ≤ 3 each except too fast on a curve 7975 → 163; overlaps 30 → 48; manoeuvre counts unchanged (phase B).

**Drawn against the sim** (Saffron Y3/Y6, every moving car each step): lateral error p99 2.1/2.6 px, max 14/15 px (buses and lorries swing wide of a car-radius turn); the drawn middle is more than 4 px off the sim's point in 3/5% of car-steps (10/14% before the gentler IDM braking and the drawn gaps), past it by more than 4 px in under 1%.

**Overlaps left in moving traffic** (season Y6, 428 new touches): 182 are vans, lorries and buses passing an oncoming car: they are drawn 9.0–9.4 px wide in lanes 9 px apart (`WIDEST`, `src/sim/vehicleSize.ts`, drawn big to read on a phone), so they touch whatever passes beside them; about 60 more are wide bodies beside a car in the next lane or at a lane end; 67 are inside junction boxes (turns whose bodies sweep closer than the conflict table's 7 px); 3 are queues.

**Cost:** 700 cars, 3.1 ms a sim step (0.6 before), so about 2 ms a frame at 4×.

**What it costs the game (not rebalanced: phase C).** Physical turns (~16 px/s at a street corner) and acceleration halve junction capacity (`node dev/simbench.mjs cap`: street signal 1.01 → 0.49 cars/s, avenue signal 1.82 → 0.68, street roundabout 1.05 → 0.59, avenue roundabout 1.18 → 0.81). A street roundabout's 0.59 cars/s with four loaded arms is 0.15 entries/s per entry played, 0.12 at real pace; a real single-lane roundabout takes 0.3–0.4 per entry with little circulating traffic and about half that with every arm loaded, so it is close to real. Every Saffron bot is replaced in year 3 (seeds 1–3). Red: sim.capacity, sim.traffic (throughput, lockup, flyover waits), sim.swap, sim.starve, city-bots and five city tests that need traffic to flow.

## Step 2, phase B: parking and turning round are the vehicle model (November 28, not committed)

Every manoeuvre a drawn car makes is planned with Reeds–Shepp on the real ground of its place and played once by the tracker through the bicycle model; the city holds the lane for the part of that played move the body is in it, and the view draws the same frames. No fixed hold times are left.

**What changed.**
- `src/sim/vehicle/played.ts` (new): a plan played at 1/60 s into drawn frames (`Played`), `playedAt`, `withPrefix` (the car's last drawn step in front, so the view never skips a step), `joinPlayed`, lane-band timing (`secondsUntilOut`). Frames are Float64 (Float32 rounding made jerk noise at walking pace).
- `src/sim/vehicle/moves.ts` (new): `playInto` (into a space: start offers rolling straight on up to 24 px or backing up to 44 px in its own lane, a 5 px settling straight at 5 km/h, a car still rolling brakes straight first and keeps its speed and acceleration, a crossing wait baked in as a stand), `playOutOf` (out of a space, cut where the body first reaches the lane band so the car stops at the edge to look, then joins), `playTurn` (turning round on the road). A goal within 3 px sideways, 6 px along and 0.15 rad is no move.
- `src/sim/vehicle/planner.ts`: the reverse rule (`World.reverse`), no loops (total turning at most 1.5 x the net change + 110 degrees unless the move turns the car round; a goal within 45 degrees ahead is a forward S only), prices for turning (6 px/rad) and wheel swings (8 px per full swing at a car's own radius), radii 2, 1.4 and 1 x rPlan and 1.02 x rMin all tried and the cheapest fitting kept; reverse planned at 94% of walking pace.
- `src/city/moveGround.ts` (new): the ground of one move. `src/city/movePlan.ts` (new, replaces `moveTimes.ts`): `spaceOf`, `standPose`, `planIn`, `planOut`, `planDoor`, `viaAisle` (two-row car parks: through the gate, along the aisle past the bay, back in). `src/city/manoeuvre.ts`, `src/city/door.ts`: hold from the played move; a pull-out that does not fit waits and looks again (once a second, 12 times).
- `src/sim/turning.ts` (new): a dead end's three-point turn (`turnRound === 'three'`) and `turnBack` (a car sent back the way it came) are played turns: the sim holds the car while its drawn car plays the frames (`CarStore.play`, `playAt`, `playGoal`; `src/sim/drawn.ts` `playStep`), then puts it on the lane back where the turn ended; the lane it leaves is held by a stand-in; it waits for the road clear both ways (3 s each). `src/sim/turnRound.ts` keeps only the dead end's track for the sim's one car at a time.
- `src/render/cars/manoeuvreCore.ts` plays the event's frames at the sim's clock; parked cars stand at the move's last frame (`ParkedCar.pose`, `Standing.stood`); a pull-out's spawn is drawn from its last frame (`SpawnRequest.pose`, `placeDrawn`), and a released held car goes on from where it is drawn when it is within 4 px of its lane.
- The sim: the kerb swing before a stop is gone (a car stops in its lane; the move off it is planned); followers keep `PARK_ROOM` (24 px) behind a car parking or pulling out; the far lanes' stand-ins only need physical room; `laneClear` (a pull-out's own lanes clear of bodies along its sweep, and every car coming able to stop short of it comfortably: 1 s and 8 px/s²); `block` takes the standing vehicle's kind (a double-parked lorry blocks a lorry's length).
- Deleted: `src/city/moveTimes.ts`, `src/sim/parkMove.ts`, `src/sim/parkPaths.ts`, `src/render/cars/manoeuvrePath.ts`, `PARK_IN`/`PARK_OUT`/`TURN_IN`/`TURN_OUT`/`*_MOVE`/`AISLE_SPEED`, `holdLonger`, `holdFrom`, the kerb swing (`swingLeft`).
- Switches: `PLANNED_TIMES`, `HONEST_SWINGS` and `ROAD_STOPS` are gone (their "on" is the only way now). Left: `ROOMY_CORNERS` (junction size) and `GAP_ACCEPT`, which now only means the junction left-turn rule and straight-on first (`src/sim/grant.ts`); manoeuvre crossings always wait for their gap and kerb spaces are always reached on their own side.
- Sand slots keep clear of the road's paved width (`src/sim/slotGeometry.ts`: a beach touching the road no longer puts a row in the lane); a double-parked or shoulder stop goes to the paved edge at most.

**The ground.** For one move: the paved roads near it (half width + 1.5 px; plus a 13 px parking band on kerb-bay roads and streets), junction discs, and only the move's own place: a home's or forecourt's front yard (from the road's line to 6 px past its spaces, the lot's whole frontage + 24 px each way), a car park's rect and its gate (56 px wide), the sand's yard (by the road nearest the sand, not the lot's access road), a building's or multi-storey's rect and a 30 px apron. Bodies: every car standing in a place near (where it is drawn) and every car on the road under 3 px/s. Reversing: off the road (the place's ground) or on the move's road on the side it is on, up to the inner edge of the outermost lane + 2 px of paint; turning round has no such limit.

**How holds work.** In: the car stops in its lane (approach capped at 15 px/s), the move is planned from its drawn pose and speed; across the road it stands for its gap first (in the frames), then the far lanes are held from then for its lane part. The lane is held until the body has left the lane band (the whole road when crossing or when the nose swings over the line). Out: the car drives off-road to the edge of the lane band and stops; it goes when its own lanes are clear (laneClear) and, across the road, the far lanes have their 3 s gap; the sim spawns it at the joining pose (the lane goal chosen, up to 72 px ahead) held for the join's seconds, drawn from the move's last frame.

**Real durations** (played seconds, median / p90, `node dev/moves.mjs`; Saffron Bay year 3, year 6, Old Harbour year 4 seasons). "Before" is the fixed holds (`moveTimes.ts` off): every move into or out of a lot took 1 s (0.3 s of lane), a street move 2.4 / 1.6 s, double parking 3.7 s.

| Move | Saffron Y3 | Saffron Y6 | Old Harbour Y4 | lane held (Y6) |
|---|---|---|---|---|
| into a home or forecourt (`lot in`) | 19.8 / 25.3 | 22.2 / 27.2 | 19.7 / 33.5 | 13.3 / 21.4 |
| out of a home or forecourt (`lot out`) | 13.8 / 18.2 | 14.3 / 19.9 | 13.9 / 18.5 | 8.1 / 12.4 |
| into a bare kerb (`street in`) | 18.2 / 20.8 | 24.8 | 17.5 / 19.8 | 21.6 |
| out of a bare kerb (`street out`) | 13.6 / 16.9 | 16.8 | 12.8 / 18.7 | 13.6 |
| double parking in (come to rest + stand) | 7.0 / 25.9 | 7.4 / 7.7 | 7.7 / 27.9 | 3.0 |
| double parking out (drives off its line: no move) | 0.1 / 16.4 | 0.1 / 17.8 | 0.1 | 0.1 |
| out of a building's mouth (`door out`) | 18.1 | 19.3 | 19.3 | 9.0 |
| turning round on the road (three-point, turnBack) | about 15 s each (14 to 17) | | | the whole turn plus its wait |

**Lane time per season** (seconds the lane was held by parking moves, waits for gaps included; turning round on the road in brackets): Saffron Y3 96 before, 820 after (+ 373); Saffron Y6 126 before, 1442 (+ 117); Old Harbour Y4 124 before, 873 (+ 362). Parking events per season fell (Saffron Y6: 236 lot moves before, 121 after) because trips are slower: phase C rebalances, and stops counting manoeuvre seconds as trip delay.

**Planning.** 120 to 280 moves a season; 1.8 ms median, 4 to 6 ms p90, 39 ms the worst (a car park two-stage plan). Not cached: each plan depends on the cars standing round it, and a season plans so few that a cache saves nothing measurable. A sim step with 699 cars (`node dev/simbench.mjs bench`): 2.63 ms mean, 3.02 p95 (phase A 3.1 ms; parking planning runs in the city, not per step). Unfit moves (no candidate fits; drawn anyway as the cheapest, counted): Saffron Y6 79 of 277 planned (most are retries of a blocked pull-out: a pull-out that does not fit waits and looks again 12 times first), Saffron Y3 53 of 174, Old Harbour Y4 25 of 124. In the parking-move test (a Saffron season, by event): under 15%.

**Phase B, round 2 (November 28, after the checkpoint).**
- Forecourt spaces are square to the kerb and face the building (`src/sim/slotGeometry.ts` `lotLayout`; the count is the old along-the-edge count, so capacity is unchanged): from the far lane a car waits for its gap and makes one nose-first turn across (`PlanOptions.forwardOnly`, rolling straight back in its own lane first is allowed); it leaves by backing into the near lane, stopping, then going forward.
- Loops are measured as the heading's sweep (its range along the path), not total turning: a full circle to face the other way sweeps 360 degrees for a net 180 and is refused (planner and lab, also for turns round, slack 120 degrees); an S sweeps one bend.
- Car parks: two-row lots are entered through the gate, along the aisle and backed into the bay (`viaAisle`); a car backs only inside the park, never out through the gate; the gate lane keeps 14 px more room each side (`GATE_ROOM`), so a car leaving a bay by the gate can swing into it.
- park.kerb.far-side has a block to drive round (a street along row 7): the car goes round and comes back westbound to back in from its own lane.
- Cars stopped in the lane (double parking, taxis, pump queues, a driver who gave up) are a real obstacle for the whole stop: the stand-in stands exactly where the car is drawn, in its own direction's lane, as long as the vehicle, until the car leaves (`Standing.blockUid`, removed by `unstand`). A taxi or driver pulling over where the kerb is free pulls right in to the kerb with a forward S; otherwise it hugs the parked row. A car still rolling when it stops on the road comes to rest where its braking takes it. A nose swinging over the centre line waits for a gap too.
- Played turns round are planned clear of the city's parked cars too (`Traffic.setParked`), never drawn when they do not fit (the car waits and looks again), and a pull-out that turns the car round never falls back to a path that does not fit.
- The lab counts `bodies overlap` per frame (a car drawn through another for a second is 60, not 1).

## Step 2, phase B, round 3: one collision rule (November 28, not committed)

The owner kept finding cars drawn through cars in the replay. With overlaps counted per frame, a Saffron Y6 season had 37,672 overlap frames. `node dev/overlaps.mjs [case] [--top n] [--json]` (`dev/overlapsCli.ts`) breaks them down by cause from the same motion watch; `--pair a|b`, `--uid n`, `--slots` (off-road slots that reach onto a road) and `node dev/overlapSnap.mjs OUT.png <case> --snap frame,x,y[,r]` (a picture of the drawn bodies at one frame) were the tools. Almost all of the frames came from a few long incidents: two cars waiting on top of each other at a lane edge, a car left standing in the lane all day when its move in did not fit, a stand-in put 12 px from where its car was drawn, a view drawing a car waiting at an edge after the city had forgotten it.

| Overlap frames by cause (before → after) | Saffron Y3 | Saffron Y6 | Old Harbour Y4 |
|---|---|---|---|
| manoeuvre vs manoeuvre | 137 → 0 | 8909 → 705 | 3002 → 1144 |
| manoeuvre vs parked | 582 → 144 | 2223 → 1176 | 5069 → 2060 |
| moving vs manoeuvre | 2143 → 663 | 2536 → 952 | 7586 → 899 |
| played turn vs traffic | 1867 → 0 | 0 → 0 | 0 → 0 |
| moving vs parked | 1254 → 0 | 1768 → 767 | 2478 → 0 |
| just pulled out vs traffic | 398 → 40 | 265 → 185 | 948 → 179 |
| moving cars in a junction box | 84 → 57 | 95 → 68 | 30 → 844 |
| moving cars vs oncoming cars | 1541 → 669 | 927 → 689 | 1079 → 960 |
| lane change, next lane | 0 → 0 | 0 → 0 | 0 → 69 |
| a van, lorry or bus involved (any of the above) | 6774 → 3012 | 20949 → 20679 | 10242 → 3726 |
| total | 14780 → 4585 | 37672 → 25221 | 30434 → 9881 |

Cars only (no wide vehicle): 8006 → 1573, 16723 → 4542, 20192 → 6155. A season is chaotic (one gridlock is thousands of frames), so single numbers move between runs of different code; the cause rows are the measure.

The wide remainder is mostly geometry: vans, lorries and buses are drawn 9.0–9.4 px wide in lanes 9 px apart (`WIDEST`, `src/sim/vehicleSize.ts`), so two of them side by side on an avenue or meeting on a street touch by 0.4–0.8 px whenever either is a hair off its line (most of Y6's 20679: buses and lorries side by side on the avenues and meeting oncoming). That waits for the owner's decision on their width.

**What changed.**
- **One collision rule** (`src/sim/sweeps.ts`, new): every move played off the lanes is put in `sim.sweeps` with its frames and its start time: moves into and out of spaces, a building's mouth, stops on the road, turns round on the road (`Traffic.sweeps`: `put`, `drop`, `hit`, `coming`). A new move is checked frame by frame, body box against body box, against all of them over time; a car waiting at the lane edge holds its last pose and reserves its way into the lane (`next`), whatever the time. A move into a space waits in its lane until it touches nothing (`clearDelay`, up to 40 s); a stop on the road whose place a waiting car stands in stops past it; a pull-out or a door move out that would touch one waits and looks again; a played turn that would is not made. A move whose way is blocked by a parked body is never taken: it waits as long as it takes (looking every 1 s, then less often), where before it went through after 12 tries.
- **Moving cars and moves** (`src/sim/sweepLead.ts`, new): a driver looks along its way; where its body would touch a move's body, that is its leader, standing (`look`). For moves on the road (turns round, stops on the road, every way out into a lane: `ahead`) the traffic also keeps out of where the move will still pass. A pull-out never starts in front of a car that could not stop short of it, wherever that car comes from (a lane, a junction's turn: `comingClear`), and a turn round on the road is planned against moving cars stretched over their stopping distance.
- **Turns round on the road**: followers keep their gap to the whole remaining sweep behind the turning car's point, not to its point (`sweepBehind`, the car's `lag`, the stand-in's too), and spawns count it.
- **A car stopped in its lane is its own stand-in** (`turnIn`: the traffic car is held where it is); a stand-in put later is put exactly where it is asked (`standExact`). A stop on the road never backs up: a car rolling past its stop comes to rest where its braking takes it (`onRoad`).
- **Edges in the lane**: a way out whose waiting pose is already in its lane band (a space by a corner) is driven in one piece, the lane clear and held from the start (`deep`).
- **No car left in the lane**: a move into a space that does not fit (or waits for a waiting car for 40 s) puts the car into its building instead (`intoBuilding`: the car fades in at the mouth, leaves its space, a household car is off the map until next driven), where before it stood in the lane all day.
- **The view is always told**: a car still waiting at an edge at night stands back in its space (or fades, a visitor), and `backIn` always tells the view (`standBack`, `goneAtNight`): before, the view drew a forgotten car waiting at the edge through the night and the next day. Moves told before the view drains its events (the warm-up before dawn) start that far in (`age`, stamped by `emit`).
- **Planning bodies**: a road's places (double parking, the kerb) run its whole length, so their cars are judged near by where each stands (`bodiesNear` missed every double-parked car more than 470 px from the road's middle); lane changes need a gap for the drawn bodies.

**New checks and tests.** Lab rule `drives against traffic (moving)` (`test/motion/checks.ts`: a moving car lined up with a road, away from junctions, facing against the lane it is in; none in any scenario, park.kerb.far-side included). Four scenarios with a body in the path (`test/motion/scenarios.bodies.ts`): a pull-out with a car broken down in front of its driveway, a forecourt in and out at once, two cars leaving one driveway, a follower behind a car backing into a kerb space. `test/vehicle/sweeps.test.ts`.

**Lab** (defaults, overlap frames): drive.uturn.crossroads 542 → 0, park.taxi.pick 29 → 0, drive.deadend.turn 261 → 0, drive.jam.giveup 1895 → 1095, park.carpark.gate-aisle, park.double.park-leave, park.petrol.queue → 0. Rises: drive.lanes.change 25 → 137 (background cars at a lane change, not explained), drive.jam.giveup moving 338 → 462 (its manoeuvre overlaps fell 1557 → 633). Moving-car physics rules rose by a handful (Old Harbour: slip 6, steers too fast 2, jerks 5, too fast on a curve Saffron Y6 6 → 39): hard stops for a move's body.

**Cost:** a city step is 0.80 / 2.21 / 1.02 ms (was 0.57 / 1.74 / 0.73) for the three seasons (`node dev/moves.mjs`): pull-outs that wait plan again when they look (backing off to 5–10 s), and the body checks (a circle test now goes first in `bodiesOverlap`).

**Not done in this round** (next): followers overtaking a stopped car through a gap in the oncoming lane (they wait behind it, never through it); routing round the block instead of turning round on the road (a taxi facing away still turns round where no way round is reached); real aisles in car parks; conflicting junction turns granted together (the junction-box remainder); `drive.gate.inout` (445 frames, background cars at a gate's junction), `drive.t.all`, `drive.lanes.change`, `drive.works.closed`, `park.kerb.one-way` keep their moving-car overlaps.

## Real widths and real lanes (November 28, not committed)

The owner chose true proportion for everything: real vehicle widths and real lane widths. Wide vehicles drawn 9.0–9.4 px in 9 px lanes caused most of the overlap frames left after round 3.

**Widths** (`WIDTH_M`, `src/sim/vehicleSize.ts`; the body without mirrors, 16 px = 4.5 m so 3.55 px/m):

| Kind | Real width | px | Before (drawn) |
|---|---|---|---|
| car, taxi, police | 1.8 m | 6.4 | 8.0–8.3 |
| van | 2.0 m | 7.1 | 9.0 |
| tow truck | 2.2 m | 7.8 | 8.8 |
| school bus | 2.5 m | 8.9 | 9.4 |
| bus, lorry | 2.55 m | 9.05 | 9.4 |
| tram | 2.65 m | 9.4 | 9.4 (unchanged) |

Lengths are unchanged (drawn 14% / 7% long so cars read on a phone). R_MIN, wheelbases and turning circles are per vehicle in metres and unchanged.

**Pictures.** The painted sprites are re-baked from `dev/art/raw/vehicles.png` by `dev/art/build_vehicles.py`: only the height is resampled so the body between the mirrors is the real width over the drawn length (the mirrors stand out past the body, as on a real car). Body factors: car variants ×0.82–1.00, taxi ×0.96, van ×0.95, lorry ×0.81, bus ×0.91, school bus ×1.00, tow ×1.14, tram ×0.74 (what the old 9.4 px cap already did). `carAtlas.ts` now draws each picture at its own aspect. The lorry and the chunky hatchback (car-2) lose a fifth of their width; a repaint at true proportion would remove that.

**Lanes.** `LANE` is 11 px = 3.1 m (real town lanes are 3.0–3.25 m; a car has 0.65 m each side, a lorry or bus 0.28 m). Everything built on `halfWidth`/`laneOffset` follows: a street is 22 px, an avenue 44, a boulevard 72, a highway 92 (was 18 / 36 / 60 / 76). Junction radii, clothoid turn trims, rings (a street ring is 33 px), flyover clearances, kerb bays and the paint follow from the code. The lab's "crosses a kerb" rule now measures a way in from the road's band (`ACCESS_PAD`, it was a fixed 24 px from the road's middle).

**Capacity unchanged.** Spaces are still counted and spread at the old pitch (`COUNT_WID` 8.3 px in `src/sim/slotGeometry.ts`): the narrower bodies stand in them with more room. Real pitch would add spaces at every home, car park and beach: a balance change for phase C.

**Maps.** `src/city/validateRoadRoom.ts` (part of `layoutProblems`, cities with front streets): no lot or beach plot may stand on a Council road's paved width. An eight-lane highway (92 px) is wider than two cells, so in Saffron Bay the west and east gate highways are one cell (`[0,18]-[1,18]`, `[54,18]-[55,18]`, were two) and the Airfield Road gate and highway move a row north to `(0,5)` (the avenue goes `(4,5)-(5,6)-(7,6)-(8,7)-(8,18)`), clear of Crate Offices, Mangrove Shops, Coral Lagoon Park and The Grand Fair. Old Harbour fits as it is. Twin Isles (1 lot), Seven Hills (4) and Cross Rivers (20, its whole highway on row 22) have lots on a highway's width: they are laid out again after launch.

**Shoulder stops.** With a real lane a car giving up or double parking has 2 px to the paved edge; its short forward S toward it would run into a car standing just ahead, so it now stops where it is when the stretch ahead is not clear (`stopOnRoad`, `src/city/kerbside.ts`).

**Overlap frames by cause** (`node dev/overlaps.mjs`, before → after; chaotic seasons, read the rows):

| Cause | Saffron Y3 | Saffron Y6 | Old Harbour Y4 |
|---|---|---|---|
| moving cars vs oncoming | 2317 → 87 | 4821 → 1929 | 3214 → 155 |
| moving cars, next lane | 0 → 0 | 5014 → 614 | 533 → 0 |
| moving vs parked | 220 → 306 | 6704 → 1065 | 0 → 0 |
| moving vs manoeuvre | 1639 → 891 | 3192 → 1300 | 1879 → 536 |
| manoeuvre vs manoeuvre | 140 → 201 | 1448 → 376 | 1144 → 528 |
| manoeuvre vs parked | 144 → 346 | 1176 → 1648 | 2060 → 1935 |
| junction box | 110 → 30 | 805 → 209 | 115 → 95 |
| queues across a lane end ("lanes apart") | 0 → 0 | 0 → 3476 | 69 → 18 |
| lane / junction and the rest | 15 → 2951 | 999 → 1105 | 816 → 1575 |
| total | 4585 → 4812 | 25221 → 11739 | 9881 → 4842 |
| a van, lorry or bus involved | 3012 → 4297 | 20679 → 8232 | 3726 → 193 |

What is left, and the rises:
- **Saffron Y3, the dead end at (30, 8)** (2978 frames, and all of Y3's new moving-car physics counts: slip 6, too tight 5, steers too fast 2, jerks 3, one reverse too fast, one too fast on a curve): a car stops on the road at the end of the dead-end street, rolls onto the turn-round track and waits there for room to turn that never comes; a lorry following creeps into it. A car waiting to turn round reserves nothing behind it. Next round (turning round, routing round the block).
- **Saffron Y6, the joint at (30, 8)** ("lanes apart", 3476): queues standing across the straight joint of the two streets of row 8 touch by 1–2 px; the cause is not found yet.
- **Too fast on a curve (moving)**: Saffron Y6 39 → 120, Old Harbour Y4 334 → 439 (393 on one turn, 1–8% over its cap). Steers too fast (manoeuvre): Y6 0 → 1, Harbour 2 → 4; jerks (manoeuvre) Y6 55 → 58.
- **Lab**: city.year-start 54 → 94 (background cars at one queue), drive.uturn.deadend 8 → 11 (a car leaving a kerb space touching its parked neighbour), park.kerb.neighbour-swap jerks 1 → 2, drive.jam.giveup moving 462 → 468, drive.lanes.change and test/vehicle lane-change (A's move: steers too fast 1, jerks 1), park.night.home 0 → 9 manoeuvre overlaps, drive.diagonal (F is not through by 44 s), park.kerb.far-side (A ends on the near kerb), park.forecourt.far-lane with switches on (41 overlap frames). Every other lab count fell (drive.lanes.change 139 → 4, drive.t.all 138 → 0, drive.gate.inout 445 → 66, drive.works.closed 149 → 0, park.kerb.one-way 134 → 4, drive.uturn.avenue 34 → 5); ratchets rebased down only.

## Round 5: real driver behaviour (November 28, not committed, partly done)

**Done.**
- **A car waiting to turn round at a dead end never waits forever** (`src/sim/turning.ts` `reserveTurn`, `reverseOut`; `src/sim/motion.ts` `turnOnto`, `waitToTurn`). Cause at Saffron (30, 8) in year 3: a car on the dead end's three-point-turn track found no turn that cleared a pull-out waiting at the lane edge beside it (`sweeps.hit` against that car's waiting pose), while the pull-out waited for the lane the turning car stood in: a deadlock through the night; the next day a lorry pulled out of a lot behind it and crept into it (it reserved nothing). Now:
  - the turn round is planned round the moves under way too (`roadWorld` adds `sweeps.bodiesAt`), and a waiting car's reserved way into the lane is no wall for a turn that only passes (`hit(..., reserve = false)`);
  - a waiting car reserves its turn (planned on the road alone, kept in `CarStore.reserve`): it is put in the sweeps as a standing body with the turn as its reserved way (renewed every look, lapses in 3 s), so pull-outs keep out of it, and followers keep their gap to the whole turn (`lag` = `sweepBehind` of it);
  - after 12 s it reverses out at walking pace along its lane to the junction and on into another road there (`reverseOut`: Reeds–Shepp from where it stands to goals on every lane leaving that junction, planned clear of every body, played like a turn round, `CarStore.playTo` puts the sim car on that lane);
  - the drawn car no longer snaps onto the turn track's reference when it rolls onto it (it brakes to a stop on its point: Y3's slip 6, too tight 5, steers too fast 2, reverse too fast 1 are gone).
- **A move starts with the wheels where the drawn car had them** (`LanePose.delta`, `playInto(..., d0)`): a truck stopping for a kerb space at the end of a lane change no longer snaps its wheels straight (lab `drive.lanes.change` steers too fast 1 → 0; the seasons' `steers too fast (manoeuvre)` Y6 1 → 0, Old Harbour 4 → 0).
- **A lagging drawn car never catches up into a curve faster than it can brake for it** (`src/sim/drawn.ts` `capFrom`, `followInto(..., vCap)`): its catch-up speed is capped by the track caps ahead of where it is drawn (the rest of its track and the next one's). Saffron Y6 too fast on a curve (moving) 120 → 41.

**Overlap frames** (`node dev/overlaps.mjs`, HEAD 7b58ddcc → now): Saffron Y3 4812 → 676 (the dead end's 2978 frames and its followers are gone; left: 175 a car moving into a lot touching a parked neighbour from the first frame, a layout fault, and manoeuvre-vs-manoeuvre at lots), Saffron Y6 11739 → 11429, Old Harbour Y4 4842 → 4844.

**Found, not fixed.**
- **The joint at Saffron (30, 8), year 6** ("lanes apart", 3.5k frames): not two tracks with different offsets (lane 1192 → joint 16 px → lane 1208, consistent). The follower's *drawn* car runs 12–17 px past its sim point, because the sim stops its point much harder than the drawn car can (from 17–20 px/s to 0 in under a second, once in a single step); the queue there stands right at the start of the next lane, so the overshoot reaches the car ahead. Tried and dropped (each made other seasons worse): the park room as a planned gap only, braking for a stop on the lane like a line, the sim's urgent braking at the drawn car's jerk. Next: find which hard stop it is (the single-step one is not `think`'s room, a hold or an arrival), then make every sim stop reachable by the drawn car.
- **Too fast on a curve, Old Harbour** (439 → 468): 393 frames are one turn (`C87>148`, vmax 14.95) entered by the sim car itself at 33 px/s with a hold (`until`) on it, so it is not the caps' geometry: a car released or placed onto the turn at speed. Not traced further.
- Overtaking a stopped car, routing round the block instead of turning round, car-park aisles, junction conflicts against the clothoid turns at the new widths, and the `park.driveway.far-lane`, `park.kerb.one-way`, `park.night.home`, `drive.uturn.avenue`, `drive.uturn.deadend` scenarios: not started this round.

## Round 6: one car state (November 28, not committed)

Since phase A a moving car had two states: the sim's point (s and v on its track, integrated by the IDM) and the drawn car (a bicycle chasing that point in six sub-steps). They drifted apart: the sim could stop its point within one step, harder than any car brakes, and the drawn car ran 12–17 px past it into the car ahead (the Saffron Y6 queue at (30, 8), 3.5k frames); followers kept their gap to a lagging or overshooting body; catch-up caps and overshoot guards patched the rest.

**The design as built.** A moving car is the vehicle: rear axle, heading, speed, wheel angle and acceleration (`CarStore.fx…fa`), plus its place on its reference (track chain, s, the lane-change slide).
- Each sim step `move` (`src/sim/motion.ts`) calls `driveCar` (`src/sim/drawn.ts`): six sub-steps of 1/60 played s through the bicycle (`stepInto`), its limits inside (accel 2.5, brake 3.5 m/s² at most, jerk 3 m/s³, steering rate). The IDM (`think`, `src/sim/drive.ts`) commands an acceleration, no longer jerk-smoothed by the sim (the car's own jerk limit does it). The lateral controller is the tracker's rear-wheel feedback law (`steerFor`, `src/sim/vehicle/follow.ts`).
- **s is read off the car**: after every sub-step the rear axle is projected on its reference (`project`, two passes) and s = that progress + toMiddle; v = the car's speed. Queues, stops, grants, gaps, lane holds, sweeps and the view all read this one state; the frames are the car's own sub-steps (no separate integration). A car that has not moved keeps its s (a joint of tracks can bias a projection), and s never runs back.
- **Room, not a wall**: `think` gives `room` = the hard gap (leader's body, a stop line, a move's body) plus the distance that thing itself needs to stop at the hardest braking. `wantAccel` brakes as planned (2.2 m/s²) once a gentle stop (1.3 m/s²) would no longer fit, and at the car's most once a planned one would not (`closing`, jerk-aware). Nothing stops a car dead: a car that cannot stop for its line stays on its lane past the end (it is never pulled back; `holdAtEnd` is gone) and stops where its braking takes it.
- **Amber accounts for stopping**: on amber a driver too close to stop comfortably (v²/2b + 0.4 s) goes on through (`lightAllows`, `src/sim/grant.ts`).
- **Drivers look as far as they need to stop** (`lookReach`, `src/sim/path.ts`): never less than a gentle stop from where their foot is plus 24 px, and on through an empty lane where that lane has only one way on (`onlyWay`; before, an empty lane ended the look, so a car at 62 px/s first saw a queue 123 px ahead). A short lane is entered slow enough for its slowest turn (`slowestTurn` in `speedAhead`: Old Harbour's `C87>148` was entered at 45 px/s).
- **Lane changes need physical room**: a gap the faster car can close at the planned braking (`closeIn`) plus a third of a headway (`MERGE_HEADWAY`), cars still on the turn into the target lane count (`feeders`), no change while a car beside it is still sliding across (`crossing`), nor while the car ahead in its own lane is closer than the change's first 70% (`clearsAhead`). The new s is the car's projection on the target lane (`nearest`), and a slide only ever moves sideways (`slideFrom`).
- **Parking room ahead** (`PARK_ROOM`, 24 px behind a car about to park) is planned in full but held hard only as far as the follower can still stop for it comfortably (a blinker does not stop a car dead). Coming up to its place at over 8 px/s a car only eases off, so the move off the lane takes over a car that is not speeding up.
- **Handovers keep the state**: a move into a space starts from the car's own pose, speed, acceleration and wheel angle (`poseOf`); a pull-out stands where its move ended and steers on from there; a turn round at a dead end starts only once the car has braked to a stand on the turn's track (`turnOnto`, `waitToTurn`), and its first frame is where the car is. Re-seeding on the reference is left only for teleports the sim makes (a rebuilt road: over 80 px off, or over 8 px along; `relocate` now forgets the old network's tracks behind a car).
- Spawns at a gate enter no faster than they can brake to the queue's tail; a stand-in or spawn checks the turn just past its lane's end too (`clearPastEnd`).

**Deleted** (they only reconciled the two states): the drawn car's speed loop chasing the sim's point (`followInto`, `followStep`, `Target`, `KP`/`KV`/`CURVE_SHARE`, the closing-on-the-point brake), the catch-up cap into curves (`capFrom`), the sub-step ramp of the sim's speed (`simAt`, `CarStore.v0`, `CarStore.nv`), the lead re-referencing, `still`'s drawn-from-the-sim branch, `holdAtEnd`, the sim's jerk smoothing with 3× urgent braking (`smooth`, `URGENT`), the cusp stop in `move`, and the follower's own-overshoot slack (`ownSlack`); `lag` now only carries a turning car's sweep.

**Overlap frames by cause** (`node dev/overlaps.mjs`, HEAD 89312e6e → round 6, measured on HEAD plus this round's files only, without the parallel car-park work):

| Cause | Saffron Y3 | Saffron Y6 | Old Harbour Y4 |
|---|---|---|---|
| moving: queues across a lane end ("lanes apart") | 0 → 0 | 3595 → 26 | 15 → 0 |
| moving: lane / junction | 25 → 14 | 1013 → 1121 | 1629 → 1 |
| moving: next lane | 0 → 0 | 614 → 341 | 0 → 0 |
| moving: oncoming | 88 → 201 | 1651 → 1381 | 68 → 74 |
| moving: junction box | 30 → 21 | 165 → 289 | 1 → 41 |
| moving vs parked | 0 → 0 | 1065 → 1893 | 0 → 0 |
| moving vs manoeuvre | 243 → 581 | 1302 → 1531 | 668 → 271 |
| manoeuvre vs manoeuvre | 115 → 115 | 376 → 633 | 528 → 530 |
| manoeuvre vs parked | 175 → 175 | 1648 → 1627 | 1935 → 1935 |
| total | 676 → 1107 | 11429 → 8842 | 4844 → 2852 |

Motion test (moving / manoeuvre overlaps): Y3 143 / 533 → 236 / 871, Y6 8103 / 3326 → 5051 / 3791, Old Harbour 1713 / 3131 → 116 / 2736. Too fast on a curve (moving) 21 / 41 / 468 → 0 / 0 / 0; jerks (moving) 2 / 0 / 0 → 2 / 0 / 0. What rose: Saffron Y3's dead end at (30, 8) and the turn by p106 / p31 are single long incidents (a parked body standing on a corner's turn path at (1445, 342) in Y6: 1.5k frames, a layout fault of the slots), and moving-vs-manoeuvre at lots in Y3 (a pull-out joining behind a car that now brakes to a stand a few px onto a dead end's turn track). Seasons are chaotic; read the rows.

**Lab** (`npm run motion -- all --both`): now green that were not: drive.signal.cycle and drive.follow.queue (queue gaps held), drive.lanes.change (defaults), drive.gate.inout, drive.diagonal, city.year-start (their moving overlaps and curve counts are 0), park.kerb.neighbour-swap; ratchets lowered only (`test/motion/knownNow.ts`, `test/motion.test.ts`). New reds: body.kerb.follow and park.kerb.parallel-traffic (A's move into the kerb starts from 13.8 px/s and the played brake run makes one jerk of 1.10× in the tracker), park.petrol.queue (8 manoeuvre overlap frames), park.carpark.gate-aisle / multi-entrance / underground (one crosses a kerb, one pull-away), drive.t.all with switches on (D, F not through by 44 s).

**Capacity** (`node dev/simbench.mjs cap`, cars/s even): street yield 0.39 → 0.42, roundabout 0.68 → 0.68, signal 0.48 → 0.53, smart 0.49 → 0.49; avenue yield 0.54 → 0.45, roundabout 0.79 → 0.69, signal 0.78 → 0.66, smart 0.71 → 0.67. Phase C rebalances.

**Cost**: 700 cars 3.09 → 2.40–2.56 ms a sim step (`simbench bench`); a city step 0.77 / 1.37 / 0.84 → 0.71 / 1.04 / 0.73 ms (`node dev/moves.mjs`). Standing cars skip the sub-steps; moves' bodies are still looked for over the headway's reach only (the body checks are the step's dearest part).

**Left.** Lab reds above; `roads come and go under traffic` (sim queues touch by up to 0.6 px right after a network change, when relocated cars are put back with their speed), `cars on a deck are as high as the deck` (no S→N car takes the flyover in that test now: not traced), `a breakdown on an avenue is driven round` (not traced; likely the stricter lane-change rule); test/vehicle kerb-parallel (the move's brake-run jerk); `every paid city plays` and the months test timed out in a full run (90 / 120 s). The 41 phase-C balance tests stay red.
