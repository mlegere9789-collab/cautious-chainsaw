# New York family: Register rolls of the New York units at Gettysburg (data/NY)

Built 30 October 2026 from public sources only (the New York State Military Museum site and the Internet Archive). No account, login, key, licence acceptance or bot-block workaround was used. Rows keep the name and remark as the source text layer prints them; no name was corrected. Presence labels follow PLAN section 2.2; every row carries the rule that set its label.

## Result

| measure | value |
|---|---|
| OOB unit entries of the New York family (`baseline/dist/data/oob/`) | 88 (67 infantry entries, 8 cavalry, 13 artillery) |
| OOB entries with names in this directory | 85 |
| of these: own Register roll | 80 |
| of these: covered through the parent unit (alias or detachment rows) | 4 |
| Register image-only (no text layer): names only from the Roll of Honor | 2 (61st NY: 0 names; 71st NY: 11 names) |
| OOB entries with no roster | U-107NY, U-ART-NYC |
| names (rows that are men, not cross-reference lines; own rolls only, aliases not double counted) | 116549 |
| Present-Documented | 4930 (4.2 percent) |
| Absent-Documented | 64040 (54.9 percent) |
| Unknown | 47579 (40.8 percent), of which on-roll-undetermined 39747, unreadable-or-ambiguous 7789, contested 43 |
| Present-Probable | 0 (withheld from roll-only men, PLAN 2.4) |
| unreadable-or-ambiguous share of names | 6.7 percent |
| extra units not in the OOB file (built because OR 27/1 lists them) | EXTRA-120NY (1654 rows), EXTRA-B1NY (192 rows), EXTRA-I1NY (238 rows), EXTRA-K1NY (291 rows) |
| downloaded for this family | 264 files, 678 MB (cap 1.5 GB), sha256 of each in `acquired.json` |

Per-unit counts, documented strength and status: `unit-table.md`, `reconciliation.json`, `build_stats.json`. Every unit is Short: the named present men (casualties and men placed at Gettysburg by a remark) are far fewer than the documented strength, because the Registers record service history, not who was present on 1 to 3 July 1863 (PLAN section 0, point 1). Documented strength `S_doc` here is the repository OOB value, which cites Busey and Martin second-hand (PLAN G15); it was not re-checked against a primary source in this family.

## Files

| file | what |
|---|---|
| `rosters/<unit_id>_<name>.csv` | one CSV per OOB unit (and per extra unit): columns `unit_id, regiment, company, attached_to_unit_id, section, name_as_printed, name_clean, age, rank_as_printed, enlisted_or_mustered, residence_as_printed, remarks_as_printed, presence_label, presence_basis, basis_code, roll_status, dup_group, source_id, source_page_pdf, parse_flags, cross_source` (the pilot columns plus `basis_code`, `attached_to_unit_id`, `cross_source`) |
| `rosters/U-1NYLA-REG_other-batteries-and-unassigned.csv` | men of the 1st NY Light Artillery Register who are not in a Gettysburg battery at 3 July 1863 |
| `stats.json` | the family statistics (units, names, rows unreadable, share by label) |
| `reconciliation.json`, `unit-table.md` | per unit: S_doc, counts by label and roll status, status Short/Contested, Phisterer Gettysburg casualty row, named-casualty ratio |
| `build_stats.json` | per unit build counts, Roll of Honor merge counts, second-OCR comparison counts |
| `acquired.json` | every file fetched: URL, final URL, bytes, sha256, retrieval time, HTTP status, unit ids |
| `unit_map.json` | OOB unit to source page map, aliases, OOB defects, extra units |
| `roh_unresolved.csv` | 923 Roll of Honor lines whose name the OCR text did not resolve (OCR text as read, never guessed) |
| `QA-SAMPLE.md` | page-image check of the labels, names and dates (builder) |
| `AUDIT.md`, `_pre_audit/` | independent audit of 30 October 2026: sample of 60 rows, defects D1 to D11, every change logged, frozen copy of the pre-audit outputs and code |
| `progress.md` | one line per step |

## Sources used (identifiers, rights, access)

| id | source | identifier or URL pattern | rights and access | status |
|---|---|---|---|---|
| NY-NYSMM-REG | Registers of the New York volunteer regiments, Annual Reports of the Adjutant General of the State of New York, 1893-1905 (printed text of each regiment: name, age, enlistment, muster-in, every later event) as published by the New York State Military Museum as the "Unit Roster" of each unit | `museum.dmna.ny.gov/unit-history/<arm>/<unit>` then the "Unit Roster" link (`nysmm.org/download_file/view/N`), PDF with an ABBYY FineReader 9 text layer dated 2010; 79 PDFs | the printed Registers are 1890s New York State publications; the museum is a New York State agency site. robots.txt of museum.dmna.ny.gov and nysmm.org disallow only `/application/*` paths. No terms page forbidding automated access was found; the site footer carries a general copyright line ("All rights reserved"). Access: plain GET, 2 s apart, one process at a time, User-Agent `gettysburg-map-research/1.0`. The owner should confirm the footer notice does not restrict republishing the transcription. | FETCHED |
| NY-NYG-ROH | New York at Gettysburg, Final Report of the Battlefield of Gettysburg, New York Monuments Commission (Albany, 1900), vol I and II, the Roll of Honor "Names of Soldiers in New York Regiments and Batteries Who were Killed or Mortally Wounded", compiled from the Second Auditor pay rolls, the Albany muster-out rolls and the National Cemetery burial list | Internet Archive `newyorkatgettysb0001unse` (djvu.xml word boxes and txt; leaves 265-283; page image n265) | no copyright flag set in the item metadata, no access restriction (not a lending item); 1900 state publication | FETCHED, parsed from OCR word boxes |
| NY-IA-AGR2 | Annual Report of the Adjutant-General of New York for 1901, Registers of the 75th-80th Infantry (Google scan, OCR by Google) | Internet Archive `annualreportadj02unkngoog` | NOT_IN_COPYRIGHT, no access restriction | FETCHED, used as an independent second OCR of the 76th, 77th, 78th and 80th Registers |
| NY-PHIST | "Battles and Casualties from Phisterer" tables (Phisterer, New York in the War of the Rebellion, 1912) as published per unit by the New York State Military Museum (xlsx transcription and a PDF scan) | same unit pages as NY-NYSMM-REG; 160 files | as NY-NYSMM-REG | FETCHED; the Gettysburg row of the xlsx read into `reconciliation.json` |
| NY-OR27 | Official Records vol 27 part 1 (organisation, to confirm which New York units were at Gettysburg) | already in `tmp/bt/rosters/cache/or27_1.txt` (Internet Archive `warofrebellion012701rootrich`) | public domain | READ, not re-fetched |
| not used | NYSMM "Muster Roll" PDFs (HathiTrust scans of 1861 muster-in sheets; one probe fetched) and the 1864 volumes "A record of the commissioned officers, non-commissioned officers and privates of the regiments ... New York" (Internet Archive `recordofcommis*`, `cu31924092925*`, 10 text files fetched) | | public domain | muster-in data only (no 1863 status); not parsed, see G-NY7 |
| not used | `annualreportadj00unkngoog` (114th Infantry), `annualreportadj01unkngoog` (1st and 2nd Veteran Cavalry, 1st and 2nd Mounted Rifles), `annualreportadj06offigoog` (7th and 8th Artillery) | Internet Archive | NOT_IN_COPYRIGHT | none of these units was at Gettysburg or is in the OOB |

Not touched: FamilySearch, Fold3, Ancestry, Find a Grave, NPS Soldiers and Sailors System, HathiTrust page service, and any host that answered a challenge. No request was refused, challenged or blocked (no 403, no bot page, no login) in this family.

## Parse method

1. `pipeline/ny_build.py` reads each PDF text layer with PyMuPDF, repairs the ABBYY letter-spacing ("A p r i l" to "April"), removes page furniture, splits the stream into entries at the printed form `SURNAME, GIVEN.--Age, ...` (also cross-reference lines "X, see Y", which become `Duplicate-Xref` rows) and records the PDF page index of each entry (`source_page_pdf`, 0-based; the page image is that page of the cached PDF).
2. `pipeline/ny_register.py` reads each entry as a list of semicolon clauses (enlistment, muster-in, transfers, wounds, captures, discharges...) with OCR-tolerant dates. A year read as 1802 or 1805 is repaired to 186x only if the dates of the entry stay in order; any other implausible year makes that date unreadable. A date that contradicts the entry order (a separation earlier than the muster-in) is not used.
3. Labels follow PLAN 2.2, first rule that fires. Basis codes used: `CAS-REMARK` (killed, wounded, captured or missing at Gettysburg in the Register text), `CAS-REMARK-DATE` (casualty dated 1 to 3 July 1863 with no place printed), `GB-PLACE-DATE` (any event, for example desertion, placed at Gettysburg on 1 to 3 July 1863; Present-Documented because the Register places him there on those days), `ROH-LIST` (named on the 1900 Roll of Honor), `SEP-BEFORE`, `ENL-AFTER`, `ABS-NOTATION` (the Register says he was absent since a date before the battle; roll_status `absent-notation`), `CONFLICT` and `OCR-CONFLICT` (two sources, or two OCR readings, disagree: Unknown, roll_status `contested`, both cited in `cross_source`), `NO-RECORD-AFTER`, `DATE-NOT-PRINTED`, `OCR-DATE-LOST`, `ONROLL-NO-STATUS`. A man "attached to" another New York unit before the battle keeps `Unknown` and gets `attached_to_unit_id` (the 33rd NY three-year men were attached to the 49th NY in May 1863).
4. Roll of Honor merge (`pipeline/ny_roh.py`): each OCR line of the Roll is matched to a Register row of the same unit only when surname (similarity 0.88 or better, same first letter), first given name (0.8 or better) and company (when legible) agree and exactly one row qualifies. Matches confirm a Present-Documented row, upgrade an Unknown row, or turn an Absent-Documented row into a `contested` Unknown. A Roll line with a readable name and no Register row is added as a `roll-of-honor-only` row; all other lines are listed in `roh_unresolved.csv`.
5. Second OCR (`pipeline/ny_xocr.py`): for the 76th, 77th, 78th and 80th NY the Google OCR of the same printed Registers is parsed with the same rules and paired with the museum rows (strict key first, then looser keys, only one-to-one pairs). Agreeing labels are flagged `second-ocr-agrees`; one reading without evidence where the other has some is `second-ocr-soft-disagrees` (kept); Present against Absent is `second-ocr-hard-disagrees` and becomes a contested Unknown.
6. Artillery: the 1st New York Light Artillery Register covers all batteries; a man belongs to the battery of his muster-in unless a `transferred to Battery X` clause dated on or before 3 July 1863 moves him (the 2nd Independent Battery men moved to Battery I on 6 June 1863). Batteries C, D, G, L and M are OOB entries; B, I and K are extras from OR 27/1.
7a. Repairs made by the independent audit (details, counts and the frozen pre-audit copy in `AUDIT.md` and `_pre_audit/`): entry headers with an O-apostrophe, `Mc`, `Me` or `Mac` prefix, `JR.` before the given name, garbled letters in the name, or a stray mark before the given name are now recognised (before, about 1,500 men were glued onto the previous man and the previous man took their remarks and label); the commission sentence at the end of an officer entry is no longer read as an event; a separation followed by a re-muster or return is Unknown `SEP-THEN-RETURN`, not Absent; a Gettysburg casualty or place remark in an entry that enters the regiment after the battle is Unknown `CONFLICT` (contested); enlistment and muster-in dates more than 120 days apart, a date before the unit existed, and a mustering-out year that differs from the unit mode are unreadable (Unknown `OCR-DATE-LOST`); transfers between batteries of the 1st NY Light Artillery are not separations; a Roll of Honor match never upgrades a row dated after the battle; `rank_as_printed` is reduced to the rank word.
7. `pipeline/ny_names.py` flags a surname printed once that is one edit away from one printed three or more times (`name-variant-suspect`); nothing is corrected. `pipeline/ny_finish.py` writes the reconciliation and statistics.

## Quality

* OCR text layer (ABBYY 2010): names, ages and dates are the largest error source. Flags: `name-suspect` 252 rows, `name-variant-suspect` 4038, `initial-split` 20841 (a middle initial fused to the given name and split by a dictionary rule), `entry-date-unreadable` 4089, `date-year-only` 761.
* Second OCR (76th, 77th, 78th, 80th NY): 4781 rows paired; label agrees on 3934 (82.3 percent), soft difference 839 (17.5 percent), hard difference 8 (0.2 percent, carried as contested). Rows with no pairing: 2055.
* Roll of Honor: 1577 OCR lines in the 72 unit sections read; 1279 carry a readable name; 314 matched to a Register row (304 confirm a row already Present-Documented, 5 upgrade an Unknown row, 5 contradict an Absent-Documented row); 42 readable lines with no Register row added; 923 lines unresolved or ambiguous (`roh_unresolved.csv`). The Roll lists about 1,000 killed or mortally wounded men; its OCR text layer is poor (many words with confidence 0), so the unresolved share is large and is a gap (G-NY5), not a count of men missing from the Roll.
* Phisterer Gettysburg aggregate casualties were read for 78 units (72 with both figures). Named casualty rows (`CAS-REMARK`, `CAS-REMARK-DATE`, `ROH-LIST`) divided by the Phisterer aggregate: median 0.77, range 0.00 to 2.00 (Computed). R-G5 asks for 0.98: the Registers annotate Gettysburg casualties for some regiments and not for others (for example the 102nd NY: 11 Present-Documented rows against a Phisterer aggregate in `reconciliation.json`), so casualty names are far from complete (gap G-NY6). Units where the named casualty rows exceed the Phisterer aggregate (both numbers kept in `reconciliation.json`; the unit status stays Short because the named present men are fewer than the documented strength S_doc): U-107NY-XII, U-ART-5NY.
* Page-image check: see `QA-SAMPLE.md` (builder, not independent) and `AUDIT.md` (independent audit of 30 October 2026, seed 41, 60 rows: about 91 percent of names exact against the page image, 2 hard label errors in 60 before the repairs; R-G1, R-G2, R-G3 and R-G9 are NOT met).

## What is missing and why

* `GAPS.md`, section "NY family", lists G-NY1 to G-NY10. In short: the Registers of the 61st and 71st NY are image-only PDFs (no OCR engine installed, owner decision G02); the Register has no status for 30 June 1863, so 39747 men are on-roll-undetermined; 7789 rows have a date the text layer garbled; Roll of Honor lines are mostly unresolved; Gettysburg casualty annotation in the Registers is incomplete against Phisterer; U-107NY, U-11NY, U-33NY, U-ART-C1NY and U-ART-NYC are OOB entries that need an owner check (see below); the OOB file lacks the 120th NY and Batteries B, I, K of the 1st NY Light.

### OOB observations for the owner (the OOB file was not edited)

* `U-107NY` (I Corps, Paul's brigade, 122 men): OR 27 part 1 lists the 107th PENNSYLVANIA in that brigade; the 107th New York is `U-107NY-XII` (Colgrove). No roster built for `U-107NY`.
* `U-11NY` (Fire Zouaves, 216 men, Carr's brigade, III Corps): the Register of the 11th New York shows the regiment mustered out with company on 2 June 1862 (446 entries); the same brigade lists the 11th New Jersey. The Register roll is built as printed and every row is labelled by the rules (nearly all Absent-Documented).
* `U-33NY` (68 men): the Register shows the regiment mustered out on 2 June 1863; its three-year men were attached to the 49th NY in May 1863 (`attached_to_unit_id`); the OOB strength of 68 is consistent with that detachment but this was not verified against a primary source.
* `U-ART-C1NY`: OR 27/1 places Battery C, 1st NY Light (Barnes) with the V Corps; the OOB lists it with the Artillery Reserve.
* `U-ART-NYC` ("New York Battery C (Roemer's)", Taft's brigade): not in the OR 27/1 organisation of that brigade, and the name Roemer does not occur in the OR 27/1 text held in the repository; no roster built.
* Missing from the OOB file although OR 27/1 lists them: the 120th NY (Brewster's brigade) and Batteries B, I and K of the 1st NY Light Artillery; built as `EXTRA-*` files.

## Reproduce

`python -I -X utf8 pipeline/ny_build.py` (all units, about 7 minutes at below-normal priority), then `ny_names.py`, `ny_finish.py`, `ny_readme.py`. Inputs are the cached files under `tmp/library/rosters/NY/` (not committed, 650 MB) listed with sha256 in `acquired.json`; the download helpers are in `pipeline/ny_dl/` (plain GET loops, see its README). Requires PyMuPDF.
