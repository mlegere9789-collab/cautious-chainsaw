# C-NCLA: Confederate North Carolina and Louisiana rosters

Built 30 October 2026 under owner decision DEC-019 (public information, no permission requests; Claude obtains it from open sources). Nothing here is product data yet; it is the measured output of the scripts in `scripts/`. Every row keeps the entry text exactly as printed, a source locator and the rule that set its label (PLAN section 2.2).

## Coverage (Measured)

* Units in the order of battle for this family: 50 (33 NC infantry regiments and battalions, 10 LA infantry regiments, 2 NC batteries Manly and Reilly, 5 LA batteries: Maurin and the 4 Washington Artillery companies). Units with names: 50. The OOB file has no NC or LA cavalry.
* Rows: 57,801 (NC 49,400, LA 8,401), plus 592 withheld rows in `units/C-1LA-T_excluded-unit-unresolved.csv`.
* Labels: Present-Documented 5,316 (9.2 percent), Absent-Documented 13,889 (24.0 percent), Unknown 38,596 (66.8 percent). No Present-Probable (no model, PLAN 2.2 rule 11).
* roll_status counts: {"unreadable-or-ambiguous": 12560, "on-roll-undetermined": 25866, "off-roll-before-battle": 10734, "not-yet-enlisted": 2483, "named-present": 5316, "absent-on-30-june-roll": 672, "contested": 170}. Unreadable-or-ambiguous share 21.7 percent (Moore: undated separation or missing enlistment date; Booth: no legible enlistment date).
* Rows with a flagged garbled name: 3,260 (5.6 percent). Names are never corrected.
* Many Moore rows are the same man listed once per rank or company (same-name rows are grouped by `dup_group`, not merged); the named counts are rows, not persons.

| unit_id | designation | source | rows | Present-Doc. | Absent-Doc. | Unknown | name-flagged | OOB strength |
|---|---|---|---|---|---|---|---|---|
| C-1NC | 1st North Carolina Infantry | emory | 1623 | 71 | 365 | 1187 | 96 | 359 |
| C-2NC | 2nd North Carolina Infantry | emory | 1379 | 30 | 354 | 995 | 70 | 247 |
| C-3NC | 3rd North Carolina Infantry | emory | 1709 | 177 | 427 | 1105 | 70 | 479 |
| C-4NC | 4th North Carolina Infantry | emory | 1615 | 21 | 111 | 1483 | 95 | 252 |
| C-5NC | 5th North Carolina Infantry | emory | 1822 | 175 | 323 | 1324 | 93 | 473 |
| C-6NC | 6th North Carolina Infantry | emory | 1814 | 126 | 497 | 1191 | 95 | 443 |
| C-7NC | 7th North Carolina Infantry | emory | 1529 | 67 | 455 | 1007 | 51 | 400 |
| C-11NC | 11th North Carolina Infantry | emory | 1408 | 306 | 266 | 836 | 56 | 617 |
| C-12NC | 12th North Carolina Infantry | emory | 1566 | 40 | 294 | 1232 | 67 | 219 |
| C-13NC | 13th North Carolina Infantry | emory | 1469 | 155 | 488 | 826 | 68 | 232 |
| C-14NC | 14th North Carolina Infantry | emory | 1492 | 41 | 396 | 1055 | 59 | 292 |
| C-16NC | 16th North Carolina Infantry | primary | 1456 | 83 | 405 | 968 | 75 | 321 |
| C-18NC | 18th North Carolina Infantry | primary | 1772 | 43 | 509 | 1220 | 97 | 346 |
| C-20NC | 20th North Carolina Infantry | primary | 1214 | 155 | 304 | 755 | 55 | 372 |
| C-21NC | 21st North Carolina Infantry | primary | 1431 | 74 | 287 | 1070 | 64 | 472 |
| C-22NC | 22nd North Carolina Infantry | primary | 1987 | 103 | 619 | 1265 | 78 | 263 |
| C-23NC | 23rd North Carolina Infantry | primary | 1478 | 194 | 408 | 876 | 47 | 406 |
| C-26NC | 26th North Carolina Infantry | primary | 1953 | 515 | 366 | 1072 | 71 | 843 |
| C-28NC | 28th North Carolina Infantry | primary | 1836 | 159 | 510 | 1167 | 57 | 346 |
| C-30NC | 30th North Carolina Infantry | primary | 1546 | 43 | 522 | 981 | 39 | 233 |
| C-32NC | 32nd North Carolina Infantry | primary | 1303 | 104 | 289 | 910 | 33 | 465 |
| C-33NC | 33rd North Carolina Infantry | primary | 1721 | 69 | 416 | 1236 | 32 | 291 |
| C-34NC | 34th North Carolina Infantry | emory | 1351 | 67 | 458 | 826 | 43 | 310 |
| C-37NC | 37th North Carolina Infantry | primary | 1786 | 131 | 542 | 1113 | 29 | 347 |
| C-38NC-S | 38th North Carolina Infantry (Scales's Brigade) | primary | 1284 | 99 | 496 | 689 | 31 | 221 |
| C-43NC | 43rd North Carolina Infantry | primary | 1257 | 127 | 243 | 887 | 17 | 568 |
| C-45NC | 45th North Carolina Infantry | primary | 1448 | 197 | 313 | 938 | 40 | 431 |
| C-47NC | 47th North Carolina Infantry | primary | 1290 | 217 | 227 | 846 | 34 | 567 |
| C-52NC | 52nd North Carolina Infantry | primary | 1317 | 169 | 168 | 980 | 32 | 553 |
| C-53NC | 53rd North Carolina Infantry | primary | 1320 | 86 | 254 | 980 | 36 | 375 |
| C-55NC | 55th North Carolina Infantry | primary | 1220 | 181 | 165 | 874 | 25 | 640 |
| C-57NC | 57th North Carolina Infantry | primary | 1047 | 19 | 253 | 775 | 37 | 326 |
| C-2NC-B | 2nd North Carolina Battalion | primary | 560 | 55 | 47 | 458 | 15 | 240 |
| C-ART-Manly | Manly's Battery (1st NC Artillery) | primary | 187 | 12 | 14 | 161 | 60 | 80 |
| C-ART-Reilly | Reilly's Battery (Rowan Artillery NC) | primary | 210 | 2 | 7 | 201 | 60 | 95 |
| C-1LA-T | 1st Louisiana Infantry | Booth 1920 | 911 | 83 | 201 | 627 | 124 | 177 |
| C-2LA-T | 2nd Louisiana Infantry | Booth 1920 | 828 | 102 | 239 | 487 | 129 | 219 |
| C-5LA | 5th Louisiana Infantry | Booth 1920 | 875 | 128 | 221 | 526 | 156 | 211 |
| C-6LA | 6th Louisiana Infantry | Booth 1920 | 802 | 90 | 220 | 492 | 114 | 218 |
| C-7LA | 7th Louisiana Infantry | Booth 1920 | 809 | 139 | 208 | 462 | 118 | 235 |
| C-8LA | 8th Louisiana Infantry | Booth 1920 | 775 | 147 | 205 | 423 | 131 | 290 |
| C-9LA | 9th Louisiana Infantry | Booth 1920 | 1006 | 147 | 270 | 589 | 160 | 341 |
| C-10LA | 10th Louisiana Infantry | Booth 1920 | 710 | 93 | 98 | 519 | 121 | 226 |
| C-14LA | 14th Louisiana Infantry | Booth 1920 | 694 | 97 | 194 | 403 | 121 | 220 |
| C-15LA | 15th Louisiana Infantry | Booth 1920 | 609 | 78 | 175 | 356 | 115 | 262 |
| C-ART-Maurin | Maurin's Battery (Donaldsonville Artillery LA) | Booth 1920 | 159 | 38 | 19 | 102 | 26 | 80 |
| C-ART-Squires | Squires's Battery (1st Co., Washington Artillery) | Booth 1920 | 67 | 16 | 12 | 39 | 8 | 80 |
| C-ART-Richardson | Richardson's Battery (2nd Co., Washington Artillery) | Booth 1920 | 49 | 9 | 10 | 30 | 4 | 80 |
| C-ART-Miller-WA | Miller's Battery (3rd Co., Washington Artillery) | Booth 1920 | 63 | 22 | 11 | 30 | 4 | 80 |
| C-ART-Norcom | Norcom's Battery (4th Co., Washington Artillery) | Booth 1920 | 44 | 14 | 8 | 22 | 2 | 80 |


## Sources used (identifiers, rights)

| source | IA identifiers | rights |
|---|---|---|
| Moore, Roster of North Carolina Troops, 4 vols, 1882 | rosternorthcaro00moorgoog (v1, Google scan), rosterofnorthcar02nort (v2), rosterofnorthcar03moor (v3), rosterofnorthcar04moor (v4); second scan: 05913252.3309 to 3312.emory.edu | 1882 US publication, public domain by age; v1 flagged NOT_IN_COPYRIGHT, v3 and v4 carry the NC State Library public-domain statement, the others carry no flag; none access-restricted |
| Booth, Records of Louisiana Confederate Soldiers and Louisiana Confederate Commands, 1920 | recordsofl00loui (v1), recordsoflo00loui (v2 pt1), recordsoflouisi00loui (v2 pt2), recordsoflouis00loui (v3 bk1 pt1), recordsofloui00loui (v3 bk1 pt2), recordsoflou00loui (v3 bk2 pt1), recordsoflouisia00loui (v3 bk2 pt2) | 1920 US publication, public domain by age; no copyright flag; none access-restricted |
| 26th NC | pilot `../../pilot/26th-north-carolina.csv` (Moore v2) reused for the strength anchor (Clark 1901: 885 present for duty, `../../pilot/reconciliation.json`); the rows were re-parsed here with the generalised parser (515 Present-Documented against 512 in the pilot) | as above |

Access: plain GET of `/download/<id>/<id>_djvu.txt` and `_djvu.xml`, `/metadata/`, and one advancedsearch query, 2 s or more apart, User-Agent `gettysburg-map-research/1.0`, no login, no key, no cookie. archive.org/robots.txt allows it (disallows only /control/ and /report/; saved as `archive_robots.txt`). Nothing was blocked. One transient HTTP 500 on the Moore v4 xml was retried and succeeded (`acquired.json`). Cache under `tmp/library/rosters/C-NCLA/` (562 MB, 34 files, sha256 in `acquired.json`). FamilySearch, Fold3, Ancestry, Find a Grave, NPS and NARA were not touched.

## Parse method

* Moore: one entry per printed line; entry splitter, company tracking and section headings follow the pilot parser (`scripts/moore_pipeline.py`). Added: unit blocks from a header table per volume (OCR missed some headers: 4th, 6th, 12th to 14th, 21st, 57th, 59th), company letter by sequence with OCR-confusion repair, a lost company heading inferred from an OFFICERS list that follows PRIVATES, notes (`Note.--`) kept out of the entry text, officer-rank recognition to split glued entries, hyphen re-join, repeated-scan detection.
* Booth: entries start at a name-and-rank line (blank lines also fall inside entries); the unit is read from the command phrase in the first 170 characters (`Nth La. Infty.`, `Nth Co. ... Washington Arty.`, `Donaldsonville Arty.`); roll abstracts are parsed token-wise (`scripts/booth_rolls.py`: roll periods, status words, OCR repair of year digits such as 1803 for 1863); dated separation events; Gettysburg named with a casualty or capture word; events dated 1 to 3 July 1863.
* Locators: every row carries `IA id, djvu.txt line, scan page index nN`. The index was computed by aligning the txt lines with the `djvu.xml` pages (0 mismatches in all 13 files); the image is `https://archive.org/download/<id>/page/n<N>_w1500.jpg` (checked on four pages).
* Labels follow PLAN 2.2 in order. Moore has no roll status, so rule 6 cannot fire: a man is Present-Documented only by a Gettysburg casualty, capture or a casualty event dated 1 to 3 July. Booth abstracts the rolls, so rule 6 (30 June 1863 roll Present and the following roll Present) and rule 9 (absent on that roll) fire there; a Present 30 June roll with no following roll stays Unknown (`present-30-june-only`); Present plus an earlier separation is Unknown `contested`.

### Rule changes against the pilot (all push toward fewer false labels)

1. `tr. from` (transfer in) and `tr. to Com.` (between companies of one regiment) are no longer separations; `dt.` (detailed) is a flag, not a separation; a dated `p.` is no longer an event of 1 to 3 July.
2. An officer's `cm.` date after the battle is no longer an enlistment: promoted-from-ranks officers are Unknown, not Absent. An enlisted man's `e.` date of 1 to 3 July is flagged, not counted as a casualty date.
3. A `Note.--` paragraph at the end of a company is no longer appended to the last man (it contained Gettysburg words).
4. Events dated 4 to 14 July (retreat captures) and undated `w. in '63` are flags only (`event-4-14-july-1863`, `event-1863-undated`): candidates for a later Present-Probable model.

## Scan choice (Moore)

The Google scan of volume 1 repeats and scrambles pages (1st NC company I appears twice, one copy mixed with company H names; 5th NC companies H and K have 100 and 115 entries against 185 and 150 in the Emory copy). The Emory copy of the same edition is used for every volume-1 unit (1st to 14th NC) and for the 34th NC (company E doubled in the other scan); the primary scans are used for the rest. Row counts of the two scans differ by 0 to 5 percent per unit for the other units; both parses are kept in `work/moore_classified_primary.json` and `work/moore_classified_emory.json`, the differences are not resolved. Source ids: `NC-MOORE-1882-v1-emory`, `NC-MOORE-1882-v2` and so on. The 22nd NC company letters follow Moore's headings as OCR-read; Moore says the 22nd designated its companies irregularly.

## What is missing and why

See `../../GAPS.md` section D (GN01 to GN03, GL01 to GL04). Short form: no per-man status for 30 June 1863 in Moore; Moore under-annotates (26th NC 515 named against 708 casualties, 4th NC 21 rows); some companies are printed without rolls (16th NC Company A is printed at the end of the volume, 2nd Battalion Companies D and E only officers, 20th NC Company C a few names, 10th NC Artillery partial); Booth abstracts stop before mid-1863 for most men; the 1st Louisiana has two printed commands (Nelligan's, Strawbridge's) and the Western one is withheld; OCR garbling.

## QA

`QA-SAMPLE.md`: 49 rows on four page images; zero wrong Present or Absent labels remaining, three NC field errors, one missed LA entry. The sample is not independent of development (the same agent chose and fixed), so it does not satisfy R-G9.

## Reproduce

From this folder: `scripts/fetch_text.py`, `fetch_xml.py`, `fetch_xml2.py`, `leafmap.py <tag>`, `moore_pipeline.py primary`, `moore_pipeline.py emory`, `build_nc.py`, `booth_parse.py`, `booth_classify.py`, `finalize.py`, `gen_docs.py`, all run as `python -I -X utf8 scripts/<name>`; each lowers its own priority to below normal.
