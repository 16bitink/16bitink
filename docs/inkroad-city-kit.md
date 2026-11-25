# InkRoad: city kit

How to write a city (3 to 5) without touching the engine. Read [inkroad-design.md](inkroad-design.md) ("Five cities", "The toolbox") first. Copy `games/inkroad/content/harbour/` (map.ts, years.ts, index.ts) and work only in your own `content/<id>/` folder. Register the city in `content/paid.ts` (one line). **Never edit `src/`**: ask the coordinator for a knob you need.

## The files

| File | Holds |
|---|---|
| `map.ts` | `MAP` (terrain rows, built by a small function), `GATES`, `ROADS_DEF`, `LOTS` |
| `years.ts` | Ten `YearDef`s: name, intro, tools, coach, grant, goal, events, plan |
| `index.ts` | The `CityDef`: id, name, number, style, startMoney, rules |

`npx vitest run test/city-def.test.ts` lists every layout mistake (overlaps, roads through lots, wrong sizes, unknown events and targets, dashes in texts).

## The map

- About 56 x 38 cells. One letter is the square around a vertex: `.` ground, `~` water, `#` rock or wall, `h` old quarter (streets only, no widening, no decks), `p` protected.
- **Roads run through vertices; lots are corner based** (`gx, gy, w, h` fills cells gx..gx+w). A road must stay **1 cell away from every lot edge**. Two lots may touch. The driveway goes to the nearest street, avenue or boulevard within 2.5 cells; none on a highway or a bridge.
- Sizes: home, shops, office: even by even (4x2, 2x2, 4x4, 6x4). Fixed: market, school, hospital, landmark 4x3; mall 6x4; stadium 6x5; port 6x3; fair 6x5. Parks and squares any size.
- **Leave sand.** Every market, office and mall needs at least 6 possible car park sites (3x2) within 6 cells, and each side of the busy crossroads needs 3 free cells for ramps. If you can't place a car park, the player can't either.
- Split a street at a bridge's two banks (three `RoadDef`s): a road that touches water is all "bridge" and takes no driveways. A junction less than 2 cells from another is refused.
- Start the junctions next to the busy one as roundabouts (`controls` in the city) so only one place is red in year 1.
- Give each gate road 2 or more highway cells, `fixed: true`. A gate exists once a road reaches its cell; `opensYear` starts its traffic.
- Council roads with `opensYear` join what is there. Car parks can't be built on their ground.

## Numbers that decide everything

| Fact | Value |
|---|---|
| Drawn day | 120 s after a silent 18 s warm-up (commuters leave from -18 to 32, home again 60 to 100). 1 s reads as 1 minute |
| Cars a second through a 4-arm junction | yield 0.63, roundabout 1.06 (0.9 if one movement dominates), signal 1.0, smart 1.1. Avenue arms: signal 1.8 |
| Tours (there and back) per home cell a day | level 1: 0.96, 2: 1.2, 3: 1.5, 4: 1.8 |
| Workers going out by a gate | 28% |
| Gate traffic a day, per unit of weight | 5 commuters, 3 through, 1.6 lorries; plus outsiders drawn per cell by offices 0.18, malls 0.6, ports 0.3, fairs 0.25 (times level pull); lorries a cell: ports 0.5, malls 0.35, offices 0.2 |

**Rule of thumb:** a 4 x 2 home block sends 8 cars out and 8 back. A crossroads that 60% of 60 home cells must cross carries about 0.85 cars a second in the morning: it jams on yield and clears with a roundabout. Twice that needs signals with avenue arms, a flyover or another way round.

**Balance the arms.** Put homes, jobs and gates on all four sides of the busy crossroads. If three quarters of the homes are on one arm, a roundabout starves it and the first fix feels useless. Keep the next junction 6 or more cells away, or their queues lock together.

## What makes a year good

1. **One idea, felt without reading.** Break something the year's tool fixes: no space at a market, one dominant left turn, no second bridge. Look at `nobody`'s row: its worst number that year should be your idea.
2. **Shown two years ahead** in `plan`. What opens is what will jam.
3. **At least three answers.** `--families` plays the year with only building, only pricing, only transit, only rules, from the same start. From year 5 at least three should gain 3 or more over doing nothing.
4. **A goal the beginner can just reach and `nobody` can't.** Kinds: `wait@gx,gy`, `worstWait`, `found@<lot kind>`, `foundIn@<district>`, `double`, `fined`, `riders`, `share`, `lost`, `onTime`, `approval`, `bar:trips|parking|cost|streets`, `support` (zone vote). Count-like kinds are "at most", shares are "at least". Read in the year's last season.
5. New homes spread over the map and arrive in small steps: 8 to 20 cells a year early, 30 late. Start blocks at level 1; the city grows them.
6. Texts: animals only, short, dry, one joke a line, plain A to Z names, no em or en dashes, no real places, money, religion or brands. Speakers: zaza (roads), miko (parking), juma (transit), pim (money), sulo (Council).

Tools at most 12 to 14 a city, one new idea a year. `controls`, `parks` and `policies` list what else opens (a kind no year lists is open from year 1). Coach `until`: `selected:junction`, `controlChanged`, `built` (a road change), `toolPicked:<tool>`, `review`; anything else waits 30 s. Event kinds are in `src/city/happenings.ts`, commissions in `src/city/commissions.ts`.

## The lab

```
npm run lab -- <city> --bots [--bot nobody,beginner] [--seeds 1,2,3]   # approvals by year, plates, purse in seasons of income
npm run lab -- <city> --families --from 4 [--why]                      # from the beginner's start of each year: nothing / build / price / transit / policy alone
npm run lab -- <city> --last                                           # do year 3's good junctions go bad by year 7?
npm run lab -- <city> --bot beginner [--probe|--seasons] [--seed n]    # one run, a row a year; inner numbers; bars by season
```

Seeds and families run side by side and their answers are kept in `node_modules/.cache/inkroad-lab` until a file in `src/sim`, `src/city` or `content` changes. A city takes 5 to 10 s a bot; the family table about a minute. No bot tries ideas on copies of the city: one morning of traffic is too noisy to judge by. They follow a playbook (`src/city/bots/playbook.ts`), so give them the map in `bots/atlas.ts` (roads with the year they start to make sense, bus lines through the middle, boats, metros).

A row: approval, bars (Trips, Parking, Cost, Streets), money, plates, letters, people, most cars at once, the goal, the three worst junctions (cell, control, wait, cars). Family rows show the mean of the last two seasons, over the seeds, against nothing.

| Target | Value |
|---|---|
| nobody | Replaced in year 4 or 5; years 1 and 2 are `cannotLose` |
| nothing for a year (families) | Loses 5 to 12 |
| beginner | 58+ in year 1, finishes the city, 45 to 65 on the way |
| planner | Never replaced, 2+ plates a year, 60 to 74, ends a year with 0.7 to 1.5 seasons of income |
| greedy | Replaced by year 5 |
| families, years 5 to 10 | Three or more gain 3+, the best gains 6+, none is best in more than half the years |
| `--last` | 60% of good junctions bad or rebuilt in a played city |
| Year 1, first morning | The main junction at grade D by 60 s untouched; the year's answer halves the queue |

Single runs are noisy by 3 to 5 points: read three seeds.

## What we learned about balance

- **A day is a routine.** Four people in five make the same trip with the same dice every day, so an effect you see is the effect of what you changed. Keep it that way: nothing in `planDay` may use the city's own dice (only the first morning does).
- **The jam is in the evening.** Trips home pile up from 70 s on; spreading the morning does nothing. Cars still out at 120 s are not counted, so end the evening early enough.
- **Check that every Council road opens** (`test/city-balance.test.ts`). A road that ends one cell from another junction is refused; for a year nobody could reach one gate, and a tenth of all trips were lost for good.
- **What moves Trips:** metro +25 to +35, two good bus lines +10 to +15 (a third on the same streets: 0), smart signals at the worst three +5 to +15, prices on paid spaces +5, a toll +5 (Cost pays), lorry hours +4, a second bridge +5 to +8, wider arms only together with smart signals, a flyover +2 and a ribbon. Plain signals and roundabouts at junctions that don't jam: below 0.
- **Why a flyover is weak, and when it is not.** Alone, with 60% of the busiest arm turning left and 0.9 to 1.1 cars a second, it cuts the wait from 9-18 s to 0-1 and the trip by a third. In the city no movement of the hub (22, 18) passes 25%, every spoke is fed (metered) by that hub, and what a spoke wins waits at the next junction. A worker habit of 45% moves only about 17 tours a day; a dominant turn needs 40 or more, as from a district that can only be reached by one arm, and the hub relieved by side streets. Junctions 2 cells apart lock (the Council's avenue beside the guided street did: T 45 to 31). Most Trips points are lost on the way out (search and walk), not in the evening queue, so a shorter queue at one junction hardly shows.
- **Year 1 is guided and the same for everyone** (`GUIDED` in demand.ts): spring crossroads red at 40 s; keep (12, 24) to (12, 18) free for the summer street; autumn's wedding reddens (22, 24), which starts as a yield.
- **A drawn bus stands for three** (`stands`): more of them only block the lane. Bus lanes need avenues and full buses.
- **Demand, not peak:** 20% fewer trips is worth 10 points of Trips. New blocks open at level 2 or 3 in the late years; a Council road in the same year can swallow the whole shock.
- **Parking leans on the two worst blocks** (`PARKING_TALK`), so one market, mall or square without spaces shows in the bar, and one car park mends it.
- **Cost reads the sign:** prices past the fair ones (`OUTRAGE`) anger everybody, paid or not. That is what ends greedy.
- **Money:** the Council keeps 60% of what is over three seasons' income at the year's end (`purse.ts`), so budgets of 60 to 90 a season early and 110 to 170 late stay tight. Big things are paid by matching (tram, metro, `BRIDGE_MATCH`) and by commissions: family bots take every commission.

## Quirks

- Approval leans on the worst bar (55%). Trips and Parking are stretched (Trips: a raw mean of 60 reads as 43, 70 as 61, 80 as 79), with a soft bottom.
- Fair trip time is the crow's distance, so a missing bridge hurts until somebody builds it.
- People at home, on foot or on a bus are not drawn; staying home counts as a nearly lost trip.
- Private spaces are few from year 2 (`PRIVATE_PER_CELL`); year 1 has free sand. From year 3 drivers dodge paid spaces unless inspectors look.
- Shops near dear, empty car parks shrink; blocks with good trips grow (16% a season).
- The bots' map knowledge lives in `src/city/bots/atlas.ts` (ROADS, BUSES, METROS, BOATS by city id): send the coordinator yours.
- A circle never fits on `h` ground.
- Complaint minutes are capped at 45.
- Building costs rise 4% a year and land 10%. The very first day uses one fixed plan (`FIRST_MORNING` in `src/city/run.ts`, tuned for Saffron Bay); other cities get the same draw on their own map.
