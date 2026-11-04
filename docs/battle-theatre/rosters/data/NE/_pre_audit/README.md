# NE family roster data: Maine, Massachusetts, New Hampshire, Vermont

Built 30 October 2026 by the roster NE run, under DEC-019 (the owner: roster information is public and Claude obtains it itself from public sources; no permission requests). Open sources only. No account, login, licence acceptance, key or bot-block circumvention was used. Nothing here is product data yet: every row carries its source, locator and the rule that set its label (PLAN section 2.2). Labels never use Present-Probable (PLAN 2.4: a roll-only man cannot be given a probability).

## Result (Measured)

* Units in the repository OOB for this family: **47** (37 infantry regiments, 3 cavalry regiments, 7 batteries).
* Units with names: **36**. Not covered: **11** (the 8 Vermont infantry regiments and 1st Vermont Cavalry, whose only open source was unreachable; and two OOB batteries whose identity does not match any Massachusetts battery in the Official Records, see Gaps).
* Rows (names, one per man per printed entry): **51170**. Rows whose label is limited by an unreadable or ambiguous date: **1306 (2.5 percent)**. Rows whose name text contains non-letter characters (OCR damage flagged `name-garbled`): 2006.
* Share by label: Unknown 38.1 percent; Absent-Documented 48.8 percent; Present-Documented 12.2 percent; Duplicate-Xref 0.9 percent.

## Files

`massachusetts/*.csv` (21 files: 17 infantry, 1st Cavalry, 3rd, 5th and 9th Batteries, and an UNMAPPED 1st Battery file), `maine/*.csv` (11 files), `new-hampshire/*.csv` (4 files), `maine/pilot-corrections-20th-maine-fs-rows.csv`, `stats.json` (per unit and family), `acquired.json` (every file fetched with URL, bytes, sha256, UTC time, status, including the failures), `progress.md`, `QA-SAMPLE.md`. Scripts: `tmp/bt/rosters/NE/scripts/` (copied to `docs/battle-theatre/rosters/pipeline/NE/`). Cache: `tmp/library/rosters/NE/` (131.7 MB in total, limit 1.5 GB).

## Columns (superset of rosters/pilot/)

`unit_id` (OOB id), `regiment`, `company` (A-M, FS field and staff, NCS non-commissioned staff, BAND, UNASSIGNED, BTY battery, `?x` when the printed company token is illegible), `section`, `name_as_printed` (as OCR gave it, never corrected), `name_clean` (given name first), `rank_as_printed`, `rank_class`, `age`, `residence`, `enlisted_or_commissioned` (ISO date from the first enlistment, commission, draft, muster or transfer-in date, with a precision note; the raw muster text for Maine), `remarks_as_printed` (the whole printed entry), `presence_label` (Present-Documented, Absent-Documented, Unknown, Duplicate-Xref), `presence_basis` (words), `basis_code` (PLAN 2.2 code: CAS-REMARK, CAS-REMARK-DATE, PART-LIST, SEP-BEFORE, ENL-AFTER, CONFLICT, ONROLL-NO-STATUS, OCR-DATE-LOST, DATE-NOT-SHOWN, TRANSF-WITHIN-REGT, XREF-ONLY), `roll_status`, `evidence_label`, `dup_group`, `source_id`, `source_locator`, `parse_flags`.

## Sources used

| id | identifier | what was taken | rights status recorded |
|---|---|---|---|
| MA-SSM-1931-v1, v2, v3, v5, v6 | Internet Archive `massachusettssol11931mass`, `...21931mass`, `...31931mass`, `...51931mass`, `...61931mass` (also vol 4, 7 and the 1937 index fetched, not used; vol 8 returned HTTP 500 and is Navy only) | Massachusetts Soldiers, Sailors, and Marines in the Civil War, compiled and published by the Adjutant General under Chapter 475, Acts of 1899 and Chapter 64, Resolves of 1930; Norwood Press 1931-33. Volumes are by regiment: vol 1 has the 1st, 2nd, 7th, 9th, 10th; vol 2 the 12th to 22nd; vol 3 the 28th to 37th; vol 5 the batteries; vol 6 the cavalry | **Copyright status checked (not legal advice).** Each item's metadata: `possible-copyright-status` NOT_IN_COPYRIGHT, no `access-restricted-item`, contributor UMass Amherst Libraries. The OCR text of all eight 1931-37 volumes has no copyright notice (0 hits for "copyright", "all rights reserved"); the title page names a state official publisher and no copyright holder. A work published in the US in 1931-37 without a notice is in the public domain (notice was required until 1978). The owner can overrule; the page images were not inspected for a notice on the verso |
| NH-AYLING-1895-v1, v2 | IA `cu31924096263128` (regiments 1-11 and the volume with the 2nd and 5th), `cu31924096263136` (12th and the 1st Light Battery) | Ayling, Revised Register of the Soldiers and Sailors of New Hampshire (1895), complete record per man, alphabetical per regiment | IA item text: "There are no known copyright restrictions in the United States on the use of the text" (Cornell). State publication of 1895 |
| ME-AGR-1863-AppD | IA `annualreportofad1863main` | Maine Adjutant General's report for 1863, Appendix D, company returns of 1 Dec 1863 (1 Nov 1863 for some), every change since 1 Nov 1862, for the 3rd to 7th, 16th, 17th, 19th and 20th Maine, the 1st Maine Cavalry and the 2nd Maine Battery | Public-domain state publication. File downloaded 19 Oct 2026 by the pilot, re-hashed 30 Oct |
| ME-GETT-1898 | IA `maineatgettysbur01main` | Maine at Gettysburg (1898), Participants lists by company for the 3rd, 4th, 5th, 6th, 7th, 16th, 17th, 19th and 20th Maine and 1st Maine Cavalry | Public domain (1898) |
| OR-27-1 | cached copy from the pilot | only to test OOB identities (reports index) | US government publication |

Not used, by rule: Digital Maine (bot challenge), FamilySearch, Fold3, Ancestry, Find a Grave, HathiTrust, NPS CWSS.

## Presence labels (PLAN 2.2, applied in order)

1. Present-Documented: the printed remark names Gettysburg with a wound, death, capture or similar event (CAS-REMARK), or a casualty event dated 1-3 July 1863 (CAS-REMARK-DATE), or the man is named on the 1898 Maine participants list (PART-LIST). Remarks that name Gettysburg but date a separation before 1 July (a desertion "at Gettysburg" on 30 June, for example) are Unknown, CONFLICT, not Present.
2. Absent-Documented: enlisted, drafted, commissioned or transferred in after 3 July 1863 (ENL-AFTER; for Maine the "joined since 1 Nov 1862" section with a muster month of July (after the 3rd) to October); or a separation dated before 1 July 1863 (SEP-BEFORE: discharge, desertion, death, resignation, transfer to another organization, muster out). A desertion with a later dated return is judged on the return date.
3. Unknown, on-roll-undetermined: enlisted before, no separation before, no statement for 1-3 July. Wounded-in-1863-place-not-stated is flagged. No muster roll of 30 June 1863 was available (G01), so this is the largest honest class.
4. Unknown, unreadable-or-ambiguous: a date or remark could not be read or decided (month-only July 1863, year garbled, separation without date, return after desertion before the battle, conflicts).
5. Duplicate-Xref: Ayling cross-reference rows that carry no dates ("Co. A. See 10 N. H. V."), and Massachusetts rows transferred to another company of the same regiment before the battle (presence judged on the destination row, dup_group joins them).

Conflicts are carried, not resolved: the Maine participants lists name more men than the strength present in every case (see below).

## Reconciliation (PLAN 2.3)

S_doc is the repository OOB strength, which is second-hand (Busey and Martin via the OOB file; G15), so the status is provisional. Contested (named present above strength): the 3rd, 4th, 6th, 7th, 16th, 17th, 19th and 20th Maine and the 1st Maine Cavalry. The same pattern the pilot found for the 20th Maine (about 575 names on the 1898 list against 386 in Chamberlain's report): the 1898 lists include men present sick, on special duty or detached, the pioneers and the provost guard; the 30 June 1863 muster roll would settle it. Short: all Massachusetts and New Hampshire units (the state rosters name only casualties as present). Per-unit counts of casualty-remark rows against the OOB casualty figure are in `stats.json` (`cas_remark_rows`, `oob_casualties`); the OOB casualty figure is itself not reliable (for example 133 for the 9th Massachusetts against 18 named, 0 for the 37th and 7th Massachusetts).

## Per-unit counts

| unit | OOB strength (second-hand) | rows | Present-Documented | Absent-Documented | Unknown (on roll) | Unknown (unreadable) | Duplicate-Xref | reconciliation | file |
|---|---|---|---|---|---|---|---|---|---|
| 10th Massachusetts Volunteer Infantry | 286 | 1251 | 7 | 594 | 639 | 11 | 0 | Short | massachusetts/10th-massachusetts-volunteer-infantry.csv |
| 12th Massachusetts Volunteer Infantry | 261 | 1590 | 124 | 946 | 496 | 24 | 0 | Short | massachusetts/12th-massachusetts-volunteer-infantry.csv |
| 12th New Hampshire Volunteer Infantry | 224 | 1336 | 95 | 657 | 536 | 38 | 10 | Short | new-hampshire/12th-new-hampshire-volunteer-infantry.csv |
| 13th Massachusetts Volunteer Infantry | 284 | 1443 | 191 | 793 | 424 | 35 | 0 | Short | massachusetts/13th-massachusetts-volunteer-infantry.csv |
| 13th Vermont Volunteer Infantry | 649 | 0 | | | | | | NOT COVERED | see Gaps |
| 14th Vermont Volunteer Infantry | 647 | 0 | | | | | | NOT COVERED | see Gaps |
| 15th Massachusetts Volunteer Infantry | 239 | 1726 | 155 | 1086 | 471 | 14 | 0 | Short | massachusetts/15th-massachusetts-volunteer-infantry.csv |
| 16th Massachusetts Volunteer Infantry | 243 | 1367 | 81 | 742 | 518 | 26 | 0 | Short | massachusetts/16th-massachusetts-volunteer-infantry.csv |
| 16th Maine Volunteer Infantry | 298 | 1546 | 424 | 474 | 600 | 48 | 0 | Contested | maine/16th-maine-volunteer-infantry.csv |
| 16th Vermont Volunteer Infantry | 612 | 0 | | | | | | NOT COVERED | see Gaps |
| 17th Maine Volunteer Infantry | 350 | 1289 | 515 | 299 | 441 | 34 | 0 | Contested | maine/17th-maine-volunteer-infantry.csv |
| 18th Massachusetts Volunteer Infantry | 139 | 1371 | 21 | 737 | 546 | 67 | 0 | Short | massachusetts/18th-massachusetts-volunteer-infantry.csv |
| 19th Massachusetts Volunteer Infantry | 163 | 1936 | 82 | 1403 | 387 | 64 | 0 | Short | massachusetts/19th-massachusetts-volunteer-infantry.csv |
| 19th Maine Volunteer Infantry | 439 | 1348 | 606 | 372 | 333 | 37 | 0 | Contested | maine/19th-maine-volunteer-infantry.csv |
| 1st Massachusetts Volunteer Infantry | 321 | 1695 | 136 | 900 | 633 | 26 | 0 | Short | massachusetts/1st-massachusetts-volunteer-infantry.csv |
| 1st Massachusetts Cavalry | 421 | 2336 | 3 | 1251 | 1064 | 18 | 0 | Short | massachusetts/1st-massachusetts-cavalry.csv |
| 1st Maine Cavalry | 421 | 1654 | 614 | 137 | 844 | 59 | 0 | Contested | maine/1st-maine-cavalry.csv |
| 1st Vermont Cavalry | 611 | 0 | | | | | | NOT COVERED | see Gaps |
| 20th Massachusetts Volunteer Infantry | 243 | 2482 | 130 | 1863 | 467 | 22 | 0 | Short | massachusetts/20th-massachusetts-volunteer-infantry.csv |
| 20th Maine Volunteer Infantry | 386 | 1356 | 528 | 254 | 524 | 50 | 0 | Contested | maine/20th-maine-volunteer-infantry.csv |
| 22nd Massachusetts Volunteer Infantry | 137 | 1450 | 34 | 972 | 434 | 10 | 0 | Short | massachusetts/22nd-massachusetts-volunteer-infantry.csv |
| 28th Massachusetts Volunteer Infantry | 224 | 2065 | 107 | 1479 | 460 | 19 | 0 | Short | massachusetts/28th-massachusetts-volunteer-infantry.csv |
| 2nd Massachusetts Volunteer Infantry | 316 | 2013 | 138 | 1228 | 622 | 25 | 0 | Short | massachusetts/2nd-massachusetts-volunteer-infantry.csv |
| 2nd New Hampshire Volunteer Infantry | 354 | 2379 | 157 | 1385 | 445 | 44 | 348 | Short | new-hampshire/2nd-new-hampshire-volunteer-infantry.csv |
| 2nd Vermont Volunteer Infantry | 374 | 0 | | | | | | NOT COVERED | see Gaps |
| 32nd Massachusetts Volunteer Infantry | 263 | 2168 | 88 | 1474 | 588 | 18 | 0 | Short | massachusetts/32nd-massachusetts-volunteer-infantry.csv |
| 33rd Massachusetts Volunteer Infantry | 527 | 1282 | 46 | 408 | 823 | 5 | 0 | Short | massachusetts/33rd-massachusetts-volunteer-infantry.csv |
| 37th Massachusetts Volunteer Infantry | 590 | 1310 | 47 | 475 | 776 | 12 | 0 | Short | massachusetts/37th-massachusetts-volunteer-infantry.csv |
| 3rd Maine Volunteer Infantry | 210 | 1379 | 346 | 427 | 537 | 69 | 0 | Contested | maine/3rd-maine-volunteer-infantry.csv |
| 3rd Vermont Volunteer Infantry | 349 | 0 | | | | | | NOT COVERED | see Gaps |
| 4th Maine Volunteer Infantry | 287 | 1317 | 363 | 293 | 572 | 89 | 0 | Contested | maine/4th-maine-volunteer-infantry.csv |
| 4th Vermont Volunteer Infantry | 320 | 0 | | | | | | NOT COVERED | see Gaps |
| 5th Maine Volunteer Infantry | 395 | 1082 | 372 | 119 | 551 | 40 | 0 | Short | maine/5th-maine-volunteer-infantry.csv |
| 5th New Hampshire Volunteer Infantry | 179 | 2351 | 46 | 1713 | 433 | 73 | 86 | Short | new-hampshire/5th-new-hampshire-volunteer-infantry.csv |
| 5th Vermont Volunteer Infantry | 313 | 0 | | | | | | NOT COVERED | see Gaps |
| 6th Maine Volunteer Infantry | 381 | 1297 | 474 | 212 | 561 | 50 | 0 | Contested | maine/6th-maine-volunteer-infantry.csv |
| 6th Vermont Volunteer Infantry | 230 | 0 | | | | | | NOT COVERED | see Gaps |
| 7th Massachusetts Volunteer Infantry | 359 | 1171 | 9 | 532 | 615 | 15 | 0 | Short | massachusetts/7th-massachusetts-volunteer-infantry.csv |
| 7th Maine Volunteer Infantry | 225 | 1256 | 252 | 236 | 610 | 158 | 0 | Contested | maine/7th-maine-volunteer-infantry.csv |
| 9th Massachusetts Volunteer Infantry | 412 | 1650 | 18 | 947 | 662 | 23 | 0 | Short | massachusetts/9th-massachusetts-volunteer-infantry.csv |
| 1st New Hampshire Battery | 107 | 173 | 2 | 71 | 95 | 3 | 2 | Short | new-hampshire/1st-new-hampshire-volunteer-light-battery.csv |
| 2nd Maine Battery (Hall's Battery) | 107 | 186 | 3 | 35 | 139 | 9 | 0 | Short | maine/2nd-maine-battery-hall-s-battery.csv |
| 5th Massachusetts Battery (E) | 104 | 329 | 16 | 151 | 100 | 62 | 0 | Short | massachusetts/5th-battery-massachusetts-volunteer-light-artillery-battery-e.csv |
| 9th Massachusetts Battery (Bigelow's) | 104 | 329 | 29 | 192 | 108 | 0 | 0 | Short | massachusetts/9th-battery-massachusetts-volunteer-light-artillery.csv |
| Battery C, 1st Massachusetts Artillery | 107 | 257 | 6 | 104 | 138 | 9 | 0 | Short | massachusetts/3rd-battery-massachusetts-volunteer-light-artillery-battery-c.csv |
| Massachusetts Battery E (10th) | 107 | 0 | | | | | | NOT COVERED | see Gaps |
| Massachusetts Battery F | 67 | 0 | | | | | | NOT COVERED | see Gaps |

## Parse methods

* Massachusetts: OCR plain text of the volumes (ABBYY, from the IA `_djvu.txt`). Running heads give the regiment (ordinal matched with edit distance) and the book page; `COMPANY "X"` lines give the company (a garbled letter is inferred from the A-K sequence); an entry is a line `Name -- Rank -- Res. ...` and the lines up to the next entry. Remarks are split on semicolons, dates parsed with an OCR-tolerant month and year reader (`1S63`, `Jany.`, `Julj'`), event kinds from the abbreviations. Entry counts agree with an independent count of the `-- Rank -- Res.` pattern within 1 percent for every regiment (largest gap 18 of 1,371 for the 18th, whose Company D-E pages are badly OCR'd).
* New Hampshire: entries are `Surname, Given. Co. X; b. ...; age; res./cred.; enl. ...; must. in ...; events ... P. O. ad., ...`. A gap of four or more spaces marks a sentence break in the OCR text; post-war death and address sentences (year 1867 or later) are ignored for labelling; apostrophe years `'61` and OCR forms (`'01`, `'6'1`) are read as 1861-66. Entries swallowed into the previous one are split again when the next entry's surname, given name and Co. token are recognisable.
* Maine: the pilot coordinate parser (rosters/pipeline/me_parse.py and meg_parse.py), generalised to page ranges (me_gen.py): word boxes from the IA `djvu.xml`, columns by a per-page scale, sections by their headings, the company from the page heading or, when it is garbled, the next letter in sequence; the 1898 participants list split by column and matched to return rows by surname, given name and initials in the same company, then across companies at a stricter score (flag `company-differs-between-return-and-participants-list`). Unmatched participants are kept as rows (`participants-only`, flag `no-return-row`). Only the 1 December 1863 return is available, so a man who left after the battle and before December carries no trace of being present.
* 20th Maine: the pilot rows are reused (rosters/pilot/20th-maine.csv, 1,306 return rows and 50 participant-only rows), with the pilot defect below removed, the joined-after-July rule and an OCR-tolerant Gettysburg rule applied, and the 20th's own present organization of field and staff (IA page 822) added.

## Pilot defect found and corrected

The pilot's 20th Maine field and staff rows from IA page 791 (the first 11 of 28 rows: Cunningham, Welch, Haskell, Billings, Bolan, Parker, Hathaway, Wadsworth, Eaton, Knowlton, Dodge) are the **Present Organization of Field and Staff of the 19th Maine**: the page image (book p.571) shows the 19th's table above the heading "TWENTIETH REGIMENT INFANTRY", and the 20th's return starts below it. Those 11 rows are removed from the 20th Maine file and listed in `maine/pilot-corrections-20th-maine-fs-rows.csv`; the 19th Maine file carries the same table from its own parse. The 20th's present organization (Chamberlain, Gilmore, Spear ...; book p.602) was not in the pilot and is added (section `fs-present-organization`). George A. Wadsworth, Sergeant Major, "wd. July 2", is therefore a 19th Maine man.

## OCR quality and quality check (Measured by the author; not the independent test of PLAN 4.4)

`QA-SAMPLE.md` records three page-image checks, 132 rows in all. No enlisted man received a false Present or Absent label after the two rule fixes the check itself exposed (Maine: "joined" men with July to October muster dates, and an OCR garble "Wonnd. at Gettysburg"). Name transcription errors from the text layer: about 1 in 13 on the New Hampshire and Maine pages checked (Ooyle for Coyle, Cvirrier for Currier, Zeeman for Leeman), none on the Massachusetts page. The R-G1 name gate (99 percent) is therefore **not met** by the text layer; a second OCR or image reading is still required (G02), and no OCR engine was installed. The 18th Massachusetts has a badly damaged scan region (Companies D and E: rows like `Rea.`, `1S61`, `eoL`; flag `ocr-poor-text`).

## What is missing and why

* **Vermont (8 infantry regiments and the 1st Cavalry, 3,494 men plus cavalry in the OOB): not obtained.** The only open full roster found on the Internet Archive is Revised Roster of Vermont Volunteers (1892), item `cu31924080774148` (the Cornell copy, no known copyright restriction). Every request for any file of that item (`_djvu.txt`, `_djvu.xml`, `_hocr_searchtext.txt.gz`, `_files.xml`, `_meta.xml`, the item page, the metadata API) answered HTTP 503 or timed out, repeatedly over more than an hour on 30 October 2026, while other items on the same host answered normally. Recorded as a failed lookup in `acquired.json`, not as absent data. A background retry (240 s apart, 12 attempts) was left running; if it succeeds the Vermont parse (entries by company, Peck's format) is the next step. Searched and not sufficient: Benedict's Vermont in the Civil War (histories, no rosters), Sturtevant's Pictorial History of the 13th Vermont (1910; the roster is a folded table whose OCR text is unusable), the 1866 Adjutant and Inspector General's report (950 KB text, no company rosters found), regimental reunion rosters of survivors.
* **Two OOB batteries not mapped**: `U-ART-MAF` ("Massachusetts Battery F", Captain Timothy Regan) and `U-ART-MAE` ("Massachusetts Battery E (10th)", Captain Josiah Porter) match no Massachusetts battery at Gettysburg in the Official Records. OR 27 part 1 lists Massachusetts Light 1st Battery (A) Captain William H. McCartney, 3rd (C) Lieutenant Aaron F. Walcott, 5th (E) Captain Charles A. Phillips and 9th Captain John Bigelow. A Timothy Regan appears in the Massachusetts volumes only as a private enlisted November 1863, and Josiah Porter as a Captain of the 1st Battery. The OOB id `U-ART-C1MA` ("Battery C, 1st Massachusetts Artillery", Walcott) was mapped to the 3rd Battery (C) because Walcott is on that roster and in the OR. The 1st Battery roster (265 rows, no Gettysburg casualty remark) is delivered as `massachusetts/1st-battery-...-unmapped.csv` with unit_id `UNMAPPED-1MA-BTY`; the owner decides the OOB mapping.
* **Units at Gettysburg that the repository OOB lacks** (so no unit_id exists and no rows are published): the 11th Massachusetts (report by Lt. Col. Porter D. Tripp), the 5th Maine Battery (Whittier) and 6th Maine Battery (Dow), named in the OR 27 part 1 index of reports (rows 162, 73 and 331 of the report list). Maine at Gettysburg has participants lists for the two Maine batteries and the Massachusetts volumes have the 11th (vol 1) and batteries; they can be added when the OOB gains rows.
* **2nd Maine Battery (Hall's)**: only the 1863 return (186 rows); Maine at Gettysburg prints a roster of the battery, not a participants list, in a multi-column dated table (book pp.35-38) not yet parsed. 3 rows carry Present-Documented from the return remarks.
* **Maine 1864-65 final roster** (G03) is still not obtainable: the 3rd to 20th Maine rows are the 1 December 1863 status; men wounded at Gettysburg who returned by December carry no remark.
* **No muster roll of 30 June 1863** for any unit (G01): Unknown on-roll rows cannot be resolved. Massachusetts and New Hampshire name only casualties as present; Maine adds the participants lists.
* **Identity**: same-name rows within a unit are flagged `duplicate-group`, not merged (Massachusetts lists men once per company they served in).
* **Officers and staff** need their own evidence pass (G07): the labels above are by the printed remarks only.
