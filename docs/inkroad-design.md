# InkRoad: design

**Status: approved by the owner November 25, 2026; in build. Release: Sunday, November 29, 2026.** How it is built: [inkroad-build.md](inkroad-build.md), which wins where the two differ.

Game #10, working name **InkRoad** (it echoes the Silk Road). You run the road authority of a growing city. You build roads, flyovers and parking, set the prices, run the buses and the metro, and keep residents happy. If they stay unhappy, the Council replaces you.

**The one-line pitch:** every road you fix makes the city grow until it jams again.

## The owner's brief

- You are the road authority of a growing city.
- Money comes from parking fees, parking fines, toll gates, and government grants for solving problems.
- Residents must stay happy, or the government replaces you and the game is over.
- You build roads, flyovers (estacades) and parking, improve technology, and run public transport.
- Cars really drive. Badly designed places jam.
- The city grows, so what worked a year ago stops working.
- Based on how Dubai's RTA, Parkin and Abu Dhabi's Darb work, checked against other countries for common rules.

## Research (November 25, 2026)

Three research agents, plus spot checks. Agents read news and search summaries more than official pages. **Confidence** says how far to trust each line before it goes into public text.

### What the real bodies do, and the rule it gives us

| Real world | Confidence | Game rule |
|---|---|---|
| Dubai's Trade Centre Roundabout became a signalised junction with five bridges. RTA projects the average delay falling from 12 min to 90 s ([WAM](https://www.wam.ae/en/article/c2x5vcy-rta-completes-world-trade-centre-roundabout)) | RTA's projection, not measured | **The junction ladder:** yield → roundabout → signals → flyover → interchange |
| Hessa Street widened from 2 to 4 lanes each way: 8,000 → 16,000 vehicles an hour, 15 → 4 min ([Gulf News](https://gulfnews.com/uae/transport/rta-opens-hessa-street-project-doubling-capacity-and-cutting-travel-time-in-dubai-1.500511882)) | RTA figures | Widening works, at first |
| Vehicle distance grows about in line with lane distance in the long run (Duranton and Turner, via [WEF](https://www.weforum.org/stories/2015/04/do-more-roads-really-mean-less-congestion-for-commuters/)) | Well known; elasticity not re-checked | **Induced growth:** easy-to-reach blocks grow denser and fill the road |
| Salik tolls: AED 6 peak, AED 4 off-peak, free 1–6 am. Free trips rose 46.8% in one quarter as drivers shifted ([Gulf News](https://gulfnews.com/business/markets/salik-to-begin-variable-toll-rates-from-january-31-1.500018018), [Khaleej Times](https://www.khaleejtimes.com/uae/dubai-free-salik-trips-up-nearly-50-in-q2-amid-residents-tactics-to-save-on-tolls)) | Good | Tolls by time of day; drivers change route, hour or mode |
| Parkin 2025: AED 1,326m revenue, of which fines 31%, from about 2.7m fines. Peak, off-peak and event prices (AED 25/h). The government keeps control of tariffs ([annual report](https://feeds.dfm.ae/documents/2026/Mar/16/3730076e-02f7-44ef-95a5-ae46be61436e/Parkin%20Annual%20Report%202025%20ENG%20v2.pdf)) | Primary source; the 31% is our sum | Fees and fines are two separate levers; tariffs change only at the season review |
| RTA floated Salik and Parkin. Parkin paid AED 1.1bn upfront for 49 years and pays back 20% or more of parking revenue (same report) | Primary source | **Float a company:** big cash now, a smaller share forever |
| RTA sells special number plates: AED 109m at one auction, December 2025 ([WAM](https://www.wam.ae/en/article/bnghkqi-rta’s-120th-distinctive-number-plates-auction-tops)) | Good | **The plate auction:** a once-a-year bonus. Your own plate is your rank |
| Darb (Abu Dhabi): tolls at peak only, AED 4. Daily and monthly caps removed September 2025; exemptions remain for some groups ([Gulf News](https://gulfnews.com/uae/transport/abu-dhabi-revises-darb-toll-rules-lifts-daily-and-monthly-caps-1.500233627)) | Good | Caps and exemptions: less money, less anger |
| Evening truck ban on Emirates Road: +26 km/h, permits −97% ([Gulf Today](https://www.gulftoday.ae/news/2025/11/19/vehicular-movement-towards-sharjah-from-dubai-increased-by-26km-after-expansion-of-heavy-truck-ban-policy)) | Good | Truck hours: cheap and fast, but shops lose deliveries |
| AI signals: 10–20% off travel time overall ([Khaleej Times](https://www.khaleejtimes.com/uae/dubai-upgraded-central-traffic-signal-control-system)) | Trial figures | Smart signals: the cheap upgrade before a flyover |
| New bus lanes: 38–59% faster peak bus trips on named streets, projected ([Khaleej Times](https://www.khaleejtimes.com/uae/dubai-new-taxi-bus-lanes)) | Projection | A bus lane takes a car lane now and pays back later |
| Paid parking arriving in residential communities drew protests; one developer ended up covering a card per tenant ([The National](https://www.thenationalnews.com/news/uae/2026/01/19/discovery-gardens-residents-call-for-cut-in-unfair-dh945-monthly-fees-for-parking-second-car)) | Good; that operator is not Parkin | Charging people outside their own home hurts most; resident permits fix it |
| Public transport share of Dubai trips: 6% (2006) → 22.3% (2025), target 25% by 2030 ([Media Office](https://mediaoffice.ae/en/news/2026/february/15-02/rta-records-802-riders-in-dubai-2025)) | Good | Transit share is a Council target |

### Rules that hold in most countries

1. **Price a scarce thing and demand moves.** New York's zone charge cut entries about 11% in its first year ([MTA](https://www.mta.info/press-release/icymi-less-traffic-better-transit-its-first-anniversary-governor-hochul-celebrates)); Stockholm's about 20%.
2. **Aim at a target, not at revenue.** Singapore prices roads to keep expressways at 45–65 km/h; SFpark aimed at 60–80% of spaces full.
3. **Small steps on a schedule.** SFpark moved $0.25 at a time, about every 8 weeks ([SFMTA](https://www.sfmta.com/sites/default/files/reports-and-documents/2018/04/sfpark_eval_summary_2014.pdf)).
4. **Full car parks make traffic.** Around 30% of cars in congested centres were looking for a space, in 16 studies ranging from 8 to 74%. The figure is contested, so never quote it as a law ([Shoup](https://www.cato-unbound.org/2011/04/04/donald-shoup/free-parking-or-free-markets)).
5. **Support is lowest just before a charge and rises once people feel the result.** Stockholm went from a minority before, to 53% in the 2006 vote, to over 70% by 2013.
6. **Voters punish the visible bill.** In Bergen in 2019 an anti-toll party became the largest ([Life in Norway](https://www.lifeinnorway.net/?p=38550)).
7. **Give an alternative first.** Seoul reformed its buses before removing the Cheonggyecheon expressway.
8. **Sometimes less road is faster.** Seoul, Stuttgart and New York's 42nd Street eased after closures; none was a controlled test ([Scientific American](https://www.scientificamerican.com/article/removing-roads-and-traffic-lights/)).
9. **Junctions limit traffic, not lanes.** A city street lane carries 600–800 vehicles an hour ([NACTO](https://nacto.org/publication/transit-street-design-guide/introduction/why-transit-streets-matter/designing-to-move-people/)); a freeway lane about 2,400.
10. **A lane moves more people by bus.** 600–1,600 people an hour by car against 4,000–8,000 in a transit lane (NACTO).
11. **Much delay is incidents and road works.** The FHWA's 2004 chart says 25% and 10%; later FHWA work calls it oversimplified ([FHWA](https://ops.fhwa.dot.gov/publications/fhwahop08031/figure2_longdesc.htm)).
12. **Grants come with conditions** and usually a share you pay yourself (from memory, not re-checked).
13. **The chief really does get replaced.** Chile's transport minister was removed in March 2007 over Santiago's Transantiago launch ([MercoPress](https://en.mercopress.com/2007/03/27/chaos-in-santiago-s-transit-triggers-cabinet-reshuffle)).

**Not found:** how much of RTA's budget is grants and how much its own income, fare-box share, Parkin's grace period, and search volumes for traffic games. The game's numbers are balance choices, not claims about real bodies.

### The genre, and where we fit

- Mini Motorways (a pure jam puzzle, no money or politics) is praised for polish. Its critics say stages feel alike and traffic lights can't be controlled. Cities: Skylines has tolls and parking policies inside a huge simulation, and its players complain about lane detail. Traffic Architect on CrazyGames is the closest browser game: roads, bridges, money, gridlock ends the run.
- The search found **no small game where you set prices and answer to residents**. It was not exhaustive.
- **Ours must be its own game.** No colour-matched houses and destinations, no abstract map look, no "one jam ends the run". Our identity is the authority: prices, complaints, the Council, and the flyover you build for one turn.

## The four pillars

1. **See why it jams.** Tap anything and the game shows the cause.
2. **Fix it your way.** Almost every jam has at least three answers: build, price, or move people another way.
3. **It won't last.** A good fix brings growth. The Master Plan shows what is coming, so a failure is bad planning and never a surprise.
4. **Answer to people.** Every complaint is a named resident at a real place on the map.

## A minute of play

1. Morning. Cars pour out of the villas. The roundabout turns red.
2. Tap it. **Flow arrows** show every movement, thick for many cars and red for long waits. One left turn is 60% of the delay.
3. Choose: signals (cheap, fair), a price on the car park drawing them in, a bus route, or a **flyover for that one turn**.
4. Drag from the arrow's tail to its head. The game lays the ramps and pillars and shows the price and the months of works.
5. Works close a lane and anger rises. The flyover opens and the arrow goes green.
6. Two years later that district has apartments instead of villas, and the next junction down is red.

**Building for one movement is the signature mechanic.** It is how real projects are described ("a bridge for the left turn from A to B"), it makes the player read traffic instead of adding lanes, and it's one drag on a phone. No freehand ramp drawing, no lane editor.

## Time

- **A season is one drawn day of 90 seconds:** dawn, morning peak, midday, evening peak, night. Four seasons make a year of 6 minutes at 1×. Speeds: pause, 1×, 2×, 4×. You can build while paused.
- **Night is the review.** Money, approval, the top three complaints. Prices can change only here, in fixed steps.
- **Year end:** the Council's review, next year's Master Plan, the plate auction, and **a choice of 1 of 3 technologies**. It is also the save point.
- **Ten years make a city.** Five cities × ten years = **50 years, the 50 levels**. City 1 (years 1–10) is free.

The 90-second day is the first thing the prototype must prove: a jam has to form, be read and clear within it.

## The city grows

| Force | Rule |
|---|---|
| Master Plan | Districts open on fixed years and are shown two years ahead |
| Density | Each season, blocks with short trips grow a step: villa → apartments → mid-rise → tower. Blocks with bad trips stop growing, and shops there close |
| Habits | Each year, car ownership rises a little unless transit is good |
| Expectations | Each year, residents' idea of a normal trip moves a third of the way to what they now get. Last year's miracle becomes this year's normal |

## Routines: residents live real days (the owner, November 25)

The owner: "we need to figure out real routines to the tenants should go to work in the morning come back. bring kids to nursery/school. visit the gas station when they are out of the gas, visiting beaches and other attractions on the weekend. Go to shops / restaurant in the evening. Each city might have its own routines since different mentalities have different routines and work in different schedule."

**Households, not trips.** Every home block holds households that live there for good (a name, an animal, one or two grown-ups, perhaps a child, perhaps a car). A household has a **fixed** job, school or nursery, favourite shop, restaurant and weekend place (nearest good one; they change only when it closes, moves or a better one opens). One drawn car is still a dozen trips, so one drawn household stands for about a dozen.

**A day is a chain, not a there-and-back.** Example: home, nursery (drop off, 4 s), work (parked all day), shop on the way home, home, restaurant, home. Each stop has a kind, a place, an arrival hour or a stay. The car stays where it was parked until its owner leaves, so a full office car park is full because of people you can name.

| Activity | Where | When |
|---|---|---|
| Work | offices, shops, market, port, hospital, mall, school staff, out of town by a gate | by the city's hours; some early shift, late shift, home office (fewer trips) |
| School and nursery run | school, `nursery` | drop-off on the way to work; pick-up by whoever finishes first, or the school bus or a walk if close |
| Petrol | `fuel` | each car has a tank; it runs down by distance; under a fifth, the next trip stops at a station on the way. Four pumps: a queue spills onto the road. Chargers (a technology) halve visits |
| Shops | shops, market, mall | on the way home, or an evening trip |
| Restaurant, cafe | `food` | lunch for some, dinner by the city's hour |
| Weekend | beach, park, `fun`, landmark, stadium, mall, other homes, out of town | the weekend day |
| Errands | hospital, offices | midday |

Purposes feed the bars: a late school run hurts Trips most, a missed dinner least. Complaints, car bubbles and "follow this car" name the household and its whole day ("Hamda the hedgehog: Saffron School, then Stamp Office, 8 minutes late"). Tapping a home shows who lives there and their day.

**A season is a workday and a weekend.** The drawn season becomes a workday (about 100 s) and a short weekend day (about 45 s) with its own light, music dip and title ("Weekend"). Weekend mornings are late and calm, middays and evenings busy at beaches, parks, malls and restaurants; there are no school runs and few lorries. The night review comes after the weekend. Year 1's first spring keeps its fixed, guided workday.

**Each city keeps its own clock** (`RoutineProfile` in the city's data, numbers from [inkroad-routines.md](inkroad-routines.md)): work and school hours and their spread, split or late shifts, lunch, errands, dinner hour and share, nightlife, weekend pattern, petrol habits and electric share, walking and school bus shares, lorry hours, and how each season bends them (summer midday shade, dark winters, rainy season). Built from working hours and time-use data, never from stereotypes. A player should see the difference on the map within a day: when the peaks come, how many, where people eat, what the weekend fills.

**What the player can do about it:** staggered school and office hours (the profile shifts), a second petrol station (the Council rents you a plot), drop-off bays at schools, evening and weekend prices, event and beach parking, late buses, weekend metro.

## Land: reserved plots and beaches (the owner, November 25)

The owner's first playtest: "A building is in the way" on empty sand, and a road forced onto the beach. The rules now:

- **A refusal always names something you can see.** Plots due within two years are drawn and refuse a road by name ("Carpet Market opens here in year 2"). Plots further ahead never block: if your road or car park stands there when the year comes, the plot moves to the nearest free place, or shrinks. The city grows around your roads.
- **Beaches are protected.** No road or building on beach sand, except a straight approach to a bridge.
- **The Council decides each beach's fate**, announced a year ahead in the Master Plan. The Director may advise; the Council follows good approval.
  - **Sold to property owners:** beachfront villas and hotels rise, the road authority gets a share of the sale, rich new drivers arrive, the sea is closed to everyone else (Streets falls, complaints).
  - **Public beach:** everyone comes, most of all on summer middays. The authority may build **beach parking** next to it, the only building allowed there, and may charge for it. Without enough spaces, cars search and double-park along the shore road. Enough spaces raise Parking and Streets.

## Happiness and being replaced

**Approval (0–100)** comes from four bars, always on screen:

| Bar | Goes down | Goes up |
|---|---|---|
| **Trips** | Trips longer than people expect, cars that give up | Faster than expected, reliable |
| **Parking** | No space, long walks, double parking | A space within a short walk |
| **Cost** | Fees, tolls, fines and fares as a share of a trip; charging people at home | Permits, caps, off-peak prices, a free alternative route |
| **Streets** | Road works, noise beside big roads, crashes | Quiet streets, night works, crossings, tunnels |

- **Council letters.** Approval under 40 at a season review brings a warning letter. **Three letters and you are replaced.** A year at 60 or more tears one up.
- **Broke.** The first time, the Council lends you out of it and it costs a letter. Debt past the limit a second time and you are replaced.
- **Replaced** shows why, in one screen, with the three worst spots on the map. Then: try this year again (it was saved), or any earlier year. A failure costs minutes, never the city.
- **Every year gives 0–3 plates:** survive; approval ≥ 60; the year's own target. **Your director's number plate loses a digit as you collect plates,** five digits down to one, because in the Gulf the shortest plates are the proudest.
- **No dark patterns:** no timers, no streaks, nothing to buy with real money.

## Money

| In | How it works | The catch |
|---|---|---|
| Parking fees | Price per zone and per time of day. The best occupancy is about 85% | Too cheap: full, and cars circle. Too dear: empty, and shops suffer |
| Parking fines | Amount × how well you enforce | Too little: double parking blocks lanes. Too much: "cash machine!" and Cost falls fast |
| Toll gates | Placed on a road, with peak, off-peak and night prices | Drivers divert through small streets. No free alternative doubles the anger |
| Fares | Per line | Cheap fares fill buses and lose money |
| Council commissions | 1–2 a year: a problem, a target, a deadline. 40% paid upfront, the rest on delivery | Miss it and you pay the upfront part back |
| Matching grants | Metro, tram, big bridges: the Council pays 60% | You must find 40% |
| Plate auction | Once a year; pays more as the city gets richer | – |
| Floating a company | Once per stream (parking, tolls): a lump sum | You keep a quarter of that stream from then on |

**Out:** building, buying land (dear, and it hurts Streets), upkeep that grows with age, bus and metro running costs, inspectors, interest.

**The yearly question:** what will I need in two years, and what am I willing to charge for now?

## The toolbox

**Roads.** Street (1+1), avenue (2+2), boulevard (3+3 with a median and U-turns), highway (4+4, no frontage). One-way, turn bans, speed limits, truck hours, reversible lane, removing a road.

**Junctions**

| Junction | Cost | Good for | Fails when |
|---|---|---|---|
| Yield | – | Quiet streets | Any real flow |
| Roundabout | Low, needs space | Balanced, medium flow; safe | One movement dominates and starves the rest |
| Signals | Medium | Uneven flow. Green time is one slider per direction | Too many phases |
| Smart signals (tech) | Medium | 10–20% better, adjusts itself | Same ceiling as signals |
| Flyover or underpass for one movement | High. Underpass: dearer, quiet | The one turn that breaks the junction | Moves the jam to the next junction |
| Interchange | Very high, lots of land | Highway meets highway | City streets around it |

**Parking.** Kerb bays (cheap, slows the lane), surface lot (land), multi-storey, underground, robot garage (tech), park-and-ride, resident permits, event prices, inspectors → scan cars.

**Public transport.** Bus route (tap the stops; choose how often), bus lane, express bus, tram, metro (Council matching, big works), water bus, taxi ranks, on-demand bus.

**Control room (tech).** Tow trucks, smart signals, parking app, traffic forecast, staggered school and office hours, school buses.

**Reading the city.** Four map views: *flow*, *parking*, *anger*, *money*. Tap a road to see where its drivers come from and go. Tap a car to hear its driver.

**Limits, so it stays a casual game:** no lane-by-lane editing, no signal phase editor, no more than 12 tools in a city, and a new tool only when a year teaches it.

## How a resident decides (one formula)

Every trip picks the cheapest of car, bus, metro, taxi or staying home, and the cheapest route and hour:

`cost = minutes × value of time + money + minutes looking for a space + walking + a penalty per change`

That single rule makes roads, tolls, parking, fares and bus lanes one system. Any lever moves all the others, and players can work out why. Choices carry a little randomness, and only a slice of drivers rethinks at a time, so traffic never flips all at once.

## Events

One or two a year, always readable and always with something to do: a breakdown on a bridge, a football night, school term starts, a rainstorm floods the underpasses, a sandstorm slows everyone, a festival changes the hours, a burst pipe digs up your new road. No deaths on screen: crashes are bent bumpers and shouting.

## Five cities

Each is fictional, a different climate and a different common rule.

| City | Years | Place | What is different | Real basis |
|---|---|---|---|---|
| 1 **Saffron Bay** (free) | 1–10 | Young desert port | Cheap land, wide roads, everyone drives | Dubai, Abu Dhabi |
| 2 **Old Harbour** | 11–20 | Old stone town | Streets can't be widened. Trams, permits, squares, and a zone charge with a trial and a **vote** | Stockholm, Milan, Oslo |
| 3 **Twin Isles** | 21–30 | Rich islands | Almost no land. Car licences by auction, tolls that follow speed, tunnels | Singapore, Hong Kong |
| 4 **Seven Hills** | 31–40 | Huge hilly strait city | Two bridges, ferries, private minibuses that don't want your bus lane | Istanbul, Bogota, Santiago |
| 5 **Cross Rivers** | 41–50 | Ageing freeway city | Everything needs repair, matching grants, and the freeway you may **remove** | US cities, Seoul |

The real basis of cities 2–5 needs its own fact check before any public text.

### Saffron Bay, year by year

| Year | Name | Opens | Teaches |
|---|---|---|---|
| 1 | The Roundabout | Villas, market, school | Draw a road, read the arrows, build a roundabout. You can't lose this year |
| 2 | No Space at the Market | Kerb bays, car park | Parking prices and the 85% rule |
| 3 | The Fine Print | Inspectors | Double parking, fines, and the cash-machine trap |
| 4 | Office Hours | Office district | Signals; the first commission |
| 5 | The Red Lane | Buses | Routes, frequency, the bus lane's price now and payback later |
| 6 | Over the Top | Flyovers | The one-movement flyover; works by night |
| 7 | The Second Bridge | The far shore | The toll gate, peak prices, a free way round |
| 8 | Mall Season | The mall | Multi-storey, event prices, U-turns; the year-1 roundabout fails |
| 9 | The Green Line | Metro | Matching grant, a year of works, park-and-ride |
| 10 | The Grand Fair | Twice the visitors | Everything; the ten-year review and a time-lapse of your city |

After year 10: **Stay in Office**, an endless mode on your own city.

## Daily Jam (after launch, designed for now)

One small broken piece of city, a fixed budget, the same for everyone on a date. You have one day to fix it. **The score is the average trip time in seconds,** so it fits the site's daily ranking as it is. It follows [daily-playbook.md](daily-playbook.md) (one rule of the day, seasons, days played and never streaks). It is also the marketing format: "fix this junction", before and after, loops in under 10 seconds.

## Characters

Animals, as in the other games. Names use plain letters.

- **You:** the Director, never seen. Your desk, your plate.
- **Dewy, a fennec fox:** traffic engineer. Big ears, hears every horn. Teaches roads.
- **Miko, a meerkat:** head of parking. Meerkats stand lookout, so the inspectors are all meerkats.
- **Juma, a camel:** buses and metro. Carries everyone, complains about nothing.
- **Pim, a jerboa:** the treasurer. Panics about money.
- **Sulo, an old tortoise:** chair of the Council. Always late because of the traffic. Writes the letters.
- **Residents:** hedgehogs, gazelles, owls and more, each with a car and an opinion.

**Fictional throughout:** no real authority, brand, logo, flag, landmark, ruler or currency, and no religious buildings. The authority is the hero of the game, never the joke. Money is "dinars-like" coins with their own sign.

## Graphics

Three directions of the same scene, generated November 25, in `docs/inkroad/concepts/`.

| | A: painted three-quarter map | B: isometric pixel | C: straight-down plan |
|---|---|---|---|
| Roads keep their shape, any angle and curve | **Yes** | No: skewed, diagonals jag | **Yes** |
| Cars turn freely from one sprite | **Yes** | No: 16–32 drawn headings per car | **Yes** |
| Which road is on top | Clear: height, pillars, shadow | Clear | Weak: shadow only |
| Nothing hides the road | Mostly | No: towers cover the street behind | **Yes** |
| The city visibly grows | **Yes:** villas become towers | **Yes** | Weak: roofs look alike |
| Smooth zoom on a phone | **Yes** | No: whole steps only | **Yes** |
| Looks like our catalogue | Ink and wash, like InkFish and InkBrick | Like InkHeroes | Neither |

**Choice: A, pen and ink with watercolour, three-quarter top-down.** Build mode borrows C: pick a tool and buildings sink to flat footprints, so nothing is ever in the way of the road you are drawing. Pixel art is out because this game needs free rotation and smooth zoom, the two things pixel art does worst.

The frames are key art. The game will be calmer: fewer palms, bigger cars, quieter sand, and red used only for jams.

**How it is made**

- **Projection:** a point at height z is drawn at `(x, y − z/2)`; the ground is exact plan. The same idea as the InkHeroes castles, without hexes.
- **Roads:** any shape, so the game builds them as ribbons from **painted** textures (asphalt wash, kerbs, sand edges, markings, red bus lane), never flat code colour. Decks add height, pillars and a shadow.
- **Buildings:** 3D massing in the exact projection, then painted, then cut by the model's outline (the [inkheroes-castles.md](inkheroes-castles.md) method). About 45 for Saffron Bay: 6 kinds × 4 growth steps × variants, plus the school, mall, offices, stadium and station. Drawn height is capped at 3 cells so towers don't bury streets.
- **Vehicles:** about 14 painted top-down sprites, tinted: cars, taxi, bus, truck, van, tow truck, school bus, metro.
- **Zoom levels:** close = cars with shadows; middle = cars; far = coloured flow on the roads.
- **Time of day:** one wash over the scene, plus headlights and windows at night.
- **UI:** a surveyor's desk. Paper panels, rubber stamps, the Council's letters. Phones follow [mobile-playbook.md](mobile-playbook.md): 44 px targets, 16/14 text.

## Engine

Package `games/inkroad`, branch `feat/inkroad`, port 5181, Phaser 4 and TypeScript. The simulation is headless in `src/sim`, fixed step, seeded, no Phaser, so bots and tests share it.

- **Map:** a grid with 8 directions, drawn as smooth curves. Each cell has a level: −1 underpass, 0 ground, 1 deck. Snapped dragging works with a thumb, and saves stay small.
- **Cars:** each lane is a queue of cars following the **Intelligent Driver Model** at 10 steps a second, drawn smoothly at 60. Lanes are chosen by the car's next turn. Cap 700 moving cars; one stands for about a dozen trips. Nobody has measured this on a phone yet: the prototype must.
- **Junctions:** a conflict table per junction type. A car enters only if its exit has room, which prevents most gridlock. A car stuck for 60 s gives up, and that trip counts against you.
- **Routes:** one travel-time field per destination area, refreshed a few at a time, with tolls and parking search added.
- **Reuse:** MIT reference [RoadTrafficSimulator](https://github.com/volkhin/RoadTrafficSimulator) (IDM, lane changes; 2017 CoffeeScript, so ideas more than code). traffic-simulation.de and MovSim are GPL: **read only, never copy**. No mature TypeScript engine turned up.
- **Bots and lab** (`npm run lab -- year 4`): *nobody* (does nothing), *beginner* (reacts to the reddest junction), *planner* (reads the Master Plan), *greedy* (max prices).

| Measure | Target |
|---|---|
| Nobody | Replaced by year 4 |
| Beginner finishes year 1 / 5 / 10, with retries | 100% / 90% / 60% |
| Planner survives Saffron Bay | ≥ 95%, at 2+ plates a year on average |
| Greedy | Replaced by year 6: prices alone never win |
| Different answers | ≥ 3 solution families (build / price / transit) pass each of years 4–10 |
| It won't last | ≥ 60% of junctions rated good in year 3 are bad by year 7 if untouched |
| Speed | 700 cars at 60 fps on a mid-range phone |

## Risks

| Risk | Answer |
|---|---|
| Traffic looks wrong or locks up | Prototype first, before any art or economy |
| Too many systems for a casual player | One new tool a year; one formula behind everything |
| Feels like homework | Residents with jokes, the arrows, the satisfying clear; pause any time |
| Looks like a known road game | Our own camera, art and pricing core; see the genre note above |
| Too big for one Sunday | It is. See the plan |
| Art cost of five cities | Vehicles, roads and UI are shared; each city needs about 45 buildings |

## Plan

| Step | What | Gate |
|---|---|---|
| 1 Prototype | Grey boxes: one jammed roundabout, road drawing, flow arrows, signals, the one-turn flyover, 90 s day, 700 cars on a phone | **The owner plays it: is fixing the jam fun?** If not, stop or change here |
| 2 Look | One painted screen of Saffron Bay in the real projection, moving cars, build mode | The owner approves the art |
| 3 Engine | Economy, approval, parking, tolls, buses, growth, saves, bots, lab | Lab targets on years 1–3 |
| 4 Saffron Bay | Years 1–10, art, sound, phone, tutorial | Beginner targets; owner's playtest |
| 5 Launch | Site page, price card, changelog, shorts, then Daily Jam | – |
| 6 Cities 2–5 | One at a time; vehicles and engine stay | Lab targets per city |

Models per role follow [agent-orchestration.md](agent-orchestration.md): Opus for the prototype, engine and first city's design; Sonnet for art batches, year tuning and tools.

**Dates.** The owner set the release for Sunday, November 29, 2026.

## Decisions (the owner, November 25)

1. **Name:** InkRoad (it sounds like the Silk Road).
2. **Shape:** five cities of ten years.
3. **Launch size:** Saffron Bay and Old Harbour first; all five if time allows.
4. **Date:** this Sunday, November 29.
5. **Graphics:** painted, but the owner isn't sure about the **angle**. Decided on real in-game screenshots; the ground tilt is one constant. No PixelLab (out of credits).
