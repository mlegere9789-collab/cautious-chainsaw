# ver-hist-node - HANDOFF

Item: VER-HIST-NODE (plan chapter 14, verification debt; backlog id `ver-hist-node`). Route: source-rebuild. Nothing in the shipped bundle or pages changes: no patch group, no overlay, no train row, no request note. The historian tooling is build tooling; no train ships a file under `tools/historian` or `tests/historian`.

**State written 2026-11-14 01:31 UTC: built and green on both Nodes; the paired run of the whole suite has been queued behind the machine lock since 01:21 UTC and has not run yet. STATUS.json says `passes: false` until it has.** This note is replaced by the final one (with the totals) when the run has finished. If you find this version: read `tmp/r1h-cand/ver-hist-node/record.out`, `tmp/r1h-cand/ver-hist-node/check-totals.out` and STATUS.json first (the queued job writes them when it is done); if the job is gone (container restart), start it again, first and in the background: `tools/horde/bench.sh --timing bash candidates/r1h/ver-hist-node/run-suites.sh > tmp/r1h-cand/ver-hist-node/run-suites.out 2>&1 &`.

## What was wrong

`tools/historian/ingest/times.mjs` reads the clock times that the Official Records give (`parseClock`). Its meridiem pattern had to be case-sensitive in one part ("AM" is a time; a bare lower-case "am" is the OCR's "I am", as in "1 am informed") inside expressions compiled with the `i` flag, and it was written as a regular-expression modifier group, `(?-i:[AP]\.?\s?M)`. V8 compiles such a group from version 12.5 (Node 23). On the container's default Node 22.23.4 the file stopped at line 26 with `SyntaxError: Invalid regular expression`, and with it every test that imports the ingest chain: 22 of the 34 test files of `tests/historian` did not load, `atime.test.mjs` among them.

## What changed (two files, nothing else)

- `tools/historian/ingest/times.mjs`: no modifier group any more. The three patterns that read a meridiem (range, clock, spelled) are compiled without the `i` flag from a source in which every letter is spelled in both cases (helper `both()` and template tag `ci`, which refuse what they cannot convert: named groups, `\x \u \p \k \c` escapes, letter ranges in a class); the capitals-only branch for "AM" and "PM" is kept as it was. The comment block says why. The module's exports and the shape of every reading are unchanged.
- `tests/historian/times-node22.test.mjs`: new, 4 tests. (1) no file of `tools/historian`, `tests/historian`, `historian-src/core`, `historian-src/page`, `src/lib/time` holds a modifier group (the scan is shown its own positive and negative examples first); (2) the cases that matter: "a. m.", "A. M.", "P.M.", "AM", "10 p.m." are read, a bare "am" or "pm" ("1 am informed") and "Am" are not; (3) a table of 263 pinned inputs with their 240 readings (offsets, kind, minute, tolerance, modifier; clock 113, noon 20, range 13, oclock 44, spelled 22, midnight 5, sun 23), written from the OLD text of the file (git blob `cdc9c0a1`, read under Node 24), hand-made phrasings and real sentences of the Official Records; (4) every spelling of the meridiem (letters in both cases, stop or none, a space, tab, line break or no-break space between the parts) against a plain statement of the rule, as a clock, as the end of a range and after a spelled hour.
- Nothing was skipped, loosened or deleted: `git log --name-status b1f6814d..HEAD -- tests/historian tools/historian historian-src` lists only `times.mjs` (modified) and `times-node22.test.mjs` (added). `tests/historian/atime.test.mjs` and its 23 cases are untouched.
- No `engines` field and no `.nvmrc` is added for the historian (pinning Node 24 was the alternative): delegated decision row VHN-1 in `docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md`, consistent with row W09-4 (floor Node 22.23.4).

## How it was verified

Red first (logs in this folder):
- `red-atime-node22.log`: `node --test tests/historian/atime.test.mjs` under Node v22.23.4 on the unchanged tree (times.mjs blob `cdc9c0a1`): SyntaxError at `times.mjs:26`, exit 1.
- `red-suite-node22.log`: the whole suite under Node 22 on the unchanged tree: 22 of 34 files do not load.
- `red-newtest-oldtext-node22.log` and `red-newtest-oldtext-node24.log`: the new test against a copy of the code with the OLD times.mjs: under Node 22 it cannot load; under Node 24 test 1 (no modifier group) fails with the offending line and tests 2 to 4 pass, which is the point: the old text reads the same things, it only cannot be compiled by Node 22.

The readings did not move:
- `differential.mjs` (Node 24, the old and the new text loaded side by side, the full result rows compared): 625,025 corpus inputs (every line, 3-line window, paragraph and sentence of the three Official Records volume 27 OCR texts in `tmp/library/or27`, 1,250,050 calls), 5,572 corpus clock claims, 2,480,184 exhaustive inputs (14 frames times every string of up to 5 characters over `a A p P m M . , space newline x`), 400,000 fuzz and 400,000 grammar inputs, seed 20261113: 0 mismatches, equal digests (`differential-node24.json`). It reads `tmp/library/or27`, which is not in git.
- `mutants.mjs`: nine wrong hand conversions of the pattern (capital branch made case-insensitive or dropped, `cl[oe]ck`, number words without twelve, `minutes` without the s, comma no longer a stop, white space before the stop dropped, `both()` leaving a class in one case, "between|from" case-sensitive) are each caught by the differential run and by the new test (`mutants.json`, all caught).
- `hx-build-check.mjs`: `node tools/historian/build.mjs` builds 261 files under Node 22 and under Node 24, identical to each other and to the committed `historian-src/dist/hx` on every shared name (`hx-build.json`).
- Under Node 22.23.4 and Node 24.22.1: `times-node22.test.mjs` 4 of 4, `verify-ingest-clock.test.mjs`, `atime.test.mjs` 23 of 23 (commands below; their results are in STATUS.json once the record is written).
- A whole-suite run in shared mode under the default Node 22.23.4 before the paired run (local log `tmp/r1h-cand/ver-hist-node/suite-node22-normal.log`): 478 tests, 391 pass, 0 fail, 87 skipped, no file failed to load. Under Node 24 before the change the suite gave 474 tests, 387 pass, 0 fail, 87 skipped; the 4 more tests are the new file.

## The paired run (acceptance 2)

`tools/horde/bench.sh --timing bash candidates/r1h/ver-hist-node/run-suites.sh` runs `node --test tests/historian/*.test.mjs` under Node 22.23.4 and then under `/opt/node24/bin/node` (24.22.1), alone on the machine behind the exclusive lock, and writes `suite-node22.log` and `suite-node24.log`. The test-file list and the content hash of what the suites read (`tools/historian tests/historian historian-src src/lib/time data-src/time`, files that existed at the start, `*.d.ts` left out because Node never loads one and no test reads one) are fixed once at the start, so files other entries add meanwhile are in neither run while an edit of an existing file still voids the run. `check-totals.mjs` reads the two logs: every file loaded, no "Invalid regular expression", identical tests, pass, fail, cancelled, skipped and todo totals, identical exit codes, equal tree hashes at the start and end of both runs, and every test with the same outcome under both Nodes (`per_test`). The job does not end at the two logs: still holding the lock it runs `check-totals.mjs --write` (merges `node_totals` into STATUS.json) and, only if that holds, `record.sh`.

Result: not run yet.

## Commands (all from the repository root)

Record (what `record.sh` runs; each is run by `candidates/r1h/_lib/record.mjs`, which sets `passes` from the exit codes):

```
node candidates/r1h/_lib/record.mjs ver-hist-node \
  --test "node --test tests/historian/times-node22.test.mjs" \
  --test "/opt/node24/bin/node --test tests/historian/times-node22.test.mjs" \
  --test "node --test tests/historian/verify-ingest-clock.test.mjs" \
  --test "/opt/node24/bin/node --test tests/historian/verify-ingest-clock.test.mjs" \
  --test "node --test tests/historian/atime.test.mjs" \
  --test "/opt/node24/bin/node --test tests/historian/atime.test.mjs" \
  --test "node candidates/r1h/ver-hist-node/check-totals.mjs" \
  --red-cmd "node --test tests/historian/atime.test.mjs" --red-exit 1 --red-log candidates/r1h/ver-hist-node/red-atime-node22.log \
  --files tools/historian/ingest/times.mjs,tests/historian/times-node22.test.mjs,candidates/r1h/ver-hist-node/STATUS.json,candidates/r1h/ver-hist-node/HANDOFF.md
```

`record.mjs --check` (and `python3 docs/plan/STATUS/check_backlog.py --rerun ver-hist-node`) only re-runs these and compares exit codes; it does not flip `passes`. `atime.test.mjs` takes about 25 s per Node: behind the lock, `tools/horde/bench.sh bash candidates/r1h/ver-hist-node/record.sh`.

## How the release workstream registers it

It does not. Nothing here is a candidate group; nothing in `release/`, `tools/t0`, `deliver/` or a train changes, and no anchor moves. A future CI job for the historian (none exists today) should run `node --test tests/historian/*.test.mjs` under Node 22 and Node 24, the pair this item proves.

## Not run, owed

- 87 of the 478 tests are skipped, identically on both Nodes: they need the corpus build (`historian-src/raw/or27`, `tmp/historian-cache`), which has not run in this container (backlog entry ver-hist-corpus). Whatever they cover is not proven by this item.
- No browser, no real device, no GPU: nothing here runs in a browser.
- No CI exists to run the pair on every change.
- The latency assertion of `engine.test.mjs` is a timing measurement taken on a shared 4-vCPU machine; the load average at the start of each run is in the logs.
