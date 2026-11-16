# How Long You'd Last at Every Size in the Ocean: research notes

Compiled 2026-11-15. Tags: MEASURED / ESTIMATED / REPORTED / MODEL. "Unverified" = could not be confirmed from a primary or near-primary source in this pass; do not put it in the script without a second check.
Method note: web search + page fetches; paper PDFs were mostly paywalled, so several details come from abstracts, reviews or press coverage (each is labelled).

## Summary table

Equation used: Lorenzen (1996) natural ecosystems, M = 3.00 W^-0.288 (W in grams, M per year). Median time to death = ln2 / M, mean = 1/M. This is TOTAL natural mortality (predation + disease + starvation), not predation only. It is a population average, not a forecast for one lucky or unlucky fish.

| Step | Size | Weight | M (per yr) | Survive 1 yr | Median life | Mean life | In equation's range? | Predator example (documented) | Key sources |
|---|---|---|---|---|---|---|---|---|---|
| Larva | 0.2 in (5 mm) | 0.001 g (0.00000220 lb) | 21.9 | about 3 in 10 billion | 11.5 days | 16.6 days | EXTRAPOLATION (below data; see Q1) | jellyfish / comb jellies (Purcell et al. 2014; other work) | Lorenzen 1996; Houde 1989 |
| Fry | 1 in (2.5 cm) | 0.3 g (0.0007 lb) | 4.24 | 1.4% | 60 days | 86 days | Probably in range (data rich below 10 cm, see Q1) | fish predators: stomach-content study NOT yet found | Lorenzen 1996 |
| Sardine | 4 in (10 cm) | 10 g (0.022 lb) | 1.55 | 21% | 164 days (5.4 mo) | 236 days | In range | bluefin tuna eat sardine/anchovy/herring (Portner et al. 2022; Logan et al. 2011) | Lorenzen 1996 |
| Mackerel | 1 ft (30 cm) | 300 g (0.66 lb) | 0.58 | 56% | 1.2 yr | 1.7 yr | In range | tuna, sharks (no size-matched meal confirmed) | Lorenzen 1996 |
| Tuna | 3 ft (0.9 m) | 10 kg (22 lb) | 0.211 | 81% | 3.3 yr | 4.7 yr | Likely upper edge / extrapolation (unverified) | sharks, orcas (no size-matched meal confirmed) | Lorenzen 1996 |
| You | 6 ft (1.8 m) | 80 kg (176 lb) | 0.116 | 89% | 6.0 yr | 8.6 yr | EXTRAPOLATION | tiger shark, great white, bull shark, orca | Lowe et al. 1996 (see Q3, Q4); ISAF |
| Great white | 15 ft (4.6 m) | 1,000 kg (2,205 lb) | 0.056 | 94.5% | 12.3 yr | 17.8 yr | EXTRAPOLATION | orcas (Towner et al. 2022; Towner et al. 2024) | Lorenzen 1996 |
| Blue whale | 100 ft (30 m) | 100,000 kg (220,000 lb) | 0.0149 | 98.5% | 46.5 yr | 67 yr | EXTRAPOLATION (far outside) | orcas (Totterdell et al. 2022) | Lorenzen 1996; Rocha 2014 |

Alternative ocean-only parameters (Lorenzen 1996, as reported in a 2024 stock-assessment paper, b = -0.305; the intercept 3.69 is from my memory, NOT confirmed): gives nearly the same results (larva median 8 d; 1 in 47 d; sardine 138 d; mackerel 390 d; tuna 3.1 yr; 80 kg 5.9 yr; great white 12.7 yr; blue whale 51.7 yr). So the story is robust to which version you cite.

Big caution for the script: the equation says a fish of a given weight is "average"; a big shark living 12 years median is NOT its real lifespan (great whites live decades, see Q5). The equation is about the death rate of wild fish, mostly estimated from stocks of fish up to tens of kg. Say "extrapolated" on every step from the tuna on.

## Q1. The spine: size-dependent natural mortality

### Lorenzen 1996 (CONFIRMED)
- Claim: In natural ecosystems (lakes, rivers, ocean pooled), a fish's yearly natural mortality falls as a power of body weight: M = 3.00 W^-0.288 per year, W in grams wet weight.
- Numbers: b = -0.288 (90% confidence limits -0.315 to -0.261); M at 1 g = 3.00 per year (90% CL 2.70 to 3.30). No significant differences between lakes, rivers and ocean. Aquaculture (ponds/cages/tanks) was steeper, b about -0.43.
- Source: Lorenzen, K. (1996). The relationship between body weight and natural mortality in juvenile and adult fish: a comparison of natural ecosystems and aquaculture. Journal of Fish Biology 49(4): 627-642. DOI 10.1111/j.1095-8649.1996.tb00060.x. Abstract text via SEDAR copy / GOV.UK DFID record (https://www.gov.uk/dfid-research-outputs/the-relationship-between-body-weight-and-natural-mortality-in-juvenile-and-adult-fish-a-comparison-of-natural-ecosystems-and-aquaculture). The equation "M = 3W^-0.288" is also printed in the NOAA review https://repository.library.noaa.gov/view/noaa/62714/noaa_62714_DS1.pdf (item T3.3.10).
- Correction: the page range is 627-642 (your note said 627-647).
- Tag: ESTIMATED (statistical fit to field estimates).
- Ocean-specific exponent: a 2024 assessment paper (https://arxiv.org/pdf/2407.04799) states "-0.305 is the value for ocean systems from Lorenzen (1996)". REPORTED second-hand.
- Weight range of the data: UNVERIFIED. I could not read the full paper. A 2022 Lorenzen et al. paper says the 1996 data include many observations for fish below 10 cm. Houde 1989 notes Peterson & Wroblewski (1984) covered 1e-5 to 1e3 g (via Morse 1989, second-hand). Treat 0.001 g as an extrapolation and anything above a few kg as an extrapolation until the paper is checked. Title says "juvenile and adult fish", so larvae are strictly out of scope.
- Share of mortality that is predation: UNVERIFIED as a number. What I can confirm: Lorenzen 1996 argues the aquaculture slopes show non-predation mortality scales MORE steeply with size than predation (so predation is the flatter part); a 2022 review says predation is "commonly viewed as a dominant extrinsic cause of mortality in fish". Safe script line: "most deaths in the wild are being eaten", flagged as widely held, not a measured percentage.

### Alternatives
- Peterson & Wroblewski (1984): Can. J. Fish. Aquat. Sci. 41(7): 1117-1120. A theory (biomass-size spectrum + bioenergetics), not a regression; predicts mortality of pelagic fishes from egg/larva to adult scales with exponent about -0.25 on weight, assuming mortality is mostly predation. Coefficient not confirmed (equation illegible in what I could read). Tag: MODEL.
- McGurk (1986): Mar. Ecol. Prog. Ser. 34: 227-242 (citation from memory, UNVERIFIED), compiles mortality of eggs/larvae/juveniles; its data are folded into Lorenzen's set (confirmed by a 2024 NOAA review). Houde (1989) cites both as noting very high egg/larva mortality.
- Conclusion: three sources agree on the exponent being around -0.25 to -0.3. Use Lorenzen for the numbers.

### The rule of ten (computed)
- 10^-0.288 = 0.515, so every 10x heavier, the yearly mortality rate drops to about 0.52 (about half). With the ocean exponent 10^-0.305 = 0.495. Tag: MODEL (follows from the equation).
- Plain version: "make a fish ten times heavier and its yearly death rate halves."

### Computation details (for fact-checkers)
M = 3.00 * W^-0.288; survival = e^-M; mean = 1/M; median = ln2/M. W: 0.001, 0.3, 10, 300, 10,000, 80,000, 1,000,000, 100,000,000 g gives M = 21.93, 4.243, 1.546, 0.5804, 0.2114, 0.1162, 0.0561, 0.0149.

## Q2. Fish larvae

- Claim: Feeding-stage marine fish larvae die at roughly 1% to 50% a day, depending on species and temperature.
- Numbers: instantaneous daily mortality Z = 0.01 to 0.69 per day across 22 species, "equivalent to 1-50% per day"; Z rises about 0.01 per degree C. (A typical mid-range value is not given in what I extracted; do not quote an average.)
- Source: Houde, E.D. (1989). Comparative growth, mortality, and energetics of marine fish larvae: temperature and implied latitudinal effects. Fishery Bulletin 87(3): 471-495. Read from the NOAA PDF https://spo.nmfs.noaa.gov/sites/default/files/pdf-content/1989/873/houde.pdf (I extracted the text and quoted the Mortality section).
- Tag: REPORTED/ESTIMATED (literature-derived field estimates).
- Consistency check: the Lorenzen extrapolation for a 0.001 g larva gives Z = 21.9/yr = 0.06 per day (median 11.5 days to death), which sits inside Houde's range (Z 0.01-0.69/d means median 1 to 69 days). (21.9/365 = 0.060 per day.) Rough agreement for a big extrapolation; tag MODEL.
- Larva "forecast" safe wording: "Per day, 1 to 50 out of every hundred larvae die; the equation's extrapolated median for a 5 mm larva is about 11 days." Median 11.5 days is a MODEL value; real range 1-69 days.
- Share surviving to juvenile: NOT confirmed in this pass. Bailey & Houde (1989, Adv. Mar. Biol. 25: 1-83, "Predation on eggs and larvae of marine fishes and the recruitment problem") and Houde 2002/2008 were not retrieved. Houde 2008 ("Emerging from Hjort's shadow", J. Northw. Atl. Fish. Sci. 41) is confirmed to exist and be about early-life survival and recruitment variability, but I found no quote of "<1% survive". Do not state a percent survival until checked. Fallback arithmetic from Houde: at Z = 0.1/day for 30 days, survival = e^-3 = 5% (MODEL, illustrative).
- Predator evidence (larva step): jellyfish and comb jellies eat fish larvae. Purcell et al. 2014, Mar. Ecol. Prog. Ser. 510: 201-213 (https://int-res.com/abstracts/meps/v510/p201-213): Pelagia noctiluca (Mediterranean) digests larvae in 2.5-3.0 h; ephyrae could consume 0-3.7% of larvae per hour at some stations. A conference slide (Purcell, PICES 2012) lists scyphomedusae (Chrysaora) and the ctenophore Mnemiopsis taking 10-54% of larvae in some systems (ambiguous labels; REPORTED, verify). Copepod predation on larvae and anchovy egg cannibalism: NOT found.

## Q3. One real predator per step (ocean)

Honest status: only the top three steps and the larva step have solid, citable predator events. The 1 in, 4 in, 1 ft and 3 ft steps need stomach-content papers that I did not find in this pass. Candidate lookups listed at the end.

| Step | Predator | Documented meal | Confidence |
|---|---|---|---|
| 0.2 in larva | Jellyfish / comb jellies | Larvae found in guts; digestion 2.5-3 h (Purcell 2014) | REPORTED; size of larva in the study not confirmed |
| 4 in sardine, 1 ft mackerel | Bluefin tuna | Atlantic bluefin eat sand lance, herring, mackerel (35.7% of stomachs in a Gulf of Maine study, herring 23.5%), menhaden; Pacific bluefin eat anchovy/sardine. Sources: Chase 2002 (Fishery Bulletin); Logan et al. 2011 (Marine Biology); Portner et al. 2022 (PLoS ONE). | REPORTED; per-fish lengths not extracted |
| 6 ft you | Tiger shark | In Hawaii (281 tiger sharks), human-sized prey appear from about 230 cm (7.5 ft) shark length; turtles in under 10-15% of stomachs. Lowe et al. 1996 (Environmental Biology of Fishes 47: 203-211, citation from search summary: re-check). | REPORTED, verify in primary |
| 15 ft great white | Orcas | See below | MEASURED (filmed) |
| 100 ft blue whale | Orcas | See below | MEASURED (filmed) |

### Orcas and great whites
- Towner et al. 2022: orcas killing white sharks off South Africa, filmed from a helicopter/drone; five orcas killed one white shark and probably three more; sharks left the area afterwards (only one white shark seen in the next 45 days). Published in Ecology (October 2022), DOI 10.1002/ecy.3875. Shark lengths NOT confirmed. REPORTED via press (phys.org / ScienceDaily / CBC). Location (Gansbaai vs Mossel Bay/Hartenbos) not settled in my sources.
- Single-orca kill: the orca "Starboard" killed a juvenile great white of about 2.5 m (8.2 ft) in under two minutes in Mossel Bay, June 2023, eating the liver; a second shark of 3.55 m (11.6 ft) found dead nearby. Published 2024, African Journal of Marine Science (Towner et al.). IMPORTANT: the filmed single kill is an 8 ft juvenile, NOT a 15 ft adult. Do not show a lone orca killing a 15 ft shark. Tag: MEASURED (published, filmed).
- So the honest 15 ft line: "a pod of orcas has been filmed killing great whites, and sharks flee the area for months."

### Orcas and blue whales
- Claim: Orcas have been documented killing blue whales off Western Australia: three events (two attacks on 2019, one in 2021); one adult, two calves/juveniles.
- Paper: Totterdell, J.A., et al. (2022). The first three records of killer whales (Orcinus orca) killing and eating blue whales (Balaenoptera musculus). Marine Mammal Science (published 21 Jan 2022). DOI 10.1111/mms.12906. Confirmed via Flinders University release (https://news.flinders.edu.au/blog/2022/02/01/first-records-of-orcas-hunting-largest-animals-on-earth/).
- Details: first event 16 March 2019 (Bremer sub-basin, 70 m / 230 ft deep water): about 14 orcas attacking when researchers arrived, about 50 orcas present afterwards feeding on the floating flesh; a calf was killed about two weeks later; a second calf/juvenile in 2021; at least 16 of the same orcas took part across events; the south-western Australia population is over 140 known animals.
- Length of the adult: NOT confirmed. Science News reported an estimated 18-22 m (59-72 ft); one other report said 72 ft; Live Science's "46 ft" refers to a smaller (juvenile) whale. So the killed adult was probably 60-70 ft, not 100 ft. The 100 ft figure is the species' maximum size. Tag: ESTIMATED, check paper.
- Duration of the attack: not confirmed.

## Q4. The human step

- ISAF = International Shark Attack File, Florida Museum (https://www.floridamuseum.ufl.edu/shark-attacks/yearly-worldwide-summary/ , the page I fetched covers 2025).
- 2025: 65 unprovoked bites worldwide, 9 fatal (12 shark-related deaths total including provoked). Five-year average (2020-2024): 61 bites and 8 fatal per year. A 10-year average of 72 bites per year is reported in news coverage of the 2025 report. MEASURED (global compilation; counts depend on reporting).
- 2024: 47 unprovoked bites, 4 fatal unprovoked (7 shark-related deaths total), 24 provoked bites. Source: ISAF 2024 report as summarised by Discover Wildlife / Down To Earth / EurekAlert (the 2024 numbers were not on the fetched 2025 page; verify against the ISAF 2024 PDF if needed).
- Long-run average of fatal unprovoked bites: depends on the window. ISAF-based summaries give about 6 per year (decade; 2024 report), 5 per year (2021 summary), and the 2020-2024 average is 8 (after high years). Safest: "about 5 to 8 a year in recent years". A "5.6 per year since 2000" figure appeared in one secondary source: unverified.
- WHO drowning: about 300,000 deaths per year worldwide (WHO fact sheet https://www.who.int/news-room/fact-sheets/detail/drowning, page dated 1 May 2026; the specific data year is not on the page, so check which year; older WHO figures were 236,000 for 2019, from memory, unverified here). Children under 5 are nearly a quarter; ages 0-29 are 57%. MEASURED/ESTIMATED (WHO estimate). Comparison: about 8 shark deaths vs about 300,000 drownings means roughly 1 shark death for every 37,000 drowning deaths (computed, MODEL).
- Cold water (1-10-1 rule): originated with Gordon Giesbrecht, Univ. of Manitoba: about 1 minute for cold-shock breathing, about 10 minutes of useful movement, about 1 hour before hypothermia unconsciousness. It is a memory aid, disputed by the National Center for Cold Water Safety (https://www.coldwatersafety.org/1-10-1-myth). Giesbrecht himself says hypothermia takes at least 30 minutes. Recommendation: skip it or say "minutes of useful movement, not hours", tag REPORTED, contested. Not clearly ocean-specific.
- What can eat a human-size animal: tiger sharks (Lowe et al. 1996, above), great whites and bull sharks (the ISAF-listed species; the species-level ISAF breakdown was not retrieved), and orcas have not been documented to hunt humans in the wild (do not claim otherwise; not researched).

## Q5. The twist at the top: whaling

- Industrial whaling 1900-1999: Rocha, R.C., Clapham, P.J. & Ivashchenko, Y.V. (2014). Emptying the oceans: a summary of industrial whaling catches in the 20th century. Marine Fisheries Review 76(4): 37-48. Open access https://spo.nmfs.noaa.gov/mfr764/mfr7643.pdf . Total nearly 2.9 million large whales (a lower bound); 2,053,956 in the Southern Hemisphere. Blue whales, Southern Hemisphere: about 363,648 (second-hand, from one citing source; verify in the paper's species table). Tag: REPORTED/ESTIMATED (catch records, with known under-reporting corrected for Soviet data).
- Antarctic blue whales: 345,775 killed 1904-1973 (NOAA document citing Branch et al.; second-hand, check) ESTIMATED.
- Branch, T.A., Matsuoka, K. & Miyashita, T. (2004). Evidence for increases in Antarctic blue whales based on Bayesian modelling. Marine Mammal Science 20(4): 726-754 (volume/pages from memory, DOI 10.1111/j.1748-7692.2004.tb01190.x per openpolar link). Confirmed numbers (abstract via UCT repository https://open.uct.ac.za/handle/11427/17262): pre-whaling about 239,000 (95% interval 202,000-311,000); low point 360 animals (150-840) in 1973 (about 0.15% of the original); 1996 estimate 1,700 (860-2,900), 0.7% of original; recovering about 7.3% a year (1.4-11.6%). A later survey-based estimate: 2,280 (Branch 2007, abstract via search; verify). Tag: MODEL (Bayesian population model).
- Blue whale lifespan: earplug (wax) layer counting; National Geographic gives average 80-90 years and the oldest found about 110 years (earplug counts from Japanese whaling; some sources say 114 for a fin whale). Second-hand; the original (Lockyer; Mackintosh & Wheeler 1929 for early work) not retrieved. A 2024 Frontiers in Marine Science paper warns earplug-age accuracy is not fully validated (bomb-radiocarbon supports it for fin whales). Tag: ESTIMATED. Safe line: "thought to live 80 to 90 years, possibly over 100".
- Great white lifespan: Hamady, L.L., Natanson, L.J., Skomal, G.B. & Thorrold, S.R. (2014). Vertebral bomb radiocarbon suggests extreme longevity in white sharks. PLoS ONE 9(1): e84006. DOI 10.1371/journal.pone.0084006. CONFIRMED: northwestern Atlantic; 4 females and 4 males; oldest male 73 years (fork length 493 cm = 16.2 ft), oldest female 40 years (526 cm = 17.3 ft). Band-pair counting alone gave much lower ages (6-35 yr female, 9-52 yr male; second-hand). Tag: ESTIMATED (8 sharks).
- Compare to the equation: median life for a 1,000 kg fish by the equation is 12 years; a great white's real life is up to about 70. The mismatch shows the equation is a crude average that includes juveniles; do not use as "a great white lives 12 years".

## Q6. Extras

- Ocean sunfish (Mola mola): up to about 300 million oocytes in one 1.4 m (4.5 ft) female (Pope et al. 2010, cited via PeerJ 9900). ESTIMATED. A stable population needs about 2 survivors per female for life: so about 2 in 300 million (1 in 150 million), arithmetic by me, MODEL (National Geographic quotes Selina Heppell on "very small chances of survival", no figure).
- Atlantic cod: sources vary from "up to 9 million eggs" to tens of millions per season; Darwin quoted "above three million and a half". No sourced survival rate found. The "fewer than 1 in a million" style claim is UNVERIFIED; the replacement-rate arithmetic (2 survivors per lifetime) is a defensible alternative framing and needs a published fecundity (FishBase, species page for Gadus morhua) before use.

## Not confirmed (do not script without a recheck)
1. Lorenzen 1996 data weight range and the percent of natural mortality that is predation.
2. Percent of larvae that survive to juvenile (Houde 2002 / Bailey & Houde 1989 not retrieved); also McGurk 1986 citation details.
3. Stomach-content meals for 1 in, 4 in (sardine as prey of specific size), 1 ft and 3 ft steps; barracuda, mahi, swordfish, mako, grouper, moray: not researched.
4. Length of the adult blue whale killed in 2019; duration of attack; which orca event is which length.
5. Shark lengths in Towner 2022 (Ecology); the paper's location.
6. Rocha 2014 blue whale total (363,648 is second-hand); Branch 2008 345,775 (second-hand).
7. Blue whale 110-year earplug record original source.
8. Cod/sunfish survival rates; WHO data year; ISAF long-run average window; 2024 ISAF numbers read from news copies, not the ISAF page itself.
9. Whether a 6 ft human is within any shark's documented prey: tiger shark claim is from a search summary of Lowe et al. 1996.

## Round 2

Status: three of four items resolved; the sized predator meals for 1 in and 1 ft and 3 ft are only partly found (predator named, prey size not from a source I could read). PDFs of the main papers were mostly not readable, so "prey size" is often missing. Nothing below should be treated as a sized meal unless it says so.

### R2.1 Predator meals, middle of the ladder

(a) 1 in larval/juvenile fish
- Comb jellies and jellyfish eat fish larvae: Purcell et al. 2014, Mar. Ecol. Prog. Ser. 510: 201-213 (https://int-res.com/abstracts/meps/v510/p201-213). Pelagia noctiluca digests larvae in 2.5-3.0 h; ephyrae take 0-3.7% of larvae per hour at some stations. Larva length not captured. REPORTED. No source found yet for a moon jelly, sardine/anchovy or seabird-chick meal of a 1 in fish. UNVERIFIED.

(b) 4 in sardine/anchovy
- KwaZulu-Natal sardine run, peer-reviewed predator named: O'Donoghue, S.H., Drapeau, L., Dudley, S.F.J. & Peddemors, V.M. (2010). The KwaZulu-Natal sardine run: shoal distribution in relation to nearshore environmental conditions, 1997-2007. African Journal of Marine Science 32(2): 293-307. Sardine presence nearshore was most closely associated with Cape gannets (Morus capensis), then sharks/game fish, then common dolphins (Delphinus capensis) (r2 = 0.48). A companion paper (O'Donoghue, Whittington, Dyer & Peddemors 2010, AJMS 32(2): 361-374) reports the main predators in 2005 were common dolphins and Cape gannets. Sources: https://ajol.info/index.php/ajms/article/view/60854 and the IRD records. REPORTED. Predators are confirmed; sardine length in the meal and the diet percentages are NOT confirmed. (Sardine total length not stated in what I read: do not put "4 in" on the screen as the documented prey size.)
- Bluefin tuna eat sardine/anchovy: Portner et al. 2022, PLoS ONE (Southern California Bight, 963 Pacific bluefin, 2008-2016; specialised on anchovy in 2015-2016). Prey length not extracted. REPORTED.

(c) 1 ft mackerel
- Atlantic bluefin: Chase, B.C. (2002). Differences in diet of Atlantic bluefin tuna at five seasonal feeding grounds on the New England continental shelf. Fishery Bulletin 100(2): 168-180 (https://spo.nmfs.noaa.gov/content/differences-diet-atlantic-bluefin-tuna-thunnus-thynnus-five-seasonal-feeding-grounds-new). Top prey by frequency/weight: sand lance, Atlantic herring, Atlantic mackerel, squid, bluefish. Mackerel eaten were age 0-1 (young of the year to 1 year, so likely below or near 1 ft, not an adult 1 ft fish) for all bluefin sizes; the largest prey were eaten only by giant tuna over about 230 cm (second-hand via ICCAT 2012). A Gulf of Maine study found mackerel in 35.7% of bluefin stomachs, herring in 23.5% (from my round-1 search; source not captured, UNVERIFIED). Tag: REPORTED. Exact mackerel lengths in cm: NOT retrieved.
- Mahi, gannet eating a 1 ft mackerel: not researched.

(d) 3 ft (1 m) tuna
- Orcas and bluefin tuna, Strait of Gibraltar: Esteban, R., et al. (2016). Dynamics of killer whale, bluefin tuna and human fisheries in the Strait of Gibraltar. Biological Conservation 194: 31-38, DOI 10.1016/j.biocon.2015.11.031. 39 orcas observed 1999-2011 in spring/summer; all hunted tuna actively, 18 also depredated the drop-line fishery. Survival 0.991 (interacting) vs 0.901 (non-interacting adults). REPORTED (abstract/listing only). Size of the tuna: NOT in what I read; these are mostly large bluefin (likely well above 3 ft), so this is a meal for the bigger tuna, not a 3 ft one. Do not say "3 ft".
- Shortfin mako: diets in a Portugal study were over 90% teleosts by weight with no clear prey-size selection; California Current makos (330 fish, 53-248 cm) ate mostly northern anchovy and Pacific sardine, tuna ranked lower; NW Atlantic makos ate lots of bluefish. REPORTED (from a search summary of the papers). A mako meal of a 3 ft tuna with a stomach-content size: NOT found. UNVERIFIED.
- Honest script position: the 3 ft tuna step has no single sourced sized meal yet. Use "sharks and orcas hunt bluefin" with Esteban 2016 and say nothing about the size.

### R2.2 Lorenzen 1996 data range and predation (secondary sources only)
- Weight range of the data: NOT found in any accessible source (checked: SEDAR/GOV.UK records, a 2022 Lorenzen et al. review manuscript https://repository.library.noaa.gov/view/noaa/65916/noaa_65916_DS1.pdf, which is Fisheries Research 2022 "Size- and age-dependent natural mortality in fish populations"). UNVERIFIED. What the secondary sources say: the Lorenzen 1996 data set includes McGurk's 1986 data, includes many fish below 10 cm, and was reanalysed with Gislason et al. (2010) data by Lorenzen et al. 2022. Gislason et al. 2010 (Fish and Fisheries 11: 149-158; citation from memory) not retrieved.
- Is predation named the main cause? The 2022 review says "Predation pressure is commonly viewed as a dominant extrinsic cause of mortality in fish populations" (REPORTED, a statement about general belief, not a measurement). The 1996 paper's own argument (via a secondary summary): the steeper aquaculture slope reflects non-predation mortality, which scales more steeply with size than predation. So predation is the flatter, less size-dependent part. No percent share found.
- Useful extra for the spine: the 2022 review says population-level mortality scales with LENGTH to the power of about -1 (M is "length-inverse", Lorenzen 2000; Lorenzen et al. 2022); with weight ~ length cubed that is a weight exponent of about -0.33, close to -0.288. It is a second route to the same "rule of ten": at -0.33, 10x heavier gives M x 0.47. Tag: MODEL/ESTIMATED.

### R2.3 Lowe et al. 1996 (CONFIRMED from the paper's abstract)
- Citation: Lowe, C.G., Wetherbee, B.M., Crow, G.L. & Tester, A.L. (1996). Ontogenetic dietary shifts and feeding behavior of the tiger shark, Galeocerdo cuvier, in Hawaiian waters. Environmental Biology of Fishes 47: 203-211, DOI 10.1007/BF00005044 (the first DOI I saw, 10.1023/A:1011021710183, belongs to another paper; ignore).
- Abstract (read from the PDF): stomach contents of 281 tiger sharks caught in Hawaii shark-control programs 1967-1969 and 1976; as sharks got bigger, prey diversity and the frequency of large prey increased; occurrence of teleosts and cephalopods fell, while elasmobranchs, turtles, land mammals, crustaceans and undigestible items rose; "Prey, similar in size to humans, begin to occur in the diet of tiger sharks approximately 230 cm TL, and therefore sharks of this size and larger may pose the greatest threat to humans."
- Not verbatim from the abstract: the "under 2.3 m TL" small class wording; the abstract says "small/medium/large" without the cutoff, but the 230 cm human-size-prey threshold is verbatim. Turtles under 10% (medium) and 15% (large) of stomachs came from a secondary summary. Tag: MEASURED (stomach contents). 230 cm = 7.5 ft.

### R2.4 Blue whale 20th-century total
- The ~360,000 figure is NOT confirmed from Rocha et al. 2014 itself (the paper PDF could not be downloaded as text; NOAA's feature page gives only the all-species total of about 3 million).
- A supportable figure from a published source: Branch et al. 2008 (as quoted in Pratt/2020 ESR paper https://doi.org/10.3354/esr01077, Endang. Species Res. 43: 359-373): in the Southern Hemisphere and northern Indian Ocean, 345,775 Antarctic blue whales and 13,022 pygmy blue whales were killed between 1904 and 1973. The sum is 358,797, i.e. about 360,000. The 2023 Journal of Heredity paper (https://doi.org/10.1093/jhered/esad048) also cites 345,775 Antarctic blue whales, and 2 million+ whales in the Southern Hemisphere in the 20th century (Rocha 2014). The earlier second-hand "363,648" for Rocha was not confirmed.
- Also confirmed: South Georgia alone, 41,525 blue whales of 175,250 whales killed over 61 years (Headland 1984 via the 2023 paper). Branch 2008 (Antarctic blue whale: 0.15% of the population survived, about 400 animals, per the 2023 paper).
- Script-safe wording: "about 360,000 blue whales were killed in the Southern Hemisphere between 1904 and 1973 (Branch et al. 2008)", not "in the 20th century (Rocha)". Tag: ESTIMATED/REPORTED (catch records). Branch 2008 full citation (Branch, T.A. et al. 2008) not retrieved: UNVERIFIED which journal.
- Lifespan note from the same 2023 paper: it states blue whales live "over 100 yr" (second-hand).
