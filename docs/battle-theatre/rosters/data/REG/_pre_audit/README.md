# REG family: Regular Army, Delaware, Maryland, Rhode Island, West Virginia, headquarters units

Built 30 October 2026 under DEC-019 (the owner's instruction that roster information is public and must be obtained from open sources). Every source below is a public-domain book or a state publication on the Internet Archive that is not lending-restricted (each item's metadata was checked and is recorded in `acquired.json`). No browser, no account, no key, no login, no licence acceptance, no bot-block circumvention. Requests were 2.2 s apart with the user agent `gettysburg-map-research/1.0`; the cache holds about 233 MB (cap 1.5 GB). Nothing was fabricated: a row exists only because a source line exists, and what could not be read is labelled as such.

## Result in one table (Measured by `pipeline/reg/reg_stats.py`, details in `stats.json`)

| | |
|---|---|
| OOB units in scope | 51 (17 infantry, 9 cavalry, 5 horse batteries, 20 foot batteries: Regular, Rhode Island, West Virginia) |
| units with at least one name | 49 (the two without: `U-ART-F5US`, `U-ART-F4US-XI`, whose designations conflict with the Official Records, see below) |
| rows published | 11,365 (one per name as printed per source; persons are not merged across sources) |
| Present-Documented | 359 (3.2 percent) |
| Absent-Documented | 3,402 (29.9 percent) |
| Unknown | 7,604 (66.9 percent), of which 3,451 rows (30.4 percent of all rows) are `unreadable-or-ambiguous` because the text layer lost a year, month or remark word |
| gates R-G1 and R-G2 (99 percent) | **not met**: see QA. A second OCR or a manual image pass is required before publication |

Strength reconciliation (PLAN 2.3) is `Short` for every unit: named present is far below the OOB strength, and the page must say "n present, names not recovered". `stats.json` carries one record per OOB unit.

## Files

* Whole-war rolls parsed from word coordinates: `u-3md.csv`, `u-1md-eh.csv`, `u-1md-phb.csv`, `u-1md-cav.csv`, `u-purnell-md.csv` (Maryland), `u-2ri.csv` (2nd Rhode Island), `u-art-a1ri.csv`, `u-art-b1ri.csv` (Rhode Island batteries), `u-7wv.csv`, `u-1wv-cav.csv`, `u-3wv-cav.csv`, `u-art-cwv.csv` (West Virginia).
* `*-officers.csv` next to a roll: the commanders the Official Records name for that unit (Present-Documented).
* Regular Army and Delaware: `u-2us.csv` ... `u-17us.csv`, `u-1us-cav.csv` ... `u-6us-cav.csv`, `u-art-*.csv`, `u-hab-*.csv`, `reg-art-1us.csv` ... `reg-art-5us.csv` (Regular artillery officers by regiment, battery not stated by Heitman), `u-1de.csv`, `u-2de.csv`. These are **officer and named-casualty rows only**: no roll of enlisted men exists in an open source for the Regulars, and the Delaware enlisted registers are handwritten image PDFs.
* Headquarters, provost, signal, engineers, ambulance, trains: `hq-*.csv`, `provost-8us.csv` (no OOB entry exists for any of these; they are named from OR 27/1 No. 9 and the report index).
* `heitman_gettysburg_officers.csv`: all 282 officers Heitman ties to Gettysburg (Regular, volunteer and staff; 173 mapped to a Regular regiment in scope). The remaining rows are useful to the other families.
* `acquired.json` (files, sha256, bytes, URLs, blocked list), `stats.json`, `progress.md`.
* Columns: `unit_id, regiment, company, section, name_as_printed, rank_as_printed, residence, age, date_in, date_out, remarks_as_printed, presence_label, presence_basis, roll_status, source_id, source_locator, parse_flags` (a superset of the pilot columns; the labels and `roll_status` values are those of PLAN 2.2). `Duplicate-Xref` is used as in the Wisconsin pilot.

## Sources and rights (all public domain; identifiers are Internet Archive unless stated)

| use | identifier | note |
|---|---|---|
| Maryland rolls | `historyrosterofm01mary` (primary), `historyandroste00assegoog` (second reading) | Maryland commission 1898. Third scan `cu31924092925134` timed out at the metadata call, not used |
| Rhode Island 2nd Inf | `officialregister00rhod` | vol 1 only (1st Detached Militia and 2nd RI); the batteries volume is not on IA |
| RI Battery A, B | `histbattery00aldrrich`, `historyofbattery03rhod` | Aldrich 1904 appendix is partial by design; Rhodes 1894 is a full roster |
| West Virginia | `annualreportadj07offigoog` (parsed), `AnnualReportOfTheAdjutantGeneralOfTheStateOfWestVirginia1864` (second scan, not parsed), `annualreportsofa00west`, `loyalwestvirgin00langgoog` | 1864 report, Appendix B returns |
| Regular officers | `historicalregist01heitrich`, `historicalregist02heitrich` (Heitman 1903); `officialarmyregi1863unit`, `officialarmyregi1865unit` (downloaded, not yet parsed) | |
| Delaware | Seville 1884 `historyoffirstre00sevi`; Smith 1909 `briefaccountofse53smit`; Murphey 1866 `fouryearsinwarhi00murp` (roster tables unusable in the text layer); three state image PDFs from civilwar.delaware.gov | |
| Staff, commanders | Official Records Series I vol 27 part 1 (`warofrebellion012701rootrich`, cached by the earlier pilot, sha256 in `acquired.json`) | organization No. 9 pp.155-168 and the index of reports |
| Checked, nothing usable | `revisedreportmad00penn` (cemetery: counts only for the Regulars lot); `delawarearchives03/04/05dela` (Revolutionary War records, downloaded on a search title, not used) | |
| Not touched by rule | NPS CWSS (robots.txt disallows `/search/`), FamilySearch, Fold3, Ancestry, Find a Grave, HathiTrust | `SOURCES.csv` row R15 |

## Parse method

Maryland, Rhode Island, West Virginia: `djvu.xml` word boxes grouped into lines; columns found per page from the positions of the rank and date tokens (the second Maryland scan is twice the resolution: a per-page scale factor handles it); a record is anchored by its dated line, wrapped surname lines above it belong to it, remark-only lines below continue its remarks. West Virginia and Rhode Island print the muster date once and then ditto: a day-only or ditto-only cell inherits the last full date on the page (flag `date-inherited-from-ditto` or `date-ditto-inherited`), and an unreadable printed date poisons the inheritance. Battery histories: text entries split at the printed name. Heitman Part III: entries "Name, rank regiment, date, place, event" with place Gettysburg; Part II: clauses with the Gettysburg brevet, regiment taken from the last regiment named before it. Labels follow PLAN 2.2: Present-Documented for a remark naming Gettysburg with a casualty word or a casualty dated 1-3 July 1863, and for officers named by an official report or Heitman; Absent-Documented for a separation dated before 1 July 1863 or enlistment after 3 July; otherwise Unknown with `on-roll-undetermined` or `unreadable-or-ambiguous`. A "discharged to accept promotion" clause is not a separation; a "transferred to" clause with a date is, and carries `transferred-to-other-unit` (such a man may be present in the other unit).

## OCR quality and QA (a 54-row sample against page images, Measured)

Pages viewed: Rhode Island Official Register book p.50 (djvu 56), 13 rows read against the image; West Virginia 1864 report book p.195 (7th WV, Company B, djvu 200), 41 rows. This is not independent (the author fixed three rules from it) and is not the PLAN 4.4 draw.

* Hard errors (a label asserting the opposite of the page): 0 of 54.
* Labels weaker than the page supports: Rhode Island 4 of 13 (a discharge or a killed entry whose date was garbled stayed Unknown); West Virginia about 12 of 41 (remark years read 1863 for 1862; dates wrapped to a lost line).
* Name transcription: West Virginia about 37 of 41 exact against the printed page; Rhode Island 8 of 13 (garbles such as Ilenrv for Henry, Ualtic for Baltic); garbled names are not flagged in the CSV yet. Dates: no wrong date read in the 54 rows, but 8 of 13 Rhode Island muster dates were blank until the ditto rule, and the first West Virginia pass had inherited a wrong date (Aug 7 read as July 7), which was found by this check and fixed.
* Result: R-G1 (99 percent name exact) and R-G2 (dates) are **not met** on Rhode Island and West Virginia. Maryland was checked only against the second scan (3MD unreadable 484 to 395 and 1st Eastern Shore 237 to 121 after the second reading); no Maryland page image was viewed. The data must go through the second-OCR and independent-sample steps of PLAN 4.4 before publication.

## What is missing and why (honest gaps; detail in `GAPS.md`, section REG)

1. **Regular Army enlisted men (2,562 infantry in the OOB, 1,146 cavalry, about 2,200 in the 21 Regular batteries at the OOB's 107 per battery)**: no open roster exists. Heitman and the Army Register cover officers; enlisted men are in NARA registers of enlistments and compiled service records (Fold3, FamilySearch: not touched). Tried: Heitman Parts II and III, OR 27/1 organization and reports, cemetery report (counts only), regimental histories (none found on the Internet Archive with a Gettysburg roll). The Army Register of 1863 and 1865 are downloaded but not parsed; parsing them gives every Regular officer as on-roll-undetermined.
2. **Delaware enlisted men (485 in the OOB)**: the three state volumes are open and legible handwritten registers but image only. Next step is transcription (OCR engine, or reading about 160 pages); until then only 25 (1st) and 3 (2nd) named men.
3. **West Virginia**: enlisted men for 1863 exist only as the December 1864 return; the second scan is downloaded but its geometry is not parsed. Officers of the 1864 report (Appendix A) are not extracted.
4. **Rhode Island Battery C and the other batteries** (E, G, and the 1st RI Cavalry are not in the OOB): the Official Register volume that holds them is not on the Internet Archive; HathiTrust is blocked by the brief.
5. **Maryland**: 22 percent of rows (1,269 of 5,905) are unreadable because years are missing in the text layer of the primary scan; the second scan is used only to fill them. The Maryland rolls carry the whole war, so very few rows say anything about July 1863.
6. **Presence per man** is Unknown for most rows by the PLAN's own rule 12; only the 30 June 1863 muster rolls would settle it (not open).

## Source conflicts carried, not resolved

* Battery B, 1st RI: the OR organization prints Lieut. Walter S. Perrin, Rhodes (1894) prints William S. Perrin.
* Heitman and the OR agree on the Regular battery officers by name; the repository OOB does not (next section).
* The Delaware 1st Infantry: Smyth's report counts seven enlisted killed, the muster-out rolls (Seville) ten killed and three died of wounds; Dent reports ten killed, forty-one wounded.

## Repository OOB problems found (reported, the OOB file was not changed)

* Units the Official Records organize but the OOB lacks: 1st Maryland Potomac Home Brigade (Col. Maulsby, report No. 283), 14th US Infantry (Maj. Giddings), 8th US Infantry (provost, Capt. Read), the US Engineer Battalion (Capt. Mendell), 1st Rhode Island Cavalry (Col. Duffie, reports 345-346), Batteries E and G of the 1st Rhode Island Light Artillery, Battery A Maryland Light Artillery (Capt. Rigby), 2nd US Batteries B and L (Lieut. Heaton), 3rd US Batteries F and K, A and C, 1st US Battery H. Rows for the first eight are in the files above with `U-...` ids that are not OOB ids.
* `U-ART-E4US-III` is described as Battery E 4th US (Seeley) but the OR prints Seeley with Battery K 4th US; `U-ART-F4US` and `U-ART-F4US-XI` carry Lieut. Eakin, whom the OR places with Battery H 1st US; `U-ART-F5US` and `U-ART-F5US-VI` are the same battery (Lieut. Martin, Sixth Corps); Battery F 4th US appears under three ids. No rows were invented for the ids the OR does not support.
* `U-Purnell-MD` has strength 147; the OR organizes only Company A (Capt. Duvall) with the Army of the Potomac. The roll file carries all companies, flagged.
* `U-3US-1/2` and `U-12US-1/2` are battalions of one regiment each; the files carry the regiment-level rows twice (flagged `battalion-unresolved`) and the counts above do not double them.
* `U-3WV-CAV` is two companies per the OR (Capt. Conger) and the companies are not named in the source; the roll carries all companies with a flag. `U-1WV-CAV-b` is a detachment of the regiment in `U-1WV-CAV` and shares its roll.

## Reproduce

`pipeline/reg/`: `regfetch.py` (polite fetcher), `md_parse.py` + `md_units.py`, `ri_parse.py`, `ri_batteries.py`, `wv_parse.py` + `wv_units.py`, `heitman_gb.py`, `reg_assemble.py`, `reg_stats.py`, `update_sources.py`. Run with `python -I -X utf8` at below-normal priority (the scripts set it themselves). Inputs are in `tmp/library/rosters/REG/` (not committed).
