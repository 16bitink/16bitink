# Long-form #9: "How Long You'd Last at Every Size in the Ocean"

**Status:** plan, 2026-11-15. Facts are being collected in `research.md`. Numbers marked *(research)* are placeholders until that file confirms them. Next: script → fact-check by a separate agent → voice → build.

You are turned into a sea fish, and you climb the size ladder from a 0.2 in larva to a 100 ft blue whale. At every size the narrator gives **your forecast**: how long a fish that size lasts before something eats it, worked out from real measurements of how fast fish die at each body size. It ends on two twists. The size where the ocean nearly stops hunting you is your own. And at the top, the predator that came closest to wiping out the biggest animal ever isn't an ocean animal.

- **Format:** 1920×1080, 30 fps, not looping. **Target 10:00** (~1,600 words plus silent beats before each forecast), twice our longest. The 2026-11-15 export shows retention share doesn't drop with length (27–37% from 2:20 to 5:45), and the videos in this niche that pass 1M run 17–20 min.
- **Voice:** the locked narrator, *Mark – Natural Conversations* (`UgBBYS2sOqTuMpoF3BR0`, `eleven_v4`), one take per section first (the shorts showed four takes mostly waste credit). Directed as in "Directing the voice" in `docs/shorts-playbook.md`: a new mood every sentence, "!" and "…", one aside per step.
- **Sound:** a stopwatch tick under every step that slows as you grow; a stamp thump on each forecast; gulps from the game; a bed that deepens with size; silence before each forecast and before the two twists.
- **Captions:** an `.srt` from the word timings, uploaded as CC.

## Why this shape

- **#2's size ladder** is the only long video with real reach: 268K impressions, 30.6K views, 7.75% CTR (export of 2026-11-15). This is the same climb, so `foodchain/`'s log-space zoom (`climb.ts`), schools (`field.ts`) and drawings (copepod, anchovy, mackerel, bluefin, orca) carry over.
- **The prehistoric-ocean trend's engine:** "you" as the viewer, a survival verdict at every step, and danger that changes at every step. *How Long You'd Last in Every Prehistoric Ocean* (BeyondTheBlue) got 3.7M and *…Every Prehistoric Era* (Fossil) 12.9M. The title shares their first four words, so we sit next to them in suggestions and autocomplete ("how long you'd last" completes to both). The trend itself is farmed; this ladder isn't (no "at every size" video found, 2026-11-15).
- **"Why" beats "what":** one rule runs the whole way up and is the reason behind every forecast. **The rule of ten:** every time you get 10 times heavier, your yearly odds of dying fall by about half (Lorenzen 1996, *(research)*). It's planted at step 2, named at step 4 and paid off at the top.
- **The open loop of #8 at every step:** "how long do you last at this size?" stays open until the stamp lands. Viewers guess before each one.
- **InkFish's own premise:** start small, eat, grow, survive. The game mention lands naturally after step 3: "that's the whole game".
- **Emotional route:** panic (days to live) → dark laugh (everyone eats you) → hope (a bait ball, safety in numbers… no) → the rule (a reason) → confidence (tuna) → the pivot (you, at your own size: the ocean barely notices you) → shock (the great white gets eaten) → awe (the blue whale) → the second twist (whaling) → warmth (they're coming back) → the question.
- **Arguable lines (comment test, never false facts):** "A fish your size has a forecast of N years. You have a forecast of… lunch break. Because you can't swim." / "The great white isn't the top of the ocean. It's the snack of the top." / "The safest size in the ocean… is yours. Just don't go in."
- **Pinned comment (a question anyone can answer):** *"Which size would you pick to be, and why? 🐟"*

## The ladder (numbers from `research.md`, round 1)

**The forecast** comes from Lorenzen (1996, *J. Fish Biology* 49:627–642, doi:10.1111/j.1095-8649.1996.tb00060.x): natural mortality M = 3.00 W^-0.288 a year, W the fish's weight in grams. Two readouts per step: **"half of fish your size are gone in…"** (median, ln2/M) and **"chance you see next year"** (e^-M). It's an average over many fish, lakes and rivers included (the sea-only exponent, −0.305, gives nearly the same numbers), so its evidence tag is **MODEL**. The larva and everything above a few kg are **extrapolations**: say so on screen ("the model, stretched").

| Step | Size · weight | You are… | Who eats you | Half gone in | Next year | Mood |
|---|---|---|---|---|---|---|
| Open | — | the preview: a blue whale and a pack of orcas, then "but first…" a 0.2 in larva | | | | dread → hook |
| 1 | 0.2 in (5 mm) · 0.001 g | a fish larva, one of millions | jellyfish, copepods, anchovies: everything. Houde 1989 measured larvae losing 1–50% a day (22 species) | **12 days** (extrapolated; inside Houde's range) | **3 in 10 billion** | panic |
| 2 | 1 in (2.5 cm) · 0.3 g | a baby anchovy | *(round 2)* | **60 days** | **1.4%** | dark laugh |
| 3 | 4 in (10 cm) · 10 g (0.35 oz) | a sardine in a bait ball | *(round 2: dolphins, gannets, tuna)* | **5 months** | **21%** | hope → no |
| — | | **game mention**: start small, eat, grow. "That's InkFish." | | | | |
| 4 | 1 ft (30 cm) · 300 g (0.66 lb) | a mackerel | *(round 2: bluefin tuna)* | **1.2 years**; **the rule of ten is named** (10^-0.288 = 0.515) | **56%** | relief |
| 5 | 3 ft (1 m) · 10 kg (22 lb) | a tuna | *(round 2: mako, orcas)* | **3.3 years** | **81%** | confidence |
| 6 | 6 ft (1.8 m) · 80 kg (176 lb) | **you, at your real size** | a fish your size: 6 years, 89%. Real life: 9 people killed by sharks worldwide in 2025 (65 unprovoked bites; ISAF), against about 300,000 drowned a year (WHO) | **twist 1**: the ocean barely hunts you | | pivot, laugh |
| 7 | 15 ft (4.6 m) · 1,000 kg (2,200 lb) | a great white | a pod of five orcas filmed killing one (Towner et al. 2022, *Ecology*, doi:10.1002/ecy.3875); real great whites live decades (a 73-year-old male, Hamady et al. 2014) | **12 years** (model) | **94.5%** | shock |
| 8 | up to 100 ft (30 m) · 100 t | a blue whale | ~14 orcas killed an adult (likely 60–72 ft) off Western Australia on 16 March 2019 (Totterdell et al. 2022, *Marine Mammal Science*, doi:10.1111/mms.12906) | **47 years** (extrapolated) | **98.5%** | awe |
| Twist 2 | | whaling: Antarctic blue whales fell from ~239,000 to about **360 in 1973**; 1,700 in 1996 (Branch et al. 2004). The 20th-century blue whale total (~360,000) needs round 2 | | | | gut punch → warmth |
| Close | | the rule, the question, the game | | | | |

**Corrections from the research (2026-11-15):**
- The filmed lone-orca kill (2023) was an 8 ft (2.5 m) juvenile great white. Never show a lone orca killing a 15 ft shark: use "a pack of orcas, filmed".
- The 2019 blue whale was about 60–72 ft (18–22 m), not 100 ft. 100 ft is the species' top size, so the step is "up to 100 ft".
- The great white's 12 years is the model's average for a fish that heavy, not its lifespan. Say so on screen.
- Skip the "1-10-1" cold-water rule: it's disputed.

## Script plan (~1,600 words)

| Section | Time | Words | Beats |
|---|---|---|---|
| 1 · Cold open | 0:00–0:35 | 90 | Frame 1: a 100 ft blue whale's eye, a pack of orcas circling; "YOUR FORECAST: ?" Then "you are this" and the zoom slams down to a 0.2 in larva. Promise: every forecast is calculated from real measurements, scaled to each size. Two loops: "at one size the ocean nearly stops hunting you, and it's not the biggest" and "at the top, the thing that nearly wiped you out isn't even an ocean animal". |
| 2 · Step 1 larva | 0:35–1:35 | 160 | The cloud of larvae; a jellyfish, a copepod and an anchovy each take one; the stopwatch runs fast; forecast stamp in days. |
| 3 · Step 2, 1 in | 1:35–2:35 | 160 | The rule of ten is **planted**: "you got 300 times heavier, and your odds already changed. Hold onto that." |
| 4 · Step 3, sardine | 2:35–3:45 | 180 | The bait ball forms (hope), then tuna, dolphins and gannets hit it from three sides (no). Forecast: months. |
| 5 · Game mention | 3:45–4:05 | 50 | The InkFish card (`bitecomp/gameCard.ts`): "start small, eat, grow. That's the whole game." Re-hook straight after: "and at the next size, something changes." |
| 6 · Step 4, mackerel | 4:05–5:05 | 170 | **The rule of ten** on screen: a ×10 weight arrow and a ×½ odds arrow. |
| 7 · Step 5, tuna | 5:05–6:00 | 150 | Fast, warm-blooded, confident; a mako as the threat. |
| 8 · Step 6, you | 6:00–7:15 | 200 | **Twist 1.** The equation's forecast for a fish your size, then the real numbers: shark deaths a year vs drowning a year. "The safest size in the ocean… is yours. Just don't go in." Re-hook: "but it doesn't keep getting safer". |
| 9 · Step 7, great white | 7:15–8:15 | 160 | The Jaws fish, then orcas (the liver; art from `orcaliver/`). "Not the top. The snack of the top." |
| 10 · Step 8, blue whale | 8:15–9:00 | 120 | Awe; the 2019 orca kill. |
| 11 · Twist 2 + close | 9:00–10:00 | 160 | Whaling: the count, the low, the recovery. The rule of ten one last time, the question, the game pitch; end abruptly, end card 5 s. |

Re-hooks land at about 1:35, 3:45, 6:00, 7:15 and 9:00 (one every 60–90 s, per the playbook).

## Packaging

### Title (test 1 against 2)

1. **How Long You'd Last at Every Size in the Ocean**: the trend's first four words (autocomplete, suggested) plus our own angle.
2. **How Long You'd Survive at Every Size in the Ocean… Every Number Is Real**: our "every … is real" tag from #2, #4, #6 and #7.

### Thumbnails (Test & Compare takes three; Luckiest Guy captions, write X not ×)

| | Concept | Text |
|---|---|---|
| **A · Two ends** | Split: left, a tiny larva on a giant stopwatch; right, a blue whale's eye cropped by the frame. Red divider. | **3 DAYS** \| **90 YEARS** *(research)* |
| **B · You** | A giant red mouth cropped by the frame, a small bright fish in front of it with a fat yellow arrow labelled YOU. | **HOW LONG?** |
| **C · Ladder** | Five fish smallest to biggest on one line, each with a stopwatch tag, the biggest cut off by the frame. | **0.2 IN → 100 FT** |

## Picture

The climb from #2 (`foodchain/climb.ts`: each step zooms out in log space until the new fish fills about two-thirds of the frame), with three new readouts:

- **The YOU tag:** a fat yellow arrow labelled YOU, always on the hero fish. It moves to the next size at each step.
- **The forecast:** a stopwatch top-right that runs fast at the bottom of the ladder and slows as you grow. At each step a stamp lands: "YOUR FORECAST: 3 DAYS", with the evidence tag under it (MEASURED / ESTIMATED / MODEL).
- **The size and weight tag** bottom-left, in both units ("4 in · 10 cm · 0.35 oz · 10 g"), and a ruler that rescales.
- **The rule of ten** (from step 4): a small card, "×10 heavier → ×½ the risk", that ticks each time the weight passes a power of ten.

**Art:** from the game (`src/art/fish/species/`): anchovy, sardine, mackerel, tuna, mako, shark (great white), barracuda, mahi. From earlier promos: copepod, bluefin, orca (`foodchain/art/`), the orca liver scene (`orcaliver/`), blue whale (`bluewhale/`). New: a fish larva (big eyes, see-through body), a comb jelly or moon jelly, a gannet diving, a dolphin, the whaling-ship engraving for twist 2 (an ink etching, no harpoon gore: a ship, a tally, a chart line falling).

**No gore:** swallows and gulps only; the orcas' attacks are shown as a chase and a cut away, as in `orcaliver/`.
