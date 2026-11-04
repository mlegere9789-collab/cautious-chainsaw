"""Write data/MW/README.md, progress.md, QA-SAMPLE.md and append the MW rows to ../SOURCES.csv and ../GAPS.md (append-only)."""
import json, os, csv, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
R = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters')
D = os.path.join(R, 'data', 'MW')
s = json.load(open(os.path.join(D, 'stats.json')))
acq = json.load(open(os.path.join(D, 'acquired.json')))
dl = sum(v['bytes'] for v in acq['files'].values() if not v.get('copied_from_pilot_cache')) / 1e6

tab = ['| unit | file | rows | name not in OCR | Present-Doc | Absent-Doc | Unknown | Xref | of Unknown: unreadable | OOB strength | monument 1889 effective strength | coverage |', '|---|---|---|---|---|---|---|---|---|---|---|---|']
for u, v in sorted(s['units'].items()):
    l = v['labels']
    tab.append('| %s | %s.csv | %d | %d | %d | %d | %d | %d | %d | %s | %s | %s |' % (u, v['slug'], v['rows'], v['rows_name_not_in_ocr'], l.get('Present-Documented', 0), l.get('Absent-Documented', 0), l.get('Unknown', 0), l.get('Duplicate-Xref', 0),
                                                                                  v['roll_status'].get('unreadable-or-ambiguous', 0), v['oob_strength'], v['michigan_monument_effective_strength'] or '', 'full roll' if v['full_roll'] else 'PARTIAL: 1913 survivors list only'))
tab = '\n'.join(tab)

readme = f"""# Roster data, family MW (Michigan, Wisconsin, Indiana, Illinois, Minnesota)

Built 30 October 2026 under DEC-019 (the owner: the roster information is public and Claude must obtain it itself; no permission requests). Only open sources were used: Internet Archive items whose metadata shows no access restriction, read-only, one request per file about 2 to 3 seconds apart, user agent `gettysburg-map-research/1.0`, cached under `tmp/library/rosters/MW/` with sha256 in `acquired.json` ({len(acq['files'])} files, {dl:.0f} MB downloaded in this run, the budget is 1.5 GB). No login, account, licence acceptance, API key or bot-check circumvention. No browser was used and every Python process ran at below-normal priority, one at a time.

## Result

{s['units_in_oob']} of {s['units_in_oob']} OOB units of the family (26: Michigan 7 infantry + 4 cavalry, Wisconsin 6, Indiana 4 + 1 cavalry, Illinois 1 + 2 cavalry, Minnesota 1) have named rows. **{s['units_with_full_roll']} units have the full printed roll; 10 Michigan units have only the names printed in the 1913 survivors list** (a gap, see below). {s['rows']:,} rows, {s['names']:,} with a name (1,004 rows are real roll lines whose name the OCR text layer lost: kept with an empty name, never invented). Labels over all rows: Unknown {s['labels_total']['Unknown']:,}, Absent-Documented {s['labels_total']['Absent-Documented']:,}, Present-Documented {s['labels_total']['Present-Documented']:,}, Duplicate-Xref {s['labels_total']['Duplicate-Xref']:,}. {s['unreadable_share']*100:.1f} percent of all rows are Unknown because a date or remark is unreadable in the OCR layer.

{tab}

`stats.json` has the same numbers per unit and the share by label. "OOB strength" is the repository figure (second-hand from Busey and Martin, not verified here). The monument figures are Documented from the inscriptions printed in *Michigan at Gettysburg* (1889), IA `cu31924030924736`, and were not reconciled against names.

## Files and columns

One CSV per unit, the 6th Wisconsin copied unchanged from `../../pilot/`. Columns: regiment, unit_id (OOB regiment_id), company (FS field and staff, NCS non-commissioned staff, UNASSIGNED, REC recruits, `X-reorg` for the reorganised 3rd Michigan), section/rank as printed, name_as_printed (never corrected), name_clean (Surname, Given; only punctuation and order normalised), residence, age_as_printed (Minnesota), enlist_or_rank_date (ISO, only when the printed year was legible), muster_date_as_printed (Illinois), mustered_out_as_printed (Minnesota), remarks_as_printed, presence_label, presence_basis (rule code and reason in words, PLAN 2.2), dup_group, source_id, source_page_idx_ia (IA djvu page index, page image N-1: `https://archive.org/download/ID/page/nN_w1500.jpg`), parse_flags, roll_status, other_sources.

Labels follow PLAN 2.2 exactly. A roll name alone is never Present: `on-roll-undetermined` rows stay Unknown. Present-Documented comes from a casualty or Gettysburg remark (CAS-REMARK, GETTYSBURG-REMARK), an event dated 1 to 3 July (EVENT-DATED-IN-BATTLE), or the 1913 survivors list (PART-LIST). Absent-Documented comes from a separation dated before 1 July 1863 (SEP-BEFORE) or a muster/enlistment date after 3 July 1863 (ENL-AFTER). Where the survivors list names a man the roll shows separated before the battle the row is Unknown with roll_status `contested` and both sources shown (rule 10). Officer rank dates are never used as enlistment dates. Veteran re-enlistment sections (Illinois, Indiana) are Duplicate-Xref rows (the man is counted through his original row); the label says so.

## Sources used (IA identifiers; all PD-US, `possible-copyright-status` NOT_IN_COPYRIGHT or none, `access-restricted-item` absent)

* Wisconsin: Roster of Wisconsin Volunteers 1886 (vol 1 `rosterofwisconsi01wisc`: 2nd, 3rd, 5th, 7th; vol 2 `rosterofwisconsi02wisc`: 26th; djvu.xml word boxes, pilot parser generalised in `pipeline/mw/wis_gen.py`). Page ranges: 2nd 363-396, 3rd 403-454, 5th 455-487, 7th 556-594, 26th (vol 2) 323-350. Not included: the Independent Battalion of the 2nd Infantry (djvu 397-402) and the reorganised 5th (from 488), which are different organisations formed after Gettysburg.
* Indiana: Report of the Adjutant General of the State of Indiana, vol 4 `reportindiana04dougrich` (14th, 19th, 20th, 27th: enlisted men) and vol 5 `reportindiana05dougrich` (3rd Cavalry = 45th Regiment). Enlisted men and non-commissioned staff only (see gaps).
* Illinois: Report of the Adjutant General of the State of Illinois, revised edition 1900, vol 5 `reportofadjutantv5illi` (82nd, djvu 106-126) and vol 8 `reportofadjutantv8illi` (8th Cavalry 111-162, 12th Cavalry 339-386; the 12th Consolidated is excluded).
* Minnesota: Minnesota in the Civil and Indian Wars vol 1 (1890) `minnesotacivil01minnrich` (First Regiment roster, djvu 69-86; the First Battalion is excluded). The item `minnesotaincivil0001unse` is access-restricted and was not touched.
* Michigan: Record of Service of Michigan Volunteers vol 3 `recordofserviceo03mich` (3rd Infantry, original and reorganised, djvu 35-449). Presence evidence for every Michigan unit and for Illinois and Indiana men living in Michigan: A. H. Boies, Roster of the Survivors of the Battle of Gettysburg living in the State of Michigan, 1913 (`rosterofsurvivor00boie`; 458 printed lines parsed, 275 in the family's units). Strengths: Michigan at Gettysburg 1889.

## Parse method

Word boxes from `djvu.xml` (Wisconsin, Indiana, Illinois, Minnesota; `pipeline/djvu_pages.py`), grouped into lines, columns found relative to a per-page fitted left margin (tilt corrected), continuation lines attached to the row above, headings give company and rank. Michigan: prose entries split at "Surname, Given. Enlisted in company ..." heads (`mi_ros.py`, `mi_rows.py`). Dates are read with an OCR-tolerant parser that refuses to guess a year (`cls_gen.py`); classification and CSV in `build_unit.py`. Dedupe groups same-name rows inside a unit only; cross-unit transfers (for example 14th Indiana veterans to the 20th) are not merged. Run order: `fetch_round1-4.py`, `djvu_pages.py`, `wis_gen.py`/`tab_gen.py`/`mi_ros.py`, `build_all.sh`, `boies_parse.py`, `boies_merge.py`, `final_stats.py`.

## OCR quality and QA

The text layer is ABBYY from the Internet Archive (no second OCR engine exists on this machine; installing one needs an owner decision, G02). QA: a 30-plus-row check against page images, see `QA-SAMPLE.md`. It is not an independent sample (PLAN 4.4) and the R-G1 to R-G3 gates are NOT shown to pass.

## What is missing and why

See the MW section of `../../GAPS.md` (GMW01 to GMW10). Short list: nine Michigan units (1st, 4th, 5th, 7th, 16th, 24th Infantry; 1st, 5th, 6th, 7th Cavalry) have no open full roll (only volumes 3, 8, 17 and 22 of the Record of Service are on the Internet Archive; HathiTrust robots.txt disallows the page routes and the Archives of Michigan terms forbid automated access; the 7th Cavalry book by Lee 1902 answered HTTP 500/503/504 on three attempts); Indiana officers are printed rotated in vol 2 and the OCR text is unreadable; about 1,000 rows lost their name in the OCR layer; Wisconsin, Indiana and Illinois rolls rarely annotate Gettysburg, so Present-Documented is far below the documented casualties.
"""
open(os.path.join(D, 'README.md'), 'w', encoding='utf8').write(readme)

prog = f"""# MW progress (30 Oct 2026)
- 21:56 read CLAUDE.md, DEC-019, PLAN, pilot, pipeline; unit list from baseline/dist/data/oob: 26 units.
- 22:04 IA metadata audit of candidate items (ia_audit.json): Minnesota 1890 vol 1 usable, one restricted item skipped; only 4 Record of Service volumes exist on IA.
- 22:05-22:20 downloads rounds 1-3 (Wisconsin vol 2, Indiana vols 2/4/5, Illinois vols 5/6/8, Minnesota, Michigan items).
- 22:10 Wisconsin 2nd/3rd/5th/7th/26th parsed with the generalised pilot parser; company-header repair (3rd: unassigned men; 26th vol 2).
- 22:15 Indiana tab parser; fixed company sequencing, year headers, margin fit for vol 5; nameless rows kept.
- 22:22 Illinois 82nd, 8th and 12th Cavalry; Veterans sections marked Duplicate-Xref.
- 22:25 Minnesota 1st; mustered-out column used for separations (found in the image check).
- 22:30 Michigan 3rd (Record vol 3); Boies 1913 merged into all Michigan units and matching rows elsewhere.
- 22:31 QA image check (3 pages). Lee 1902 (7th Michigan Cavalry) fetch failed three times (HTTP 504, 503, 500): recorded failed, not retried further.
- final: stats.json, README.md, QA-SAMPLE.md, SOURCES.csv and GAPS.md rows appended.
"""
open(os.path.join(D, 'progress.md'), 'w', encoding='utf8').write(prog)

qa = """# QA sample, family MW (30 Oct 2026, by the builder, not independent)

Pages compared with the page image: Indiana 14th Infantry IA djvu 288 (book p.280; recruits of Company D, first 14 rows), Illinois 82nd Infantry djvu 116 (book p.110; Company E tail and Company F, 14 rows), Minnesota 1st Infantry djvu 74 (book p.54; Company C, 14 rows). 42 rows in all.

Findings
* Indiana (14 rows): 11 fully right (name, residence, date, remark, label). 3 problems: the first printed row (Adams, Eli) is absent from the parsed page rows (assigned elsewhere or lost); two printed rows (Gainey, Edward B and Gainey, John M) were merged into one parsed row; one name garbled by OCR (Gainey, Wesley S read as a bullet plus rainey); one remark line (Died Lynchburg, Va., prison, Sept. '62) missing from the OCR layer, so a man who should be Absent-Documented is Unknown (weaker, not opposite).
* Illinois (14 rows): 0 wrong names, dates or labels. The source itself prints "May 28,1963" for a discharge (Capt. Webber): left Unknown. Officer rows carry the rank heading glued into the name in places.
* Minnesota (14 rows): 2 names lost by OCR (Miller, Samuel L; Mortimer, George F: kept with an empty name). 1 hard label defect found and FIXED: McCausland, Andrew has "discharged for disability" with the date only in the Mustered-Out column (Jan. 8, '63); the first build labelled him Unknown. The builder now uses the Mustered-Out column (rule SEP-BEFORE); all Minnesota rows were rebuilt. Rows shown as Wounded/Killed at Gettysburg were Present-Documented as printed.
* No row of the sample received a false Present-Documented or a false Absent-Documented label. Under-labelled rows (Unknown where the page supports a firmer label): 2 of 42. Row-structure errors: 3 of 42 (merge, loss, bad name). These counts are far too small to test the 99 percent gates of PLAN 4.3; R-G1, R-G2, R-G3 are not demonstrated.
* Because the Minnesota defect was fixed after sampling, only fresh pages count for the next test (PLAN 4.4).
"""
open(os.path.join(D, 'QA-SAMPLE.md'), 'w', encoding='utf8').write(qa)

# SOURCES.csv (append)
hdr = ['id', 'army', 'scope', 'source', 'years', 'coverage', 'format_and_quality', 'licence_or_terms', 'bulk_or_per_unit_fetch_rule', 'status', 'locator', 'notes']
src = [
    ['MW-WI1', 'Union', 'Wisconsin', 'Roster of Wisconsin Volunteers vol 1 and vol 2 (1886): 2nd, 3rd, 5th, 7th, 26th Infantry (6th from the pilot)', '1886', 'Whole-war roll per regiment', 'IA djvu.xml word boxes; 25 to 45 percent of rows lose a date year or remark word', 'PD-US (IA NOT_IN_COPYRIGHT)', 'per-file IA download, cached', 'FETCHED', 'archive.org/details/rosterofwisconsi01wisc ; rosterofwisconsi02wisc', 'family MW, data/MW/'],
    ['MW-IN1', 'Union', 'Indiana', 'Report of the Adjutant General of the State of Indiana vol 4 and vol 5: enlisted men of the 14th, 19th, 20th, 27th Infantry and 3rd Cavalry (45th)', '1865-69', 'Enlisted men and NCO staff; officers are in vol 2 (rotated print, OCR unreadable)', 'IA djvu.xml', 'PD-US (IA NOT_IN_COPYRIGHT)', 'per-file IA download', 'FETCHED', 'archive.org/details/reportindiana04dougrich ; reportindiana05dougrich ; reportofadjutant02indi (vol 2, unreadable)', ''],
    ['MW-IL1', 'Union', 'Illinois', 'Report of the Adjutant General of the State of Illinois, revised 1900, vol 5 (82nd Infantry) and vol 8 (8th, 12th Cavalry)', '1900', 'Whole-war roll incl. officers', 'IA djvu.xml', 'PD-US', 'per-file IA download', 'FETCHED', 'archive.org/details/reportofadjutantv5illi ; reportofadjutantv8illi', ''],
    ['MW-MN1', 'Union', 'Minnesota', 'Minnesota in the Civil and Indian Wars vol 1 (1890): First Regiment roster', '1890', 'Roll with age, muster in/out, remarks incl. Gettysburg casualties', 'IA djvu.xml', 'PD-US (IA NOT_IN_COPYRIGHT); the copy minnesotaincivil0001unse is access-restricted and was not used', 'per-file IA download', 'FETCHED', 'archive.org/details/minnesotacivil01minnrich', ''],
    ['MW-MI1', 'Union', 'Michigan', 'Record of Service of Michigan Volunteers vol 3 (3rd Infantry, original and reorganised)', '1905', 'Full 3rd Michigan roll', 'IA djvu.xml', 'IA flag none/NOT_IN_COPYRIGHT; 1905 state publication', 'per-file IA download', 'FETCHED', 'archive.org/details/recordofserviceo03mich', 'vols 8, 17, 22 also exist on IA (not our regiments); no other volume found'],
    ['MW-MI2', 'Union', 'Michigan', 'Boies, Roster of the Survivors of the Battle of Gettysburg living in the State of Michigan (1913)', '1913', '458 printed lines, 275 in the MW units (all Michigan units, some Illinois and Indiana men)', 'IA djvu.txt/xml; self-reported, compiler checked war records for Michigan enlistees', 'IA: LoC unaware of copyright restrictions', 'per-file IA download', 'FETCHED', 'archive.org/details/rosterofsurvivor00boie', 'used as PART-LIST evidence'],
    ['MW-MI3', 'Union', 'Michigan', 'Lee 1902, Personal and historical sketches ... Seventh regiment Michigan cavalry', '1902', 'would give the 7th Michigan Cavalry roll', 'not obtained', 'IA metadata not read (timeout)', 'per-file IA download', 'FAILED', 'archive.org/details/personalhistoric00leew', 'djvu.txt request answered HTTP 504, 503, 500 (30 Oct 2026); a failed lookup, not a block; retry later'],
    ['MW-MI4', 'Union', 'Michigan', 'Record of Service of Michigan Volunteers, volumes for 1st, 4th, 5th, 7th, 16th, 24th Infantry and 1st, 5th, 6th, 7th Cavalry; Michiganology (Archives of Michigan); HathiTrust', '1905', 'full rolls', 'not on IA (title and identifier search); Michiganology terms of service forbid automated access; HathiTrust robots.txt disallows /cgi/', 'see locator', 'none', 'BLOCKED', 'michiganology.org/terms-of-service ; babel.hathitrust.org/robots.txt', 'not fetched, not circumvented'],
    ['MW-MI5', 'Union', 'Michigan', 'Robertson, Michigan in the War (1882) michiganinwar00mich', '1882', 'field and staff and company officers at organisation, in running text', 'IA djvu.txt downloaded, not parsed', 'PD-US', 'per-file IA download', 'META', 'archive.org/details/michiganinwar00mich', 'next step for Michigan officers; michiganinwa00mich is a different book (10th Cavalry chronology), fetched in error and unused'],
    ['MW-OAR', 'Union', 'MW', 'Official Army Register of the Volunteer Force parts 4 to 7 (cu31924092911100/118/126/134)', '1865', 'officers as they stood at muster out only', 'IA djvu.txt', 'US government publication', 'per-file IA download', 'META', 'archive.org/details/cu31924092911118 (Michigan, Ohio), cu31924092911126 (Indiana, Illinois)', 'examined: omits officers who left earlier; not used for rows'],
]
p = os.path.join(R, 'SOURCES.csv')
with open(p, 'a', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    for r in src:
        w.writerow(r)

gaps = """

## MW family (Michigan, Wisconsin, Indiana, Illinois, Minnesota), 30 Oct 2026

| ID | gap | route |
|---|---|---|
| GMW01 | Michigan 1st, 4th, 5th, 7th, 16th, 24th Infantry and 1st, 5th, 6th, 7th Cavalry have no open full roll: only 4 of the 46 Record of Service volumes are on the Internet Archive (3, 8, 17, 22); HathiTrust robots.txt disallows /cgi/; the Archives of Michigan terms forbid automated access. Only the 1913 Boies survivors list (275 names) is in the data. Tried: IA title, creator, identifier-pattern and wildcard searches; regimental histories (24th Curtis 1891: only a roster of officers was found, 4th Barrett 1888 is a 56-page item downloaded and not parsed, 16th survivors 1895 text layer unreadable). | Open: owner downloads the volumes in a browser, or another open host is found; Robertson 1882 (officers at organisation) is downloaded and not yet parsed; Lee 1902 (7th Cavalry) failed with HTTP 5xx three times and should be retried |
| GMW02 | Indiana officers (field, staff, company officers) are printed rotated in vol 2 and the OCR text is upside-down garbage; the Official Army Register lists only officers at muster out. | Second OCR or vision read of vol 2 (G02) |
| GMW03 | 1,004 roll lines in Indiana, Illinois and Minnesota lost their name in the OCR layer (kept as nameless rows, counted). | Second OCR (G02) |
| GMW04 | Wisconsin, Indiana, Illinois rolls rarely annotate Gettysburg (for example 3rd Indiana Cavalry 0 of 1,389 rows, 5th Wisconsin 10); Present-Documented is far below documented casualties. | muster rolls of 30 June 1863 (G01); regimental histories; Official Records |
| GMW05 | Illinois cavalry rows lose the last digit of many year tokens (186?), so enlistment dates are unreadable for about a quarter of rows. | Second OCR |
| GMW06 | Company attribution in Wisconsin rows can be off near company boundaries when a header is garbled (checked on headers, not on every page). | image check |
| GMW07 | The 3rd Indiana Cavalry had six companies at Gettysburg (OOB); which six is not established, so all twelve companies are listed. | Official Records, regimental history |
| GMW08 | Cross-unit transfers (14th Indiana veterans to the 20th, 27th Indiana to the 70th) are not merged. | identity rules (G08) |
| GMW09 | Strengths: only the seven Michigan infantry figures (monument inscriptions, 1889) are tied to a printed source; the other 19 units carry the second-hand OOB value, no S_doc and no reconciliation status were derived. | OR 27, regimental histories |
| GMW10 | The 3rd Michigan roll includes the reorganised regiment (1864-66), the 3rd Wisconsin roll 586 unassigned men and the 8th Illinois Cavalry 926 recruits, so row counts exceed the men at Gettysburg by design; the labels carry that. | none needed |
"""
with open(os.path.join(R, 'GAPS.md'), 'a', encoding='utf8') as f:
    f.write(gaps)
print('docs written')
