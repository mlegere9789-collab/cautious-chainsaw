# Evidence pass for the group `town-public-buildings`: public and institutional buildings (court house, jail, almshouse, schools, banks, halls)

Written for OA10 (`GOVERNANCE/requirements.json`; handling `decision_log.md` DEC-OA10-12) following `evidence/PLAN.md`. The file is `evidence/town-public-buildings.jsonl`; `python3 -I tools/bt/town/validate_evidence.py town-public-buildings` and the same with `--complete` both pass on the file described here (run on 2026-11-16: 339 rows, 24 buildings; see section 9). No gate was run, no `passes` flag was set, nothing outside the ownership list was edited, nothing was deployed.

Tier letters in the tables: **D** documented, **I** inferred, **P** plausible-procedural (a generic rule, never a fact), **G** open gap; the number is the row id (`town-public-buildings.NNNN`).

## 1. Counts

| what | count |
|---|---|
| rows | 339 (building 24, field 275, search 40) |
| field rows of tier documented | 109 |
| field rows of tier inferred | 81 |
| field rows of tier plausible-procedural | 23 |
| field rows of tier open gap | 62 |
| field rows by evidence kind | text 141, map 34, image 4, none 96 |
| state rows (windows: day 9, part of day 1, period 2, unknown 6; open gaps 8) | 26 |
| conflicts carried (pairs; each is written on both rows) | 6 |
| searches by outcome | not_found 37, not_read 3 |

Buildings declared (24): the 3 records and basemap outlines of the inventory (`bld-courthouse` with `STR-TOWN-COURTHOUSE`; the poor house part of `bld-poorhouse-christ-lutheran-wills`; the nine plate symbols `STR-ALMSHOUSE-COMPLEX_BUILDING1` to `9`) and 13 new buildings `TWN-PUB-0001` to `0013` that no record of the repository names. Every id of the group inventory in `groups.json` is declared (`--complete` checks it).

### Field rows by field

| field | rows |
|---|---|
| place | 40 |
| state | 26 |
| occupant | 25 |
| existed_july_1863 | 24 |
| kind | 24 |
| footprint | 16 |
| storeys | 16 |
| walls | 16 |
| name | 15 |
| outbuildings | 15 |
| roof | 15 |
| built | 9 |
| tower_or_cupola | 8 |
| additions | 2 |
| colour | 2 |
| identity | 2 |
| lot_enclosure | 2 |
| openings | 2 |
| owner | 2 |
| photograph | 2 |
| x_heating | 2 |
| x_style | 2 |
| chimneys | 1 |
| height | 1 |
| lost | 1 |
| porch | 1 |
| sign | 1 |
| use | 1 |
| x_condition | 1 |
| x_cornice | 1 |

## 2. The buildings, field by field

One line per building; the cells list the rows of the field (a field with several rows has several statements: two times, two sources or a conflict).

### `bld-courthouse`: Adams County Court House (the building of 1858-59, Baltimore and West Middle Streets)

The building of 1858-59. HABS PA-265 (local as HABS-pa0004) describes the FIRST court house of the county (1804, demolished 1859), a different building: it is worked as TWN-PUB-0001.

| field | rows |
|---|---|
| existed_july_1863 | D0004 |
| name | D0002 |
| built | D0005 D0006 D0007 |
| kind | D0003 |
| occupant | D0009 |
| place | D0011 D0012 I0013 I0014 |
| storeys | I0015 |
| footprint | I0016 I0048 |
| walls | D0017 |
| roof | P0018 |
| outbuildings | G0049 |
| tower_or_cupola | D0020 D0021 I0022 I0024 I0025 I0027 |
| state | D0029 D0030 D0031 D0032 D0033 D0034 D0035 D0036 G0054 |
| additions | I0023 |
| chimneys | G0051 |
| colour | G0050 |
| openings | G0052 |
| photograph | I0026 I0028 |
| porch | G0053 |
| use | D0010 |
| x_cornice | D0019 |
| x_style | I0008 |

### `TWN-PUB-0001`: The old Court House in the centre of the Public Diamond (the first court house of Adams County, built 1804, demolished 1859)

NOT drawn in July 1863: demolished from 28 April 1859.

| field | rows |
|---|---|
| existed_july_1863 | D0059 |
| name | D0058 |
| built | D0060 |
| lost | D0061 |
| kind | D0063 |
| occupant | D0072 |
| place | D0062 |
| storeys | I0064 |
| footprint | G0065 |
| walls | D0066 |
| roof | I0067 |
| outbuildings | D0071 |
| tower_or_cupola | D0068 I0069 |
| state | I0073 |
| openings | I0070 |

### `TWN-PUB-0002`: The County Building (the county offices) on the north-east corner of the Public Square, sold in 1859 and a store thereafter

A public building until 1859; in July 1863 a private building. The street group of the Diamond may declare the same building under its own id: the integration step merges.

| field | rows |
|---|---|
| existed_july_1863 | I0078 |
| name | D0077 |
| kind | D0083 |
| occupant | D0080 |
| place | D0081 I0082 |
| storeys | G0084 |
| footprint | G0085 |
| walls | G0086 |
| roof | P0088 |
| outbuildings | G0087 |
| state | D0089 |
| owner | D0079 |

### `TWN-PUB-0003`: The market house built in the Public Square on the east side of the old court house (early nineteenth century)

Whether it still stood in July 1863 is an open gap: nothing local says when it was removed. Not drawn until a source says it stood.

| field | rows |
|---|---|
| existed_july_1863 | G0095 |
| name | D0094 |
| kind | D0097 |
| occupant | D0098 |
| place | D0096 |
| storeys | G0099 |
| footprint | G0100 |
| walls | G0101 |
| roof | P0103 |
| outbuildings | G0102 |
| state | G0104 |

### `TWN-PUB-0004`: The Adams County jail (the county prison), East High Street, south side, built 1851 after the fire of 1850

Photograph: none in the ledger. The Sanborn plan of 1886 draws the jail with a two-storey dwelling attached; the 1863 outline is not dated by any text.

| field | rows |
|---|---|
| existed_july_1863 | D0108 |
| name | D0107 |
| built | D0109 |
| kind | D0113 |
| occupant | D0122 |
| place | I0110 I0111 I0112 |
| storeys | I0114 |
| footprint | I0115 |
| walls | I0116 |
| roof | P0117 |
| outbuildings | I0118 |
| state | D0123 G0125 |
| lot_enclosure | I0119 |
| x_condition | D0121 |
| x_heating | D0120 |

### `TWN-PUB-0005`: The Public School house (the Union School), East High Street, north side, built 1857-58

Hospital in July and August 1863. Photograph: none identified in the ledger.

| field | rows |
|---|---|
| existed_july_1863 | D0129 |
| name | D0128 |
| built | D0130 |
| kind | D0136 |
| occupant | D0132 |
| place | D0133 I0134 I0135 |
| storeys | I0137 |
| footprint | I0138 |
| walls | D0139 |
| roof | P0141 |
| outbuildings | G0142 |
| state | D0143 D0144 |
| colour | D0140 |
| x_style | I0131 |

### `TWN-PUB-0006`: The Gettysburg Female Institute of Rev. David Eyster and Mrs. Eyster (1856 to about 1871), in the former Gettysburg Academy building at Washington and High Streets

A private school. The College used the building from 1832 to 1837. The Compiler directory of January 1859 calls the school the Female Academy; the History keeps that name for another school (TWN-PUB-0007): carried as a naming conflict in the report.

| field | rows |
|---|---|
| existed_july_1863 | I0148 |
| name | D0147 |
| kind | I0152 |
| occupant | D0149 |
| place | D0150 I0151 |
| storeys | D0153 |
| footprint | G0154 |
| walls | D0155 |
| roof | P0156 |
| outbuildings | G0157 |
| state | D0158 |
| identity | D0176 |

### `TWN-PUB-0007`: The Gettysburg Female Academy building (one-storey brick, about 1830), East High Street, adjoining the lot of the county prison

In 1886 the building was Miss Mary D. McClellan's select school. Whether the school of the building was in use in 1863 is not stated.

| field | rows |
|---|---|
| existed_july_1863 | I0166 |
| name | D0162 |
| built | D0163 |
| kind | D0168 |
| occupant | D0169 G0170 |
| place | D0167 |
| storeys | D0164 I0165 |
| footprint | I0171 |
| walls | D0172 |
| roof | P0173 |
| outbuildings | G0174 |
| state | G0175 |
| identity | D0177 |

### `TWN-PUB-0008`: The Bank of Gettysburg, the north side of East York Street east of the Diamond

The label "C. Bank" of the Hopkins inset is read here as this bank by its position beside the "County offices"; the letter before Bank is read as C or G.

| field | rows |
|---|---|
| existed_july_1863 | D0182 |
| name | D0181 |
| kind | D0186 |
| occupant | D0183 |
| place | D0184 I0185 |
| storeys | I0187 |
| footprint | G0188 |
| walls | I0189 |
| roof | P0190 |
| outbuildings | G0191 |
| state | D0192 |

### `TWN-PUB-0009`: The Farmers' and Mechanics' Savings Institution of Adams County, south-west corner of the Diamond (the base of the First National Bank of Gettysburg, 1864)

The First National Bank of Gettysburg was organised in February 1864 (History): later than July 1863, not drawn as a separate building.

| field | rows |
|---|---|
| existed_july_1863 | I0197 |
| name | D0196 |
| kind | D0200 |
| occupant | D0198 |
| place | I0199 |
| storeys | G0201 |
| footprint | G0202 |
| walls | G0203 |
| roof | P0205 |
| outbuildings | G0204 |
| state | D0206 |

### `TWN-PUB-0010`: The Gettysburg post office (the room on Baltimore Street near the Diamond that was the "late Post Office" in 1863 is its earlier place; the place of July 1863 is not found)

The post office is declared so that its place is a visible gap; no building is drawn for it.

| field | rows |
|---|---|
| existed_july_1863 | G0211 |
| name | I0210 |
| kind | D0214 |
| occupant | D0215 |
| place | D0212 G0213 |
| storeys | G0216 |
| footprint | G0217 |
| walls | G0218 |
| roof | P0220 |
| outbuildings | G0219 |
| state | G0221 |

### `TWN-PUB-0011`: Sheads & Buehler's Hall, corner of Carlisle and Railroad Streets, opposite the depot: a hospital in August 1863

May be the same building as McConaughy's Hall (TWN-PUB-0012), which the Hopkins inset of 1858 labels in the block beside Sheads & Buehler's coal and lumber yard: not settled.

| field | rows |
|---|---|
| existed_july_1863 | I0225 |
| name | D0224 |
| kind | D0228 |
| occupant | D0226 |
| place | I0227 |
| storeys | G0229 |
| footprint | G0230 |
| walls | G0231 |
| roof | P0233 |
| outbuildings | G0232 |
| state | D0234 |

### `TWN-PUB-0012`: McConaughy's Hall, in the block west of Carlisle Street beside the coal and lumber yard of Sheads & Buehler (Hopkins inset 1858)

May be the same building as Sheads & Buehler's Hall (TWN-PUB-0011): not settled.

| field | rows |
|---|---|
| existed_july_1863 | I0238 |
| name | D0237 |
| kind | D0241 |
| occupant | D0239 |
| place | I0240 |
| storeys | G0242 |
| footprint | G0243 |
| walls | G0244 |
| roof | P0246 |
| outbuildings | G0245 |
| state | G0247 |

### `TWN-PUB-0013`: The borough engine house (the first of 1809; a second of 28 by 8 feet ordered by the council), on the lot between Evan's store and Widow Chamberlain's lot

Whether any engine house stood in July 1863 is an open gap; the History says an effective fire company was organised only in January 1886. The brick Engine House with a hose tower of the Sanborn plan of 1886 is not dated by any text. Not drawn until a source says it stood.

| field | rows |
|---|---|
| existed_july_1863 | G0253 |
| name | D0252 |
| built | D0251 |
| kind | D0255 |
| occupant | D0260 |
| place | D0254 |
| storeys | G0261 |
| footprint | I0256 |
| walls | I0258 |
| roof | P0262 |
| outbuildings | G0263 |
| state | G0264 |
| height | I0257 |
| sign | I0259 |

### `bld-poorhouse-christ-lutheran-wills#poorhouse`: Adams County almshouse (the Alms House, the poor house, the county hospital): the complex on the Poor Farm north-east of the borough

The record bld-poorhouse-christ-lutheran-wills names three buildings in one printed row ("No source retrieved"); its poor house part is worked here, the Christ Lutheran part in town-churches and the Wills house part in street-baltimore. The nine building symbols of the Warren plate at the label COUNTY ALMSHOUSE are declared one by one below.

| field | rows |
|---|---|
| existed_july_1863 | D0273 |
| name | D0272 |
| built | D0274 |
| kind | D0283 |
| occupant | D0276 |
| place | D0277 I0278 I0279 I0280 I0281 I0282 |
| storeys | G0284 |
| footprint | G0285 |
| walls | I0286 I0287 |
| roof | P0288 |
| outbuildings | I0289 |
| state | D0293 G0294 |
| additions | I0290 |
| lot_enclosure | I0291 |
| owner | D0275 |
| x_heating | D0292 |

### The nine building symbols of the almshouse complex

Each of `STR-ALMSHOUSE-COMPLEX_BUILDING1` to `9` has four rows (the short profile of a map symbol): `kind` (P, `GR-POINT-POLE`), `existed_july_1863` (G: the complex stood in July 1863, which of the nine buildings did is not found), `place` (I: the base-map point, error 45 m, method `warren_plate_symbol`, with the reading of the Warren plate) and `occupant` (I, from the occupant of the almshouse).

| symbol | kind | existed_july_1863 | place | occupant |
|---|---|---|---|---|
| BUILDING1 | P0296 | G0297 | I0298 | I0299 |
| BUILDING2 | P0301 | G0302 | I0303 | I0304 |
| BUILDING3 | P0306 | G0307 | I0308 | I0309 |
| BUILDING4 | P0311 | G0312 | I0313 | I0314 |
| BUILDING5 | P0316 | G0317 | I0318 | I0319 |
| BUILDING6 | P0321 | G0322 | I0323 | I0324 |
| BUILDING7 | P0326 | G0327 | I0328 | I0329 |
| BUILDING8 | P0331 | G0332 | I0333 | I0334 |
| BUILDING9 | P0336 | G0337 | I0338 | I0339 |

## 3. Each target of the group (`groups.json`), and the rows that settle it

- **Court House**: record `bld-courthouse` and `STR-TOWN-COURTHOUSE`: `bld-courthouse` (the building of 1858-59); the old court house of 1804-1859 `TWN-PUB-0001`; the County Building `TWN-PUB-0002` and the market house `TWN-PUB-0003` of the Diamond. Building rows: bld-courthouse (0001), TWN-PUB-0001 (0055), TWN-PUB-0002 (0074), TWN-PUB-0003 (0090). Rows of the building lines: see section 2; searches that found nothing: 0039, 0040, 0041, 0042, 0043, 0044, 0045, 0046, 0047, 0056, 0057, 0075, 0076, 0091, 0092, 0093.
- **Jail / prison**: the county jail `TWN-PUB-0004` (the "General Jail" of the papers is the court term "General Jail Delivery", not a building: the search rows say so). Building rows: TWN-PUB-0004 (0105). Rows of the building lines: see section 2; searches that found nothing: 0106, 0124.
- **Almshouse (county poorhouse) complex**: the poor house part of the record and the nine plate symbols. Building rows: bld-poorhouse-christ-lutheran-wills#poorhouse (0271), symBUILDING1 (0295), symBUILDING2 (0300), symBUILDING3 (0305), symBUILDING4 (0310), symBUILDING5 (0315), symBUILDING6 (0320), symBUILDING7 (0325), symBUILDING8 (0330), symBUILDING9 (0335). Rows of the building lines: see section 2; searches that found nothing: 0265, 0266, 0267, 0268, 0269, 0270.
- **Public School**: the Public (Union) School house `TWN-PUB-0005`; the private schools `TWN-PUB-0006` (Eyster) and `TWN-PUB-0007` (Female Academy). Building rows: TWN-PUB-0005 (0126), TWN-PUB-0006 (0145), TWN-PUB-0007 (0159). Rows of the building lines: see section 2; searches that found nothing: 0127, 0146, 0160, 0161.
- **Banks**: the Bank of Gettysburg `TWN-PUB-0008` and the Farmers' and Mechanics' Savings Institution `TWN-PUB-0009`. Building rows: TWN-PUB-0008 (0178), TWN-PUB-0009 (0193). Rows of the building lines: see section 2; searches that found nothing: 0179, 0180, 0194, 0195.
- **also in the scope text of the group: post office, engine houses, market house, halls**: the post office `TWN-PUB-0010`, Sheads & Buehler's Hall `TWN-PUB-0011`, McConaughy's Hall `TWN-PUB-0012`, the borough engine house `TWN-PUB-0013`; the market house is `TWN-PUB-0003`. Building rows: TWN-PUB-0010 (0207), TWN-PUB-0011 (0222), TWN-PUB-0012 (0235), TWN-PUB-0013 (0248). Rows of the building lines: see section 2; searches that found nothing: 0208, 0209, 0223, 0236, 0249, 0250.

## 4. What was found that changes the picture (each with its rows)

1. **The HABS record is the first court house.** HABS PA-265 (`HABS-pa0004`) describes the court house of 1804 that stood in the centre of the Diamond and was demolished in 1859 (its own data page says "Demolished (1859)"); the product's `bld-courthouse` is the building of 1858-59 at the south-west corner of Baltimore and Middle Streets. The old court house is declared as `TWN-PUB-0001` with `existed_july_1863: no_longer_standing` (row 0059; it must not be drawn in the July scene), its form from HABS (brick, square, four identical three-bay facades, cross gable roofs, a central octagonal frame cupola: **inferred**, a 1983 compilation from a drawing of unknown source and date) and the belfry of the Compiler of September 1858 (documented).
2. **Three dates for the court house of 1858-59, carried.** Completed 1859 (History of 1886: contracted March 1858, ready for occupancy 1859; the Sentinel of 15 August 1859: the interior nearly finished, the Court to sit in it that week; row 0005), 1857 (Bachelder, 1873: "remained until 1857, when the present court-house was completed and the old one removed"; row 0006) and built in 1858 (Park Service, Evergreen Cemetery report; row 0007). The 1857 reading is contradicted by the Sentinel of 19 October 1857 (the site was only then chosen) and by the contract of March 1858 (Sentinel of 1 March 1858: "to be completed by the 1st of April, 1859"), but it is a published statement and stays a row; none is chosen.
3. **Footprint: three figures that do not agree.** Contract of March 1858: "60 feet by about 102" (row 0016; the Commissioners had enlarged it about 15 feet; the page image was looked at and reads 60 and 102). The 1886 Sanborn plan measured with its own scale: about 48 by 98 feet (row 0048). The 2023 outline of `STR-TOWN-COURTHOUSE`: 829 square metres (about 8,900 square feet; 40.7 by 28.5 m over its bounding box), against 569 square metres for 60 by 102 feet: **the outline the product extrudes is larger than any figure of 1858-1886 and carries later additions**. The two historical rows are in conflict on the width (10 feet); both stay. The 2023 outline is used only for the centre of the site (row 0013, error 8 m).
4. **The clock.** The History of 1886 says the steeple of 1859 contained "bell and town clock" (p. 43) and that H. D. Wattles gave the borough "the elegant town clock, now in the cupola of the court house" on 27 January 1868 (p. 193; row 0023, an addition of 1868, not drawn in July 1863); Tillie Pierce (1889) heard "the Court House clock" strike in 1863. A round dial-like element on the tower of the photograph of July 1863 (rows 0025, 0027) fits a clock, but the photograph does not name the building. Whether the clock of July 1863 was an earlier one is **not settled** (register entry EG-03).
5. **The court house in the battle, documented by window.** Public meeting 20 June (Jacobs); signal station on 1 July and still on 5 July (Captain Norton, Official Records); hospital on 1 July (Daniel Skelly, in the Slyder guide, p. 18) and "full of wounded" after the battle (Haskell); observation post from the cupola on the afternoon of Friday 3 July (Col. Morrow); wounded "sent out" some day before the move of a hospital (Hospital Scenes, 1864; the date is not in the sentence); in civil use again in August 1863 (sheriff's sale notice). Rows: 0029, 0030, 0031, 0032, 0033, 0034, 0035, 0036. The hospital pass (OA12) takes the hospital rows by building id. No damage is stated anywhere (five searches, section 6).
6. **Almshouse.** The Alms House stood in July 1863 (a bull and a heifer "came to the Alms House in July last", notice of Jacob Culp, Steward, 26 October 1863; the steward's list of paupers of 3 March 1863); built 1817-18 as the county hospital (History of 1886), with other buildings "at different times" and a **new part in 1878** (not in July 1863, not on the Warren plate: row 0290). Lieut. Bayard Wilkeson, mortally wounded on 1 July, was carried to the Almshouse and died there that night (row 0293). On the Warren plate the group at the label COUNTY ALMSHOUSE has nine black building symbols with seven letters beside them, **B three times, W three times, S once** (rows 0286; the plate's legend: W wood, B brick, S stone); Bachelder (1873) calls the group "a group of brick buildings" (conflict carried, rows 0286, 0287). Which of the nine buildings stood in July 1863 is **not found** (nine open gaps; the plate was surveyed in 1868-69 and revised in 1873). Bancroft's report names the York road beside the poor-house, the Park Service puts the Poor Farm Grounds on Old Harrisburg Road: not reconciled (register entry EG-04).
7. **The Warren plate says what it means to show.** Its printed legend reads "Every object is represented here as near as possible as it was at the time of the battle. Near each house is a letter, indicating its structure: W stands for wood, B for brick and S for stone." That is the map-maker's statement of intent (the title of the sheet records a survey of 1868-69 revised on the ground in 1873); it is **not** read here as proof that every building drawn stood in July 1863 (delegated decision DD-TWNPUB-02; register entry EG-09; it bears on every group that uses the plate).
8. **Jail.** A county jail stood and held prisoners in July 1863 (sheriff's notice of 21 July 1863); built 1851 after the fire of 7 January 1850 (History of 1886); a furnace under the cells judged insufficient by the grand jury of November 1857 and the County Prison found "dilapidated" with "many of the Cells insufficient" in April 1859 (rows 0120, 0121). The History says the jail "as it now stands" (1886) was built in 1851, so the Sanborn plan of 1886 is evidence for the jail of 1863 only by that bridge: brick, two storeys, a main block about 75 by 35 feet with a two-storey brick dwelling about 38 by 49 feet attached and stone yard walls marked 16 feet (all **inferred**, rows 0114, 0115, 0116, 0118). Position: East High Street, south side (three independent readings, rows 0110, 0111, 0112).
9. **Schools.** The Public (Union) School house on East High Street, north side: begun 1857 (Park Service Design Guide: the Italianate of the Philadelphia architect Samuel Sloan; the Compiler of 16 November 1857: nearly under roof, cornice going up, exterior brick work stained and penciled), a hospital for the wounded of 1 July and still one on 18 August 1863; the 1886 plan marks two storeys and about 74 by 48 feet (inferred). Two private schools are declared and carried with a **naming conflict**: the Eysters' Female Institute in the former Academy building at Washington and High Streets (two-storey brick, History of 1886; named in the Sentinel of 3 March 1863) is listed as "Female Academy" in the Compiler directory of January 1859, while the History keeps the name Female Academy for a one-storey brick school of about 1830 beside the jail lot (rows 0176, 0177).
10. **Banks and the Diamond.** The Bank of Gettysburg stood in June 1863 (Jacobs: its valuables had been sent to Philadelphia) on East York Street (advertisements "opposite the Bank"; "Wills' Building, opposite the Bank"); the Hopkins inset of 1858 labels "County offices", "C. Bank" and "Globe Hotel" side by side on the north side of York Street, and the Sanborn plan of 1886 draws the Bank (two storeys, brick) between a dwelling and office and a dwelling. The Savings Institution is the label at the south-west corner of the Diamond; the First National Bank was organised in February 1864 (later: not drawn). The old County Building (the offices) on the north-east corner of the square was sold to Col. M. Samson in April 1859 and was a store in 1886 (`TWN-PUB-0002`, stood: inferred). The market house east of the old court house stood in the early 1800s; whether it stood in 1863 is an **open gap**. The post office had left the room on Baltimore Street near the Diamond ("late Post Office") by January 1863; its place in July 1863 is **not found**.
11. **Halls.** Sheads & Buehler's Hall (corner of Carlisle and Railroad Streets, opposite the depot) was one of the three hospitals left in the town on 18 August 1863 (Sentinel); McConaughy's Hall held a ball in December 1858 and a shop in November 1863; the Hopkins inset labels "McConaughy Hall" beside the coal and lumber yard of Sheads & Buehler. They may be one building (not settled).

## 5. Photographs (photo-match ledger; ids read in `GOVERNANCE/horde/ws10-photomatch/REPORT.md`)

| LOC id | what was done | result |
|---|---|---|
| 2014646001 (O'Sullivan, "View of Gettysburg from Cemetery Hill", Sketch Book print) | the 4096 px scan was opened and the tower region looked at (crop saved) | a square tower with a round dial-like element on its upper stage, an arched opening below and a small spire or finial above (rows 0025, 0026, **inferred**: the caption does not name the court house; no measurement is taken, the ledger holds no documented camera position) |
| 2018671576 (Gibson stereo negative of the same view) | the 4096 px scan was opened and the town band of the left frame looked at | two towers above the roofs, the taller one right of centre read as the court house tower (rows 0027, 0028, **inferred**); the smaller tower at the left is not named here (another group) |
| 2014646002 ("View of Gettysburg from the Northwest", two-plate panorama) | the 1024 px local file was opened and the town band enlarged (left, middle, right) | no building of this group can be told apart at the resolution of the local file; a large cupola building at the left is not of this group (search rows 0037, 0038) |
| 2006685383 (a second print of 2014646001 according to the registry) | not opened | owed |

No other record of the 191 of the ledger names a building of this group (a title search for alms, poor, jail, prison, school, bank, court, hall, post office, market, engine found only three photographs of prisoners).

## 6. What was searched (every search row)

| row | building | where | outcome | at | query (shortened) |
|---|---|---|---|---|---|
| 0037 | * | LOC-PHOTO | not_found | 2026-11-16 | image reading of the photo-match record 2014646002 (View of Gettysburg from the Northwest; local file tmp/photomatch/loc/ppmsca.35052_v.jpg, 1024 px w |
| 0038 | * | LOC-PHOTO | not_found | 2026-11-16 | titles of the 191 records of tools/bt/photomatch/photograph_registry.json for alms, poor, jail, prison, school, bank, court, hall, post office, market |
| 0039 | bld-courthouse | HISTORY-ADAMS-1886 | not_found | 2026-11-15 | court[- ]?house[^.]{0,160}(two/three/2/3/second/upper)[- ]*(stor(y/ies)/floor) / (two/three)[- ]*stor(y/ies)[^.]{0,100}court[- ]?house (case-insensiti |
| 0040 | bld-courthouse | NPS-DESIGN-GUIDE | not_found | 2026-11-15 | the same expression over NPS-DESIGN-GUIDE, NPS-CLR-CEMETERY, BACH-WHATTOSEE-1873, HOKE-1887, JACOBS-1864, NPS-CLI-LANDSCAPE |
| 0041 | bld-courthouse | ADAMS-SENTINEL-OTHER | not_found | 2026-11-16 | court[- ]?house[^.]{0,200}(yard/out[- ]?house/privy/stable/shed/enclosure/iron fence/railing) over ADAMS-SENTINEL-OTHER, GBG-COMPILER-OTHER, ADAMS-SEN |
| 0042 | bld-courthouse | GBG-COMPILER-OTHER | not_found | 2026-11-15 | court[- ]?house[^.]{0,220}(slate/tin/shingle/roof/paint/colou?r/portico/steps/pavement/fence/iron/cupola/clock/bell/tower) and the reverse order, year |
| 0043 | bld-courthouse | JACOBS-1864 | not_found | 2026-11-15 | court[- ]?house across JACOBS-1864, HOSPSCENES-1864, TPIERCE-1889, HASKELL-1908, HOKE-1887, LETTERMAN-1866, BACH-WHATTOSEE-1873/1889, CEM-REPORT-1867, |
| 0044 | bld-courthouse | OR27-1 | not_found | 2026-11-15 | court[- ]?house[^.]{0,200}(Gettysburg/cupola/steeple/hospital/prison) and the reverse order, OR27-1 to OR27-3 |
| 0045 | bld-courthouse | ADAMS-SENTINEL-1863 | not_found | 2026-11-15 | court[- ]?house across ADAMS-SENTINEL-1863 and GBG-COMPILER-1863 (53 hits, each read) |
| 0046 | bld-courthouse | NPS-DESIGN-GUIDE | not_found | 2026-11-15 | court[- ]?house across every Park Service text of the library (46 hits, each read) |
| 0047 | bld-courthouse | CA-1863 | not_found | 2026-11-16 | court[- ]?house within a sentence of Gettysburg, hospital, wounded, cupola, steeple, signal or observ (the 221 saved newspaper pages that contain both |
| 0056 | T0001 | HABS-pa0004 | not_found | 2026-11-15 | HABS PA-265 data pages and photograph caption: shape and dimensions |
| 0057 | T0001 | HISTORY-ADAMS-1886 | not_found | 2026-11-16 | (old court-house / court-house ... square) within 200 characters of a number of feet, "by N", stories, cupola, belfry or clock, over ADAMS-SENTINEL-OT |
| 0075 | T0002 | HISTORY-ADAMS-1886 | not_found | 2026-11-16 | the building of the county offices: storeys, walls, roof, footprint, date of building |
| 0076 | T0002 | SANBORN-1886 | not_read | 2026-11-16 | the north-east corner of the Diamond on the 1886 sheets (Weaver & Co.'s store) |
| 0091 | T0003 | HISTORY-ADAMS-1886 | not_found | 2026-11-16 | market[- ]?house, whole text; read every Gettysburg hit, looking for its removal or for a statement that it stood after 1859 |
| 0092 | T0003 | GBG-COMPILER-OTHER | not_found | 2026-11-16 | market[- ]?house in ADAMS-SENTINEL-OTHER, GBG-COMPILER-OTHER, ADAMS-SENTINEL-1863, GBG-COMPILER-1863, years 1857, 1858, 1859, 1863 |
| 0093 | T0003 | HOPKINS-1858-INSET | not_found | 2026-11-16 | the Diamond on the inset of 1858 |
| 0106 | T0004 | HISTORY-ADAMS-1886 | not_found | 2026-11-16 | jail, prison with brick, stone, feet, stories, wall, cell, dwelling, keeper over ADAMS-SENTINEL-OTHER, GBG-COMPILER-OTHER, ADAMS-SENTINEL-1863, GBG-CO |
| 0124 | T0004 | ADAMS-SENTINEL-1863 | not_found | 2026-11-16 | jail or prison near Gettysburg, damage, release, hospital or use by the armies in July 1863 over ADAMS-SENTINEL-OTHER, GBG-COMPILER-OTHER, ADAMS-SENTI |
| 0127 | T0005 | ADAMS-SENTINEL-OTHER | not_found | 2026-11-16 | school-house or school building with feet, stories, rooms, bell, cupola, cost, brick near High, Gettysburg, Union, borough over ADAMS-SENTINEL-OTHER,  |
| 0146 | T0006 | HISTORY-ADAMS-1886 | not_found | 2026-11-16 | Gettysburg Academy, Female Institute, Eyster: dimensions, footprint, roof, outbuildings of the academy building |
| 0160 | T0007 | ADAMS-SENTINEL-1863 | not_found | 2026-11-16 | the occupant or school of this building in 1863 over ADAMS-SENTINEL-OTHER, GBG-COMPILER-OTHER, ADAMS-SENTINEL-1863, GBG-COMPILER-1863 and the History |
| 0161 | T0007 | HISTORY-ADAMS-1886 | not_found | 2026-11-16 | dimensions, footprint, roof, outbuildings of this building |
| 0179 | T0008 | HISTORY-ADAMS-1886 | not_found | 2026-11-16 | bank with brick, stories, building, erected, feet, vault, Gettysburg, over ADAMS-SENTINEL-OTHER, GBG-COMPILER-OTHER, ADAMS-SENTINEL-1863, GBG-COMPILER |
| 0180 | T0008 | SANBORN-1886 | not_read | 2026-11-16 | the Bank on sheet 2 of November 1886: a measurement of the plan |
| 0194 | T0009 | ADAMS-SENTINEL-OTHER | not_found | 2026-11-16 | Savings Institution with a description of the building over ADAMS-SENTINEL-OTHER, GBG-COMPILER-OTHER, ADAMS-SENTINEL-1863, GBG-COMPILER-1863 and the H |
| 0195 | T0009 | SANBORN-1886 | not_read | 2026-11-16 | the south-west corner of the Diamond on the 1886 sheets |
| 0208 | T0010 | GBG-COMPILER-1863 | not_found | 2026-11-16 | post[- ]?office within 140 characters of street, corner, diamond, Baltimore, Chambersburg, removed, located, building or the reverse, years 1857-1859, |
| 0209 | T0010 | HISTORY-ADAMS-1886 | not_found | 2026-11-16 | post[- ]?office, Gettysburg, place, postmaster |
| 0223 | T0011 | ADAMS-SENTINEL-1863 | not_found | 2026-11-16 | Hall with McConaughy, Sheads, Buehler within 200 characters of stories, brick, feet, erected, built, floor, room over ADAMS-SENTINEL-OTHER, GBG-COMPIL |
| 0236 | T0012 | GBG-COMPILER-OTHER | not_found | 2026-11-16 | McConaughy hall: a description of the building over ADAMS-SENTINEL-OTHER, GBG-COMPILER-OTHER, ADAMS-SENTINEL-1863, GBG-COMPILER-1863 |
| 0249 | T0013 | GBG-COMPILER-OTHER | not_found | 2026-11-16 | engine house, fire company, fire engine, hose house in ADAMS-SENTINEL-OTHER, GBG-COMPILER-OTHER, ADAMS-SENTINEL-1863, GBG-COMPILER-1863, years 1857-18 |
| 0250 | T0013 | HISTORY-ADAMS-1886 | not_found | 2026-11-16 | engine house, fire company, Gettysburg, p. 195: any statement that an engine house stood after 1830 or in 1863 |
| 0265 | POOR | HISTORY-ADAMS-1886 | not_found | 2026-11-16 | (alms[- ]?house / poor[- ]?house / poor farm / county hospital)[^.]{0,200}(brick/stone/stor(y/ies)/feet/barn/wing/frame) over ADAMS-SENTINEL-OTHER, GB |
| 0266 | POOR | HISTORY-ADAMS-1886 | not_found | 2026-11-15 | the buildings of the almshouse complex: which stood in 1863 (p. 43; the chapter on the poor, p. 95) |
| 0267 | POOR | NPS-GMP-1999-V1 | not_found | 2026-11-15 | Adams County Poor Farm buildings of 1863 over every Park Service text (alms-house, poor-house, poor farm, county hospital: 61 hits, each read) |
| 0268 | POOR | WARREN-1869 | not_found | 2026-11-16 | a date of building for each building symbol at the label COUNTY ALMSHOUSE |
| 0269 | POOR | HOPKINS-1858-COUNTY | not_found | 2026-11-16 | the Alms Houses on the county sheet of 1858: which buildings |
| 0270 | POOR | NPS-GMP-1999-V1 | not_found | 2026-11-16 | the use of each building of the complex (main house, asylum, workhouse, barn) over the same texts; and (alms[- ]?house/poor[- ]?house)[^.]{0,200}(woun |

Not shown as rows because they only located passages that rows quote: the corpus scans for court house, jail, alms-house, bank, post office, hall and school names over the local books, the Official Records, the Park Service texts and the weeklies (scan helpers in `tmp/town-town-public-buildings/scripts`; the hit files are in `tmp/town-town-public-buildings/*.txt`).

## 7. What was not found (the open gaps), by building

- `bld-courthouse`: chimneys, colour, openings, outbuildings, porch, state
- `TWN-PUB-0001`: footprint
- `TWN-PUB-0002`: footprint, outbuildings, storeys, walls
- `TWN-PUB-0003`: existed_july_1863, footprint, outbuildings, state, storeys, walls
- `TWN-PUB-0004`: state
- `TWN-PUB-0005`: outbuildings
- `TWN-PUB-0006`: footprint, outbuildings
- `TWN-PUB-0007`: occupant, outbuildings, state
- `TWN-PUB-0008`: footprint, outbuildings
- `TWN-PUB-0009`: footprint, outbuildings, storeys, walls
- `TWN-PUB-0010`: existed_july_1863, footprint, outbuildings, place, state, storeys, walls
- `TWN-PUB-0011`: footprint, outbuildings, storeys, walls
- `TWN-PUB-0012`: footprint, outbuildings, state, storeys, walls
- `TWN-PUB-0013`: existed_july_1863, outbuildings, state, storeys
- `bld-poorhouse-christ-lutheran-wills#poorhouse`: footprint, state, storeys
- the nine plate symbols: `existed_july_1863` each (the complex stood; which buildings is not found).

Nothing about the interior arrangement of any building (rooms, the court room, the cells, wards), no opening, porch, colour or chimney count of the court house, no roof form or material of any building of the group in a text of 1857-1863 (the cross gable roof of the old court house is the HABS drawing's), and no outbuilding of the court house, the school or the bank is stated in a local text: the drawing uses the generic rules named below and says so.

## 8. Generic rules used (plausible-procedural rows)

- `GR-POINT-POLE` for `kind`: 9 rows
- `GR-ROOF-GABLE-30` for `roof`: 14 rows

No new rule is proposed. The proposed rule `GR-FACADE-BAYS` and the others marked proposed in `generic_rules.json` were not needed.

## 9. Conflicts carried (none chosen)

- rows 0005 and 0006 (`bld-courthouse`): year of completion: 1859 (History 1886, Sentinel 1859) against 1857 (Bachelder 1873)
- rows 0005 and 0007 (`bld-courthouse`): year of completion: 1859 (History 1886, Sentinel 1859) against built in 1858 (National Park Service)
- rows 0006 and 0007 (`bld-courthouse`): year of completion: 1857 (Bachelder 1873) against built in 1858 (National Park Service)
- rows 0016 and 0048 (`bld-courthouse`): width of the building: 60 feet (contract of March 1858, before it was built) against about 48 feet (the 1886 plan, measured); the length agrees (about 102 against about 98 feet); the two are carried, none is chosen
- rows 0176 and 0177 (`T0006`): which school the name Female Academy names: the Eysters' school in the academy building (Compiler directory of 1859) or the one-storey school of about 1830 beside the jail lot (History of 1886)
- rows 0286 and 0287 (`bld-poorhouse-christ-lutheran-wills#poorhouse`): the buildings of the almshouse: brick, wood and stone letters on the plate (1868-73) against "a group of brick buildings" in the guide of 1873

## 10. Proposed register entries, request notes, decisions

- Register entries (format of `GOVERNANCE/register/EG-*.md`, status open, proposed): `GOVERNANCE/horde/ws-town/proposed-register/town-public-buildings-EG-01.md` to `-EG-09.md`.
- Request notes: `GOVERNANCE/horde/requests/bt-town-public-buildings-diamond-crossrefs.md` (to the street passes) and `GOVERNANCE/horde/requests/bt-town-public-buildings-structures.md` (to the structures and renderer owners).
- Delegated decisions appended to `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md`: DD-TWNPUB-01 to DD-TWNPUB-03.

## 11. What was run and what was not

Run: reading of the plan, the contract, the validator and the examples; the earlier scratch work of this group (2026-11-14: the acquisition of the county history of 1886, Hoke, Rupp, the 1850-64 weeklies and HABS PA-265, and the first quote finder) was inspected, its quotes re-located and **re-read in this pass** (while reading the scans, hits that look like Gettysburg evidence were found to concern other towns and were not used: the court house and jail of Chambersburg in Hoke, the new school house of Petersburg in the Compiler of 24 January 1859, the court house and jail of Carlisle in the Sentinel of 21 July 1863); corpus scans over the local texts for each building class; page images looked at: the Sentinel of 1 March 1858 (the contract size), page 17 of the Slyder guide (the map key, whose text layer is garbled), the Hopkins inset (crops at full size around the Diamond and High Street, enlargements of the labels), the Hopkins county sheet at the Alms Houses, the Warren plate at the almshouse (crops at 2x and 7x) and at its legend, the Sanborn sheets of November 1886 (court house, jail, school, engine house, bank, key and scale bar), the LOC photographs 2014646001, 2014646002 and 2018671576; the scale of the Sanborn crops was verified by matching them to the 25 percent overview of the sheet (court house and scale bar crops match at scale 0.25, correlation 0.91 and 0.97; the jail and school measurements were made on new native-resolution crops fetched in this pass); every quote is located by the validator's own functions; `validate_evidence.py town-public-buildings` and `--complete` pass.

Network: tile.loc.gov image-service crops of the Hopkins inset (`la000697`: 2 requests), the Warren plate (`cw0353500`: 2) and Sanborn sheet 1 (`07682_1886-0001`: 3), at least 1.5 seconds apart; no other request. No file was downloaded that is not a crop of a source already in `SOURCES.md`, so no row was appended to `SOURCES.md` (the ledger refuses a second row for an id; the crops are in `tmp/library/town/<source id>/` with the prefix `pub_` and their provenance is: region and scan named in the `image_ref.item` of the rows that use them).

**Not run / owed**:
- the full-text job over the whole newspaper family `CA-1863` for the Gettysburg court house was queued behind the machine lock and had not returned; a grep of the 221 saved pages that contain both "court house" and "Gettysburg" was read instead (search row for `CA-1863`: nothing about the Gettysburg court house; one hit about Vicksburg);
- the Sanborn plans of the bank, the Savings Institution, the north-east corner of the Diamond and the halls were not measured or opened (search rows `not_read`); the scale of sheet 2 was not verified;
- page images were not opened for the OCR-damaged quotes of the Compiler (the tower of 15 November 1858, the brick-work of 1 November 1858 and others): the rows quote the damaged text as it stands (`OCR damaged` in the notes) and claim nothing beyond the legible words;
- the photocopy of the drawing HABS PA-265-1 (the old court house) and the second print 2006685383 were not opened; the Bachelder map of 1863 (`BACHELDER-1863`) and the Waud drawings (`WAUD-DRAWINGS-LOC`) were not searched for these buildings;
- the Hopkins inset has no legend on the crops read: the hatched buildings are read as drawn, their meaning (brick, stone or public building) is not claimed;
- blocked hosts (not retried, not worked around): the Adams County Historical Society indexes (damage claims, deeds, 1858 and 1872 name indexes, tax) would settle the owners and the damage; the 1860 manuscript census (accounts) would give the keepers and teachers. Owner steps are in `PLAN.md` section 12.

Copy audit: the rows and this report contain no mention of AI, Claude, Anthropic, agents or how the site was produced (checked with a word-boundary search of the evidence file before it was written).
