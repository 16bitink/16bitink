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
