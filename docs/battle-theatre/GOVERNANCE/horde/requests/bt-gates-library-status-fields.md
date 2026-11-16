# Request from bt-gates to the library registrar (bt-web, ws9-sources): the fields that gate Q25 reads, and the rows it finds missing

Written 2026-11-16 by workstream bt-gates (the Q25 runner, `tools/bt/gates/q25_library.py`). Not done by bt-gates because `GOVERNANCE/library/**` is not in its ownership list.

## What

Gate Q25 ("every source in the acquisition list is ingested, blocked with register entry, or scheduled with a reason") judges every status row of `GOVERNANCE/library/status*.json` (merged by id, the highest-numbered file wins) and every entry of `acquired*.json`, `candidates.json` and `figures-ledger.json`. At the first run (2026-11-16 00:30 UTC) the verdict is FAIL: 15 items PASS, 237 FAIL, 1 BLOCKED-INPUT. The runner reads these fields, none of which any status row carries today:

* `blocked`, `blocked-to-prior-research`, `print-only`, `viewer-only`, `unusable` (the failed read): `register_id` (or `register_ids`), an id of an open or awaiting-owner entry that has a file `register/<id>.md`; `failed_lookup` (a list of `{host, locator, date, response}`); `print-only` and `viewer-only` also `owner_step` (the exact purchase, loan or terms step for the owner); `viewer-only` also `terms_read` `{host, locator, date, permits}`; `unusable` also `failed_read` `{tested, result, date}`.
* `scheduled` (also the scheduled remainder of a `partial` row): a `reason` that is not "for now", `next_action`, and `queue_entry`, an id that resolves in a new file `GOVERNANCE/library/work_queue.json` (a list of `{id, source_id, next_action}`). That file does not exist: every `scheduled` row is FAIL until it does.
* `partial`: `remainder` `{status: scheduled|blocked, ...}` with the record of the remainder; `targeted-lookup-only`: `lookups` (each with `sha256` and `date`) and `remainder` with its reason; `finder-not-authority`: `tier: lead`.
* The Official Records rows `OR-27-1`, `OR-27-2`, `OR-27-3`: `second_witness` `{status: diffed|unreachable, host, date, result}` (X.3 a; the hosts babel.hathitrust.org and ehistory.osu.edu answered with their own bot block, so `unreachable` with the date).
* `GOVERNANCE/library/terms.json`: `{hosts: {<host>: {robots_checked, terms_checked, date, note}}}` for every host a request was made to (Q25.4).
* A status row for a host that answered with a bot block: `babel.hathitrust.org` and `ehistory.osu.edu` as `blocked` rows (not circumvented, not retried).

Rows missing (each is FAIL "no status row reaches this entry" at the first run): 75 acquisition entries, among them `BL-3` (Battles and Leaders, acquired.json), the National Park Service web pages `NPSGOV-*` and the HABS drawings `NPS-HABS-*` (acquired_3.json), `FIG-L-GOULD-1869` and `FIG-L-ACWII-MOD` (figures-ledger.json); the Appendix C.1 rows with no status row (`tools/bt/gates/lib/acquisition_list.json`, `status_ids: []`: HathiTrust copies, IA reprint scans, Cope and Elliot maps, NPS GIS, NPS geologic GIS, Knowles reconstruction, Tipton prints, Allmaps, agricultural and damage records, photographic repositories, Busey and Busey, Frassanito, Battles and Leaders, Dyer, Phisterer, Clark, NPS Civil War Series, uniform references, museum collections, acoustics, regimental histories, memoir sets, ABT library, the Gettysburg Daily Blog (plan handling: skip), modern reprints, NARA, Fold3 and others); 28 of the 45 catalogue rows of B.9 (`lib/library_ids.json` `r12_to_status` lists the 17 that a status row names; 44 of the 45 rows are FAIL at the first run, R12.035 is PASS); the medical works that DEC-OA10-12 names (`MSHWR-*`, `GROSS-*`, `TRIPLER-*`, `WOODWARD-*`; see `bt-gates-medical-library-status.md`).

Stale blocks (retry owed): `NPS-SEM` (blocked 2026-11-11 for npshistory.com; 73 reports were fetched from it on 2026-11-13) and `LOC-MAPS` (undated; www.loc.gov answered on 2026-11-11, 13 and 14). Update both rows with a dated record, or ingest.

`acquired.json` records only the day of acquisition, so the throttle of Q25.4 (one request per second per host) cannot be read from it; add `fetched_at` with seconds to new entries.

## The exact change asked for

Add a new status file (`status_4.json`; the earlier files are not edited, as `status_3.json` was added) with the rows and fields above, and the two new files `work_queue.json` and `terms.json`. Where a rule of the runner is wrong, say so in a note beside this one; do not reword a status to pass.

## Why it matters

Q25 and, through it, R08.0000, R12.0000, R21.0000 and the 45 R12 catalogue rows cannot reach LINKED-ACTIVE or PASSING while a source is silently skipped (PDF p. 138, Z.7). Nothing is blocked: the runner reads whatever exists when it runs (`python3 tools/bt/gates/q25_library.py`, 1 s).

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
