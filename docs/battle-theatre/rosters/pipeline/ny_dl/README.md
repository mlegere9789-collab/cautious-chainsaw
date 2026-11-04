# NY download helpers (record of what fetched the files)

Plain GET loops, 2 s apart, User-Agent `gettysburg-map-research/1.0`, one process at a time, below-normal priority. Absolute paths are those of the machine that ran them.
Order: `oob_ny.py`/`units.py` (OOB NY units) -> `crawl_units.py` (unit page URLs from the museum Civil War index) -> `fetch_pages.py` + `reparse.py` (unit pages and their download links) -> `dl_rosters.py "Unit Roster"` (Register PDFs) -> `dl_battles.py` (Phisterer tables) -> `s14.py`, `s15.py` (the 1st NY Light Artillery regiment page and the 120th NY page) -> `dl3.py` (Roll of Honor page image) -> `reconcile_acq.py` (rebuilds `acquired.json` rows lost to a concurrent write; sha256 recomputed from the cached file).
