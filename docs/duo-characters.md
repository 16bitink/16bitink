# Gameplay duo characters

Two cartoon animal co-hosts who sit in the corner of gameplay videos, play, bicker, react to what happens on screen and tell stories (premises taken from Reddit, rewritten in the characters' voices, never copied). Research and the format's rules are in the 2026-11-16 notes below.

**Chosen for the pilot (2026-11-16): Gus & Pip.** Nib & Clem and Bub & Otto are kept for later (a second series, a guest episode, another game's channel).

## Shared style

Every character is drawn in the same style, so any pair can appear together later:

> Medium: professional pen-and-ink illustration with watercolour washes, deliberate varied line weight, cross-hatched shadows, soft wash colour, like a finished storybook painting, not a doodle or a flat vector. Background: plain warm cream paper, no scenery, no text. Chest up, three-quarter view, clear readable silhouettes, expressive faces, evenly lit. No words, no logos, no frame, no watermark.

Model: `gpt-image-2.5-sunburst` (ElevenLabs), 16:9, 1K, high quality, about 190 credits per image. ElevenLabs flow: "16bit.ink gameplay duo – character test" (`sQcSR5Y5m7SI3wb3JaMX`).

Concept images: `docs/duo/concepts/<pair>-<1..4>.webp`. Full-size PNGs are in the git-ignored `promo/duo/concepts/`.

## Pair 1: Gus & Pip (chosen)

| | Gus | Pip |
|---|---|---|
| Animal | Herring gull | Pufferfish |
| Role | The player | The backseat gamer |
| Look | White head, grey wings, yellow beak with a red spot, one feather sticking up, an empty beak (no chip or fry: removed 2026-11-17) | Small, round, sandy yellow with brown spots and tiny spines, big anxious eyes |
| Personality | Loud, cocky, greedy, bad at the game and sure he's great; cheers every swallow. **Strong, fearless and chill: never scared, never nervous** (see the rule below) | Anxious know-it-all; carries the channel's real (fact-checked) facts; horrified by swallows because he's a fish |
| Stories | Seaside thefts from the gull's side ("this guy on the pier thinks his chips are safe…") | Aquarium and diving stories from the fish's side ("my human put a plastic castle in my tank and called it enrichment") |
| Running gags | Eyes Pip as a snack ("Gus. I'm POISONOUS."); confidently wrong animal facts that Pip corrects on screen (rage bait in character, never an uncorrected false fact) | Puffs up when scared: the reaction picture, readable with the sound off |
| Voice (proposed, not designed yet) | Raspy, fast, cheeky, high energy | Higher, quick, nervous, fast nerdy asides |

**Gus is never scared (owner, 2026-11-17).** He should look strong, fearless and chill, as his voice already sounds. The fear in the pair belongs to Pip. When drawing, posing or re-recording, don't give Gus scared, nervous or panicked reactions: no sweat drops, no grimaces, no wide frightened eyes, no gulping in fear. When something goes wrong in the game he reacts with a shrug, an eye-roll, a smirk, anger or "bring it on", never fear. Don't put a chip or fry in his beak either.

Best concept: `gus-pip-1`. Fixes for the production art: a generic controller (the concepts look like PlayStation pads), transparent background, and **Pip is not puffed by default** (the owner, 2026-11-16): a normal slim pufferfish, spines lying flat, who puffs up only when Pip senses danger.

## Pair 2: Nib & Clem (kept)

| | Nib | Clem |
|---|---|---|
| Animal | Young raccoon explorer (InkPin's hero) | Old grumpy red rock crab |
| Role | The chaotic player | The deadpan watcher |
| Look | Grey fur, black mask, ringed tail, worn leather satchel, brass compass on a cord | Weathered shell with barnacles, one claw much bigger, tiny reading glasses on his eye stalks |
| Personality | Excited, loud, grabs every shiny thing | Unimpressed, dry one-liners |

Notes: the most polished concepts and the best single expression (Nib's open-mouthed glee, `nib-clem-1`). At corner size Clem reads as just a claw: his face hides behind it, so redraw him with the claw lowered and bigger eyes. Ties into InkPin (cross-promotion), but this Nib is a new painted look, not the in-game code-drawn Nib.

## Pair 3: Bub & Otto (kept)

| | Bub | Otto |
|---|---|---|
| Animal | Chubby orange goldfish in a round bowl | Dusky purple-red octopus with a monocle |
| Role | The player | The smug genius who steals the controller |
| Personality | Sweet, blank, forgets what he was saying (the "3-second memory" myth is a running gag Otto debunks) | Smug, explains everything, sneaks a tentacle onto the controller |

Notes: reads best at small size (orange against purple stands out on any gameplay, and the bowl frames Bub). Cute rather than funny, with less built-in friction than Gus & Pip. The "upside-down controller" gag didn't come through; the tentacle grab did (`bub-otto-1`, `bub-otto-4`).

## Making an episode (since 2026-11-16)

The tool is `apps/web/scripts/duo/`: `render.py` (9:16) and `render_long.py` (16:9), `lipsync.py`, `build_art.py`, the cut-out expressions and mouth sets in `art/`, Luckiest Guy in `fonts/`, and one set of files per episode in `episodes/`. No API beyond ElevenLabs.

- **Art.** Each expression is a cut-out PNG in `art/` (`<who>-<pose>.png`), aligned bottom-centre on one canvas per character, so switching poses never jumps. `build_art.py` makes them from generated 4 × 2 sheets on cream paper (1280 × 720, gpt-image-2.5-sunburst edits of an earlier sheet): it floods the paper from each panel's border and scales the figure to the existing neutral pose.
  - Gus: neutral, talk, laugh, smug, angry, hungry, point, think, sad, cheer, scheme, eyeroll, facepalm, chill, shrug, bring-it. The scared poses (shock, nervous, gulp) were retired on 2026-11-17 and moved to `art/retired/`; don't use them.
  - Pip (16): neutral, talk, laugh, horror, suspicious, relief, puff-scared, puff-angry, cry, actually ("well actually", fin raised), eyeroll, excited, disgust, nervous, facepalm, think. Only the two puff poses are puffed.
  - Mouth sets (lip sync), `art/mouth/<who>-<pose>-<key>.png`: Gus talk, angry and laugh; Pip talk, horror and puff-scared. Each set is one sheet made by tiling the pose 8 times and asking the edit for a mouth chart: A closed (M B P), B barely open, C half open, D wide, E "oh", F "oo", a blink and a half-blink. `build_art.py mouths` keeps panel A as the body, aligns every other panel to it and pastes only the mouth box (or the eye box for the blinks), so the body never jitters. The model sometimes draws panels out of order: check the panels before building a set. A pose must be final before its mouth set is made: the Gus sets were redrawn on 2026-11-17 after the fry came out of his beak. Two takes per sheet are enough (433 credits each).
- **Lip sync and blinks** (`lipsync.py`, no outside tool). The mouth shape comes from the spelling of the word being said (Scribe word timings: m/b/p shut, o/ow round, oo/w small, a wide, e/i half); the voice loudness decides when the mouth shuts and how wide it opens; shapes lead the sound by one frame and none is held for a single frame. A line lip-syncs when its `pose` has a mouth set; any other pose falls back to the old open/shut swap between `pose` and `rest`. Blinks come every 2.4–5.4 s on poses that have a set, whenever the mouth is shut.
- **Voices (for now, library voices):** Gus = *Andy – Rough, War Character, London, Cockney* (`kVBPcEMsUF1nsAO1oNWw`), Pip = *Nelson – Awkward Nerd Character* (`EaX6rnyDKjJx35tchi80`), both on eleven_v4. Designed custom voices can replace them later.
- **Steps.** (1) The owner records a level (1920 × 1080). (2) Find the events at 0.25 s steps (growth, combos, a big eat, a leap, the end card). (3) Write one ElevenLabs take per line with mood tags; the story is interrupted by the events and ends on a cliffhanger over the end card. (4) Trim silences, shorten pauses to 0.18 s and speed up 1.12×, lay the lines on the event times (`episodes/epN-timeline.json`: who, start, end, pose while talking (one with a mouth set, so it lip-syncs), pose at rest, the other host's reaction; vary all three line by line) and mix one voice track. (5) Transcribe that track with Scribe for word timings (`epN-words.json`; it also proves no tag was read aloud). (6) Track the player (blue pixels, smoothed; the game camera keeps the player near the centre) into `epN-track.json`. (7) `python3 apps/web/scripts/duo/render.py apps/web/scripts/duo/episodes/epN.json` (`--stills 0.5,15,49 <dir>` for check frames first).
- **Layout (9:16).** The hosts sit in a dark ink-blue "cam" panel at the top (y 0–640). The captions sit on the seam (baseline y 770), coloured by speaker as each word is said (Gus gold, Pip aqua). The gameplay fills the rest at 2× zoom with the player at y ≈ 1000, and "InkFish · 16bit.ink" sits at y 1220. The speaker grows a little, bobs with the loudness and opens their mouth by loudness. Pip's puff poses pop in. Game sound plays under the voices, ducked; the mix is −15 LUFS with peaks at −3.8 dB.
- **Episode 1** (`promo/inkfish-duo-ep1.mp4`, 58.8 s): InkFish level 1, "the Great Chip Heist", part 1. It ends on "…looks me DEAD in the eye… and—" / "AND?!" / "PART 2?". Known gap: Pip's "that striped one" plays while the striped fish is outside the crop.
