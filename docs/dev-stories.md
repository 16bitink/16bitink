# Dev stories: the story behind each game

Shorts told by **Dewy** (the fennec fox who stands for the owner) about why and how each game was made. The goal is that viewers fall in love with the games through the person and the reason behind them. This file holds the rules for the format and every game's true story, split into short-sized pieces, so later batches can pick the unused ones.

Truth rule: every beat is the owner's real story or a fact-checked animal fact. Don't add details the owner didn't give (no ages, no names, no quotes he didn't say). When a piece needs a detail we don't have, it goes under "Ask the owner".

## Why the first four underperformed (#145–148, InkFish, 2026-11-27)

They were well made, but they broke the channel's own rules from `docs/shorts-playbook.md`:

1. **Wrong first audience.** YouTube tests every short on the people who already watch this channel: animal and ocean-predator fans. A laptop, code and a talking fox isn't what they came for. Off-topic shorts here open at 27–30% (space, InkMine) and 28.7% (Freud, people and history).
2. **Frame 1 was a stranger, not a hook.** "I built…" works for creators people already know. Nobody knows Dewy yet. Our best frame 1 is one big subject doing what the title says ("What works" #12, #15).
3. **The screen looked like a lesson.** Code, to-do lists, clocks and debug boxes read as a chart, and charts get swiped ("What works" #13).
4. **The stakes were the creator's, not the viewer's.** "One weekend", "playtester quit" and "a bug at 3 am" matter to game developers. The search tags ("i made a game", "devlog") compete with huge devlog channels for an audience that isn't ours.

## The new format (from #149, InkCrab)

1. **The animal first, the story second.** Open on the real animal moment the channel's viewers swipe for, then the family story is the twist ("…and that's why I built my son a game"). Every short still carries one fact-checked animal fact people want to share.
2. **A parent and a child, not "I made a game".** Building a game for your kid is a feeling anyone has had, on either side. The son appears as a small fennec kit (yellow bucket hat, striped tee, red spade), never with a name or an age.
3. **Frame 1 is a picture of the child's world**: the kit, the sand, the crab. No laptop, no UI. The game appears as the answer, around 50–60% of the way in, never as the opener.
4. **One open loop**: the first line raises a question the last line answers, and the last line runs into the first (the loop seam).
5. **Recurring characters build a returning audience.** Dewy and his son in every game's story, same faces, same voice. That's the channel's biggest gap ("We have no returning audience", playbook "What works" #11).
6. **Titles and tags are about the animal and the kid**, never "I": "My Son Loves Two Things, So I Made Him A Game 🦀". Tags start with the animal searches ("hermit crab", "where to find hermit crabs"), then the family ones, then the generic animal set.
7. **Pinned comment = an answerable question about the viewer's own life**: "Where did YOU find your first hermit crab?"

Success test: stayed to watch at 70%+ (the channel's breakout line). Compare each one with #145–148 in the next export and write the result in the playbook's results log.

## InkCrab (game #2): my son's two favourite things

**The owner's story (2026-11-27):** his son likes two things, hermit crabs and digging for treasure, so he built a game on what his son loves. You're a hermit crab digging for treasure, and for a hermit crab the treasure is a bigger shell. The first level is in the Maldives, the place where he and his son first discovered hermit crabs. Since then his son looks for places to find them.

**In the game, true:** you dig sand tiles to uncover buried shells and food (deeper is rarer); you must move into the next size of shell to grow; beach 1 is a Maldives coral island (seaplane, water villas, a dhoni, palms; `src/art/backdrop/atoll.ts`); 10 beaches, the last a night beach lit by glowing plankton (Moonlit Bay); smaller crabs follow you in a line and all trade up when you move house.

| # | Piece | Hook | Animal fact | Status |
|---|---|---|---|---|
| 1 | Two favourite things: crabs + treasure → the treasure is a bigger shell | "My son loves two things." | A hermit crab can't grow its own shell; it has to find a bigger one | Made, #149 (crabtreasure) |
| 2 | The Maldives: where we saw our first hermit crab, so it's level 1 | "This beach is where my son and I saw our first hermit crab." | Which crabs live there (fact-checked) | Made, #150 (crabmaldives) |
| 3 | Ever since, he looks for them wherever we go: how to find one | "Ever since, my son looks for hermit crabs wherever we go." | Where and when land hermit crabs come out | Made, #151 (crabnight) |
| 4 | Digging: crabs dig too | "Hermit crabs DIG." | Land hermit crabs bury themselves to molt | Made, #152 (crabdig) |
| 5 | The line of followers: a whole family trades up together | Vacancy chain told as "a line of crabs, biggest to smallest" | Vacancy chains (new angle needed: #30 already told it) | Unused |
| 6 | Shell fights: a bigger crab knocks a smaller one out ("rapping") | A crab knocking on another's door | Shell fighting | Unused, fact-check first |

**Ask the owner** (each could be the strongest piece of all):
- What did your son say or do the first time he played InkCrab? (The payoff the series is missing: the kid's reaction.)
- Did he help design anything (a shell, a beach, a rule)? Did he name anything?
- Has he found hermit crabs anywhere else since the Maldives? Where?
- Did he find "treasure" (a shell) in the Maldives? What did you do with it?

## Other games (to fill in)

- **InkFish**: the childhood remake, the weekend, the flying ducks, the playtester (#145–148, old format). A rerun in the new format would open on the swallow, not the laptop.
- **InkCrab, InkMine, InkGecko, InkHeroes, InkSnake, InkPin, InkTanks, InkBrick, InkRoad**: ask the owner for each game's "why".
