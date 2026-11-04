# History layer v1: notes

Written by `node docs/battle-theatre/app/tools/history-notes.mjs` from the layer and its data (every count and list below is computed). `tests/history.test.mjs` fails if this file is stale.

## What it is

`src/history/real.mjs` replaces the placeholder layer (`stub.mjs`, still available as `?history=stub`) behind the same contract (`data-contract.md`, with the 1.1 additions that the real layer needed and the 1.3 additions: casualties, guns, per-figure kit, change of formation; see `CASUALTIES-NOTES.md`). Inputs: `history/units.json`, `arrivals.json`, `not_on_field.json` (PDF B.2.4 ledger and B.3 order of battle), `GOVERNANCE/conflicts_structured.json`, `structures/*.json`, `kit/kit_specs.json`, `kit/weapons.json`, `kit/artillery_batteries.json`, `kit/cavalry_units.json`, `data/kit-crosswalk.json`, `data/battery-guns.json`, `data/casualty-sources.json`, `data/engagements.json`, `data/figures-validation.json`, `data/gazetteer.json` (named places from repository files only) and `data/placement.json` version 2 (the reading of every key-position, night-position, first-on-field and left-or-moved clause of the 44 ledger rows; built by `tools/build-placement.mjs` from the clause table `tools/placement-clauses.mjs`) and `data/placement-claims.json` (entries read from the Official Records position ledgers A, B, C and D; built by `tools/build-claim-placement.mjs` from the reviewed table `data/claim-curation.json`; one row for every claim read in `data/claim-dispositions.json`). Nothing in it is a coordinate, strength, time or quotation that the files do not carry; what the files do not say is an open gap, drawn as such or not drawn. The loader refuses an entry whose phrase is not literally in its ledger cell or in the claim it cites.

## Counts

| | units |
|---|---|
| in the roster | 726 |
| **placed**: a road of approach (printed, or for the units marked modelled taken from the sibling formations of the corps, DEC-015) and at least one place resolves (a dated place of a ledger, or a day-level position of the troop maps, contract 1.5) | 418 |
| **at the arrival edge only**: a road of approach is printed (or modelled), no place after arrival is (neither a ledger place nor a troop-map position reaches the unit); the unit waits in its column outside the loaded ground | 21 |
| **open gap**: a leaf unit (regiment, battalion, battery) on the field with no road of approach in the record and no modelled road (DEC-015): not drawn, listed on its card with the reason | 108 |
| formations above the regiments (armies, corps, divisions, brigades, groups): not drawn, they carry the printed figures | 165 |
| listed as never or only partly on the field (PDF gating rule 2): not drawn | 14 |

Units with a resolved entry: 439 (418 placed, 21 edge only). Unresolved: 108 leaf units (4 of them headquarters, staff or grouping entries with no figure). Figures drawn: 127,572, one soldier per figure, no cap. Kit manifests: 81 regiments have their own record in `kit/kit_specs.json`, all other units show the default for their army and arm (tier plausible-procedural).

## Approaches: how a unit comes to have a road

A unit is drawn only if the PDF ledger, or a usable claim of the Official Records position ledgers (the next section), prints a road of approach for it or for a formation above it, or (from v6) if the sibling-road rule (DEC-015, section “Roads of approach (history layer v6)” below) gives it a MODELLED road taken from the other formations of its corps. The table below lists the approaches read from the PDF ledger rows (AP-01 to AP-07); the approaches read from claims (AP-08 onward) are in the next section. **Inheritance is the rule** (PDF gating rule on an unknown arrival: no earlier than the next documented event that required it): a regiment, battery or battalion marches in its brigade's column, a brigade in its division's, a division in its corps's, and takes the nearest printed road on its own line of command and that formation's arrival gate (the gates are not changed: Q04). The tier of the approach is **inferred** where the road is printed for a formation below the corps or for the unit itself, and **plausible-procedural** where only the corps-level road is printed; each unit's card says which, quotes the printed phrase and its row, and names the evidence gap (EG-0005: primary sources unread; the register has no entry for the order of march within a column). The place in the column is the ledger's (roster) order, plausible-procedural: the order of march within a column is an open gap. A unit with no printed road anywhere in its chain stays an open gap and is not drawn.

| approach | road | printed for | printed phrase | tier as printed | units drawn, by tier of the approach as applied |
|---|---|---|---|---|---|
| AP-01 | Emmitsburg Road | `us-1c` | “Jul 1: head about 10:00 on the Emmitsburg Road” | inferred | 36 plausible-procedural |
| AP-02 | Emmitsburg Road | `us-3c-1d` | “Birney’s division: dusk Jul 1 (about 20:00) on Cemetery Ridge via the Emmitsburg Road (SS1, W-CEMR)” | inferred | 17 inferred |
| AP-07 | Black Horse Tavern Road | `us-3c-2d` | “Values conflict: about 00:00 Jul 2 (EPP) vs about 02:00 Jul 2 (SS1) after counter-marching at about 21:00 on the Black Horse Tavern road” | inferred | 0: the road "Black Horse Tavern Road" does not cross into the loaded ground; AP-07 prints it for us-3c-2d |
| AP-04 | Hanover Road | `us-5c-1d-vincent-20me` | “Jul 1 night: night march from Hanover (20th Maine)” | inferred | 1 inferred |
| AP-03 | Baltimore Pike | `us-12c-1d-lockwood` | “Lockwood’s brigade arrives Jul 2 about 08:00 from Baltimore” | inferred | 3 inferred |
| AP-05 | Emmitsburg Road | `us-cav-1d-merritt` | “about 15:00 on the Emmitsburg Road” | inferred | 5 inferred |
| AP-06 | Hunterstown Road | `cs-cav-hampton` | “After Hunterstown on Jul 2: arrives at dusk to night (rear guard at Hunterstown, Jul 2 about 16:30 to dark)” | inferred | 6 inferred |

Units drawn by tier of approach: 213 inferred, 226 plausible-procedural. Roads that give an entry: Baltimore Pike, Carlisle Road, Chambersburg Pike, Emmitsburg Road, Hanover Road, Harrisburg Road, Hunterstown Road, Taneytown Road; AP-03, AP-04 and AP-06 read a road from the place it leads to (“from Baltimore”, “from Hanover”, “after Hunterstown”), AP-01, AP-02 and AP-05 print the road itself. Not adopted, for the owner: the “from”/“at” towns of the night cells (Taneytown, Frederick, Emmitsburg, Westminster, Manchester, Fayetteville, Cashtown for the Confederate corps) are not read as roads; the ledger prints them as night positions, not as the way the unit came onto the field.

## Position ledgers of the Official Records: what was read, used and left out

The five ledgers `history/positions/positions_{A,B,C,D,E}.jsonl` hold one claim per statement of an OR vol. 27 report (ledgers A to D: report id, printed page, verified quote, tier, `fidelity_check`, `claim_support_verified`) or of a state regimental volume (ledger E, history layer v8: volume, section, printed page, verified quote, the same tier and checks; the adapter in `tools/claim-ledger.mjs` names the source of a claim whatever the ledger, so E claims are admitted by exactly the same rules). **A claim is used only if `claim_support_verified` is true and `fidelity_check` is `passed_full_read` or `corrected`** (an open gap, a downgraded claim and a not-rechecked claim are never used; an `inferred` claim may drive only an `inferred` placement, and the card says so). Ledger B is read only after the line `RECHECK B COMPLETE` is the last line of `positions/RECHECK_B_NOTES.md`. The ledgers are not edited. The reviewed table is `data/claim-curation.json`; `tools/build-claim-placement.mjs` writes `data/placement-claims.json` (the entries the layer loads, with a digest of every claim they cite) and `data/claim-dispositions.json` (one row for every claim read: used, or left out and why). Every phrase of an entry is checked at load against the claim's own verified quote or printed place or road words (or, where marked `record`, against the OR record by `tools/verify_claim_phrases.py`); every time against the claim's printed clock (or a printed named period, which takes the labelled convention of the PDF); every place is the gazetteer place the ledger references and must be in the printed words; no coordinate, time, road or quotation is invented.

| ledger | claims | not usable | used (drives a unit, support, or recorded and inert) | left out |
|---|---|---|---|---|
| A | 688 | 22 | 21 (9 drive an entry, 1 support one, 11 are recorded and not applied) | 667 |
| B | 1,864 | 39 | 17 (11 drive an entry, 0 support one, 0 are recorded and not applied, 6 establish a documented absence) | 1,847 |
| C | 538 | 18 | 12 (10 drive an entry, 2 support one, 0 are recorded and not applied) | 526 |
| D | 413 | 4 | 18 (15 drive an entry, 3 support one, 0 are recorded and not applied) | 395 |
| E | 200 | 0 | 7 (2 drive an entry, 1 support one, 1 are recorded and not applied, 3 establish a documented absence) | 193 |
| **all** | 3,703 | 83 | 75 | 3,628 |

**Not applied** means an entry that is valid and recorded but draws nothing: it belongs to a unit, or a formation, none of whose leaf units has a road of approach (inert; it applies the moment a road is printed for the unit), or it falls before the unit’s own ledger gate or is replaced by a nearer entry.

### Before and after

| | PDF ledger rows only | with the position ledgers | change |
|---|---|---|---|
| units placed (a road of approach and a dated place) | 61 | 362 | +301 |
| units at the arrival edge only | 11 | 21 | +10 |
| open gap (no road of approach) | 476 | 164 | -312 |
| units drawn | 72 | 383 | +311 |
| figures drawn (one soldier per figure, no cap) | 21,728 | 110,272 | +88,544 |
| approach records | 7 | 43 | +36 |
| stops (positions) | 61 | 83 | +22 |
| departures | 0 | 1 | +1 |

### Why claims are not used

| reason | claims | A | B | C | D |
|---|---|---|---|---|---|
| no clock and no named period is printed in the claim (a day or a day-part only), so no time can be given to a place | 1,796 | 343 | 932 | 231 | 195 |
| the place is not one the gazetteer holds (a description such as “the ridge”, a town or village with no coordinates in the repository, or no place printed) | 924 | 99 | 601 | 152 | 54 |
| passes the mechanical tests; reviewed by hand and not used (the reason is on the row of data/claim-curation.json) | 300 | 74 | 50 | 42 | 75 |
| a departure: no road that the gazetteer holds is printed in the claim | 201 | 35 | 111 | 35 | 11 |
| a strength note: it carries no place or time to place a unit | 108 | 20 | 65 | 13 | 10 |
| the ledger references a gazetteer place but its name is not in the printed words of the claim (the reference is the compiler's inference) | 100 | 43 | 6 | 24 | 27 |
| the claim may not be used: claim_support_verified is false, or its fidelity check is not passed_full_read or corrected, or its tier is an open gap | 83 | 22 | 39 | 18 | 4 |
| the place is a road: a stop needs a place, and the position along a road is not printed | 54 | 18 | 26 | 4 | 3 |
| the ledger gives a time that the claim's own printed words do not confirm (an hour borrowed from another sentence, a damaged digit) | 27 | 1 | 13 | 4 | 2 |
| the place lies outside the loaded ground (Cashtown, Hunterstown, ...): a unit may only be there marching in | 15 | 3 | 0 | 0 | 11 |
| the place is a stream or a feature too broad to stand a unit in (sigma over 1,500 m) | 11 | 4 | 4 | 1 | 2 |
| two claims of one unit at the same place at different hours within 90 minutes: neither is placed, both are listed | 4 | 3 | 0 | 0 | 0 |
| the claim puts the unit at another place than a PDF-ledger entry set for a formation above it within 90 minutes: the PDF entry stays as it is, the claim is not applied, both are listed | 3 | 1 | 0 | 2 | 0 |
| agrees with a PDF-ledger entry that already places the unit: nothing is added | 1 | 1 | 0 | 0 | 0 |
| two roads of approach for one unit (or a road that differs from the PDF ledger row of the unit): none is chosen, both are listed | 1 | 0 | 0 | 0 | 1 |

The reason of every one of the 3,628 claims left out is a row of `data/claim-dispositions.json` (claim, ledger, unit, kind, disposition, reason code, reason in words). The 164 leaf units with no road of approach are listed in the section “Units with no place” below.

### Approach roads added (AP-08 onward)

Each is the road a report prints for the unit's own march or arrival, resolved to a gazetteer road that crosses the loaded ground. Units inherit it down their line of command as before (tier `inferred` where the road is printed for a formation below the corps or for the unit itself, `plausible-procedural` under a corps-level road); the gate of no unit is changed (Q04).

| approach | road | printed for | claim(s) | report, page | printed words (where found) | claim tier | units drawn by it |
|---|---|---|---|---|---|---|---|
| AP-08 | Emmitsburg Road | `us-1c-1d-meredith-2wi` | `POS-A-1D1-015` | OR27-1-R034, p. 273 | “Emmitsburg pike” (quote) | documented | 1 inferred |
| AP-09 | Emmitsburg Road | `us-1c-1d-meredith-7wi` | `POS-A-1D1-028` | OR27-1-R036, p. 278 | “the road running from Emmitsburg to Gettysburg” (place.printed) | documented | 1 inferred |
| AP-10 | Emmitsburg Road | `us-11c-1d` | `POS-A-11B-024` | OR27-1-R253, p. 727 | “Emmitsburg road” (quote) | documented | 8 inferred |
| AP-11 | Hanover Road | `us-5c-2d` | `POS-C-0105` | OR27-1-R203, p. 634 | “Gettysburg and Hanover road” (quote) | documented | 14 inferred |
| AP-12 | Baltimore Pike | `us-6c` | `POS-C-0215`, `POS-C-0214`, `POS-C-0212` | OR27-1-R224, p. 665 | “broad and excellent pike leading direct to Gettysburg” (quote) | documented | 44 plausible-procedural |
| AP-13 | Hanover Road | `us-cav-2d-gregg` | `POS-A-CV2-001` | OR27-1-R355, p. 975-976 | “pike leading from Gettysburg to Hanover” (quote) | documented | 4 inferred |
| AP-14 | Chambersburg Pike | `cs-3c-heth-archer` | `PD-3c-heth-archer-01` | OR27-2-R552, p. 646 | “down the turnpike road leading to Gettysburg” (in the OR record) | documented | 5 inferred |
| AP-15 | Chambersburg Pike | `cs-3c-heth-davis` | `PD-3c-heth-davis-03` | OR27-2-R553, p. 648-649 | “by a turninke road leading to Gettysburg” (in the OR record) | documented | 4 inferred |
| AP-16 | Chambersburg Pike | `cs-3c-heth-pettigrew` | `PD-3c-heth-pettigrew-01` | OR27-2-R550, p. 642 | “road leading from Chambersburg to Gettysburg” (in the OR record) | documented | 4 inferred |
| AP-17 | Chambersburg Pike | `cs-3c-pender` | `PD-3c-pender-01`, `PD-3c-pender-mcgowan-01` | OR27-2-R556, p. 656 | “along the turn]uke through Cashtown” (in the OR record) | documented | 20 inferred |
| AP-18 | Chambersburg Pike | `cs-3c-anderson-wilcox` | `PD-3c-anderson-wilcox-01` | OR27-2-R537, p. 616 | “Chambersburg and Gettysburg turnpike” (in the OR record) | documented | 5 inferred |
| AP-19 | Chambersburg Pike | `cs-2c-johnson-nicholls` | `PD-2c-johnson-nicholls-01` | OR27-2-R483, p. 513 | “marching on the Cashtown road” (quote) | documented | 5 inferred |
| AP-20 | Chambersburg Pike | `cs-2c-johnson-andrews` | `PD-2c-johnson-andrews-01` | OR27-2-R505, p. 543 | “moving along the Chambersburg road” (in the OR record) | documented | 1 inferred |
| AP-21 | Emmitsburg Road | `us-3c` | `POS-B-us-3c-25` | OR27-1-R076, p. 369 | “on the Emmitsburg road” (in the OR record) | documented | 5 plausible-procedural |
| AP-22 | Emmitsburg Road | `us-3c-1d-ward-99pa` | `POS-B-us-3c-1d-ward-99pa-01` | OR27-1-R148, p. 513 | “by way of the Emmitsburg road” (quote) | documented | 1 inferred |
| AP-23 | Emmitsburg Road | `us-3c-1d-trobriand-40ny` | `POS-B-us-3c-1d-trobriand-40ny-02` | OR27-1-R156, p. 526 | “up the pike leading to Gettysburg” (quote) | documented | 1 inferred |
| AP-24 | Emmitsburg Road | `us-3c-2d-burling` | `POS-B-us-3c-2d-burling-02` | OR27-1-R158, p. 531 | “the main road from Emmitsburg to Gettysburg” (in the OR record) | documented | 6 inferred |
| AP-25 | Taneytown Road | `us-2c-3d` | `POS-B-us-2c-3d-01` | OR27-1-R115, p. 453 | “moving on the Taneytown road” (quote) | documented | 13 inferred |
| AP-26 | Baltimore Pike | `us-12c` | `POS-B-us-12c-12` | OR27-1-R272, p. 773 | “moving on the Baltimore pike toward Gettysburg” (quote) | documented | 6 plausible-procedural |
| AP-27 | Baltimore Pike | `us-12c-2d` | `POS-B-us-12c-2d-20` | OR27-1-R293, p. 825 | “turnpike leading from Baltimore to that place” (in the OR record) | documented | 11 inferred |
| AP-28 | Baltimore Pike | `us-12c-2d-kane` | `POS-B-us-12c-2d-kane-19` | OR27-1-R303, p. 848 | “marched by the Baltimore turnpike” (quote) | documented | 3 inferred |
| AP-29 | Baltimore Pike | `us-12c-art` | `POS-B-us-12c-art-08` | OR27-1-R314, p. 869 | “moving along the Baltimore pike” (quote) | documented | 4 inferred |
| AP-30 | Hanover Road | `us-12c-1d-colgrove` | `POS-B-us-12c-1d-colgrove-05` | OR27-1-R273, p. 782 | “by the Hanover road to Gettysburg” (quote) | documented | 5 inferred |
| AP-31 | Chambersburg Pike | `cs-3c` | `PD-3c-01` | OR27-2-R534, p. 606 | “encamped on the road from Chambersburg to Gettysburg” (in the OR record) | documented | 20 plausible-procedural |
| AP-32 | Chambersburg Pike | `cs-3c-anderson-wright` | `PD-3c-anderson-wright-01` | OR27-2-R539, p. 622 | “took up the line of march along the turnpike in the direction of Gettysburg” (in the OR record) | documented | 4 inferred |
| AP-33 | Taneytown Road | `us-2c` | `POS-B-us-2c-20` | OR27-3-D0967, p. 462 | “the road between Taneytown and Gettysburg” (place.printed) | documented | 37 plausible-procedural |
| AP-34 | Taneytown Road | `us-art-reserve` | `POS-C-0327` | OR27-1-R315, p. 872 | “on the Taneytown road, near the cross-road leading to Two Taverns” (quote) | documented | 22 plausible-procedural |
| AP-35 | Hanover Road | `us-cav-2d` | `POS-A-CV2-003` | OR27-3-D1019, p. 489 | “3 miles from Gettysburg, on the Hanover road” (quote) | documented | 5 inferred |
| AP-36 | Harrisburg Road | `cs-2c-early` | `PD-2c-early-06`, `PD-2c-early-02` | OR27-2-R470, p. 468 | “the direct road from Heidlersburg to Gettysburg” (direction_or_road) | documented | 10 inferred |
| AP-37 | Harrisburg Road | `cs-2c-early-hays` | `PD-2c-early-hays-01` | OR27-2-R472, p. 479 | “arrived with my brigade on the Heidlersburg road” (quote) | documented | 5 inferred |
| AP-38 | Harrisburg Road | `cs-2c-early-hoke` | `PD-2c-early-hoke-01` | OR27-2-R473, p. 484 | “Heidlersburg road” (direction_or_road) | documented | 3 inferred |
| AP-39 | Carlisle Road | `cs-2c-rodes` | `PD-2c-rodes-02`, `PD-2c-rodes-04` | OR27-2-R426, p. 317 | “the Middletown road” (direction_or_road) | documented | 22 inferred |
| AP-40 | Carlisle Road | `cs-2c-rodes-carter` | `PD-2c-rodes-carter-03` | OR27-2-R426, p. 317 | “the Middletown road” (direction_or_road) | documented | 1 inferred |
| AP-41 | Chambersburg Pike | `cs-1c-mclaws-kershaw` | `PD-1c-mclaws-kershaw-02` | OR27-2-R432, p. 366 | “a point on the Gettysburg road, some 2 miles from that place” (quote) | documented | 6 inferred |
| AP-42 | Emmitsburg Road | `us-11c-2d` | `POS-E-US-11C-2D-004` | NY3-S009, p. 1053~1055 | “Emmitsburg Pike” (direction_or_road) | inferred | 8 inferred |
| AP-43 | Emmitsburg Road | `us-11c-art-1nyi` | `POS-E-US-11C-ART-1NYI-002`, `POS-E-US-11C-ART-1NYI-001` | NY3-S024, p. 1246 | “on the Emmitsburg Road” (place.printed) | inferred | 1 inferred |

Where the printed name is not the gazetteer's, the identification is said on the card:

- AP-08: printed as the Emmitsburg pike; the gazetteer road is Emmitsburg Road (the ledger references GZ-041).
- AP-09: printed as the road running from Emmitsburg to Gettysburg; the ledger references GZ-041, Emmitsburg Road.
- AP-11: printed as the Gettysburg and Hanover road; the gazetteer road is Hanover Road (the ledger references GZ-043).
- AP-12: the pike is named the Baltimore and Gettysburg pike in claim POS-C-0214 of the same report and referenced as GZ-039 (Baltimore Pike) in POS-C-0212; the identification is the ledger's, not a second source.
- AP-13: printed as the pike leading from Gettysburg to Hanover; the gazetteer road is Hanover Road (the ledger references GZ-043). The place is stated as about 2 miles from Gettysburg, which lies beyond the east edge of the loaded ground.
- AP-14: a turnpike leading to Gettysburg from near Cashtown: the Chambersburg Pike (the ledger references GZ-075 Cashtown and prints Cashtown-Gettysburg turnpike); the name Chambersburg Pike is the gazetteer's.
- AP-15: a turnpike road leading to Gettysburg from camp near Cashtown (OCR "turninke"): the Chambersburg Pike.
- AP-16: the turnpike road leading from Chambersburg to Gettysburg, half way between Cashtown and Gettysburg: the Chambersburg Pike.
- AP-17: the turnpike through Cashtown toward Gettysburg (OCR "turn]uke"): the Chambersburg Pike.
- AP-19: printed as the Cashtown road, the road from Cashtown to Gettysburg: the gazetteer's Chambersburg Pike (the ledger references GZ-040).
- AP-20: printed as the Chambersburg road: the gazetteer's Chambersburg Pike (alias Chambersburg Road).
- AP-23: the pike from Emmitsburg to Gettysburg, printed without its name: the gazetteer's Emmitsburg Road (the ledger references GZ-041).
- AP-24: the main road from Emmitsburg to Gettysburg: the gazetteer's Emmitsburg Road (the ledger references GZ-041).
- AP-27: the turnpike from Baltimore to Gettysburg: the Baltimore Pike (the ledger references GZ-039).
- AP-31: the road from Chambersburg to Gettysburg, near Fayetteville and on to Cashtown: the Chambersburg Pike (the gazetteer's name); the divisions and brigades of the same corps print the same road (AP-14 to AP-18) and no formation of the corps prints another gazetteer road (Pegram's battalion calls the road to Cashtown the Baltimore pike; the ledger takes that for the printed name of the same road, and its claim PD-3c-res-art-pegram-02 is not used).
- AP-32: the turnpike through Cashtown Gap toward Gettysburg (the only road Wright prints is 'the turnpike'): the Chambersburg Pike, the gazetteer's name (the ledger prints Chambersburg-Gettysburg turnpike through Cashtown Gap and references GZ-075 Cashtown); the phrase stands about 900 characters after the claim's quote in the same report.
- AP-33: printed as the road between Taneytown and Gettysburg: the road named by its two ends, the gazetteer’s Taneytown Road (the ledger references GZ-042, “by inference” from those words); the two ends are the words of the claim, the name is the gazetteer’s.
- AP-34: printed as the Taneytown road (the gazetteer’s name; the ledger references GZ-042): the road from Taneytown to Gettysburg, with its cross-road to Two Taverns.
- AP-35: printed as the Hanover road: the gazetteer’s Hanover Road (the ledger references GZ-043); 3 miles from Gettysburg puts the division east of the loaded ground.
- AP-36: printed as the direct road from Heidlersburg to Gettysburg (Early’s own words; the road he formed his line across): the Heidlersburg road of the road-name concordance RC-01, which is the gazetteer’s Harrisburg Road inside the loaded ground (tier inferred; no sheet prints the name Heidlersburg on a road).
- AP-37: printed as the Heidlersburg road: RC-01, the gazetteer’s Harrisburg Road inside the loaded ground (tier inferred).
- AP-38: printed as the Heidlersburg road (the OCR of the quote reads Heidler.sLurg road; the ledger’s road field gives the name): RC-01, the gazetteer’s Harrisburg Road inside the loaded ground (tier inferred).
- AP-39: printed as the Middletown road: the road-name concordance RC-02, which is the gazetteer’s Carlisle Road inside the loaded ground (Warren: CARLISLE ROAD and NEWVILLE ROAD; Bachelder: NEWVILLE ROAD) (tier inferred; no sheet prints the name Middletown road).
- AP-40: printed as the Middletown road: RC-02, the gazetteer’s Carlisle Road inside the loaded ground (tier inferred).
- AP-41: printed as the Gettysburg road, from Fayetteville: RC-03, the Chambersburg Pike, for this passage only (tier inferred); not a name of a road elsewhere.
- AP-42: printed as the Emmitsburg Pike (the ledger's road field; the quote is cut after "by the Emmitsburg"): the gazetteer's Emmitsburg Road (the ledger references GZ-041); the 154th New York sketch is the commission's unsigned historian's, claim tier inferred. The other claim of the division (POS-E-US-11C-2D-001: "the circuitous route by Horner's Mills", the compiler's summary) names a route the gazetteer cannot place (RC-07) and is listed on the card as a conflicting claim; neither is resolved.
- AP-43: printed as on the Emmitsburg Road, three or four miles from the smoke and exploding shell: the road is printed by name; at noon on 1 July the battery was on it, outside the loaded ground, riding toward the fight. The claim POS-E-US-11C-ART-1NYI-001 prints the same road for the morning march from the camp at Emmitsburg.

**Roads read by the compiler (AP-03, AP-04, AP-06: “from Baltimore”, “from Hanover”, “after Hunterstown”).** No approach claim of the curation table prints a road for any of these units or for a unit under them (the 20th Maine’s claims name Hanover only as a place, and the Emmitsburg road only for the march away on 5 July; Hampton’s claim prints “the road to Gettysburg”, not named), so none is replaced: they stay roads named for the place they lead to, tier inferred. AP-03 (Baltimore Pike) agrees with AP-26, which prints the same road for a formation above the unit.

### Stops added (PO-62 onward)

A stop says the unit stands at the place by the printed time (a march ends there at that time; before it the unit waits in its column at the edge, plausible-procedural). A name that stands for the whole field (“Gettysburg”) is placed at the borough's centre only where the report says the unit arrived at or entered the town. A claim before the unit's own ledger gate is kept in the data and not applied.

| stop | unit | place | time | claim | report, page | claim tier | leaf units drawn under the unit | placed by it |
|---|---|---|---|---|---|---|---|---|
| PO-62 | `us-11c-3d-krzyzanowski-26wi` | Cemetery Hill | 1 Jul 16:00 | `POS-A-11B-062` | OR27-1-R263, p. 746 | documented | 0 | 0 (inert) |
| PO-63 | `us-art-reserve-huntington-1nh` | Cemetery Hill | 2 Jul 16:00 | `POS-C-0400` | OR27-1-R326, p. 892 | documented | 1 | 1 |
| PO-64 | `us-art-reserve-huntington-1nh` | Cemetery Hill | 3 Jul 14:30 | `POS-C-0402` | OR27-1-R326, p. 893 | documented | 1 | 1 |
| PO-65 | `us-art-reserve-huntington-1ohh` | Cemetery Hill | 2 Jul 16:00 | `POS-C-0404` | OR27-1-R327, p. 893 | documented | 1 | 1 |
| PO-66 | `us-art-reserve-huntington-1paf` | Cemetery Hill | 2 Jul 16:00 | `POS-C-0408` | OR27-1-R328, p. 894 | documented | 1 | 1 |
| PO-67 | `us-art-reserve-huntington-1pag` | Cemetery Hill | 2 Jul 16:00 | `POS-C-0410` | OR27-1-R328, p. 894 | documented | 1 | 1 |
| PO-68 | `us-art-reserve-huntington-wvc` | Cemetery Hill | 2 Jul 16:30 | `POS-C-0411` | OR27-1-R329, p. 895 | documented | 1 | 1 |
| PO-69 | `us-11c-1d-ames-75oh` | Gettysburg (the borough) | 1 Jul 13:00 | `POS-A-11A-032` | OR27-1-R246, p. 715 | documented | 1 | 1 |
| PO-70 | `us-11c-1d-ames-17ct` | Gettysburg (the borough) | 1 Jul 13:00 | `POS-A-11A-036` | OR27-1-R247, p. 716 | documented | 1 | 1 |
| PO-71 | `us-11c-1d-ames-107oh` | Gettysburg (the borough) | 1 Jul 13:00 | `POS-A-11A-045` | OR27-1-R249, p. 720 | documented | 1 | 1 |
| PO-72 | `us-11c-3d-schimmelfennig-61oh` | Gettysburg (the borough) | 1 Jul 13:30 | `POS-A-11B-043` | OR27-1-R258, p. 738 | documented | 0 | 0 (inert) |
| PO-73 | `us-11c-3d-krzyzanowski-119ny` | Gettysburg (the borough) | 1 Jul 12:00 | `POS-A-11B-051` | OR27-1-R260, p. 742 | documented | 0 | 0 (inert) |
| PO-74 | `us-11c-3d-krzyzanowski-26wi` | Gettysburg (the borough) | 1 Jul 15:00 | `POS-A-11B-061` | OR27-1-R263, p. 746 | documented | 0 | 0 (inert) |
| PO-75 | `us-11c-art-1ohi` | Gettysburg (the borough) | 1 Jul 10:00 | `POS-A-11C-003`, `POS-A-11C-021` | OR27-1-R264, p. 747 | documented | 0 | 0 (inert) |
| PO-76 | `us-11c-art-4usg` | Gettysburg (the borough) | 1 Jul 11:00 | `POS-A-11C-027` | OR27-1-R269, p. 756 | documented | 0 | 0 (inert) |
| PO-77 | `us-cav-1d` | Gettysburg (the borough) | 30 Jun 11:00 | `POS-A-CV1-004` | OR27-1-R337, p. 923 | documented | 5 | 0 |
| PO-78 | `us-cav-1d-gamble` | Schmucker Hall | 1 Jul 08:00 | `POS-A-CV1-016` | OR27-1-R338, p. 934 | documented | 0 | 0 (inert) |
| PO-79 | `us-11c-2d` | Cemetery Hill | 2 Jul 16:00 | `POS-A-11B-008` | OR27-1-R250, p. 722 | documented | 8 | 0 |
| PO-80 | `us-11c-3d-schimmelfennig-45ny` | Cemetery Hill | 3 Jul 12:00 | `POS-A-11B-042` | OR27-1-R256, p. 736 | documented | 0 | 0 (inert) |
| PO-81 | `us-11c-art` | Cemetery Hill | 3 Jul 15:00 | `POS-A-11C-010` | OR27-1-R264, p. 750 | documented | 1 | 1 |
| PO-82 | `us-11c-art-13ny` | Cemetery Hill | 2 Jul 14:00 | `POS-A-11C-018` | OR27-1-R266, p. 753 | documented | 0 | 0 (inert) |
| PO-83 | `us-cav-1d-devin-6ny` | The Peach Orchard | 1 Jul 20:04 (night, convention) | `POS-E-US-CAV-1D-DEVIN-6NY-003` | NY3-S019, p. 1131~1132 | documented | 0 | 0 (inert) |

### Departures added

| departure | unit | road | time | claim | report, page | leaf units drawn under the unit | leave events |
|---|---|---|---|---|---|---|---|
| DP-01 | `us-5c-2d-day` | Emmitsburg Road | 5 Jul 17:00 | `POS-C-0523`, `POS-C-0121` | OR27-1-R205, p. 638 | 5 | 5 |

Almost every other departure claim names a town (Emmitsburg, Fairfield, Littlestown, Hagerstown, Monterey) or the “Fairfield road”, which two roads of the road layer could carry, or prints no hour: all are unresolved with the reason on their row.

### Reports that disagree (listed, never resolved)

7 disagreements between sources are carried as data and shown on the cards of the units they touch (58 cards); 219 pairs of claims that the ledger lists as conflicting with a claim used are shown on 325 cards, each with both values. Neither side of a disagreement is placed.

| kind | unit | the values | claims or entries |
|---|---|---|---|
| approach refines formation above | `us-3c-2d-burling` | Emmitsburg Road (own report, claim POS-B-us-3c-2d-burling-02) **|** Black Horse Tavern Road (PDF ledger row us-3c-2d, AP-07, for us-3c-2d) | `POS-B-us-3c-2d-burling-02`, `AP-07` |
| approach refines formation above | `us-12c-1d-colgrove` | Hanover Road (own report, claim POS-B-us-12c-1d-colgrove-05) **|** Baltimore Pike (claim POS-B-us-12c-12, for us-12c) | `POS-B-us-12c-1d-colgrove-05`, `POS-B-us-12c-12` |
| claim differs from ledger row | `us-1c-2d-paul-104ny` | Gettysburg (the borough) 1863-07-01 13:00 (OR27 claim POS-A-1D3-049) **|** Oak Ridge 1863-07-01 13:00 (PDF ledger clause PO-02, row us-1c-2d, for us-1c-2d-baxter, us-1c-2d-paul) | `POS-A-1D3-049`, `PO-02` |
| claim differs from ledger row | `us-art-reserve-mcgilvery-15ny` | The Peach Orchard 1863-07-02 16:30 (OR27 claim POS-C-0379) **|** Wheatfield Road 1863-07-02 16:00 (PDF ledger clause PO-44, row us-art-reserve, for us-art-reserve-mcgilvery) | `POS-C-0379`, `PO-44` |
| claim differs from ledger row | `us-5c-1d-vincent-20me` | Big Round Top 1863-07-02 21:00 (OR27 claim POS-C-0081) **|** Little Round Top 1863-07-02 20:04 (PDF ledger clause PO-33, row us-5c, for us-5c) | `POS-C-0081`, `PO-33` |
| stop hour differs | `us-11c` | Cemetery Hill 1863-07-01 16:30 **|** Cemetery Hill 1863-07-01 17:00 | `POS-A-11A-017`, `POS-A-11B-030` |
| stop hour differs | `us-11c-3d-schimmelfennig-45ny` | Gettysburg (the borough) 1863-07-01 11:00 **|** Gettysburg (the borough) 1863-07-01 11:15 | `POS-A-11B-038`, `POS-E-US-11C-3D-SCHIMMELFENNIG-45NY-003` |

Claims that agree with an entry already in use (nothing is added; the card of the unit lists the agreement): `POS-A-1D5-020` (us-1c-3d-stone) agrees with PO-03 at Cemetery Hill.

### Claims earlier than the unit's own gate (Q04)

34 usable claims put a unit on a gazetteer place inside the loaded ground, or on a road of approach, EARLIER than the unit's ledger gate (the earliest time the ledger allows, tested against `tools/bt/check_arrivals.py`). **No gate is moved**; a stop of such a claim is not applied (the unit is not on the field yet), and an approach is applied from the gate. The ledger and the report disagree about when the unit was nearer; the owner decides which to follow (this is a conflict of sources).

| claim | unit | printed time | ledger gate | place | used |
|---|---|---|---|---|---|
| `PD-1c-mclaws-kershaw-02` | `cs-1c-mclaws-kershaw` | 1 Jul 16:00 | 2 Jul 08:00 | Gettysburg | yes |
| `PD-2c-johnson-jones-01` | `cs-2c-johnson-jones` | 1 Jul 07:00 | 1 Jul 19:00 | Gettysburg (the borough) | no |
| `PD-2c-rodes-daniel-01` | `cs-2c-rodes-daniel` | 1 Jul 12:00 | 1 Jul 12:30 | Gettysburg | no |
| `PD-3c-anderson-wilcox-01` | `cs-3c-anderson-wilcox` | 1 Jul 14:30 | 2 Jul 12:00 | Gettysburg; Chambersburg | yes |
| `PD-3c-heth-01` | `cs-3c-heth` | 1 Jul 05:00 | 1 Jul 07:30 | Gettysburg; Cashtown | no |
| `PD-3c-heth-pettigrew-01` | `cs-3c-heth-pettigrew` | 30 Jun 20:04 (convention) | 1 Jul 07:30 | Gettysburg; Cashtown | yes |
| `PD-cav-div-03` | `cs-cav-div` | 29 Jun 17:00 | 2 Jul 00:00 | Westminster | no |
| `PD-cav-hampton-05` | `cs-cav-hampton` | 1 Jul 20:04 (convention) | 2 Jul 19:32 | Carlisle; Gettysburg | no |
| `POS-A-11B-038` | `us-11c-3d-schimmelfennig-45ny` | 1 Jul 11:00 | 1 Jul 12:00 | Gettysburg (the borough) | no |
| `POS-E-US-11C-3D-SCHIMMELFENNIG-45NY-003` | `us-11c-3d-schimmelfennig-45ny` | 1 Jul 11:15 | 1 Jul 12:00 | Gettysburg (the borough) | no |
| `POS-A-11C-003` | `us-11c-art-1ohi` | 1 Jul 10:00 | 1 Jul 12:00 | Gettysburg (the borough) | yes |
| `POS-A-11C-021` | `us-11c-art-1ohi` | 1 Jul 10:00 | 1 Jul 12:00 | Gettysburg (the borough) | yes |
| `POS-A-11C-005` | `us-11c-art-4usg` | 1 Jul 11:00 | 1 Jul 12:00 | about three-fourths of a mile from the town on the left of the York pike | no |
| `POS-A-11C-027` | `us-11c-art-4usg` | 1 Jul 11:00 | 1 Jul 12:00 | Gettysburg (the borough) | yes |
| `POS-B-us-12c-1d-mcdougall-123ny-07` | `us-12c-1d-mcdougall-123ny` | 30 Jun 20:04 (convention) | 1 Jul 17:30 | Littlestown | no |
| `POS-B-us-12c-2d-20` | `us-12c-2d` | 1 Jul 15:00 | 1 Jul 17:30 | Two Taverns | yes |
| `POS-A-1D1-002` | `us-1c-1d` | 1 Jul 10:00 | 1 Jul 10:20 | the Cashtown road about threequarters of a mile west of Gettysburg | no |
| `POS-A-1D1-016` | `us-1c-1d-meredith` | 1 Jul 10:00 | 1 Jul 10:20 | Seminary Ridge | no |
| `POS-A-1D1-009` | `us-1c-1d-meredith-24mi` | 1 Jul 09:00 | 1 Jul 10:20 | Gettysburg (the borough) | no |
| `POS-A-1D3-035` | `us-1c-2d-paul-13ma` | 1 Jul 06:00 | 1 Jul 11:00 | Gettysburg (the borough) | no |
| `POS-A-1D5-059` | `us-1c-3d-stannard-13vt` | 1 Jul 17:00 | 2 Jul 18:00 | Cemetery Hill | no |
| `POS-B-us-2c-08` | `us-2c` | 1 Jul 20:04 (convention) | 1 Jul 22:30 | Gettysburg (the borough) | no |
| `POS-B-us-2c-1d-brooke-53pa-01` | `us-2c-1d-brooke-53pa` | 1 Jul 16:00 | 2 Jul 00:00 | the Gettysburg road | no |
| `POS-B-us-2c-1d-kelly-116pa-01` | `us-2c-1d-kelly-116pa` | 1 Jul 19:32 (convention) | 2 Jul 00:00 | Gettysburg (the borough) | no |
| `POS-B-us-2c-2d-hall-59ny-01` | `us-2c-2d-hall-59ny` | 2 Jul 05:00 | 2 Jul 06:00 | 1 mile in the rear of said town | no |
| `POS-B-us-2c-2d-hall-7mi-04` | `us-2c-2d-hall-7mi` | 2 Jul 05:00 | 2 Jul 06:00 | Cemetery Hill | no |
| `POS-B-us-3c-1d-graham-105pa-02` | `us-3c-1d-graham-105pa` | 1 Jul 13:15 | 1 Jul 20:00 | half a mile west of the town | no |
| `POS-C-0133` | `us-5c-2d-day-14us` | 2 Jul 04:00 | 2 Jul 05:00 | bivouac in the road; forward to a small piece of woods | no |
| `POS-C-0118` | `us-5c-2d-day-3us` | 1 Jul 18:00 | 2 Jul 05:00 | Hanover, Pa. -> toward Gettysburg, bivouacked on the road | no |
| `POS-C-0166` | `us-5c-3d` | 2 Jul 12:00 | 2 Jul 19:00 | the position of the First and Second Divisions, near the Gettysburg and Hanover turnpike | no |
| `POS-C-0500` | `us-6c` | 1 Jul 19:30 | 2 Jul 14:00 | the shortest road to Gettysburg | no |
| `POS-C-0499` | `us-6c` | 1 Jul 19:32 (convention) | 2 Jul 14:00 | the road to Taneytown, then turned back to come up via Littlestown | no |
| `POS-C-0304` | `us-6c` | 1 Jul 23:00 | 2 Jul 14:00 | toward Gettysburg by Littlestown | no |
| `POS-A-CV2-001` | `us-cav-2d-gregg` | 2 Jul 11:00 | 2 Jul 12:00 | the pike leading from Gettysburg to Hanover, about 2 miles from Gettysburg | yes |

## Troop-map day positions (contract 1.5 and 1.7, DEC-010, DEC-011 and DEC-018)

Four files hold the positions read from Bachelder's 1876 battle maps (sheets 1 to 3, `history/positions/troopmap_jul{1,2,3}_b1876.jsonl`) and from the hour-labelled sheet LOC 99447494 (`troopmap_jul1_hour_loc99447494.jsonl`): 484 claims (445 documented, 39 inferred; 478 position, 6 movement), digested in `data/daypositions.json` by `tools/build-daypositions.mjs` (the tests re-read the four files and compare every field). A Bachelder position is **documented for a (unit, place, day)** (DEC-010): the sheet draws the unit's line in up to four legend states (first position, intermediate, evening, all day) and prints no clock on most lines, so the position is where the unit's line stood that day. From history layer v7 the **line state of every Bachelder label, read by eye** (`library/LINE-STATES-NOTES.md`; `when.line_state`, the basis, the crop and any clock printed beside the line), is carried into the digest and gives the position a **window in the day** (DEC-018, provisional builder choice: the legend defines the states by their place in the day, not by a clock, so the window is modelled from that definition and the card says so; a complete clock printed beside the line is the documented time of the state). The layer follows these rules, each tested (`tests/daypos.test.mjs`):

1. **Labels.** A unit's position on a sheet is used if the unit has exactly one position claim on that sheet (a single label), or if it has several and their line states put them in order (a **sequence**: at most one first position, at most one evening, intermediates between them, two or more intermediates only when a complete clock beside each orders them; a mixed label stands for both its states). Several labels that the states do not order (two bars of one style, an all-day bar beside another state, a bar with no readable state, a movement arrow) are all listed on the card with their sigma, states, bases and printed clocks, and none is drawn as a single place; the card says why. A lone movement arrow is not a place.
2. **Level.** A brigade, battery, artillery brigade, artillery battalion or artillery group position is laid out over its regiments or batteries inside the position (the same plausible-procedural slot rule as a ledger place, with the claim's sigma); a division, corps or army label places nothing by itself.
3. **Time.** A day position is used on its own day (local midnight to local midnight) and never before the unit's gate (Q04: no gate is moved); the unit marches to it at the march rate along its approach road (from the edge) or straight from its previous position, and arrives no earlier than the march allows and no later than the end of the day or the departure its next timed place needs. Its line state says where in the day (DEC-018): **all day** holds from the modelled arrival (as soon as the record allows) to local midnight; **first position** holds from arrival until the unit's next state-ordered position of the day or, with none, until the evening convention (the start of [DUSK], sunset 19:32 LMT, the PDF's labelled convention applied to the sheet's date), after which the position is not printed readably and the unit is kept where it last stood (a marked gap); **evening** holds from the convention (or the printed clock) to midnight, and before it the unit stands at its previous known position of the day (a first or intermediate position, or its last timed ledger place) and leaves so as to arrive at the convention, or, with no known daytime place, is drawn at the evening position from its arrival with the card saying the daytime place is unknown (no daytime place is invented); **intermediate** lies between the first and the evening positions, its time the clock printed beside the line or, with none, the middle of the open window (an arbitrary pick inside it, the card gives the whole window); **mixed** applies every listed state in order; a label with **no readable state** keeps the whole-day rule of DEC-011 (arrival as soon as the record allows, held to midnight). Where a state's window cannot be met (the position lies too far from the unit's gate or its earlier places for the time), the unit arrives when it can and the difference is reported as a **state offset** on the card and in `report().state_offsets`, like the ledger-vs-edge offsets; no gate moves. The arrival time inside the window is **plausible-procedural** and the card says so: documented is the position that day and its state (and the state at a time where a complete clock is printed beside the line), modelled is when the unit got there. Between days the unit stays at the previous position until the next day's window opens.
4. **Timed claims win at their time.** A day stop never moves a timed place of the ledgers: it is put in the first gap of its day in which every timed place is reached no later, and at no faster a gait, than without it; if no gap fits, the day position is not applied in that scenario and the report says why. A ledger place of the same date that overlaps the position within the two stated sigmas takes its slot inside the position (the ledger keeps the time, the troop map gives the finer place). A ledger place that does not overlap is kept as it is, and the distance between the two is listed on the card and in the table below (neither is chosen).
5. **Hour sheet.** LOC 99447494 (2 to 3.30 P.M., author and date unknown, every claim inferred) is used only as an inferred timed stop where nothing else places the unit on 1 Jul: no single-label or state-ordered position on sheet 1 and no timed ledger place dated 1 Jul. The unit is shown arriving just in time for the start of the window (14:00) and must arrive by its end (15:30).

### Line states (history layer v7, DEC-018)

Readings of the 458 Bachelder claims (`when.line_state`, read by eye, calibration 30 of 30 on a blind second read; the reasons for every unreadable label are in `library/LINE-STATES-NOTES.md`): 241 unreadable, 120 evening, 38 first, 27 intermediate, 22 all day, 10 mixed. Clocks or time words printed beside a line: 69, of which 43 are complete clocks (hour, A.M. or P.M., nothing else printed with them) and **35 are used as the documented time of their state** (complete, not classed adjacent_unproven by the earlier pass, and agreeing with any clock that pass read); the others are listed on the card and never used as a time: 6 complete clocks the earlier pass could not prove to belong to the label (adjacent_unproven); 26 spans, time words, clocks without A.M./P.M., illegible glyphs or clocks of a neighbouring label; 2 complete clocks on a movement arrow.

| sheet | single label | several labels put in order by their states (sequence) | several labels the states do not order (none drawn as one place) |
|---|---|---|---|
| Bachelder sheet 1 (1 Jul) | 18 | 4 | 24 |
| Bachelder sheet 2 (2 Jul) | 53 | 3 | 28 |
| Bachelder sheet 3 (3 Jul) | 64 | 2 | 24 |

Sequences (9 unit-sheets; a unit with no road of approach stays an open gap and its sequence is listed on its card only): `cs-3c-pender-thomas` on sheet 1: first (TMJ1-001) -> evening (TMJ1-012); `us-1c-2d-baxter` on sheet 1: first (TMJ1-037) -> intermediate (TMJ1-044); `us-1c-1d-meredith` on sheet 1: first (TMJ1-048, 10.15 A.M.) -> evening (TMJ1-047); `us-1c-3d-biddle` on sheet 1: first (TMJ1-052) -> intermediate (TMJ1-053, 2.30 P.M.) -> evening (TMJ1-055, 4 P.M.); `cs-3c-pender-mcgowan` on sheet 2: first (TM2-018) -> evening (TM2-037); `cs-3c-anderson-posey` on sheet 2: first (TM2-033) -> evening (TM2-055); `cs-1c-hood-benning` on sheet 2: first (TM2-168) -> evening (TM2-126) (not drawn: no road); `cs-3c-heth-brockenbrough` on sheet 3: first (TM3-134) -> evening (TM3-073); `cs-1c-mclaws-wofford` on sheet 3: intermediate (TM3-108) -> evening (TM3-118) (not drawn: no road).

Why the other 76 unit-sheets with several labels are not ordered (the reason is on each card): 36 a label with no readable line state; 19 two or more evening bars; 8 an all-day bar beside another state; 6 a movement arrow among the labels; 4 two or more intermediate bars without a complete clock on each; 3 two or more first-position bars.

Day stops applied in the default scenario, by the line state of their label (the window follows rule 3; "none" = no readable state, whole-day rule):

| state | applied | not applied |
|---|---|---|
| first | 56 | 10 |
| intermediate | 10 | 0 |
| evening | 165 | 8 |
| all day | 26 | 4 |
| mixed | 11 | 0 |
| none | 173 | 10 |

**Windows by tier of their time:** 13 applied day stops have a documented time (a complete clock printed beside the line), 255 a modelled window (from the legend's definition and the evening convention), 173 no state (whole-day rule). Drawn leaf units with a timed state window: 23 on Bachelder sheet 1 (1 Jul), 118 on Bachelder sheet 2 (2 Jul), 101 on Bachelder sheet 3 (3 Jul) (191 units on at least one day); 28 drawn unit-sheets are state-ordered sequences. Evening lines: 43 reached from a known daytime place of the same day (the unit stands there and leaves so as to arrive at the convention), 122 with no known daytime place (drawn at the evening position from arrival, the card says the daytime place is unknown). Intermediate lines: 4 at a printed clock, 6 at the middle of the open window.

**State offsets** (the state's window cannot be met from the unit's gate and earlier places; reported, no gate moved): 10 day stops of 5 units (5 against the complete clock printed beside the line, 5 against the evening convention; by state: 5 first, 5 evening).

| label | state | should be there by | late by (min) | units |
|---|---|---|---|---|
| `TMJ1-048` | first | 1 Jul 10:15 (the complete clock printed beside the line) | 65 to 85 | 5 |
| `TMJ1-047` | evening | 1 Jul 19:32 (the evening convention) | 71 to 73 | 5 |

**Browser specs to run once the Release 1 acceptance run has finished** (not run here: node tests only): `real.spec.mjs`, `arrival.spec.mjs`, `scrub.spec.mjs`, `leak.spec.mjs`, `casualties.spec.mjs` (real layer), `ui.spec.mjs` (the card and the panels, including the troop-map section), `perf.spec.mjs`; `structures3d.spec.mjs` is unaffected but belongs to the full suite.

North-west corner (`terrain/troopmaps/ACCURACY.md`): the chain that registers sheets 2 and 3 to the Warren sheet is untested north-west of the Seminary and the Warren sheet itself is 70 to 138 m out there; sheet 1 uses the displacement field of the roads layer (sigma 30 m inside its control region, 50 m outside it). The sigma shown is the one each claim file carries; the 7 claims of sheets 2 and 3 that lie north-west of the Seminary Ridge proxy (`TM2-001`, `TM2-002`, `TM2-003`, `TM2-007`, `TM2-008`, `TM2-009`, `TM2-010`) say so on the card.

### Labels

| sheet | claims | single-label brigade-level units (used) | several labels put in order by their line states (used, v7) | several labels not ordered (not drawn as one place) | movement arrow only | division, corps or army label (places nothing) |
|---|---|---|---|---|---|---|
| Bachelder sheet 1 (1 Jul) | 115 | 18 | 4 | 24 | 0 | 15 |
| Bachelder sheet 2 (2 Jul) | 178 | 53 | 3 | 28 | 0 | 33 |
| Bachelder sheet 3 (3 Jul) | 165 | 64 | 2 | 24 | 0 | 30 |
| LOC 99447494 (1 Jul, 2 to 3.30 P.M.) | 26 | 17 | 0 | 0 | 0 | 9 |

Units with several labels that the line states do not order (the number of labels in brackets), by sheet:

* Bachelder sheet 1 (1 Jul): `cs-3c-pender-scales (3)`, `cs-3c-pender-mcgowan (3)`, `cs-3c-pender-lane (3)`, `cs-3c-heth-pettigrew (3)`, `cs-3c-heth-brockenbrough (2)`, `cs-3c-heth-davis (5)`, `cs-3c-heth-archer (2)`, `us-1c-1d-cutler (4)`, `us-1c-3d-stone (2)`, `us-cav-1d-gamble (2)`, `cs-2c-rodes-daniel (3)`, `cs-2c-rodes-ramseur (3)`, `us-1c-2d-paul (2)`, `us-1c-art (2)`, `cs-2c-rodes-oneal (3)`, `cs-2c-rodes-iverson (2)`, `us-cav-1d-devin (3)`, `cs-2c-rodes-doles (4)`, `us-11c-3d-schimmelfennig (3)`, `us-11c-1d-ames (2)`, `cs-2c-early-hays (3)`, `cs-2c-early-gordon (2)`, `cs-2c-rodes-carter (2)`, `cs-2c-early-hoke (2)`
* Bachelder sheet 2 (2 Jul): `cs-2c-rodes-oneal (2)`, `cs-2c-rodes-daniel (2)`, `cs-2c-rodes-ramseur (3)`, `cs-2c-rodes-iverson (3)`, `cs-2c-rodes-doles (2)`, `cs-3c-heth-garnett (2)`, `cs-3c-pender-thomas (2)`, `cs-3c-anderson-wright (3)`, `cs-3c-anderson-perry (2)`, `us-1c-2d-baxter (2)`, `us-1c-2d-paul (2)`, `cs-3c-anderson-wilcox (3)`, `us-3c-2d-carr (5)`, `us-3c-2d-brewster (4)`, `us-1c-3d-biddle (2)`, `cs-1c-mclaws-barksdale (3)`, `cs-1c-mclaws-wofford (3)`, `us-2c-3d-willard (3)`, `cs-1c-res-art-alexander (2)`, `cs-1c-mclaws-kershaw (5)`, `cs-1c-mclaws-semmes (2)`, `us-2c-1d-zook (2)`, `us-2c-1d-kelly (2)`, `us-5c-3d-mccandless (2)`, `us-6c-3d-wheaton (2)`, `cs-1c-hood-anderson (3)`, `cs-1c-hood-robertson (3)`, `us-2c-1d-brooke (2)`
* Bachelder sheet 3 (3 Jul): `cs-3c-pender-lane (3)`, `us-1c-2d-paul (2)`, `us-6c-3d-shaler (2)`, `cs-2c-johnson-steuart (2)`, `us-2c-3d-willard (3)`, `us-2c-2d-hall (2)`, `us-2c-2d-webb (2)`, `us-3c-2d-brewster (2)`, `us-3c-2d-burling (2)`, `us-6c-1d-bartlett (2)`, `us-6c-1d-russell (2)`, `cs-3c-heth-davis (2)`, `cs-3c-heth-pettigrew (2)`, `cs-3c-pender-scales (3)`, `cs-3c-anderson-wright (2)`, `us-2c-3d-smyth (2)`, `cs-1c-pickett-garnett (3)`, `cs-1c-pickett-armistead (3)`, `cs-1c-pickett-kemper (3)`, `cs-3c-anderson-perry (3)`, `cs-1c-mclaws-cabell (2)`, `cs-3c-anderson-wilcox (4)`, `us-6c-3d-wheaton (2)`, `cs-2c-early-hoke (2)`

### Counts: before and after

| | before (ledgers only) | after (with the troop-map day positions) |
|---|---|---|
| **placed**: a road of approach and at least one place (a ledger place or a day position) | 302 | 362 |
| **at the arrival edge only** | 81 | 21 |
| **open gap**: no road of approach (not drawn) | 164 | 164 |
| units with a resolved entry (drawn) | 383 | 383 |
| figures drawn | 110,272 | 110,272 |

No unit gains a road of approach from a day position: the set of drawn units is the same (383), and what changes is where they stand. Of the 383 drawn leaf units, **285** stand at a troop-map day position on at least one day in the default scenario (60 of them have no timed ledger place at all: they were at the arrival edge only before), 77 keep only their ledger places and 21 stay at the arrival edge (no position of any sheet reaches them). **99** leaf units have a single-label day position but no road of approach, so they stay open gaps (the position is recorded on their cards and nowhere in the picture): cs-1c 32, cs-2c 19, us-11c 14, us-3c 6, us-5c 24, us-cav 4. A further 59 open-gap leaf units are named by labels that place nothing (several labels).

Units placed by each source (a unit can have several):

| source | drawn leaf units placed |
|---|---|
| PDF ledger rows (timed places) | 301 |
| OR27 position-ledger claims (timed places) | 9 |
| Bachelder sheet 1 (day position) | 27 |
| Bachelder sheet 2 (day position) | 189 |
| Bachelder sheet 3 (day position) | 199 |
| LOC 99447494 (hour stop) | 0 |

Day stops: 473 day entries over the drawn leaf units (one per unit and day), **441** applied in the default scenario (0 of them reached through a ledger place inside the position), tiers of the claims behind them: 422 documented, 19 inferred. Not applied: 33 (the position lies outside the loaded ground, or too close to its edge for the column). 73 ledger places of 72 units take their slot inside a position that overlaps them. The hour sheet: 10 brigade-level units may use it, 0 stops applied (0 units). Marches to a day position: median 1,142 m, longest 9,105 m. Defects (lateness of a timed place) in the default scenario: 0; offsets of the ledger time against the edge (unchanged): 302.

Arrival time of the day stops, by hour of the day (modelled: the unit leaves as soon as the record allows, so a stop of a new day is reached just after local midnight when the previous position is near; this is a property of the rule, not a historical claim, and the card gives the whole window):

| hour | 00 | 01 | 02 | 03 | 06 | 07 | 09 | 11 | 12 | 14 | 15 | 16 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| day stops | 242 | 59 | 3 | 6 | 4 | 27 | 4 | 12 | 9 | 5 | 21 | 10 | 34 | 5 |

### Troop-map positions against the ledgers

85 comparisons of a single-label brigade-level position with a timed place of the PDF ledger rows or the OR27 position-ledger claims for the same unit (or a formation above it) on the same date: 25 overlap within the two stated sigmas, 60 do not; median distance 662 m. Both are shown on the card; neither is chosen. The largest disagreements:

| unit | day | troop-map label | ledger place | source | at | distance | sigma (place + position) |
|---|---|---|---|---|---|---|---|
| `cs-1c-hood-henry` | 07-02 | “HENRY'S BATT.” (`TM2-167`) | Herr Ridge (`PO-46`) | PDF ledger row cs-1c | 07-02 12:00 | 4,313 m | 400 + 62.4 m |
| `cs-1c-hood-law` | 07-02 | “LAW ALA.” (`TM2-169`) | Seminary Ridge (`PO-49`) | PDF ledger row cs-1c-hood | 07-02 06:30 | 4,239 m | 496 + 147.2 m |
| `cs-1c-hood-law` | 07-02 | “LAW ALA.” (`TM2-169`) | Herr Ridge (`PO-46`) | PDF ledger row cs-1c | 07-02 12:00 | 4,165 m | 400 + 147.2 m |
| `cs-1c-hood-henry` | 07-02 | “HENRY'S BATT.” (`TM2-167`) | Seminary Ridge (`PO-49`) | PDF ledger row cs-1c-hood | 07-02 06:30 | 4,105 m | 496 + 62.4 m |
| `cs-1c-mclaws-cabell` | 07-02 | “CABELL'S BATT.” (`TM2-124`) | Herr Ridge (`PO-46`) | PDF ledger row cs-1c | 07-02 12:00 | 3,569 m | 400 + 73.4 m |
| `cs-1c-mclaws-cabell` | 07-02 | “CABELL'S BATT.” (`TM2-124`) | Seminary Ridge (`PO-47`) | PDF ledger row cs-1c-mclaws | 07-02 08:00 | 3,454 m | 496 + 73.4 m |
| `us-12c-1d-lockwood` | 07-02 | “LOCKWOOD 2'd” (`TM2-081`) | Culp’s Hill (`PO-38`) | PDF ledger row us-12c | 07-02 06:00 | 2,895 m | 490 + 62.4 m |
| `us-1c-art-2me` | 07-01 | “HALL 2 Me.” (`TMJ1-022`) | Cemetery Hill (`PO-03`) | PDF ledger row us-1c | 07-01 17:00 | 2,692 m | 250 + 40.9 m |
| `us-12c-1d-lockwood` | 07-02 | “LOCKWOOD 2'd” (`TM2-081`) | Spangler’s Spring (`PO-36`) | PDF ledger row us-12c | 07-02 23:00 | 2,675 m | 111 + 62.4 m |
| `us-5c-1d-sweitzer` | 07-02 | “SWEITZER” (`TM2-108`) | Powers’ Hill (`PO-32`) | PDF ledger row us-5c | 07-02 08:00 | 2,474 m | 250 + 90.2 m |
| `cs-2c-early-jones` | 07-01 | “JONES' BATT.” (`TMJ1-099`) | the town (`PO-54`) | PDF ledger row cs-2c-early | 07-01 20:04 | 2,443 m | 544 + 121 m |
| `us-1c-art-1nyl` | 07-01 | “REYNOLDS L.I. N.Y.” (`TMJ1-027`) | Cemetery Hill (`PO-03`) | PDF ledger row us-1c | 07-01 17:00 | 2,293 m | 250 + 52.6 m |
| `us-1c-art-1pab` | 07-01 | “COOPER B.1'Pa.” (`TMJ1-051`) | Cemetery Hill (`PO-03`) | PDF ledger row us-1c | 07-01 17:00 | 2,263 m | 250 + 57.2 m |
| `us-5c-2d-burbank` | 07-02 | “BURBANK” (`TM2-128`) | Powers’ Hill (`PO-32`) | PDF ledger row us-5c | 07-02 08:00 | 2,262 m | 250 + 90.2 m |
| `us-5c-2d-day` | 07-02 | “DAY” (`TM2-129`) | Powers’ Hill (`PO-32`) | PDF ledger row us-5c | 07-02 08:00 | 2,183 m | 250 + 90.2 m |
| `us-1c-art-5me` | 07-01 | “STEVENS 5'Me.” (`TMJ1-045`) | Cemetery Hill (`PO-03`) | PDF ledger row us-1c | 07-01 17:00 | 1,990 m | 250 + 52.7 m |
| `us-5c-art` | 07-02 | “Capt. MARTIN Chief 5 Corps Arty.” (`TM2-166`) | Powers’ Hill (`PO-32`) | PDF ledger row us-5c | 07-02 08:00 | 1,938 m | 250 + 62.4 m |
| `cs-2c-rodes-carter` | 07-02 | “CARTER'S BATT. (Not Engaged)” (`TM2-006`) | East Cemetery Hill (`PO-56`) | PDF ledger row cs-2c-rodes | 07-02 21:00 | 1,795 m | 250 + 176.1 m |
| `us-11c-art-4usg` | 07-01 | “G 4 U.S. WILKINSON” (`TMJ1-087`) | Gettysburg (the borough) (`PO-76`) | OR27 position-ledger claim POS-A-11C-027 | 07-01 11:00 | 1,757 m | 544 + 52.7 m |
| `us-11c-2d-coster` | 07-01 | “COSTAR 3.45 1'” (`TMJ1-103`) | Cemetery Hill (`PO-34`) | PDF ledger row us-11c | 07-01 14:00 | 1,598 m | 250 + 104 m |
| `us-11c-art-1ohi` | 07-01 | “DILGER 1.1'Ohio” (`TMJ1-073`) | Gettysburg (the borough) (`PO-75`) | OR27 position-ledger claim POS-A-11C-003 | 07-01 10:00 | 1,458 m | 544 + 48.4 m |
| `us-2c-1d-cross` | 07-02 | “CROSS 1'd” (`TM2-157`) | The Wheatfield (`PO-19`) | PDF ledger row us-2c-1d | 07-02 17:30 | 1,438 m | 315 + 62.4 m |
| `us-2c-1d-cross` | 07-02 | “CROSS 1'd” (`TM2-157`) | The Wheatfield (`PO-15`) | PDF ledger row us-2c | 07-02 18:00 | 1,438 m | 315 + 62.4 m |
| `us-2c-1d-cross` | 07-02 | “CROSS 1'd” (`TM2-157`) | The Wheatfield (`PO-18`) | PDF ledger row us-2c-1d | 07-02 18:00 | 1,438 m | 315 + 62.4 m |
| `us-2c-3d-carroll` | 07-03 | “[C]ARROLL” (`TM3-165`) | Cemetery Ridge (`PO-17`) | PDF ledger row us-2c | 07-03 20:04 | 1,234 m | 561 + 62.6 m |
| `us-3c-1d-graham` | 07-02 | “GRAHAM” (`TM2-080`) | Devil’s Den (`PO-24`) | PDF ledger row us-3c-1d | 07-02 16:30 | 1,179 m | 300 + 62.4 m |
| `us-2c-3d-carroll` | 07-02 | “CARROLL” (`TM2-047`) | Cemetery Ridge (`PO-16`) | PDF ledger row us-2c | 07-02 20:04 | 1,120 m | 561 + 79.3 m |
| `us-3c-1d-ward` | 07-02 | “WARD 2D” (`TM2-115`) | Emmitsburg Road (`PO-05`) | PDF ledger row us-3c | 07-02 14:00 | 1,118 m | 42 + 95.8 m |
| `us-art-reserve-ransom` | 07-02 | “RANSOM” (`TM2-070`) | Spangler farm (`PO-45`) | PDF ledger row us-art-reserve | 07-02 20:04 | 1,110 m | 80 + 62.5 m |
| `us-3c-1d-ward` | 07-02 | “WARD 2D” (`TM2-115`) | The Peach Orchard (`PO-25`) | PDF ledger row us-3c-1d | 07-02 17:30 | 1,093 m | 227 + 95.8 m |

### Hour sheet

The hour sheet may place a brigade-level unit only where nothing else on the troop maps places it on 1 Jul (sheet 1 gives it several labels or none) and only a regiment with no timed ledger place dated 1 Jul. What that left, brigade by brigade:

| unit | leaf units | drawn | drawn, with a timed ledger place dated 1 Jul (not used) | hour stops made | stops applied | why the others are not |
|---|---|---|---|---|---|---|
| `us-1c-1d-cutler` | 6 | 6 | 6 | 0 | 0 | every drawn regiment has a timed place dated 1 Jul |
| `us-1c-2d-paul` | 5 | 5 | 5 | 0 | 0 | every drawn regiment has a timed place dated 1 Jul |
| `us-1c-3d-stone` | 3 | 3 | 3 | 0 | 0 | every drawn regiment has a timed place dated 1 Jul |
| `us-11c-1d-ames` | 4 | 4 | 3 | 1 | 0 | the position lies outside the loaded ground, or too close to its edge for the column |
| `us-11c-3d-schimmelfennig` | 5 | 0 | 0 | 0 | 0 | no regiment is drawn (no road of approach) |
| `us-cav-1d-gamble` | 4 | 0 | 0 | 0 | 0 | no regiment is drawn (no road of approach) |
| `us-cav-1d-devin` | 4 | 0 | 0 | 0 | 0 | no regiment is drawn (no road of approach) |
| `cs-2c-early-hays` | 5 | 5 | 5 | 0 | 0 | every drawn regiment has a timed place dated 1 Jul |
| `cs-2c-early-hoke` | 3 | 3 | 3 | 0 | 0 | every drawn regiment has a timed place dated 1 Jul |
| `cs-2c-early-gordon` | 6 | 6 | 6 | 0 | 0 | every drawn regiment has a timed place dated 1 Jul |

### Hour sheet against sheet 1

The brigade-level units that may use the hour sheet and the distance from the hour-sheet position to each of their sheet-1 labels (sheet 1 draws the brigade in several states, so the labels are not a place; both are listed on the card):

| unit | hour-sheet label | sheet-1 label | printed clock on it | distance |
|---|---|---|---|---|
| `us-1c-1d-cutler` | “CUTLER” | “CUTLER 2' [with 14 N.Y.S.M. 10.15 A.M.]” (`TMJ1-020`) | 10:15 | 796 m |
| `us-1c-1d-cutler` | “CUTLER” | “CUTLER [with 95'N.Y.]” (`TMJ1-021`) | - | 861 m |
| `us-1c-1d-cutler` | “CUTLER” | “CUTLER 2' 56'Pa. 10.15 A.M.” (`TMJ1-035`) | 10:15 | 240 m |
| `us-1c-1d-cutler` | “CUTLER” | “CUTLER 94'N.Y. 3-4 P.M.” (`TMJ1-040`) | 15:00-16:00 | 125 m |
| `us-1c-2d-paul` | “PAUL” | “PAUL 1' 3-4 P.M.” (`TMJ1-038`) | 15:00-16:00 | 152 m |
| `us-1c-2d-paul` | “PAUL” | “PAUL 1' 1-3 P.M.” (`TMJ1-056`) | 13:00-15:00 | 1,095 m |
| `us-1c-3d-stone` | “STONE” | “STONE 2' [11 A.M. in the text block]” (`TMJ1-024`) | - | 165 m |
| `us-1c-3d-stone` | “STONE” | “STONE 2' 4 P.M.” (`TMJ1-029`) | 16:00 | 338 m |
| `us-11c-1d-ames` | “AMES” | “AMES 2'” (`TMJ1-081`) | - | 765 m |
| `us-11c-1d-ames` | “AMES” | “AMES 2' (knoll line)” (`TMJ1-089`) | - | 75 m |
| `us-11c-3d-schimmelfennig` | “AMSBERG” | “AMSBERG 3.30 P.M.” (`TMJ1-068`) | 15:30 | 389 m |
| `us-11c-3d-schimmelfennig` | “AMSBERG” | “VON AMSBERG 1'” (`TMJ1-069`) | - | 78 m |
| `us-11c-3d-schimmelfennig` | “AMSBERG” | “V. AMSBERG 1'” (`TMJ1-072`) | - | 245 m |
| `us-cav-1d-gamble` | “GAMBLE (Cavalry)” | “GAMBLE 1'Brig. 1'Div. Cav.” (`TMJ1-026`) | - | 1,077 m |
| `us-cav-1d-gamble` | “GAMBLE (Cavalry)” | “GAMBLE 1'Brig. 1'Div. Cav. 4 P.M. (dismounted)” (`TMJ1-057`) | 16:00 | 1,028 m |
| `us-cav-1d-devin` | “DEVIN (Cavalry)” | “Devin's Brigade 1'Div. Cavalry Morning” (`TMJ1-064`) | - | 2,393 m |
| `us-cav-1d-devin` | “DEVIN (Cavalry)” | “Skirmishers of Devin's Cavalry. MORNING” (`TMJ1-070`) | - | 1,593 m |
| `us-cav-1d-devin` | “DEVIN (Cavalry)” | “DEVIN 2 Brig. Cav. 1st Division” (`TMJ1-109`) | - | 107 m |
| `cs-2c-early-hays` | “HAYS” | “HAYS LA.” (`TMJ1-082`) | - | 150 m |
| `cs-2c-early-hays` | “HAYS” | “HAYS LA.” (`TMJ1-097`) | - | 1,601 m |
| `cs-2c-early-hays` | “HAYS” | “HAYS LA. 3.45 P.M.” (`TMJ1-101`) | 15:45 | 133 m |
| `cs-2c-early-hoke` | “HOKE” | “HOKE N.C.” (`TMJ1-100`) | - | 1,641 m |
| `cs-2c-early-hoke` | “HOKE” | “HOKE N.C.” (`TMJ1-102`) | - | 124 m |
| `cs-2c-early-gordon` | “GORDON” | “GORDON GA. 3 P.M.” (`TMJ1-083`) | 15:00 | 12 m |
| `cs-2c-early-gordon` | “GORDON” | “GORDON GA.” (`TMJ1-096`) | - | 562 m |

## Roads of approach (history layer v6: modelled roads taken from the sibling formations of the corps)

At v5, 164 leaf units had no road of approach anywhere on their line of command and were not drawn. The plan (Law clause 3, gating rule 3) asks for the strongest evidence-based reconstruction, registered, marked in the product and escalated, not for a hole. **DEC-015** draws the units that have a gate and a Bachelder day position by a MODELLED road (tier plausible-procedural, evidence gap EG-0070): the road that every documented sibling formation of the unit's corps names, taken only if no report on the unit's line of command names another road, a road the repository cannot place or a road outside the loaded ground. The rule is `tools/sibling-rule.mjs`; the data is `data/sibling-approach.json` (built by `tools/build-sibling-approach.mjs`, every record recomputed and refused at load unless complete and unanimous); the claim-by-claim reading is `data/sibling-review.json`; the audit of every number below is `APPROACH-AUDIT.md`.

| | v5 | v6 | change |
|---|---|---|---|
| units drawn | 383 | 439 | +56 |
| placed (a road and a place) | 362 | 418 | +56 |
| at the arrival edge only | 21 | 21 | +0 |
| open gap (leaf units, not drawn) | 164 | 108 | -56 |
| figures drawn (one soldier per figure) | 110,272 | 127,572 | +17,300 |
| approach records | 43 | 51 | +8 |
| drawn units, approach tier inferred | 213 | 213 | +0 |
| drawn units, approach tier plausible-procedural | 170 | 226 | +56 |
| ledger-vs-edge offsets (card note, gate not moved) | 302 | 355 | +53 |
| defects (a timed place reached late) | 0 | 0 | +0 |
| troop-map day stops applied | 441 | 519 | +78 |
| gates moved (Q04) | | 0 | |
| new units entering before their gate | | 0 | |

**How much of the picture rests on which approach.** Of the 726 units of the roster, 439 are drawn (60.5%); the other 287 are 165 formations above the regiments (they carry the printed figures), 14 listed as never or only partly on the field, and 108 leaf units that are open gaps (4 of them headquarters or grouping entries with no figure). No approach is tier documented: the road of every approach is a gazetteer entry, which is inferred, so the best tier is inferred.

| basis of the approach | tier | units | share of the 726 | share of the units drawn | figures | share of the figures drawn |
|---|---|---|---|---|---|---|
| documented | documented | 0 | 0.0% | 0.0% | 0 | 0.0% |
| a road printed for the unit itself or for a formation below the corps (a PDF ledger row or a re-read claim of the Official Records) | inferred | 213 | 29.3% | 48.5% | 65,219 | 51.1% |
| a road printed only for the corps, inherited down the line of command | plausible-procedural | 170 | 23.4% | 38.7% | 45,053 | 35.3% |
| a MODELLED road taken from the sibling formations of the corps (DEC-015) | plausible-procedural | 56 | 7.7% | 12.8% | 17,300 | 13.6% |
| **all drawn units** | | 439 | 60.5% | 100.0% | 127,572 | 100.0% |

By tier of the approach: documented 0 (0.0% of the 726), inferred 213 (29.3%), plausible-procedural 226 (31.1%; 170 of them inherit a corps-level road and 56 rest on a modelled road). At v5: inferred 213 (29.3%), plausible-procedural 170 (23.4%). Every drawn unit is plausible-procedural as a unit (its slot, formation and strength share are modelled); the tiers here are those of its road of approach. The position on each day is the troop-map position, documented for the day (DEC-010), for modelled units as for the others.

The records (each unit card lists the siblings with report, page and printed words, says MODELLED, and links the register entry):

| record | attached to | corps | road | documented siblings it rests on | leaf units drawn | figures | placed | day stops applied | claims read |
|---|---|---|---|---|---|---|---|---|---|
| AP-44 | `us-5c-1d` | `us-5c` | Hanover Road | AP-04 (`us-5c-1d-vincent-20me`, PDF row `us-5c`: “Jul 1 night: night march from Hanover (20th Maine)”); AP-11 (`us-5c-2d`, OR27-1-R203 p. 634, `POS-C-0105`: “Gettysburg and Hanover road”) | 10 | 2,800 | 10 | 13 | 4 |
| AP-45 | `us-5c-3d` | `us-5c` | Hanover Road | AP-04 (`us-5c-1d-vincent-20me`, PDF row `us-5c`: “Jul 1 night: night march from Hanover (20th Maine)”); AP-11 (`us-5c-2d`, OR27-1-R203 p. 634, `POS-C-0105`: “Gettysburg and Hanover road”) | 9 | 2,520 | 9 | 9 | 5 |
| AP-46 | `us-5c-art` | `us-5c` | Hanover Road | AP-04 (`us-5c-1d-vincent-20me`, PDF row `us-5c`: “Jul 1 night: night march from Hanover (20th Maine)”); AP-11 (`us-5c-2d`, OR27-1-R203 p. 634, `POS-C-0105`: “Gettysburg and Hanover road”) | 5 | 1,400 | 5 | 10 | 5 |
| AP-47 | `cs-1c-mclaws-barksdale` | `cs-1c` | Chambersburg Pike | AP-41 (`cs-1c-mclaws-kershaw`, OR27-2-R432 p. 366, `PD-1c-mclaws-kershaw-02`: “a point on the Gettysburg road, some 2 miles from that place”) | 4 | 1,620 | 4 | 4 | 8 |
| AP-48 | `cs-1c-mclaws-cabell` | `cs-1c` | Chambersburg Pike | AP-41 (`cs-1c-mclaws-kershaw`, OR27-2-R432 p. 366, `PD-1c-mclaws-kershaw-02`: “a point on the Gettysburg road, some 2 miles from that place”) | 1 | 320 | 1 | 1 | 11 |
| AP-49 | `cs-1c-pickett-dearing` | `cs-1c` | Chambersburg Pike | AP-41 (`cs-1c-mclaws-kershaw`, OR27-2-R432 p. 366, `PD-1c-mclaws-kershaw-02`: “a point on the Gettysburg road, some 2 miles from that place”) | 1 | 320 | 1 | 1 | 7 |
| AP-50 | `cs-1c-hood` | `cs-1c` | Chambersburg Pike | AP-41 (`cs-1c-mclaws-kershaw`, OR27-2-R432 p. 366, `PD-1c-mclaws-kershaw-02`: “a point on the Gettysburg road, some 2 miles from that place”) | 19 | 6,080 | 19 | 33 | 14 |
| AP-51 | `cs-1c-res-art` | `cs-1c` | Chambersburg Pike | AP-41 (`cs-1c-mclaws-kershaw`, OR27-2-R432 p. 366, `PD-1c-mclaws-kershaw-02`: “a point on the Gettysburg road, some 2 miles from that place”) | 7 | 2,240 | 7 | 7 | 6 |

What became of the leaf units that were open gaps at v5:

| what became of it | leaf units (open gaps at v5) | with a single-label day position | reason |
|---|---|---|---|
| drawn by a modelled road | 56 | 56 | the sibling-road rule (DEC-015) |
| stays open | 12 | 6 | `road_outside_ground`: a road is printed for the line of command but it does not cross the loaded ground (Black Horse Tavern Road, AP-07): no other road is chosen for the unit |
| stays open | 25 | 17 | `road_not_resolvable`: a report of the line names a road, and the repository holds no such road (Heidlersburg, Middletown, the Gettysburg road, the road from Scotland, the Waynesborough pike, a railroad), or two roads of the road layer could carry the name; none is guessed |
| stays open | 14 | 14 | `route_not_a_road`: the passage names a route by a mill or a village (Horner's Mill), not a road: the repository holds no such road, and none is inferred from the map |
| stays open | 1 | 1 | `reports_disagree`: the reports of the same formation print different roads; none is chosen (the disagreement is listed) |
| stays open | 11 | 5 | `siblings_disagree`: the documented sibling formations of the corps name different roads (for example the Second Corps: Early the Harrisburg Road, Rodes the Carlisle Road): none is chosen |
| stays open | 25 | 0 | `sibling_road_no_day_position`: the sibling road is available, but the unit has no single-label day position (a Bachelder sheet), so a drawn unit would only stand in a column at the edge of the ground: not drawn |
| stays open | 16 | 0 | `cavalry_own_road_only`: Stuart’s cavalry: drawn only by a road documented for its own brigade or division, and only earlier marches are printed (no day position either) |
| stays open | 4 | 0 | `no_figure`: a headquarters, staff or grouping entry: the record gives it no figure |

Earlier state, kept because the stages are described in the state they were built in:

## Roads of approach (history layer v5: position statements and the road-name concordance; the state before the sibling records of v6)

An approach needs a road, not a clock: its time is the unit's arrival gate (never moved, Q04). v4 (DEC-012) read the roads that arrival_road and march claims print, with or without a clock. v5 (DEC-013, DEC-014) adds two things: (1) position and night_position claims whose printed words say that a corps or formation was ON a road before it reached the field are admitted as road evidence (approach tier inferred; 3 records), and (2) period road names that the gazetteer does not hold (the Heidlersburg road, the Middletown road, the Gettysburg road of Kershaw's march) are resolved by the road-name concordance (`library/ROAD-CONCORDANCE.md`, `data/road-concordance.json`) from Warren 1868-69, Bachelder 1876, Hopkins 1858 and the Official Records, only to a road the gazetteer already holds and with a stated tier (6 records); names the sources do not settle stay open. Method, tables and the claims that came closest: `APPROACH-AUDIT.md` (generated by `tools/approach-audit.mjs`); the choices: DEC-012, DEC-013, DEC-014.

| | v4 | v5 with the claims of ledger E (v8) | change |
|---|---|---|---|
| units drawn | 263 | 383 | +120 |
| placed (a road and a place) | 242 | 362 | +120 |
| at the arrival edge only | 21 | 21 | +0 |
| open gap (leaf units, not drawn) | 285 | 164 | -121 |
| figures drawn (one soldier per figure) | 80,260 | 110,272 | +30,012 |
| approach records | 32 | 43 | +11 |
| drawn units, approach tier inferred | 152 | 213 | +61 |
| drawn units, approach tier plausible-procedural | 111 | 170 | +59 |
| ledger-vs-edge offsets (card note, gate not moved) | 182 | 302 | +120 |
| defects (a timed place reached late) | 0 | 0 | +0 |
| troop-map day stops applied | 307 | 441 | +134 |

Approach records added in v5: AP-33 (Taneytown Road for `us-2c`, claim `POS-B-us-2c-20` of kind position, OR27-3-D0967 p. 462, “the road between Taneytown and Gettysburg”, 37 units drawn); AP-34 (Taneytown Road for `us-art-reserve`, claim `POS-C-0327` of kind night_position, OR27-1-R315 p. 872, “on the Taneytown road, near the cross-road leading to Two Taverns”, 22 units drawn); AP-35 (Hanover Road for `us-cav-2d`, claim `POS-A-CV2-003` of kind position, OR27-3-D1019 p. 489, “3 miles from Gettysburg, on the Hanover road”, 5 units drawn); AP-36 (Harrisburg Road for `cs-2c-early`, claim `PD-2c-early-06` of kind arrival_road, OR27-2-R470 p. 468, “the direct road from Heidlersburg to Gettysburg”, concordance RC-01 (inferred), 10 units drawn); AP-37 (Harrisburg Road for `cs-2c-early-hays`, claim `PD-2c-early-hays-01` of kind arrival_road, OR27-2-R472 p. 479, “arrived with my brigade on the Heidlersburg road”, concordance RC-01 (inferred), 5 units drawn); AP-38 (Harrisburg Road for `cs-2c-early-hoke`, claim `PD-2c-early-hoke-01` of kind arrival_road, OR27-2-R473 p. 484, “Heidlersburg road”, concordance RC-01 (inferred), 3 units drawn); AP-39 (Carlisle Road for `cs-2c-rodes`, claim `PD-2c-rodes-02` of kind arrival_road, OR27-2-R426 p. 317, “the Middletown road”, concordance RC-02 (inferred), 22 units drawn); AP-40 (Carlisle Road for `cs-2c-rodes-carter`, claim `PD-2c-rodes-carter-03` of kind arrival_road, OR27-2-R426 p. 317, “the Middletown road”, concordance RC-02 (inferred), 1 unit drawn); AP-41 (Chambersburg Pike for `cs-1c-mclaws-kershaw`, claim `PD-1c-mclaws-kershaw-02` of kind arrival_road, OR27-2-R432 p. 366, “a point on the Gettysburg road, some 2 miles from that place”, concordance RC-03 (inferred), 6 units drawn). Units drawn by them: 111. Approach records added in v8 (ledger E, the state regimental volumes; DEC-023E): AP-42 (Emmitsburg Road for `us-11c-2d`, claim `POS-E-US-11C-2D-004` of kind arrival_road, New York at Gettysburg (1902) vol. 3 section NY3-S009, p. 1053~1055, “Emmitsburg Pike”, 8 units drawn); AP-43 (Emmitsburg Road for `us-11c-art-1nyi`, claim `POS-E-US-11C-ART-1NYI-002` of kind march, New York at Gettysburg (1902) vol. 3 section NY3-S024, p. 1246, “on the Emmitsburg Road”, 1 unit drawn). Units drawn by them: 9. Together: 120 units drawn that v4 did not draw (120 placed, 0 at the edge only).

Still undrawn, by the most specific reason found on the line of command of each open-gap leaf unit (the table by formation, the claims and the roads are in `APPROACH-AUDIT.md`):

| reason | leaf units | of them with a single-label day position |
|---|---|---|
| the passage names no road (a direction, a town, “the road”) | 60 | 45 |
| a march before the battle, not the approach to the field | 19 | 0 |
| a report of the line names a road, and the repository holds no such road (Heidlersburg, Middletown, the Gettysburg road, the road from Scotland, the Waynesborough pike, a railroad), or two roads of the road layer could carry the name; none is guessed | 17 | 17 |
| a move made after the unit stood on the field, or inside it; the road named is where it moved, not the road it came onto the field by | 16 | 15 |
| a road is printed for the line of command but it does not cross the loaded ground (Black Horse Tavern Road, AP-07): no other road is chosen for the unit | 12 | 6 |
| the road is where the unit stood, formed, camped or crossed inside the field: no approach is stated | 10 | 10 |
| a dispatch or an order printed as a movement (what a commander told another to do), not the road a unit marched on to the field | 10 | 1 |
| an inferred claim with no verbatim quote: the road cannot be checked against printed words | 10 | 0 |
| the road stands only in the compiler's bracketed gloss or summary, not in the claim's printed words (a bracketed gloss is never evidence) | 5 | 4 |
| a headquarters, staff or grouping entry: the record gives it no figure | 4 | 0 |
| the reports of the same formation print different roads; none is chosen (the disagreement is listed) | 1 | 1 |

## History layer v8: ledger E, the state regimental volumes (contract 1.8, DEC-023E)

Ledger E (`history/positions/positions_E.jsonl`, 200 claims: 61 documented, 139 inferred, 0 plausible-procedural; after the independent audit and repair of 2026-10-30) cites a state regimental volume and a section of it (`source.volume`, `source.section`, `source.work`), not an OR27 `report_id`. The adapter (`sourceOf` and `digest` in `tools/claim-ledger.mjs`, the card words in `real.mjs` and `card-sections.mjs`) names the source of a claim whatever the ledger; **E claims are admitted by exactly the rules of A to D** (`claim_support_verified` true, `fidelity_check` passed_full_read or corrected, tier documented or inferred; every phrase literally in the claim's quote or printed words; a printed clock or period; a gazetteer place or road; the Q04 gates never moved; the curation table reviews every claim that passes the mechanical tests). A `record` phrase (checked against an OR27 record by `tools/verify_claim_phrases.py`) is refused for an E claim. The volumes: NY1 32, NY2 34, NY3 45, PA1B 29, PA2 15, MI 26, BL3 19.

| | |
|---|---|
| claims read | 200 (usable 200; weak-source flagged 2; OCR-uncertain 20; linked to a conflicting claim 37) |
| **claims admitted** (drive an entry, support one, are recorded, or establish a documented absence) | 7: 3 documented, 4 inferred |
| dispositions | transcribed inert 1, unresolved 193, used absence 3, used approach 2, used approach support 1 |
| left out, by reason | no printed time 95, reviewed not used 59, no gazetteer place 18, departure no resolvable road 9, printed clock unconfirmed 7, place is a road 3, conflict stop 1, place outside loaded ground 1 |
| units with a claim of their own / in the roster / drawn now | 60 / 60 / 6 |

| | v7 (without ledger E) | v8 (with ledger E) | change |
|---|---|---|---|
| units drawn | 430 | 439 | +9 |
| placed (a road and a place) | 409 | 418 | +9 |
| at the arrival edge only | 21 | 21 | +0 |
| open gap (leaf units, not drawn) | 118 | 108 | -10 |
| not on the field (13 listed by the PDF ledger + documented absences) | 13 | 14 | +1 |
| of them documented absent from the field (overlay) | 0 | 1 | +1 |
| figures drawn (one soldier per figure, no cap) | 124,728 | 127,572 | +2,844 |
| approach records | 49 | 51 | +2 |
| stop entries (PO) | 82 | 83 | +1 |
| ledger-vs-edge offsets (card note, gate not moved) | 346 | 355 | +9 |
| defects (a timed place reached late) | 0 | 0 | +0 |
| troop-map day stops applied | 498 | 519 | +21 |

**Previously undrawn units now drawn: 9** (`us-11c-2d-coster-134ny` (AP-42, moving, 296 figures), `us-11c-2d-coster-154ny` (AP-42, moving, 296 figures), `us-11c-2d-coster-27pa` (AP-42, moving, 296 figures), `us-11c-2d-coster-73pa` (AP-42, moving, 296 figures), `us-11c-2d-smith-33ma` (AP-42, moving, 296 figures), `us-11c-2d-smith-136ny` (AP-42, moving, 296 figures), `us-11c-2d-smith-55oh` (AP-42, moving, 296 figures), `us-11c-2d-smith-73oh` (AP-42, moving, 296 figures), `us-11c-art-1nyi` (AP-43, moving, 296 figures)). Gates moved: 0 (Q04: a gate is never moved by a claim). Offsets reported for the new units (the ledger time of the first place refers to a place farther along the road than the edge of the loaded ground; the card says so): 9 of 9: `us-11c-2d-coster-134ny` (PO-34, Cemetery Hill: 8.5 km farther along Emmitsburg Road than the edge; reached on time); `us-11c-2d-coster-154ny` (PO-34, Cemetery Hill: 8.5 km farther along Emmitsburg Road than the edge; reached on time); `us-11c-2d-coster-27pa` (PO-34, Cemetery Hill: 8.5 km farther along Emmitsburg Road than the edge; reached on time); `us-11c-2d-coster-73pa` (PO-34, Cemetery Hill: 8.5 km farther along Emmitsburg Road than the edge; reached on time); `us-11c-2d-smith-33ma` (PO-34, Cemetery Hill: 8.5 km farther along Emmitsburg Road than the edge; reached on time); `us-11c-2d-smith-136ny` (PO-34, Cemetery Hill: 8.5 km farther along Emmitsburg Road than the edge; reached on time); `us-11c-2d-smith-55oh` (PO-34, Cemetery Hill: 8.5 km farther along Emmitsburg Road than the edge; reached on time); `us-11c-2d-smith-73oh` (PO-34, Cemetery Hill: 8.5 km farther along Emmitsburg Road than the edge; reached on time); `us-11c-art-1nyi` (PO-81, Cemetery Hill: 8.5 km farther along Emmitsburg Road than the edge; reached on time).

Approach records added (tier inferred; the claim tier is shown on the card, with the volume, section, printed page, quoted words and the claims that conflict):

| approach | road | printed for | claim | volume, section, page | printed words | units drawn |
|---|---|---|---|---|---|---|
| AP-42 | Emmitsburg Road | `us-11c-2d` | `POS-E-US-11C-2D-004` (inferred) | New York at Gettysburg (1902) vol. 3, NY3-S009, p. 1053~1055 | “Emmitsburg Pike” (direction_or_road) | 8 |
| AP-43 | Emmitsburg Road | `us-11c-art-1nyi` | `POS-E-US-11C-ART-1NYI-002` (inferred; supported by `POS-E-US-11C-ART-1NYI-001`) | New York at Gettysburg (1902) vol. 3, NY3-S024, p. 1246 | “on the Emmitsburg Road” (place.printed) | 1 |

Stop entries read from ledger E: 1 (PO-83 `us-cav-1d-devin-6ny` The Peach Orchard 1863-07-01 20:04 (convention), claim tier documented, 0 drawn units, transcribed inert). Claims of ledger E dated before the gate of their own unit: 1 (kept in the data, listed in `claim-dispositions.json` `earlier_than_gate`, never applied: the gate is not moved).

Roads of ledger E that are **not** admitted, and why (the full reason of each claim is in `data/claim-curation.json`): positions inside the field are not roads of approach (DEC-012); the 3rd Division of the Cavalry Corps came from the east by Hunterstown and Two Taverns and its brigades print different continuations (none chosen); the 1st Division's Boonsboro-Fairfield route cannot be placed (RC-08); the Eleventh Corps 3rd Division prints only the circuitous route by Horner's Mills (RC-07) and a route through the town (no road); no claim names the Black Horse Tavern road for the Eleventh Corps, and the 26th Pennsylvania passes through Black Horse Tavern and takes "the right road to Gettysburg" (not named): the Third Corps' 2nd Division stays an open gap (AP-07 does not cross the ground). For the 2nd Division of the Eleventh Corps the Emmitsburg Pike (154th NY sketch, inferred) is admitted; its Horner's Mills claim is listed on the card as a conflicting claim, neither resolved.

### The 84th Pennsylvania: documented absence (an overlay, not an edit of the PDF-derived files)

`us-3c-2d-carr-84pa` (roster status on_field, an open gap before v8 with a procedural share of 249 figures counted in its corps pool) is **documented absent from the field**: 9 claims (POS-E-US-3C-2D-CARR-84PA-001:documented, POS-E-US-3C-2D-CARR-84PA-002:documented, POS-E-US-3C-2D-CARR-84PA-003:inferred, POS-B-us-3c-2d-carr-84pa-01:documented, POS-B-us-3c-2d-carr-84pa-02:documented, POS-B-us-3c-2d-carr-84pa-03:documented, POS-B-us-3c-2d-carr-84pa-04:documented, POS-B-us-3c-2d-carr-84pa-05:documented, POS-B-us-3c-2d-carr-84pa-06:documented), decision DEC-023E, evidence-gap entry `EG-E-84PA` (tier documented). Its card reads "With the supply train at Taneytown (documented, regimental account), not engaged" followed by the summary and every claim with its source, page, tier and quoted words; render status `not_on_field`, drawn false, figures 0; its strength is not counted in the field totals, so the procedural shares of the other leaf units of its corps pool rise (42 leaf units, from 249 to 255 each: the printed corps figure is shared by the leaf units on the field, as for the 13 units the PDF lists as never on the field). The source files `history/units.json` and `not_on_field.json` are not edited (the layer reads the status over the unit; `tools/bt/check_arrivals.py` still reads the PDF-derived file).

Candidates for "detached from the field" in the five ledgers (a regular-expression read of the printed quote, summary, place and time of every usable claim; it **lists, it does not exclude**; only a unit with a documented basis for the whole battle is excluded):

| unit | roster status | drawn | claims (ledger, tier, words matched) | whole-battle wording | verdict |
|---|---|---|---|---|---|
| `cs-13va-winchester` | never on field | no | `PD-13va-winchester-01` (D, documented, “provost guard”) | yes | already not drawn: the roster lists it as never on the field |
| `cs-1c-hood-anderson` | on field | no | `PD-1c-hood-anderson-01` (D, documented, “not present”) | no | a formation: its claims concern part of it or a time; not excluded |
| `cs-1c-hood-law-47al` | on field | yes | `PD-1c-hood-law-47al-01` (D, documented, “detached to guard”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `cs-1c-pickett` | on field | no | `POS-E-CS-1C-PICKETT-001` (E, inferred, “left at Chambersburg”); `POS-E-CS-1C-PICKETT-002` (E, inferred, “left at Chambersburg”) | no | a formation: its claims concern part of it or a time; not excluded |
| `cs-2c-early-jones` | on field | no | `PD-2c-early-jones-04` (D, documented, “with the train”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `cs-2c-johnson` | on field | no | `PD-2c-johnson-02` (D, documented, “did not reach”); `PD-2c-johnson-06` (D, documented, “did not arrive”); `POS-E-CS-2C-JOHNSON-002` (E, inferred, “did not reach”) | no | a formation: its claims concern part of it or a time; not excluded |
| `cs-2c-rodes-carter` | on field | yes | `PD-2c-rodes-carter-02` (D, documented, “not engaged”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `cs-2c-rodes-oneal-26al` | on field | yes | `PD-2c-rodes-oneal-26al-01` (D, documented, “not engaged”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `cs-2c-rodes-oneal-3al` | on field | yes | `PD-2c-rodes-oneal-3al-01` (D, documented, “not engaged”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `cs-3c-heth-archer` | on field | no | `PD-3c-heth-archer-03` (D, documented, “not engaged”) | no | a formation: its claims concern part of it or a time; not excluded |
| `cs-3c-pender-mcgowan` | on field | no | `PD-3c-pender-mcgowan-01` (D, documented, “guard the wagon train”) | no | a formation: its claims concern part of it or a time; not excluded |
| `cs-3c-pender-poague` | on field | yes | `PD-3c-pender-poague-02` (D, documented, “took no part”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `cs-cav-div` | on field | no | `PD-cav-div-04` (D, documented, “with the train”) | no | a formation: its claims concern part of it or a time; not excluded |
| `us-11c-3d-krzyzanowski-58ny` | on field | no | `POS-E-US-11C-3D-KRZYZANOWSKI-58NY-003` (E, inferred, “with the wagon train”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `us-11c-art-1ohk` | on field | no | `POS-A-11C-007` (A, documented, “took no part”); `POS-A-11C-025` (A, documented, “not engaged”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `us-12c-1d-lockwood-150ny` | on field | yes | `POS-B-us-12c-1d-lockwood-150ny-01` (B, documented, “detailed for duty”); `POS-B-us-12c-1d-lockwood-150ny-11` (B, documented, “did not reach”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `us-12c-2d` | on field | no | `POS-B-us-12c-2d-39` (B, documented, “did not arrive”) | no | a formation: its claims concern part of it or a time; not excluded |
| `us-1c-3d-stannard` | on field | no | `POS-A-1C0-028` (A, documented, “with the wagon train”) | no | a formation: its claims concern part of it or a time; not excluded |
| `us-1c-art-4usb` | on field | yes | `POS-A-1CA-007` (A, documented, “not engaged”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `us-2c-1d-zook-57ny` | on field | yes | `POS-B-us-2c-1d-zook-57ny-01` (B, documented, “did not arrive”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `us-2c-3d-carroll` | on field | no | `POS-B-us-2c-3d-carroll-10` (B, documented, “not engaged”) | no | a formation: its claims concern part of it or a time; not excluded |
| `us-2c-3d-carroll-8oh` | on field | yes | `POS-B-us-2c-3d-carroll-8oh-05` (B, documented, “not engaged”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `us-3c` | on field | no | `POS-B-us-3c-22` (B, documented, “left at Emmitsburg”); `POS-B-us-3c-23` (B, documented, “left at Emmitsburg”) | no | a formation: its claims concern part of it or a time; not excluded |
| `us-3c-1d-ward-2ussharpshooters` | on field | yes | `POS-B-us-3c-1d-ward-2ussharpshooters-13` (B, documented, “not engaged”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `us-3c-2d-burling` | on field | no | `POS-B-us-3c-2d-burling-05` (B, documented, “left at Emmitsburg”) | no | a formation: its claims concern part of it or a time; not excluded |
| `us-3c-2d-carr-84pa` | documented absent | no | `POS-B-us-3c-2d-carr-84pa-01` (B, documented, “detailed to guard”); `POS-B-us-3c-2d-carr-84pa-02` (B, documented, “with the train”); `POS-B-us-3c-2d-carr-84pa-05` (B, documented, “with the train”); `POS-B-us-3c-2d-carr-84pa-06` (B, documented, “Guarding corps trains”) and 3 more | yes | excluded by this overlay (documented absence) |
| `us-3c-art-1njb` | on field | yes | `POS-B-us-3c-art-1njb-15` (B, documented, “not engaged”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `us-3c-art-1nyd` | on field | yes | `POS-B-us-3c-art-1nyd-12` (B, documented, “not engaged”); `POS-B-us-3c-art-1nyd-13` (B, documented, “not engaged”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `us-3c-art-1rie` | on field | yes | `POS-B-us-3c-art-1rie-10` (B, documented, “did not participate”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `us-5c-2d-burbank` | on field | no | `POS-C-0143` (C, documented, “not engaged”) | no | a formation: its claims concern part of it or a time; not excluded |
| `us-5c-2d-day-14us` | on field | yes | `POS-C-0135` (C, documented, “not engaged”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `us-5c-2d-weed` | on field | no | `POS-C-0164` (C, documented, “not engaged”) | no | a formation: its claims concern part of it or a time; not excluded |
| `us-5c-art-1nyc` | on field | yes | `POS-C-0202` (C, documented, “not engaged”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `us-5c-art-3ma` | on field | yes | `POS-C-0200` (C, documented, “not engaged”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `us-6c-1d-russell` | on field | no | `POS-C-0249` (C, documented, “not engaged”) | no | a formation: its claims concern part of it or a time; not excluded |
| `us-6c-3d-wheaton` | on field | no | `POS-C-0302` (C, documented, “guarded the supply train”); `POS-C-0510` (C, documented, “not engaged”) | no | a formation: its claims concern part of it or a time; not excluded |
| `us-6c-3d-wheaton-93pa` | on field | yes | `POS-C-0301` (C, documented, “detailed to guard”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `us-aop-hq` | on field | no | `POS-C-0439` (C, documented, “remained at Taneytown”); `POS-C-0475` (C, documented, “guard the trains”) | yes | not drawn (open gap or edge); whole-battle wording present; owner to confirm |
| `us-art-reserve` | on field | no | `POS-C-0329` (C, documented, “with the ammunition train”); `POS-C-0330` (C, documented, “with the ammunition train”); `POS-C-0335` (C, documented, “with the supply train”) | no | a formation: its claims concern part of it or a time; not excluded |
| `us-art-reserve-huntington-1nh` | on field | yes | `POS-C-0400` (C, documented, “not engaged”) | no | a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle) |
| `us-art-reserve-taft` | on field | no | `POS-C-0513` (C, inferred, “stayed at Westminster”) | no | a formation: its claims concern part of it or a time; not excluded |
| `us-art-reserve-taft-1ctheavy-b` | never on field | no | `POS-C-0394` (C, documented, “with the supply train”) | yes | already not drawn: the roster lists it as never on the field |
| `us-cav-1d` | on field | no | `POS-A-CV1-015` (A, documented, “guard the trains”); `POS-E-US-CAV-1D-003` (E, inferred, “guard the trains”) | no | a formation: its claims concern part of it or a time; not excluded |
| `us-cav-3d-farnsworth` | on field | no | `POS-A-CV2-024` (A, documented, “not engaged”) | no | a formation: its claims concern part of it or a time; not excluded |

Playwright specs to run once the Release 1 acceptance run has finished (not run here: no browser, no build, no long process while the machine is being measured): `tests/real.spec.mjs` (cards: the E source words, the absent card), `tests/arrival.spec.mjs` (counts, arrivals), `tests/scrub.spec.mjs` (no pop, units enter at their gates), `tests/leak.spec.mjs`, `tests/casualties.spec.mjs`, `tests/ui.spec.mjs` (about panel, card sections), `tests/perf.spec.mjs` (figures drawn rose from 124,728 to 127,572). `python tools/bt/check_figures.py --write` was run (short Python) and `data/figures-validation.json` rewritten for the new drawn set.

## Strengths

Printed: 13 corps rows and 8 brigades (Stone Sentinels, a weak source), carried as single figures with no range (the PDF declares none). Everything below them is a procedural share: the nearest figured ancestor's figure, less the figures printed for its sub-units, shared equally by the leaf units on the field (units never on the field take no share). The basis string on every card says so, the tier is plausible-procedural, the source is weak.

| pool owner | figure | less sub-figures | pool | leaf units on the field | share each |
|---|---|---|---|---|---|
| us-1c-1d-meredith (Iron Brigade) | 1,830 | 0 | 1,830 | 5 | 366 |
| us-1c-1d-cutler (Cutler) | 2,015 | 0 | 2,015 | 6 | 336 |
| us-1c-2d-paul (Paul) | 1,540 | 0 | 1,540 | 5 | 308 |
| cs-1c-mclaws-barksdale (Barksdale) | 1,620 | 0 | 1,620 | 4 | 405 |
| cs-1c-pickett-garnett (Garnett) | 1,460 | 0 | 1,460 | 5 | 292 |
| cs-1c-pickett-armistead (Armistead) | 1,950 | 0 | 1,950 | 5 | 390 |
| cs-2c-rodes-iverson (Iverson) | 1,385 | 0 | 1,385 | 4 | 346 |
| cs-3c-heth-pettigrew (Pettigrew) | 2,584 | 0 | 2,584 | 4 | 646 |
| us-1c (I) | 12,160 | 5,385 | 6,775 | 22 | 308 |
| us-2c (II) | 11,216 | 0 | 11,216 | 50 | 224 |
| us-3c (III) | 10,691 | 0 | 10,691 | 42 | 255 |
| us-5c (V) | 10,904 | 0 | 10,904 | 39 | 280 |
| us-6c (VI) | 13,601 | 0 | 13,601 | 44 | 309 |
| us-11c (XI) | 9,189 | 0 | 9,189 | 31 | 296 |
| us-12c (XII) | 9,755 | 0 | 9,755 | 32 | 305 |
| us-cav (Cavalry) | 11,769 | 0 | 11,769 | 31 | 380 |
| us-art-reserve (Artillery Reserve) | 2,364 | 0 | 2,364 | 22 | 107 |
| cs-1c (I (Longstreet)) | 20,704 | 5,030 | 15,674 | 49 | 320 |
| cs-2c (II (Ewell)) | 20,689 | 1,385 | 19,304 | 63 | 306 |
| cs-3c (III (Hill)) | 20,779 | 2,584 | 18,195 | 58 | 314 |
| cs-cav-div (Cavalry (Stuart)) | 6,390 | 0 | 6,390 | 22 | 290 |

**Known distortion, for the owner to rule on:** equal shares give a battery the same figure as a regiment of its corps (for example 308 figures for each I Corps battery), and the corps figures may or may not include artillery and train; the PDF does not say. The stated rule ("corps figure shared by regiment count") is applied as written. The kit data states a gun count for only some batteries and none of the drawn batteries has one, so no guns are drawn.

## Casualties, guns, per-figure kit and changes of formation (contract 1.3)

Method, ranges and caveats in full: `CASUALTIES-NOTES.md`. Everything in this section is plausible-procedural, weak-sourced and labelled so on the cards; no regimental casualty number is read from anywhere.

### Casualties

564 units carry a loss number: 21 printed (13 corps rows and 8 brigades, Stone Sentinels, a weak source) and 543 procedural shares (the nearest printed loss less the losses printed below it, shared like the strength; the shares add up to the pool exactly). Each has a total range and killed, wounded and missing ranges from the army-level sources (`data/casualty-sources.json`). The fractions used:

| army | killed | wounded | missing | total spread (high / Stone Sentinels) | sources of the split |
|---|---|---|---|---|---|
| union | 13.7% to 13.7% | 61.6% to 63.0% | 23.3% to 23.3% | 23,055 / 22,822 = 1.0102 | WIKI, CWM, OR27-LETTERMAN |
| confederate | 13.9% to 20.3% | 54.6% to 66.8% | 19.3% to 25.1% | 28,063 / 22,709 = 1.2358 | BM, CWM |

The split that drives the picture is the middle of each fraction range (DEC-008, provisional builder choice, the owner decides). Pools (printed loss shared over the leaf units on the field):

| pool owner | printed loss | less sub-losses | pool loss | pool strength | leaf units | share each | loss rate |
|---|---|---|---|---|---|---|---|
| `us-1c-1d-meredith` | 1,150 | 0 | 1,150 | 1,830 | 5 | 230 | 62.8% |
| `us-1c-1d-cutler` | 1,000 | 0 | 1,000 | 2,015 | 6 | 166 (+1 for 4) | 49.6% |
| `us-1c-2d-paul` | 1,030 | 0 | 1,030 | 1,540 | 5 | 206 | 66.9% |
| `cs-1c-mclaws-barksdale` | 745 | 0 | 745 | 1,620 | 4 | 186 (+1 for 1) | 46% |
| `cs-1c-pickett-garnett` | 950 | 0 | 950 | 1,460 | 5 | 190 | 65.1% |
| `cs-1c-pickett-armistead` | 1,230 | 0 | 1,230 | 1,950 | 5 | 246 | 63.1% |
| `cs-2c-rodes-iverson` | 900 | 0 | 900 | 1,385 | 4 | 225 | 65% |
| `cs-3c-heth-pettigrew` | 1,450 | 0 | 1,450 | 2,584 | 4 | 362 (+1 for 2) | 56.1% |
| `us-1c` | 6,044 | 3,180 | 2,864 | 6,775 | 22 | 130 (+1 for 4) | 42.3% |
| `us-2c` | 4,358 | 0 | 4,358 | 11,216 | 50 | 87 (+1 for 8) | 38.9% |
| `us-3c` | 4,226 | 0 | 4,226 | 10,691 | 42 | 100 (+1 for 26) | 39.5% |
| `us-5c` | 2,193 | 0 | 2,193 | 10,904 | 39 | 56 (+1 for 9) | 20.1% |
| `us-6c` | 242 | 0 | 242 | 13,601 | 44 | 5 (+1 for 22) | 1.8% |
| `us-11c` | 3,821 | 0 | 3,821 | 9,189 | 31 | 123 (+1 for 8) | 41.6% |
| `us-12c` | 1,082 | 0 | 1,082 | 9,755 | 32 | 33 (+1 for 26) | 11.1% |
| `us-cav` | 610 | 0 | 610 | 11,769 | 31 | 19 (+1 for 21) | 5.2% |
| `us-art-reserve` | 242 | 0 | 242 | 2,364 | 22 | 11 | 10.2% |
| `cs-1c` | 8,172 | 2,925 | 5,247 | 15,674 | 49 | 107 (+1 for 4) | 33.5% |
| `cs-2c` | 6,646 | 900 | 5,746 | 19,304 | 63 | 91 (+1 for 13) | 29.8% |
| `cs-3c` | 7,602 | 1,450 | 6,152 | 18,195 | 58 | 106 (+1 for 4) | 33.8% |
| `cs-cav-div` | 285 | 0 | 285 | 6,390 | 22 | 12 (+1 for 21) | 4.5% |

**Time.** 31 engagement clauses (`data/engagements.json`, built from `tools/engagement-clauses.mjs`) read the printed windows of the PDF master timeline for 58 units and formations; the OR27 audit verdicts of those rows: 25 supported by or, 4 ambiguous in or, 1 contradicted by or, 1 not found in or. 213 leaf units on the field take a window from themselves or a formation above them; the other 330 procedural shares have no printed window and stay a total (an open gap, not spread over the day).

**On screen.** 170 of the 439 drawn units have a window: 17,574 men are placed in time by the sim's loss solver; 14,553 fall where their unit stands on the map (killed 2,352, wounded 8,902, missing 3,299; the killed and wounded lie down, the missing are counted but not animated) and 3,021 fall while the unit is marching in, away or not yet arrived and are NOT drawn (they stay in the unit's total). Per drawn unit:

| unit | total | placed in time | shown | not shown |
|---|---|---|---|---|
| `us-12c-2d-greene-60ny` | 34 | 34 | 34 | 0 |
| `us-12c-2d-greene-78ny` | 34 | 34 | 34 | 0 |
| `us-12c-2d-greene-102ny` | 34 | 34 | 34 | 0 |
| `us-12c-2d-greene-137ny` | 33 | 33 | 33 | 0 |
| `us-12c-2d-greene-149ny` | 34 | 34 | 34 | 0 |
| `us-12c-2d-kane-29pa` | 33 | 33 | 33 | 0 |
| `us-12c-2d-kane-109pa` | 33 | 33 | 33 | 0 |
| `us-12c-2d-kane-111pa` | 34 | 34 | 34 | 0 |
| `cs-3c-heth-archer-13al` | 106 | 106 | 60 | 46 |
| `cs-3c-heth-archer-5albn` | 106 | 106 | 55 | 51 |
| `cs-3c-heth-archer-1tnprov` | 106 | 106 | 62 | 44 |
| `cs-3c-heth-archer-7tn` | 106 | 106 | 59 | 47 |
| `cs-3c-heth-archer-14tn` | 106 | 106 | 67 | 39 |
| `cs-3c-heth-davis-2ms` | 106 | 106 | 106 | 0 |
| `cs-3c-heth-davis-11ms` | 107 | 107 | 107 | 0 |
| `cs-3c-heth-davis-42ms` | 106 | 106 | 106 | 0 |
| `cs-3c-heth-davis-55nc` | 106 | 106 | 106 | 0 |
| `cs-3c-heth-pettigrew-11nc` | 363 | 363 | 363 | 0 |
| `cs-3c-heth-pettigrew-26nc` | 362 | 362 | 362 | 0 |
| `cs-3c-heth-pettigrew-47nc` | 362 | 362 | 362 | 0 |
| `cs-3c-heth-pettigrew-52nc` | 363 | 363 | 363 | 0 |
| `cs-3c-anderson-perry-2fl` | 106 | 106 | 106 | 0 |
| `cs-3c-anderson-perry-5fl` | 106 | 106 | 106 | 0 |
| `cs-3c-anderson-perry-8fl` | 106 | 106 | 106 | 0 |
| `cs-2c-johnson-nicholls-1la` | 92 | 92 | 92 | 0 |
| `cs-2c-johnson-nicholls-2la` | 92 | 92 | 92 | 0 |
| `cs-2c-johnson-nicholls-10la` | 91 | 91 | 91 | 0 |
| `cs-2c-johnson-nicholls-14la` | 91 | 91 | 91 | 0 |
| `cs-2c-johnson-nicholls-15la` | 91 | 91 | 91 | 0 |
| `cs-1c-hood-law-4al` | 107 | 107 | 107 | 0 |
| `cs-1c-hood-law-15al` | 107 | 107 | 107 | 0 |
| `cs-1c-hood-law-44al` | 107 | 107 | 107 | 0 |
| `cs-1c-hood-law-47al` | 107 | 107 | 107 | 0 |
| `cs-1c-hood-law-48al` | 107 | 107 | 107 | 0 |
| `cs-1c-hood-anderson-7ga` | 107 | 107 | 107 | 0 |
| `cs-1c-hood-anderson-8ga` | 107 | 107 | 107 | 0 |
| `cs-1c-hood-anderson-9ga` | 107 | 107 | 107 | 0 |
| `cs-1c-hood-anderson-11ga` | 107 | 107 | 107 | 0 |
| `cs-1c-hood-anderson-59ga` | 107 | 107 | 107 | 0 |
| `cs-1c-hood-benning-2ga` | 107 | 107 | 107 | 0 |
| `cs-1c-hood-benning-15ga` | 107 | 107 | 107 | 0 |
| `cs-1c-hood-benning-17ga` | 107 | 107 | 107 | 0 |
| `cs-1c-hood-benning-20ga` | 107 | 107 | 107 | 0 |
| `cs-1c-mclaws-kershaw-2sc` | 107 | 107 | 107 | 0 |
| `cs-1c-mclaws-kershaw-3sc` | 107 | 107 | 107 | 0 |
| `cs-1c-mclaws-kershaw-7sc` | 107 | 107 | 107 | 0 |
| `cs-1c-mclaws-kershaw-8sc` | 107 | 107 | 107 | 0 |
| `cs-1c-mclaws-kershaw-15sc` | 107 | 107 | 107 | 0 |
| `cs-1c-mclaws-kershaw-3scbn` | 107 | 107 | 107 | 0 |
| `cs-3c-anderson-wilcox-8al` | 106 | 106 | 106 | 0 |
| `cs-3c-anderson-wilcox-9al` | 106 | 106 | 106 | 0 |
| `cs-3c-anderson-wilcox-10al` | 106 | 106 | 106 | 0 |
| `cs-3c-anderson-wilcox-11al` | 107 | 107 | 107 | 0 |
| `cs-3c-anderson-wilcox-14al` | 106 | 106 | 106 | 0 |
| `cs-3c-anderson-wright-3ga` | 106 | 106 | 106 | 0 |
| `cs-3c-anderson-wright-22ga` | 106 | 106 | 106 | 0 |
| `cs-3c-anderson-wright-48ga` | 107 | 107 | 107 | 0 |
| `cs-3c-anderson-wright-2gabn` | 106 | 106 | 106 | 0 |
| `us-1c-1d-meredith-19in` | 230 | 230 | 95 | 135 |
| `us-1c-1d-meredith-24mi` | 230 | 230 | 90 | 140 |
| `us-1c-1d-meredith-6wi` | 230 | 230 | 75 | 155 |
| `us-1c-1d-cutler-84ny` | 167 | 167 | 72 | 95 |
| `us-1c-1d-cutler-95ny` | 167 | 167 | 76 | 91 |
| `us-1c-1d-cutler-147ny` | 166 | 166 | 0 | 166 |
| `us-1c-2d-paul-16me` | 206 | 206 | 85 | 121 |
| `us-1c-2d-baxter-12ma` | 130 | 130 | 130 | 0 |
| `us-1c-2d-baxter-83ny` | 130 | 130 | 130 | 0 |
| `us-1c-2d-baxter-97ny` | 130 | 130 | 130 | 0 |
| `us-1c-2d-baxter-11pa` | 130 | 130 | 130 | 0 |
| `us-1c-2d-baxter-88pa` | 130 | 130 | 130 | 0 |
| `us-1c-2d-baxter-90pa` | 130 | 130 | 130 | 0 |
| `us-1c-3d-biddle-80ny` | 130 | 130 | 130 | 0 |
| `us-1c-3d-biddle-121pa` | 130 | 130 | 130 | 0 |
| `us-1c-3d-biddle-142pa` | 130 | 130 | 130 | 0 |
| `us-1c-3d-biddle-151pa` | 130 | 130 | 130 | 0 |
| `us-1c-3d-stone-143pa` | 130 | 130 | 130 | 0 |
| `us-1c-3d-stone-149pa` | 131 | 131 | 131 | 0 |
| `us-1c-3d-stone-150pa` | 130 | 130 | 130 | 0 |
| `us-1c-3d-stannard-13vt` | 130 | 130 | 66 | 64 |
| `us-1c-1d-meredith-2wi` | 230 | 230 | 92 | 138 |
| `us-1c-1d-meredith-7wi` | 230 | 230 | 98 | 132 |
| `us-11c-1d-gilsa-41ny` | 124 | 124 | 0 | 124 |
| `us-11c-1d-gilsa-54ny` | 123 | 123 | 0 | 123 |
| `us-11c-1d-gilsa-68ny` | 123 | 123 | 0 | 123 |
| `us-11c-1d-gilsa-153pa` | 123 | 123 | 0 | 123 |
| `us-11c-1d-ames-17ct` | 123 | 123 | 123 | 0 |
| `us-11c-1d-ames-25oh` | 123 | 123 | 0 | 123 |
| `us-11c-1d-ames-75oh` | 123 | 123 | 123 | 0 |
| `us-11c-1d-ames-107oh` | 123 | 123 | 123 | 0 |
| `us-3c-1d-ward-20in` | 100 | 100 | 82 | 18 |
| `us-3c-1d-ward-4me` | 101 | 101 | 82 | 19 |
| `us-3c-1d-ward-124ny` | 100 | 100 | 100 | 0 |
| `us-3c-1d-trobriand-17me` | 101 | 101 | 75 | 26 |
| `us-3c-1d-trobriand-3mi` | 100 | 100 | 72 | 28 |
| `us-3c-1d-trobriand-5mi` | 100 | 100 | 79 | 21 |
| `us-3c-1d-trobriand-110pa` | 101 | 101 | 75 | 26 |
| `us-3c-1d-ward-99pa` | 101 | 101 | 78 | 23 |
| `us-3c-1d-trobriand-40ny` | 101 | 101 | 76 | 25 |
| `us-cav-1d-merritt-6pa` | 20 | 20 | 0 | 20 |
| `us-cav-1d-merritt-1us` | 20 | 20 | 0 | 20 |
| `us-cav-1d-merritt-2us` | 20 | 20 | 0 | 20 |
| `us-cav-1d-merritt-5us` | 19 | 19 | 0 | 19 |
| `us-cav-1d-merritt-6us` | 19 | 19 | 0 | 19 |
| `us-2c-2d-harrow-15ma` | 87 | 87 | 87 | 0 |
| `us-2c-2d-harrow-1mn` | 87 | 87 | 87 | 0 |
| `us-2c-2d-harrow-82ny` | 88 | 88 | 88 | 0 |
| `us-2c-2d-webb-69pa` | 87 | 87 | 87 | 0 |
| `us-2c-2d-webb-71pa` | 87 | 87 | 87 | 0 |
| `us-2c-2d-webb-72pa` | 87 | 87 | 87 | 0 |
| `us-2c-2d-webb-106pa` | 87 | 87 | 87 | 0 |
| `us-cav-2d-gregg-1me` | 20 | 20 | 18 | 2 |
| `us-cav-2d-gregg-10ny` | 20 | 20 | 18 | 2 |
| `us-cav-2d-gregg-4pa` | 19 | 19 | 16 | 3 |
| `us-cav-2d-gregg-16pa` | 19 | 19 | 18 | 1 |
| `us-cav-2d-mcintosh-1md` | 20 | 20 | 20 | 0 |
| `us-cav-2d-mcintosh-1ma` | 20 | 20 | 17 | 3 |
| `us-cav-2d-mcintosh-1nj` | 20 | 20 | 17 | 3 |
| `us-cav-2d-mcintosh-1pa` | 19 | 19 | 18 | 1 |
| `us-cav-2d-mcintosh-3pa` | 20 | 20 | 15 | 5 |
| `us-5c-3d-mccandless-1pareserves` | 56 | 56 | 0 | 56 |
| `us-5c-3d-mccandless-2pareserves` | 57 | 57 | 0 | 57 |
| `us-5c-3d-mccandless-6pareserves` | 57 | 57 | 0 | 57 |
| `us-5c-3d-mccandless-13pareserves` | 56 | 56 | 0 | 56 |
| `cs-2c-early-smith-31va` | 92 | 92 | 74 | 18 |
| `cs-2c-early-smith-49va` | 91 | 91 | 77 | 14 |
| `cs-2c-early-smith-52va` | 91 | 91 | 81 | 10 |
| `cs-2c-early-gordon-13ga` | 91 | 91 | 78 | 13 |
| `cs-2c-early-gordon-26ga` | 91 | 91 | 76 | 15 |
| `cs-2c-early-gordon-31ga` | 91 | 91 | 72 | 19 |
| `cs-2c-early-gordon-38ga` | 91 | 91 | 73 | 18 |
| `cs-2c-early-gordon-60ga` | 91 | 91 | 74 | 17 |
| `cs-2c-early-gordon-61ga` | 91 | 91 | 74 | 17 |
| `cs-2c-early-35vacavalrybn` | 91 | 91 | 75 | 16 |
| `cs-2c-early-hays-5la` | 92 | 92 | 78 | 14 |
| `cs-2c-early-hays-6la` | 91 | 91 | 70 | 21 |
| `cs-2c-early-hays-7la` | 91 | 91 | 73 | 18 |
| `cs-2c-early-hays-8la` | 92 | 92 | 68 | 24 |
| `cs-2c-early-hays-9la` | 91 | 91 | 72 | 19 |
| `cs-2c-early-hoke-6nc` | 91 | 91 | 66 | 25 |
| `cs-2c-early-hoke-21nc` | 91 | 91 | 60 | 31 |
| `cs-2c-early-hoke-57nc` | 91 | 91 | 67 | 24 |
| `cs-2c-rodes-daniel-32nc` | 91 | 91 | 91 | 0 |
| `cs-2c-rodes-daniel-43nc` | 91 | 91 | 91 | 0 |
| `cs-2c-rodes-daniel-45nc` | 91 | 91 | 91 | 0 |
| `cs-2c-rodes-daniel-53nc` | 92 | 92 | 92 | 0 |
| `cs-2c-rodes-daniel-2ncbn` | 92 | 92 | 92 | 0 |
| `cs-2c-rodes-doles-4ga` | 91 | 91 | 91 | 0 |
| `cs-2c-rodes-doles-12ga` | 91 | 91 | 91 | 0 |
| `cs-2c-rodes-doles-21ga` | 91 | 91 | 91 | 0 |
| `cs-2c-rodes-doles-44ga` | 91 | 91 | 91 | 0 |
| `cs-2c-rodes-iverson-5nc` | 225 | 225 | 225 | 0 |
| `cs-2c-rodes-iverson-12nc` | 225 | 225 | 225 | 0 |
| `cs-2c-rodes-iverson-20nc` | 225 | 225 | 225 | 0 |
| `cs-2c-rodes-iverson-23nc` | 225 | 225 | 225 | 0 |
| `cs-2c-rodes-ramseur-2nc` | 91 | 91 | 91 | 0 |
| `cs-2c-rodes-ramseur-4nc` | 91 | 91 | 91 | 0 |
| `cs-2c-rodes-ramseur-14nc` | 92 | 92 | 92 | 0 |
| `cs-2c-rodes-ramseur-30nc` | 91 | 91 | 91 | 0 |
| `cs-2c-rodes-oneal-3al` | 91 | 91 | 91 | 0 |
| `cs-2c-rodes-oneal-5al` | 91 | 91 | 91 | 0 |
| `cs-2c-rodes-oneal-6al` | 91 | 91 | 91 | 0 |
| `cs-2c-rodes-oneal-12al` | 91 | 91 | 91 | 0 |
| `cs-2c-rodes-oneal-26al` | 91 | 91 | 91 | 0 |
| `cs-2c-rodes-carter` | 91 | 91 | 91 | 0 |
| `cs-cav-hampton-1nc` | 13 | 13 | 0 | 13 |
| `cs-cav-hampton-1sc` | 13 | 13 | 0 | 13 |
| `cs-cav-hampton-2sc` | 13 | 13 | 0 | 13 |
| `cs-cav-hampton-cobbslegion` | 13 | 13 | 0 | 13 |
| `cs-cav-hampton-jeffdavislegion` | 13 | 13 | 0 | 13 |
| `cs-cav-hampton-phillipslegion` | 13 | 13 | 0 | 13 |

### Guns

The kit data states gun types for 29 of 125 batteries. 23 of them match one battery of the roster by name, 4 are combined entries that are NOT split (`US.ART.3rd_US_F_K`, `US.ART.Pa_Independent_C_F`, `US.ART.1st_Pennsylvania_F_G`, `US.ART.1st_NY_K_with_11th_NY_attached`), 2 match no roster battery (`US.ART.2nd_US_A`, `CS.ART.HURT`); 22 roster batteries therefore have a stated count. Of the 73 drawn batteries (`us-1c-art-2me`, `us-1c-art-5me`, `us-1c-art-1nye`, `us-1c-art-1nyl`, `us-1c-art-1pab`, `us-1c-art-4usb`, `us-2c-art-1nyb`, `us-2c-art-1ria`, `us-2c-art-1rib`, `us-2c-art-1usi`, `us-2c-art-4usa`, `us-3c-art-1njb`, `us-3c-art-1nyd`, `us-3c-art-4ny`, `us-3c-art-1rie`, `us-3c-art-4usk`, `us-5c-art-3ma`, `us-5c-art-1nyc`, `us-5c-art-1ohl`, `us-5c-art-5usd`, `us-5c-art-5usi`, `us-6c-art-1maa`, `us-6c-art-1ny`, `us-6c-art-3ny`, `us-6c-art-1ric`, `us-6c-art-1rig`, `us-6c-art-2usd`, `us-6c-art-2usg`, `us-6c-art-5usf`, `us-11c-art-1nyi`, `us-12c-art-1nym`, `us-12c-art-pae`, `us-12c-art-4usf`, `us-12c-art-5usk`, `us-art-reserve-ransom-1ush`, `us-art-reserve-ransom-3usf`, `us-art-reserve-ransom-3usk`, `us-art-reserve-ransom-4usc`, `us-art-reserve-ransom-5usc`, `us-art-reserve-mcgilvery-5ma`, `us-art-reserve-mcgilvery-9ma`, `us-art-reserve-mcgilvery-15ny`, `us-art-reserve-mcgilvery-pac`, `us-art-reserve-mcgilvery-paf`, `us-art-reserve-taft-2ct`, `us-art-reserve-taft-5ny`, `us-art-reserve-huntington-1nh`, `us-art-reserve-huntington-1ohh`, `us-art-reserve-huntington-1paf`, `us-art-reserve-huntington-1pag`, `us-art-reserve-huntington-wvc`, `us-art-reserve-fitzhugh-6me`, `us-art-reserve-fitzhugh-mda`, `us-art-reserve-fitzhugh-1nj`, `us-art-reserve-fitzhugh-1nyg`, `us-art-reserve-fitzhugh-1nyk`, `cs-1c-mclaws-cabell`, `cs-1c-pickett-dearing`, `cs-1c-hood-henry`, `cs-1c-res-art-alexander-ashland`, `cs-1c-res-art-alexander-bedford`, `cs-1c-res-art-alexander-brookssc`, `cs-1c-res-art-alexander-madisonla`, `cs-1c-res-art-alexander-richmond`, `cs-1c-res-art-alexander-bath`, `cs-1c-res-art-washington`, `cs-2c-johnson-andrews`, `cs-2c-rodes-carter`, `cs-3c-anderson-cutts`, `cs-3c-heth-garnett`, `cs-3c-pender-poague`, `cs-3c-res-art-mcintosh`, `cs-3c-res-art-pegram`) 22 has one, so **124 guns are drawn**; each card says "not drawn: no stated gun count". The mechanism (a stated count gives that many pieces, each with the nine-man detachment of the printed manuals, taken from the battery's own figures; limbers, caissons and teams have no model and are listed on the card) is tested on a constructed layer.

### Per-figure kit manifests

Every drawn figure (127,572 in 439 units) has a manifest made by `src/history/manifest.mjs`, a line-for-line port of `manifest_for` in `tools/bt/check_kit.py` (golden test: 2,616 reference digests equal). The kit record comes from `data/kit-crosswalk.json` (`tools/bt/kit_crosswalk.py`): by how it was found, 79 units kit presence, 213 units default, 43 units name, 17 units rule, 83 units brigade, 4 units alias; a unit with none uses the default of its army and arm. The B.6.12 validator (Python, `tools/bt/check_figures.py`) ran over all 127,852 figures: 0 fail, 2350 flagged (DISPUTED_FLAGGED 1070, FLAG_BADGE_UNRESOLVED 1035, FLAG_KEPI_PRIVATE_PURCHASE 245), and Python makes the same manifests as the shell. The renderer shows one thing of a manifest: the coat's brightness class follows the wear level (the renderer's per-figure variation scalar); headgear, coat, shirt, trousers, shoes, accoutrements, weapon, bayonet, sword, sash, pack, badge, colours and horse coat colour have no support in the renderer and are listed on the card.

### Changes of formation

| clause | phrase as printed | named unit | change at | drawn units under it | events |
|---|---|---|---|---|---|
| CL-231 | “15:00 McLaws deploys” | `cs-1c-mclaws` | 1863-07-02 15:00 into line | 11 | 10 |
| CL-306 | “Jul 2: deploys late about 21:00 near East Cemetery Hill” | `cs-2c-rodes` | 1863-07-02 21:00 into line | 23 | 23 |

The event type exists (`formation`, contract 1.3) and a unit with a printed change gets a second slot layout; the figures blend from the column of fours to the line over a smoothstep (default 90 s, a tuning value: the repository holds no drill-manual figure for the time of a deployment), so nothing snaps. 

## Units shown at the arrival edge only (open gap after arrival)

These exist from their ledger gate, in a column on their road outside the loaded ground, and stay there (their card says "Arrival edge only"):

`us-6c-2d-neill-7me`, `us-6c-2d-neill-33ny`, `us-6c-2d-neill-43ny`, `us-6c-2d-neill-49ny`, `us-6c-2d-neill-77ny`, `us-6c-2d-neill-61pa`, `us-6c-3d-wheaton-62ny`, `us-6c-3d-wheaton-93pa`, `us-6c-3d-wheaton-98pa`, `us-6c-3d-wheaton-139pa`, `us-cav-1d-merritt-6pa`, `us-cav-1d-merritt-1us`, `us-cav-1d-merritt-2us`, `us-cav-1d-merritt-5us`, `us-cav-1d-merritt-6us`, `cs-cav-hampton-1nc`, `cs-cav-hampton-1sc`, `cs-cav-hampton-2sc`, `cs-cav-hampton-cobbslegion`, `cs-cav-hampton-jeffdavislegion`, `cs-cav-hampton-phillipslegion`

## Units with no place (open gap)

108 leaf units. Reason for 104 of them: "the road "Black Horse Tavern Road" does not cross into the loaded ground; AP-07 prints it for us-3c-2d" (12); "no road or direction of approach is printed in the ledger for this unit or any unit above it" (91); "a road of approach is printed for cs-2c-early (Harrisburg Road), but reports of this unit print another (York road (Brown, chief of artillery, OR27-2-R468 pp. 456-458: “coming up on the York road with Early’s division”); Heidlersburg road = the Harrisburg Road (Early, OR27-2-R470 p. 468, concordance RC-01)) and disagree: none is chosen (PD-2c-early-jones-05, PD-2c-early-06)" (1). The other 4 are headquarters, staff and grouping entries that have no figure. Count by formation:

| formation | leaf units with no place |
|---|---|
| `cs-1c` | 26 |
| `cs-2c` | 20 |
| `us-cav` | 17 |
| `cs-cav` | 16 |
| `us-11c` | 14 |
| `us-3c` | 12 |
| `us-aop` | 1 |
| `us-hancock` | 1 |
| `cs-anv` | 1 |

Full list (the same as `units_without_position` in `node tools/history-report.mjs`):

`us-3c-2d-carr-1ma`, `us-3c-2d-carr-11ma`, `us-3c-2d-carr-16ma`, `us-3c-2d-carr-12nh`, `us-3c-2d-carr-11nj`, `us-3c-2d-carr-26pa`, `us-3c-2d-brewster-70ny`, `us-3c-2d-brewster-71ny`, `us-3c-2d-brewster-72ny`, `us-3c-2d-brewster-73ny`, `us-3c-2d-brewster-74ny`, `us-3c-2d-brewster-120ny`, `us-11c-3d-schimmelfennig-82il`, `us-11c-3d-schimmelfennig-45ny`, `us-11c-3d-schimmelfennig-157ny`, `us-11c-3d-schimmelfennig-61oh`, `us-11c-3d-schimmelfennig-74pa`, `us-11c-3d-krzyzanowski-58ny`, `us-11c-3d-krzyzanowski-119ny`, `us-11c-3d-krzyzanowski-82oh`, `us-11c-3d-krzyzanowski-75pa`, `us-11c-3d-krzyzanowski-26wi`, `us-11c-art-13ny`, `us-11c-art-1ohi`, `us-11c-art-1ohk`, `us-11c-art-4usg`, `us-cav-1d-gamble-8il`, `us-cav-1d-gamble-12il`, `us-cav-1d-gamble-3in`, `us-cav-1d-gamble-8ny`, `us-cav-1d-devin-6ny`, `us-cav-1d-devin-9ny`, `us-cav-1d-devin-17pa`, `us-cav-1d-devin-3wvaandc`, `us-cav-3d-farnsworth-5ny`, `us-cav-3d-farnsworth-18pa`, `us-cav-3d-farnsworth-1vt`, `us-cav-3d-farnsworth-1wv`, `us-cav-3d-custer-1mi`, `us-cav-3d-custer-5mi`, `us-cav-3d-custer-6mi`, `us-cav-3d-custer-7mi`, `us-cav-art`, `cs-1c-mclaws-semmes-10ga`, `cs-1c-mclaws-semmes-50ga`, `cs-1c-mclaws-semmes-51ga`, `cs-1c-mclaws-semmes-53ga`, `cs-1c-mclaws-wofford-16ga`, `cs-1c-mclaws-wofford-18ga`, `cs-1c-mclaws-wofford-24ga`, `cs-1c-mclaws-wofford-cobbslegion`, `cs-1c-mclaws-wofford-phillipslegion`, `cs-1c-mclaws-wofford-3gasharpshooters`, `cs-1c-pickett-garnett-8va`, `cs-1c-pickett-garnett-18va`, `cs-1c-pickett-garnett-19va`, `cs-1c-pickett-garnett-28va`, `cs-1c-pickett-garnett-56va`, `cs-1c-pickett-kemper-1va`, `cs-1c-pickett-kemper-3va`, `cs-1c-pickett-kemper-7va`, `cs-1c-pickett-kemper-11va`, `cs-1c-pickett-kemper-24va`, `cs-1c-pickett-armistead-9va`, `cs-1c-pickett-armistead-14va`, `cs-1c-pickett-armistead-38va`, `cs-1c-pickett-armistead-53va`, `cs-1c-pickett-armistead-57va`, `cs-2c-early-jones`, `cs-2c-johnson-steuart-1mdbn`, `cs-2c-johnson-steuart-1nc`, `cs-2c-johnson-steuart-3nc`, `cs-2c-johnson-steuart-10va`, `cs-2c-johnson-steuart-23va`, `cs-2c-johnson-steuart-37va`, `cs-2c-johnson-stonewall-2va`, `cs-2c-johnson-stonewall-4va`, `cs-2c-johnson-stonewall-5va`, `cs-2c-johnson-stonewall-27va`, `cs-2c-johnson-stonewall-33va`, `cs-2c-johnson-jones-21va`, `cs-2c-johnson-jones-25va`, `cs-2c-johnson-jones-42va`, `cs-2c-johnson-jones-44va`, `cs-2c-johnson-jones-48va`, `cs-2c-johnson-jones-50va`, `cs-2c-res-art-1vaartbn`, `cs-2c-res-art-nelson`, `cs-cav-flee-1mdbn`, `cs-cav-flee-1va`, `cs-cav-flee-2va`, `cs-cav-flee-3va`, `cs-cav-flee-4va`, `cs-cav-flee-5va`, `cs-cav-jenkins-14va`, `cs-cav-jenkins-16va`, `cs-cav-jenkins-17va`, `cs-cav-jenkins-34vabn`, `cs-cav-jenkins-36vabn`, `cs-cav-chambliss-2nc`, `cs-cav-chambliss-9va`, `cs-cav-chambliss-10va`, `cs-cav-chambliss-13va`, `cs-cav-horse-art`, `us-aop-hq`, `us-hancock-acting`, `cs-anv-hq`, `cs-1c-art`

## The clauses: every one transcribed or unresolved

The 44 ledger rows hold 376 clauses in their key-position, night-position, first-on-field and left-or-moved cells (115 of them semicolon-separated key-position clauses; the table splits a few that hold two statements). Every one is in `data/placement.json` (`clauses`) with its row, cell, literal phrase, units, tier and the row's source keys as printed, and is either **transcribed** (158: a gazetteer place or road with its sigma_m, a time as printed or a labelled named-period convention, or an activity) or **unresolved** (218: with its reason). The builder refuses to write the file if any text of any cell is left uncovered.

| cell | clauses | transcribed | unresolved |
|---|---|---|---|
| key positions | 118 | 62 | 56 |
| night positions | 130 | 60 | 70 |
| first on field | 81 | 36 | 45 |
| left or moved | 47 | 0 | 47 |
| **all** | 376 | 158 | 218 |

Transcribed by kind: 57 record, 61 stop, 7 approach, 32 activity, 1 formation (stop = a dated place that moves the units it names; approach = a road; activity = a printed activity word; formation = a printed change of formation; record = a resolved place or time that drives nothing, with the reason on the clause). Effect on the picture: 60 recorded, 96 drives a drawn unit, 2 drives no drawn unit. A clause moves a unit only if the unit has a road of approach (above) and is on the field at the clause's time. 123 (unit, stop) pairs were dropped because the unit already stood at that place or had not been placed (listed by `report().skipped_stops`).

How the unresolved clauses divide by the kind of reason (the reason itself is on every row below):

| kind of reason | clauses |
|---|---|
| the ledger itself prints a gap | 53 |
| the clause names no place (or no time) | 42 |
| the place is named but no repository file carries a coordinate for it | 34 |
| other (read the reason) | 17 |
| a conflicting value of the unit's arrival: carried by the arrival gate, names no place | 15 |
| headquarters, commanders and messages: not the position of a unit | 15 |
| a departure with no destination or road | 10 |
| a position relative to a place with no distance printed | 9 |
| before the unit's ledger gate (Q04): not on the loaded ground | 8 |
| the unit named is not in the roster | 7 |
| several places, or a stream too long to stand a unit on | 4 |
| the road name is ambiguous in the repository (owner to decide) | 3 |
| the junction named is a clip of the road data, not a junction | 1 |

**Departures:** the 47 left-or-moved clauses: 0 are transcribed as departures and 47 are unresolved; none of the unresolved names a destination that the gazetteer can place together with a road the unit leaves the loaded ground by (the destinations are Westminster, Monterey Pass, Falling Waters, Granite Hill, the “Fairfield road” and dates with no place). The mechanism is in the layer (`departures` in `placement.json`: a printed time and a gazetteer road; the unit marches to the point where the road leaves the loaded ground and a `leave` event follows; a unit never leaves without such a clause) and is tested on a constructed clause. **Formation changes:** the only printed ones are “McLaws deploys” and “Rodes deploys late”; the `formation` event (contract 1.3) applies them to every drawn unit under the named formation, and neither has one today (see the section on changes of formation).

### Transcribed clauses

| id | row | cell | clause as printed | kind | place or road (sigma_m) | time | tier | effect |
|---|---|---|---|---|---|---|---|---|
| CL-008 | `us-aop-hq` | night | Jul 2: Leister house (council of war 21:00 to midnight window) | record | Leister house (40) | 1863-07-02T21:00 | inferred | recorded: a headquarters entry: no figure, never drawn |
| CL-009 | `us-aop-hq` | night | Jul 3: Leister house made untenable by the cannonade | record | Leister house (40) | 07-03 | inferred | recorded: a headquarters entry: no figure, never drawn; date only, no clock |
| CL-010 | `us-aop-hq` | night | Meade moves to Powers Hill | record | Powers’ Hill (250) | 07-03 | inferred | recorded: a headquarters entry: no figure, never drawn; date only (the Jul 3 entry), no clock |
| CL-011 | `us-aop-hq` | first | Evergreen gatehouse, Cemetery Hill: after midnight Jul 1-2 (about 00:00-01:00) | record | Evergreen gatehouse (40) | 1863-07-02T00:00 | inferred | recorded: a headquarters entry: no figure, never drawn; one of the values of the headquarters’ arrival (C-001) |
| CL-012 | `us-aop-hq` | first | alternative about 04:00 (EPP) | record | Evergreen gatehouse (40) | 1863-07-02T04:00 | inferred | recorded: a headquarters entry: no figure, never drawn; the alternative value of C-001 (EPP, a weak source) |
| CL-017 | `us-hancock-acting` | night | Jul 1 night: Cemetery Hill / Cemetery Ridge | record | Cemetery Hill \| Cemetery Ridge | 1863-07-01T20:04 | inferred | recorded: two or more places are named and the cell does not say which part of the formation is at which; the places are recorded and no stop is scheduled; a person with no figure is not drawn |
| CL-023 | `us-1c` | key | 10:20-10:30 McPherson Ridge | stop | McPherson Ridge (430) | 1863-07-01T10:20 | inferred | drives a drawn unit |
| CL-024 | `us-1c` | key | 15:45-17:00 retreat through town to Cemetery Hill | stop | Cemetery Hill (250) | 1863-07-01T17:00 | inferred | drives a drawn unit |
| CL-026 | `us-1c` | night | Culp’s Hill (Wadsworth) | record | Culp’s Hill (490) | 1863-07-01T20:04 | inferred | recorded: the 1st Division’s own night cell gives the same position (CL of us-1c-1d night Jul 1) |
| CL-027 | `us-1c` | night | Cemetery Hill and Cemetery Ridge (Robinson) | record | Cemetery Hill \| Cemetery Ridge | 1863-07-01T20:04 | inferred | recorded: two or more places are named and the cell does not say which part of the formation is at which; the places are recorded and no stop is scheduled (Robinson’s 2nd Division) |
| CL-030 | `us-1c` | first | Jul 1: head about 10:00 on the Emmitsburg Road | approach | Emmitsburg Road (42) |  | inferred | drives a drawn unit |
| CL-031 | `us-1c` | first | vanguard (Wadsworth) at McPherson Ridge about 10:20 | stop | McPherson Ridge (430) | 1863-07-01T10:20 | inferred | drives a drawn unit |
| CL-034 | `us-1c-1d` | night | Culp’s Hill north slope | stop | Culp’s Hill (490) | 1863-07-01T20:04 | inferred | drives a drawn unit |
| CL-035 | `us-1c-1d` | night | Stevens’ Knoll to the summit | record | Stevens’ Knoll (200) | 1863-07-01T20:04 | inferred | recorded: the other end of the line that begins on the north slope of Culp’s Hill; which regiments held it is not printed, so no stop is scheduled |
| CL-036 | `us-1c-1d` | night | works begin in the evening (6th Wisconsin first) | activity | Culp’s Hill (490) | 1863-07-01T19:32 | plausible-procedural | drives a drawn unit |
| CL-037 | `us-1c-1d` | night | The 7th Indiana joins the I Corps right on Culp’s Hill about 16:00 | stop | Culp’s Hill (490) | 1863-07-01T16:00 | inferred | drives a drawn unit |
| CL-038 | `us-1c-1d` | night | same | stop | Culp’s Hill (490) | 1863-07-02T20:04 | inferred | drives a drawn unit |
| CL-039 | `us-1c-1d` | first | Jul 1 about 10:20 (vanguard) | record | McPherson Ridge (430) | 1863-07-01T10:20 | inferred | recorded: restates the vanguard entry PO-01 of the corps row |
| CL-041 | `us-1c-2d` | key | Jul 1 13:00-13:30 Baxter and Paul to Oak Ridge | stop | Oak Ridge (517) | 1863-07-01T13:00 | inferred | drives a drawn unit |
| CL-044 | `us-1c-2d` | night | 13th Massachusetts on Cemetery Ridge south of the Bryan farm digging a rifle pit | stop | Cemetery Ridge (561) | 1863-07-01T20:04 | inferred | drives a drawn unit |
| CL-050 | `us-1c-3d` | key | Jul 1 15:00-16:30 Biddle and Meredith overwhelmed on Seminary Ridge | stop | Seminary Ridge (496) | 1863-07-01T15:00 | inferred | drives a drawn unit |
| CL-052 | `us-1c-3d` | night | Seminary Ridge, then Cemetery Hill | stop | Cemetery Hill (250) | 1863-07-01T20:04 | inferred | drives a drawn unit |
| CL-053 | `us-1c-3d` | night | Jul 2: Stannard’s regiments join the Cemetery Ridge line about 18:00 | stop | Cemetery Ridge (561) | 1863-07-02T18:00 | inferred | drives a drawn unit |
| CL-055 | `us-1c-3d` | first | Stannard’s Vermont brigade: earliest documented sighting is the line on Jul 2 about 18:00 | record | Cemetery Ridge (561) | 1863-07-02T18:00 | inferred | recorded: restates the 18:00 Jul 2 entry of the night cell (Cemetery Ridge line) |
| CL-058 | `us-1c-art` | key | Jul 1 15:00-16:30 20-22 guns on Seminary Ridge | stop | Seminary Ridge (496) | 1863-07-01T15:00 | inferred | drives a drawn unit |
| CL-060 | `us-1c-art` | night | Jul 1 night: Cemetery Hill / Stevens’ Knoll area | record | Cemetery Hill \| Stevens’ Knoll | 1863-07-01T20:04 | inferred | recorded: two or more places are named and the cell does not say which part of the formation is at which; the places are recorded and no stop is scheduled |
| CL-061 | `us-1c-art` | night | Jul 2: Wainwright commands guns on East Cemetery Hill and Stevens’ Knoll | record | East Cemetery Hill \| Stevens’ Knoll | 1863-07-02T20:04 | inferred | recorded: two or more places are named and the cell does not say which part of the formation is at which; the places are recorded and no stop is scheduled |
| CL-064 | `us-2c` | key | Jul 2 about 16:00-18:00 Caldwell’s division sent to the Wheatfield | stop | The Wheatfield (315) | 1863-07-02T18:00 | inferred | drives a drawn unit |
| CL-066 | `us-2c` | key | Jul 3 Angle | record | The Angle (300) | 07-03 | inferred | recorded: date only, no clock (a stop needs a time) |
| CL-071 | `us-2c` | night | Jul 2: Cemetery Ridge, left | stop | Cemetery Ridge (561) | 1863-07-02T20:04 | inferred | drives a drawn unit |
| CL-072 | `us-2c` | night | Jul 3: Cemetery Ridge, the Angle | stop | Cemetery Ridge (561) | 1863-07-03T20:04 | inferred | drives a drawn unit |
| CL-073 | `us-2c` | first | Values conflict: about 22:30 Jul 1 (Wikipedia, Cemetery Ridge) | record | Cemetery Ridge (561) | 1863-07-01T22:30 | inferred | recorded: one of the conflicting values of the arrival (C-004); the arrival gate carries it as a scenario |
| CL-078 | `us-2c-1d` | key | 18:00 Wheatfield: Cross, Zook, Brooke, Kelly | stop | The Wheatfield (315) | 1863-07-02T18:00 | inferred | drives a drawn unit |
| CL-079 | `us-2c-1d` | night | Jul 2 night: Cemetery Ridge / Wheatfield area | record | Cemetery Ridge \| The Wheatfield | 1863-07-02T20:04 | inferred | recorded: two or more places are named and the cell does not say which part of the formation is at which; the places are recorded and no stop is scheduled |
| CL-081 | `us-2c-1d` | first | Jul 2 on the Cemetery Ridge | record | Cemetery Ridge (561) | 07-02 | inferred | recorded: date only, no clock: the arrival is the unit’s ledger gate |
| CL-082 | `us-2c-1d` | first | engaged in the Wheatfield about 17:30-18:00 | stop | The Wheatfield (315) | 1863-07-02T17:30 | inferred | drives a drawn unit |
| CL-086 | `us-2c-2d` | key | Jul 3 the Angle | record | The Angle (300) | 07-03 | inferred | recorded: date only, no clock (a stop needs a time) |
| CL-087 | `us-2c-2d` | night | Jul 2 night: Cemetery Ridge center | stop | Cemetery Ridge (561) | 1863-07-02T20:04 | inferred | drives a drawn unit |
| CL-092 | `us-2c-3d` | night | Jul 2: Carroll to East Cemetery Hill about 20:00 | stop | East Cemetery Hill (250) | 1863-07-02T20:00 | inferred | drives a drawn unit |
| CL-093 | `us-2c-3d` | night | 71st Pa (Webb’s brigade) sent to Culp’s Hill | stop | Culp’s Hill (490) | 1863-07-02T20:04 | inferred | drives a drawn unit |
| CL-102 | `us-3c` | key | Jul 2 about 12:00-14:00 advance to Emmitsburg Road | stop | Emmitsburg Road (42) | 1863-07-02T14:00 | inferred | drives a drawn unit |
| CL-105 | `us-3c` | night | Jul 1: Birney on Cemetery Ridge | record | Cemetery Ridge (561) | 1863-07-01T20:04 | inferred | recorded: restates the dusk entry PO-04 (Cemetery Ridge); the unit already stands there |
| CL-106 | `us-3c` | night | Humphreys on the Black Horse Tavern road | record | Black Horse Tavern Road (48) | 1863-07-01T20:04 | inferred | recorded: the 2nd Division has no road of approach that crosses the loaded ground, so it is not drawn |
| CL-107 | `us-3c` | night | Jul 2: Peach Orchard salient | record | The Peach Orchard (227) | 1863-07-02T20:04 | inferred | recorded: superseded: every division of the corps has its own night cell for Jul 2 |
| CL-109 | `us-3c` | first | Birney’s division: dusk Jul 1 (about 20:00) on Cemetery Ridge via the Emmitsburg Road (SS1, W-CEMR) | approach | Emmitsburg Road (42) |  | inferred | drives a drawn unit |
| CL-110 | `us-3c` | first | alternative Jul 2 about 07:00 at the Little Round Top area (EPP) | record | Little Round Top (270) | 1863-07-02T07:00 | inferred | recorded: the alternative value of the arrival (EPP, a weak source); recorded, not scheduled |
| CL-112 | `us-3c-1d` | key | Jul 2 11:00 Berdan to Pitzer’s Woods | stop | Pitzer’s Woods (409) | 1863-07-02T11:00 | inferred | drives a drawn unit |
| CL-113 | `us-3c-1d` | key | 16:30 Devil’s Den | stop | Devil’s Den (300) | 1863-07-02T16:30 | inferred | drives a drawn unit |
| CL-114 | `us-3c-1d` | key | 17:30-18:00 Peach Orchard | stop | The Peach Orchard (227) | 1863-07-02T17:30 | inferred | drives a drawn unit |
| CL-115 | `us-3c-1d` | night | Jul 2 night: Houck’s Ridge / Plum Run / Wheatfield area fallen back | record | Houck’s Ridge \| The Wheatfield | 1863-07-02T20:04 | inferred | recorded: two or more places are named and the cell does not say which part of the formation is at which; the places are recorded and no stop is scheduled; Plum Run is a long stream and is not entered as a place |
| CL-116 | `us-3c-1d` | first | Dusk Jul 1 (about 20:00) | stop | Cemetery Ridge (561) | 1863-07-01T20:00 | inferred | drives a drawn unit |
| CL-118 | `us-3c-2d` | key | Jul 2 about 12:00 advance 400-500 yards | activity |  | 1863-07-02T12:00 | plausible-procedural | drives a drawn unit |
| CL-122 | `us-3c-2d` | night | arrives on Cemetery Ridge | record | Cemetery Ridge (561) | 07-02 | inferred | recorded: no clock: the arrival is the unit’s ledger gate (00:00-02:00 Jul 2) |
| CL-123 | `us-3c-2d` | night | Jul 2: Emmitsburg Road | stop | Emmitsburg Road (42) | 1863-07-02T20:04 | inferred | drives a drawn unit |
| CL-124 | `us-3c-2d` | first | Values conflict: about 00:00 Jul 2 (EPP) vs about 02:00 Jul 2 (SS1) after counter-marching at about 21:00 on the Black Horse Tavern road | approach | Black Horse Tavern Road (48) |  | inferred | drives a drawn unit |
| CL-126 | `us-3c-art` | key | Smith 14:00 four guns above Devil’s Den | stop | Devil’s Den (300) | 1863-07-02T14:00 | inferred | drives a drawn unit |
| CL-129 | `us-3c-art` | first | Smith’s battery at Devil’s Den 09:00 Jul 2 | stop | Devil’s Den (300) | 1863-07-02T09:00 | inferred | drives a drawn unit |
| CL-133 | `us-5c` | key | 16:30 Vincent on Little Round Top | stop | Little Round Top (270) | 1863-07-02T16:30 | inferred | drives a drawn unit |
| CL-135 | `us-5c` | key | 18:00-18:30 Ayres in Wheatfield | stop | The Wheatfield (315) | 1863-07-02T18:00 | inferred | drives a drawn unit |
| CL-137 | `us-5c` | key | 21:00 20th Maine on Round Top | stop | Big Round Top (692) | 1863-07-02T21:00 | inferred | drives a drawn unit |
| CL-139 | `us-5c` | night | Jul 1 night: night march from Hanover (20th Maine) | approach | Hanover Road (57) |  | inferred | drives a drawn unit |
| CL-140 | `us-5c` | night | Jul 2: Power’s Hill reserve about 08:00 | stop | Powers’ Hill (250) | 1863-07-02T08:00 | inferred | drives a drawn unit |
| CL-141 | `us-5c` | night | Little Round Top | stop | Little Round Top (270) | 1863-07-02T20:04 | inferred | drives a drawn unit |
| CL-147 | `us-5c-3d` | key | evening wall-building on Little Round Top | activity | Little Round Top (270) | 1863-07-02T19:32 | plausible-procedural | drives a drawn unit |
| CL-148 | `us-5c-3d` | night | Jul 2 night: Little Round Top / Round Top | record | Little Round Top \| Big Round Top | 1863-07-02T20:04 | inferred | recorded: two or more places are named and the cell does not say which part of the formation is at which; the places are recorded and no stop is scheduled |
| CL-150 | `us-5c-3d` | first | McCandless counterattacks about 19:00-19:30 | activity |  | 1863-07-02T19:00 | plausible-procedural | drives a drawn unit |
| CL-152 | `us-6c` | key | Jul 2 about 19:00 Nevin’s brigade counterattacks with Crawford | activity |  | 1863-07-02T19:00 | plausible-procedural | drives a drawn unit |
| CL-158 | `us-11c` | key | Jul 1 14:00 Steinwehr on Cemetery Hill | stop | Cemetery Hill (250) | 1863-07-01T14:00 | inferred | drives a drawn unit |
| CL-160 | `us-11c` | key | Jul 2 19:30 Ames’s division defends East Cemetery Hill | stop | East Cemetery Hill (250) | 1863-07-02T19:30 | inferred | drives a drawn unit |
| CL-163 | `us-11c` | night | Jul 1: Cemetery Hill and Oak Ridge | record | Cemetery Hill \| Oak Ridge | 1863-07-01T20:04 | inferred | recorded: two or more places are named and the cell does not say which part of the formation is at which; the places are recorded and no stop is scheduled |
| CL-164 | `us-11c` | night | Jul 2: Cemetery Hill / East Cemetery Hill | record | Cemetery Hill \| East Cemetery Hill | 1863-07-02T20:04 | inferred | recorded: two or more places are named and the cell does not say which part of the formation is at which; the places are recorded and no stop is scheduled |
| CL-169 | `us-12c` | key | Jul 2 06:00-10:00 works | activity |  | 1863-07-02T06:00 | plausible-procedural | drives a drawn unit |
| CL-171 | `us-12c` | key | 23:00 Ruger at Spangler’s Spring | stop | Spangler’s Spring (111) | 1863-07-02T23:00 | inferred | drives a drawn unit |
| CL-172 | `us-12c` | key | Jul 3 04:30 artillery opens | activity |  | 1863-07-03T04:30 | plausible-procedural | drives a drawn unit |
| CL-175 | `us-12c` | night | Jul 1: bivouac nearer the Baltimore Pike | stop | Baltimore Pike (42) | 1863-07-01T20:04 | inferred | drives a drawn unit |
| CL-176 | `us-12c` | night | Jul 2: Culp’s Hill works from about 06:00 | stop | Culp’s Hill (490) | 1863-07-02T06:00 | inferred | drives a drawn unit |
| CL-179 | `us-12c` | first | Jul 1 evening on Culp’s Hill: 123rd NY works begin Jul 1 | stop | Culp’s Hill (490) | 1863-07-01T19:32 | inferred | drives a drawn unit |
| CL-180 | `us-12c` | first | Williams’s division approaches 17:30, withdraws to the Baltimore Pike for the night | stop | Baltimore Pike (42) | 1863-07-01T20:04 | inferred | drives a drawn unit |
| CL-181 | `us-12c` | first | Geary on Cemetery Ridge 17:30 | stop | Cemetery Ridge (561) | 1863-07-01T17:30 | inferred | drives a drawn unit |
| CL-182 | `us-12c` | first | Lockwood’s brigade arrives Jul 2 about 08:00 from Baltimore | approach | Baltimore Pike (42) |  | inferred | drives a drawn unit |
| CL-188 | `us-cav-1d` | key | about 15:00 on the Emmitsburg Road | approach | Emmitsburg Road (42) |  | inferred | drives a drawn unit |
| CL-189 | `us-cav-1d` | night | Jun 30: camp about 400 yards east of McPherson Ridge | record | McPherson Ridge (430) | 1863-06-30T20:04 | inferred | recorded: Gamble’s and Devin’s brigades have no road of approach; the 400 yards (366 m) lie inside the ridge’s sigma |
| CL-193 | `us-cav-1d` | first | Jun 30 about 11:00 enters Gettysburg | record | Gettysburg (the borough) (544) | 1863-06-30T11:00 | inferred | recorded: the division has no road of approach, so it is not drawn |
| CL-196 | `us-cav-2d` | key | Jul 2 15:00 Brinkerhoff Ridge | stop | Brinkerhoff’s Ridge (350) | 1863-07-02T15:00 | inferred | drives a drawn unit |
| CL-198 | `us-cav-2d` | key | Jul 3 East Cavalry Field | record | East Cavalry Field (1111) | 07-03 | inferred | recorded: date only, no clock (a stop needs a time) |
| CL-199 | `us-cav-2d` | night | Jul 2 night: Baltimore Pike, 1 mile east of Rock Creek (after 22:00) | stop | Baltimore Pike, 1 mile east of Rock Creek (400) | 1863-07-02T22:00 | inferred | drives a drawn unit |
| CL-203 | `us-cav-3d` | key | 15:00 attacks | activity |  | 1863-07-03T15:00 | plausible-procedural | drives no drawn unit |
| CL-204 | `us-cav-3d` | key | Custer redirected to Gregg for East Cavalry Field | record | East Cavalry Field (1111) | 07-03 | inferred | recorded: date only (Jul 3), no clock (a stop needs a time) |
| CL-208 | `us-cav-3d` | first | Jul 2 about 16:30 at Hunterstown (from where: gap) | record | Hunterstown (500) | 1863-07-02T16:30 | inferred | recorded: the division has no road of approach (“from where: gap”), so it is not drawn |
| CL-211 | `us-art-reserve` | key | Jul 2 16:00 McGilvery with five batteries to the Wheatfield Road | stop | Wheatfield Road (47) | 1863-07-02T16:00 | inferred | drives a drawn unit |
| CL-215 | `us-art-reserve` | night | Jul 2: camped on the Spangler farm (106 guns, about 2,300 men) | stop | Spangler farm (80) | 1863-07-02T20:04 | inferred | drives a drawn unit |
| CL-223 | `cs-anv-hq` | night | Jul 1 night: Thompson house, Seminary Ridge | record | Thompson house (40) | 1863-07-01T20:04 | inferred | recorded: a headquarters entry: no figure, never drawn |
| CL-224 | `cs-anv-hq` | night | Jul 2 night: same area, no council of war | record | Thompson house (40) | 1863-07-02T20:04 | inferred | recorded: a headquarters entry: no figure, never drawn |
| CL-226 | `cs-anv-hq` | first | Jul 1: Herr Ridge about 13:30 (SS1) or about 14:30 (W-D1) | record | Herr Ridge (400) | 1863-07-01T13:30 | inferred | recorded: a headquarters entry: no figure, never drawn; two conflicting times (13:30 / 14:30), the first is carried |
| CL-229 | `cs-1c` | key | Jul 2 noon column departs Herr’s Ridge | stop | Herr Ridge (400) | 1863-07-02T12:00 | inferred | drives a drawn unit |
| CL-230 | `cs-1c` | key | 13:30-15:00 countermarch | activity |  | 1863-07-02T13:30 | plausible-procedural | drives a drawn unit |
| CL-231 | `cs-1c` | key | 15:00 McLaws deploys | formation |  | 1863-07-02T15:00 | inferred | recorded: applied as a formation event (contract 1.3) to every DRAWN unit under the named formation (src/history/real.mjs); whether any unit under it is drawn is reported in HISTORY-LAYER-NOTES.md |
| CL-232 | `cs-1c` | key | 15:30 Hood in Biesecker’s Woods | record | Biesecker’s Woods (150) | 1863-07-02T15:30 | inferred | recorded: restated by the division’s own row (Hood, key positions); the division row drives the stop |
| CL-233 | `cs-1c` | key | 16:30 attack | activity |  | 1863-07-02T16:30 | plausible-procedural | drives a drawn unit |
| CL-236 | `cs-1c` | night | Jul 2 night: Warfield Ridge / Peach Orchard | record | Warfield Ridge \| The Peach Orchard | 1863-07-02T20:04 | inferred | recorded: two or more places are named and the cell does not say which part of the formation is at which; the places are recorded and no stop is scheduled |
| CL-239 | `cs-1c` | first | Jul 2: divisions halt west of town overnight (McLaws about 00:00, Hood about 01:00) | activity |  | 07-02 | plausible-procedural | drives a drawn unit |
| CL-240 | `cs-1c` | first | Hood behind Seminary Ridge 06:30 (range 05:30-07:30) | record | Seminary Ridge (496) | 1863-07-02T06:30 | inferred | recorded: restated by the division’s own row (Hood, first on field); the division row drives the stop |
| CL-241 | `cs-1c` | first | McLaws 08:00 (range 08:00-08:30) | record | Seminary Ridge (496) | 1863-07-02T08:00 | inferred | recorded: restated by the division’s own row (McLaws, first on field); the division row drives the stop |
| CL-243 | `cs-1c-mclaws` | key | Jul 2 15:00 Millerstown Road / Warfield Ridge | record | Millerstown Road \| Warfield Ridge | 1863-07-02T15:00 | inferred | recorded: two or more places are named and the cell does not say which part of the formation is at which; the places are recorded and no stop is scheduled (a road and a ridge) |
| CL-244 | `cs-1c-mclaws` | key | 17:00 Kershaw steps off | activity |  | 1863-07-02T17:00 | plausible-procedural | drives a drawn unit |
| CL-246 | `cs-1c-mclaws` | night | halts about midnight (Marsh Creek about 4 miles out per EPP | activity |  | 1863-07-02T00:00 | plausible-procedural | drives a drawn unit |
| CL-248 | `cs-1c-mclaws` | first | 08:00 Jul 2 behind Seminary Ridge | stop | Seminary Ridge (496) | 1863-07-02T08:00 | inferred | drives a drawn unit |
| CL-250 | `cs-1c-hood` | key | Jul 2 15:30 Biesecker’s Woods | stop | Biesecker’s Woods (150) | 1863-07-02T15:30 | inferred | drives a drawn unit |
| CL-251 | `cs-1c-hood` | key | 16:30 step-off | activity |  | 1863-07-02T16:30 | plausible-procedural | drives a drawn unit |
| CL-252 | `cs-1c-hood` | key | Jul 3 Law commands the division at the base of Big Round Top | record | Big Round Top (692) | 07-03 | inferred | recorded: date only, no clock (a stop needs a time) |
| CL-254 | `cs-1c-hood` | night | resumes 03:30 | activity |  | 1863-07-02T03:30 | plausible-procedural | drives a drawn unit |
| CL-255 | `cs-1c-hood` | night | Jul 2 night: Round Top / Devil’s Den and Plum Run | record | Big Round Top \| Devil’s Den | 1863-07-02T20:04 | inferred | recorded: two or more places are named and the cell does not say which part of the formation is at which; the places are recorded and no stop is scheduled; Plum Run is a long stream and is not entered as a place |
| CL-257 | `cs-1c-hood` | first | 06:30 Jul 2 (range 05:30-07:30) behind Seminary Ridge | stop | Seminary Ridge (496) | 1863-07-02T06:30 | inferred | drives a drawn unit |
| CL-258 | `cs-1c-hood` | first | Law’s brigade rejoins about noon after a march that began about 03:00 (EPP puts the start at 06:00) | activity |  | 1863-07-02T03:00 | plausible-procedural | drives a drawn unit |
| CL-261 | `cs-1c-pickett` | key | about 14:00-15:00 step-off | activity |  | 1863-07-03T14:00 | plausible-procedural | drives a drawn unit |
| CL-264 | `cs-1c-pickett` | night | Jul 2 night: Seminary Ridge area (disputed) | record | Seminary Ridge (496) | 1863-07-02T20:04 | inferred | recorded: disputed: the row’s arrival is UNRESOLVED (C-021); recorded, not scheduled |
| CL-271 | `cs-1c-art` | key | Jul 2 16:00 Huger’s four batteries and Cabell open | activity |  | 1863-07-02T16:00 | plausible-procedural | drives a drawn unit |
| CL-279 | `cs-2c` | key | 19:00-20:00 Culp’s Hill attack | record | Culp’s Hill (490) | 1863-07-02T19:00 | inferred | recorded: corps-level summary: the divisions’ own rows name which division is at which place (Johnson at Culp’s Hill) |
| CL-280 | `cs-2c` | key | 19:30 East Cemetery Hill | record | East Cemetery Hill (250) | 1863-07-02T19:30 | inferred | recorded: corps-level summary: the divisions’ own rows name which division is at which place (Early at East Cemetery Hill) |
| CL-281 | `cs-2c` | night | town and Oak Ridge approaches (Rodes | record | the town \| Oak Ridge | 1863-07-01T20:04 | inferred | recorded: the heading of the list that follows: two places, and the brigades are named below |
| CL-282 | `cs-2c` | night | Ramseur, Doles halt in the streets | stop | the streets (544) | 1863-07-01T20:04 | inferred | drives a drawn unit |
| CL-283 | `cs-2c` | night | O’Neal rests beyond the railroad) | activity |  | 1863-07-01T20:04 | plausible-procedural | drives a drawn unit |
| CL-288 | `cs-2c-early` | key | Jul 1 15:00-16:00 Barlow’s Knoll | stop | Barlow’s Knoll (200) | 1863-07-01T15:00 | inferred | drives a drawn unit |
| CL-289 | `cs-2c-early` | key | Jul 2 19:30 Hays and Avery on East Cemetery Hill | stop | East Cemetery Hill (250) | 1863-07-02T19:30 | inferred | drives a drawn unit |
| CL-290 | `cs-2c-early` | key | Smith’s brigade detached as flank guard on the Hunterstown road about 16:30 | stop | Hunterstown Road (42) | 1863-07-02T16:30 | inferred | drives a drawn unit |
| CL-291 | `cs-2c-early` | night | Jun 26: Gettysburg | record | Gettysburg (the borough) (544) | 1863-06-26T20:04 | inferred | recorded: falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground (the division’s gate is Jul 1) |
| CL-295 | `cs-2c-early` | night | Jul 1: town | stop | the town (544) | 1863-07-01T20:04 | inferred | drives a drawn unit |
| CL-297 | `cs-2c-early` | first | Jun 26 occupies Gettysburg | record | Gettysburg (the borough) (544) | 06-26 | inferred | recorded: falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground (pre-battle: not a gate value) |
| CL-298 | `cs-2c-early` | first | Jul 1 about 15:00-16:00 Barlow’s Knoll | record | Barlow’s Knoll (200) | 1863-07-01T15:00 | inferred | recorded: restates the key-position entry for Barlow’s Knoll |
| CL-300 | `cs-2c-rodes` | key | Jul 1 14:00 attack | activity |  | 1863-07-01T14:00 | plausible-procedural | drives a drawn unit |
| CL-301 | `cs-2c-rodes` | key | Jul 2 21:00 Ramseur halts | activity |  | 1863-07-02T21:00 | plausible-procedural | drives a drawn unit |
| CL-304 | `cs-2c-rodes` | night | Jun 30: Heidlersburg (22+ miles) | record | Heidlersburg (500) | 1863-06-30T20:04 | inferred | recorded: falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground (the division’s gate is Jul 1) |
| CL-305 | `cs-2c-rodes` | night | Jul 1 night: town streets | stop | the streets (544) | 1863-07-01T20:04 | inferred | drives a drawn unit |
| CL-306 | `cs-2c-rodes` | night | Jul 2: deploys late about 21:00 near East Cemetery Hill | stop | East Cemetery Hill (250) | 1863-07-02T21:00 | inferred | drives a drawn unit: the stop part drives; the formation part (deploys into line) is applied as a formation event (contract 1.3) to every DRAWN unit under the named formation; whether any is drawn is reported in HISTORY-LAYER-NOTES.md |
| CL-307 | `cs-2c-rodes` | first | Jul 1 about 12:30 on Oak Hill (Carter first) | stop | Oak Hill (250) | 1863-07-01T12:30 | inferred | drives a drawn unit |
| CL-314 | `cs-2c-johnson` | night | Jul 2 night: lower Culp’s Hill (Steuart in the lower works) | stop | Culp’s Hill (490) | 1863-07-02T20:04 | inferred | drives a drawn unit |
| CL-318 | `cs-3c` | key | Jul 1 05:00 Heth marches | activity |  | 1863-07-01T05:00 | plausible-procedural | drives a drawn unit |
| CL-319 | `cs-3c` | key | about 16:00 Pender’s assault | activity |  | 1863-07-01T16:00 | plausible-procedural | drives a drawn unit |
| CL-321 | `cs-3c` | night | Cashtown (Heth), Pender follows | record | Cashtown (500) | 1863-06-30T20:04 | inferred | recorded: falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground (the divisions’ gate is Jul 1) |
| CL-322 | `cs-3c` | night | Jul 1 night: two divisions stop at the front, Anderson about 2 miles behind | activity |  | 1863-07-01T20:04 | plausible-procedural | drives a drawn unit |
| CL-323 | `cs-3c` | first | Jul 1: Heth at Cashtown | record | Cashtown (500) | 07-01 | inferred | recorded: date only: Heth at Cashtown before the 05:00 march (the unit’s gate is 07:30 Jul 1) |
| CL-326 | `cs-3c-heth` | key | Jul 1 10:20 Herr Ridge | stop | Herr Ridge (400) | 1863-07-01T10:20 | inferred | drives a drawn unit |
| CL-328 | `cs-3c-heth` | key | 14:30 renewed attack | activity |  | 1863-07-01T14:30 | plausible-procedural | drives a drawn unit |
| CL-329 | `cs-3c-heth` | key | Jul 3 Pettigrew’s division in the charge | activity |  | 07-03 | plausible-procedural | recorded: date only, no clock: an activity needs a time |
| CL-330 | `cs-3c-heth` | night | Jun 29-30: Cashtown | record | Cashtown (500) | 1863-06-30T20:04 | inferred | recorded: falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground (the division’s gate is Jul 1) |
| CL-332 | `cs-3c-heth` | first | Jun 29 Cashtown | record | Cashtown (500) | 06-29 | inferred | recorded: falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground (pre-battle: not a gate value) |
| CL-336 | `cs-3c-pender` | key | Jul 1 16:00 assault | activity |  | 1863-07-01T16:00 | plausible-procedural | drives a drawn unit |
| CL-337 | `cs-3c-pender` | key | Jul 3 Trimble and Lane/Lowrance in the charge | activity |  | 07-03 | plausible-procedural | recorded: date only, no clock: an activity needs a time |
| CL-338 | `cs-3c-pender` | night | Jun 30: follows Heth to Cashtown | record | Cashtown (500) | 1863-06-30T20:04 | inferred | recorded: falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground (the division’s gate is Jul 1) |
| CL-342 | `cs-3c-anderson` | key | Jul 2 noon-18:00 Wilcox, Lang, Wright attack | activity |  | 1863-07-02T12:00 | plausible-procedural | drives a drawn unit |
| CL-343 | `cs-3c-anderson` | key | Posey and Mahone do not advance | activity |  | 1863-07-02T12:00 | plausible-procedural | drives a drawn unit |
| CL-346 | `cs-3c-anderson` | first | Jul 1 evening: bivouac about 2 miles behind the front | activity |  | 1863-07-01T19:32 | plausible-procedural | drives a drawn unit |
| CL-347 | `cs-3c-anderson` | first | Jul 2 noon: reaches Seminary Ridge north of Pitzer’s Woods (SS2) / early afternoon (W-D2) | stop | Seminary Ridge (496) | 1863-07-02T12:00 | inferred | drives a drawn unit |
| CL-358 | `cs-cav-hampton` | key | Jul 3 East Cavalry Field | record | East Cavalry Field (1111) | 07-03 | inferred | recorded: date only, no clock (a stop needs a time) |
| CL-359 | `cs-cav-hampton` | night | Jul 2 night: camped north of Gettysburg | activity |  | 1863-07-02T20:04 | plausible-procedural | drives a drawn unit |
| CL-360 | `cs-cav-hampton` | first | After Hunterstown on Jul 2: arrives at dusk to night (rear guard at Hunterstown, Jul 2 about 16:30 to dark) | approach | Hunterstown Road (42) |  | inferred | drives a drawn unit |
| CL-362 | `cs-cav-flee-chambliss` | key | Jul 3 ECF 11:00 Cress Ridge | stop | East Cavalry Field (1111) | 1863-07-03T11:00 | inferred | drives no drawn unit |
| CL-366 | `cs-cav-jenkins` | key | Jul 3 ECF, out of ammunition | record | East Cavalry Field (1111) | 07-03 | inferred | recorded: date only, no clock (a stop needs a time) |

### Unresolved clauses

| id | row | cell | clause as printed | reason |
|---|---|---|---|---|
| CL-001 | `us-aop-hq` | key | Jul 2 about 10:00 cancels Slocum’s Culp’s Hill attack | a command decision or message, not the position of a unit; a headquarters entry: no figure, never drawn |
| CL-002 | `us-aop-hq` | key | about 15:00 telegram to Halleck | a command decision or message, not the position of a unit; a headquarters entry: no figure, never drawn |
| CL-003 | `us-aop-hq` | key | 16:00 sends Warren to Little Round Top | Warren is a staff officer of the headquarters; the roster has no unit for him |
| CL-004 | `us-aop-hq` | key | 20:00 telegram “repulsed at all points” | a command decision or message, not the position of a unit; a headquarters entry: no figure, never drawn |
| CL-005 | `us-aop-hq` | night | Jun 28: Frederick | “Frederick” has no coordinate in any repository file: it is not in the gazetteer; a headquarters entry: no figure, never drawn |
| CL-006 | `us-aop-hq` | night | Jun 30: Taneytown (Pipe Creek Circular written late Jun 30) | “Taneytown” has no coordinate in any repository file: it is not in the gazetteer; a headquarters entry: no figure, never drawn |
| CL-007 | `us-aop-hq` | night | Jul 1: Taneytown, then to Cemetery Hill after midnight | “Taneytown” has no coordinate in any repository file: it is not in the gazetteer; a headquarters entry: no figure, never drawn |
| CL-013 | `us-aop-hq` | left | Jul 5 morning learns Lee has left | a command decision or message, not the position of a unit; a headquarters entry: no figure, never drawn |
| CL-014 | `us-aop-hq` | left | pursuit of corps by corps is a gap except Sedgwick, Slocum, Howard, French | the ledger prints a gap for the pursuit (except four corps commanders) and names no place or time |
| CL-015 | `us-hancock-acting` | key | 17:25 dispatch to Meade (“we can fight here”) | a command decision or message, not the position of a unit; a person with no figure is not drawn |
| CL-016 | `us-hancock-acting` | key | about 18:00 leaves to report to Meade | the clause names no place; a person with no figure is not drawn |
| CL-018 | `us-hancock-acting` | first | Cemetery Hill: about 15:00 (his report), before 16:00, about 16:00 (SS1, WHN-HAN), about 16:30 (CWN-HAN) | four conflicting times and the cell prints no date; a person with no figure is not drawn |
| CL-019 | `us-hancock-acting` | first | no troops of his own | a statement, not a position |
| CL-020 | `us-hancock-acting` | left | Rejoins II Corps Jul 2 | a command assignment with no place; a person with no figure is not drawn |
| CL-021 | `us-1c` | key | Jul 1 04:00 Reynolds’ orders at Moritz’s Tavern | “Moritz’s Tavern” has no coordinate in any repository file: it is not in the gazetteer; also before the corps’ gate (head about 10:00) |
| CL-022 | `us-1c` | key | 08:00 Wadsworth marches north | a direction, no place; before the corps’ gate (head about 10:00) |
| CL-025 | `us-1c` | night | Jun 29-30: bivouac along Marsh Creek (exact night unclear) | Marsh Creek is a long stream (the gazetteer’s is 4.4 km wide) and the night is unclear; before the corps’ gate |
| CL-028 | `us-1c` | night | same, then Robinson’s division moves left about 19:00 | “same” repeats the Jul 1 places; “left” is a direction, no place |
| CL-029 | `us-1c` | night | Jul 3: gap | the ledger prints a gap |
| CL-032 | `us-1c` | left | Gap (after Jul 5) | the ledger prints a gap |
| CL-033 | `us-1c-1d` | key | Jul 2 about 20:00-22:00 three regiments to reinforce Greene (which three: not named in the notes) | the ledger does not name the three regiments, and names no place for Greene’s brigade here |
| CL-040 | `us-1c-1d` | left | Gap | the ledger prints a gap |
| CL-042 | `us-1c-2d` | key | Jul 2 about 19:00 division hurried left, Coulter and Baxter hold a new line by 20:00-21:00 | “left” is a direction and no place is named for the new line; Coulter is not a unit of the roster |
| CL-043 | `us-1c-2d` | night | Jul 1: Coulter breastworks behind Cemetery Hill | Coulter is not a unit of the roster (B.3 lists Paul and Baxter), so no unit is given this place |
| CL-045 | `us-1c-2d` | night | Jul 2: Coulter moves left about 19:00 to support III Corps, Emmitsburg Road about 22:00 | Coulter is not a unit of the roster, so no unit is given this place |
| CL-046 | `us-1c-2d` | first | Jul 1: Coulter massed near the railroad embankment about 11:00 (OR-COULTER) | Coulter is not a unit of the roster; “massed” would be a formation (column_mass) for a unit that is not in the roster |
| CL-047 | `us-1c-2d` | first | Doubleday places Robinson’s arrival in the afternoon | “afternoon” has no clock in the ledger |
| CL-048 | `us-1c-2d` | first | late morning to early afternoon (W-D1) | no clock; a value of the unit’s arrival (an arrival conflict) that the arrival gate carries; this clause names no place |
| CL-049 | `us-1c-2d` | left | Gap | the ledger prints a gap |
| CL-051 | `us-1c-3d` | key | Jul 3 Stannard flanks Pickett | no place named for the flank (Pickett’s line is not placed), date only |
| CL-054 | `us-1c-3d` | first | Jul 1 late morning to early afternoon (Biddle, Stone) | no clock; a value of the unit’s arrival (an arrival conflict) that the arrival gate carries; this clause names no place |
| CL-056 | `us-1c-3d` | first | earlier arrival not in the notes (gap) | the ledger prints a gap |
| CL-057 | `us-1c-3d` | left | Gap | the ledger prints a gap |
| CL-059 | `us-1c-art` | key | Jul 2 lunettes by about 16:00 | a work to be finished, not the place of a battery; the lunettes have no mapped place |
| CL-062 | `us-1c-art` | first | Jul 1 late morning (Hall replaces Calef about 10:00-10:45) | no place named; a relief of one battery by another |
| CL-063 | `us-1c-art` | left | Gap | the ledger prints a gap |
| CL-065 | `us-2c` | key | Jul 2 evening 1st Minnesota, Willard, Carroll | the clause names no place |
| CL-067 | `us-2c` | night | Jun 29: gap | the ledger prints a gap |
| CL-068 | `us-2c` | night | Jun 30: Taneytown | “Taneytown” has no coordinate in any repository file: it is not in the gazetteer; before the corps’ gate |
| CL-069 | `us-2c` | night | Jun 30 night/Uniontown: not confirmed | the ledger says “not confirmed”; Uniontown has no coordinate in the repository |
| CL-070 | `us-2c` | night | Jul 1: gap | the ledger prints a gap |
| CL-074 | `us-2c` | first | dawn Jul 2 (“pre-dawn/dawn”, 13th Mass) | a value of the unit’s arrival (an arrival conflict) that the arrival gate carries; this clause names no place |
| CL-075 | `us-2c` | first | about 06:00 (EPP) | a value of the unit’s arrival (an arrival conflict) that the arrival gate carries; this clause names no place |
| CL-076 | `us-2c` | first | about 07:00 (OR 27/1 p.369 via Freeman). see the gate table below | a value of the unit’s arrival (an arrival conflict) that the arrival gate carries; this clause names no place |
| CL-077 | `us-2c` | left | Gap (after Jul 5) | the ledger prints a gap |
| CL-080 | `us-2c-1d` | night | Granite Schoolhouse is the division hospital Jul 2-3 | a hospital, not a unit; the Granite Schoolhouse record in the repository has no geometry |
| CL-083 | `us-2c-1d` | left | Hospital moves after Jul 3 overshots | unparsed text in the ledger (“overshots” is unexplained); a hospital, not a unit |
| CL-084 | `us-2c-2d` | key | 18:30-19:00 1st Minnesota vs Wilcox | the clause names no place |
| CL-085 | `us-2c-2d` | key | Cushing’s battery (4th US A) attached to Webb engages Wright | the clause names no place |
| CL-088 | `us-2c-2d` | first | Jul 2 about 06:00 (EPP; per EPP the arriving II Corps unit is Gibbon’s division) | a value of the unit’s arrival (an arrival conflict) that the arrival gate carries; this clause names no place |
| CL-089 | `us-2c-2d` | left | Gap | the ledger prints a gap |
| CL-090 | `us-2c-3d` | key | 18:00 Willard at Plum Run west vs Barksdale | Plum Run is a long stream (the gazetteer’s is 4.6 km wide), the cell does not say which stretch; the cell prints no date |
| CL-091 | `us-2c-3d` | key | 20:00 Carroll retakes Ricketts’ guns | the clause names no place |
| CL-094 | `us-2c-3d` | night | Bliss farm held alternately Jul 2 | held alternately by both armies; no unit and no time named |
| CL-095 | `us-2c-3d` | first | Jul 2 (time unstated; presumably with the corps) | no time and no place |
| CL-096 | `us-2c-3d` | left | Gap | the ledger prints a gap |
| CL-097 | `us-2c-art` | key | Jul 2 Cushing with Webb | the clause names no place |
| CL-098 | `us-2c-art` | key | Jul 3 cannonade | the clause names no place |
| CL-099 | `us-2c-art` | night | Gap | the ledger prints a gap |
| CL-100 | `us-2c-art` | first | Gap | the ledger prints a gap |
| CL-101 | `us-2c-art` | left | Gap | the ledger prints a gap |
| CL-103 | `us-3c` | key | 18:00 collapse | the clause names no place |
| CL-104 | `us-3c` | night | Jun 29-30: gap (III Corps near Bridgeport/Emmitsburg area is unconfirmed) | the ledger prints a gap |
| CL-108 | `us-3c` | night | Jul 3: remnants | the clause names no place |
| CL-111 | `us-3c` | left | Jul 7 French replaces Sickles in III Corps command | a command change, not a movement |
| CL-117 | `us-3c-1d` | left | Gap | the ledger prints a gap |
| CL-119 | `us-3c-2d` | key | 15:00 ordered toward Little Round Top then recalled | ordered and then recalled: the unit does not arrive; a direction, not a position |
| CL-120 | `us-3c-2d` | key | 18:00 collapse with about 45% losses | the clause names no place |
| CL-121 | `us-3c-2d` | night | Jul 1 night: marching | falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground (gate 00:00-02:00 Jul 2) |
| CL-125 | `us-3c-2d` | left | Gap | the ledger prints a gap |
| CL-127 | `us-3c-art` | key | Bucklyn overrun about 17:30-18:00 | the clause names no place |
| CL-128 | `us-3c-art` | night | Calef’s A, 2nd US (cavalry horse artillery) is near the Third Corps at night on Jul 1 | “near the Third Corps” is not a place; Calef’s battery is not a battery of the corps in the roster |
| CL-130 | `us-3c-art` | first | others gap | the ledger prints a gap |
| CL-131 | `us-3c-art` | left | Gap | the ledger prints a gap |
| CL-132 | `us-5c` | key | Jul 2 16:00 ordered forward | the clause names no place |
| CL-134 | `us-5c` | key | 17:00 Weed’s brigade | the clause names no place |
| CL-136 | `us-5c` | key | dusk Fisher’s brigade | the clause names no place |
| CL-138 | `us-5c` | night | Jun 29-30: Union Mills area unconfirmed (gap) | the ledger prints a gap |
| CL-142 | `us-5c` | night | Jul 3: Taneytown Road hospital, 3rd Div hospital near Two Taverns | hospitals, not units |
| CL-143 | `us-5c` | first | Values conflict: about 05:00 Jul 2 (EPP) vs about 08:00 (OR 27/1 p.592 via Freeman) | a value of the unit’s arrival (an arrival conflict) that the arrival gate carries; this clause names no place |
| CL-144 | `us-5c` | first | lead regiments about 07:00 (20th Maine on the heights southeast of town, from Chamberlain) | “the heights southeast of town” is not a place of the gazetteer; a value of the unit’s arrival (an arrival conflict) that the arrival gate carries; this clause names no place |
| CL-145 | `us-5c` | left | Gap | the ledger prints a gap |
| CL-146 | `us-5c-3d` | key | 19:00-19:30 counterattack toward the Wheatfield | a direction (“toward”), not a position; the McCandless counterattack is the activity clause of the first-on-field cell |
| CL-149 | `us-5c-3d` | first | Gap (Fisher’s brigade is on the field at dusk Jul 2, two regiments near the summit by midnight | the ledger prints a gap for the arrival; “the summit” is not named |
| CL-151 | `us-5c-3d` | left | Gap | the ledger prints a gap |
| CL-153 | `us-6c` | key | hospital north of the Trostle house near Goulden Road | a hospital, not a unit; “Goulden Road” has no coordinate in any repository file: it is not in the gazetteer |
| CL-154 | `us-6c` | night | Jun 30: Manchester, Md | “Manchester” has no coordinate in any repository file: it is not in the gazetteer; before the corps’ gate |
| CL-155 | `us-6c` | night | Jul 1 evening: orders about 20:00 and marching through the night, 30-35 miles | the clause names no place; before the corps’ gate (head about 14:00 Jul 2) |
| CL-156 | `us-6c` | first | Values conflict: head about 14:00 Jul 2 (Meade, per Hessler) vs main body at Rock Creek about 17:00 (SS2) | a value of the unit’s arrival (an arrival conflict) that the arrival gate carries; this clause names no place |
| CL-157 | `us-6c` | left | Jul 5 Sedgwick’s reconnaissance at Granite Hill hits Ewell’s rear guard | “Granite Hill” has no coordinate in any repository file: it is not in the gazetteer |
| CL-159 | `us-11c` | key | 15:00-16:00 collapse | the clause names no place |
| CL-161 | `us-11c` | key | Spangler farm hospital from mid-afternoon Jul 1 | a hospital, not a unit; “mid-afternoon” has no clock |
| CL-162 | `us-11c` | night | Jun 30: Emmitsburg (Barlow’s division north of town) | “Emmitsburg” has no coordinate in any repository file: it is not in the gazetteer; before the corps’ gate |
| CL-165 | `us-11c` | first | Jul 1: head about 12:30-13:00 | the clause names no place |
| CL-166 | `us-11c` | first | Howard’s report about 12:30 | the clause names no place |
| CL-167 | `us-11c` | first | before noon (W-D1) | the clause names no place; a value of the unit’s arrival (an arrival conflict) that the arrival gate carries; this clause names no place |
| CL-168 | `us-11c` | left | Gap | the ledger prints a gap |
| CL-170 | `us-12c` | key | 18:30 departure of Geary, Kane, Ruger | a departure with no destination named here (the night cell says “pulled to the left”) |
| CL-173 | `us-12c` | night | Jun 29: Williams marches Frederick to Taneytown | “Frederick” has no coordinate in any repository file: it is not in the gazetteer; before the corps’ gate |
| CL-174 | `us-12c` | night | Jun 30: Littlestown / Two Taverns (123rd NY at Two Taverns) | two or more places are named and the cell does not say which part of the formation is at which; before the corps’ gate |
| CL-177 | `us-12c` | night | 18:30 five brigades pulled to the left | “left” is a direction; no place and the brigades are not named |
| CL-178 | `us-12c` | night | return overnight | no place and no clock |
| CL-183 | `us-12c` | left | Gap | the ledger prints a gap |
| CL-184 | `us-cav-1d` | key | Jul 1 07:30 contact | the clause names no place |
| CL-185 | `us-cav-1d` | key | two hours delay | the clause names no place |
| CL-186 | `us-cav-1d` | key | Jul 2 noon withdrawn (gone by 12:50) | a departure with no destination or road printed; the night cell says the sources conflict (Taneytown / Westminster / Emmitsburg) |
| CL-187 | `us-cav-1d` | key | Merritt: leaves Emmitsburg noon Jul 3 | “Emmitsburg” has no coordinate in any repository file: it is not in the gazetteer; also before Merritt’s own gate (about 15:00 Jul 3, derived from this cell) |
| CL-190 | `us-cav-1d` | night | Jul 1: gap | the ledger prints a gap |
| CL-191 | `us-cav-1d` | night | Jul 2: after noon at Taneytown / Westminster / Emmitsburg (sources conflict) | two or more places are named and the cell does not say which part of the formation is at which (sources conflict); “Taneytown” has no coordinate in any repository file: it is not in the gazetteer |
| CL-192 | `us-cav-1d` | night | Jul 3: Westminster guarding trains | “Westminster” has no coordinate in any repository file: it is not in the gazetteer |
| CL-194 | `us-cav-1d` | left | Jul 3 Westminster | “Westminster” has no coordinate in any repository file: it is not in the gazetteer; date only |
| CL-195 | `us-cav-1d` | left | Jul 4 onwards pursuit | a departure with no destination or road printed |
| CL-197 | `us-cav-2d` | key | 17:00 2nd Va (Stonewall Bde) attack | the 2nd Virginia is a Confederate unit; no place |
| CL-200 | `us-cav-2d` | first | Jul 2 noon at Hanover / Low Dutch Road junction | the Hanover Road and the Low Dutch Road meet in the repository only at the clipped east end of the road data (a clip, not a mapped junction) |
| CL-201 | `us-cav-2d` | left | Gap | the ledger prints a gap |
| CL-202 | `us-cav-3d` | key | Jul 3 about 13:00 southwest of Big Round Top | a position relative to a place (east of, behind, near) with no distance printed |
| CL-205 | `us-cav-3d` | night | Jun 30: Hanover | “Hanover” has no coordinate in any repository file: it is not in the gazetteer; before the division’s gate |
| CL-206 | `us-cav-3d` | night | Jul 2 night: gap | the ledger prints a gap |
| CL-207 | `us-cav-3d` | night | Jul 3: Beitler farm about 08:00 | “Beitler farm” has no coordinate in any repository file: it is not in the gazetteer |
| CL-209 | `us-cav-3d` | first | Kilpatrick at Hanover on Jun 30 | “Hanover” has no coordinate in any repository file: it is not in the gazetteer; before the division’s gate |
| CL-210 | `us-cav-3d` | left | Jul 4 10:00 Kilpatrick moves out (Monterey Pass) | “Monterey Pass” has no coordinate in any repository file: it is not in the gazetteer; a departure with a printed time but no destination in the gazetteer |
| CL-212 | `us-art-reserve` | key | Phillips arrives about 16:00 | Phillips is not a unit of any list in the roster (history/ARRIVALS-NOTES.md) |
| CL-213 | `us-art-reserve` | key | Hart placed 16:30 | Hart is not a unit of any list in the roster (history/ARRIVALS-NOTES.md) |
| CL-214 | `us-art-reserve` | key | Jul 3 reserve batteries brought up before dawn | “before dawn” is no clock and no place is named |
| CL-216 | `us-art-reserve` | first | Gap (arrival hours not found) | the ledger prints a gap |
| CL-217 | `us-art-reserve` | left | Gap | the ledger prints a gap |
| CL-218 | `cs-anv-hq` | key | Jul 2 05:15 (range) conference with Longstreet | a command decision or message, not the position of a unit; a headquarters entry: no figure, never drawn |
| CL-219 | `cs-anv-hq` | key | about 11:00 attack order | a command decision or message, not the position of a unit; a headquarters entry: no figure, never drawn |
| CL-220 | `cs-anv-hq` | key | Jul 3 watches from Spangler’s Woods | “Spangler’s Woods” has no coordinate in any repository file: it is not in the gazetteer; a headquarters entry: no figure, never drawn |
| CL-221 | `cs-anv-hq` | night | Jun 29: Chambersburg area (Lee orders concentration at Cashtown) | “Chambersburg” has no coordinate in any repository file: it is not in the gazetteer; a headquarters entry: no figure, never drawn |
| CL-222 | `cs-anv-hq` | night | Jun 30 evening: orders concentration around Cashtown | an order, not the headquarters’ position; a headquarters entry: no figure, never drawn |
| CL-225 | `cs-anv-hq` | night | Jul 3 night: pulls army back to Seminary Ridge, council, summons Imboden 01:00 Jul 4 | a command decision or message, not the position of a unit; a headquarters entry: no figure, never drawn |
| CL-227 | `cs-anv-hq` | left | Jul 4 afternoon wagon train | a departure with no destination or road printed |
| CL-228 | `cs-anv-hq` | left | Jul 4 after dark infantry by the Fairfield road | “Fairfield road” is ambiguous in the repository (Hagerstown Road RD-010 or the Fairfield Road at the Peach Orchard RD-015); a headquarters entry: no figure, never drawn |
| CL-234 | `cs-1c` | night | Jun 26-30: gap (not found) | the ledger prints a gap |
| CL-235 | `cs-1c` | night | Jul 1 night: Marsh Creek / within 2-4 miles of town | two or more places are named and the cell does not say which part of the formation is at which (a stream, then a distance range) |
| CL-237 | `cs-1c` | night | Jul 3 night: gap | the ledger prints a gap |
| CL-238 | `cs-1c` | first | Jul 1 17:30 march orders | an order, no place |
| CL-242 | `cs-1c` | left | Jul 4 after dark on the Fairfield road (Hill first, Longstreet second, Ewell third) | “Fairfield road” is ambiguous in the repository (Hagerstown Road RD-010 or the Fairfield Road at the Peach Orchard RD-015); the road is not chosen |
| CL-245 | `cs-1c-mclaws` | key | 17:30-18:00 Barksdale and Wofford | the clause names no place |
| CL-247 | `cs-1c-mclaws` | night | Kershaw within about 2 miles per Freeman) | a distance from the town, no place |
| CL-249 | `cs-1c-mclaws` | left | Gap | the ledger prints a gap |
| CL-253 | `cs-1c-hood` | night | Jul 1-2: Marsh Creek about 01:00 | Marsh Creek is a long stream (the gazetteer’s is 4.4 km wide); the cell does not say where on it |
| CL-256 | `cs-1c-hood` | night | Jul 3 night: gap | the ledger prints a gap |
| CL-259 | `cs-1c-hood` | left | Gap | the ledger prints a gap |
| CL-260 | `cs-1c-pickett` | key | Jul 3 by noon: three brigades west of the Emmitsburg Road | a position relative to a place (east of, behind, near) with no distance printed |
| CL-262 | `cs-1c-pickett` | night | Jun 26-30: gap | the ledger prints a gap |
| CL-263 | `cs-1c-pickett` | night | Jul 1: absent | the division was not on the field on Jul 1 |
| CL-265 | `cs-1c-pickett` | night | Jul 3 night: gap | the ledger prints a gap |
| CL-266 | `cs-1c-pickett` | first | UNRESOLVED: begins marching to Gettysburg 06:00 Jul 2 (EPP) | a value of the unit’s arrival (an arrival conflict) that the arrival gate carries; this clause names no place (C-021) |
| CL-267 | `cs-1c-pickett` | first | on the field the night of Jul 2 (W-D2, Phifer) | a value of the unit’s arrival (an arrival conflict) that the arrival gate carries; this clause names no place (C-021) |
| CL-268 | `cs-1c-pickett` | first | not until Jul 3 (SS2) | a value of the unit’s arrival (an arrival conflict) that the arrival gate carries; this clause names no place (C-021) |
| CL-269 | `cs-1c-pickett` | first | no order reached Pickett to be on the field by daylight Jul 3 (W-PC) | a value of the unit’s arrival (an arrival conflict) that the arrival gate carries; this clause names no place (C-021) |
| CL-270 | `cs-1c-pickett` | left | Jul 4 after dark, Fairfield road | “Fairfield road” is ambiguous in the repository (Hagerstown Road RD-010 or the Fairfield Road at the Peach Orchard RD-015); the road is not chosen |
| CL-272 | `cs-1c-art` | key | 18:00 six batteries to the Emmitsburg Road | which six batteries is not printed |
| CL-273 | `cs-1c-art` | key | Jul 3 04:00 Eshleman, Dearing, Cabell placed before daylight | the clause names no place |
| CL-274 | `cs-1c-art` | night | Jul 2 night: Alexander replaces ammunition | the clause names no place |
| CL-275 | `cs-1c-art` | first | Alexander: approaching 07:00, reaches the ridge about 09:00 Jul 2 (OR 27/2 p.429 and his report) | “the ridge” is not named |
| CL-276 | `cs-1c-art` | first | Eshleman, Cabell, Dearing, Henry: gap | the ledger prints a gap |
| CL-277 | `cs-1c-art` | left | Gap | the ledger prints a gap |
| CL-278 | `cs-2c` | key | Jul 2 16:00 Benner’s Hill | “Benner’s Hill” has no coordinate in any repository file: it is not in the gazetteer (the D. Benner owner-label building symbols on the Warren sheet, STR-MAPSYM-0100..0106, lie in that area but name the farm, not the hill; owner to decide whether they may stand in for it) |
| CL-284 | `cs-2c` | night | Johnson east of town | a position relative to a place (east of, behind, near) with no distance printed |
| CL-285 | `cs-2c` | first | Jul 1 about 11:00 hears the cannonade and turns toward Gettysburg (Rodes) | a direction, not a position; en route |
| CL-286 | `cs-2c` | first | about 14:30 Ewell’s right appears on Hill’s left | a position relative to a place (east of, behind, near) with no distance printed |
| CL-287 | `cs-2c` | left | Jul 4 after dark (third in order) | a departure with no destination or road printed |
| CL-292 | `cs-2c-early` | night | Jun 27: leaves for York | falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground; York has no coordinate in the repository |
| CL-293 | `cs-2c-early` | night | Jun 29: York (Gordon rejoins from Wrightsville) | falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground; York has no coordinate in the repository |
| CL-294 | `cs-2c-early` | night | Jun 30: Heidlersburg area (unconfirmed, gap) | the ledger says “unconfirmed, gap”; falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground |
| CL-296 | `cs-2c-early` | night | Jul 2: ravine below East Cemetery Hill | a position relative to a place (east of, behind, near) with no distance printed (an unnamed ravine) |
| CL-299 | `cs-2c-early` | left | Jul 4 | a departure with no destination or road printed; date only |
| CL-302 | `cs-2c-rodes` | key | Jul 3 Daniel and O’Neal reinforce Johnson by about 04:00 | the place (Johnson’s position) is not named here |
| CL-303 | `cs-2c-rodes` | night | Jun 29: Carlisle | “Carlisle” has no coordinate in any repository file: it is not in the gazetteer; falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground |
| CL-308 | `cs-2c-rodes` | left | Gap | the ledger prints a gap |
| CL-309 | `cs-2c-johnson` | key | Jul 2 16:00 Latimer’s guns on Benner’s Hill | “Benner’s Hill” has no coordinate in any repository file: it is not in the gazetteer; Latimer’s battalion is not a unit of the roster |
| CL-310 | `cs-2c-johnson` | key | 19:00-20:00 crosses Rock Creek | Rock Creek is a long stream (the gazetteer’s is 4.4 km wide); the crossing place is not named |
| CL-311 | `cs-2c-johnson` | key | Jul 3 04:00 reinforced | the clause names no place |
| CL-312 | `cs-2c-johnson` | night | Jun 29-30: gap | the ledger prints a gap |
| CL-313 | `cs-2c-johnson` | night | Jul 1 night: east of town near Culp’s Hill base | a position relative to a place (east of, behind, near) with no distance printed |
| CL-315 | `cs-2c-johnson` | night | Stonewall Brigade rejoins after dark | the clause names no place |
| CL-316 | `cs-2c-johnson` | first | Jul 1 about 19:00 east of town (EPP) or after sunset (SS1) | a position relative to a place (east of, behind, near) with no distance printed |
| CL-317 | `cs-2c-johnson` | left | Gap | the ledger prints a gap |
| CL-320 | `cs-3c` | night | Jun 29: Fayetteville (corps) | “Fayetteville” has no coordinate in any repository file: it is not in the gazetteer; falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground |
| CL-324 | `cs-3c` | first | corps at Fayetteville Jun 29 | “Fayetteville” has no coordinate in any repository file: it is not in the gazetteer; falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground |
| CL-325 | `cs-3c` | left | Jul 4 after dark (first in order) | a departure with no destination or road printed |
| CL-327 | `cs-3c-heth` | key | 12:30 Pettigrew and Brockenbrough arrive | the clause names no place |
| CL-331 | `cs-3c-heth` | night | Jul 1 night: front | “the front” is not a place of the gazetteer |
| CL-333 | `cs-3c-heth` | first | Jun 30 Pettigrew’s brigade raid reaches Gettysburg’s edge, withdraws | a position relative to a place (east of, behind, near) with no distance printed; falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground |
| CL-334 | `cs-3c-heth` | first | Jul 1 about 07:30 first contact | the clause names no place |
| CL-335 | `cs-3c-heth` | left | Jul 14 rear guard at Falling Waters | “Falling Waters” has no coordinate in any repository file: it is not in the gazetteer |
| CL-339 | `cs-3c-pender` | night | Jul 1-3: front | “the front” is not a place of the gazetteer |
| CL-340 | `cs-3c-pender` | first | Jul 1 about 16:00 passes through Heth | the clause names no place |
| CL-341 | `cs-3c-pender` | left | Gap | the ledger prints a gap |
| CL-344 | `cs-3c-anderson` | night | Jun 30: ordered to march the morning of Jul 1 | an order; before the division’s gate |
| CL-345 | `cs-3c-anderson` | night | Jul 1 night: about 2 miles behind the front | a position relative to a place (east of, behind, near) with no distance printed |
| CL-348 | `cs-3c-anderson` | left | Gap | the ledger prints a gap |
| CL-349 | `cs-cav-div` | key | Jul 2 early to mid afternoon reaches Lee | no clock; Lee’s position is not a place of the gazetteer |
| CL-350 | `cs-cav-div` | night | Jun 25 leaves Salem Depot 01:00 with Hampton, F. Lee, Chambliss | “Salem Depot” has no coordinate in any repository file: it is not in the gazetteer; falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground |
| CL-351 | `cs-cav-div` | night | Jun 28 crosses the Potomac at Rowser’s Ford about 03:00 | “Rowser’s Ford” has no coordinate in any repository file: it is not in the gazetteer; falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground |
| CL-352 | `cs-cav-div` | night | Jun 29 Westminster | “Westminster” has no coordinate in any repository file: it is not in the gazetteer; falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground |
| CL-353 | `cs-cav-div` | night | Jun 30 Hanover fight | “Hanover” has no coordinate in any repository file: it is not in the gazetteer; falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground |
| CL-354 | `cs-cav-div` | night | Jun 30-Jul 1 night march to Dover | “Dover” has no coordinate in any repository file: it is not in the gazetteer; falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground |
| CL-355 | `cs-cav-div` | night | Jul 1 evening Carlisle | “Carlisle” has no coordinate in any repository file: it is not in the gazetteer; falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground |
| CL-356 | `cs-cav-div` | first | See the cavalry rows below | a pointer to the brigade rows |
| CL-357 | `cs-cav-div` | left | Jul 4 retreat assignments | a departure with no destination or road printed |
| CL-361 | `cs-cav-hampton` | left | Jul 4 with wagons and ambulances | a departure with no destination or road printed |
| CL-363 | `cs-cav-flee-chambliss` | night | Jul 2 night: behind Seminary Ridge area / Cress Ridge approach (gap) | the ledger says gap; two places |
| CL-364 | `cs-cav-flee-chambliss` | first | Jul 2 evening (brigades arrive that evening) | a value of the unit’s arrival (an arrival conflict) that the arrival gate carries; this clause names no place |
| CL-365 | `cs-cav-flee-chambliss` | left | F. Lee left flank on Jul 4 | a departure with no destination or road printed |
| CL-367 | `cs-cav-jenkins` | night | Where wounded: gap | the ledger prints a gap |
| CL-368 | `cs-cav-jenkins` | first | Jun 29 at Carlisle with Ewell | “Carlisle” has no coordinate in any repository file: it is not in the gazetteer; falls before the unit’s ledger gate (Q04): before the unit exists on the loaded ground |
| CL-369 | `cs-cav-jenkins` | first | attached to Stuart Jul 3 | a command attachment, not a position |
| CL-370 | `cs-cav-jenkins` | left | Gap | the ledger prints a gap |
| CL-371 | `cs-cav-robertson-jones-imboden` | key | Jul 4-5 Imboden’s train | the clause names no place |
| CL-372 | `cs-cav-robertson-jones-imboden` | key | Jones and Robertson guard passes | the passes are not named |
| CL-373 | `cs-cav-robertson-jones-imboden` | night | Imboden Jul 2: gap | the ledger prints a gap |
| CL-374 | `cs-cav-robertson-jones-imboden` | first | Not engaged at Gettysburg main field (left guarding Virginia passes) | not on the main field |
| CL-375 | `cs-cav-robertson-jones-imboden` | first | Jones’s Laurel Brigade fights at Fairfield Jul 3 | “Fairfield” has no coordinate in any repository file: it is not in the gazetteer |
| CL-376 | `cs-cav-robertson-jones-imboden` | left | Gap | the ledger prints a gap |

## Place names the gazetteer could not resolve

The gazetteer has 78 places (28 with a line), every one with its source files and a sigma_m; 2 are proxies and say so (Seminary Ridge, Herr Ridge: the ridge crests are not mapped in the repository, so the line of a named road or the line between two features that name themselves as on the ridge stands in, with a larger sigma). Villages (Cashtown, Hunterstown, Heidlersburg) come from the Hopkins 1858 county map control points (`docs/basemap1863/maps/gcps/hopkins_county.json`, ground E,N in EPSG:32618, sigma_m 500 m); the Bryan farm from the structures layer; “Baltimore Pike, 1 mile east of Rock Creek” is derived from the bridge BR-002 and the printed distance. A name that two entries claim is not resolved by guessing. Names printed in the ledger cells were found by pattern and looked up:

**Names the clauses could not place because no repository file carries a coordinate for them (21):** Beitler farm; Benner’s Hill; Carlisle; Chambersburg; Dover; Emmitsburg; Fairfield; Falling Waters; Fayetteville; Frederick; Goulden Road; Granite Hill; Hanover; Manchester; Monterey Pass; Moritz’s Tavern; Rowser’s Ford; Salem Depot; Spangler’s Woods; Taneytown; Westminster.

**Phrases ending in a place word, not in the gazetteer (12):** Benner’s Hill (cs-2c/key_positions, cs-2c-johnson/key_positions); Cress Ridge (cs-cav-flee-chambliss/night_positions, cs-cav-flee-chambliss/key_positions); Fairfield road (cs-anv-hq/left_or_moved, cs-1c/left_or_moved); Goulden Road (us-6c/key_positions); Granite Hill (us-6c/left_or_moved); Monterey Pass (us-cav-3d/left_or_moved); Moritz’s Tavern (us-1c/key_positions); Pipe Creek (us-aop-hq/night_positions); Rowser’s Ford (cs-cav-div/night_positions); Salem Depot (cs-cav-div/night_positions); Slocum’s Culp’s Hill (us-aop-hq/key_positions); Spangler’s Woods (cs-anv-hq/key_positions).

**Capitalised names after a place preposition, not in the gazetteer (20; towns, people and units are mixed in because the pattern cannot tell them apart):** Baltimore; Bridgeport; Carlisle; Chamberlain; Dover; Fairfield; Falling Waters; Fayetteville; Freeman; Gregg; Halleck; Hanover; Heth; III Corps; Meade; Stuart; Taneytown; Two Taverns; Webb; Wrightsville.

**Resolved:** 41 phrase names and 4 other names resolve (for example Baltimore Pike, Barlow’s Knoll, Biesecker’s Woods, Big Round Top, Black Horse Tavern road, Brinkerhoff Ridge).

**Ambiguous, so unresolved:** "Fairfield Road" (RD-010 Hagerstown Road (Fairfield Road of the ten-road list) / RD-015 Fairfield Road at the Peach Orchard (modern Millerstown Road)).

**In the repository by name but with no coordinates:** STR-LOST-GRANITE_SCHOOLHOUSE "Granite Schoolhouse (Culp's Hill / Baltimore Pike area)" (docs/basemap1863/features/structures/structures.geojson).

**Candidate not adopted, for the owner (Benner's Hill):** the D. Benner owner-label building symbols of the Warren sheet (`STR-MAPSYM-0100` to `0106` in `docs/basemap1863/features/structures/structures.geojson`, marked unreviewed) lie where the hill is, but they name the farm, not the hill; no repository feature carries the name “Benner's Hill”. Two clauses (cs-2c key positions, cs-2c-johnson key positions) wait on this.

Places that resolve but lie outside the loaded ground (6.2 x 6.1 km): Barlow's Knoll, Oak Ridge, Oak Hill, East Cavalry Field, Brinkerhoff's Ridge, Black Horse Tavern, Railroad Cuts, Cashtown, Hunterstown, Heidlersburg, Baltimore Pike, 1 mile east of Rock Creek. A unit sent there is moved to its place and is simply not on screen.

## Defects and findings

**Ledger time versus the edge of the loaded ground (a data property, not a defect).** A unit enters the map where its road crosses the edge of the 6.2 km ground, at its ledger gate (the earliest time: Q04, never earlier), and marches at drill speed (march 1.25 m/s, the shell's own rate; double-quick 2.44 m/s from Hardee 1861, 4,000 yards in about 25 minutes). The ledger time of its first place refers to a place that lies kilometres farther along the road than the edge, so where the distance cannot be covered by the ledger time the unit reaches the place later. **Handling:** the gate is kept as the time the head of the unit first exists on the loaded ground; the march is not shortened and the entry is not moved; the difference is a property of the data, reported in `layer.report().offsets` (kind `ledger_vs_edge`, with the road, the stop, the printed time, the arrival and the distance; a later leg that is late only because the leg before it was is kind `cascade`), and printed on the unit's card (“enters the map where X leaves the loaded ground; the ledger time (hh:mm at P) refers to a place D km farther on”). `layer.report().defects` is kept for lateness that has another cause (a chosen step-off clock leaving too little time); it is empty in the default scenario.

| stop | units | late by (min) | distance from the edge (m) |
|---|---|---|---|
| ledger_vs_edge PO-41 Cemetery Ridge | 14 | 32 to 39 | 4,662 to 5,768 |
| ledger_vs_edge PO-60 Seminary Ridge | 22 | 21 to 58 | 3,113 to 8,491 |
| ledger_vs_edge PO-46 Herr Ridge | 5 | 45 to 48 | 6,616 to 6,950 |
| ledger_vs_edge PO-49 Seminary Ridge | 14 | 51 to 55 | 7,469 to 8,035 |
| ledger_vs_edge PO-47 Seminary Ridge | 10 | 55 to 57 | 8,027 to 8,309 |
| ledger_vs_edge PO-01 McPherson Ridge | 11 | 52 to 72 | 7,574 to 10,545 |
| ledger_vs_edge PO-06 McPherson Ridge | 13 | 44 to 52 | 9,354 to 10,548 |
| ledger_vs_edge PO-13 Cemetery Ridge | 3 | 45 to 47 | 6,634 to 6,804 |
| ledger_vs_edge PO-70 Gettysburg (the borough) | 1 | 31 to 31 | 8,967 to 8,967 |
| ledger_vs_edge PO-69 Gettysburg (the borough) | 1 | 31 to 31 | 8,967 to 8,967 |
| ledger_vs_edge PO-71 Gettysburg (the borough) | 1 | 31 to 31 | 8,967 to 8,967 |
| ledger_vs_edge PO-04 Cemetery Ridge | 19 | 50 to 50 | 7,338 to 7,387 |
| ledger_vs_edge PO-28 Devil’s Den | 1 | 38 to 38 | 5,517 to 5,517 |
| ledger_vs_edge PO-32 Powers’ Hill | 30 | 27 to 42 | 3,943 to 6,158 |
| ledger_vs_edge PO-33 Little Round Top | 9 | 3 to 4 | 9,784 to 9,938 |
| ledger_vs_edge PO-51 Barlow’s Knoll | 18 | 7 to 18 | 999 to 2,621 |
| ledger_vs_edge PO-57 Oak Hill | 23 | 11 to 26 | 1,539 to 3,790 |

The ledger says the head of I Corps is on the Emmitsburg Road at 10:00 and the vanguard at McPherson Ridge at 10:20. It does not say where along the road the head was. From the point where the mapped road leaves the loaded ground, 7,574 to 10,545 m of marching separate the 1st Division's leaf units from McPherson Ridge, which no drill speed covers in 20 minutes. The layer keeps the gate (nothing before 10:20 for the division) and reports the difference.

**Site data defects found while building the gazetteer** (set aside, listed in `data/gazetteer.json` as `rejected_members`): Culp's Hill: monument 221 24th Michigan Infantry Marker ("Iron Brigade") 3,536 m away; Cemetery Ridge: monument 35 11th Mississippi Infantry Regiment Marker 3,414 m away; The Angle: monument 35 11th Mississippi Infantry Regiment Marker 3,483 m away; The Wheatfield: monument 290 2nd Fire Zouaves, 73rd New York Infantry Monument (4th Excelsior Regiment) 685 m away, monument 454 147th Pennsylvania Volunteer Infantry Monument (Pardee Field Monument) 2,967 m away; East Cavalry Field: monument 369 6th Pennsylvania Cavalry Regiment Monument ("Rush's Lancers") 9,521 m away. A monument record whose location tag names a place several kilometres from it is carried as a data defect, not used.

**Works and walls:** 13 pre-existing walls and fences and 5 works are in the layer (17 of them at a named place, as a ring: none has a mapped line). 6 works are not drawn because the record gives no finish time: E-02, E-03, E-04, E-07, E-08, E-09. The ring of a work follows the default-scenario rule of `tools/bt/check_structures.py state_at` (tested against it); the per-work scenario windows and the damage stages are applied only on the card of the ring (the structures layer reads the full `state_at`, ported and tested equal), not to the ring's progress. The fences, buildings, markers and roads drawn in 3D from the base-map layers, with their inventory and counts, are in STRUCTURES-3D-NOTES.md; a work or a pre-existing wall has no mapped line, so the ring is still its only mark.

**Road geometry:** Black Horse Tavern Road: 1 separate part(s) of the record are not joined to the line (63 vertices); Hunterstown Road: 1 separate part(s) of the record are not joined to the line (3 vertices). The unjoined parts are not used.

**Ledger and roster findings:**

- `us-1c-2d` prints “Coulter massed near the railroad embankment about 11:00” and “Coulter moves left about 19:00”, but Coulter is not a unit of the roster (B.3 lists Paul and Baxter), so no unit is given those places.
- “Vanguard (Wadsworth) at McPherson Ridge” is applied to the whole 1st Division, and “10:20-10:30 McPherson Ridge” in the corps row to the corps' units on the field at 10:20 (not Stannard's brigade, whose own gate is Jul 2 18:00); the cells do not say which regiments were the vanguard. Marked on the clauses.
- Division-level places (“16:30 Devil's Den”, “17:30-18:00 Peach Orchard” in the 1st Division of III Corps; “Jul 2 night: Culp's Hill”) are applied to every regiment of the formation named in the row; the ledger names no brigade. Marked on the clauses.
- “Fairfield road” (Jul 4 retreat, 3 clauses) is ambiguous between two roads of the road layer and is left unresolved; the PDF's row T3-163 also prints it (“Fairfield Road and Monterey Pass for infantry (inferred)”).
- “Hanover / Low Dutch Road junction” (II Cavalry Division): the two mapped roads meet only at the clipped east end of the road data (every road record is cut at the same line), a clip and not a junction; unresolved.
- The III Corps cell names Birney's division; the 2nd Division's cell prints it on the Black Horse Tavern road at about 21:00 Jul 1, but that mapped road lies wholly outside the loaded ground and gives no entry (AP-07); the division stays an open gap with that reason.
- A corps-level night position is not applied to a division whose own row has a night position for the same night (the III Corps “Jul 2: Peach Orchard salient” against the divisions' own cells).
- A gate that is only a date or an event floor (II Corps 1st and 3rd Division, I Corps 3rd Division, ...) is never drawn before its parent; the checker allows it, the layer is stricter (4 units with such a gate of their own are later than the checker's permission for this reason; none is earlier, tested against `tools/bt/check_arrivals.py` for every unit).
- Source keys on ledger rows (W-GC, SS1, EPP, ...) are carried with weak flags; no key legend exists in the repository, so their labels are the keys themselves and `claim_support_verified` is false for every row. No clause is therefore “documented”: the highest tier is inferred.

## Owner decisions needed

1. **Roads read from the place they lead to** (AP-03 Baltimore Pike, AP-04 Hanover Road, AP-06 Hunterstown Road): keep as inferred, or open gap until a primary source names the road.
2. **Two places in one clause** (“Cemetery Hill / Stevens' Knoll area”, “Millerstown Road / Warfield Ridge”, “Little Round Top / Round Top”, ...): the places are recorded and no stop is scheduled; say whether a stop at the first, at either, or at their midpoint may stand in.
3. **“Fairfield road”**: which of the two mapped roads (Hagerstown Road RD-010, the Fairfield Road at the Peach Orchard RD-015) the Jul 4 retreat uses; until then no departure is drawn.
4. **Benner's Hill**: whether the D. Benner farm symbols may stand in for the hill (a proxy with a larger sigma, as for Seminary Ridge).
5. **Night positions** are held from the start of the night (20:04, the PDF's convention applied to the date the clause prints). Say if a different anchor (for example sunset 19:32) is wanted.
6. **Activity clips** for the ledger's verbs (attack and assault = double_quick or gallop, works = build_works, ...) are plausible-procedural mappings of the renderer; say if another mapping is wanted.
7. **Casualty defaults** (DEC-008, provisional builder choices): the picture uses the printed Stone Sentinels total (the low end of the range) and the middle of each fate-fraction range; the artillery cycle shown for a drawn gun (40 s, inside both printed ranges); the 90 s length of a change of formation. Each is a tuning value the owner can replace; the ranges are shown whichever is chosen.
8. **Modelled roads of approach** (DEC-015, provisional builder choice; EG-0070): 56 units of the First and Fifth Corps are drawn by the road that every documented sibling formation of their corps names (Chambersburg Pike on the strength of Kershaw’s report alone; Hanover Road on the strength of the 20th Maine row and Day’s division report). Accept the rule, reverse it (delete `data/sibling-approach.json`; the units return to open gaps), or require two or more documented siblings (then the First Corps drops out). The 25 units that have a sibling road and no day position (Semmes, Wofford, Pickett) are left undrawn; say if they may stand in a column at the edge instead.

## What remains

- **More approach roads.** 218 clauses are unresolved; the ones that would add drawn units are the roads or directions of the night cells and timeline rows (Timeline rows (691) give times and place columns but their actors are text, not unit ids; mapping them needs curation per row, then they feed `placement.json` through the same validation).
- **Open gaps after v6.** The leaf units that the sibling-road rule does not draw are listed with their reason in `APPROACH-AUDIT.md`: the Eleventh Corps (the route by Horner’s Mill), Johnson’s division (the road from Scotland), the Second Division of the Third Corps (Black Horse Tavern Road), the Second Corps’ reserve artillery and the cavalry corps (documented siblings disagree), Jones’ battalion (reports disagree), Stuart’s cavalry (only earlier marches printed), and the brigades with a sibling road and no day position. Each needs a period map of the road, a report that names it, or an owner ruling.
- **The position ledgers** leave 3,628 of 3,703 claims unused; the largest group (1,796) prints a day or a day-part but no clock, which cannot give a place a time. A road printed in a report (Heidlersburg road, Middletown road, Fairfield road, the Scotland road) that the gazetteer does not hold, or holds under two entries, gives no entry point: the roads layer of the repository would need the road, or the owner a ruling on the name.
- **Departures** need a destination and a road in the gazetteer (the villages Westminster, Taneytown, Emmitsburg and the passes have no coordinates in the repository) and the owner's choice for the “Fairfield road”.
- **Casualties** are procedural shares of corps and brigade totals (no regimental number exists in the record) and are placed only in the printed windows of the timeline; **guns** are drawn only where a count is stated: 22 of the 73 drawn batteries have one (124 pieces). See `CASUALTIES-NOTES.md`.
- **Gazetteer lines for ridges** (Seminary Ridge, Herr Ridge are proxies); a mapped ridge crest would replace them.
- Strengths: Busey and Martin and the Official Records are not available; every share is a placeholder for a sourced figure.

