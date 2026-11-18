# InkSnake: design

Classic Snake remade in ballpoint pen. You play a real snake in its real home: eat, grow longer, and coil round prey too big to swallow, while the animals that hunt snakes hunt you. Each chapter is a new snake in a new place, with its own way of hunting and its own enemies. Real-life facts are in [inksnake-research.md](inksnake-research.md).

Started Oct 24, 2026. Sixth game on 16bit.ink, due Sunday Nov 1.

## Why this game

- **The giant swallow sells.** Our two breakout shorts (#13 gulper eel, #21 viperfish) are both one mouth swallowing something its own size. A snake does that every level: a lump the size of a rat slides down its body.
- **Everybody knows Snake.** Nokia Snake and Slither.io mean no tutorial is needed, which matters with 78% of home-page visitors gone in ~13 s, most of them on phones.
- **The home page already teases "Something with birds."** Birds of prey are the snake's "bigger fish", and nests are its treats.

## Pillars

1. **Snake, but alive.** The body is a smooth pen-drawn tube that follows the head's exact path, with scales, a flicking tongue and a lump for every meal. Your own body is the main obstacle, as in Snake.
2. **Eat small, coil big.** Prey narrower than your mouth goes down whole on contact. Bigger prey must be circled: close a loop of your body round it and you squeeze, then swallow. You can't move while you squeeze, so it's always a risk.
3. **Every snake hunts its own way.** A new species each chapter brings one ability true to life (play dead, bury in sand, glide, hold its breath, lure with its tail…), taught on its own before it's mixed with the rest.
4. **Readable threat.** Every attack is told before it lands: a shadow circling, a cat's wiggle, a dotted lane, a red ring. A loss is always your fault, never a surprise.
5. **No lost progress.** Three lives a level; a failed level is retried on the spot.

## Rules

- **Board:** every level is laid out on a 1280 × 720 board seen from above, scaled to fit the screen; on a phone held upright it turns a quarter (as InkGecko). Past its edges the ground fades to paper.
- **Movement:** the snake always moves forward at its species' cruising speed. The head turns towards the steering direction at a limited turn rate, and the body follows the exact path the head took.
- **Strike:** a quick lunge forward (about 3× speed for a fifth of a second, then a short cooldown). It catches fast prey, scares most enemies off, and is how bosses are hurt.
- **Eating:** prey whose size is under your **gape** is swallowed when your head touches it. Your gape grows with your length. The meal shows as a **lump** that slides down your body, and your tail grows as it goes. You grow no longer than the level's target: past it a meal only scores, so on boss, rush and feast levels the body stays one the board can hold.
- **Coiling:** prey too big to swallow, but not too big to coil, is caught by closing a loop of your body round it. When your head comes back close to your body with the prey inside the loop, a dotted ring shows that it's closing. The loop then tightens (you stop for about a second), and you swallow it with a big lump. Prey bigger than you can coil is something to keep away from.
- **Your body:** biting your own body (your head crossing it, past your neck) ties a knot and costs a life. Closing a loop round prey is not a bite. Your body is solid to everything on the ground: prey and hunters slide along it instead of crossing it, so prey inside a loop stays inside. Birds, fires, rockfalls, herds, the shark below and other snakes pass over it. A hunter that chases you for 7 seconds without a bite gives up for a while.
- **Walls and things in the way:** board edges, fences, rocks and trunks are solid, to the snake and to everything on the ground. The head slides along them; they never cost a life.
- **Cover:** bushes, tall grass, cabbages and burrows hide you while your head is under them. Birds lose sight of you and hunters lose your trail.
- **Lives:** three, with a blinking moment after each loss when nothing can hurt you and you can cross your own body.
- **Length lost:** some enemies nip your tail and take some length, but never below the length you started the level with.
- **Ink blots (stars):** one for clearing the level, one for beating its par time, one for losing no lives (as InkGecko).

## Goals

Every level asks for one of these, with a twist or a boss (below):

| Goal | What it asks |
|---|---|
| Grow | Reach the target length (the default; the meter is a pen line along the top that fills to it) |
| Feast | Also eat a set number of one marked food (eggs, toads…) |
| Rush | Grow before the clock runs out, with plenty to eat |
| Hold out | Survive the hunt for so many seconds |
| Boss | Drive the chapter's boss off (strike it in its open moments), then grow |

## Enemies

Each chapter has two enemies of its own and a boss. They come in a few kinds, each with its own tell, so a new enemy is learned from its kind:

| Kind | Tell | Attack | Counter |
|---|---|---|---|
| Diver (hawks, eagles, buzzard) | A shadow circles, then a red ring locks on | Swoops at the ring: costs a life if your head is in it | Hide under cover, or slip out of the ring |
| Pecker (crow, weaver, raccoon, hornbill) | Hops towards your tail | Nips the tail tip: you lose some length | Strike it and it flaps off |
| Pouncer (cat, fox) | Crouches and wiggles | Leaps in a straight line at your head | Dodge sideways; strike its face |
| Chaser (coyote, mongoose, opossum, monitor, hedgehog, honey badger) | Runs at your head | Bite: costs a life | Outrun it, or hide, or strike (some can't be scared) |
| Charger (boar, wildebeest herd) | Paws the ground; a dotted lane | Runs the lane: costs a life if your head is in it, a nip if your body is | Get out of the lane |
| Stomper (secretary bird, heron) | Lifts a foot over a red ring | Stomps the ring | Slip out of the ring |
| Lurker (caiman) | Two eyes in the water, bubbles | Lunges from its spot | Keep your distance, or swim past fast |
| Rival snake (kingsnake, rat snake, krait, a bigger anaconda) | Its own snake body | Eats prey before you; a bigger one bites | Avoid bigger ones; a king cobra eats them |

Hazards in some chapters work like InkFish's hooks: a dotted warning, then a sweep (stampede, rockfall, wildfire line). Drifting box jellies on the reef sting whatever they touch.

In the guide, an enemy's card says only what's on record: some are documented hunters of that very snake, others hunt snakes in general (see the research doc's wording rules).

## Chapters

A new snake each chapter, each on a new kind of ground. Chapter 1 is free; chapters 2–10 are the full game, served by the server as level data (like InkGecko's).

| # | Place | Snake | New ability (taught on level 3) | Prey (big ones need a coil or venom) | Enemies | Boss |
|---|---|---|---|---|---|---|
| 1 | The Farm | Corn snake | **Coil** round big prey | mice, frogs, hens' eggs; rats (coil) | red-tailed hawk (diver), crow (pecker) | The Old Tomcat |
| 2 | The Pine Barrens | Eastern hognose | **Play dead**: roll belly-up; hunters lose interest. **Hood bluff**: spread your neck and hiss | toads (they puff up), frogs, lizards | raccoon (grabs your tail, like a pecker), Virginia opossum (chaser), wildfire line (hazard) | The Red Fox |
| 3 | The Dunes | Sidewinder | **Bury**: stop and sink into the sand, hidden; ambush. **Venom**: strike big prey, follow it until it sleeps. Sidewinding over loose sand | lizards, kangaroo rats, pocket mice | coyote (chaser), kingsnake (rival, resistant to venom) | The Roadrunner |
| 4 | The Savanna | African egg-eater | **Eggs only**: no teeth, so nothing but eggs; a big egg takes a still moment to swallow, then the shell is spat out. **Rasp**: rub your scales like a viper to scare | eggs in weaver and guineafowl nests | banded mongoose pack (chasers), weavers mobbing their nests (peckers), wildebeest stampede (hazard) | The Secretary Bird |
| 5 | The Rainforest | Paradise flying snake | **Glide**: up in the canopy the crowns are your world (the end of the branches stops you); glide to cross to the next tree. A glide that falls short drops you on the forest floor, shaded dark, slow and hunted, until you slither to a tree and climb back up | geckos, tree frogs, small bats | water monitor (chaser, on the floor), hornbill (pecker, in the trees) | The Crested Serpent Eagle |
| 6 | The Reef | Banded sea krait | **Breath**: swim fast underwater, but breath runs low; refill on the sand cay. Eels hide in coral holes: probe them | eels, gobies, small fish | white-bellied sea eagle (diver, over the cay), drifting box jellies (hazard: a sting costs length) | The Tiger Shark |
| 7 | The Mountains | Spider-tailed horned viper | **Lure**: hold still and wiggle your tail; birds come down for the "spider", strike them | larks, warblers and finches on migration, lizards | short-toed snake eagle (diver), rockfall (hazard) | The Wild Boar |
| 8 | The Heath | European adder | **Warmth**: cold blood: you slow down in shade and snow, and warm up in patches of sun that drift as clouds pass. Sunshine warms you as you slither through it (the more of the body in it, the faster: no stopping to bask). Patches are painted golden and rimmed while lit, cloud shadows dim them, and live notes say cold / warming / clouded over | voles, common lizards, frogs | common buzzard (diver), hedgehog (chaser; prickly, so strikes don't work), grey heron (stabs a red ring, like a stomper) | The Badger |
| 9 | The Jungle | King cobra | **Hood**: rear up and spread your hood; everything near freezes. **Snake-eater**: other snakes are your prey | rat snakes, kraits, pythons (coil) | honey badger (chaser; your hood doesn't scare it), rival snakes (bigger ones bite) | The Grey Mongoose |
| 10 | The Flooded Forest | Green anaconda | **Submerge**: in water only your eyes and nostrils show; prey comes to drink. Giant prey | fish, wading birds, capybaras and caimans (coil) | black caiman (lurker), a bigger anaconda (rival: anacondas eat each other) | The Jaguar |

### Bosses

Each boss has an attack to dodge and a moment when it's open to a strike. Three strikes (more in later chapters) drive it off; then grow to win. Each tests its chapter's ability.

| Chapter | Boss | Attack | Open moment |
|---|---|---|---|
| 1 | The Old Tomcat | Stalks, wiggles, pounces at your head | After a pounce that misses, it's off balance |
| 2 | The Red Fox | High "mousing" leap onto where you are | Play dead as it lands: it stops to sniff you |
| 3 | The Roadrunner | Dashes across the dunes and grabs at your tail | It skids to a stop after a dash; bury to make it miss |
| 4 | The Secretary Bird | Stamps red rings around you | Its foot is down after a stamp |
| 5 | The Crested Serpent Eagle | Perches on a tree crown, swoops | It lands on a crown after a miss; glide over to it |
| 6 | The Tiger Shark | Circles, then charges through the water | It turns slowly after a charge; on the cay you're safe but out of breath time |
| 7 | The Wild Boar | Paws and charges in a straight line | Dazed after it runs into a rock |
| 8 | The Badger | Digs up from its setts under you | While it's out of a sett; it's slow in the sun |
| 9 | The Grey Mongoose | Feints to draw your strike, then darts in to bite | Right after it feints; spread your hood to make it hesitate |
| 10 | The Jaguar | Prowls the banks, leaps into the water | When it bends down to drink at the bank, strike from under the water |

## Level structure

Each chapter has 10 levels on the same arc, so each new idea arrives on its own (after InkFish and InkGecko): every level has a goal and a twist, and the tenth is the boss.

| Level | Role | Twist |
|---|---|---|
| 1 | Meet the new snake and place | Plain: just grow |
| 2 | First enemy | The chapter's first enemy |
| 3 | The new ability | Taught on its own |
| 4 | Second enemy | The chapter's second enemy |
| 5 | Rush | Grow before the clock runs out, with lots to eat |
| 6 | Feast | Eat a number of one marked food |
| 7 | One life | A single hit ends the level, more enemies |
| 8 | Remix | Two twists at once |
| 9 | Lights out | Night: you only see round your head |
| 10 | Boss | The chapter's boss |

## Chapter 1: The Farm (free)

The corn snake: orange with red saddles edged in black, and a black-and-white chequered belly. Ground: a farmyard garden: vegetable rows, a corn crib, a hen coop, hay bales, a stone wall, cabbages and long grass for cover.

| # | Name | Goal | Twist / new |
|---|---|---|---|
| 1 | Corn Crib | Grow to 2× | Steering and eating (tutorial) |
| 2 | Crow's Feet | Grow | Crows peck your tail; strike to scare them |
| 3 | Rat Run | Grow | **Coil**: rats are too big to swallow |
| 4 | Hawk Shadow | Grow | A red-tailed hawk circles; hide under the cabbages |
| 5 | Mouse Rush | Rush, 75 s | Lots of mice and the clock |
| 6 | The Hen Coop | Feast: 6 eggs | Hens' eggs in the coop's nests, and the hen chases you off |
| 7 | One Bite | Grow | One life, with crows |
| 8 | Harvest Moon | Grow | Remix: hawk and crows, rats to coil |
| 9 | The Barn at Night | Grow | Lights out |
| 10 | The Old Tomcat | Boss | The farm cat stalks you |

## Daily levels

Today's Hunt is a free daily level, the same for everyone. Every day sets a new season, place, snake, rule, goal and layout, and events bring their own snakes. See [inksnake-daily.md](inksnake-daily.md), and [daily-playbook.md](daily-playbook.md) for the rules every game's daily shares.

## Controls

- **Pointer / touch:** the head turns towards your finger or the mouse. Tap, click, or Space to strike (a tap on touch; a click with the mouse).
- **Keyboard:** arrow keys or WASD steer (the head turns towards the direction held); Space strikes; the chapter's ability is on E (or its round button on touch).
- **Pause:** Esc, P or the ❚❚ button. **Sound:** M or ♪.

### Phone UI sizes

The owner's phone playtest (2026-11-18): "UI elements on the mobile screen should be bigger" and "the map can be zoomed in". The numbers live in `src/scenes/uiSizes.ts`, and every screen uses them. `test/uiSizes.test.ts` checks them at 360×640, 390×844 and 844×390. A phone is any screen whose short side is under 500 css px. Desktop layouts don't change.

| What | Minimum on a phone | Source |
|---|---|---|
| Touch target | 44 × 44 css px | Apple HIG (44 pt), WCAG 2.5.5 (44 px, AAA); Material asks 48 dp, WCAG 2.5.8 at least 24 px (AA) |
| Gap between targets | 8 css px | Material (8 dp) |
| Body text | 18 css px | The usual mobile floor is 16 px. Caveat's small x-height needs 2 px more |
| Secondary text (captions) | 14 css px | The usual floor is 12–14 px, plus Caveat's 2 px |

- **Interface scale:** phones lay the HUD and cards out for a 420-unit short side (0.86 at 360 px, never under 0.8). Before, they drew at the laptop design's 0.55.
- **Cards** fill the phone's width. Text and buttons are raised to the minimums at the size the card actually draws. A daily card taller than the screen scrolls (drag or wheel) rather than drawing smaller than 0.72 css px per unit.
- **Phones keep only the essentials:** the album shows 3 snakes a page in one column, the calendar drops the milestone number inside its rosette, and a phone on its side drops the before-hunt card's board picture.
- **Map:** zoom 0.8 or more on phones. Nests are then 48 css px and names 18 px. The map pans sideways too, centred on the current level and clamped to the plan's 760-px width. A tap on a nest still opens its card.

## The map

A vertical scroll as in InkGecko: a field guide's route map that climbs from the farm (chapter 1) to the flooded forest (chapter 10), a pocket for each level along a winding snake track. Chapters not built yet are pencil drafts; the full game's chapters are painted but locked until bought.

The daily hunt isn't on the trail. It's a painted calendar page fixed on the right (`scenes/map/dailyButton.ts`): today's month on a plum header (no nest uses plum), the day big, the day's snake in the corner and "Daily hunt" under it. On phones it sits low on the right rail above the Snake button, 64 css px or more; on a laptop it sits under the bar. While today is unplayed it has a red dot and pulses gently every few seconds; once played it shows a green check. Christmas days get a candy-cane corner, other events a red star. A tap opens the card before the hunt: the date, place, snake, rule, "New hunt in …", Hunt!, Calendar, Album and Map. The top bar shows only the chapter and its progress.

## Art

The house ballpoint notebook style (blue ink lines, watercolour washes, paper), painterly rather than doodled (see [art-pipeline.md](art-pipeline.md)). Seen from above.

- **The snake:** a tube drawn along the body's path every frame from baked pieces: a head sprite (eyes, nostrils, the species' head scales), a patterned body strip that repeats along the length (saddles, bands, blotches), and a tail tip. Lumps swell the tube. The tongue flicks.
- **Prey and enemies:** baked sprites in the line-boil frames, seen from above, with a few walking poses.
- **Boards:** each place painted once per level onto a board texture, with cover and obstacles drawn on top so the snake passes under the cover.

### Border, surround and phone camera

From the owner's playtest (2026-11-18): players couldn't see where the board ended, because the ground past the edge was a mirrored copy of the board, and on phones the snake was about 11 css px wide.

- **Border** (`src/art/rim/`): every place has its own wall along the board's edge, where the head already stops. The farm has a post-and-rail fence. The Barrens have fallen pine logs with a stump at each corner. The dunes have a boulder ridge. The savanna has a thorn boma. The rainforest has buttress trunks with lianas. The reef has a coral crest. The mountains have a two-row rock wall. The heath has a dry-stone wall with gorse. The jungle has a bamboo thicket. The flooded forest has a root tangle between drowned trunks. The wall's centre line is 9 px outside the edge, so its inner face meets the edge. It is painted into four strips at ART_RES (each 34 px outside the edge to 8 px inside), in two small textures of 2056×168 and 168×1048 px. A soft shade band under each wall gives it weight. In winter (on the farm, Barrens, mountains and heath) the pieces get snow caps. The whole-board view keeps 20 px of wall on screen past each edge.
- **Surround** (`bakeSurround`, after InkGecko's): it reaches 240 px past the left and right edges and 150 px past the top and bottom, at 1 texture px per board px (1440×840, about 4.8 MB). It is the place's own ground painted once more, with no solids, cover, nests or zones, scaled about 1.56× so one painting covers the whole ring. In winter it gets the snow look. On top go up to 14 solids and 12 cover patches, using the level's own looks (or the place's), placed at least 46 px off the edges. The layout is seeded by the level's id, so it is the same on every retry. A wash fades it to paper (0.24 halfway out, 0.9 at the far edge), and paper lies beyond. It is never mirrored.
- **Phone camera** (`src/scenes/game/followCam.ts`): a screen whose short side is under 600 css px gets a follow camera. Zoom shows the body at least 18 css px wide, but never less than 55% of the board's short side, and never further out than the whole board. On a 390×844 phone with a 15-px snake, that is 1.2 css px per board px, showing about 60% × 73% of the board. The camera looks ahead 22% of the view's short side in the heading, catches up at rate 5/s and swings its look-ahead at 2.4/s. It is clamped to 64 px past the board's edges, so the wall and a strip of the place show but never paper. A finger held down keeps steering as the camera moves under it. Red arrows at the screen's edge (20 px in, 64 px from the top and bottom on an upright phone) point at enemies, bosses and rival snakes out of sight. Desktops and tablets keep the whole-board view.

## Sound

Synthesized, as in the other games: a dry slither that follows speed, a strike hiss, a gulp pitched by the meal's size, a squeeze creak, a knot thud, a hawk's cry before its dive, a crow's caw, a cat's growl, and a bed for each place (farm birdsong and hens by day, crickets at night).

## Building a chapter

Each chapter lives in its own files and plugs into registries, so chapters can be built side by side without touching shared code. Chapter 2 (the Pine Barrens) is the worked example.

| Part | File(s) | What it holds |
|---|---|---|
| Rules | `src/logic/chapters/<place>.ts` (+ `<place>*.ts`) | `ChapterRules`: its prey kinds, enemy kinds (made from the shared kinds), its boss, first-time hints, and how its ways of losing a life are worded |
| Ability | `src/logic/abilities/<snake>.ts` | The snake's ability (`AbilityMaker`), already registered: it may hold the snake still, cloak it (`dead`, `buried`, `submerged`, `air`), scale its speed and turning, keep a meter, scare or freeze enemies |
| Levels | `src/level/chapter<n>.ts` | Ten levels on the design's arc (served to owners only: never imported by client code) |
| Art | `src/art/chapters/<place>.ts` (+ `<place>*.ts`) | `ChapterArt`: its snake, its boards, its critters with their poses, rival snakes, and an optional layer of its own (`view`) |
| Bot | `test/bots/<place>.ts` | The test bot's habits for its ability and enemies |

The shared enemy kinds (`src/logic/enemies/`): `Diver` (birds of prey), `Pecker` (tail nippers), `Chaser` (ground hunters), `Stomper` (red-ring stamps and stabs), `Lurker` (waiting in water), `Charger` (lanes across the board: stampedes, rockfall, fire), `Drifter` (stinging jellies) and `RivalSnake`. Each is configured by a spec; bosses are their own classes. Ground that changes the rules is a level's `zones` (`water`, `land`, `sand`, `tree`, `sun`, `grass`). Venom (a strike on prey too big to swallow puts it to sleep) and coiling are core rules, chosen by the snake's `big`.

`test/chapters.test.ts` checks every `chapter<n>.ts` it finds: ten levels, the validator, the starts, and that the bot can win every level.
