# Request note: bt-town, group town-churches, second pass (2026-11-16)

From the evidence pass of the group `town-churches` (`docs/battle-theatre/town/evidence/town-churches.jsonl` and `.REPORT.md`). Nothing outside the ownership list of the pass was edited. This note **supersedes** the first-pass notes (`bt-town-town-churches-hospitals.md`, `-structures.md`, `-white-church.md`) on the points below; those notes are not edited.

## 1. To the hospital pass (OA12, bt-life-hospitals)

Row ids are `town-churches.NNNN`; every statement below has a quote, a page and an offset in its row. What is new since the first note:

- **The German Reformed church (TWN-CHU-0002) was a hospital** (row 0194, documented: Mrs. S. M. Stewart, 1915: "The Reformed Church and the Public School building next to it ... were filled with wounded men"; and the printed caption of the Tyson card LOC 2024640779: "German Reformed Church on the hill, used as a hospital after the battle"). The first note said no source named it: that is withdrawn.
- **The United Presbyterian church (TWN-CHU-0003) was a hospital** ("filled to their utmost capacity", on West High Street opposite the Catholic church; the Christian Commission's "church opposite"); its grounds held **two long trenches** of dead wrapped in blankets, with heavy boards over them after rain (rows of the state `other`).
- **Presbyterian church (H-01):** wounded in it on the afternoon of 1 July (documented: neighbours brought food from then on); occupied "during the greater part, if not the whole, of the month of July, until ... Camp Letterman was established"; **boards laid on the backs of the pews** (the pews stood); straw bedding, no bunks; the church "much damaged" and renovated with help raised at Pittsburgh and Philadelphia. **Whose hospital:** the Sanitary Commission (Cavalry Corps, Dr. Rulison) and the congregation's own history ("a Cavalry Hospital") say Cavalry; the Christian Commission lists it among the First Corps hospitals of the town: carried as a conflict, none chosen. The owner plan's "set up June 30" and "fell to Confederates evening Jul 1" remain without a non-lead source.
- **Christ Lutheran (College) church:** occupied at once and for **nearly six weeks** (about 10 to 12 August) by the Second Division of the First Corps; **forty in the lecture room and a hundred in the body of the church on boards laid across the tops of the pews** (the pews stood); struck once; patients later taken to the seminary; repairs voted on 23 November 1863 (second-hand: the 1938 article quoting Dr. Hay's discourse of 1877).
- **St. James' Lutheran:** **five weeks** as a hospital; the pews stood and were blood-stained; medicines were dispensed from the altar; hit by bullets; repair bill $2,024.17 (second-hand: the pastor's church record of 1864 as quoted in 1938).
- **St. Francis Xavier (H-02):** the Christian Commission made **bunks for all the patients, raising them from the floor**, cleaned out the wet musty straw, fresh bedding, windows fixed to lower from the top; the Sisters of Charity washed and fed the men; the church was one of the First Corps hospitals of the town. Barton's pew seats, aisles and gallery are another time or part; **no source says pews were removed** (the plan's wording stays unsupported).
- **All churches:** the Christian Commission says that on Saturday to Tuesday, 4 to 7 July, "every church and public building, and in fact every private house, was filled with wounded men" (inferred rows give each unnamed church that window).
- The Public School building next to the Reformed church was also filled with wounded men and its repair delayed the opening of school (for the pass of the public buildings).

## 2. To the structures and integration owners (`app/data/town/buildings.json`, the hand-over)

- **Towers (inferred, from the Tyson cards, catalogued [between 1861 and 1865] and [between 1863 and 1880], whose captions name the churches):** Christ Lutheran (the College Church): an **open round lantern of tall arched openings under a cornice ring, a low hemispherical dome and a small finial, on a square stage** (row `chr_cupola_photo` of the report). German Reformed: an **open lantern of four slender posts under a plain cornice with a low dome and a small finial, on a square stage, on a tall light-coloured wall** (rows `ref_lantern_photo`, `ref_colour_photo`). Catholic: a Roman cupola of about 60 ft (documented, row 0125). St. James': **a steeple** (documented, second-hand), form unknown. Presbyterian: no tower is named in any source; the front of 1915 has three round-arched openings and a round window in the gable, which may be later than 1863 (a later row, not for the July scene).
- **Presbyterian church:** built **1842** on a lot bought in December 1841 (the congregation) against 1840 (History of 1886): both carried; Sunday School rooms added 1877-78; a **third footprint scenario**, about 45 by 73 ft, is the plan of 1886 without its two-storey east part (inferred; the three scenarios are in conflict and none is the default). A low stone retaining wall in front, a large tree and a picket fence on the next lot are in the halftone captioned 1863 of the congregation's volume (inferred).
- **St. James':** built at York and Stratton streets in or soon after 1848; the pastor of 1863 was Rev. Abraham Essick.
- **The steeple of the sharpshooters stays unidentified** (EG-01): four churches have documented towers; none is chosen.
- The product text for these rows must say what each tier is; rows with the note "the 1938 article quotes the text" are second-hand.

## 3. To the photo-match pass (ws10-photomatch; `tools/bt/photomatch/`)

The ledger holds 191 records and **does not hold** these records of the Library of Congress, which name churches of the borough in their own captions (images read at 4096 px; the hashes are in `tmp/library/town/LOC-PHOTO-CHURCHES-2/`):

- **LOC 2024640778** (Tyson, stereograph no. 578, ppmsca.98370): Chambersburg Street from the east corner of the Diamond, "showing the cupola of the College Church, occupied as a hospital after the battle"; Swan's Grocery at the right.
- **LOC 2024640779** (Tyson, ppmsca.98372): Stratton Street and the "German Reformed Church on the hill, used as a hospital after the battle".
- **LOC 2024640777** (Tipton, [between 1880 and 1890], ppmsca.98369): "German Reformed Church, used as a hospital": **not read**; a later view of the same church.
- LOC 2024640776 (Tyson, ppmsca.98367): Stratton Street, the rail fence where Sergeant Humiston fell: houses, no church named.

The catalogue dates are [between 1861 and 1865] (no. 578), [between 1863 and 1880] (no. 561) and [between 1880 and 1890] (the Tipton card); the captions put the two Tyson cards after the battle. No camera position is documented for any of them. Please add them to the registry (or tell this pass why not).

## 4. To the pass of Chambersburg Street (street-chambersburg) and of the public buildings (town-public-buildings)

- LOC 2024640778 shows, on the north side of Chambersburg Street at the Diamond, **Swan's Grocery**: a white two-storey building with its gable to the street and a signboard SWAN'S GROCERY, and a row of two- and three-storey brick buildings on the south side with the College Church behind them (positions by eye, no measurement).
- The Public School building next to the German Reformed church (the Union School of the public-buildings group): "the only public school in town" in 1863, filled with wounded men, with repairs that delayed the opening of school (Mrs. Stewart, 1915; row 0194 of the churches file).

## 5. Owner steps (written down, not done)

The church record of St. James (the entry of 1864), the minutes of Christ Church of November 1863 to January 1864, Dr. C. A. Hay's Historical Discourse (18 February 1877) and Dr. J. B. Baker's History of St. James are quoted only at second hand in an article of 1938 (EG-10); contacting the congregations or the Adams County Historical Society is an act for the owner.
