# Roster pilot pipeline

Python 3.11, standard library only (no installs). The scripts were run from `tmp/bt/rosters/scripts/` with the Internet Archive downloads cached in `tmp/bt/rosters/cache/` (about 300 MB, not committed). They are copied here as the record of what produced `../pilot/`; the relative paths (`../cache/...`, `../../../../docs/...`) assume that layout. They write only inside `tmp/bt/rosters/` and `docs/battle-theatre/rosters/`.

Run Python with `-I -X utf8` (isolated mode: the downloaded files are untrusted data and must not be able to import code).

## Downloads (all read-only, one request per file, 2-3 s apart, `User-Agent: gettysburg-map-research/1.0`)

| cache file | URL |
|---|---|
| `wis1.djvu.xml` | `https://archive.org/download/rosterofwisconsi01wisc/rosterofwisconsi01wisc_djvu.xml` |
| `annualreportofad1863main.djvu.xml` and `.txt` | `https://archive.org/download/annualreportofad1863main/annualreportofad1863main_djvu.xml` |
| `maineatgettysbur01main.djvu.xml` and `.txt` | `https://archive.org/download/maineatgettysbur01main/maineatgettysbur01main_djvu.xml` |
| `moore_rosterofnorthcar02nort.txt` | `https://archive.org/download/rosterofnorthcar02nort/rosterofnorthcar02nort_djvu.txt` |
| `clark_cu31924092908544.txt` | `https://archive.org/download/cu31924092908544/cu31924092908544_djvu.txt` |
| `dawes.txt` | `https://archive.org/download/cu31924030918944/cu31924030918944_djvu.txt` |
| `fox.txt`, `fox.djvu.xml` | `https://archive.org/download/reglossescivilwar00foxwrich/...` |
| `or27_1.txt` | `https://archive.org/download/warofrebellion012701rootrich/warofrebellion012701rootrich_djvu.txt` |

Page images for the QA test: `https://archive.org/download/ID/page/nN_w1500.jpg` (N = djvu page index minus 1).

## Run order

1. `djvu_pages.py wis1.djvu.xml wis1.pages.json` (and the same parse for the Maine and Maine-at-Gettysburg files, written to `me_pages.json`, `meg_pages.json`): word boxes by page.
2. Wisconsin: `wis_parse.py` (rows from coordinates) then `wis_records.py` (company, section, continuation lines) then `wis_classify.py` (dates, events, labels; imports `common.py`) then `wis_dupes.py`.
3. Maine: `me_parse.py` (return rows) then `me_classify.py` then `meg_parse.py` (1898 participants) then `meg_cas.py` (1898 casualty list cross-check) then `me_merge.py`.
4. North Carolina: `nc_parse.py` (entries from plain text) then `nc_classify.py`.
5. `pilot_summary.py` (CSVs, duplicates, stats), `reconcile.py` (strengths and per-company tables), `post_stats.py` (roll_status counts).
6. `ia_probe.py`, `ia_meta.py` (source verification, results in `ia_probe.json`, `ia_meta.json`), `make_sources.py` (writes `../SOURCES.csv`).

Measured run time on the author's machine, with the files cached: Wisconsin parse + classify 2.8 s, Maine 3.3 s, North Carolina 0.5 s, djvu.xml word-box extraction of a 60 MB file 3.6 s.

## Known limits of the scripts

They are pilot code: three source layouts, hand-tuned thresholds (column offsets for the Wisconsin pages, the 1490/200 column scale for the Maine pages), OCR-tolerant matching only for the error patterns seen. `../GAPS.md` lists what they do not handle.
