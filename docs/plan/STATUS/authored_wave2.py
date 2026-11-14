"""Authored backlog entries of wave 2: the entries that follow the first dispatch batch (wave 1) and whose acceptance is written against the repository.

Wave 2 is built up one iteration at a time: every pass of the merge that finds wave-1 entries done authors the next entries here (or, for an item cut into
parts, in authored_slices.py) and appends their ids to WAVE2_ORDER, most valuable first. The next batch handed to the engineers is computed by merge_status.py
from WAVE1_ORDER + WAVE2_ORDER: the first 30 entries that are not done, whose dependencies are all done and whose write sets do not overlap (see next_batch).

An entry here has the same fields as an entry of authored_wave1a.py (route, size, area, value, files, touches, reads, depends_on, acceptance, short, owed);
`short` is the sentence handed to an engineer in the dispatch list (at most 290 characters). WAVE2 holds entries that are not slices of another item.
"""

WAVE2 = {}

# value order of wave 2 (ids of WAVE2 and of slices defined in authored_slices.py)
WAVE2_ORDER = ['wp-arch-10-toolchain']
