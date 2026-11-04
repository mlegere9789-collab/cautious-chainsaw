# Gettysburg, Felt

### The definitive pitch: ten experiences, a twenty-fold Ask the Historian with no generative AI, ten feature overhauls, and the order to build them in

*Pitch only. Nothing here has been built, and nothing here changes the live site. Prepared 2026-09-30 for the site owner. This is the merge of three research-backed drafts (awe, scholarship, reach) after two independent review passes that grafted the strongest ideas together and cut every claim the research could not carry.*

---

## The vision

Gettysburg is the best-documented three days in American history, and the site that tells it still shows only half of what the record holds: where men stood, almost never how the day looked, sounded, weighed or cost, and never how anyone knows. This pitch hangs the whole record on the 675-tick clock the site already owns. A stranger scrubs to dusk on July 2 and watches a moon rise that a professor's thermometer and the Navy's tables can place to the minute; stands where Gardner stood and learns that the Library of Congress's own essay contradicts its own caption; reads a dispatch the minute it was stamped; finds a pipe listed beside a printed name; and sees that Confederate losses are not one number but a ladder of seven, with the reasons. A teacher gets a document-based lesson, a descendant gets a regiment and a place to stand, a visitor with no signal gets a pack that works in a glove box, and a historian gets a receipt for every line. Underneath is one promise, fidelity and not truth: every sentence the Historian shows is a verbatim, page-cited quotation, a template over a sourced fact row, or a stated limitation, checked by machine on every build, with disagreement displayed and no generative AI anywhere, so that a Historian twenty times larger is still one that cannot invent a word.

---

## Before anything is announced: the credibility gate

The research and the master plan name defects that would embarrass any scholarly, classroom or live feature. A teacher who finds one wrong clock stops using the site `[F:EDU-rights]`. Nothing below should be put in front of teachers, descendants, the press or the live July 1-3 mode until these close *(design intent)*:

- **The time model.** The plan measured a piecewise clock error averaging 4.8 hours, with tick 60 showing 9:55 on one page and 10:55 on the app `[F:EDU-rights]`. Five of the 33 time anchors still need a historian's decision `[F:ENG-rights]`.
- **Deep links and share cards.** Links other than `?ancestor=` are inert, and every shared `og:image` was found corrupt in the audit `[F:EDU-E19]` `[F:EXM-opp14]`. Sharing is a reach feature, so this is a reach defect.
- **The Historian printing "undefined"** in some answers `[F:EDU-rights]`.
- **A named historian reviewer.** The plan lists the lack of one as the main stall risk `[F:ACC-rights]`.
- **Counsel review** of the pre-1931 public-domain arithmetic, Busey and Martin-derived fields (facts only), and COPPA and FERPA exposure on a student-facing page `[F:COR-F19]` `[F:VIZ-rights]` `[F:EDU-E17]`.

A time-based feature built on a wrong clock is worse than no feature. The eight small wins that can ship inside this gate are in Part 4.

---

## Contents

1. **Part 1. Ten experiences that leave a stranger amazed** (a twenty-minute visit, then ten ideas)
2. **Part 2. Ask the Historian, twenty-fold, with no generative AI**
3. **Part 3. Ten existing features, overhauled**
4. **Part 4. What to do first, and in what order, for a solo owner**
5. **Part 5. Honest caveats: what must be verified, cleared, or left alone**
6. **The Standard of Care** (the page the whole site can publish)
7. **Appendix. Sources by theme, with confidence**
8. **Fact-check log** (what was corrected, downgraded, removed, confirmed, and could not be verified)

---

## The pitch at a glance

- **Part 1, ten experiences:** the sky and moon over the field; the physics of the guns nobody heard; the places Gardner's cameras stood; the dispatches pinned to the minute they were written; what was found in the pockets of the buried; the people who were already there; the front pages of the day; the ridge with the trees taken off; the casualty number shown as a range; and the long aftermath, from the Wolf farm hospital to the Address.
- **Part 2, a twenty-fold Ask the Historian:** 13,160 records and 221,760 indexed words are the floor, crossed in the first two waves; the real target is about 14,000-17,000 records, twelve question families and 17 build gates, with every sentence a quotation, a sourced template or a stated limitation, and no generative AI.
- **Part 3, ten feature overhauls:** the Master Clock, documented sound, a validated viewshed, honest AR, a silent Stop Companion with an offline pack, three honest casualty views, a band for the Living Ledger, Your Regiment Your Minute, the regimental dossier, and a no-account classroom kit.
- **Part 4, first moves for a solo owner:** close the credibility gate, then lead with The Number Is a Range, The Sky and the daily "This hour" card, alongside Wave 0 and Wave 1 of the Historian.
- **Part 5:** what must be verified, what must be cleared, what is unknown, and the 23 claims struck from the earlier drafts.

---

## How to read this pitch

**Citations.** The research came in twelve themes whose finding ids repeat (every theme has an F01), so each reference carries a theme prefix.

| Prefix | Research theme | Finding ids look like |
|---|---|---|
| `ENV` | Sensory and environmental reconstruction: weather, sun, moon, sound, smoke, smell | `ENV-F08` |
| `IMG` | Georeferenced imagery: July 1863 photographs, camera positions, maps, Cyclorama | `IMG-F08` |
| `PPL` | People: rosters, burials, civilians, what is legally reusable | `PPL-P10` |
| `COR` | Primary and period text corpora (Official Records, Fox, state books, newspapers) | `COR-F04` |
| `TER` | Terrain and the 1863 landscape: lidar, DEMs, Warren and Bachelder, viewsheds | `TER-T03` |
| `EXM` | Best-in-class interactive history and data journalism | `EXM-F05` |
| `ACC` | Total-accuracy question answering with no generative AI | `ACC-F03` |
| `SITE` | On-site and mobile visitor reality at the park | `SITE-OS09` |
| `EDU` | Education: standards, lesson structures, classroom technology | `EDU-E12` |
| `INC` | The inclusive history: Black community, civilians, women, immigrants, memory | `INC-IC10` |
| `VIZ` | Data visualization and sonification for scale and human cost | `VIZ-F01` |
| `ENG` | Engagement, return visits, partnerships, privacy-safe metrics | `ENG-E02` |

Forms: `[F:ENV-F08]` is one finding; `[F:ENV-F01,F02]` is two findings in the same theme; `[F:ENV-opp5]` is the fifth numbered opportunity in that theme's notes (`[F:VIZ-V3]` for the visualization theme's own V-numbers, `[F:ENG-opp01]` for ENG-01); `[F:TER-opp:atlas]` is an unnumbered opportunity by short name; `[F:ENV-rights]` is that theme's rights and risk notes; `[F:ENV-summary]` its summary; `[F:ENV-ex:VirtualPaulsCross]` a named exemplar. `[site]` marks the baseline numbers in the owner's brief: 658 Historian records, 11,088 indexed words, 675 five-minute ticks, 570 unit records, 467 regiments, 512 monuments, 543 commander fates.

**Three kinds of statement.** (1) A fact with a citation. (2) *(design intent)*: my proposal, including every "what you see" scene, every effort tier and every target I introduce. (3) **[MODEL]**, **[SPECULATIVE]** and *(est.)*: something computed or reasoned, not recorded; those flags would be on screen. An uncited sentence is never a claim about the world.

**The six evidence badges** *(design intent; they would appear on every card, every number and every answer, in one visible vocabulary)*:

| Badge | What it promises |
|---|---|
| **Documented** | A verbatim passage or a figure printed in a named source, with page and scan. |
| **Measured** | A reading by an instrument or an official return (Jacobs's thermometer). |
| **Computed** | Deterministic arithmetic from documented inputs (sun, moon, sound lag). Anyone can re-run it. |
| **Modelled** | A stated model with stated assumptions (heat index, ray fans, casualty timing). |
| **Contested** | Sources disagree. All values are shown, ranked, with reasons. |
| **Unknown** | No source in the corpus says. The site says so, and says what source would. |

The ladder is the one the best weather scholarship already uses: measured first, then computed, then reconstructed, then interpretive, with eyewitnesses disagreeing even on basics `[F:ENV-summary]`.

**Effort tiers** (the author's rough sizing for a solo owner, not commitments): **S** days to about 2 weeks; **M** about 2 to 6 weeks; **L** about 1 to 3 months; **XL** a quarter or more.

**Research honesty.** The shared search budget ran out mid-research (200 of 200); several authoritative hosts returned 403 or 404 to the fetcher (loc.gov HTML, HathiTrust reader pages, hmdb.org, Gilder Lehrman, parts of ABT and the NYT); and many numbers came through a summarizing fetcher that mislabelled at least one passage (Jacobs's "wet from the rain" line is dated Friday June 26, not July 1) `[F:ENV-F12]`. So every number and quote below needs a spot-check against the primary scan before it is published. Part 5 lists what must be verified, what is snippet-only, and the claims struck from the earlier drafts.

---

# PART 1. Ten experiences that leave a stranger amazed

Every best-in-class history experience in the research does the same three things. It **runs on one master clock**: Apollo in Real Time keys about 11,000 hours of audio, 2,000 photographs and 15,000 transcript lines to a single mission clock, can sync to the real anniversary, runs as static files on a CDN, and drew 1.1 million visitors from 224 countries `[F:EXM-F05]` `[F:ENG-E02]`. It **makes scale human with one small unit repeated**: the New York Times front page of 24 May 2020 was 1,000 one-phrase lives and nothing else `[F:EXM-F04]`. And it **shows its doubt**: Mapping the Republic of Letters led with the fact that only about 12% of Voltaire's letters could be mapped `[F:EXM-F10]`.

This site already owns the hard part of the first: a 675-tick clock over 570 units `[site]`. What it lacks is everything that is not a regiment: the sky, the sound, the photographs, the paper, the people who already lived here, and the five months after the guns stopped. The ten ideas below hang all of that on the clock. Each wears an evidence badge, so a skeptic can see what is known and how.

| # | Experience | The sense or lens | Built from | Tier | The line a stranger forwards |
|---|---|---|---|---|---|
| 1 | The Sky Over the Field | weather and light | Jacobs's readings, USNO, NASA, a modelled heat index | M | "Moonrise at Gettysburg, July 2, 1863: 8:38 p.m. local time, 97% full." |
| 2 | The Guns Nobody Heard | hearing | speed-of-sound physics, dated reports | L | "A general two miles from the guns reportedly heard nothing. Here is the physics that makes that possible. An illustration, not a finding." |
| 3 | Stand Where Gardner Stood | place, in photographs | LoC negatives, NPS pairs, lidar | L (20-pose pilot) | "The Library of Congress's own essay contradicts its own caption." |
| 4 | The Minute Book | information and shared time | Official Records dispatches, testimony, Lincoln Papers | L | "It is 2:40 a.m. on July 2, 1863, and the site knows what was being written at headquarters." |
| 5 | What Was in His Pockets | objects and names | 1864-65 cemetery lists and effects lists | M to L | "A pipe, a diary, a letter: what was found on the dead." |
| 6 | The Ones Already Here | community, over 158 days | census, diaries, NPS tour, Seminar essays | L | "186 free Black residents in 1860. Seventy-four by 1870." |
| 7 | What the Nation Read | the press | Chronicling America, 1,560 pages | M to L | "The front page of the day: what New York read on July 7, 1863." |
| 8 | The Ground, Re-Read | terrain and the 1863 landscape | 2024-25 lidar, Bachelder 1876 | L | "Take the trees off the ridge." |
| 9 | The Number Is a Range | doubt | casualty authorities, 570 unit records | M (ladder), L (band) | "Seven published Confederate totals, 7,612 apart." |
| 10 | The Long Aftermath | care and memory | NPS Seminar essays, Sanitary Commission, Lincoln Papers | M | "Neither the Nicolay nor the Hay copy of the Gettysburg Address says 'under God'." |

**A twenty-minute visit** *(design intent)*. A stranger lands from a friend's message: "Moonrise at Gettysburg, July 2, 1863: 8:38 p.m. local time, 97% full." She scrubs the moon up over the ridge and finds a professor's thermometer readings under it (1). She opens Devil's Den, drags a divider between an 1863 stereograph and today's ground, and learns that the Library of Congress's own essay contradicts its own caption (3). She reads a headquarters dispatch at the minute it was stamped (4). She finds one printed name in a list of the buried, and the pipe found with another man (5). She leaves by sending a friend a number line: Confederate losses are not one number but seven, from 20,451 to 28,063, and here is why (9).

---

## 1. The Sky Over the Field

**Hook.** A Pennsylvania College professor wrote down the weather three times a day through all three days of the battle, and the Navy's tables can put the sun and the moon back over the field to the minute. The site can lay his notebook beside the minute you are watching.

**What you see** *(design intent)*. You scrub to July 2, 7:30 p.m. A thin **Conditions Ribbon** under the timeline shows the light: sunset at 7:32 p.m. local time, civil dusk at 8:04 `[F:ENV-F07]`. You keep scrubbing. At 8:38 the moon lifts in the east, 97% lit, about 66 minutes after the sun went down `[F:ENV-F08]`. Tap the ribbon and three measured dots appear for the day: Michael Jacobs's readings of 74, 81 and 76 degrees, with clouds clearing in the afternoon `[F:ENV-F01]`. On July 3 the 2 p.m. dot reads 87 degrees, the highest of the readings in the transcribed June 25 to July 8 record (a figure reported by a secondary page, to be checked against the scan) `[F:ENV-F01,F02]`. Beside it a **Modelled** badge: a heat index of about 98 F an hour before Pickett's Charge, up to about 105 F between 3 and 4 p.m., up to 15 F more in direct sun, all estimated by Nese and Harding for shady locations (HistoryNet reports the 98 F figure with a dew point of 76 F) `[F:ENV-F05]`. At 6 p.m. Jacobs's note appears, "Thunder storm in neighborhood at 6 p. m." `[F:ENV-F02]`, with his remark that the thunder "seemed tame, after the artillery firing" `[F:ENV-F11]`. Tap any dot and the scanned monthly form opens beside a transcription and a provenance strip: the Smithsonian observer network, NARA microfilm, NOAA's archive, with a duplicate set reported at the American Philosophical Society `[F:ENV-F03]`.

Dated **sense cards** appear at the ticks they describe, each tagged by when it was written: Jacobs timing the July 3 cannonade at seven minutes past 1 p.m. `[F:ENV-F11]`; Tillie Pierce, then 15, carrying water to troops "until the spring was empty" on July 1, from a memoir published in 1889 and tagged *recalled decades later* `[F:ENV-F11]`; the stench from the fields on July 7 that she called "most sickening" `[F:ENV-F12]`. And a **Witnesses differ** card for the morning of July 2: Jacobs's "pleasant, the air was calm, the sun shone mildly through a smoky atmosphere" beside Haskell's "thick and sultry, the sky overcast with low, vapory clouds" `[F:ENV-F10]`. Neither is hidden.

**Why it lands.** Weather is the one thing every visitor shares with 1863: the same sun on the same ridge. It turns July 3 from a date into a body. The heat and thirst of the campaign are documented in general (a 27th Indiana soldier's account of men "frothing at the mouth" comes from Cedar Mountain in August 1862, not Gettysburg, so it is context and not evidence for July 3) `[F:ENV-F05]`, and smell, the least-served sense on any battlefield site, arrives as specific dated quotes `[F:ENV-F12]`. There is precedent at the park itself: conservators rebuilt the missing sky of the Philippoteaux Cyclorama by consulting Jacobs's cloud record `[F:ENV-F19]`, and forensic astronomers such as Donald Olson test historical accounts against computed sun and moon `[F:ENV-F22]`.

**The real sources.**
- Jacobs's three daily readings, cloud types and rainfall (1.39 inches over July 4-5) `[F:ENV-F01,F02]`; the scans at NOAA NCEI `[F:ENV-F03]`.
- USNO: sunrise 04:35 and sunset 19:32 local mean time (04:44 and 19:41 EST), civil dusk 20:04 `[F:ENV-F07]`. NASA/Espenak: full moon July 1 at 06:46 UT (01:46 EST), 97% on July 2 with moonrise about 20:38 local mean time, 91% on July 3 `[F:ENV-F08]`. The 8.9-minute shift from EST to local mean time exists because 1863 had no standard time `[F:ENV-F09]`.
- Nese and Harding, *The Weather Gods Curse the Gettysburg Campaign* (2025), a day-by-day scientific reconstruction that one reviewer calls "completely original" (the review does not say "first"), built on NOAA reanalysis, Naval Observatory records and about 1,500 soldier and civilian accounts; the claim that its humidity input is Harrisburg's was not found in the review or the HistoryNet article and is unverified `[F:ENV-F04]`.
- Jacobs's *Notes*, Haskell's narrative and Pierce's 1889 memoir, all public domain `[F:ENV-F10,F11]`.

**How accuracy is guaranteed.**
- **Measured** (Jacobs), **Computed** (sun, moon), **Modelled** (heat index, 20CR winds `[F:ENV-F06]`), **Contested** (the two witnesses). The badge is always visible.
- Between readings the ribbon draws bands, never a per-tick temperature: that would be invented precision `[F:ENV-opp1]` `[F:ENV-rights]`.
- Jacobs's readings were probably taken in shade, and the heat-index humidity is a reconstruction, not Jacobs's (the research held that it is Harrisburg's, about 35 miles away; that detail is unverified) `[F:ENV-F01,F05]`.
- Held back until the scan is read: any wind visual (12 mph in one transcription, about 2 mph in another, unit unresolved) `[F:ENV-F02]`, and any smoke layer, whose "air nearly calm" premise collides with that conflict `[F:ENV-F13]`.
- The moon is shown "if the sky allowed" only after the 9 p.m. cloud column of Jacobs's July 2 form is read `[F:ENV-opp2]`. Whether the night fighting began before moonrise is a time-model question and is not claimed until the anchors are signed `[F:ENV-F08]` `[F:ENG-rights]`.
- The sun and moon values came through a summarizer: re-run the USNO API before shipping, and check every Jacobs figure and quote against the scan `[F:ENV-F08,F12]`.

**Effort: M.** The ribbon, moon and badges are about 30-40 KB of precomputed static data `[F:ENV-opp1]`; the scan viewer waits on permission.

**Rights notes.** NCEI lists "controlled user access", requires citation and disclaims accuracy; ask ncei.info@noaa.gov before republishing images `[F:ENV-F03]`. Fetch USNO once and store static values with the citation; never call it from visitors' browsers `[F:ENV-rights]`. Credit Espenak and NASA; Astronomy Engine is MIT `[F:ENV-F08,F18]`. Nese and Harding is a copyrighted book: attribute the few figures used, copy no tables or maps, ask permission and consider a fact-check partnership `[F:ENV-rights]`. Use original editions of Jacobs, Haskell and Pierce, since annotated reprints can carry new copyright `[F:ENV-rights]`.

**Share line.** "Moonrise at Gettysburg, July 2, 1863: 8:38 p.m. local time, 97% full." The three Jacobs dots. The "Witnesses differ" card.

---

## 2. The Guns Nobody Heard

**Hook.** On July 2, Ewell, two or three miles from about forty guns, apparently did not hear them `[F:ENV-F15]`. The literature on why is qualitative, and the one recent article the research read (Hippensteel, December 2025) mentions no computational model `[F:ENV-F15]`. The site can put the physics in the visitor's hands, labelled from its first line as an illustration and not a finding.

**What you see** *(design intent)*. You drop a listener pin: Ewell's position, Taneytown (about 12 miles), or Harrisburg (about 35) `[F:ENV-F15]`. A fan of sound rays arcs from the batteries across a terrain slice. Three switches: **uniform air**; **warm ground bending sound upward**, the shadow mechanism attributed to Ross (ground-level heat refracting sound upward, with terrain shielding) `[F:ENV-F15]`; and **sound bending downward**, the "favourable propagation" case in the NoiseModelling approach `[F:ENV-F18]`. Flip between them and the same hillside can go from thunder to silence. Press listen and the cannonade arrives late: about 4.6 seconds per mile at 87 F, about 2.7 minutes to Harrisburg `[F:ENV-F17]`. Pins from the record carry honest status: **Contemporary** (a Harrisburg Evening Telegraph item of July 3, 1863 reporting cannonading heard, known only through a secondary blog and still to be read on Chronicling America), **Hypothesis** (Ewell: Ross and Hippensteel), and **Oft-repeated, unverified** (Pittsburgh, about 150 miles, shown as a pin only) `[F:ENV-F15,F16]`. Each listener gets a one-line verdict that ends "an illustration, not a finding".

**Why it lands.** The same guns are deafening here and silent there. Physics may have shaped a battle: the precedent is the 1666 Four Days' Battle, heard in London while coastal towns nearer the fight, in Pepys's words, "did not hear one word of a fight" (as quoted in Wikipedia's "Acoustic shadow" article) `[F:ENV-F17]`. A 2.7-minute lag means a Harrisburg porch was hearing the past. The design follows the best precedent in the field: Virtual Paul's Cross makes listener position and crowd size explicit parameters, separates evidence from assumption, and won two digital-humanities awards `[F:ENV-ex:VirtualPaulsCross]`.

**The real sources.**
- c = 331.3 + 0.606 T m/s (about 350 m/s at 87 F); humidity adds a small amount (Wikipedia: about 0.1-0.6%, roughly 0.4-2 m/s at this temperature); sound refracts upward when speed falls with height; wind shear of 4 m/(s km) bends sound as much as a 7.5 C/km lapse rate `[F:ENV-F17]`.
- Artillery near 200 Hz carries farther than rifle cracks at 1-2 kHz; the wind was west-northwest, perpendicular to the sound path; Houck's Ridge, Little Round Top, Cemetery Hill and Culp's Hill lay between `[F:ENV-F15]`.
- Ross's papers and book (J. Acoust. Soc. Am. 1998; Applied Acoustics 2000; The Physics Teacher 2000; *Civil War Acoustic Shadows*, White Mane, 2001) `[F:ENV-F14]`.
- Upper-air winds from NOAA's 20th Century Reanalysis, 3-hourly on a roughly 75 km grid with an uncertainty estimate `[F:ENV-F06]`; terrain from USGS `[F:ENV-F23]` `[F:TER-T04]`.

**How accuracy is guaranteed.**
- **Documented**: only the reports, with dates. **Computed**: the lag. **Modelled**: every ray fan. **Contested**: Ewell.
- Upper-air conditions on those days were never recorded and the reanalysis grid is coarse `[F:ENV-F06]`, so three scenarios bracket the possibilities and none is labelled "as measured"; upper air is shown as "reconstructed with uncertainty".
- The novelty wording is hedged: "we found no published model of Gettysburg" rests on one article's silence, not a proven absence `[F:ENV-F15]` `[F:ENV-summary]`.
- Wikipedia says Ewell opened his own artillery from Benner's Hill at 4 p.m. on July 2, so how much he missed is contestable `[F:ENV-F15]`.
- Ross's Gettysburg specifics came through a secondary summary; read the 2001 book first `[F:ENV-F14,F15]`. Pittsburgh has no primary newspaper citation `[F:ENV-F16]`, so it stays a pin and never becomes a headline or a share card.

**Effort: L.** Precomputed ray fans for three listeners and three scenarios, plus a curated table of about 40 heard or not-heard reports `[F:ENV-opp10]`. It becomes XL if it adds a newspaper-audibility audit across Pennsylvania, Maryland and Virginia papers `[F:ENV-F21]`.

**Rights notes.** Write the Snell's-law ray tracer independently: NoiseModelling is GPL v3 and its code must not be copied `[F:ENV-F18]`. Ross, Hippensteel and the Lancaster Online piece are copyrighted: cite and paraphrase `[F:ENV-rights]`. Precompute everything to static files `[F:ENV-rights]`.

**Share line.** "A general two miles from the guns reportedly heard nothing. Flip the physics and see why that is possible. An illustration, not a finding."

---

## 3. Stand Where Gardner Stood

**Hook.** About 107 distinct July 1863 photographs of the field are in the Library of Congress (a keyword tally, not a catalogue count) `[F:IMG-F02]`. One check of Wikimedia Commons found essentially no camera-position coordinates for them, so an open dataset of where the cameras stood would be new (an inference from one source) `[F:IMG-F16]`. And the Library's own essay contradicts the Library's own caption for the scene in Gardner's Plates 36 and 37 `[F:IMG-F08]`.

**What you see** *(design intent)*. You open Devil's Den. Small tripods glow on the map, each with a faint fan showing where it pointed. Tap one: an 1863 stereograph fills the screen with a divider down its middle. Drag it, and the other half becomes today's ground, rendered from the same camera pose on lidar terrain, boulders matching. A badge gives the **confidence class**: **A** pinned by a surviving referent (an NPS Then and Now pair), **B** landmark-identified, **C** area only `[F:IMG-opp2]`. Press 3D and the left and right plates become a red-cyan stereo view; 65 of the July 1863 records are stereograph-genre, digitized by the Library as separate left and right plates `[F:IMG-F02,F06]`. Then open the **Caption Court**. The catalogue caption for negative LC-B8171-0234 still reads "Bodies of Federal soldiers, killed on July 1, near the McPherson woods"; the Library's essay, following Frassanito, shows that Gardner's Plates 36 and 37 are the same Union Third Corps dead (diamond badge) photographed from opposite sides in open fields near the Rose farm and the Emmitsburg Road `[F:IMG-F08]`. A second case: NPS says the "sharpshooter" body was moved about 40 yards and the rifle was a prop `[F:IMG-F08]`. You vote first, then see the evidence. Dates appear as ranges: only about 7 of about 109 records carry a day (July 5), and about 99 are month-only `[F:IMG-F02]`.

**Why it lands.** It is time travel followed by a detective story, and it changes how you read every famous image. Frassanito puts the Gardner team at about 60 negatives, almost 75% of them showing corpses and graves, which reframes the set as a record of the days after and not of combat `[F:IMG-F03]`. It is the accuracy brand made visible: the authoritative catalogue is wrong in at least one place, and the site can show the proof. Photo Tourism (2006) let users move between photographs by each camera's computed viewpoint `[F:IMG-ex:PhotoTourism]`, and some of NPS's own captions already cite Gardner stereo numbers and Frassanito page ranges `[F:IMG-F07]`.

**The real sources.**
- The LoC glass-negative collection: 8,727 items, 185 Gettysburg hits, about 109 July 1863 records and about 107 distinct images (about 77 negative ids plus 32 print-only records; Gardner 22, O'Sullivan 17, Gibson 13, Brady 3, unattributed 22) `[F:IMG-F01,F02]`.
- NPS publishes Then and Now comparisons on 8 pages (the research counted 31 pairs, about 19-21 of them from 1863; the pair counts were not re-verified, and the 8 pages include the 1913 and 1938 reunions and the electric railway), each shot from the original camera spot, with Gardner stereo numbers and Frassanito page citations on some of them; the pages are not machine-readable and carry no coordinates `[F:IMG-F07]`.
- Ground truth: the USGS 1 m DEM and the 2024-25 QL1 lidar `[F:IMG-F15]` `[F:TER-T03,T04]`; solving a pose needs at least three, preferably four or more, non-collinear ground-control points `[F:IMG-F17]`; open, deterministic tools exist (img-comparison-slider MIT, three.js MIT, OpenCV Apache-2.0, OpenSfM BSD-2) `[F:IMG-F18]`.

**How accuracy is guaranteed.**
- Every solved pose is a **Modelled** output shown with an uncertainty fan and its ground-control points; the method is validated on the NPS pairs; a heading is never presented as fact `[F:IMG-rights]`.
- Dates are ranges with conflict flags: even the arrival of Gardner's team is variously July 5, July 5-6, "after July 7" and July 7 `[F:IMG-F03,F20]`. Weaver's November 11, 1863 views are staged and sit in their own class `[F:IMG-F07,F08]`.
- Today's vegetation was reshaped by NPS rehabilitation, so "today's view" is dated and labelled `[F:TER-T11,T13]`.
- About 75% of the Gardner team's negatives show the dead, so graphic images are opt-in, content-warned, and never a first-view thumbnail `[F:IMG-F03]` `[F:IMG-rights]`.
- **Scope: a pilot of about 20 Class A poses plus five Caption Court cards.** Solving all roughly 107 and building stereo for every pair is XL and is deferred `[F:IMG-rights]`.

**Effort: L** for the pilot *(est.)*; XL for the full set and the open dataset.

**Rights notes.** LoC records say "No known restrictions on publication" with a prescribed credit line, but the Library says that is not a public-domain declaration; 12 of the 185 Gettysburg hits carry no advisory (a re-pull found that 10 of the 12 are essay pages and not images), so check item by item `[F:IMG-F04]`. Harvest at 10 requests a minute or less, self-host derivatives, never hotlink `[F:IMG-F05]`. Frassanito's books and photographs are copyrighted: use locations and page cites only `[F:IMG-rights]`. NPS photographs are generally public domain, but third-party credits and the Arrowhead are not `[F:IMG-F19]`. Own the data as static, exportable files: WhatWasThere is shut down and the NYPL Stereogranimator is unmaintained `[F:IMG-F20]`. Publish the camera positions as a CC0 GeoJSON with evidence, and contribute to Wikimedia Commons structured data `[F:IMG-opp13]`.

**Share line.** "The Library of Congress's own essay contradicts its own caption." The slider GIF. The open dataset.

---

## 4. The Minute Book

**Hook.** *"It is 2:40 a.m. on July 2, 1863, and the site knows what was being written at headquarters."* Apollo in Real Time pinned thousands of hours of audio to one mission clock and drew 1.1 million visitors `[F:ENG-E02]`. Gettysburg already has a clock of its own, and the Official Records print their dispatches with a place and a clock time `[F:COR-F04]`.

**What you see** *(design intent)*. A lane of dispatches lights up under the timeline at the minute each was written, shaped like the printed originals: *Headquarters Army of the Potomac, [Taneytown], July 2, 1863 - 2.40 a. m.*, then addressee and signature `[F:COR-F04]`. Tap one and the Official Records page opens with the quoted lines boxed, a **View scan** link `[F:COR-F05]`. A precision chip says how the time is known: **reported**, **inferred** or **about** `[F:EXM-opp1]`. The ledger keeps separate fields for sender, addressee, place and *written* time, and shows a *received* time only where a document states one. Reports appear by number and author, because the table of contents gives "No. N - rank name, unit" for the numbered reports, which run to No. 589 across Parts 1 and 2 (a few numbered items are documents, not reports: No. 7 is the Itinerary and No. 589 the Confederate Roll of Honor; No. 196 is Col. Joshua L. Chamberlain, 20th Maine) `[F:COR-F03]`. Where several accounts of one moment disagree, they sit on a clock strip at their stated times, with the range and the median, labelled **testimony statistics, not ground truth** `[F:EDU-opp:corroboration-lab]`.

Paired rooms set testimony side by side: Sickles examined by the Joint Committee on the Conduct of the War in February 1864, against Meade's report (Official Records No. 6) and a letter Lincoln wrote Meade on July 14, 1863, found sealed in his papers and never sent `[F:COR-F08,F16]` `[F:EDU-E06]`.

**Live.** On the real July 1, 2 and 3 a **Now** button maps the viewer's wall clock to 1863 local time and the map sits at the matching tick. The rest of the year, a daily **This hour at Gettysburg** card maps your local hour to a tick on July 1, 2 or 3 (rotated by date), shows three units and one cited line, and links into the map; it is also published as RSS, a JSON Feed and a yearly calendar file, with no email and no account `[F:ENG-opp01,E15]`. Watch Together gains a "start at the live minute" option `[F:EXM-opp2]`. Pace controls: a three-minute trailer, a narrated tour, or real-time scrub `[F:EXM-opp5]`.

**Why it lands.** It is the feeling of reading over a staff officer's shoulder with the page proof beside you. And on the anniversary it is thousands of strangers on the same minute, which may add to the effect *(design hypothesis: the awe white paper the research cites lists nature, art, music, threat and spiritual experience as common elicitors and calls awe relatively asocial, so a synchronized group experience is not a documented elicitor there)* `[F:EXM-F23]`. Apollo in Real Time began as one historian's hobby in 2009, launched in 2015 and serves static files `[F:EXM-F06]` `[F:ENG-E02]`; RealTimeWWII built over 500,000 followers by posting each event at its moment, ad-free `[F:ENG-E03]`. There is a documented need too: NPS's 2026 anniversary programs on July 1-3 were 60-minute indoor ranger lectures with limited seating and free same-day tickets released at 8 a.m. `[F:SITE-OS13]`.

**The real sources.**
- Official Records Series I vol. 27, three UIUC scans (584,253, 573,004 and 489,617 words) with word boxes `[F:COR-F01]`, plus 17 independent full-view HathiTrust copies from five holders and a govinfo scan `[F:COR-F02]`.
- Part 3 correspondence: the plan measured about 118 dispatch headers (about 100 dated July 1-3) and 2,201 clock times; the research did not re-derive them `[F:COR-F04]`. The Itinerary (No. 7, compiled by Kirkley, June 5 to July 31) supplies dated daily movements `[F:COR-F03]`.
- The Joint Committee volume, clean Question and Answer text mixed with other campaigns `[F:COR-F08]`; the Lincoln Papers at the Library of Congress, 302 items dated June 25 to July 20, 1863, with transcriptions and a prescribed credit line `[F:COR-F16]`.

**How accuracy is guaranteed.**
- A dispatch header gives the sender's place and the time it was written; it does not say who received it or when `[F:COR-F04]`. So the ledger shows *written*, and the earlier drafts' "what Meade knew" fog-of-war layer is cut unless addressee and receipt logic is sourced.
- 1863 had only local mean time, so clocks at different headquarters were not synchronized `[F:ENV-F09]`.
- OCR variants ("a. ni." for "a. m.") are repaired by a logged, reversible rule set, and two independent extractors, the in-house time grammar and HeidelTime as a build-time check (GPL-3.0, untuned for 1863, never shipped), must agree on the minute and the day before an anchor is auto-accepted `[F:COR-F04]` `[F:ACC-opp5]` `[F:ACC-F20]`.
- Placement keyframes exist on only 188 of 675 ticks (1,804 keyframes), so the drawer states keyframe density `[F:IMG-F11]`. Bombsight is the warning: a precise-looking marker that carried only a period up to eight months long `[F:EXM-F13]`.
- Five of 33 time anchors still await a historian, so every live-clock feature is labelled **Modelled** until they are signed `[F:ENG-rights]`.
- The Joint Committee was partisan, so each voice carries a perspective chip and its lag in days `[F:COR-F08]`.
- No live crowd counter on Watch Together: a count needs presence counting, which conflicts with a static, no-accounts, no-tracking site *(design intent)*. And no invitation to after-hours visits: the park is closed sunset to sunrise plus or minus half an hour `[F:SITE-OS11]`.

**Effort: S** for the daily card; **L** for the ledger and the live mode.

**Rights notes.** The Official Records are a US Government publication of 1889-90, flagged "public domain, published prior to 1923" on all three parts `[F:COR-F01]`. The Internet Archive's search-inside endpoint (page numbers and boxes) is undocumented and may change, so keep precomputed boxes from the word-box files as the fallback `[F:COR-F05]`; HathiTrust reader pages return 403, so build on its catalog API `[F:COR-F02]`. Pre-warm hosting before the dates `[F:ENG-E02]`. Publish the feed on the site first and treat social posts as mirrors, because RealTimeWWII's last post was December 9, 2025 `[F:ENG-E03]`; Mastodon's limits are documented (300 requests per 5 minutes, 30 media uploads per 30 minutes), Bluesky's and X's are not verified `[F:ENG-opp02]`. The realistic live dates are July 1-3, 2027 (Thursday to Saturday) `[F:ENG-E20]`.

**Share line.** "It is 2:40 a.m. on July 2, 1863, and the site knows what was being written at headquarters." A "Lincoln wrote it and never sent it" card.

---

## 5. What Was in His Pockets

**Hook.** When the Union dead were dug up to be reburied, someone catalogued what was in their pockets.

**What you see** *(design intent)*. A quiet page: no counters, no sound. It opens on one object, a pipe, a diary or a letter, as the report lists it for a named man, beside the line as printed (grave number, name, company, regiment) and a link to the scan page `[F:COR-F11]` `[F:PPL-P10]`. A surname search is the only control. Zoom out and the cemetery appears as Saunders's 1863 plan drew it: concentric semicircles by state, one small mark per grave, blank tablets for the unnamed `[F:VIZ-F07]`. The unnamed read "Unknown", with the section and the regiment where printed. A short note credits who did the work: Basil Biggs and a crew of 10-12 free Black men, and Samuel Weaver, who supervised and catalogued 287 packages of personal effects (another source says 278 soldiers with items, about one in ten with an ambrotype of family) `[F:INC-IC06]`. The count comes last: the 1865 report states 3,512 bodies, and an NPS Gettysburg Seminar essay gives 979 as the number unknown (against a total it puts at 3,354), so roughly 2,400-2,500 carry names (my arithmetic: 3,354 or 3,512 minus 979; to confirm by parsing) `[F:COR-F11]` `[F:PPL-P10]`. Edition totals are shown as printed: 3,512 (1865), 3,564 (the 1867 revised report; Pennsylvania 534), against 3,354 in the NPS seminar essay `[F:PPL-P10]`.

**Why it lands.** The smallest unit of humanity is not a name but an object. This is the New York Times "one line per life" idea `[F:EXM-F04]`, with the lives drawn from the record and not from an editor's phrasing. The dignity is in the restraint. The asymmetry is part of the story: Confederate dead were exhumed in 1871-73 (3,320 remains shipped south) and nearly 1,500 from the campaign remain unaccounted for `[F:VIZ-F07]`, and a free per-man Gettysburg casualty list does not exist `[F:PPL-P13]`.

**The real sources.** Public-domain scans of the Pennsylvania committee's reports on the Internet Archive: the 1865 edition (`revisedreportofs01penn`), a later copy (`revisedreportmad00penn`), the 1864 report (`reportofselectcopenn`) and a Google/Michigan scan (`revisedreportma00cemegoog`, 291 scans, about 69,675 words); at least 12 ids exist `[F:PPL-P10]` `[F:COR-F11]`. The report carries per-state lists of personal effects found on the dead `[F:COR-F11]`. Weaver's catalogue and Biggs's crew `[F:INC-IC06]`.

**How accuracy is guaranteed.**
- Names and numbers are never auto-corrected. The card shows the printed form and, separately, any suggested correction as an original-plus-correction pair; digits are never edited `[F:ACC-F19]` `[F:PPL-rights]`.
- The OCR is noisy (a vocabulary proxy of 0.82 against 0.95-0.98 for Official Records text; "Eegiment" for "Regiment"), so a few hundred lines go to hand review `[F:COR-F11,F20]`. The page never claims "original spelling" from OCR text.
- Every record cites the Internet Archive id, the printed page and the scan leaf `[F:PPL-rights]`.
- A grave is evidence that a man was reburied here, not a claim about where he fell or that he fought; NPS and NARA both say indexes do not prove battle participation `[F:PPL-P01,P05]`.
- The effects lists were verified only in the Google/Michigan scan; confirm them in non-Google copies or accept Google's usage request `[F:COR-F11]` `[F:PPL-rights]`.
- Do not plan around the VA Gravesite Locator: it holds 339 Gettysburg NMP records, all 20th-century burials `[F:PPL-P11]`.
- Quiet mode: no counters, no sound, no gamification, and no AR labels over graves `[F:PPL-opp9]` `[F:SITE-opp12]`.

**Effort: M** to parse; **L** with the hand review of noisy lines `[F:COR-F11]`.

**Rights notes.** State imprints of 1864-67 are public domain by date; prefer non-Google scans (ids ending "goog" carry Google usage requests); counsel confirms the pre-1931 arithmetic `[F:PPL-rights]` `[F:COR-rights]`. Publish the parsed roll as an open CSV with a clear licence line `[F:PPL-opp12]`. Keep lookups client-side with no logging, and say so on the page `[F:PPL-rights]`. The Humiston ambrotype story stays out until it is read in a primary source `[F:INC-opp14]`.

**Share line.** Not the totals: one printed line, opt-in, with its scan crop. "A pipe, a diary, a letter: what was found on the dead."

---

## 6. The Ones Already Here

**Hook.** *"186 free Black residents in 1860. Seventy-four by 1870."* `[F:INC-IC01]` Before either army arrived, Gettysburg had a Black community with two churches *(the two churches and St. Paul A.M.E. Zion were not found on the cited NPS tour page; to verify)*; in June, Lee's army was already hunting free Black Pennsylvanians along the road north `[F:INC-IC01,IC02]`. The clock here opens on June 15 and runs 158 days, to November 20.

**What you see** *(design intent)*. Before the first shot, pins appear. June 16, Chambersburg: Rachel Cormany's diary records "droves" of 25 to 50, mostly women and children, including freeborn Pennsylvanians. June 22, Greencastle: Charles Hartman's diary. About June 26, Mercersburg: Philip Schaff counts 21 seized by Captain McNeill's men, including a woman, two children and Sam Brooks `[F:INC-IC02]`. Each pin carries a halo for how precisely its place and date are known, the way Visualizing Emancipation draws uncertainty `[F:EXM-F08]` `[F:INC-ex:VisEmanc]`. The count never appears as one number: about 50 (Adams County), over 100 (the NPS tour), at least several hundred (Wingert), up to 1,000 (Wikipedia), each with its source `[F:INC-IC02]`.

Then Gettysburg itself, and a second layer of places no regimental monument marks: the Abraham Brian farm (he claimed $1,028 and was paid $15; NPS counts over 106 hastily dug graves on his land) `[F:INC-IC04]`; the McAllister mill, an Underground Railroad station, and St. Paul A.M.E. Zion `[F:INC-IC01]`; Lincoln Cemetery, bought in 1867 by the Sons of Good Will because Black veterans were excluded from the Soldiers' National Cemetery `[F:INC-IC05]`; Evergreen Cemetery, where caretaker Elizabeth Thorn buried between 91 and 105 soldiers, depending on source `[F:INC-IC08]`; the Garlach house on Baltimore Street, where General Schimmelfennig hid in the yard `[F:INC-IC09]`. A panel on the enslaved with Lee's army shows 6,000-10,000 as the conventional range ("adopted by most scholars" per HistoryNet) beside a lower 4,500-5,000 range *(that lower range, and a named man, Richard Jordan, who reportedly escaped during the battle and enlisted, were not found in the cited HistoryNet page and are held until a source is located)*; documented outcomes include 64 captured servants held at Fort McHenry by July 30, at least 16 of whom enlisted with Union forces `[F:INC-IC03]`. The timeline's tail: the reburial begins October 27 under Basil Biggs's crew `[F:INC-IC06]`; November 19, the Address; November 20, Fleming Devan enlists in the 8th US Colored Troops, and dies at Olustee on February 20, 1864 `[F:INC-IC04]`. A second Walkthrough route, **Beyond the Auto Tour**, builds on the six stops of NPS's "On Freedom's Tenuous Edge" plus hospital and cemetery stops `[F:INC-IC04]` `[F:INC-opp7]`.

**Why it lands.** It gives the battle its larger frame without leaving the map, and it replaces a single number with named people and dated places. It is a complement to NPS, not a rival: NPS publishes the six-stop tour and an African American community walk, and its 16-stop virtual tour, in the pages the research could read, has no dedicated stops on these subjects `[F:INC-IC04]` `[F:SITE-OS05]`.

**The real sources.** NPS tour pages and NPS Seminar essays `[F:INC-IC01,IC04,IC06]`; Wingert's Emerging Civil War piece naming the Cormany, Schaff and Hartman diaries, Hoke's *Reminiscences* (1884) and Official Records vol. 51 pt. 2 `[F:INC-IC02]`; HistoryNet on the camp servants `[F:INC-IC03]`; the 1860 census (186 Black residents; one transcription gives 157 plus 31 "Mulatto", 188 in all) `[F:INC-IC01]` `[F:PPL-P15]`; Lincoln Cemetery `[F:INC-IC05]`; Pierce, Broadhead and Hoke, public domain `[F:PPL-P18]` `[F:COR-F12]`.

**How accuracy is guaranteed.**
- Every count is a labelled range with its sources, and "estimated" flags stay on `[F:INC-IC02]` `[F:PPL-P16]`.
- Each claim is tagged **documented**, **traditional** or **disputed**: Jennie Wade is the only civilian confirmed killed directly by the fighting (others died indirectly), whose bullet is unknown, and the Skelly romance rests on thin evidence `[F:INC-IC07]`.
- No United States Colored Troops regiment fought at Gettysburg; about 40 Black men from the area served elsewhere `[F:INC-IC04]`. No Native regiment fought here, and no named Native soldier at Gettysburg is documented in the sources reached; the site says so, treats it as an open research question, and adds a "same week elsewhere" strip placing Honey Springs (July 17) honestly `[F:INC-IC16]` `[F:INC-opp12]`.
- Correct names: Anna (not Sarah) Louisa Garlach `[F:INC-IC09]`; Brian, Bryan and Brien; Jennie and Ginnie Wade; "Mag" and Margaret Palm `[F:INC-rights]`.
- Language: "enslaved people", "kidnapped", "camp servants", never "Black Confederates"; the census's period term carries a content note `[F:INC-rights]` `[F:PPL-P15]`.
- Basil Biggs bought the Peter Fry farm in 1865 `[F:INC-IC04]`, so it is not a June 1863 place; in 1863 he is a person, who had moved to Gettysburg in 1858 and whose home was used as a field hospital (the earlier "fled before the battle and lost livestock" detail was not found in the cited American Battlefield Trust page and is unverified) `[F:PPL-P16]`.
- A public ethics statement modelled on Enslaved.org's (name people, acknowledge source bias, centre Black experience, consult descendant communities) `[F:INC-ex:Enslaved.org]`. Before launch, invite review from the Lincoln Cemetery trustees, St. Paul A.M.E. Zion, the Devan family line, the Gettysburg Black History Museum and Gettysburg History `[F:INC-rights]` `[F:PPL-opp5]`. No generated faces, voices or dialogue for anyone in this layer `[F:INC-rights]`.

**Effort: L** for the pre-battle timeline, the events dataset and the community review. XL if it adds an own transcription of the 1860 census from images (deferred) `[F:PPL-P15]`.

**Rights notes.** NPS content is generally public domain. Wingert's essay, the Gettysburg Network of 1863 and the Compiler blog state no licence: cite and link. Gettysburg History forbids reproduction without permission, Killed at Gettysburg is CC BY-NC, and the American Battlefield Trust is link-out only `[F:INC-rights]` `[F:PPL-P17]` `[F:ENG-E18]`. The older NPS Seminar paper "Blacks in Blue and Gray" uses dated framing: check before quoting. Use pre-1931 originals for diary text. Do not reuse Anna Deavere Smith's *Basil Biggs* text without permission `[F:INC-rights]`. Do not copy a third-party census transcription that states no licence `[F:PPL-P15]`.

**Share line.** "186 free Black residents in 1860. Seventy-four by 1870." The labelled-range card for the kidnapping counts.

---

## 7. What the Nation Read

**Hook.** In the Library of Congress's Chronicling America, 135 newspaper pages from July 1 to 3, 1863, and 382 more from July 4 to 10, mention Gettysburg `[F:COR-F14]`. The site can show each as the page a reader actually held.

**What you see** *(design intent)*. A date strip runs from late June to the Dedication. Pick July 7 and lanes by city show what New York, Chicago, Cleveland and Wheeling printed that day `[F:COR-F14]`. Tap a page and the original page image opens with the hit highlighted from the Library's word coordinates; the OCR text is never shown as a quotation. Chips tag the press tradition: Northern city dailies, Southern papers (Raleigh's *Spirit of the Age* is in the collection) and the Black press, such as *L'Union* of New Orleans, French and English, July 14, 1863 `[F:INC-IC20]` `[F:INC-opp6]`. A local lane holds the Gettysburg Compiler and the Adams Sentinel as image links only `[F:COR-F15]`. The Harrisburg Evening Telegraph of July 3 becomes the contemporary pin in idea 2 once its text is read on the original page `[F:ENV-F16]`.

**Why it lands.** It answers "what did they know, and when?" with the paper they actually read, and a teacher can put a real front page on the board. The sample page the research opened, the New-York Daily Tribune of July 7, 1863, page 4, shows how noisy the OCR is, which is exactly why the image is the evidence `[F:COR-F14]`.

**The real sources.**
- 5,265 OCR'd pages dated July 1-31, 1863 (1,321 issues); 1,560 contain "gettysburg". The top July titles are the New York Herald (262 pages), the New-York Daily Tribune (220), the Chicago Daily Tribune (112), the Wheeling Daily Intelligencer (110) and the Cleveland Morning Leader (108). Per-page word coordinates are served by the Library `[F:COR-F14]`.
- The Internet Archive holds 103 issues of the Compiler and Adams Sentinel dated 1863, uploaded in 2023 with no licence field; the Library's catalogue marks both "digitized: false" `[F:COR-F15]` `[F:INC-IC20]`.

**How accuracy is guaranteed.**
- OCR only finds and ranks; the page image is the evidence. A vocabulary-hit proxy puts Official Records text at about 0.95, a sampled Tribune page at 0.84 and the Compiler at 0.66, and the sample page contains "Yaukees" and "sccoonts" `[F:COR-F14,F15,F20]`.
- Newspapers are a perspective record, so each page carries its lag in days from the event *(design intent)*.
- The Compiler's OCR is "badly garbled", so it is an image link and nothing more `[F:COR-F15]`.

**Effort: M to L.** The build is offline. The Library's legal page asks software to stay at or under 10 requests a minute, which makes 1,560 page fetches about 2.6 hours (my arithmetic); the stated service limits are 20 a minute for the JSON API and 150 for text and image services, with a one-hour block if exceeded; the legacy Chronicling America API was retired in 2025 `[F:IMG-F05]` `[F:COR-F14]`.

**Rights notes.** The Library says the newspapers are believed to be public domain or without known restrictions and that the user must assess third-party content; its rights page returned 403 to the fetcher, so confirm before publishing any OCR text `[F:COR-F14]`. The Valley of the Shadow's Franklin County material is CC BY-NC: link out only `[F:COR-F18]`.

**Share line.** "The front page of the day: what New York read on July 7, 1863." One click from any tick.

---

## 8. The Ground, Re-Read

**Hook.** *"Take the trees off the ridge."* In winter 2024-25 a plane flew the battlefield with a laser (flown December 12, 2024 to March 24, 2025 at USGS Quality Level 1; the research recorded a density of 8.16 points per square metre, which was not re-found in the project metadata), and USGS published the data on May 4, 2026 `[F:TER-T03]`.

**What you see** *(design intent)*. A swipe handle splits the map. On the left, satellite imagery with its canopy. On the right, a bare-earth, multi-directional hillshade where stone walls, railroad cuts and boulder fields appear that the trees hide `[F:TER-T03]` `[F:TER-opp6]`. A button says **1863**. Bachelder's 1876 map fades in, georeferenced: 1:12,000, contours for every 4 feet of elevation, vegetation, fences, and houses with the names of residents, with an opacity slider `[F:TER-T08]`. Tap a farm for its 1863 owner, land use and a citation to Bachelder, Cope's 1863 map, the 1858 Adams County householder map, the Park Commission's map of 1863 and 1900 owners, or a HABS/HAER record `[F:TER-T08,T09,T10]`. A **what changed** layer separates the park avenues built in 1882-1917 from the 1863 road network `[F:TER-T10]`.

Then **Stand where Warren stood.** Pick a documented vantage (the Little Round Top signal station, the Seminary cupola, Cemetery Hill, the Copse of Trees, Longstreet's rise on the Fairfield Road) and an eye height, and a visibility mask appears `[F:TER-T16]`. **Dead ground** colours the field by how tall a person would have to be to be seen from a chosen ridge, exposing swales on the Pickett's Charge approach `[F:TER-opp4]`. **Lee's blind spot** compares three vantage points, each tagged **documented** or **hypothetical**: Buford used the Seminary cupola on July 1, but there is no hard evidence that Lee ever entered it `[F:TER-T15]`. Four account-based test cases run beside the model, and any disagreement is published and not tuned away `[F:TER-T16]`.

**Why it lands.** It is an actual reveal: the canopy comes off and the ground speaks. The technique is proven: an NPS and GeoCue drone survey of Little Round Top in 2017 found earthworks, stone walls and railroad beds earlier surveys missed `[F:TER-ex:NPS-GeoCue]`. And the viewshed idea has a published precedent: Anne Kelly Knowles's Smithsonian-profiled work reframed what Lee and Longstreet could see on July 2, and says plainly that smoke and haze cannot be modelled in GIS `[F:TER-T15]`.

**The real sources.**
- Lidar: 58 point-cloud tiles over the core from three projects; the 2024-25 project (PA_17County_D24) is 36 tiles and 3,693 MB, flown December 12, 2024 to March 24, 2025, USGS Quality Level 1, 9.8 cm vertical accuracy at 95% confidence `[F:TER-T02,T03]`. A 1 m DEM from it is not yet in The National Map; today's only 1 m DEM is the 2017 QL2 product (four tiles of about 470-485 MB) `[F:TER-T03,T04]`.
- The Warren survey (1868-69, 200 feet to the inch, revised 1873; National Archives RG 77 E 81) is the base of Bachelder's 1876 map `[F:TER-T07]`. The Library's Bachelder scans are 8,292 by 10,756 pixels, "free to use and reuse unless a Rights Advisory statement is present", with the credit line "Library of Congress, Geography and Map Division" `[F:TER-T08]`; the Boston Public Library holds the same sheets with IIIF manifests and "no known restrictions" fields `[F:IMG-F12]`. Allmaps georeferences IIIF maps, publishes control points as open annotations, and has a MapLibre plugin `[F:TER-T20]`.
- Speed: a synthetic 5 km viewshed on a 5 m grid ran in 47 ms; the earlier repo prototype on real 3DEP data measured 236 ms; phones are an unmeasured 3-10 times slower, so budget 0.3-1.5 seconds `[F:TER-opp2]`.

**How accuracy is guaranteed.**
- Modern bare earth is not 1863 ground. The lidar is a winter, leaf-off collection and the battle was fought in July leaf-on; the point cloud has ground, water and noise classes only, with no building or vegetation classes `[F:TER-T03]`. Warren's survey was made five years after the battle, and some breastworks were thrown up after the fighting `[F:IMG-F10,F11]`; the park avenues date from 1882-1917 `[F:TER-T10]`.
- Every viewshed wears the label "terrain only, modern ground; woods, fences, orchards, smoke and haze are not modelled" `[F:TER-rights]`.
- Any difference between 1868 contours and modern lidar needs an uncertainty statement, because the 1868 vertical accuracy is not documented in anything fetched `[F:TER-rights]`.
- The four test cases (Longstreet's countermarch in view of the Round Top signal flags; Oates's "open woods"; Warren's glass; Jacobs's calm morning against a "heavy fog" description) came through a secondary article, so primary citations come first `[F:TER-T16]`.
- Modified USGS data must be described as modified and must not imply USGS endorsement `[F:TER-T01]`. Every "today" layer is date-stamped, because NPS keeps changing the ground: a 160-acre grassland initiative began May 9, 2026, and Little Round Top reopened June 24, 2024 `[F:TER-T13]`.
- **Cut from this idea:** a fog-of-war "who could see whom" toggle (it would run on modern leaf-off terrain with unit positions keyframed on only 188 of 675 ticks) `[F:TER-opp3]` `[F:IMG-F11]`, a smoke overlay `[F:ENV-F02,F13]`, a vector land-use layer of woods, orchards and fences (XL) `[F:TER-opp8]`, and the audit against David Rumsey's 23 time-stamped Warren/Bachelder maps `[F:IMG-F11]`.

**Effort: L** for the swipe, the overlay and the vantage atlas of 40-60 baked masks (the atlas alone is M) `[F:TER-opp2]`; the vector land-use layer is XL and deferred.

**Rights notes.** USGS data is public domain, and USGS requests a credit line `[F:TER-T01]`. The Library of Virginia copy of the Bachelder map asks users to contact the library, so use the Library of Congress and Boston copies `[F:TER-T08]`. Rumsey's set is CC BY-NC-SA and its records say troop positions are not given (unverified): do not use it `[F:IMG-F11]`. Do not sample Mapbox elevation: its terms bar deriving, extracting and caching, and its Terrain-DEM is SDK-only; compute from USGS data and host static terrain tiles (0.54 MB at 10 m, 1.65 MB at 5 m for the core) `[F:TER-T19]` `[F:TER-opp13]`. Processing roughly 5 GB of compressed point-cloud files for the core (the 58 tiles in the research's bounding box total about 4,966 MB as listed by The National Map on 2026-09-30; the earlier draft's 9 GB did not reproduce) is a one-time offline job (estimate) `[F:TER-T02]`; bake the outputs so no government service sits behind a visitor's click `[F:TER-rights]`.

**Share line.** "Take the trees off the ridge." The satellite-to-bare-earth swipe image.

---

## 9. The Number Is a Range

**Hook.** Seven published Confederate casualty totals span 20,451 to 28,063, a gap of 7,612 (my arithmetic) `[F:VIZ-F01]`. The site shows all seven, ranked, with the reasons, and gives the whole habit a public page: **Where the Sources Disagree**.

**What you see** *(design intent)*. Every headline number has a dotted underline. Tap "Confederate casualties" and a number line opens with seven marks: Guild's 1863 report as amended, 20,451; Krick (2004), 22,587; Stone Sentinels, 22,709 (marked underreported); Busey and Martin (2005), 23,231 *as reported by Wikipedia*; Livermore (1901), 27,823; NPS, 28,000; the American Battlefield Trust, 28,063 `[F:VIZ-F01]`. Under it, Krick's own confidence grades appear as texture: for 21 of the 43 brigades he graded the figures 3 or 4 on a 1-to-4 scale (4 meaning no better than Guild's original returns) `[F:VIZ-F02]`. A switch asks "what does the word mean?" and redraws killed, killed or mortally wounded, wounded and missing, because "missing" is largely captured: US records list 12,227 captured Confederates against Guild's 5,150 `[F:VIZ-F02,F04]`.

Then the other great number, how many men were there: 155,011 (the sum of the site's own unit records); 158,343 (the NPS battle page: 83,289 US and 75,054 CS); 160,311 (Stone Sentinels' two "present for duty equipped" figures added, my arithmetic, mixing definitions); and "more than 165,000" (NPS's press kit) `[F:VIZ-F03]` `[F:PPL-P02]` `[F:SITE-OS08]`. The public page lists every conflict with a status: *adopted with reason*, *open* or *unresolvable* (the seed rows are in Part 2, section 2.5).

And the band that remembers. Pick the Iron Brigade on July 1 (the 2nd Wisconsin lost 77.2%, the 19th Indiana 68.2%) `[F:VIZ-F19]` `[F:VIZ-V3]`. A Minard-style flow band follows the unit's track: its width is men present, and a pale **ghost band** beside it shows the men already lost. That fixes Minard's known weakness, since his band shows who remains and not who was lost, and 67.77% of his losses came on the advance `[F:VIZ-F15]`. It is labelled **[MODEL]**.

**Why it lands.** Almost every other site hides this, and a scholar trusts a site that shows its doubt. Authors say they value uncertainty and rarely draw it `[F:VIZ-F13]`. "We do not know exactly how many died, and here is why" is also a form of respect for the dead. Width carries a quantity, so proportion is felt and not merely read. The honest claim is comprehension of proportion and not empathy: Boy and colleagues (2017) found no reliable effect of people-shaped marks on empathy or donation, and Morais and colleagues (2021) at most a small one (search-snippet level; the full texts were not read) `[F:VIZ-F10]`.

**The real sources.**
- D. Scott Hartwig's 2012 park-blog post (he was the park's Supervisory Historian) on Guild, Krick and the grading `[F:VIZ-F01,F02]`; Stone Sentinels; Livermore (1901); Wikipedia, which itself prints 23,055 in its text and 23,049 in its infobox for the Union `[F:VIZ-F01]` `[F:ACC-F04]`.
- The model: Wikidata's ranked, qualified, referenced statements and the King's College London "factoid" idea (the latter search-snippet only) `[F:ACC-F03,F05]`.
- 570 unit records with strength, casualties and a one-line key action; among units of at least 100 men, 65 lost 50% or more, 30 lost 60% or more and 10 lost 70% or more `[F:VIZ-F19]`.

**How accuracy is guaranteed.**
- Never silently reconcile. A written rule decides which value is shown first, and the rule is never a claim about which is true `[F:ACC-F03]`.
- Every rung carries source, edition and page. Which Busey and Martin edition gives 28,063 and which 23,231 is unverified `[F:VIZ-F01]`; Wikipedia-derived rungs stay labelled "as reported by Wikipedia" and do not headline a share card until checked in a primary source.
- Ranges, not averages.
- The band is **Modelled**: per-tick values come from the site's bell-curve apportionment (sigma 8 ticks for infantry, 4 for artillery) spreading period totals over tick ranges; the records do not time individual casualties; positions are populated on only 188 of 675 ticks `[F:VIZ-F19]` `[F:IMG-F11]`. Keep band-width ratios under about 25:1 `[F:VIZ-F15]`.
- Unit counts conflict (the 1st Minnesota: 215 of 262 per its historian, 179 by a name-by-name count, 224 in the site's data), so the unit view shows the alternates `[F:VIZ-F05]`. The per-unit killed, wounded and missing split is not in the site's records and needs Fox, Official Records returns or Krick `[F:VIZ-F19]`.
- **The Thinning Choir** (a silent-by-default sonification: one voice per brigade, strength carried by voice count or pitch and never by loudness, with a reference tone) is a **[SPECULATIVE]** stretch only: the evidence for casualty sonification specifically is thin, and it needs a test with blind listeners before any claim `[F:VIZ-F16,F17]` `[F:VIZ-rights]`.

**Effort: M** for the ladder, the ledger engine and the first 30 rows; **L** for the band.

**Rights notes.** Facts are not copyrightable and compilations get only thin protection, but Busey and Martin and Krick figures go in as attributed facts with edition and page, pending the counsel review the plan already schedules `[F:VIZ-F20]` `[F:VIZ-rights]`. The American Battlefield Trust's figures are a link-out only `[F:VIZ-rights]`. Minard's 1869 map is public domain; the Official Records, Fox (1889) and Livermore (1901) are public domain `[F:VIZ-F15,F20]`.

**Share line.** "Seven published Confederate totals, 7,612 apart." And a "the number is a range" card for any headline figure.

---

## 10. The Long Aftermath

**Hook.** After the armies left, the battle's second act began: a tent city for the wounded of both sides, tended by women whose names we know, and a speech whose two Library of Congress manuscript copies lack the words many people remember.

**What you see** *(design intent)*. The clock runs past tick 675 to November 20, 1863. The map settles on the Wolf farm. Date markers: Camp Letterman first ordered by Meade's headquarters on July 5; Surgeon Henry Janes choosing the Wolf farm between July 9 and 14; opening about July 22; a peak documented census of 1,772 patients on August 10, almost half Confederate; a picnic on September 23; in October, 112 Confederate officers and 1,235 enlisted men; the last patient leaving November 17; the medical officers relieved November 20 `[F:INC-IC10]`. Voices of the women who nursed the wounded open in turn, each with a perspective chip: 16 Daughters of Charity arriving July 5 under Fr. James Burlando, Cornelia Hancock on July 6, and the memoirs of Sophronia Bucklin, Anna Holstein and Emily Souder `[F:INC-IC12]`. A card quotes the US Sanitary Commission's report of August 15, 1863: eight corps hospitals visited holding about 14,860 wounded, 11,000 lb of poultry and mutton, 8,500 dozen eggs, 60 tons of perishables by refrigerator car `[F:INC-IC11]`.

A card headed **How many passed through Camp Letterman?** shows a conflict and not a correction. About 4,000 patients, per NPS Seminar historians `[F:INC-IC10]`. "Over 20,000 injured soldiers passed through", per NPS's overview `[F:VIZ-F08]`. And 20,995, which appears to be Letterman's whole-battle wounded count (14,193 Union and 6,802 Confederate, per Wikipedia citing his October 3, 1863 report); reading it as the battle's total and not the camp's is our inference `[F:INC-IC10]`. The page shows all three until Letterman's report and Barnett's essay are read.

Then November 19, and the **Address viewer**: the Nicolay and Hay copies side by side from the Library's public-domain scans, with the difference highlighted: neither has "under God" `[F:INC-IC17]` `[F:COR-F16]`. A closing line asks who was not named that day, within what NPS historian Bert Barnett states: neither Lincoln nor Everett mentioned the wounded survivors; camp staff reportedly stood within feet of Lincoln `[F:INC-IC17]`.

An epilogue: the old men. In 1913 the Great Reunion drew a reported 53,407 veterans (about 8,750 Confederate; both figures confirmed on Wikipedia's article) to 280 acres, with about 5,000 tents, 688,000 meals, 744 hospital admissions and nine deaths in the heat *(the acreage, tent, meal, admission and death figures were not found in Wikipedia's article and remain unverified)*; in 1938, 1,845 veterans, average age 94 *(unverified)*, as Franklin Roosevelt dedicated the Eternal Light Peace Memorial on July 3, before a crowd put at 250,000 in one source (Wikipedia) and 150,000 in a newsreel *(unverified)* `[F:INC-IC18]`. **The page pairs figures, not photographs of the same spot**: the 1938 dedication was at the Eternal Light Peace Memorial, Stop 2 `[F:SITE-OS09]`, and the 1913 panorama's place and date were not verified. A memory strip runs underneath: the Memorial Association chartered April 13, 1864; about 320 monuments by 1895; 1,328 monuments and markers today, about a quarter Confederate `[F:INC-IC19]`.

**Why it lands.** It centres women and care without sentiment: a story most visitors have never heard. The Address pair is a shareable on its own, and the reunion pair is the second: boys, then old men, on a field where memory is made, the argument of the field's best-known scholarship (Blight, Weeks, Reardon) `[F:INC-IC19]`.

**The real sources.** NPS Seminar essays by NPS historians for the hospital (peak census, staff of about 400, an estimate of 40 women of whom seven were Army nurses, closing dates) `[F:INC-IC10]`; the Sanitary Commission report on the Internet Archive (the Library: "unaware of any copyright restrictions") `[F:INC-IC11]`; nurse memoirs and Letterman's report on the Archive `[F:INC-IC20]`; LoC items including a Tyson Brothers photograph with two unnamed nurses and a hospital-department muster roll of 141 names `[F:INC-IC12]`; the Lincoln Papers scans, with the credit line the Library prescribes `[F:COR-F16]`; the Pennsylvania Commission's reunion report (`fiftiethannivers1914penn`) and a 94-second public-domain-marked newsreel `[F:INC-IC18]`.

**How accuracy is guaranteed.**
- **Contested** items show every value: the closing date (NPS's overview says "until January 1864", Barnett says November 17 and 20) and the patient counts `[F:INC-IC10]`.
- Nurse memoirs contain prejudiced descriptions of Confederate patients, and one camp account records blackface minstrelsy at the September 23 picnic: each gets a perspective chip and context, not omission `[F:INC-rights]`. Several operating-room photographs were staged and are flagged on the image `[F:INC-IC10]`.
- Hancock's 1956 and Woolsey's 1969 editions are likely protected: use pre-1931 originals `[F:INC-rights]`.
- The reunion figures came from Wikipedia and Mental Floss and need a primary check against the Pennsylvania Commission's report before they headline anything `[F:INC-IC18]` `[F:INC-rights]`. The 1938 attendance is shown as a range. The treatment of Black veterans at the reunions is unresolved: the page says nothing about it until Blight, Flagel or Hopkins has been read and cited `[F:INC-IC18,IC19]`.

**Effort: M.**

**Rights notes.** NPS Seminar PDFs and Library of Congress items are the backbone; the American Battlefield Trust is link-out only `[F:INC-rights]`. The Lincoln Papers scans are public domain with the credit line "Library of Congress, Manuscript Division, Abraham Lincoln Papers" `[F:COR-F16]`; LoC panoramas say "No known restrictions": recheck each advisory `[F:INC-rights]`.

**Share lines.** "Neither the Nicolay nor the Hay copy of the Gettysburg Address says 'under God'." And a reunion pair of cards (figures as reported, checked in the Pennsylvania Commission's report before publication).

---

### Where the other strong ideas went

The merge kept every strong idea and moved the ones that serve users more than strangers into the parts where they can be sized honestly: Case Files and the Corroboration Lab are Feature 10; the Pocket Battlefield is scoped into Feature 5; Your Regiment, Your Minute is Feature 8; The Thinning Choir is a labelled stretch inside idea 9 and Feature 2. Medal of Honor person cards were dropped as a top-ten idea because the counting rule is itself a conflict (62, 63, 64, 71 or 72, and the 63 is snippet-only) `[F:PPL-P12]`.

---

# PART 2. Ask the Historian, twenty-fold, with no generative AI

## 2.1 The promise, in words that can be kept

> **Every sentence the Historian shows is (a) a verbatim, page-cited quotation, (b) a template filled from a sourced fact row, or (c) a typed statement of what the records cannot say. Each build checks every quotation against its source text. Where sources disagree, the site shows the disagreement. Your question, their own words: nothing is generated.**

The wording is deliberate. The 1863 sources contradict each other and were often self-serving, and even a single Wikipedia article gives two Union casualty totals `[F:ACC-summary]` `[F:ACC-F04]`, so "everything shown is true" cannot honestly be promised. Retrieval grounding alone does not make generated text safe: a Stanford RegLab and HAI study found retrieval-augmented commercial legal research tools still hallucinated 17-33% of the time despite "hallucination-free" marketing `[F:ACC-F14]`. So the site never says "hallucination-free" or "total accuracy"; it promises fidelity and attribution, and it makes the promise checkable. The output is **closed under quote, template or limitation**, and every rendered answer is linted for that on every build. The existing composer already declares "NOTHING IS GENERATED", and the plan lints invariants I1-I8 and validators V01-V12 `[F:ACC-summary]`.

The last sentence of the promise is the contract of USC's Dimensions in Testimony: visitors ask free-form questions and hear an unedited, pre-recorded answer from a real person, never synthesized text, and the coverage grows because thousands of questions are anticipated in advance `[F:EXM-F16]` `[F:ACC-F11]`. Here the recorded answer is a verbatim passage, and the anticipation is a bank of human-authored question annotations (section 2.5f).

## 2.2 What "20x" means, and the baseline

**Today:** 658 records and 11,088 indexed words `[site]`, about 17 words per record *(est.)*; about 110 Historian views a month and about 1,529 raw unique visitors in 30 days (log-based, counted by IP, bots included) `[F:ENG-summary]`. The master plan already targets about 22-27 thousand passages and 4.4-5.4 million words, roughly 400x in words `[F:ACC-opp2]`.

**The arithmetic** *(mine, from the plan's and the research's counts)*:
- 20x records is **13,160**; 20x indexed words is **221,760**.
- Official Records vol. 27 Part 1 alone is 584,253 words, about 52.7 times today's whole index `[F:COR-F01]`.
- The plan's second tranche (all three Official Records parts, about 7.4 thousand passages, 1.65 million words) is about 11x in records and about 149x in words; its third (about 17-18 thousand passages) is about 26-27x in records `[F:ACC-opp2]`. Official Records plus New York (about 3.1 thousand passages) and Pennsylvania (about 4.0 thousand) state books already exceed 13,160 records `[F:COR-opp:20x-floor]`.

So a raw 20x is a **floor, not a stretch**, and word count is the wrong ambition. The right ambition is **useful coverage that does not erode trust**. At the last measured expansion, adding 299 records dropped canonical@1 from 91.4 to 87.9 and correct-decline from 94.1 to 88.2 `[F:ACC-opp9]`: accuracy depends on the pipeline's gates, not on corpus size `[F:ACC-summary]`.

**A "record"** is any independently answerable, source-cited unit: a passage or a structured fact row *(design intent)*.

| Axis | Today | 20x floor | Where it comes from |
|---|---|---|---|
| Records (passages plus fact rows) | 658 `[site]` | at least 13,160, with runway to the plan's 22-27 thousand | Official Records passages (about 7.4 thousand) plus about 6,000-9,000 new fact rows, below: about 14,000-17,000 in all |
| Indexed words | 11,088 `[site]` | at least 221,760 | Official Records Part 1 alone is 584,253 `[F:COR-F01]` |
| Structured, source-ranked fact rows | not measured; Wave 0 measures them | at least 20x the audited baseline *(design intent)* | the fact tables below |
| Entity classes with a card and answerable facts | 4: units (570 records), regiments (467), commanders (543), monuments (512) `[F:VIZ-F19]` `[F:SITE-OS08]` | 12 or more | add graves, photographs, reports, places, dispatches, acoustic reports, sourced quotes, the hospital census |
| Question families, each with golden tests and look-alike declines | not measured; the plan designs 14 composers `[F:ACC-summary]` | 12 families (section 2.5f) | one deterministic composer per family |
| Registered sources, each with tier, imprint year, rights line, fetch date | not stated | at least 40 | the research names well over 40 candidate public-domain works (my count) `[F:COR-F09,F12]` |
| Accuracy | canonical@1 87.9, correct-decline 88.2 at last growth `[F:ACC-opp9]` | no regression at any wave; golden sets only ratchet up | the gates in section 2.5j |

**Where the fact rows come from** *(my sums of the research's own estimates)*:

| Fact table | Net-new rows (est.) | Basis |
|---|---|---|
| `report_and_dispatch_index` | 589 numbered reports plus about 118 dispatch headers (2,201 clock times as anchors) | `[F:COR-F03,F04]` |
| `burial_roll` | about 3,512 grave rows: roughly 2,400-2,500 named and 979 unknown (the unknown are rows, not people) | `[F:PPL-P10]` |
| environment: `astro_by_tick`, `weather_by_day`, `heat_index_bands`, `acoustic_reports`, `sensory_quotes` | about 1,100 itemized (675 + dozens + about 40 + about 300); the research's own estimate for its environment tables is about 3,000-4,000 | `[F:ENV-opp10]` |
| `photo_evidence` | about 107 images, plus 19-21 NPS pairs | `[F:IMG-F02,F07]` |
| `place_cards` | 500 or more | `[F:TER-opp11]` |
| `medal_of_honor` | 62-64, with the counting rule printed | `[F:PPL-P12]` |
| hospital and invasion events | dozens | `[F:INC-IC02,IC10]` |
| `casualty_and_strength_claims` | multi-valued per unit and per total; not estimated | `[F:VIZ-F01]` `[F:COR-F06]` |
| `monuments` | validates the existing 512 against the park's 1903, 1912, 1916 and 1921 location books; no new rows | `[F:COR-F10]` |

That is **about 6,000 (itemized) to about 9,000 (the research's estimate) net-new rows, roughly 9x to 13.7x today's 658 before a single new passage**. Added to the Official Records passages, the total is about 14,000-17,000 records, 21x-26x, and the 13,160 floor is crossed at the end of Wave 2. Left out on purpose: the 2,390-resident census transcription (XL, and the available transcription states no licence, so it would have to be made from images) `[F:PPL-P15]`; commanders and monuments, which already exist in the site's data `[F:VIZ-F19]` `[F:SITE-OS08]`; damage claims; and roster remarks (a pilot only).

**Release R20** is declared when records exceed 13,160, every gate in section 2.5j is green, and at least ten of the twelve question families have golden sets with look-alike declines *(design intent)*.

## 2.3 Source tiers

Every source is registered with a tier, imprint year, rights statement, fetch date and content hash before any text is used *(design intent, in line with the plan's source registry)*.

| Tier | Rule | What qualifies |
|---|---|---|
| **A1: quote verbatim, auto-ingest** | Public domain by date (before 1931) or a US Government work; a curated id allow-list with the title-page year confirmed | Official Records vol. 27 Parts 1-3 (clean OCR, vocabulary proxy about 0.95; three UIUC scans plus 17 full-view HathiTrust copies) `[F:COR-F01,F02,F20]`; the Joint Committee report of 1865, Gettysburg-scoped (clean Question and Answer text) `[F:COR-F08]`; the Lincoln Papers, 302 items for June 25 to July 20, 1863, with transcription and a credit line `[F:COR-F16]` |
| **A2: quote verbatim, ingest with review** | Same rights rule; OCR or scope needs a human | Fox's *Regimental Losses* (335,051 words; tables column-scrambled in plain OCR, rebuilt from word boxes) `[F:COR-F06]`; Battles and Leaders vol. 3, pp. 244-440 `[F:COR-F07]`; state commission books (PA 1914 about 310k words, Maine 1898 about 236k, Michigan about 52k, New Jersey about 58k plus Toombs about 91k, New York, others) `[F:COR-F09]`; the park's monument location books 1903-1921 `[F:COR-F10]`; the cemetery reports (proxy 0.82) `[F:COR-F11]`; Pierce, Jacobs, Hoke, Lockwood, Haskell, Fremantle and other memoirs `[F:COR-F12]`; the Sanitary Commission report `[F:INC-IC11]`; Southern Historical Society Papers vols 4-5 with a Lost Cause tag `[F:COR-F13]` |
| **A3: image-first** | Public domain, but the OCR cannot be quoted | 1863 newspapers (proxy about 0.84) and the Gettysburg Compiler (0.66) `[F:COR-F14,F15,F20]` |
| **B: facts only, attributed** | Copyrighted compilations: store numbers and dates with edition and page; copy no prose; counsel review first | Busey and Martin, Krick, Coco, Howard (casualty figures) `[F:VIZ-rights]` `[F:PPL-P13]`; Nese and Harding's heat-index figures `[F:ENV-rights]`; Frassanito's camera locations `[F:IMG-rights]` |
| **C: link-out only** | Terms forbid reuse, or access is blocked | American Battlefield Trust (bans scraping, framing and AI use) `[F:ENG-E18]`; Gettysburg History holdings (permission required) `[F:PPL-P17]`; the Bachelder Papers at the New Hampshire Historical Society (fees per image; permission to publish) `[F:COR-F17]`; David Rumsey maps (CC BY-NC-SA) `[F:IMG-F11]`; FamilySearch, Fold3, Ancestry `[F:PPL-P07]`; Reveille (blocks automated access; terms unverified) `[F:PPL-P06]`; NPS Soldiers and Sailors rosters until NPS confirms in writing `[F:PPL-P03]`; NYS Military Museum pages `[F:COR-rights]`; CC BY-NC sets (Killed at Gettysburg, Valley of the Shadow) `[F:ENG-rights]` |
| **D: identifiers only** | CC0 | Wikidata labels, aliases and ids; never facts `[F:ACC-F20]` |

**Rights traps handled by the allow-list.** Internet Archive "public domain" flags can be wrong for reprints: the Buehler item's imprint reads "[19--]" and a 1960 Longstreet edition sits beside the originals `[F:COR-F12,F19]`. Prefer non-Google scans (ids ending "goog" carry usage requests) `[F:PPL-rights]`. Southern Historical Society Papers vols 1-44 are pre-1931; later volumes are not `[F:COR-F13]`. The pre-1931 cutoff moves each January 1 (1931 works enter on January 1, 2027), and counsel confirms the arithmetic and state-published items `[F:COR-F19]`. The Morningside edition of the Bachelder Papers is under copyright and borrow-only `[F:COR-F17]`.

## 2.4 The waves, with the research's real counts

Order follows structural regularity and low perspective bias: dated, headed, authored official reports first; memoirs and Lost Cause material only after the contested-topic interface exists `[F:ACC-summary]`.

| Wave | What goes in | Yield *(estimates from the research's counts)* | Exit gate |
|---|---|---|---|
| **W0. Baseline and spine** | Audit what is answerable today by question family; fix the "undefined" output, deep links and the time model; source registry; claim-ledger schema; status ladder; adversarial and verify-claim test sets; gate harness; contributor terms drafted | No new records; every gate live on today's 658 | Gates green on today's corpus |
| **W1. The Official Records spine** | Official Records vol. 27 Parts 1-3; the 589-report index with author, rank and unit; the dispatch ledger (about 118 headers; 2,201 clock-time anchors under dual extraction); the Itinerary (No. 7); the organization lists (Nos. 9 and 424) for commander succession `[F:COR-F01,F03,F04]` | About 7.4 thousand passages (about 11x records) and about 700 rows; **the 20x word floor is crossed here** (Part 1 alone is 52.7x) | Quote gate 100%; anchor precision at least 0.90 |
| **W2. Structured fact tables** | Environment tables, burial roll, photograph ledger, place cards, hospital and invasion events, Medal of Honor with the rule printed, Fox loss rows (killed plus wounded plus missing checksum), monument validation, the public conflict ledger | About 5,300-8,300 rows beyond W1 | **The 20x record floor is crossed**; declare R20 if all gates are green |
| **W3. State books and voices** | Pennsylvania (about 4.0 thousand passages) and New York (about 3.1 thousand), then Maine, New Jersey, Michigan and others as depth allows (Ohio and Vermont are thin); Battles and Leaders pp. 244-440; the Joint Committee slice; cemetery effects lists; the Lincoln Papers; memoirs with perspective tags; Southern Historical Society Papers vols 4-5 (128,762 and 143,397 words) with a Lost Cause tag `[F:COR-F07,F08,F09,F12,F13,F16]` | Toward the plan's third tranche: about 17-18 thousand passages, about 26-27x `[F:ACC-opp2]` | Link precision at least 0.95; abstention curve holds; perspective tags complete |
| **W4. Newspapers, image-first** | A date index of the 1,560 July 1863 pages that mention Gettysburg (135 on July 1-3, 382 on July 4-10), with the page image and a word-box highlight, no OCR quotes `[F:COR-F14,F15]` | An index of page pointers, not text | Image links verified; rights re-checked |
| **Pilot (outside the 20x count)** | Roster-remark extraction from Bates, the New York registers and Moore on one Pennsylvania and one New York regiment, measured against NPS killed, wounded, mortally wounded and captured marks before any scaling `[F:PPL-P09]` `[F:PPL-opp7]` | Precision measured | Only then decide whether to scale |

**Deliberately out of scope for 20x:** the Bachelder Papers (link-out), CWSS roster shards until NPS confirms in writing, Compiler OCR, Busey and Martin prose, and any generated summary `[F:COR-F17]` `[F:PPL-P03]` `[F:COR-F15]` `[F:VIZ-rights]`.

**Rights confirmations gate the waves that depend on them:** counsel on the pre-1931 arithmetic and the Tier B facts, NPS in writing on CWSS data, NCEI for the Jacobs scans `[F:PPL-P01]` `[F:VIZ-rights]` `[F:ENV-F03]`.

**Review budget** *(arithmetic from the research's measured costs)*. The plan budgets 59-95 reviewer hours `[F:ACC-F07]`. At its 40 short link checks an hour, that funds 2,360-3,800 items; at the whole-passage rates Transcribe Bentham measured (207 seconds per check on average over the whole project, 141 in its later period once the tool matured, so 17-25 an hour), it funds about 1,000-2,400 `[F:ACC-F07]`. So the budget pays for the **lead-eligible layer** (lead quotes, structured numbers and times, link confidence C and D, contested topics), and everything else is sample-audited `[F:ACC-opp4]`. At those rates 1,000 reviewed items cost about 39-58 hours *(est.)*.

---

## 2.5 The accuracy architecture

### 2.5a Verbatim spans with hash checks (the quote contract, Q1-Q10)

These are hard build failures, not guidelines `[F:ACC-opp6]`.

1. **Closed output.** Only a quotation, a sourced template or a typed limitation renders `[F:ACC-summary]`.
2. **Verbatim by construction.** Each quote stores a W3C Web Annotation text-quote selector (the exact text plus a prefix and a suffix), a text-position selector (start, end), and the hash of the normalized source snapshot. The build fails unless the quote matches exactly after the written normalization `[F:ACC-F01]`.
3. **Original plus correction.** OCR edits are logged as original and correction pairs (the TEI `sic` and `corr` pattern), so a quote can always be shown "as printed" and any correction reversed `[F:ACC-F19]`.
4. **Digits and names are never auto-edited.** Fuzzy re-anchoring after a re-OCR (the Hypothesis four-step approach) may only *propose* a new position; a human accepts it; a quote that cannot be found returns null and is unpublished, never shown approximately `[F:ACC-F18]` `[F:PPL-rights]`.
5. **Every number carries its source, edition, page and authority rank**, with the wording "about ...; sources differ" wherever they do `[F:ACC-F03]` `[F:ACC-opp1]`.
6. **Perspective and lag tags on every passage:** contemporaneous or retrospective, side, rank, a partisan flag (the Joint Committee; Lost Cause advocacy in the Southern Historical Society Papers), and days between event and writing; in provenance terms, the difference between "had a primary source" and "quoted from" `[F:ACC-F02]` `[F:COR-F08,F13]`.
7. **Review status gates use.** An unreviewed link may help retrieval but can never be the subject of a structured answer; lead quotes and structured numbers need a second, different reviewer `[F:ACC-summary]`.
8. **Newspaper OCR is never quoted;** Fox's tables are rebuilt from word boxes with a killed-plus-wounded-plus-missing checksum, never from plain OCR text, which scrambles the columns `[F:COR-F14,F06]`.
9. **Quote text is stored only for Tier A.** Tier B and C hold offsets or links, because quote selectors copy the text and the specification itself warns about rights-restricted works `[F:ACC-F01]`.
10. **Deterministic rebuild.** The same inputs produce byte-identical shards (the plan's V12) `[F:ACC-summary]`.

**A receipt on every answer.**
- **View scan, highlighted.** The page image with the words boxed, from the Internet Archive's search-inside boxes or precomputed word-box regions; alternate locators are the Archive, HathiTrust (17 full-view copies of Official Records vol. 27) and govinfo `[F:COR-F05,F02]`.
- **Quote in context.** A text-fragment permalink (`#:~:text=prefix-,start,end,-suffix`) on the site's own public-domain page text, as progressive enhancement: it fires only on user-initiated top-level navigation and is ignored if there is no match; supported from Chrome 80, Edge 80, Safari 16.1 and Firefox 131 (per MDN's compatibility data) `[F:ACC-F18]` `[F:ENG-E13]`.
- **Cross-scan checksum.** Independent digitizations of the same page (Internet Archive and UIUC, Cornell, Michigan, the Library of Congress Law Library) are compared character by character; only disagreeing lines go to a human `[F:COR-F02]`.
- **Provenance as data** *(optional)*: static JSON-LD in PROV-O terms (`wasQuotedFrom`, `hadPrimarySource`, `wasAttributedTo`, `wasDerivedFrom`), which costs no runtime bytes `[F:ACC-F02]` `[F:ACC-opp7]`.

### 2.5b The claim ledger and authority ranking

The stored unit is a **source-level assertion**, not a reconciled record: subject, predicate, value, qualifiers (circa, estimated, disputed-by), a reference (source, page, edition, retrieval date) and a rank (preferred, normal or deprecated, with a stated reason). Cards, answers and pages are derived views, so a new source adds rows and can never silently change an old answer `[F:ACC-F03]` `[F:ACC-F05]` `[F:ACC-opp1]`. Known-wrong values are kept as *deprecated* so they are not re-added. Wikidata's own guidance is that ranks are not a way of asserting one's own view of a disputed value `[F:ACC-F03]`.

**Authority ranking** is per field type, written down and public. A first draft *(design intent)*: for casualties, Official Records returns first, then Fox, then Dyer, with Busey and Martin and Krick as "see also" facts with edition and page `[F:ACC-F03]`; for clock times, a dated, headed dispatch outranks a later memoir, and every time shows the lag between event and writing `[F:COR-F04]`. **Ranking decides which value is shown first, never which is true;** every other value stays visible.

The fact tables are the ones in the section 2.2 table (nine rows; the environment row holds five tables).

### 2.5c The conflict ledger: the public "Where the Sources Disagree" page

Eighteen seed rows, each already found in the research. Every row shows all values with source, edition and page; the value shown first and the written reason; the status (*adopted with reason*, *open*, *unresolvable*); and what would settle it. The page is also a data export.

| # | Question | Competing values | Cite |
|---|---|---|---|
| 1 | Confederate casualties | 20,451 (Guild, amended); 22,587 (Krick); 22,709 (Stone Sentinels); 23,231 (Busey and Martin, per Wikipedia); 27,823 (Livermore); 28,000 (NPS); 28,063 (ABT) | `[F:VIZ-F01]` |
| 2 | Union casualties | 23,049; 23,055 (both in one Wikipedia article); 22,822; the site's own corps sum 22,803 (23,138 by engagement period) | `[F:VIZ-F01,F06]` `[F:ACC-F04]` |
| 3 | Forces engaged | 158,343 (NPS: 83,289 US, 75,054 CS); 160,311 ("present for duty equipped", Stone Sentinels, my sum); the site's own 155,011; "more than 165,000" (NPS press kit) | `[F:VIZ-F03]` `[F:PPL-P02]` `[F:SITE-OS08]` |
| 4 | Soldiers' National Cemetery burials | 3,354 (NPS seminar essay, which gives 979 unknown); 3,512 (1865 report); 3,564 (1867 revised report) | `[F:PPL-P10]` `[F:INC-IC06]` |
| 5 | Medal of Honor recipients | 62, 63 (snippet-only), 64, or 71-72, by counting rule | `[F:PPL-P12]` |
| 6 | Camp Letterman | about 4,000 patients (peak 1,772); "over 20,000 passed through"; 20,995 whole-battle wounded; closing November 17-20 against "until January 1864" | `[F:INC-IC10]` `[F:VIZ-F08]` |
| 7 | Pennsylvanians seized by Lee's army | about 50; over 100; at least several hundred; up to 1,000 | `[F:INC-IC02]` |
| 8 | Enslaved people with the Army of Northern Virginia | 6,000-10,000 (HistoryNet: "most scholars"); 4,500-5,000 (source not yet located; held) | `[F:INC-IC03]` |
| 9 | Elizabeth Thorn's burials | 91 to 105 | `[F:INC-IC08]` |
| 10 | Confederate dead sent to Richmond | 2,273; 2,935 (the latter Wikipedia-derived) | `[F:INC-IC06]` |
| 11 | Weaver's effects packages | 287; 278 | `[F:INC-IC06]` |
| 12 | The 1st Minnesota's losses | 215 of 262 (Lochren); 179 by name (Meinhard); 224 in the site's data | `[F:VIZ-F05]` |
| 13 | Unit loss rates | the 26th North Carolina's 588 of 843 against "714 of 800" in the plan's earlier text; the 8th Virginia's 92.2% against 76.7% | `[F:VIZ-F05]` |
| 14 | Wind on July 3 | about 12 mph; about 2 mph | `[F:ENV-F02]` |
| 15 | The morning of July 2 | Jacobs (pleasant, calm, sun through smoke); Haskell (thick, sultry, overcast) | `[F:ENV-F10]` |
| 16 | When Gardner's team worked | July 5; July 5-6; after July 7; July 7 | `[F:IMG-F03,F20]` |
| 17 | Black population of Gettysburg | 186; 188 (157 plus 31); "under 200" | `[F:INC-IC01]` `[F:PPL-P15]` |
| 18 | Contested clock times | Reynolds's death, the start of Pickett's Charge, Longstreet's attack, already tracked in the plan's contested registry | `[F:ACC-opp1]` |

**Held until read in a primary source:** the Irish Brigade's 530 against "nearly 600" (snippet-only), the "Black Garibaldians" and the Humiston story `[F:INC-IC14,IC15]` `[F:INC-opp14]`. **Struck as exhibit trivia, not history:** the Cyclorama's weight and cost and the Electric Map's light count `[F:IMG-F13]` `[F:EXM-F07]`.

### 2.5d The geo-temporal index

Every passage and fact row carries a **tick range, place ids, unit ids, a day and a precision chip** (reported, inferred, about, or month-only) `[F:EXM-opp1]` `[F:IMG-F02]` *(design intent)*.
- **Time.** All values in 1863 local mean time, with the 8.9-minute EST shift documented and an EST toggle `[F:ENV-F09,opp13]`. Anchors come from Official Records dispatch headers (a small time grammar with logged OCR-variant repairs), the Itinerary and Jacobs's timestamps `[F:COR-F03,F04]` `[F:ENV-F11]`. Two independent extractors must agree on the minute and the day; every disagreement goes to review; the agreement rate is published per source `[F:ACC-opp5]` `[F:ACC-F20]`. Where a fact rests on one of the 188 keyframed ticks, the answer says so `[F:IMG-F11]`.
- **Place.** A gazetteer of 500 or more named places with DEM elevation and 1863 owners from Bachelder (1:12,000), Cope's 1863 map, the 1858 Adams County map, the Park Commission map and HABS/HAER farm records; modern avenues were built in 1882-1917 and are kept as a separate layer `[F:TER-T08,T09,T10]`. Aliases: Slaughter Pen and Devil's Den were used interchangeably `[F:IMG-F07]`.
- **Postings** are time-conditioned and entity-conditioned, so "Where was the Fifth Corps on June 29?" resolves to a dated Itinerary entry, report number and page `[F:COR-opp:daily-movement]`.
- **Photographs** carry a camera confidence class and a date *range* `[F:IMG-opp1]`. **Newspapers** are indexed by date `[F:COR-F14]`.

### 2.5e The entity graph

**Nodes:** units (570 records), regiments (467), commanders (543), monuments (512), places (500 or more), photographs (about 107), reports (589), graves, passages `[F:VIZ-F19]` `[F:SITE-OS08]`. **Edges:** commanded-by (with tenure), part-of, authored-by (report author from the table of contents), present-at, photographed-at, buried-in, owned-by (1863 owner), monument-of, mentioned-in, each with provenance and a link confidence of A to D `[F:COR-F03]` `[F:TER-T09]`.

- **Aliases and identifiers.** Wikidata is a CC0 crosswalk for labels, aliases and ids (the 20th Maine Q4630787, the Iron Brigade Q1382693, Chamberlain Q80766), not a fact source: its claim lists were thin, and only about 80 humans are tagged to the battle `[F:ACC-F20]` `[F:PPL-P20]`.
- **Collisions are regression tests.** "Iron Brigade" returns four entities (a Union brigade, a Confederate cavalry brigade, a video game, a disambiguation page), so side-and-arm agreement is tested (the plan's V11) `[F:ACC-F20]`. So are spellings: Brian, Bryan and Brien; Jennie and Ginnie Wade; "Mag" and Margaret Palm; Anna, not Sarah, Garlach `[F:INC-rights]`.
- **Linking without a model:** a grammar linker plus pattern-id matching (the spaCy EntityRuler idea) with explainable match weights (the Splink idea); links below grade B never feed structured answers `[F:ACC-F20]` `[F:ACC-summary]`.

### 2.5f Deterministic composers and retrieval

**Twelve question families**, each with golden questions and look-alike declines `[F:ACC-opp9]` *(design intent, drawn from the research's example questions)*:

| # | Family | Example | Composer output |
|---|---|---|---|
| 1 | Where was a unit | "Where was the Fifth Corps on June 29?" | Itinerary text, report number and page; or a keyframe; or "no record at that time" `[F:COR-opp:daily-movement]` |
| 2 | Who reported what | "What did Colonel Chamberlain report?" | Report No. 196, printed page, scan link, a verbatim passage `[F:COR-F03]` |
| 3 | What was written when | "What did headquarters write at 2:40 a.m. on July 2?" | The dispatch row: sender, addressee, place, written time, precision chip, quote `[F:COR-F04]` |
| 4 | Conditions | "What time was sunset on July 2?" "Was there a moon?" | Weather and sky rows with badges `[F:ENV-opp10]` |
| 5 | Could they hear or see | "Did Ewell hear Longstreet?" | A Contested card with pins and sources, and the lag arithmetic `[F:ENV-F15,F17]` |
| 6 | People | "Is a Pvt. X of the 16th Maine in the roll?" | A roll card with edition, page and scan; "his regiment was present" language for presence questions `[F:PPL-P10]` |
| 7 | Places | "Who owned that farm in 1863?" | A place card from the Cope and Park Commission maps `[F:TER-T09]` |
| 8 | Numbers, with conflicts | "How many Confederates were lost?" | The ladder, never one number `[F:VIZ-F01]` |
| 9 | Photographs | "Where was 'A Harvest of Death' taken?" | A ledger card with confidence class, date range and caption disputes `[F:IMG-F08]` |
| 10 | Monuments | "When was this monument first listed?" | Edition and page of the park's location book `[F:COR-F10]` |
| 11 | Aftermath, medicine and the press | "How many patients did Camp Letterman hold?" "What did New York print on July 7?" | Census rows with the conflict explained; page-image pointers `[F:INC-IC10]` `[F:COR-F14]` |
| 12 | Verify a claim | "Was the cannonade at 1 p.m.?" | Supported, Refuted or Not enough information, with the quote, scored with evidence included, the way FEVER scores it `[F:ACC-F14]` |

Template sentences are human-written functions over fact rows. Abstract Wikipedia is the large-scale precedent for auditable, function-based composition, and its slow pace is the warning: template coverage is the bottleneck, which argues for a small, closed set of families `[F:ACC-F06]`.

**Answer-card anatomy** *(design intent)*: the sentence (a template or a quote); the badge; the citation with edition and page; **View scan**; **Where the sources differ**; and the map jumps to the tick.

**Closing the vocabulary gap without a model.** The plan measured BM25 recall@5 of only 27% on plain-language phrasing `[F:ACC-F10]`. Instead of model-written query expansion, a **question-annotation bank**: humans attach three to eight phrasings to the highest-value passages and fact rows, matched through the existing alias, lexicon and stemming pipeline. This is MIT's START design, in use since 1993, and the way Dimensions in Testimony anticipates questions `[F:ACC-F10,F11]` `[F:ACC-ex:START]`. Add the period-English word list the plan already generates, Wikidata aliases and the plan's neighbour statistics, and keep annotation items separate from evaluation items so the two do not contaminate each other `[F:ACC-opp3]`. Lexical retrieval stays first: BEIR found BM25 a robust baseline, with re-ranking and late-interaction models best on average but at high computational cost and dense retrieval often underperforming, so a semantic layer would add cost and lower auditability (an earlier draft's "9-19 points in domain" figure could not be found in BEIR's abstract and is dropped), so it stays **off** and, if ever added, is retrieval-only `[F:ACC-F13]`.

### 2.5g Refusals

Refusals are designed content, in typed kinds adapted from the three off-topic responses of NPCEditor, the engine behind Dimensions in Testimony: *could not understand*, *no record in the corpus*, *outside the sources we hold* `[F:ACC-F11]`. Each names the source that would answer. The existing known-unknowns rules stay (the weather of an individual, an individual soldier, rosters, what someone was thinking) `[F:ACC-summary]`. For a person: "I cannot tell whether a specific soldier was at Gettysburg; this site holds regiments, not muster rolls", with a route to Feature 8 `[F:PPL-opp6]`. A public page, *What the records cannot answer, and what source would*, makes the refusals browsable. An opt-in "send this unanswered question to the historian" button (nothing leaves the device unless ticked) is deferred until the privacy page is revisited `[F:ENG-opp07]` `[F:ENG-rights]`.

### 2.5h Human verification

- **A status ladder:** *unreviewed* (retrieval boost only) -> *proofread* (one reader) -> *validated* (a different person). Only validated items may lead an answer or feed a number or a time. This is Wikisource's different-user rule and FromThePage's Needs Review state `[F:ACC-F09]`.
- **Sequential, not blind:** the second reader sees the first reader's call. In the Anti-Slavery Manuscripts A/B test, collaborative transcription scored significantly higher than independent keying, and aggregated blind output still needed considerable intervention `[F:ACC-F08]`.
- **Risk-ranked.** Human hours go where an error is expensive: lead quotes, every number and time in a structured answer, links graded C or D, every dual-extractor disagreement, contested topics. The rest gets a random audit sample of at least 5% (the Library of Congress By the People programme reports that its staff reviewed at least 5% of datasets) `[F:ENG-E05]` `[F:ACC-opp4]`.
- **Cost evidence.** Transcribe Bentham: 4,364 transcripts checked, only 1% of 1,180,829 words changed, an average 207 seconds per check; but 17% of early transcripts took 45% of checking time `[F:ACC-F07]`.
- **Who.** A named historian owns contested items; a small, trained pool of second readers (licensed battlefield guides, round-table historians, Gettysburg History staff, named with consent) does the validated rung `[F:ACC-opp12]` `[F:ENG-opp06]`. Zooniverse found aggregated crowd output still needed heavy intervention and Bentham's result followed heavy up-front investment, so the design is a small pool, not an open crowd `[F:ACC-F08,rights]`.
- **Backlog rule:** freeze ingestion after 14 days of unreviewed queue `[F:ACC-rights]`.

### 2.5i Corrections

- A public **Corrections** page with typed forms (location, name or unit, source suggestion, typo), each requiring a citation. It is the only intake in this pitch `[F:ENG-opp06]`.
- **Two-key rule:** accepted only when the owner and one named second reader agree, with a sample spot-checked; By the People marks a page complete when two volunteers agree, and the Library reports staff review of at least 5% of datasets `[F:ENG-E05]`.
- A correction **deprecates** a value with a reason instead of overwriting it, is stored as a quote-plus-context selector so it survives a re-OCR, and appears in a **dated public changelog** `[F:ACC-F03,F01]`.
- A 24-hour takedown route for sensitive items (the plan's own target) `[F:ENG-rights]`. A trust KPI: corrections received per 1,000 views `[F:ENG-opp16]`.
- Intake runs through Netlify Forms with a honeypot and the built-in Akismet filter, not a Google CAPTCHA script; the privacy page must first be rewritten to say what is stored and for how long, and contributor terms, a credit policy and a retention period are written before the form opens `[F:ENG-E16]` `[F:ENG-rights]` `[F:ACC-rights]`.
- **The first changelog entries write themselves.** "Sarah" Garlach is Anna Louisa Garlach `[F:INC-IC09]`; the widely repeated 14,000 and 6,800 "treated at Camp Letterman" figures match Letterman's whole-battle wounded counts (our inference, to confirm) `[F:INC-IC10]`; the Adams Sentinel and Compiler are not digitized at the Library of Congress `[F:INC-IC20]`; and a summarizer dated Jacobs's June 26 passage to July 1 `[F:ENV-F12]`.

### 2.5j Measurable accuracy gates

A wave ships only if every gate is green. Thresholds marked *(design intent)* are proposals to set after the Wave 0 baseline. Golden sets only ratchet up in CI.

| Gate | Threshold | Basis |
|---|---|---|
| Verbatim integrity | 100% of displayed quotes match their source exactly after normalization; the build fails otherwise | `[F:ACC-F01,F18]` |
| Digit and name safety | zero automatic edits to digits or capitalized tokens | `[F:ACC-F19]` |
| Number provenance | 100% of shown numbers carry source, edition, page and rank | `[F:ACC-summary]` *(design intent)* |
| Anchor and link precision | at least 0.90 and at least 0.95 (the plan's targets) | `[F:ACC-opp5]` |
| Two-extractor agreement | reported per source; anchors accepted only on agreement | `[F:ACC-opp5]` |
| Fox rebuild | killed plus wounded plus missing checksum, 100% | `[F:COR-F06]` |
| Reviewer coverage | 100% of lead quotes and structured numbers validated by two people; at least a 5% sample of the rest | `[F:ACC-F09]` `[F:ENG-E05]` |
| Look-alike slice | false-answer rate on questions that share an entity and intent with an answerable one but lack support, with a ratcheting target (propose 2% or lower) | `[F:ACC-F12]` *(design intent)* |
| Claim verification | Supported, Refuted or Not enough information, scored with evidence included | `[F:ACC-F14]` |
| Abstention curve | canonical@1 and correct-decline re-measured after every wave; no wave ships if either falls more than one point below the previous wave without a documented fix (the last measured drop was 3.5 and 5.9) | `[F:ACC-opp9]` *(design intent)* |
| Conflict surfacing | every answer drawn from a row with an open conflict shows the conflict | `[F:ACC-opp1]` |
| Alias collisions | zero regressions on the Iron Brigade-style set | `[F:ACC-F20]` |
| Receipts | 100% of Tier A answers carry a locatable scan highlight | *(design intent)* |
| Search cost | cold query at most about 120 kB; one-letter, punctuation and degenerate queries capped and tested | `[F:ACC-F15]` |
| Rebuild | byte-identical shards from identical inputs (V12) | `[F:ACC-summary]` |
| Correction SLA | sensitive items 24 hours; others a weekly batch | `[F:ENG-rights]` |
| Per-source definition of done | tier, imprint year, rights line, fetch date and reviewer recorded | *(design intent)* |

**Kill criteria** *(design intent)*: pause a wave if the quote gate drops below 100%, if dual-extractor agreement for a source falls below the anchor-precision floor, or if the reviewer backlog passes 14 days.

### 2.5k Static scale and hosting

- **Architecture:** content-hashed shards and a 128-bucket index with a cold-query budget of about 120 kB; at the plan's third tranche that is an index of 2.4-3.1 MB compressed and 10-13 MB of text `[F:ACC-F15,F17]`.
- **Benchmark before scaling:** run Pagefind (MIT; prefix-chunked static index; vendor claim under 300 kB total for a 10,000-page site, about 90 kB initial and 200 kB per typical query in its author's talk) over the same passages for bytes per query, p95 latency and recall@5, and copy the lesson of its Unity-manual issue: one-letter and punctuation queries produced multi-second freezes `[F:ACC-F15]`.
- **Research branch:** SQLite full-text search over HTTP Range requests for the structured tables, gated on the open Netlify Range spike; its author calls the library small-project grade, and the smallest index setting disables phrase queries the Historian needs `[F:ACC-F16]`. In-memory JavaScript libraries are for the small entity and alias tiers only `[F:ACC-F17]`.
- **URL state:** `#q`, `#unit`, `#clock` permalinks, so a reviewed answer is a citable object, and nothing about the question goes to a server `[F:ACC-opp13]` `[F:EDU-E18]`.

## 2.6 What a visitor can ask on the day R20 ships

| Question | Answer shape | Source |
|---|---|---|
| What time was sunset on July 2? | 19:32 local mean time (19:41 EST), USNO | `[F:ENV-F07]` |
| Was there a moon on the night of July 2? | 97% lit, rising about 20:38 local mean time (re-run USNO before shipping) | `[F:ENV-F08]` |
| How hot was it during Pickett's Charge? | 87 F in shade at 2 p.m. (Jacobs, **Measured**); an estimated heat index of about 98-105 F (Nese and Harding, **Modelled**) | `[F:ENV-F01,F05]` |
| Did it rain on July 3? | A thunderstorm in the neighborhood about 6 p.m. (Jacobs) | `[F:ENV-F02]` |
| Could Harrisburg hear the guns? | A July 3, 1863 Telegraph item reporting cannonading is known only through a secondary blog and unverified until read on Chronicling America; sound lag about 2.7 minutes; Pittsburgh is oft-repeated and unverified | `[F:ENV-F16,F17]` |
| Did Ewell hear Longstreet's guns? | **Contested**: a hypothesis (Ross, Hippensteel); no published model found; a card with no invented certainty | `[F:ENV-F15]` |
| What did Chamberlain report? | Official Records report No. 196, verbatim quote and scan | `[F:COR-F03]` |
| What did headquarters write at 2:40 a.m. on July 2? | The dated dispatch, verbatim, with sender and written time | `[F:COR-F04]` |
| Where was "A Harvest of Death" taken? | A photo-ledger row with confidence class and any caption dispute | `[F:IMG-F08]` |
| How many Confederates were lost? | The ladder, not a number | `[F:VIZ-F01]` |
| Was my ancestor at Gettysburg? | "This site holds regiments, not muster rolls; his regiment was present", with link-outs | `[F:PPL-P01]` |
| Who owned that farm in 1863? | A place card from the Cope and Park Commission maps | `[F:TER-T09]` |
| What did the battlefield smell like? | Pierce, July 7, from a memoir published in 1889 and tagged retrospective: "the stench arising from the fields of carnage was most sickening"; Jacobs's June 26 line is about a marching brigade, not the battlefield, and is labelled so | `[F:ENV-F11,F12]` |

## 2.7 What it will NOT do

1. **Generate a sentence**, at runtime or at build time: no model-proposed links, no model query expansion, no semantic reranker, no "Explain these sources (AI)" button `[F:ACC-rights]` `[F:ACC-opp3]`.
2. **Claim "total accuracy" or "hallucination-free"** `[F:ACC-F14]`.
3. **Say a person was at Gettysburg from an index hit.** The wording is "served in a regiment that was present" `[F:PPL-P01,P05]`.
4. **Say what a general "knew",** or when he received a dispatch, unless a source states it `[F:COR-F04]`.
5. **Quote newspaper OCR,** or correct digits and names automatically `[F:COR-F14]` `[F:ACC-F19]`.
6. **Show wind, smoke or per-tick temperature** before Jacobs's scan is read `[F:ENV-F02]`.
7. **Settle a conflict by averaging** or by a silent choice `[F:ACC-F03]`.
8. **Ingest or scrape** CWSS rosters, Reveille or FamilySearch; ingest Busey and Martin or Krick prose; reuse American Battlefield Trust content (link-out only) `[F:PPL-P03,P06,P07]` `[F:VIZ-rights]` `[F:ENG-E18]`.
9. **Treat Wikipedia as an authority:** it is CC BY-SA and secondary, so it supplies leads only `[F:ACC-rights]` `[F:ENV-F12]`.
10. **Log visitors' questions,** or run open comments, a forum or crowd intake: nothing leaves the device unless a visitor ticks it `[F:ENG-rights]` `[F:ENG-E09]`.
11. **Open verification to an open crowd:** a small named pool only `[F:ACC-F08]`.
12. **Answer what the corpus cannot:** individual soldiers' thoughts, rosters, the weather at a person's location. It declines, in a typed way, and says what source would `[F:ACC-summary]`.

## 2.8 Plan conflict, substitutes and risks

**The conflict.** The master plan's WP-HIST-18 (build-time model-proposed links and "T0+" query expansion), its optional Stage B (a semantic reranker) and Stage C (a per-click "Explain these sources (AI)") use or permit generative AI. They contradict the owner's constraint, and the plan's AI-disclosure copy would need rewriting `[F:ACC-rights]`. Each has a deterministic substitute:

| Plan step | Substitute |
|---|---|
| Model link proposals | Grammar linker plus pattern-id matching plus explainable match weights; disagreements go to review `[F:ACC-F20]` |
| Model query expansion | The question-annotation bank, the period word list, Wikidata aliases `[F:ACC-F10,F20]` |
| Semantic reranker (Stage B) | Off; if ever enabled, retrieval-only `[F:ACC-F13]` |
| "Explain these sources (AI)" (Stage C) | Dropped; the twelve composers cover the intents |

**Risks and mitigations.**

| Risk | Mitigation |
|---|---|
| Reviewer capacity is the stall risk | Risk-ranked review, sample audits, the 14-day freeze, a named historian `[F:ACC-rights]` |
| Abstention degrades as the corpus grows | Re-tune and archive the curves at every wave `[F:ACC-opp9]` |
| OCR errors in names and digits; Fox's tables scramble; newspapers are noisy | Word boxes, checksums, image-only display `[F:COR-F06,F14,F15]` |
| Rights: reprint contamination behind archive flags; NYS museum pages all-rights-reserved; Bachelder behind fees; Rumsey NC-SA | Allow-list, facts-only tiers, link-out, permission requests `[F:COR-rights]` `[F:VIZ-rights]` |
| Perspective bias: partisan Joint Committee, Lost Cause advocacy, memoirs written decades later | Perspective chips and lag in days; no memoirs before the contested-topic interface `[F:COR-F08,F13]` |
| The "total accuracy" wording | The fidelity sentence in section 2.1 `[F:ACC-rights]` |
| The time model is unresolved (5 of 33 anchors) | Everything time-conditioned is labelled **Modelled** until signed `[F:ENG-rights]` |
| Static-hosting unknowns: Netlify Range and compression; Pagefind not fuzzed at 100,000 files | A spike before choosing the SQLite branch `[F:ACC-rights]` |
| A crowd is not free accuracy | A small trained pool, sequential review `[F:ACC-F07,F08]` |
| Research-process errors (a summarizing fetcher) | Check every figure and quote against the primary scan `[F:ENV-rights]` |

---

# PART 3. Ten existing features, overhauled

These are the pages that would gain the most. Ask the Historian is Part 2, and the Part 1 ideas that touch a feature (the dispatch ledger, the lidar swipe, the Wolf Farm timeline) are cross-referenced and not repeated. "Today" is the research's reading of the live or legacy page, and where the research could not open a page it says so.

| # | Feature | Today, in one line | The leap | Tier |
|---|---|---|---|---|
| 1 | Animated map and timeline | A 5-minute clock with sparse keyframes, a known clock error and dead deep links | A Master Clock with evidence lanes, and a share-and-cite engine | L |
| 2 | Immersive | Cannon sounds on 662 of 675 ticks | Sound pinned to documented fire windows | M |
| 3 | What They Could See | A terrain-only viewshed on unverified elevations | A validated viewshed engine on lidar-grade terrain | L |
| 4 | Battlefield AR | A never-field-tested compass overlay | AR that draws its own error bars | M |
| 5 | Virtual Walkthrough | 16 stops that mirror the NPS tour | A silent Stop Companion and an offline pack | L |
| 6 | Casualty Dashboard | Corps trends from a modelled curve | Three honest views: burden, marks, range | M |
| 7 | Living Ledger | A running counter | A band with observed and modelled labelled apart | M |
| 8 | Follow-Your-Ancestor | Regiment lookup | Your Regiment, Your Minute | L |
| 9 | Regimental Biography | A stat block | A dossier with a conflicts panel | L |
| 10 | Gettysburg for Students | A day-tabbed list of 24 vignettes | Case Files, a Corroboration Lab, a no-account class kit | L |

---

## Feature 1. Animated map and timeline: the Master Clock and the reach engine

**Today.** 675 five-minute ticks over 570 units `[site]`; unit placements keyframed on only 188 of 675 ticks (1,804 keyframes) `[F:IMG-F11]`; a piecewise clock error averaging 4.8 hours (tick 60 shows 9:55 on one page and 10:55 on the app) `[F:EDU-rights]`; deep links other than `?ancestor=` do nothing and every shared `og:image` was corrupt `[F:EDU-E19]` `[F:EXM-opp14]`.

**The leap.** The clock becomes the product's spine, the Apollo way: everything the site knows is pinned to a minute, and everything shareable is one click from a minute.

**How it works.** Every Historian passage, photograph, dispatch, monument and regiment card is pinned to a tick, and clicking any item jumps the map to that minute `[F:EXM-opp1]`. A two-layer timeline (a three-day overview and five-minute ticks). Thin synchronized lanes under the slider for documents, weather and sun and moon, modelled casualties and reports filed per hour `[F:EXM-opp6]` `[F:ENV-opp1]`. A **Why is this here?** drawer on every marker listing evidence class, date precision, keyframe density, scan link and a "what we do not know" line `[F:EXM-opp9]`. A local-mean-time and modern-Eastern toggle `[F:ENV-opp13]`.

**The reach engine inside it** *(the share-and-cite half of the same build)*:
- Map state lives in the URL fragment, which is never sent to a server `[F:EDU-E18]`.
- 675 pre-rendered 1200 x 630 share cards, plus a card per unit and monument, with alt text (Open Graph wants at least 1200 x 630, about 1.91:1, under 8 MB) `[F:EXM-opp14]` `[F:ENG-E12]`.
- "Copy quote with link" via text fragments `[F:ENG-E13]`; Highwire `citation_*` and Dublin Core tags so Zotero saves a real citation, plus a Cite box in Chicago, MLA and APA `[F:ENG-E13]`.
- oEmbed discovery, tested against Slack, Notion and WordPress before promising it `[F:ENG-E12]`; Web Share on phones with a copy-link fallback.
- RSS, a JSON Feed and a yearly calendar file, with no tracking parameters in any shared URL `[F:ENG-E15]`.
- An export-and-import code for saved lists, because browser storage is per device and Wordle's streak resets after its sale showed how fragile local state is `[F:ENG-opp15]` `[F:ENG-E01]`.

**Why it is amazing.** Visualizing Emancipation showed what thin synchronized lanes do: visitors discover the correlations themselves `[F:EXM-F08]`. Wordle's growth followed a spoiler-free share artifact, so a card per minute is the mechanism `[F:ENG-E01]`.

**Dependencies.** Time-model sign-off and the URL-state work come first. The audit of Rumsey's 23 time-stamped Warren and Bachelder maps against the keyframes is deferred: the set is CC BY-NC-SA and its troop symbols are unverified `[F:IMG-F11]`. **Tier: L.**

---

## Feature 2. Immersive: documented sound

**Today.** A procedural soundscape built from troop density; the cannon cue plays whenever artillery is active, which is true on 662 of 675 ticks, including all 135 night ticks `[F:ENV-opp5]`.

**The leap.** Sound that follows evidence instead of troop density, and that anyone can use.

**How it works.**
- Schedule cannon from documented fire windows: Jacobs timed the July 3 cannonade from seven minutes past 1 p.m., and Wikipedia says Ewell's guns opened from Benner's Hill at 4 p.m. on July 2 (to verify); label everything else "model" `[F:ENV-F11,F15]`.
- Delay each cue by distance over the speed of sound, about 4.6 seconds per mile at 87 F `[F:ENV-F17]`; add a calm night bed; make the July 3 thunderstorm an event `[F:ENV-F02]`.
- A toggle: **what they heard (documented)** against **ambient bed** `[F:ENV-opp5]`.
- Access and safety: click-to-start (browsers block autoplay and Web Audio starts suspended), captions and a transcript, a limiter, a mute, a volume ramp, and a loud-sound warning, since the Foundation flags sudden loud battle sounds in its own film `[F:EDU-E18]` `[F:SITE-OS12]`. A visible label: "synthesized model, never recordings" `[F:EXM-rights]`.
- **[SPECULATIVE] stretch:** the Thinning Choir of idea 9, silent by default, with the mapping rules published beside it `[F:VIZ-F16,F17]`.

**Why it is amazing.** Sound stops being wallpaper and becomes a sourced layer: the guns arrive late, and silence appears where the evidence says nothing was heard. The precedents are Two Trains (instrument count carries the data) and the Chandra sonifications, whose published survey (3,184 participants, a convenience sample) reported learning gains and mostly positive emotional responses in both blind or low-vision and sighted listeners `[F:VIZ-F17]`.

**Dependencies.** The `acoustic_reports` table from Part 2, the corrected time model, the plan's sound rules, a taste review, and a test with blind users before any accessibility claim `[F:VIZ-rights]`. **Tier: M.**

---

## Feature 3. What They Could See: a validated viewshed engine

**Today.** A terrain-only viewshed; the terrain file's elevations and 30 coordinates need to be read from the real DEM; the plan's V3 line says smoke is not included `[F:TER-opp1]` `[F:ENV-opp7]`. The experience built on it is idea 8; this is the engine.

**The leap.** From a sketch of sightlines to a viewshed that can be checked against accounts.

**How it works.**
- Read elevations from the USGS 1 m DEM, with a continuous-integration check of 20 random points against USGS's point-query service (anchors: Little Round Top crest 665.5 ft, Big Round Top 783.3 ft, the Copse area 578.6 ft) `[F:TER-T04]`.
- A pre-baked atlas of 40-60 documented vantage points as small transparent masks, plus a live "place your own" ray-caster in a worker `[F:TER-opp2]`. A synthetic 5 km viewshed on a 5 m grid ran in 47 ms and the earlier prototype on real data in 236 ms; phones are an unmeasured 3-10 times slower, so show a progress bar `[F:TER-opp2]`.
- **Dead ground** and the three-vantage comparison, each vantage tagged documented or hypothetical `[F:TER-opp4,opp5]` `[F:TER-T15]`.
- A **validation harness**: four account-based cases run against the model and any disagreement is published, never tuned away `[F:TER-T16]`. GDAL's `gdal_viewshed` (the Wang, Robinson and White method) is the independent reference implementation to cross-check the browser output `[F:TER-T20]`.
- **Not in the first release:** the fog-of-war toggle and the smoke layer.

**Why it is amazing.** "Stand where Warren stood" becomes a computed, falsifiable claim, in the footsteps of the published Knowles work `[F:TER-T15]`.

**Dependencies.** Offline processing of roughly 5 GB of compressed point-cloud files for the core (58 tiles, about 4,966 MB listed by The National Map; estimate) `[F:TER-T02]`; compute from USGS data and never from Mapbox terrain, and have counsel read Mapbox's clauses 1.6, 1.9 and 2.8.1 `[F:TER-T19]`; primary citations for the test cases `[F:TER-T16]`. **Tier: L.**

---

## Feature 4. Battlefield AR: honest AR

**Today.** A fixed 70-degree field of view; a raw compass heading (`webkitCompassHeading` or 360 minus alpha) with no declination correction; the 30 terrain key locations within three miles; never field-tested at Gettysburg; and at Little Round Top 22 of the 30 labels stack `[F:SITE-OS17]`.

**The leap.** AR that shows its own error bars and never claims more than the sensors can deliver.

**How it works.**
- A camera-aware field of view and a declination-corrected heading. The declination, about 10 degrees west, is the plan's note and is unverified; get a NOAA key or the World Magnetic Model coefficients `[F:SITE-OS20]`.
- An **uncertainty wedge**: about 10 degrees of compass error is about 88 m of lateral error at 500 m (my arithmetic), and phone GPS is about 4.9 m under open sky and worse under trees `[F:SITE-OS17]`.
- A one-tap **align to landmark** using the three surviving observation towers (West Confederate Avenue 75 ft, Culp's Hill 60 ft, Oak Ridge 23 ft) `[F:SITE-OS08]`; de-overlapped labels; a 1863-versus-today vegetation toggle, because NPS has removed non-historic trees and replanted woodlots and orchards `[F:SITE-OS08]` `[F:TER-T13]`.
- Quiet zones: no labels over graves, no prompts to climb monuments `[F:SITE-opp12]` `[F:SITE-OS11]`.
- **[SPECULATIVE]** A "see the 1863 view" overlay for Class A Gardner poses only, from idea 3.

**Why it is amazing.** A 10-degree error is fine for "look toward the Wheatfield" and not for picking one regiment's position, and saying so builds the trust that polished but wrong overlays destroy. It is the AR that shows its own error bars.

**Dependencies.** **No accuracy claim until field tests on two phones at Little Round Top, the Angle and Oak Ridge** `[F:SITE-OS20]`. The Wake Lock is released when the page is hidden and the web cannot run background geofences, so the screen stays on `[F:SITE-OS16]` `[F:SITE-rights]`. **Tier: M.**

---

## Feature 5. Virtual Walkthrough: the Stop Companion and the offline pack

**Today.** Sixteen stops that mirror NPS's 16-stop Auto Tour; NPS's own virtual tour has the same structure `[F:SITE-OS05]`. Narration is a crowded market: the free NPS app has 4.85 stars from about 131,656 iOS ratings, and the paid leader has 4.80 from 2,870 `[F:SITE-OS05,OS06]`. Reviews of the paid apps list failing GPS triggers, hard-to-find starting points, stale detours, no signal, crashes and price resentment `[F:SITE-OS07]`.

**The leap.** Do not out-narrate them: become the silent companion that works with no signal.

**How it works.**
- **A Stop Companion:** a silent, glanceable card per stop that runs beside the NPS audio: who was here at each tick, the monuments in sight, the nearest accessible and tactile-table spot (the bronze relief tables at Stops 2, 5 and 16), the lot's capacity and an alternate (6 spaces at the Virginia Memorial, 29 at the Eternal Light Peace Memorial, 31 at Little Round Top), a link into the NPS tour, and a "source and last updated" line `[F:SITE-OS09,OS15]`. A printable **Field Journal** page per stop with three retrieval-first questions and a QR code `[F:ENG-opp09]`.
- **Plan my visit:** a time budget (the Auto Tour is 24 miles, 16 stops, two to three hours), a battle day, mobility needs and the season; a printable itinerary that avoids tiny lots, shows closures from NPS alerts where the park publishes them, uses NPS's own heat thresholds (programs shorten above a heat index of 91 and cancel above 103) and computes open hours from sunrise and sunset plus or minus 30 minutes `[F:SITE-OS05,OS09,OS10,OS11,OS13]`.
- **If the desk is closed:** a static page for shutdowns and off-season: hours, open roads, comfort stations, heat and tick guidance; NPS's desks went dark on October 1, 2025 while the field stayed open `[F:SITE-OS14]`.
- **A first offline pack for the 16 stops**, about 40-50 MB (competitors are 20, 66, 121 and 179 MB), offered on lodging or visitor-center Wi-Fi, with a persistent-storage request and an install nudge because Safari can evict stored data after seven days, and **self-hosted open-data tiles** because Mapbox's offline documentation covers only its mobile SDKs `[F:SITE-OS04,OS06,OS16,OS18]`. Tested in airplane mode at all 16 stops; no authoritative battlefield cell-coverage data exists `[F:SITE-OS04]`. The second route, Beyond the Auto Tour, is idea 6.

**Why it is amazing.** It is the companion visitors open beside the free NPS app, not a rival, and it targets documented complaints with a free tool.

**Dependencies.** Whether NPS populates its parking and road-event feeds for Gettysburg is unverified `[F:SITE-OS10]`. The park is closed sunset to sunrise plus or minus 30 minutes, drones are prohibited and monuments may not be climbed; any paid on-site narration should be cleared in writing, since a Commercial Use Authorization costs a $350 application fee and 3-5% of gross receipts `[F:SITE-OS11]`. Never use the NPS Arrowhead. **Deferred:** a crowd-sourced signal map and the XL parts of offline mapping. **Tier: L** for the first pack.

---

## Feature 6. Casualty Dashboard: three honest views

**Today.** Corps-level trends from a bell-curve apportionment (eight Union and four Confederate corps); the site's own Union corps sum is 22,803 (23,138 by engagement period), matching no published total; the legacy page has no reduced-motion handling, image role, data table or live region `[F:VIZ-F06,F19]` `[F:VIZ-rights]`.

**The leap.** From one chart to three honest views that teach proportion, unevenness and uncertainty.

**How it works.**
1. **Unequal Burden.** One shared-scale panel per corps by day, as small multiples, which were the most accurate format and faster than animation for analysis `[F:VIZ-F12]`; the data already shows I Corps at about 49.6% and VI Corps at about 1.8% `[F:VIZ-F06]`. A printable contact sheet comes with it.
2. **Every Man a Mark.** One equal-sized mark per soldier from the 570 unit records: 155,011 marks (88,349 Union in 329 records, 66,662 Confederate in 241), with the denominator stated because it matches no published total `[F:VIZ-F03]`. End-of-day states only, so no timing is invented `[F:VIZ-V1]`; equal-sized pictograms (the Isotype rule), with fill plus hatch so colour is never the only signal `[F:VIZ-F14,F18]`.
3. **The Number Is a Range**, linked from idea 9, with "missing" kept apart from "dead" `[F:VIZ-F04]`.
4. A data table, a text summary and a definitions legend under every graphic `[F:VIZ-F18]`. An optional context strip: Gettysburg's roughly 8,000-10,000 dead are about 1-2% of the war's roughly 620,000 (my arithmetic from NPS figures) `[F:VIZ-F08]`.

**Why it is amazing.** It teaches historiography in one picture. The honest claim is comprehension of proportion, not empathy `[F:VIZ-F10]`.

**Dependencies.** Fox and Official Records for the killed, wounded and missing split the records lack `[F:VIZ-F19]`; counsel on Busey and Martin and Krick as attributed facts `[F:VIZ-rights]`; the owner's casualty-model decision (O-8) `[F:VIZ-F19]`; WebGL load on phones for 155,011 marks `[F:VIZ-V1]`. **Tier: M.**

---

## Feature 7. Living Ledger: a band, not a counter

**Today.** A running casualty counter on the battle clock. A bell-curve model spreads each period's total over its tick range; the records do not time individual casualties `[F:VIZ-F19]`.

**The leap.** From a counter that looks like a record to a band that admits it is a model.

**How it works.**
- Replace the single line with a **band**, and animate two or three alternate timings as hypothetical outcome plots, which helped untrained viewers judge uncertainty better than error bars `[F:VIZ-F13]`.
- Label **observed** rates apart from **[MODEL]**: NPS's "over 5,000 lost in one hour" at Pickett's Charge, and the 1st Minnesota's contested five minutes, are observed; everything else reads "modeled from totals; the records do not time individual casualties" `[F:VIZ-F08,F05]`.
- A pause control and a reduced-motion mode (moving content over five seconds needs one under WCAG 2.2.2; interaction-triggered animation should be disableable under 2.3.3) `[F:VIZ-F18]`.
- A "jump to the deadliest ticks" index from the corps peaks (I Corps on Day 1: ticks 18-75, peak at tick 62) `[F:VIZ-F06]`.
- No streaks, leaderboards or loss-framed counters `[F:ENG-E11]`.

**Why it is amazing.** A line that admits it is a model is more trustworthy than one that looks like a record, and it avoids the false precision critics found in single-number visualizations `[F:VIZ-F13]`.

**Dependencies.** The owner's casualty-model decision (O-8); Fox and Official Records for the observed anchors; content notes `[F:VIZ-F19]`. **Tier: M.**

---

## Feature 8. Follow-Your-Ancestor: Your Regiment, Your Minute

**Today.** A lookup that maps a person to a regiment, by state or a commander's surname `[site]`; deep links other than `?ancestor=` are inert; the page's copy says "roughly 165,000" soldiers, where the NPS press kit says "more than 165,000" and the NPS battle page 158,343 `[F:PPL-P02]` `[F:SITE-OS08]`.

**The leap.** A descendant finds a regiment, watches it move minute by minute, and leaves with a keepsake, a place to stand and a reminder.

**How it works.**
- **Three honest tiers.** **A:** surname hits in the site's own public-domain sets (the burial roll, commanders). **B:** pick a state, then a regiment, and get its Gettysburg story plus deterministic, local-only deep links to NPS CWSS, the National Archives catalogue, FamilySearch, Fold3, Find a Grave and Reveille; no query leaves the device. **C:** roster shards only after NPS confirms in writing `[F:PPL-opp2]`.
- **A dossier** for the regiment: strength, casualties, commander and fate, key action, its minute-by-minute path and its monuments `[F:VIZ-F19]`.
- **A visit plan:** its monuments, the nearest lot and capacity, and an alternate `[F:SITE-OS09]` `[F:SITE-opp5]`.
- **The keepsake loop:** a printable regiment card with the unit, its position at 4 p.m. on July 2 and a link back; a saved list on the device with an export code; a yearly calendar reminder for the unit's moment `[F:ENG-opp04,opp15]` `[F:ENG-E15]`.
- **Honest copy, always:** "served in a regiment that was present", never "fought"; NPS and NARA both say an index card does not prove presence at a battle `[F:PPL-P01,P05]`. A USCT descendant gets a plain explanation (no USCT regiment fought at Gettysburg; about 40 Black men from the area served elsewhere) and links to NARA records and Reveille `[F:INC-IC04]`. Paths for civilians, Black residents, nurses and teamsters `[F:INC-opp10]`.
- **A NARA coverage test first:** a free Catalog API key (10,000 queries a month by default), used to measure how many Gettysburg regiments have free digitized carded service records before any deep link is promised `[F:PPL-P05]` `[F:PPL-opp10]`.

**Why it is amazing.** It meets a gap NPS admits: the park maintains no individual service or pension records `[F:PPL-P14]` `[F:SITE-OS14]`. CWSS holds about 6.3 million cards for about 3.5 million soldiers, and is described by an independent analysis (Gopher Records) as "no longer supported" (NPS's own pages on it show a last-updated date of 2013) `[F:ENG-E06]` `[F:PPL-P01]`; the site adds the one thing those records cannot say: where the unit was.

**Dependencies.** NPS's written confirmation; Reveille blocks automated access, so link-out or a partnership, never scraping `[F:PPL-P06]`; CWSS under-represents Confederates `[F:PPL-P02]`; fixed deep links. **Tier: L**, plus S for the coverage test.

---

## Feature 9. Regimental Biography: the dossier

**Today.** Strength, casualties, casualty percentage, commander name and fate, days engaged and a one-line key action, for 570 unit records and 467 regiments `[F:EDU-E19]` `[F:VIZ-F19]`.

**The leap.** From a stat block to a dossier with a conflicts panel.

**How it works.**
1. The Official Records reports its officers wrote, by author, with a scan highlight `[F:COR-F03,F05]`.
2. Fox's per-regiment notes and loss rows rebuilt from word boxes with the checksum (Union only) `[F:COR-F06]`.
3. The state commission's narrative and the monument inscription, as cited quotes `[F:COR-F09,F10]`.
4. NPS order-of-battle commanders and the (k), (w), (mw), (c) loss marks `[F:PPL-P13]`.
5. **A conflicts panel:** the 1st Minnesota's 215, 179 and 224; the 26th North Carolina's 588 of 843 against "714 of 800" in the plan's earlier text; the 8th Virginia's 92.2% against 76.7% `[F:VIZ-F05]`; Krick's confidence grade for each Confederate brigade `[F:VIZ-F02]`.
6. **Composition at muster,** kept apart from who fought on July 2: the 39th New York's Garibaldi Guard (companies of German, Hungarian, Swiss, Italian, French and Spanish-Portuguese men), the 58th New York's Polish Legion, about half of XI Corps German-born or German-American; no headline percentage without a source `[F:INC-IC13,IC15]`. The Irish Brigade's contested strength stays held `[F:INC-IC14]`.
7. **Drag one regiment onto another** (the Kindred Britain gesture) to reveal chain of command, nearest approach and shared terrain, from the existing order-of-battle hierarchy `[F:EXM-F11]`.
8. A roster-remark pilot on one Pennsylvania and one New York regiment, measured against NPS loss marks before scaling `[F:PPL-opp7]`; a Wikidata id where one exists `[F:ACC-F20]`.

**Why it is amazing.** It is the nearest thing to a scholarly entry for each regiment that a visitor can click through, with the disagreements shown.

**Dependencies.** Fox is public domain; Busey and Martin facts only after counsel; CWSS rosters blocked `[F:COR-F06]` `[F:VIZ-rights]` `[F:PPL-P03]`. **Tier: L.**

---

## Feature 10. Gettysburg for Students: Case Files, a Corroboration Lab and a no-account class kit

**Today.** A day-tabbed list of the 24 vignettes with "See it on the map" and no teacher guide, standards, sources, printables, questions or assessments; the panel summaries average 59 words at about grade 11, while the 300-word full scripts read at about grade 7 (my measurement of the shipped data, not independently reviewed) `[F:EDU-E19]`.

**The leap.** From a list of vignettes to the page a teacher bookmarks: lessons, a lab and a class kit that need no accounts.

**How it works.**
- **Case Files.** Each is the lesson anatomy with published outcome evidence: background (the map moment), a central question, three to five documents of about 150-250 words, and a discussion `[F:EDU-E12]`. Each document appears three ways: a plain-language adaptation (labelled *adapted*, with the reviewer named, written by a human), the verbatim original, and the scan, with a **sourcing card** (author, rank, side, written when, lag in days, contemporaneous or retrospective) `[F:EDU-E02]`. Launch with three; the first sets are *Lincoln and Lee judge the battle* (Lincoln's July 14 letter and Lee's July 12 letter to his wife) `[F:EDU-E06]`, *Same Hour, Different Clocks*, and *Photographs as Evidence* (the staged sharpshooter and Plates 36 and 37) `[F:IMG-F08]`; later, *Pickett's Charge: who decided?*
- **The Corroboration Lab.** Students place four to eight accounts of one moment on a clock strip, tag how pairs relate (agrees, contradicts, earlier, later, supports, opposes), see the computed range and median, and write a claim with a limitation `[F:EDU-E12]`. Corroboration is the thinnest skill in the Digital Inquiry Group catalogue: about 20 items among 150-plus assessments, none titled Gettysburg (counts read through a summarizing fetcher) `[F:EDU-E11]`.
- **Map Playlists.** Three to six saved moments in one link whose state lives in the URL fragment `[F:EDU-E18]`.
- **A no-account class kit.** Answers autosave on the device and export as a response card to print, copy or scan; a teacher pastes cards into a class view that decodes in the browser. No server and no student identifiers keep FERPA and COPPA exposure small; counsel still reviews a student-facing page `[F:EDU-E17]`. The assignment is a plain Google Classroom link, not the third-party share script `[F:EDU-E18]`.
- **Reading and access.** Original, Plain (Flesch-Kincaid grade 8 or below) and a human-translated Spanish version; a glossary (explicit vocabulary instruction has strong evidence) `[F:EDU-E13]`; local read-aloud from the browser's speech synthesis, which works offline `[F:EDU-E18]`; tagged, large-print and black-and-white PDFs with static map snapshots and QR codes.
- **Standards.** A crosswalk with codes verified from primary text: C3 D2.His.1, 4, 5, 6, 10, 11, 13, 14, 16, D2.Geo.2 and 3, D3.1-D3.4; CCSS RH.6-8.1, 2, 6, 7, 9, RH.9-10.6, RH.11-12.8 and 9; Massachusetts 5.T5 and USI.T5. Massachusetts is the only state verified, so every other state reads "skills-aligned; state content mapping not yet reviewed", with a checked-on date `[F:EDU-E01,E02,E03,E04]`.
- **An IT-admin page:** a domain allow-list built from a real network capture, a statement of no accounts and no third-party calls in classroom mode, a static non-WebGL fallback, graphic photographs collapsed by default, WCAG 2.2 AA (public schools must meet 2.1 AA by April 26, 2027 or 2028, by population) `[F:EDU-E17]`.

**Why it is amazing.** The only published outcome evidence for this lesson structure is Reisman (2012): 236 students in five San Francisco schools over six months, with significant gains in historical thinking, transfer, factual knowledge and reading comprehension `[F:EDU-E12]`. The free Gettysburg classroom market is video plus worksheet (the American Battlefield Trust's animated map, with a question sheet and a Classroom share button, which about 1,929 educators have added) or account-gated `[F:EDU-E07,E11]` `[F:ENG-E18]`. Nothing free pairs an interactive minute-by-minute map with the lesson shape teachers already trust.

**Dependencies.** The corrected clock, working deep links and the Historian's time-evidence table; a named historian reviewer on every adapted text and answer key; one real Chromebook per release candidate; **no efficacy claim until a pilot with two or three teachers**, since the study was of a trained-teacher curriculum and not a website `[F:EDU-E12]` `[F:EDU-rights]`. Write original lessons from public-domain sources; Gilder Lehrman's units are copyrighted and the American Battlefield Trust is link-out only `[F:EDU-E06]` `[F:ENG-E18]`. **Tier: L** for the first release (three sets, one Corroboration moment, one playlist, a printable packet, the IT page); XL for twelve sets.

---

### Also on the bench (not counted among the ten)

- **Turning Points:** paired-testimony cards (Sickles against Meade) with perspective and lag, fed by the dispatch ledger and the contested registry `[F:COR-F08,F16]` `[F:ACC-opp1]`.
- **Compare Moments:** a printable small-multiples contact sheet (the reunion pair is in idea 10) `[F:VIZ-V4]`.
- **Watch Together:** "start at the live minute", with no crowd counter `[F:EXM-opp2]`.
- **Camera and Documentary modes:** sky and light from Jacobs's cloud types and real solar azimuth, citing the Cyclorama precedent `[F:ENV-opp12,F19]`.
- **Monument layer:** validate the 512 records against the 1903-1921 park books and NPS's 1,328 monuments and markers, and run a Wiki Loves Monuments-style photo drive to Wikimedia Commons `[F:COR-F10]` `[F:SITE-OS08]` `[F:ENG-opp08]`.

---

# PART 4. What to do first, and in what order, for a solo owner

## 4.1 The rule

Foundations first. The gate at the front of this pitch (the clock, the deep links and share cards, the "undefined" output, a named reviewer, counsel's questions) comes before everything, because a wrong clock or a dead link loses every audience at once `[F:EDU-rights]`. Nothing in Parts 1 to 3 should be put in front of teachers, descendants, the press or the live July 1-3 mode before it closes *(design intent)*.

## 4.2 Eight small wins that fit inside the gate (S-tier slices)

1. **The Moon Card for July 2:** static values with the NASA and USNO citations, after re-running USNO `[F:ENV-opp2]` `[F:ENV-F08]`.
2. **The first conflict-ledger page,** seeded with the first dozen of the 18 rows in section 2.5c `[F:ACC-opp1]`.
3. **The elevation fix:** read elevations from the 1 m DEM, checked against 20 USGS point queries `[F:TER-opp1]`.
4. **The standards crosswalk** with the verified C3, CCSS and Massachusetts codes only `[F:EDU-E01,E04]`.
5. **The NARA Catalog API coverage test** for free digitized service records by regiment `[F:PPL-opp10]`.
6. **The "If the desk is closed" static page** `[F:SITE-opp10]`.
7. **A pause control and reduced-motion handling** on the existing animated pages `[F:VIZ-F18]`.
8. **Share-card and deep-link repair:** working `?t=` and `#` links and corrected `og:image` files with alt text `[F:EXM-opp14]`.

(An earlier draft listed a "Camp Letterman correction card" here. It is struck: the Camp Letterman number appears only as a conflict row `[F:INC-IC10]`.)

## 4.3 The order

| Phase | Work | Why here |
|---|---|---|
| **0. The gate** | Close the five gate items; the eight small wins; draft (do not send) the permission list in 4.7 | Every audience is lost by a wrong clock or a dead link `[F:EDU-rights]` |
| **1. The trust centrepiece and the spine** | Part 2 Wave 0 (baseline audit, gate harness, schema); idea 9, the ladder and the ledger page; idea 1, the Sky, moon card first; idea 4 with Wave 1, the Official Records spine; Feature 10's three Case Files once the clock is signed off | They cost little, lean on public-domain material already located, show the site's brand, and feed Features 6, 7 and 9 and the 20x core `[F:COR-F01]` |
| **2. In parallel, as reviewer time allows** | Ideas 5, 6 (with community review first), 7 and 10; idea 3's 20-pose pilot; Part 2 Waves 2 and 3; Features 1, 6, 7, 8 and 9 | The largest effort is the review, so these share one reviewer queue |
| **3. The long-lead showpieces** | Idea 8 (start the lidar processing early, an offline job) and idea 2; Features 3 and 5; Wave 4 | Highest effort and the most data work; none blocks the rest `[F:TER-T02]` |
| **4. Live** | The July 1-3, 2027 live mode for idea 4 and Watch Together, **only if the time model is signed off** | It needs everything above to be solid `[F:ENG-E20]` |

## 4.4 The first 30 days *(design intent)*

1. **With a historian, sign off the five open time anchors,** and plan the fix for the 4.8-hour clock defect `[F:ENG-rights]` `[F:EDU-rights]`.
2. **Repair deep links and share cards,** and the "undefined" output `[F:EDU-E19]`.
3. **Name the reviewer,** and for contested items a named second reader `[F:ACC-rights]` `[F:ENG-opp06]`.
4. **Draft the permission requests** in 4.7, and send none until the owner approves each.
5. **Run the Wave 0 baseline audit** of the Historian: which questions it answers today, by family, and set the gates `[F:ACC-opp9]`.
6. **Ship the first dozen conflict-ledger rows** and the Confederate-casualty ladder `[F:VIZ-F01]`.
7. **Re-run USNO, read Jacobs's July scan, and ship the Moon Card and the Conditions Ribbon** (static) `[F:ENV-F08,F12]`.
8. **Pick the three experiences to lead with.** The recommendation is idea 9 (The Number Is a Range), idea 1 (The Sky) and the daily "This hour" card from idea 4: each is rights-clean, has its data in hand, is cheap, and shows one part of the brand (doubt, evidence, the clock).

If the reviewer queue is more than 14 days old at any point, stop adding content until it clears `[F:ACC-rights]`.

## 4.5 The real calendar

- **Nov 19, 2026** (Dedication Day) is a Thursday, about seven weeks away `[F:ENG-E20]`. **Do not target it** for any of these ideas: seven weeks does not cover the gate, the permissions and the review, and a "live dry run" on that date would not exercise the July 1-3 mode. Treat November 19 as a recurring editorial date, and confirm the Remembrance Day weekend with the Gettysburg Foundation (its page was not fetchable) `[F:ENG-E20]`.
- **July 1-3, 2027** (Thursday to Saturday, the 164th anniversary) is the realistic live target if the gate has closed `[F:ENG-E20]`. The 175th is July 2038.

## 4.6 Decisions the owner holds

1. Sign-off on the five open time anchors, and the plan for the clock defect `[F:ENG-rights]` `[F:EDU-rights]`.
2. The casualty-model decision (O-8) `[F:VIZ-F19]`.
3. A named historian reviewer and a named second reader `[F:ACC-rights]`.
4. Approval of the fidelity promise in place of "total accuracy", and of dropping WP-HIST-18 and Stages B and C in favour of the deterministic substitutes in section 2.8 `[F:ACC-rights]`.
5. Whether the site will ever carry ads, sponsorship or paid features: non-commercial licences, a Commercial Use Authorization and the privacy page all turn on it `[F:ENG-rights]` `[F:SITE-OS11]`.
6. Whether to open any intake at all (this pitch proposes only the Corrections form); the privacy page promises no email collection and no personal information `[F:ENG-summary]` `[F:ENG-rights]`.
7. Counsel review of public-domain dates, Busey and Martin-derived fields, COPPA and FERPA, and Mapbox's terms `[F:ACC-rights]` `[F:EDU-E17]` `[F:TER-T19]`.
8. Which three experiences lead.

## 4.7 Permissions and outreach: drafted, not sent

| Recipient | What to ask | Why |
|---|---|---|
| **NPS Gettysburg** | Written confirmation on reuse of CWSS data; whether an independent free app may link to the park's tours; whether paid on-site narration needs a Commercial Use Authorization; to be listed as a third-party companion to the six virtual field trips (10-100 students a session), with no Arrowhead and no endorsement claim. A note: NPS keeps an unlimited right to use anything submitted to it, so a partnership email is not confidential | CWSS has no stated terms; the compendium is silent on apps `[F:PPL-P03,P04]` `[F:SITE-OS11]` `[F:ENG-E17]` |
| **NOAA NCEI** (and the American Philosophical Society) | How to obtain and republish the Jacobs scans | "Controlled user access"; the APS duplicate set is snippet-only `[F:ENV-F03]` |
| **Nese and Harding** (The History Press) | Permission for the few heat-index figures used; a fact-check or data partnership | Copyrighted book; the values are the authors' own estimates `[F:ENV-rights]` |
| **Gettysburg Foundation** (and Destination Gettysburg) | The 2026 Remembrance Day weekend; a link from the visitor center; a view on QR codes, signage and a paid narration feature | The Foundation page was not fetchable `[F:ENG-E20]` `[F:SITE-opp13]` |
| **Gettysburg History** (formerly the Adams County Historical Society) | Damage-claims and civilian-accounts indexes; reviewer partnership | Reproduction is prohibited without permission `[F:PPL-P17]` |
| **New Hampshire Historical Society** | Bachelder Papers: link-out with series and volume cites until permission; the research reports fees of $25 per digitized image and $50 per undigitized, plus $25 nonprofit or $100 commercial publication permission *(fee amounts not found in the finding aid; re-verify with the Society)* | The finding aid lists the papers as available for research but asks that permission to reproduce or publish be requested `[F:COR-F17]` |
| **Reveille's operator** | Terms, an API or a link-in | Licence, operator and data source unverified; the site blocks automated access `[F:PPL-P06]` |
| **Library of Congress and Boston Public Library** | Item-level rights confirmation as used | "No known restrictions" is not a public-domain declaration `[F:IMG-F04,F12]` |
| **Community institutions** (Lincoln Cemetery trustees, St. Paul A.M.E. Zion, the Devan family line, the Gettysburg Black History Museum) | Review before any individual or site is featured | Consultation precedes publication `[F:INC-rights]` `[F:PPL-opp5]` |
| **Round tables, SUVCW camps, genealogy and lineage societies, Gettysburg College's Civil War Institute** | Bounded asks: a listed program kit, a reviewer slot, a county roll-call page | Hundreds of round tables (the directory's own word; the claim that many struggle to program is unverified); Preserve the Pensions mobilized 115 societies behind one concrete goal `[F:ENG-E19,E07]` |
| **Counsel** | The pre-1931 arithmetic and state-published items; Busey and Martin and Krick as facts only; Mapbox clauses 1.6, 1.9 and 2.8.1; COPPA exposure on a student-facing page; contributor terms and the privacy rewrite for the Corrections form | Open legal questions the plan already lists `[F:COR-F19]` `[F:VIZ-rights]` `[F:TER-T19]` `[F:EDU-E17]` |

---

# PART 5. Honest caveats: what must be verified, cleared, or left alone

## 5.1 Verify before any number or quote reaches the site

1. **Re-run USNO** for sunrise, sunset, moonrise and moonset: the values came through a summarizer `[F:ENV-F08]`.
2. **Spot-check every Jacobs figure and quote against the primary scan:** the wind units (12 mph or about 2 mph); the claim that 87 F was the highest reading of the month, which rests on a secondary page and a transcription covering June 25 to July 8 only; the 9 p.m. cloud column of July 2; and the date of the "wet from the rain" line (June 26) `[F:ENV-F01,F02,F12]`.
3. **Confirm the Harrisburg Evening Telegraph item of July 3** on Chronicling America `[F:ENV-F16,F21]`.
4. **Confirm which Busey and Martin edition gives 28,063 and which 23,231** `[F:VIZ-F01]`.
5. **Read Letterman's report and Barnett's essay** before any Camp Letterman number appears beyond the conflict row `[F:INC-IC10]`.
6. **Check every Library of Congress rights advisory** item by item `[F:IMG-F04]`.
7. **Settle the Medal of Honor counting rule** before any count appears; the Society's 63 is snippet-only `[F:PPL-P12]`.
8. **Check the reunion figures** (53,407; 1,845; the 1938 attendance) and the Hollywood Cemetery count against the Pennsylvania Commission's report and other primary sources `[F:INC-IC18,IC06]`.
9. **Read Ross's 2001 book** for the Gettysburg-specific claims `[F:ENV-F14,F15]`.
10. **Find primary citations for the four viewshed test cases** `[F:TER-T16]`.
11. **Obtain a NOAA key** for the declination, and field-test AR on two phones `[F:SITE-OS20]`.
12. **Confirm the Internet Archive search-inside endpoint's stability,** and run the Netlify Range spike `[F:COR-F05]` `[F:ACC-rights]`.
13. **Confirm whether NPS populates its parking and road-event feeds** for Gettysburg `[F:SITE-OS10]`.
14. **Confirm the effects lists** appear in non-Google scans of the cemetery report `[F:COR-F11]`.
15. **Citation slips in the earlier drafts, corrected here:** the abstention drop is the research's ninth ACC opportunity, not its eighth; the New York and Pennsylvania passage counts come from the COR opportunities, not a finding; the Pittsburgh quote belongs to ENV-F16, not to the heat-index finding `[F:ACC-opp9]` `[F:COR-opp:20x-floor]` `[F:ENV-F16]`.

## 5.2 Rights and clearances at a glance

| Source family | Status | The rule |
|---|---|---|
| NOAA NCEI Jacobs scans | "Controlled user access", cite the dataset, no warranty `[F:ENV-F03]` | Ask before republishing images |
| USNO, NASA, USGS, NARA metadata | Public or US Government; credit lines requested `[F:ENV-F07,F08,F23]` `[F:TER-T01]` | Fetch once, store static, never call live |
| Nese and Harding; Hippensteel; Ross; Frassanito; Busey and Martin; Krick | Copyrighted `[F:ENV-rights]` `[F:IMG-rights]` `[F:VIZ-rights]` | Cite and paraphrase; a few attributed figures with permission; facts-only rows after counsel; no tables, maps or prose copied |
| Library of Congress images and maps | "No known restrictions on publication", not a public-domain declaration; 12 of 185 hits carry no advisory (10 of them essay pages) `[F:IMG-F04]` | Item-level check, credit line, harvest at 10 requests a minute or less, self-host `[F:IMG-F05]` |
| Bachelder | LoC and Boston scans are usable; the Library of Virginia copy asks users to contact it `[F:TER-T08]` `[F:IMG-F12]`; the NHHS originals need permission and fees; the Morningside edition is borrow-only `[F:COR-F17]` | Use LoC and Boston sheets; link out to NHHS |
| David Rumsey maps | CC BY-NC-SA; troop positions not given (unverified) `[F:IMG-F11]` | Do not use |
| American Battlefield Trust | Terms bar scraping, framing and AI use; maps reusable only whole and unmodified by partners and teachers `[F:ENG-E18]` `[F:EXM-F25]` | Link out only |
| NPS | Mostly public domain except third-party material; the Arrowhead needs the Director's written permission; CWSS rosters need written confirmation `[F:PPL-P04]` `[F:SITE-OS11]` | Never use the Arrowhead; no roster shards before NPS confirms |
| FamilySearch, Fold3, Ancestry, Reveille | Terms bar bulk download and scraping; Reveille blocks automated access `[F:PPL-P06,P07]` | Deterministic deep links only |
| Gettysburg History | Reproduction prohibited without permission `[F:PPL-P17]` | Link out until a licence exists |
| CC BY-NC sets (Killed at Gettysburg, Valley of the Shadow, ORBIS tiles) | Non-commercial `[F:ENG-rights]` | Unusable if the site ever carries ads, sponsorship or paid features |
| Mapbox | Terms bar deriving, extracting and caching; Terrain-DEM is SDK-only; GL JS v2+ is proprietary `[F:TER-T19]` | Compute from USGS; counsel reads the clauses |
| GPL code (NoiseModelling, HeidelTime) | GPL v3 and GPL-3.0 `[F:ENV-F18]` `[F:ACC-F20]` | Never copied or shipped; HeidelTime only as a build-time check |
| Internet Archive "public domain" flags | Wrong for some reprints `[F:COR-F12,F19]` | Curated id allow-list with the title-page year |
| Student-facing pages | COPPA persistent-identifier rules, FERPA, ADA Title II `[F:EDU-E17]` | No accounts, no third-party calls in classroom mode, WCAG 2.2 AA, counsel review |

## 5.3 What the research could not establish

- The shared search budget ran out at 200 of 200, so some topics were never researched: spring and well locations, 1863 land cover and newspaper audibility reports `[F:ENV-F24]` `[F:ENV-summary]`.
- Many authoritative hosts returned 403 or 404 to the fetcher (loc.gov HTML, HathiTrust reader pages, hmdb.org, Gilder Lehrman, the NYT, parts of ABT and others), and a summarizing model mislabelled at least one passage `[F:ENV-F12]` `[F:COR-summary]` `[F:EDU-summary]`.
- **Snippet-only or recalled-unverified** items, none to be treated as fact: Reveille's 5,040,436 records `[F:PPL-P06]`; the Society's Medal of Honor count of 63 `[F:PPL-P12]`; the APS duplicate set of Jacobs's forms `[F:ENV-F03]`; the King's College London factoid formulation `[F:ACC-F05]`; the Irish Brigade's 530 `[F:INC-IC14]`; the magnetic declination `[F:SITE-OS20]`; the Library of Congress Today in History popularity claim `[F:ENG-E04]`; the Boy and Morais full texts `[F:VIZ-F10]`.
- **No individual Native soldier at Gettysburg** could be documented in the sources reached `[F:INC-IC16]`. **The treatment of Black veterans at the reunions** is unresolved `[F:INC-IC18]`.
- Unmeasured: battlefield cell coverage `[F:SITE-OS04]`; phone viewshed timings `[F:TER-opp2]`; whether visits cluster around events more than daily, a hypothesis to test with the planned counters `[F:ENG-summary]`.
- Unverified technical items: Netlify Range and compression behaviour, and whether Pagefind holds at 100,000 files `[F:ACC-rights]`.

## 5.4 Claims struck from the earlier drafts, and why

1. **"Not 20,995. About 4,000."** and any Camp Letterman "correction card": the 4,000 is one NPS seminar essay, NPS's own overview says over 20,000 passed through, and the camp-versus-battle reading is our inference. It is now a conflict row `[F:INC-IC10]` `[F:VIZ-F08]`.
2. **"What Meade was told or reading at 2:40 a.m."** The sample header is *from* Army of the Potomac headquarters, and a header time is the time written. It is now "what headquarters wrote", and the "what he knew" layer is cut `[F:COR-F04]`.
3. **Acoustic scenarios labelled "air as measured" and "warm ground, favorable bending"**, and a banner stating no model exists: upper air was never recorded; warm ground makes the shadow by refracting sound *upward* while "favourable" propagation bends it *downward*; and the novelty claim rests on one article's silence. Now three scenarios and hedged wording `[F:ENV-F06,F15,F18]`.
4. **"Could Pittsburgh hear it?" as a headline or share card, and "the guns Harrisburg heard":** there is no primary citation, and the Telegraph item is known only through a secondary blog `[F:ENV-F16]`.
5. **"The battle began under a full moon":** the moon was full at 01:46 EST on July 1, and moonrise that evening was 20:02 EST, so the July 1 fighting was in daylight `[F:ENV-F08]`.
6. **"The one place where both sides lived under one roof of canvas":** untraceable, and about 1,800 Confederates were in Union hospitals elsewhere `[F:INC-IC10]`.
7. **"Basil Biggs's farm" in a June 1863 timeline:** he bought the Peter Fry farm in 1865 `[F:INC-IC04]`.
8. **"65 stereo pairs":** the research gives 65 stereograph-genre records or plates `[F:IMG-F02,F06]`.
9. **"186 became 74":** it spans 1860 to 1870, so the line now says so `[F:INC-IC01]`.
10. **"About 3,500 names" and "about 6,500 person rows":** they counted the 979 unknown graves as people. Recomputed: roughly 2,400-2,500 named of 3,354-3,512 graves `[F:PPL-P10]`.
11. **"The story the park's own virtual tour leaves out":** NPS's own "On Freedom's Tenuous Edge" tour covers these people; only its 16-stop Auto Tour virtual tour lacks them `[F:INC-IC04]`.
12. **"Almost none has a published camera position":** the research supports only that no open machine-readable dataset turned up in one Commons check; NPS publishes 31 same-spot pairs `[F:IMG-F07,F16]`.
13. **Grouping *The Liberator* with the "Black press":** only *L'Union* is identified as Black press `[F:INC-IC20]`.
14. **The "same spot" framing of 1863, 1913 and 1938:** the 1938 dedication was at the Eternal Light Peace Memorial, Stop 2, and the 1913 place is unverified `[F:SITE-OS09]` `[F:INC-IC18]`.
15. **"Season 1 timed to Nov 19, 2026" and a "live dry run" that day:** not achievable in about seven weeks, and not a test of the July 1-3 mode.
16. **A live crowd count on Watch Together:** it needs presence counting, which conflicts with a static, no-tracking site.
17. **A smoke overlay, a wind visual and per-tick temperatures:** held until Jacobs's scan is read `[F:ENV-F02,F13]`.
18. **Casualty sonification as a headline:** the evidence is thin, so it is a labelled stretch `[F:VIZ-F16,F17]`.
19. **The fog-of-war "who could see whom" toggle:** it would run on modern leaf-off terrain with unit positions keyframed on only 188 of 675 ticks `[F:TER-opp3]` `[F:IMG-F11]`.
20. **"Zero bars, six parking spaces, one hundred and three degrees":** no authoritative coverage data exists; six spaces is one lot (the Virginia Memorial); 103 is a heat-index threshold for cancelling NPS programs, not a temperature `[F:SITE-OS04,OS09,OS13]`.
21. **Medal of Honor person cards as a top-ten idea:** the counting rule is itself a conflict `[F:PPL-P12]`.
22. **Cyclorama weight and Electric Map lights as ledger rows:** exhibit trivia `[F:IMG-F13]` `[F:EXM-F07]`.
23. **Open-crowd contribution, family accounts, roster shards from CWSS or Reveille, and the Rumsey overlay:** cut for capacity, privacy and rights reasons `[F:ACC-F08]` `[F:PPL-P03,P06]` `[F:IMG-F11]`.

## 5.5 What is speculative in this pitch

- The Thinning Choir `[F:VIZ-rights]`.
- Every solved camera pose, every ray fan, every viewshed, every heat index and every casualty timing: they are models, and the badge says so.
- That the acoustic idea is the first of its kind: it rests on literature statements, not a proven absence `[F:ENV-F15]`.
- Phone viewshed runtimes (a synthetic benchmark) `[F:TER-opp2]`.
- Every effort tier, row estimate and per-axis target in Part 2: *(design intent)* until the Wave 0 baseline audit.
- Any effect on learning: no claim until a pilot exists `[F:EDU-E12]`.

## 5.6 Evidence limits

- People-shaped marks did not reliably raise empathy in experiments, so the visualizations claim comprehension of proportion only `[F:VIZ-F10]`. The identified-victim and group-framing results conflict `[F:VIZ-F09]`.
- Reisman's 2012 study is a quasi-experiment with trained, self-selected teachers and modest effect sizes (partial eta squared .03 to .09), of a curriculum and not a website `[F:EDU-E12]`.
- Transcribe Bentham's 1% figure measures what staff changed in submitted work after heavy investment, and independent crowd keying lowered quality in Zooniverse `[F:ACC-F07,F08]`.
- Audience figures for Apollo, Snow Fall and the American Battlefield Trust are the builders' own and unaudited `[F:EXM-rights]`.

---

# The Standard of Care

If every idea above shipped, the site could print eight commitments on one page *(design intent)*:

1. **Every number is a ladder.** We show who said what, and when, and why we show one first.
2. **Every quotation has a receipt.** The page, the scan, the highlight.
3. **Every model is labelled.** Documented, measured, computed, modelled, contested or unknown.
4. **Every disagreement is shown.** Nothing is quietly averaged or hidden.
5. **Every person named is sourced, and every unknown is honoured.** We name the dead, and we say how many we cannot.
6. **Every date is a range when it is one.** Photographs, reports and newspapers are never made more precise than their evidence.
7. **Every correction is logged,** publicly, with a date and a reason.
8. **Nothing the Historian says is generated.** Every sentence is a quotation, a template over a sourced row, or a stated limitation.

That is the pitch. It does not ask visitors to trust the site. It gives them what they need to check it.

---

# Appendix. Sources by theme, with confidence

Each line is `finding id | confidence | primary URL from the research`. **V** = verified by fetch (the research's own tag; a few sub-claims inside a finding are snippet-only and are flagged in the text). **S** = search-snippet-only. **R** = recalled, unverified. **L** = a local file the research measured read-only. Several findings cite further URLs in the research digest; only the primary one is listed here. References written `opp`, `rights`, `summary` or `ex:` point to the digest's per-theme opportunity list, rights and risk list, summary and exemplar list, which have no URL of their own. The research's search budget ran out at 200 of 200, and hosts that returned 403 are noted in section 5.3; treat anything marked S or R as unverified.

## ENV: sensory and environmental reconstruction

- F01 | V | https://emergingcivilwar.com/2023/02/22/the-thunder-seemed-tame-weather-at-the-battle-of-gettysburg/
- F02 | V | http://civilwarrx.blogspot.com/2013/07/gettysburg-meteorology-of-battle.html
- F03 | V (APS duplicate set: S) | https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ncdc:C01085 ; https://mrcc.purdue.edu/FORTS
- F04 | V | https://cwba.blogspot.com/2025/07/review-weather-gods-curse-gettysburg.html
- F05 | V | https://historynet.com/how-hot-did-battles-feel-for-civil-war-soldiers/
- F06 | V | https://psl.noaa.gov/data/20thC_Rean/
- F07 | V | https://aa.usno.navy.mil/data/api (example: https://aa.usno.navy.mil/api/rstt/oneday?date=1863-07-02&coords=39.83,-77.23&tz=-5)
- F08 | V | https://eclipse.gsfc.nasa.gov/phase/phases1801.html
- F09 | V | https://en.wikipedia.org/wiki/Time_in_the_United_States
- F10 | V | https://archive.org/details/notesonrebelinva00jaco_0 ; Haskell: https://www.gutenberg.org/ebooks/33121
- F11 | V | https://archive.org/stream/notesonrebelinva00jaco_0/notesonrebelinva00jaco_0_djvu.txt ; Pierce: https://archive.org/details/atgettysburgorwh00alle
- F12 | V | https://en.wikipedia.org/wiki/Battle_of_Gettysburg
- F13 | V | https://en.wikipedia.org/wiki/Gunpowder
- F14 | V | https://www.longwood.edu/staff/rosscd/pub.html
- F15 | V | https://www.civilwarmonitor.com/a-costly-science/
- F16 | V | https://lancasteronline.com/opinion/how-did-they-hear-gettysburg-cannons-so-far-from-battlefield/article_f554c444-4817-5ab3-a7d3-499c20414788.html
- F17 | V | https://en.wikipedia.org/wiki/Speed_of_sound
- F18 | V | https://github.com/cosinekitty/astronomy ; https://github.com/Universite-Gustave-Eiffel/NoiseModelling
- F19 | V | https://www.gettysburg.edu/news/stories?id=1e6a98de-63a7-4ce2-814b-68b658762243
- F20 | V | https://www.loc.gov/pictures/search/?q=gettysburg%20july%201863%20gardner&co=cwp&fo=json
- F21 | V | https://www.loc.gov/collections/chronicling-america/?q=cannonading&dates=1863-07-02/1863-07-06&fa=location_state:pennsylvania&fo=json&c=25
- F22 | V (Chancellorsville link: S) | https://en.wikipedia.org/wiki/Donald_Olson_(astronomer)
- F23 | V | https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits
- F24 | V | https://en.wikipedia.org/wiki/Culp%27s_Hill
- ex:VirtualPaulsCross | V | https://vpcross.chass.ncsu.edu/

## IMG: georeferenced historical imagery

- F01 | V | https://www.loc.gov/collections/civil-war-glass-negatives/?fo=json&c=1
- F02 | V | https://www.loc.gov/collections/civil-war-glass-negatives/?q=gettysburg&fo=json&c=100
- F03 | V | http://paheritage.wpengine.com/article/gettysburg-battlefield-traveling-photographers/
- F04 | V | https://www.loc.gov/rr/print/195_copr.html
- F05 | V | https://www.loc.gov/apis/json-and-yaml/working-within-limits/
- F06 | V | https://www.loc.gov/item/2018670741/
- F07 | V | https://www.nps.gov/gett/learn/photosmultimedia/devil-s-den-then-and-now.htm
- F08 | V | https://www.loc.gov/collections/civil-war-glass-negatives/articles-and-essays/does-the-camera-ever-lie/the-case-of-confused-identity/
- F09 | V | https://www.loc.gov/item/2004660315/
- F10 | V | https://unwritten-record.blogs.archives.gov/2018/07/03/mapping-the-battle-of-gettysburg/
- F11 | V | https://www.davidrumsey.com/luna/servlet/as/search?q=gettysburg&lc=RUMSEY~8~1&os=0&bs=100
- F12 | V | https://collections.leventhalmap.org/search.json?q=gettysburg&per_page=100
- F13 | V | https://www.nps.gov/gett/learn/historyculture/cyclorama.htm
- F14 | V | https://archive.org/details/panoramaofbattle00nati
- F15 | V | https://tnmaccess.nationalmap.gov/api/v1/products (1 m DEM, bbox -77.26,39.80,-77.21,39.84)
- F16 | V | https://commons.wikimedia.org/w/api.php (search `haswbstatement:P1259`, Gardner 1863)
- F17 | V | https://allmaps.org/
- F18 | V | https://github.com/sneas/img-comparison-slider
- F19 | V | https://www.nps.gov/aboutus/disclaimer.htm
- F20 | V | https://whatwasthere.com/
- ex:PhotoTourism | V | https://phototour.cs.washington.edu/

## PPL: people, rosters, burials, civilians

- P01 | V | https://www.nps.gov/civilwar/soldiers-and-sailors-overview.htm?fullweb=1
- P02 | V | https://gopherrecords.com/blog/analysis-of-the-soldiers-sailors-database/
- P03 | V | https://jrnold-nps-cwss.s3.amazonaws.com/?list-type=2
- P04 | V | https://www.nps.gov/aboutus/disclaimer.htm
- P05 | V | https://www.archives.gov/research/military/army/compiled-military-service-records
- P06 | **S** | https://freecivilwarrecords.org/
- P07 | V | https://www.familysearch.org/en/terms
- P08 | V | https://www.pa.gov/content/dam/copapwp-pagov/en/phmc/documents/archives/documents/militarycivilwarresearchguide.pdf
- P09 | V | https://archive.org/details/historyofpennsyl02bate
- P10 | V | https://archive.org/details/revisedreportofs01penn
- P11 | V | https://catalog.data.gov/dataset/national-cemetery-administration-gravesite-locator
- P12 | V (CMOHS count of 63: S) | https://gettysburg.stonesentinels.com/the-medal-of-honor-at-gettysburg/
- P13 | V | https://www.familysearch.org/en/wiki/Civil_War_Battles,_Gettysburg
- P14 | V | https://www.nps.gov/gett/learn/historyculture/ancestor-search.htm
- P15 | V | https://gopherrecords.com/blog/the-gettysburg-census-of-1860/
- P16 | V | https://www.battlefields.org/learn/articles/african-americans-gettysburg
- P17 | V | https://gettysburghistory.org/our-holdings/
- P18 | V | https://archive.org/details/atgettysburgorwh00alle
- P19 | V | https://en.wikipedia.org/wiki/German_Americans_in_the_American_Civil_War
- P20 | V | https://query.wikidata.org/sparql (count of humans with P607 = Q33132, measured 2026-09-30)

## COR: primary and period text corpora

- F01 | V | https://archive.org/metadata/warofrebellion271unit
- F02 | V | https://catalog.hathitrust.org/api/volumes/full/htid/coo.31924077699761.json
- F03 | V | https://archive.org/download/warofrebellion271unit/warofrebellion271unit_djvu.txt
- F04 | V | https://archive.org/download/warofrebellion273unit/warofrebellion273unit_djvu.txt
- F05 | V | https://archive.org/metadata/warofrebellion271unit (search-inside endpoint, undocumented)
- F06 | V | https://archive.org/metadata/reglossescivilwar00foxwrich
- F07 | V | https://archive.org/metadata/battlesleadersof03cent
- F08 | V | https://archive.org/metadata/reportofjointcomm01unit
- F09 | V | https://archive.org/metadata/pennsylvaniaatge01pennuoft
- F10 | V | https://archive.org/metadata/locationofmonume02unit
- F11 | V | https://archive.org/metadata/revisedreportma00cemegoog
- F12 | V | https://www.gutenberg.org/ebooks/33121
- F13 | V | https://en.wikisource.org/wiki/Southern_Historical_Society_Papers
- F14 | V | https://www.loc.gov/collections/chronicling-america/?dl=page&dates=1863-07-01/1863-07-31&q=gettysburg&fo=json&c=1
- F15 | V | https://archive.org/metadata/gettysburg-compiler-1863-07-13
- F16 | V | https://www.loc.gov/item/mal4356500/?fo=json
- F17 | V | https://www.nhhistory.org/NHHS/media/NHHS-Media-Library/PDFs/Finding-Aids/Bachelder_John_B-_Papers_1921-001.pdf
- F18 | V | https://valley.newamericanhistory.org/
- F19 | V | https://guides.library.cornell.edu/copyright/publicdomain
- F20 | V | https://archive.org/download/warofrebellion272unit/warofrebellion272unit_djvu.txt

## TER: terrain and the 1863 landscape

- T01 | V | https://www.usgs.gov/3d-elevation-program/about-3dep-products-services
- T02 | V | https://tnmaccess.nationalmap.gov/api/v1/products (lidar point cloud, bbox -77.26,39.80,-77.20,39.84)
- T03 | V | https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/metadata/PA_17County_D24/PA_17Co_7_D24/reports/USGS_PA_17Co_7_D24_Summary_Report.pdf
- T04 | V | https://tnmaccess.nationalmap.gov/api/v1/products (1 m DEM, bbox -77.30,39.76,-77.15,39.87)
- T05 | V | https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer?f=pjson
- T06 | V | https://tnmaccess.nationalmap.gov/api/v1/products (Historical Topographic Maps)
- T07 | V | https://unwritten-record.blogs.archives.gov/2018/07/03/mapping-the-battle-of-gettysburg/
- T08 | V | https://www.loc.gov/item/99447491/
- T09 | V | https://www.loc.gov/item/99448795/
- T10 | V | https://www.loc.gov/item/pa3648/
- T11 | V | https://ope-plus.com/2013/06/12/hallowed-ground-the-landscape-restoration-and-maintenance-at-gettysburg-national-military-park/2887/
- T12 | V | https://irma.nps.gov/DataStore/DownloadFile/151134
- T13 | V | https://www.nps.gov/gett/learn/historyculture/grasslands-initiative.htm
- T14 | V | https://emergingcivilwar.com/2022/09/30/fence-friday-post-and-rail/
- T15 | V | https://www.smithsonianmag.com/history/looking-at-the-battle-of-gettysburg-through-robert-e-lees-eyes-136851113/
- T16 | V | https://journals.maine.edu/mainehistoryjournal/article/download/4224/4217/4219
- T17 | V | https://www.loc.gov/item/2018666303/
- T18 | V | https://aa.usno.navy.mil/api/rstt/oneday?date=1863-07-02&coords=39.8309,-77.2311&tz=-5&dst=false
- T19 | V | Mapbox Product Terms (July 21, 2026) PDF on cdn.prod.website-files.com (full URL in the research digest)
- T20 | V | https://maplibre.org/maplibre-style-spec/sources/
- ex:NPS-GeoCue | V | https://lidarnews.com/mapping-the-battle-of-gettysburg/

## EXM: best-in-class interactive history

- F01 | V | https://source.opennews.org/articles/how-we-made-snow-fall/
- F02 | V | https://pudding.cool/process/responsive-scrollytelling/
- F03 | V | https://nightingaledvs.com/the-past-present-and-future-of-scrollytelling/
- F04 | V | https://en.wikipedia.org/wiki/U.S._Deaths_Near_100,000,_An_Incalculable_Loss
- F05 | V | https://apolloinrealtime.org/11/
- F06 | V | https://en.wikipedia.org/wiki/Apollo_in_Real_Time
- F07 | V | https://www.civilwarmonitor.com/blog/map-quest
- F08 | V | https://news.richmond.edu/releases/article/-/10490/university-of-richmond-launches-visualizing-emancipation-the-first-map-showing-the-fall-of-slavery-during-the-civil-war.html
- F09 | V | https://news.emory.edu/features/2019/06/documenting-slave-voyages
- F10 | V | https://www.neh.gov/humanities/2013/novemberdecember/feature/mapping-the-republic-letters
- F11 | V | https://kindred.stanford.edu/notes.html?section=userGuide
- F12 | V | https://orbis.stanford.edu/
- F13 | V | https://airminded.org/2012/12/10/nearly-all-the-bombs/
- F14 | **S** | https://maps.nls.uk/ww1/trenches/
- F15 | **S** | https://library.villanova.edu/research/resource?linkid=7542
- F16 | V | https://en.wikipedia.org/wiki/Dimensions_in_Testimony
- F17 | V | https://www.annefrank.org/en/about-us/news-and-press/news/2019/7/4/renewed-vr-tour-anne-franks-secret-annex/
- F18 | V | https://www.nationalgeographic.com/adventure/article/150622-andrew-tallon-notre-dame-cathedral-laser-scan-art-history-medieval-gothic
- F19 | V | https://en.wikipedia.org/wiki/Europeana_1914%E2%80%931918
- F20 | V | https://killedatgettysburg.org/about/
- F21 | V | https://valley.newamericanhistory.org/about
- F22 | V | https://www.civilwarmonitor.com/a-costly-science/
- F23 | V | https://www.templeton.org/wp-content/uploads/2018/08/Awe-White-Paper_distribution.pdf
- F24 | V | https://apps.apple.com/us/app/gettysburg-battle-auto-tour/id1505770574
- F25 | V | https://www.battlefields.org/map-reproduction-permission-policy
- F26 | V | https://en.wikipedia.org/wiki/Neal_Agarwal
- F27 | V | https://github.com/NUKnightLab/TimelineJS3

## ACC: accuracy without generative AI

- F01 | V | https://www.w3.org/TR/annotation-model/
- F02 | V | https://www.w3.org/TR/prov-o/
- F03 | V | https://www.wikidata.org/wiki/Help:Ranking
- F04 | V | https://en.wikipedia.org/wiki/Battle_of_Gettysburg
- F05 | **S** | https://www.kcl.ac.uk/factoid-prosopography/projects
- F06 | V | https://meta.wikimedia.org/wiki/Abstract_Wikipedia
- F07 | V | https://melissaterras.org/wp-content/uploads/2018/08/fqx064.pdf
- F08 | V | https://theoryandpractice.citizenscienceassociation.org/articles/10.5334/cstp.934
- F09 | V | https://en.wikisource.org/wiki/Help:Proofread
- F10 | V | https://groups.csail.mit.edu/infolab/publications/Katz-etal-ODBASE02.pdf
- F11 | V | https://people.ict.usc.edu/~traum/Papers/npceditor.pdf
- F12 | V | https://arxiv.org/abs/1806.03822
- F13 | V | https://arxiv.org/abs/2104.08663
- F14 | V | https://arxiv.org/abs/1803.05355
- F15 | V | https://github.com/Pagefind/pagefind/issues/49
- F16 | V | https://phiresky.github.io/blog/2021/hosting-sqlite-databases-on-github-pages/
- F17 | V | https://github.com/lucaong/minisearch/blob/master/DESIGN_DOCUMENT.md
- F18 | V | https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment/Text_fragments
- F19 | V | https://tei-c.org/release/doc/tei-p5-doc/en/html/CO.html
- F20 | V | https://spacy.io/usage/rule-based-matching

## SITE: on-site and mobile reality at the park

- OS01 | V | https://irma.nps.gov/DataStore/DownloadFile/722329
- OS02 | V | https://publiclandsdata.com/national-park-visitation/gettysburg/2024
- OS03 | V | https://wpcdn.web.wsu.edu/wp-wpsites/uploads/sites/3019/docs/73_GETT_sum.pdf
- OS04 | V | https://www.nps.gov/gett/planyourvisit/hours.htm
- OS05 | V | https://www.nps.gov/gett/planyourvisit/download-app.htm
- OS06 | V | https://apps.apple.com/us/app/gettysburg-battle-auto-tour/id1505770574
- OS07 | V | https://itunes.apple.com/us/rss/customerreviews/page=1/id=1505770574/sortby=mostrecent/json
- OS08 | V | https://www.nps.gov/gett/learn/news/presskit.htm
- OS09 | V | https://www.nps.gov/gett/planyourvisit/directions.htm
- OS10 | V | https://www.nps.gov/subjects/developer/customcf/swagger.json
- OS11 | V | https://www.nps.gov/gett/learn/management/superintendents-compendium.htm
- OS12 | V | https://gettysburgtourguides.org/reservations-2/
- OS13 | V | https://www.nps.gov/gett/planyourvisit/battle-anniversary.htm
- OS14 | V | https://www.gettysburgfoundation.org/news/2025/federal-government-shutdown
- OS15 | V | https://www.nps.gov/gett/planyourvisit/accessibility.htm
- OS16 | V | https://webkit.org/blog/14403/updates-to-storage-policy/
- OS17 | V | https://www.gps.gov/gps-accuracy
- OS18 | V | https://docs.mapbox.com/help/dive-deeper/mobile-offline/
- OS19 | V | https://en.wikipedia.org/wiki/Gettysburg_Battlefield
- OS20 | **R** | https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml

## EDU: education

- E01, E02 | V | https://www.socialstudies.org/sites/default/files/c3/C3-Framework-for-Social-Studies.pdf
- E03 | V | https://www.thecorestandards.org/assets/CCSSI_ELA%20Standards.pdf
- E04 | V | https://www.doe.mass.edu/frameworks/hss/2018-12.pdf
- E05 | V | https://www.nps.gov/articles/choices-and-commitments-soldier-at-gettysburg.htm
- E06 | V | https://www.gilderlehrman.org/sites/default/files/2024-04/GLI_Battle%20of%20Gettysburg_2024.pdf
- E07 | V | https://www.battlefields.org/learn/maps/gettysburg-animated-map
- E08 | V | https://www.nps.gov/gett/learn/education/educational-outreach.htm
- E09 | V | https://padigital.org/primary-source-sets/the-battle-of-gettysburg/
- E10 | V | https://www.docsteach.org/tools
- E11 | V | https://www.inquirygroup.org/
- E12 | V | https://stacks.stanford.edu/file/druid:by786ht6640/a%20reisman_ReadingLikeaHistorian_CognitionandInstruction.pdf
- E13 | V | https://ies.ed.gov/ncee/wwc/PracticeGuide/8
- E14 | V | https://www.nationsreportcard.gov/highlights/ushistory/2022/
- E15 | V | https://apcentral.collegeboard.org/courses/ap-united-states-history/exam
- E16 | V | https://en.wikipedia.org/wiki/Chromebook
- E17 | V | https://www.ada.gov/resources/2024-03-08-web-rule/
- E18 | V | https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment
- E19 | **L** | the shipped legacy data (`legacy/dist/data/vignettes_part1.json`), measured read-only by the research
- E20 | **S** | https://www.gilderlehrman.org/history-now/journals/gettysburg-insights-and-perspectives

## INC: the inclusive history

- IC01, IC04 | V | https://www.nps.gov/gett/learn/photosmultimedia/on-freedom-s-tenuous-edge-virtual-tour.htm
- IC02 | V | https://emergingcivilwar.com/2020/05/06/the-confederate-slave-hunt-and-the-gettysburg-campaign/
- IC03 | V | https://historynet.com/family-or-freedom-confederate-camp-slaves-cruel-dilemma/
- IC05 | V | https://gettysburgcompiler.org/2018/03/12/separate-but-equal-gettysburgs-lincoln-cemetery/
- IC06 | V | https://npshistory.com/series/symposia/gettysburg_seminars/15/essay1.pdf
- IC07 | V | https://npshistory.com/series/symposia/gettysburg_seminars/5/essay6.htm
- IC08 | V | https://www.nps.gov/articles/000/civilians-at-gettysburg.htm
- IC09 | V | https://gettysburgcompiler.org/2021/12/31/nature-and-nurture-in-1863-anna-louisa-garlach/
- IC10 | V | https://npshistory.com/series/symposia/gettysburg_seminars/13/essay5.pdf
- IC11 | V | https://archive.org/details/reportonoperatio00doug
- IC12 | V | https://aleteia.org/2024/07/09/the-daughters-of-charity-at-gettysburg-part-2-photos/
- IC13 | V | https://derkulturbrief.substack.com/p/the-german-eleventh-the-xi-corps
- IC14 | **S** | https://en.wikipedia.org/wiki/Irish_Brigade_(Union_Army)
- IC15 | V | https://www.latinamericanstudies.org/civil-war-cubans/garibaldi-guard.htm
- IC16 | V | https://www.battlefields.org/learn/articles/NativeAmericanService
- IC17 | V | https://www.loc.gov/item/mal4356500/
- IC18 | V | https://archive.org/details/fiftiethannivers1914penn
- IC19 | V | https://www.nps.gov/gett/learn/historyculture/commemorative-works.htm
- IC20 | V | https://www.loc.gov/apis/json-and-yaml/working-within-limits/
- ex:Enslaved.org | V | https://enslaved.org/
- ex:VisEmanc | V | https://dsl.richmond.edu/emancipation/

## VIZ: visualization and sonification

- F01, F02 | V | https://npsgnmp.wordpress.com/2012/09/27/in-my-opinion-the-army-will-never-be-made-up-of-such-material-again-confederate-losses-at-gettysburg/
- F03 | V | https://www.nps.gov/civilwar/search-battles-detail.htm?battleCode=pa002
- F04 | V | https://www.battlefields.org/learn/articles/death-burial-guideposts-gettysburgs-dead
- F05 | V | https://en.wikipedia.org/wiki/1st_Minnesota_Infantry_Regiment
- F06 | V | https://gettysburg.stonesentinels.com/battle-of-gettysburg-facts/strength-casualties-usa/
- F07 | V | https://npsgnmp.wordpress.com/2012/07/26/what-happened-to-gettysburgs-confederate-dead/
- F08 | V | https://www.nps.gov/gett/learn/historyculture/gettysburg-overview.htm
- F09 | V | https://www.cambridge.org/core/journals/judgment-and-decision-making/article/if-i-look-at-the-mass-i-will-never-act-psychic-numbing-and-genocide/0E55D099E133068F9ACD5A0DBBE1E4E2
- F10 | **S** | https://dl.acm.org/doi/10.1145/3411764.3445637
- F11 | V | https://arxiv.org/html/2605.31026
- F12 | V | https://www.microsoft.com/en-us/research/publication/effectiveness-of-animation-in-trend-visualization/
- F13 | V | https://api.semanticscholar.org/graph/v1/paper/DOI:10.1371/journal.pone.0142444 (Hullman, Resnick, Adar)
- F14 | V | https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:24051797%20AND%20SRC:MED&format=json&resultType=core (Borkin et al.)
- F15 | V | https://commons.wikimedia.org/wiki/File:Minard.png
- F16 | V | https://sonification.de/handbook/download/TheSonificationHandbook-chapter15.pdf
- F17 | V | https://datadrivendj.com/tracks/subway
- F18 | V | https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- F19 | **L** | the shipped legacy data (`legacy/dist/data/casualty_apportionment.json`), measured read-only by the research
- F20 | V | https://en.wikipedia.org/wiki/Feist_Publications,_Inc.,_v._Rural_Telephone_Service_Co.

## ENG: engagement, return visits, partnerships

- E01 | V | https://en.wikipedia.org/wiki/Wordle
- E02 | V | https://benfeist.com/posts/airt-apollo11/
- E03 | V | https://en.wikipedia.org/wiki/Real_Time_WWII
- E04 | **S** | https://www.loc.gov/loc/lcib/970407/ndl.html
- E05 | V | https://openhumanitiesdata.metajnl.com/articles/10.5334/johd.67
- E06 | V | https://home.nps.gov/civilwar/soldiers-and-sailors-recordsorigin.htm
- E07 | V | https://www.ngsgenealogy.org/preserve-the-pensions/
- E08 | V | https://911digitalarchive.org/about
- E09 | V | https://www.nngroup.com/articles/participation-inequality/
- E10 | V | https://learninglab.psych.purdue.edu/downloads/2006/2006_Roediger_Karpicke_PsychSci.pdf
- E11 | V | http://creativegames.org.uk/modules/Gamification/Hamari_etal_Does_gamification_work-2014.pdf
- E12 | V | https://oembed.com/
- E13 | V | https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment/Text_fragments
- E14 | V | https://plausible.io/data-policy
- E15 | V | https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- E16 | V | https://docs.netlify.com/manage/forms/spam-filters/
- E17 | V | https://www.nps.gov/gett/learn/education/distance-learning.htm
- E18 | V | https://www.battlefields.org/about/accountability/terms-service
- E19 | V | https://www.civilwarseminars.org/civil-war-round-table-directory
- E20 | V | https://en.wikipedia.org/wiki/Remembrance_Day_at_the_Gettysburg_Battlefield

---

*End of pitch. Nothing here has been built, published or sent.*

---

# Fact-check log

Checked 2026-09-30 against the cited URLs or a fresh fetch. The web-search budget was already exhausted (200 of 200) when this pass began, so every check used a direct fetch: page fetches, public JSON APIs (Library of Congress, The National Map, Internet Archive, HathiTrust, Wikidata, USGS elevation, iTunes lookup), the research's local copies of the cited Internet Archive texts, and the owner's own repo documents for the `[site]` numbers. A page-summarizing fetcher mislabelled passages in the original research, so every number below that matters was read from an API response, a primary text or a PDF where one could be reached. Counts are of distinct checkable claims and are approximate: about 235 checked; 25 corrected; 9 downgraded to a labelled unverified or design-hypothesis statement; 3 removed.

## A. Corrected in place (25)

1. **"Frothing at the mouth."** The 27th Indiana account is from Cedar Mountain (August 1862), not Gettysburg. It is now context, not July 3 evidence (idea 1).
2. **Humidity and the speed of sound.** "At most about 1.5 m/s" is not in the cited Wikipedia page, which gives 0.1-0.6%. Reworded to roughly 0.4-2 m/s at this temperature.
3. **The 1666 Four Days' Battle.** The cited Speed of sound page does not contain it. The quote ("did not hear one word of a fight") is Pepys's, as quoted in Wikipedia's "Acoustic shadow" article. Attribution fixed.
4. **Hartwig's title.** He was the park's Supervisory Historian, not NPS Chief Historian. Fixed (idea 9).
5. **Cemetery totals, attribution.** The 3,354 figure is in the NPS Gettysburg Seminar essay on the cemetery's creation and the removal of the Confederate dead, which pairs it with 979 unknown. It is not the American Battlefield Trust's figure, and it is not "snippet-only". Fixed in idea 5, the conflict ledger (row 4) and section 5.3. The later copy with 3,564 (Pennsylvania 534) is the 1867 revised report.
6. **Cemetery totals, named count.** "About 2,500 named" now reads roughly 2,400-2,500 (3,354 or 3,512 minus 979), in idea 5, the fact-table row and struck item 10. The 1865 report text read states 3,512; the 979 comes from the NPS essay and was not found in the 1865 report excerpt read.
7. **Abraham Brian.** NPS says he claimed $1,028, received $15, and that "over 106" hasty graves were dug on his land. The pitch had "about 106 bodies".
8. **Arithmetic.** 6,000-9,000 net-new rows over 658 is 9.1x to 13.7x, not 13.6x.
9. **"The ten fact tables."** The section 2.2 table has nine rows (13 named tables if the environment row is unpacked), so "ten" matched neither. Reworded.
10. **Krick's grading.** Hartwig's post says 4 means "no better than Guild's original returns". The pitch generalised that to grades 3 and 4.
11. **Transcribe Bentham timing.** 207 seconds is the project-wide average, not the early figure. The later period averaged 141 seconds (early period about 364, computed). The 17-25 checks an hour is unchanged.
12. **Text-fragment support.** For text-fragment links MDN's compatibility data gives Chrome 80, Edge 80, Safari 16.1, Firefox 131. The pitch's Chrome 81 and Edge 83 are the JavaScript API's versions.
13. **LoC By the People.** The source says two volunteers must agree and that staff reviewed at least 5% of datasets. It does not set a 5% floor rule. Reworded in two places.
14. **Bachelder Papers (NHHS).** "Originals are not open" contradicts the finding aid, which says "Available for research" and asks that permission to reproduce or publish be requested.
15. **"12 of 185 Gettysburg records carry no advisory."** True, but 10 of the 12 are essay pages, not images (two image records). Caveat added in idea 3 and the rights table.
16. **NPS Then and Now.** The 8 pages are confirmed (Devil's Den, Rose Woods, Electric Railway, Little Round Top, Trostle Farm, Buildings and Farms, 1913 Reunion, 1938 Reunion). The 31-pair count was not re-verified, and only some captions carry Gardner stereo numbers and Frassanito page ranges ("on some", "some of NPS's captions").
17. **Round tables.** The directory says "hundreds"; "about 200" is not stated.
18. **CWSS "no longer maintained."** NPS does not say that. An independent analysis (Gopher Records) calls it "no longer supported", and NPS's own pages show a 2013 last-updated date. Attributed accordingly.
19. **NPS and genealogy.** The park page says it maintains no individual service or pension records. It does not say staff "cannot answer genealogy questions".
20. **Chandra sonification study.** The survey (3,184 participants, convenience sample) reports learning gains and mostly positive emotional descriptors in both groups. It does not report "strong" responses.
21. **Jennie Wade.** She is the only direct civilian casualty; others died indirectly. "Only confirmed civilian death" reworded.
22. **"589 numbered reports."** The numbering does run to No. 589 across Parts 1 and 2 (Part 1 TOC ends at No. 378; Part 2 ends with No. 589, the Confederate Roll of Honor), but some numbered items are documents (No. 7 Itinerary). Clarified.
23. **Nese and Harding "first."** The review calls the book "completely original", not "first". Wording fixed (idea 1).
24. **Point-cloud volume.** The 58 tiles in the research's bounding box total about 4,966 MB (listed by The National Map), not about 9 GB. Fixed in idea 8 and Feature 3.
25. **Heat-index source.** The quoted phrase "estimated by Nese and Harding from Harrisburg humidity" is not in the cited HistoryNet article, which reports a 98 F heat index at 2 p.m. with a 76 F dew point, a possible 105 F at 3-4 p.m., and up to 15 F more in direct sun, all for shade. Quotation marks removed (see also B1).

## B. Downgraded to labelled unverified or design hypothesis (9)

1. **Harrisburg as the humidity source**, and the 35-mile gloss (idea 1, two places). Not found in the review or HistoryNet article.
2. **Synchronized group experience as a documented awe elicitor** (idea 4). The Templeton awe white paper lists nature, art, music, threat and spiritual experience, and calls awe "relatively asocial"; collective engagement appears as an effect. Now a design hypothesis.
3. **The 4,500-5,000 enslaved range** (idea 6, ledger row 8). Not in the cited HistoryNet page, which gives "6,000-10,000, adopted by most scholars". Held until a source is found.
4. **"Two churches" and St. Paul A.M.E. Zion** (idea 6). Not on the cited NPS tour page. Labelled to-verify. The McAllister mill, Peter Fry/Biggs 1865 and Lincoln Cemetery points are confirmed.
5. **1913 reunion detail figures** (280 acres, about 5,000 tents, 688,000 meals, 744 admissions, nine deaths). Not on Wikipedia's article; the 1914 Pennsylvania report excerpt read did not reach them. Labelled unverified. The 53,407 and about 8,750 are confirmed.
6. **1938 figures** (1,845 veterans, average age 94, 150,000 newsreel crowd). Unverified. The 250,000 figure is on Wikipedia's Eternal Light Peace Memorial page.
7. **NHHS fee amounts** ($25, $50, $25, $100). Not in the finding aid. Labelled to re-verify with the Society.
8. **Lidar density 8.16 points per square metre.** Not in the project metadata or tile XML. Labelled; flight dates (December 12, 2024 to March 24, 2025), Quality Level 1 and the May 4, 2026 publication date were confirmed and added.
9. **"Many round tables struggle to program."** Unsourced; labelled unverified.

## C. Removed (3)

1. **"A semantic layer brings 9-19 points in domain" (BEIR).** Not in BEIR's abstract. The abstract says BM25 is a robust baseline, re-ranking and late-interaction models are best on average at high cost, and dense retrieval often underperforms. Replaced by that statement.
2. **Richard Jordan**, "who escaped during the battle and enlisted." Not in the cited HistoryNet page. Removed from the text; held pending a source.
3. **Biggs "fled before the battle and lost livestock."** Not in the cited American Battlefield Trust page, which says his home was used as a field hospital. Replaced.

## D. Confirmed

**Sky and sound.**
- Jacobs July 1-3 readings (July 1: 72/76/74; July 2: 74/81/76; July 3: 73/87/76 at 7 a.m., 2 p.m., 9 p.m.).
- Clouds clearing on the afternoon of July 2; the 87 F reading at 2 p.m. on July 3, which one secondary page calls the month's highest.
- "Thunder storm in neighborhood at 6 p. m. The thunder seemed tame, after the artillery firing of the afternoon"; rain "aggregating 1.390" inches on July 4-5.
- The wind conflict ("2 miles per hour" in one transcription, 12 mph in another).
- The cannonade "at seven minutes past 1 p. m."; Jacobs's "morning was pleasant, the air was calm, the sun shone mildly through a smoky atmosphere"; Haskell's "thick and sultry, the sky overcast with low, vapory clouds"; the "wet from the rain" passage describing Gordon's brigade on Friday June 26.
- USNO for Gettysburg: July 2 sunrise 04:44 and sunset 19:41 EST (04:35 and 19:32 local mean time), civil twilight ends 20:13 EST (20:04), moonrise 20:47 EST (20:38 LMT), 97% lit; moonrise 66 minutes after sunset. July 1 moonrise 20:02 EST (daylight fighting). July 3 91%. NASA: full moon July 1, 1863 at 06:46 UT (01:46 EST). The 8.9-minute LMT offset matches the longitude (2.23 degrees at 4 minutes a degree). No standard time before November 18, 1883.
- Nese and Harding (Arcadia/The History Press, 2025; NOAA reanalysis, Naval Observatory records, about 1,500 accounts); heat index 98 F at 2 p.m., possibly 105 F, up to 15 F more in sun.
- Pierce's "until the spring was empty" and "stench arising from the fields of carnage was most sickening" (July 7), memoir 1889, Pierce 15 in July 1863.
- Cyclorama sky restored with reference to Jacobs.
- Hippensteel (Civil War Monitor, December 15, 2025): Ewell 2-3 miles from about 40 guns, west-northwest wind, about 200 Hz against 1-2 kHz, the four ridges, no computational model.
- Ross's four publications (1998, 2000, 2000, 2001).
- Wikipedia's second-day article: Ewell's bombardment from Benner's Hill at 4 p.m.
- Speed of sound 331.3 + 0.606 T; wind shear of 4 m/(s km) equals a 7.5 C/km lapse rate; 4.6 seconds a mile at 87 F; 2.7 minutes to Harrisburg (about 35 miles); Taneytown about 12 and Pittsburgh about 150 miles.
- 20th Century Reanalysis (3-hourly, about 75 km, with uncertainty).
- NoiseModelling GPL v3; Astronomy Engine MIT; Virtual Paul's Cross (two awards; 8 listener positions, 4 crowd sizes).
- NCEI "controlled user access", citation required, no warranty.

**Images and maps.**
- LoC glass negatives: 8,727 items, 185 Gettysburg hits. The caption for LC-B8171-0234 reads "Bodies of Federal soldiers, killed on July 1, near the McPherson woods"; the LoC essay, following Frassanito, places Plates 36 and 37 near the Rose farm and Emmitsburg Road with Union Third Corps dead.
- Frassanito's about 60 negatives, almost 75% of corpses, graves and horses; Gardner's team arriving "after July 7"; NPS on the sharpshooter body moved about 40 yards.
- "No known restrictions" is not a public-domain declaration; LoC limits (20 a minute JSON, 150 text and image, one-hour block; legal page: 10 requests a minute for software).
- Bachelder map: "every change of 4 feet", houses with residents' names, 8,292 x 10,756 pixels, credit line, reduced from Warren's 200-feet-to-the-inch survey (1868-69, revised 1873).
- Photo Tourism (2006); WhatWasThere shut down; the NYPL Stereogranimator is no longer maintained; img-comparison-slider MIT.
- A re-tally of the glass-negative hits found 87 text matches for July 1863 with Gardner 22, Gibson 13 and Brady 3 agreeing with the pitch; the O'Sullivan and unattributed splits differ (see E).
- 7 records dated "July [5]" confirmed.

**Dispatches, the press and the clock.**
- Apollo in Real Time (1.1 million visitors from 224 countries; 11,000 hours of audio, 2,000 photographs, 15,000 utterances; 2009 hobby, 2015 launch).
- NYT May 24, 2020 (1,000 lives); Voltaire "less than 12 percent" of 19,000 letters; RealTimeWWII (over 500,000 followers; last post December 9, 2025).
- Official Records vol. 27: Part 1 is 584,253 words and Part 3 is 489,617 by recount; No. 196 is Chamberlain, No. 6 Meade, No. 7 the Itinerary compiled by Joseph W. Kirkley. About 2,200 clock times in Part 3 (2,194-2,204 by a loose regex, consistent with the 2,201 figure). 17 full-view HathiTrust copies from five holders.
- Lincoln Papers: 302 items dated June 25 to July 20, 1863, credit line confirmed; item mal4356500 is the Nicolay copy.
- Mastodon limits (300 a 5 minutes, 30 uploads a 30 minutes).
- NPS 2026 anniversary programs (60-minute indoor programs, free same-day tickets at 8 a.m., heat thresholds above 91 shorten and above 103 cancel); park open 30 minutes before sunrise to 30 minutes after sunset.
- Chronicling America (all confirmed by API): 5,265 July 1863 pages in 1,321 issues; 1,560 mention Gettysburg; 135 on July 1-3 and 382 on July 4-10; top titles Herald 262, Tribune 220, Chicago 112, Wheeling 110, Cleveland 108; L'Union (New Orleans) July 14, 1863 and Raleigh's Spirit of the Age present; the legacy API was retired in 2025. 1,560 pages at 10 requests a minute is 2.6 hours.
- Internet Archive: 103 Compiler and Adams Sentinel 1863 items (51 + 52); all cited archive ids exist and carry the cited dates.
- Calendar: November 19, 2026 is a Thursday (about seven weeks from September 30); July 1, 2027 is a Thursday and the 164th anniversary; 2038 is the 175th.

**People and the aftermath.**
- Weaver's 287 packages; Biggs's crew of 10-12 free African Americans; reburial resumed October 27, 1863 and ended March 18, 1864; 3,320 Confederate remains shipped 1871-73, 2,273 to Hollywood Cemetery; nearly 1,500 unaccounted for. The 1865 report gives 3,512 and the 1867 report 3,564 (Pennsylvania 534).
- 186 residents in 1860 and 74 in 1870; Devan enlisted November 20, 1863 and died at Olustee on February 20, 1864; nearly 40 Black men served; six stops in the NPS tour.
- Cormany (June 16, "droves" of 25-50), Hartman (June 22) and Schaff (21 seized, including Sam Brooks); Wingert's "at least several hundred"; NPS's "over 100" (Gay); Wikipedia's "up to 1,000"; 6,000-10,000 enslaved with the army; 64 servants at Fort McHenry by July 30, at least 16 enlisted.
- Lincoln Cemetery bought 1867 by the Sons of Good Will; Anna Louisa Garlach (Baltimore Street) and Schimmelfennig in the pigsty; Thorn's 91-105 burials; Peter Fry farm bought by Biggs in 1865; McAllister gristmill; Honey Springs July 17, 1863.
- 2,390 residents in the 1860 census (157 Black plus 31 Mulatto = 188).
- Camp Letterman: Daughters of Charity (16, Fr. Burlando) July 5; Hancock July 6; opening July 22; peak of 1,772 on August 10, almost half Confederate; September 23 picnic with blackface minstrelsy; last patient November 17; officers relieved November 20; about 4,000 patients; 112 Confederate officers and 1,235 enlisted in October; about 400 staff, about 40 women, 7 Army nurses; Letterman's whole-battle wounded count of 20,995 (14,193 Union + 6,802 Confederate) as quoted from his October 3, 1863 report on Wikipedia's Camp Letterman page, with the NPS essay confirming 6,802 Confederates "in his charge", about 1,800 of them in Union hospitals.
- NPS overview: "over 20,000" through the hospital, "By January 1864", "over 5,000 in one hour".
- Sanitary Commission report of August 15, 1863: 13,050 + 1,810 = 14,860 wounded; 11,000 lb of poultry and mutton; 8,500 dozen eggs; over 60 tons in refrigerating cars.
- GBMA chartered April 13, 1864, about 320 monuments by 1895; 1,328 monuments and markers; the three towers at 75, 60 and 23 feet; Eternal Light Peace Memorial (Stop 2) dedicated July 3, 1938.

**Numbers and the range.**
- All seven Confederate totals (20,451; 22,587; 22,709; 23,231 as reported by Wikipedia; 27,823; 28,000; 28,063), the 7,612 gap and Krick's 21 of 43 brigades; 12,227 captured against 5,150; Union 22,822 (Stone Sentinels) and 23,049 and 23,055 (both in Wikipedia).
- 158,343 (83,289 + 75,054), "more than 165,000", and 160,311 (91,699 + 68,612).
- 1st Minnesota (262 engaged; 215 by Lochren; 179 by Meinhard); Stone Sentinels counts 64 Medal of Honor recipients; Wikipedia gives the 2nd Wisconsin 77%.
- Robertson et al.: small multiples more accurate, animation fastest for presentation but error-prone.
- Two Trains uses instrument count for income (and avoids pitch), so the pitch's description is right.

**Terrain.**
- USGS PA_17County_D24: 36 tiles, 3,693 MB, published May 4, 2026, flown December 12, 2024 to March 24, 2025, Quality Level 1, "9.8 cm absolute vertical accuracy" (a produce-to spec, not a measured error). Three projects, 58 tiles in total. The 1 m DEM is four 2017 tiles of 469-485 MB.
- Grassland initiative (160 acres, May 9, 2026); Little Round Top reopened June 24, 2024; NPS and GeoCue 2017 earthworks, walls and railroad beds.
- USGS public-domain and credit lines. A coarse grid of USGS elevation point queries around the Little Round Top crest topped out at 660.6 ft, consistent with the cited 665.5 ft crest anchor (Wikipedia gives a rounded 650; the exact crest point was not located).

**The Historian, tools and the web.**
- Stanford RegLab 17-33%; Bentham 4,364 transcripts, 1% (13,279) of 1,180,829 words changed, 17% of Period A transcripts taking 45% of checking time; Reisman (about 236 students, five San Francisco schools, six months, partial eta squared .03-.09); Anti-Slavery Manuscripts findings; NPCEditor's three off-topic types (opaque, unknown, conceal); Dimensions in Testimony's unedited answers.
- Pagefind's "under 300 kB for 10,000 pages" and the Unity-manual one-letter-query issue; Wikidata Q80766 (Chamberlain), Q4630787 (20th Maine), Q1382693 (Iron Brigade); "Iron Brigade" returns four entities (video game, Union brigade, Shelby's Confederate cavalry, disambiguation page); 80 humans tagged to the battle.
- ADA Title II web rule: compliance moved by the April 20, 2026 interim final rule to April 26, 2027 and April 26, 2028.
- Wordle (emoji grid; some streaks reset after the move to the NYT); Kindred Britain's drag-one-node-onto-another gesture.
- NPS app (4.85 stars, 131,656 ratings, about 121 MB) and the paid Auto Tour app (4.80, 2,870 ratings, about 179 MB); Auto Tour lot capacities of 6, 29 and 31 spaces; six virtual field trips for 10-100 students.
- Preserve the Pensions (115 societies); NARA Catalog API (10,000 queries a month); ABT terms (scraping, framing, AI) and map policy (whole and unmodified); ABT's "added by 1,929 educators".
- CWSS (6.3 million cards for about 3.5 million soldiers; regiment-present caveat) and NARA's "rarely indicates battles".
- Netlify Forms (Akismet and honeypot); GPS accuracy 4.9 m; 10 degrees at 500 m is 88 m; Safari's seven-day script-storage deletion (WebKit blog 10218, not blog 14403); Killed at Gettysburg CC BY-NC 4.0; NPS public-domain, Arrowhead and unlimited-use-of-submissions wording; Gettysburg History's reproduction ban.
- `[site]` figures against the repo's own audit documents: 658 = 467 + 24 + 137 + 30; 11,088 indexed words; 512 monuments; 1,804 keyframes on 188 of 675 ticks; about 1,529 visitors and about 110 Historian views in 30 days; I Corps 49.6% (6,059 of 12,222) and VI Corps 1.8% (242 of 13,601).
- Pitch arithmetic rechecked: 13,160; 221,760; 52.7x; 11x and 149x; 17 gates; 18 ledger rows; 155,011 = 88,349 + 66,662 and 570 = 329 + 241 (the component sums are consistent; the underlying counts are the site's own); review-budget ranges (2,360-3,800; 1,000-2,400; 39-58 hours).
- Local recounts of cited Internet Archive texts: Fox 335,051 words (exact); Southern Historical Society Papers vol. 5 143,402 (cited 143,397); the Michigan/Google cemetery scan 69,709 (cited about 69,675).

## E. Could not verify (left in place, flagged as the pitch already flags or as noted)

- **Photographs.** The 107 distinct, 109 records, 77 negatives plus 32 print-only, and the photographer split (my tally gives O'Sullivan 29 and unattributed 20 against 17 and 22); 65 stereograph-genre records (my text tally found 56 stereograph-genre records among the 81-87 July 1863 text matches, on a different base); "about 99 month-only".
- **Weather and sound.** Jacobs scans themselves; the APS duplicate set; the Harrisburg Evening Telegraph item of July 3, 1863 (cited blog not fetched); Hippensteel's Ross attributions beyond the quoted passage; Ross's Gettysburg specifics.
- **Terrain.** Knowles's Smithsonian article (403); the viewshed test-case primaries (the Maine History Journal article is a student paper); Mapbox terms of July 21, 2026, clauses 1.6, 1.9 and 2.8.1, and Terrain-DEM being SDK-only; Rumsey's 23 maps and their CC BY-NC-SA licence; the lidar point-cloud class limits; Allmaps and MapLibre plugin details.
- **Visiting.** Gettysburg Foundation shutdown page (redirected to a cart host and not followed): the October 1, 2025 claim; the Auto Tour's 24 miles and 16 stops and the tactile bronze tables at Stops 2, 5 and 16 (not on the NPS pages read); 20 MB and 66 MB competitor app sizes; Commercial Use Authorization $350 fee and 3-5% of gross receipts; whether NPS populates its parking and road feeds; the declination of about 10 degrees west; the AR "22 of 30 labels stack".
- **People and rights.** Reveille's 5,040,436 records; CMOHS's 63; the Irish Brigade's 530; the Humiston story; "about 50" seized (Adams County); Tyson Brothers photograph and the 141-name muster roll; VA Gravesite Locator's 339 records; NYS museum pages; Library of Congress "Today in History" popularity; Boy et al. 2017 and Morais et al. 2021 findings (CHI page returned 403); King's College factoid model; the Wikipedia-derived 2,935 Richmond figure; "about a quarter" of the 1,328 monuments being Confederate (not found on the cited NPS page; treat as unverified).
- **The Historian.** Pagefind's "about 90 kB initial, 200 kB per query" talk figures; SQLite over HTTP Range and Netlify Range or compression behaviour; the Digital Inquiry Group catalogue counts; vocabulary-proxy scores (0.95, 0.84, 0.66, 0.82); the Part 2 and Part 3 yield and effort estimates (design intent already).
- **Letters and testimony.** Sickles's February 1864 testimony date, Lee's July 12 letter to his wife and Lincoln's July 14 letter "never sent" were taken from the research and widely known history, not re-fetched.
- **Owner figures.** 543 commander fates and the 155,011 / 329 / 241 / 88,349 / 66,662 splits are the site's own and were not re-derived here.
