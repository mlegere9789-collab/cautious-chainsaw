# PA pipeline (run with `python -I -X utf8`; standard library only; below-normal priority is set inside `pa_common.py`)

Order: `oob_units.py` (units.json) -> `ia_find.py`, `ia_meta.py` (candidates, rights flags) -> `dl.py <ident>:djvu.txt|djvu.xml` (cached, sha256, 1.6-2.6 s between requests) -> `pages.py <vol>` -> `layout.py <vol>` -> `assemble.py <vol>` (vols 01 02 03 04 00; 00 is volume 5) -> `emit.py [unit_id ...]` (reads `unitmap.py`, `classify.py`, `dates.py`) -> `pag.py` (strength inscriptions) -> `stats.py`.

Second OCR (optional, resumable): `datecol_fetch.py [max_pages]` -> `winocr.ps1 -InList <list> -Out datecol80_ocr.jsonl` (PowerShell, Windows.Media.Ocr, offline; run from a PowerShell session, not a bash call, so the execution policy stays as the user set it) -> `datecol_apply.py` -> `emit.py` -> `stats.py`.

Helpers: `pageimg.py <ident> <idx>` (one page image for a QA check), `snc.py` (Soldiers' National Cemetery table, incomplete).

Cache: `tmp/library/rosters/PA/` (not committed). Total downloaded by this family stays under 1.5 GB (`acquired.json`).
