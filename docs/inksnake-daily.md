# InkSnake: daily levels ("Today's Hunt")

InkSnake's daily level, following [the daily playbook](daily-playbook.md). It's InkSnake's own version of InkBrick's daily ([inkbrick-design.md](inkbrick-design.md#the-daily-level)). Asked for by the owner on 2026-11-18: daily levels like InkBrick's, every day feeling different, unique snakes and themed events for international days, and places that follow the season (winter dailies in winter places). Branch `feat/inksnake-daily`.

## What a day is

One level, the same for everyone on that local date: free, no account needed. Owners can play past days. It goes on the site-wide `/daily` calendar next to InkBrick's.

- **Ranked by time to win.** The end card says "faster than N% of today's winners", using `clearBetterThan`. `breakIn` isn't used.
- **The free daily may be set in any place, paid chapters' places included.** Their art is in the client already; only campaign levels are served to owners. On a paid place, the end card adds "The Reef is chapter 6 of the full game".

## The dials

Every day sets each dial. The novelty memory ([playbook](daily-playbook.md#variety-the-dials-and-the-memory)) keeps combinations from repeating.

| Dial | Values | Notes |
|---|---|---|
| **Season** | winter, spring, summer, autumn | From `seasonOf(date)` (shared calendar). Picks the place pool and the look |
| **Place** | the 10 chapter places | From the season's pool (below). No place twice within 3 days |
| **Snake** | the place's own snake; a **guest** snake (about 1–2 a week); an **event** snake | A guest must suit the place: the flying snake only where there are tree zones, the krait only with water, the egg-eater only with eggs. In winter, guests are temperate snakes only (corn, hognose, adder, horned viper) |
| **Goal** | grow, feast, rush, **golden** (new), boss | No goal with a fixed length (it wouldn't rank by time) |
| **Rule of the day** | one of the table below, exactly one per day | Never the same rule twice within 7 days. The season tilts the odds |
| **Layout** | `remix` of a chapter board, or a generated `pattern` | Never the same layout twice within 60 days |
| **Cast** | which of the place's prey and enemies come, and how many | From the place's chapter rules |

### Season pools (northern hemisphere, meteorological seasons)

| Season | Places | Seasonal look |
|---|---|---|
| **Winter** (December–February) | farm, barrens, mountains, heath | **Snow/frost looks for all four** (snow on the ground and solids, frosted cover, frozen ponds). Night more often |
| Spring (March–May) | farm, heath, barrens, savanna, rainforest, flooded | The campaign look (blossom later) |
| Summer (June–August) | dunes, reef, savanna, jungle, rainforest, flooded, mountains | The campaign look |
| Autumn (September–November) | farm, barrens, heath, mountains, jungle, dunes | The campaign look (gold leaves later; the farm already has pumpkins) |

Every place is in at least one season. In real life, corn snakes brumate and adders hibernate through the cold (an adder may bask on a mild winter day where the snow has melted). On winter days, the before-level line has fun with it: "Too cold to sleep in: the corn snake is out hunting in the snow."

### Rules of the day

The rule's name and line show before the level starts and in the tomorrow teaser. **Data** rules are applied to the level by the generator, with no engine change. **Engine** rules are new behaviour.

| Rule | Line | Effect | Kind | Made by | Seasons |
|---|---|---|---|---|---|
| `plenty` | Plenty: twice the food | Prey count ×2, target ×1.3 | easy | data | all (autumn harvest more) |
| `lure` | Sweet Tooth: food comes to you | Prey within 90 px of your head drifts toward it at 30 px/s | easy | engine | all |
| `looseKnots` | Loose Knots: you can't tie yourself up | Crossing your own body never costs a life (no knot) | easy | engine | all |
| `goldRush` | Gold Rush: golden meals | Every 4th prey that arrives is golden: ×3 growth, sparkles, flees a little faster | easy | engine | autumn, events |
| `night` | Long Night | `dark: true` | hard | data | winter more |
| `oneLife` | One Bite | `lives: 1` | hard | data | all |
| `hunters` | Hunting Season: more hunters | Enemy count ×2, first arrival halved | hard | data | autumn |
| `longTail` | Long Tail: start long | Start length ×2 (target raised to match) | hard | data | all |
| `ice` | Ice: you slide when you turn | The heading follows the steering with lag (turn rate ×0.55), and speed carries for 0.4 s | hard | engine | **winter only** |
| `blizzard` | Blizzard: the wind pushes you | A steady sideways push (40 px/s) that changes direction every 8–12 s. Gusts show as snow streaks | hard | engine | **winter only** |
| `fog` | Fog | Night with a much wider ring of sight (about 2.2× the night radius) | hard | engine (night radius param) | autumn, winter |
| `hotDay` | Hot Day: everyone's fast | Snake and prey speed ×1.25 | hard | engine (speed multiplier) | summer |
| `giants` | Giants: big meals only | Only prey that needs a coil or venom | spectacle | data | all |
| `swarm` | Swarm: tiny food everywhere | The place's smallest prey ×4, target ×1.2 | spectacle | data | summer, spring |
| `stampede` | Stampede | The place's lane enemy (herds, rockfall, fire) every 6 s. Only where the place has one | spectacle | data | where possible |
| `rival` | Rival: another snake wants your food | A rival snake of the same species hunts the same prey (as in the Dunes) | spectacle | engine (rival in any place) | all |

### The golden goal (new)

`goal: { kind: 'golden', count: 3 }`: a **golden** prey of the place's fast kind (a mouse on the farm) appears, runs from you, and hides in cover. Catch it `count` times; each catch spawns the next somewhere else. The usual target length still has to be reached. It ends with a set piece: on the last catch, the golden prey drops a shower of sparkles along your body.

## Weekly rhythm

| Day | The hunt |
|---|---|
| Monday | Warm-up: grow, an easy rule, the home snake, a short target |
| Tuesday | Feast |
| Wednesday | **Guest snake** (a snake out of its home), grow or rush |
| Thursday | Rush |
| Friday | **A hard rule** (in winter: ice, blizzard or night) |
| Saturday | **The odd one:** golden chase or a spectacle rule |
| Sunday | **Boss day:** the place's boss with a spectacle rule (in winter: the Old Tomcat, the Red Fox, the mountain boss, the heath's badger) |

## Layouts

- **`remix`:** one of the place's campaign boards (levels 1–9), mirrored in x, y or both. Solids are jittered a little, and cover, prey and enemies are re-cast. That gives 36 bases per place, and keeps whatever zones the place's ability needs (water, trees, sand) where they make sense.
- **`pattern`:** generated from the place's own solid and cover looks. At least six shapes: `ring` (a loop of solids round an open middle), `lanes` (long rows like fences or logs), `scatter`, `rooms` (three or four open pens joined by gaps), `islands` (water places), `spiral`. Patterns never shrink the board and never leave long empty floor ([no empty walking](inksnake-design.md)).

## Events (themed days)

The shared event calendar is in [the playbook](daily-playbook.md#events-shared). On an event day, InkSnake brings out the event's **snake** (a real species), the event's **look** on the place, **treats**, and an event rule. Playing the day adds the snake to the **snake album** and puts a stamp on the calendar.

**Treats** are still pickups in the event's style. When your head touches one, it goes with a sparkle and a small bit of growth (no lump). An event day's goal is usually `feast` on its treat. Treats only (no gross food).

| Event | Snake (real) | Place (by season) | Look | Treats | Rule |
|---|---|---|---|---|---|
| Christmas Eve (Dec 24) | **candy cane corn snake** (corn snake morph, red on white) | farm, winter | snow, presents as solids, fairy lights | cookies | `ice` |
| Christmas Day (Dec 25) | candy cane corn snake | barrens, winter | snowy pines, presents | candy canes | `night` (fairy lights glow) |
| Boxing Day (Dec 26) | candy cane corn snake | farm, winter | snow | cookies | `plenty` |
| New Year's Eve (Dec 31) | **rainbow boa** (iridescent) | farm, winter, night | fireworks light the board in bursts | confetti stars | `night` |
| New Year's Day (Jan 1) | rainbow boa | mountains, winter | fireworks | confetti stars | `goldRush` |
| Lunar New Year (2027: Feb 6; 2028: Jan 26) | **golden tree snake** (*Chrysopelea ornata*: green, cross-hatched black, with gold accents) | mountains, winter | red lanterns | red envelopes | `goldRush` |
| Valentine's Day (Feb 14) | **rosy boa** | heath, winter (frost) | hearts | heart candies | `looseKnots` |
| World Wildlife Day (Mar 3) | the place's own | farm, spring | | | `plenty`, with prey from every place |
| St Patrick's Day (Mar 17) | **green tree python** | rainforest, spring | clovers | gold coins | `goldRush` |
| Easter (2027: Mar 28; 2028: Apr 16) | **egg-eater** (a guest on the farm) | farm, spring | blossom | painted eggs (feast) | `plenty` |
| Earth Day (Apr 22) | **smooth earth snake** | heath, spring | flowers bloom behind you | | `lure` |
| World Oceans Day (Jun 8) | **yellow-bellied sea snake** | reef, summer | | | `swarm` |
| World Snake Day (Jul 16) | **any snake in your album** (your pick) | farm, summer | bunting | | `rival` |
| International Cat Day (Aug 8, date to confirm before freezing) | corn snake | farm, summer | | | The Old Tomcat, playful (a boss day) |
| Halloween (Oct 30–31) | **eastern hognose, black form** (plays dead) | farm, autumn, night | pumpkins, bats | candy | `night` / `fog` |
| Diwali (2027: Oct 29) | **king cobra** | jungle, autumn | oil lamps that light as you pass | | `lure` |

Event snakes are new `SnakeId`s. Each one plays like a close relative: the candy cane corn snake and the rosy boa coil, the golden tree snake glides only where there are tree zones, and the sea snake swims. Each needs its own `SnakeArt`: a painted strip and a head, in the existing pipeline ([art/snakes](../games/inksnake/src/art/snakes)). The snakes are built in date order: Christmas and New Year first (frozen in the first 60 days), then Lunar New Year and Valentine's before January 15, then the rest at least 30 days before their date.

**Fact-checked 2026-11-18** (Sonnet agent): the event dates for 2027 and 2028 and the event species (the candy cane corn snake is a real amelanistic morph; the rainbow boa's sheen is structural colour; the eastern hognose has black forms). Still unconfirmed: International Cat Day's date, and the rosy boa's colours (the source didn't say). Check both before they're frozen.

## Snake album

A screen in the menu: one card per snake you've hunted with in a daily (the 10 home snakes and every event snake). Each card has the snake's name, its Latin name, one true fact, and the date you first played with it. The album only grows. Event snakes show on their card with the event's stamp. Owners can replay past event days from the archive.

## In the game

- **Menu:** a "Today's Hunt" button above the map shows today's place, snake and rule. On a challenge link it opens straight into the day.
- **Before the level:** a card with the date, the place, the snake and the rule's line (and the event's name on an event day).
- **End card** (win or lose): the result and time; the standing; "Challenge a friend" (copies the challenge link); "N days played"; and the **tomorrow teaser** (tomorrow's place and snake silhouette, its rule, and a countdown to midnight). From 7 days before an event, it also says "Christmas Hunt in 6 days".
- **Day milestones** (3, 7, 14, 30, 50, 100 days played across every game's dailies) unlock album pages and calendar stamps.
- **InkSnake's calendar:** owners pick archive days from it. It's the site's calendar filtered to InkSnake, as in InkBrick.

## Level fields (contract)

```ts
// games/inksnake/src/level/types.ts (additions; every one optional, campaign levels unchanged)
readonly place?: Place;        // dailies: where it's set (campaign levels: from their chapter)
readonly season?: Season;      // the look; absent = the campaign look
readonly rule?: DailyRule;     // the rule of the day (data rules are already applied to the fields)
readonly event?: EventId;      // a themed day: its look and stamp
readonly treats?: { readonly kind: TreatKind; readonly count: number };
// GoalDef gains: { kind: 'golden'; count: number }
// SnakeId gains the event snakes: 'candycane' | 'rainbowboa' | 'goldentree' | 'rosyboa' | 'greenpython' | 'earthsnake' | 'yellowsea' | 'blackhognose'
```

- Daily level ids are `daily-YYYY-MM-DD`. `placeOf` reads `level.place` first. The bot's place hooks read `level.place` too.
- `Season`, `EventId`, `seasonOf(date)` and `eventOn(date)` come from `packages/game-sdk/src/calendar.ts`, the shared calendar.
- The validator (`level/validate.ts`) checks every new field, and rejects an event snake or rule it doesn't know (untrusted JSON from the server).

## Generator

The flow is InkBrick's (`src/gen`, `npm run gen -- --from 2026-11-22 --days 60`, frozen to `content/daily/YYYY-MM.json`, exported by `content/daily.ts` as `inksnakeDaily(date)`):

1. `seed = hash('inksnake:' + date)`.
2. **Plan the day:** the event (if any), then the season and weekday, then the place, snake, goal and rule. The last 14 days' memory decides among what's left.
3. **Compose about 60–120 candidates:** a layout source and transform, a cast, and the target and par.
4. **Cheap checks:** the validator, a clear start (no solid within 80 px ahead), prey reachable, cover not on top of solids.
5. **The bot** plays each survivor (headless, the existing `test/bot.ts` and its place hooks, with the rule applied). It has to win on at least 2 of 3 seeds. Its win time has to land in the weekday's band (Monday shortest, Friday and Sunday longest). Then the novelty score.
6. **The best candidate is frozen.** `dev/contact.html` shows every frozen day (board, place, snake, rule, event, numbers) for the owner's weekly veto.

## Build plan

1. **Engine** (one Opus agent): the level fields and validator, the shared `calendar.ts`, every engine rule, the golden goal, treats, winter looks for the four winter places, the event snakes `candycane` and `rainbowboa` with their art and event looks (Christmas, New Year), and the daily flow in the game (menu, cards, end card, album). Also the dev `DailyHost` and tests.
2. **Generator** (one Opus agent, once 1 is done): `src/gen`, the CLI, freezing November 22 to January 31 (matching InkBrick), and the contact sheet.
3. **Website** (in 2): one line in `daily.server.ts`, the slug and blurb in `data/dailies.ts`, and the package export `./daily`.
4. **Later event snakes** (Sonnet, one per snake from the candy cane worked example): golden tree snake and rosy boa by January 15, the rest 30 days before their date.
5. **Owner review:** the contact sheet, then a playtest.
