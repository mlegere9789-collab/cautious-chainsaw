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
* Rows: {s['names']:,} (NC {s['by_state']['north_carolina']['rows']:,}, LA {s['by_state']['louisiana']['rows']:,}), plus {s['rows_excluded_unit_unresolved']} rows withheld as UNIT-UNRESOLVED (Booth entries with Western-theatre evidence only, `units/<unit>_excluded-unit-unresolved.csv`), {s['rows_withheld_no_name']} fragments withheld because the name is not recoverable (`units/_tombstones_no-name-rows_NC.csv`, `_LA.csv`) and 19 NC OCR fragments without a comma (`units/_tombstones_unparsed-rows.csv`). Raw entries = published + withheld, checked per unit (AUDIT.md, conservation).
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
"""
open(os.path.join(DATA, 'README.md'), 'w', encoding='utf-8').write(readme)

# QA-SAMPLE.md and progress.md are kept as written (audit step: not regenerated)
print('ok')
