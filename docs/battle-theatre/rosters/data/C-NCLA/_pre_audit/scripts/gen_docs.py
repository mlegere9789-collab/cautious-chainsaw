"""Write README.md, QA-SAMPLE.md and progress.md (after finalize.py)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from ncla_common import DATA

s = json.load(open(os.path.join(DATA, 'stats.json'), encoding='utf-8'))
table = open(os.path.join(DATA, 'unit-table.md'), encoding='utf-8').read()
acq = json.load(open(os.path.join(DATA, 'acquired.json'), encoding='utf-8'))
cl = s['counts_by_label']
rs = s['counts_by_roll_status']
sh = s['share_by_label']

readme = f"""# C-NCLA: Confederate North Carolina and Louisiana rosters

Built 30 October 2026 under owner decision DEC-019 (public information, no permission requests; Claude obtains it from open sources). Nothing here is product data yet; it is the measured output of the scripts in `scripts/`. Every row keeps the entry text exactly as printed, a source locator and the rule that set its label (PLAN section 2.2).

## Coverage (Measured)

* Units in the order of battle for this family: {s['units_in_oob']} (33 NC infantry regiments and battalions, 10 LA infantry regiments, 2 NC batteries Manly and Reilly, 5 LA batteries: Maurin and the 4 Washington Artillery companies). Units with names: {s['units_with_names']}. The OOB file has no NC or LA cavalry.
* Rows: {s['names']:,} (NC {s['by_state']['north_carolina']['rows']:,}, LA {s['by_state']['louisiana']['rows']:,}), plus {s['rows_excluded_unit_unresolved']} withheld rows in `units/C-1LA-T_excluded-unit-unresolved.csv`.
* Labels: Present-Documented {cl['Present-Documented']:,} ({sh['Present-Documented']*100:.1f} percent), Absent-Documented {cl['Absent-Documented']:,} ({sh['Absent-Documented']*100:.1f} percent), Unknown {cl['Unknown']:,} ({sh['Unknown']*100:.1f} percent). No Present-Probable (no model, PLAN 2.2 rule 11).
* roll_status counts: {json.dumps(rs)}. Unreadable-or-ambiguous share {s['unreadable_share']*100:.1f} percent (Moore: undated separation or missing enlistment date; Booth: no legible enlistment date).
* Rows with a flagged garbled name: {s['name_flagged_rows']:,} ({s['name_flagged_share']*100:.1f} percent). Names are never corrected.
* Many Moore rows are the same man listed once per rank or company (same-name rows are grouped by `dup_group`, not merged); the named counts are rows, not persons.

{table}

## Sources used (identifiers, rights)

| source | IA identifiers | rights |
|---|---|---|
| Moore, Roster of North Carolina Troops, 4 vols, 1882 | rosternorthcaro00moorgoog (v1, Google scan), rosterofnorthcar02nort (v2), rosterofnorthcar03moor (v3), rosterofnorthcar04moor (v4); second scan: 05913252.3309 to 3312.emory.edu | 1882 US publication, public domain by age; v1 flagged NOT_IN_COPYRIGHT, v3 and v4 carry the NC State Library public-domain statement, the others carry no flag; none access-restricted |
| Booth, Records of Louisiana Confederate Soldiers and Louisiana Confederate Commands, 1920 | recordsofl00loui (v1), recordsoflo00loui (v2 pt1), recordsoflouisi00loui (v2 pt2), recordsoflouis00loui (v3 bk1 pt1), recordsofloui00loui (v3 bk1 pt2), recordsoflou00loui (v3 bk2 pt1), recordsoflouisia00loui (v3 bk2 pt2) | 1920 US publication, public domain by age; no copyright flag; none access-restricted |
| 26th NC | pilot `../../pilot/26th-north-carolina.csv` (Moore v2) reused for the strength anchor (Clark 1901: 885 present for duty, `../../pilot/reconciliation.json`); the rows were re-parsed here with the generalised parser (515 Present-Documented against 512 in the pilot) | as above |

Access: plain GET of `/download/<id>/<id>_djvu.txt` and `_djvu.xml`, `/metadata/`, and one advancedsearch query, 2 s or more apart, User-Agent `gettysburg-map-research/1.0`, no login, no key, no cookie. archive.org/robots.txt allows it (disallows only /control/ and /report/; saved as `archive_robots.txt`). Nothing was blocked. One transient HTTP 500 on the Moore v4 xml was retried and succeeded (`acquired.json`). Cache under `tmp/library/rosters/C-NCLA/` ({acq['total_bytes']/1e6:.0f} MB, {len(acq['files'])} files, sha256 in `acquired.json`). FamilySearch, Fold3, Ancestry, Find a Grave, NPS and NARA were not touched.

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
"""
open(os.path.join(DATA, 'README.md'), 'w', encoding='utf-8').write(readme)

qa = """# QA sample (C-NCLA), 30 October 2026

Method: pages drawn at random from each source, page image read by eye (`https://archive.org/download/<id>/page/n<N>_w1500.jpg`), every parsed row of the page compared with the print. Not independent of development; the defects found were fixed and the pages re-run.

| page | rows | result |
|---|---|---|
| 52nd NC Field and Staff, book p.470 (IA rosterofnorthcar03moor n477) | 19 | labels 19 of 19 agree with the print (Marshall and Richardson Present-Documented; the 3 July 1863 commissions Unknown with a flag). Field errors 3: `John Q,. Richardson` (comma noise, not flagged), `JohnH. Robinson` (missing space), `Walter R. Russell` rank split as `Q` and `. M. Sergeant` |
| 6th NC Field and Staff, book p.197 (Emory v1 n213) | 21 printed entries | labels agree (Pender and Avery Present-Documented, Fisher Absent-Documented for first Manassas). Defects: two glued pairs lost two men (Hardy after Davis, Scales after Reese), fixed by the officer-rank splitter and checked after the re-run; Pender's `cm.` read `em.` so the enlistment date is empty; rank `Co? on el` OCR |
| Booth vol 1 book p.173 (recordsofl00loui n348) | 2 rows of our units | after the fix both correct: Bergeron Nemorin (died 16 July 1862, Absent-Documented; the first run missed the death date because of `16th. 1862`), Bergeron Joseph 10th La. (Unknown) |
| Booth vol 2 pt 2 book p.957 (recordsoflouisi00loui n920) | 7 rows | labels correct for Gallagher John 5th (killed 1862), 14th (deserted 1862), 7th Co. C (Unknown), John J. 7th (absent sick on the May 1863 roll), Martin 10th (Unknown). Found and fixed: a false row built from the tail of a cross-reference (`Co. F, 15th La. Inf. Pvt.`), and 1st La. entries of Strawbridge's regiment (Chickamauga) counted for the Gettysburg 1st Louisiana (now withheld). One entry not extracted (Owen J. Gallagher, 1st Co. Washington Artillery: OCR damage to the command word) |

Totals: 49 rows; wrong Present or Absent labels remaining 0; name or field errors 3 (NC) plus OCR variants; extraction errors 1 missed LA entry. R-G1 name accuracy is not demonstrated.
"""
open(os.path.join(DATA, 'QA-SAMPLE.md'), 'w', encoding='utf-8').write(qa)

prog = """# progress (C-NCLA), 30 October 2026

- read CLAUDE.md, DEC-019, PLAN, pilot, pipeline; 50 units found (33 NC infantry, 10 LA infantry, 7 batteries: Manly, Reilly, Maurin, Washington Artillery x4).
- IA search: Moore vols 1-4 and Booth 7 parts identified; metadata checked, none access-restricted; robots.txt read.
- fetched txt (11 files) and xml (13 files) with sha256; Emory copy of Moore fetched after the Google scan of v1 showed repeated pages. 562 MB used.
- Moore generalised parser: header table, company sequence, scan-repeat check; both scans run; scan chosen per unit; leaf map; CSVs for 35 NC units.
- Booth parser: entries, unit match, roll parser, labels; fixed blank-line entry breaks, vol-1 period punctuation, year OCR, cross-reference tails; 1st La. variant split; CSVs for 15 LA units.
- QA on 4 page images, defects fixed and re-run (QA-SAMPLE.md).
- stats.json, README.md, GAPS.md section D, SOURCES.csv rows written.
"""
open(os.path.join(DATA, 'progress.md'), 'w', encoding='utf-8').write(prog)
print('ok')
