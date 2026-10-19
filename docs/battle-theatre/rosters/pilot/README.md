# Roster pilot data: 6th Wisconsin, 20th Maine, 26th North Carolina

Built 19 October 2026 by the roster program agent from Internet Archive full texts (public domain). Nothing here is product data yet: it is the measured output of the pipeline in `../pipeline/`, with every row carrying its source and the reason for its presence label.

## Files

| file | rows | what it is |
|---|---|---|
| `6th-wisconsin.csv` | 2,098 | every row of the 6th Wisconsin pages of the 1886 Wisconsin roster (book pp.494-537): field and staff, band, ten companies, recruits not on company rolls |
| `20th-maine.csv` | 1,306 + 50 | every row of the 20th Maine company returns of 1 Dec 1863 (Maine AG report 1863, App. D), merged with the 1898 Participants list; the last 50 rows are participants with no matching return row |
| `26th-north-carolina.csv` | 1,925 | every entry of the 26th NC in Moore's Roster (1882, vol 2), officers listed once per rank |
| `reconciliation.json` | | documented strengths and casualty figures per regiment with sources, per-company counts, contested items |
| `pilot-stats.json` | | row counts, label counts, duplicates, spelling variants, name-flagged rows |
| `QA-SAMPLE.md` | | the page-image sampling test (three pages, 155 rows) |

## Columns common to the three CSVs

`presence_label` is one of Present-Documented, Absent-Documented, Unknown (Present-Probable is defined but no pilot row carries it, see below; Wisconsin also has Duplicate-Xref for the 10 "See ..." cross-reference rows). `roll_status` splits the Unknown rows: `on-roll-undetermined` (enlisted before the battle, no separation before it, but no source says he was there), `unreadable-or-ambiguous` (a date or remark is illegible in the OCR text layer or the year is missing), and for the others `named-present`, `off-roll-before-battle`, `not-yet-enlisted`, `xref`. `presence_basis` is the rule that fired, in words. `dup_group` joins rows that are the same man on two company rolls (transfers) or, for North Carolina, the same name listed under several ranks. `parse_flags` marks rows whose name text is garbled by OCR or by the line-gluing of the plain text (`name-garbled`, `ocr-noise-in-name`): 157 of 2,098 Wisconsin rows, 83 of 1,306 Maine rows, 87 of 1,925 North Carolina rows. Names are kept exactly as printed in `name_as_printed`; no correction has been applied, because correction needs a second OCR or the page image (see PLAN section 3.5).

## How to read the labels

* Present-Documented: a source names him at Gettysburg (casualty remark, 1898 participants list, Dawes's list of officers present).
* Present-Probable: reserved for a man with positive indirect evidence of presence (for example promoted in the field in July 1863). None of the three sources supplies any, so **no pilot row carries it**. An earlier pass labelled the 370 on-roll Wisconsin men Present-Probable; that was withdrawn because the pilot shows a roll-only man is present anywhere from 0.36 to 0.72 of the time depending on the regiment (PLAN section 2.4).
* Absent-Documented: separation dated before the battle, enlistment after it, or a source that says he was away.
* Unknown: everything else, including every row whose date was lost in the OCR layer.

## Reproduce

See `../pipeline/README.md`. Compute for all three regiments is about 10 seconds once the Internet Archive files are cached; the download is about 300 MB.
