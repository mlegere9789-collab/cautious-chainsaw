# C-NCLA: Confederate North Carolina and Louisiana rosters

Built 30 October 2026 under owner decision DEC-019 (public information, no permission requests; Claude obtains it from open sources). Nothing here is product data yet; it is the measured output of the scripts in `scripts/`. Every row keeps the entry text exactly as printed, a source locator and the rule that set its label (PLAN section 2.2).

## Coverage (Measured)

* Units in the order of battle for this family: 50 (33 NC infantry regiments and battalions, 10 LA infantry regiments, 2 NC batteries Manly and Reilly, 5 LA batteries: Maurin and the 4 Washington Artillery companies). Units with names: 50. The OOB file has no NC or LA cavalry.
* Rows: 58,483 (NC 49,347, LA 9,136), plus 747 rows withheld as UNIT-UNRESOLVED (Booth entries with Western-theatre evidence only, `units/<unit>_excluded-unit-unresolved.csv`), 398 fragments withheld because the name is not recoverable (`units/_tombstones_no-name-rows_NC.csv`, `_LA.csv`) and 19 NC OCR fragments without a comma (`units/_tombstones_unparsed-rows.csv`). Raw entries = published + withheld, checked per unit (AUDIT.md, conservation).
* Labels: Present-Documented 5,468 (9.3 percent), Absent-Documented 14,229 (24.3 percent), Unknown 38,786 (66.3 percent). No Present-Probable (no model, PLAN 2.2 rule 11).
* roll_status counts: {"unreadable-or-ambiguous": 11761, "on-roll-undetermined": 26805, "off-roll-before-battle": 10925, "not-yet-enlisted": 2527, "named-present": 5468, "contested": 220, "absent-on-30-june-roll": 777}. Unreadable-or-ambiguous share 20.1 percent (Moore: undated separation or missing enlistment date; Booth: no legible enlistment date).
* Rows with a flagged garbled name: 2,164 (3.7 percent). Names are never corrected.
* Many Moore rows are the same man listed once per rank or company (same-name rows are grouped by `dup_group`, not merged); the named counts are rows, not persons.

| unit_id | designation | source | rows | Present-Doc. | Absent-Doc. | Unknown | name-flagged | OOB strength |
|---|---|---|---|---|---|---|---|---|
| C-1NC | 1st North Carolina Infantry | emory | 1599 | 73 | 370 | 1156 | 57 | 359 |
| C-2NC | 2nd North Carolina Infantry | emory | 1374 | 32 | 355 | 987 | 40 | 247 |
| C-3NC | 3rd North Carolina Infantry | emory | 1703 | 177 | 428 | 1098 | 44 | 479 |
| C-4NC | 4th North Carolina Infantry | emory | 1604 | 21 | 113 | 1470 | 70 | 252 |
| C-5NC | 5th North Carolina Infantry | emory | 1817 | 177 | 319 | 1321 | 62 | 473 |
| C-6NC | 6th North Carolina Infantry | emory | 1810 | 126 | 507 | 1177 | 61 | 443 |
| C-7NC | 7th North Carolina Infantry | emory | 1526 | 68 | 456 | 1002 | 32 | 400 |
| C-11NC | 11th North Carolina Infantry | emory | 1405 | 307 | 264 | 834 | 30 | 617 |
| C-12NC | 12th North Carolina Infantry | emory | 1562 | 40 | 294 | 1228 | 35 | 219 |
| C-13NC | 13th North Carolina Infantry | emory | 1466 | 154 | 489 | 823 | 48 | 232 |
| C-14NC | 14th North Carolina Infantry | emory | 1490 | 41 | 400 | 1049 | 34 | 292 |
| C-16NC | 16th North Carolina Infantry | primary | 1446 | 84 | 404 | 958 | 39 | 321 |
| C-18NC | 18th North Carolina Infantry | primary | 1771 | 43 | 513 | 1215 | 60 | 346 |
| C-20NC | 20th North Carolina Infantry | primary | 1208 | 155 | 305 | 748 | 34 | 372 |
| C-21NC | 21st North Carolina Infantry | primary | 1425 | 77 | 284 | 1064 | 35 | 472 |
| C-22NC | 22nd North Carolina Infantry | primary | 1972 | 102 | 623 | 1247 | 40 | 263 |
| C-23NC | 23rd North Carolina Infantry | primary | 1476 | 195 | 403 | 878 | 26 | 406 |
| C-26NC | 26th North Carolina Infantry | primary | 1954 | 518 | 360 | 1076 | 48 | 843 |
| C-28NC | 28th North Carolina Infantry | primary | 1828 | 159 | 513 | 1156 | 36 | 346 |
| C-30NC | 30th North Carolina Infantry | primary | 1541 | 43 | 520 | 978 | 25 | 233 |
| C-32NC | 32nd North Carolina Infantry | primary | 1300 | 105 | 287 | 908 | 16 | 465 |
| C-33NC | 33rd North Carolina Infantry | primary | 1714 | 69 | 413 | 1232 | 17 | 291 |
| C-34NC | 34th North Carolina Infantry | emory | 1346 | 68 | 458 | 820 | 27 | 310 |
| C-37NC | 37th North Carolina Infantry | primary | 1780 | 129 | 541 | 1110 | 15 | 347 |
| C-38NC-S | 38th North Carolina Infantry (Scales's Brigade) | primary | 1282 | 99 | 500 | 683 | 10 | 221 |
| C-43NC | 43rd North Carolina Infantry | primary | 1255 | 127 | 240 | 888 | 6 | 568 |
| C-45NC | 45th North Carolina Infantry | primary | 1443 | 198 | 314 | 931 | 12 | 431 |
| C-47NC | 47th North Carolina Infantry | primary | 1275 | 215 | 222 | 838 | 8 | 567 |
| C-52NC | 52nd North Carolina Infantry | primary | 1315 | 169 | 167 | 979 | 6 | 553 |
| C-53NC | 53rd North Carolina Infantry | primary | 1319 | 88 | 255 | 976 | 13 | 375 |
| C-55NC | 55th North Carolina Infantry | primary | 1217 | 182 | 165 | 870 | 11 | 640 |
| C-57NC | 57th North Carolina Infantry | primary | 1047 | 19 | 257 | 771 | 15 | 326 |
| C-2NC-B | 2nd North Carolina Battalion | primary | 560 | 55 | 47 | 458 | 9 | 240 |
| C-ART-Manly | Manly's Battery (1st NC Artillery) | emory | 300 | 11 | 21 | 268 | 17 | 80 |
| C-ART-Reilly | Reilly's Battery (Rowan Artillery NC) | emory | 217 | 4 | 13 | 200 | 14 | 95 |
| C-1LA-T | 1st Louisiana Infantry | Booth 1920 | 1004 | 88 | 256 | 660 | 104 | 177 |
| C-2LA-T | 2nd Louisiana Infantry | Booth 1920 | 911 | 117 | 276 | 518 | 107 | 219 |
| C-5LA | 5th Louisiana Infantry | Booth 1920 | 935 | 144 | 243 | 548 | 130 | 211 |
| C-6LA | 6th Louisiana Infantry | Booth 1920 | 874 | 98 | 255 | 521 | 98 | 218 |
| C-7LA | 7th Louisiana Infantry | Booth 1920 | 879 | 156 | 228 | 495 | 100 | 235 |
| C-8LA | 8th Louisiana Infantry | Booth 1920 | 820 | 150 | 229 | 441 | 101 | 290 |
| C-9LA | 9th Louisiana Infantry | Booth 1920 | 1106 | 171 | 324 | 611 | 139 | 341 |
| C-10LA | 10th Louisiana Infantry | Booth 1920 | 753 | 97 | 96 | 560 | 90 | 226 |
| C-14LA | 14th Louisiana Infantry | Booth 1920 | 779 | 120 | 226 | 433 | 115 | 220 |
| C-15LA | 15th Louisiana Infantry | Booth 1920 | 658 | 88 | 197 | 373 | 92 | 262 |
| C-ART-Maurin | Maurin's Battery (Donaldsonville Artillery LA) | Booth 1920 | 169 | 47 | 19 | 103 | 18 | 80 |
| C-ART-Squires | Squires's Battery (1st Co., Washington Artillery) | Booth 1920 | 75 | 18 | 19 | 38 | 8 | 80 |
| C-ART-Richardson | Richardson's Battery (2nd Co., Washington Artillery) | Booth 1920 | 58 | 11 | 16 | 31 | 5 | 80 |
| C-ART-Miller-WA | Miller's Battery (3rd Co., Washington Artillery) | Booth 1920 | 68 | 17 | 15 | 36 | 4 | 80 |
| C-ART-Norcom | Norcom's Battery (4th Co., Washington Artillery) | Booth 1920 | 47 | 16 | 10 | 21 | 1 | 80 |


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

The Google scan of volume 1 repeats and scrambles pages (1st NC company I appears twice, one copy mixed with company H names; 5th NC companies H and K have 100 and 115 entries against 185 and 150 in the Emory copy). The Emory copy of the same edition is used for every volume-1 unit (1st to 14th NC) and for the 34th NC (company E doubled in the other scan); the primary scans are used for the rest, except that after the audit the two NC batteries (Manly, Reilly) also use the Emory copy: the Google scan dropped 38 percent of Manly's Company A (187 rows against 304). Row counts of the two scans differ by 0 to 5 percent per unit for the other units; both parses are kept in `work/moore_classified_primary.json` and `work/moore_classified_emory.json`, the differences are not resolved. Source ids: `NC-MOORE-1882-v1-emory`, `NC-MOORE-1882-v2` and so on. The 22nd NC company letters follow Moore's headings as OCR-read; Moore says the 22nd designated its companies irregularly.

## What is missing and why

See `../../GAPS.md` section D (GN01 to GN03, GL01 to GL04). Short form: no per-man status for 30 June 1863 in Moore; Moore under-annotates (26th NC 515 named against 708 casualties, 4th NC 21 rows); some companies are printed without rolls (16th NC Company A is printed at the end of the volume, 2nd Battalion Companies D and E only officers, 20th NC Company C a few names, 10th NC Artillery partial); Booth abstracts stop before mid-1863 for most men; the 1st Louisiana has two printed commands (Nelligan's, Strawbridge's) and the Western one is withheld; OCR garbling.

## QA and audit

`QA-SAMPLE.md` (the builder's sample, 49 rows on four page images, not independent) is kept as written. An independent audit on 30 October 2026 (`AUDIT.md`) drew 60 rows (seed 41) from the first output and 60 (seed 42) from the repaired output, recounted every total, found and repaired 17 systematic defects (frozen copy of the first output in `_pre_audit/`), and reports what is still open. The audit is a second pass by a different agent but is still not the PLAN 4.4 sampling test (about 628 rows per stratum from page images): R-G9 is not met.

## Audit changes to the method (see AUDIT.md for counts)

5. Moore: a casualty or capture at Gettysburg now comes before an enlistment date after the battle or a separation before it (PLAN 2.2 order); where an entry holds both it is Unknown, flag `contested`, not Absent-Documented.
6. Moore and Booth: month-only dates are stored as `YYYY-MM` and quoted as `(day not printed)`; they were stored and quoted as the 15th.
7. Moore: OCR variants of Gettysburg are read; glued entries are split on more patterns; rank and name fields are read from word lists; fragments without a recoverable name are withheld, not published as men.
8. Booth: entries glued into one paragraph are split (1,100 more men of these units); Western-evidence entries are withheld for every unit, not only the 1st; roll periods that read `Present on all Rolls to` start at the enlistment; men enlisted after the battle are no longer Present from a roll abstract; a deserter who returned and was captured at Gettysburg is Present; Booth day numbers 29 to 31 are no longer cut to 28.
9. Locators: `djvu.txt line N` is now the 1-based line (it was 0-based, one line early).

## Reproduce

From this folder: `scripts/fetch_text.py`, `fetch_xml.py`, `fetch_xml2.py`, `leafmap.py <tag>`, `moore_pipeline.py primary`, `moore_pipeline.py emory`, `build_nc.py`, `booth_parse.py`, `booth_classify.py`, `finalize.py`, `gen_docs.py`, all run as `python -I -X utf8 scripts/<name>`; each lowers its own priority to below normal.
