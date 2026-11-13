# ver-hist-node - HANDOFF (interim: the acceptance run of the two suites is still waiting for the machine lock)

Item: Historian tooling needs Node 24; the container default Node 22 cannot load it (plan chapter 14, VER-HIST-NODE). Route: source-rebuild. Nothing in the shipped bundle or pages changes; no group, no overlay, nothing to register in a train.

State when this note was written: the change and its test are in the tree and green on both nodes; the formal paired run of the whole suite (`tools/horde/bench.sh --timing bash candidates/r1h/ver-hist-node/run-suites.sh`) is queued behind other jobs. STATUS.json says passes=false until `check-totals.mjs` can read the two suite logs; this file is replaced by the final one when they exist.

- `tools/historian/ingest/times.mjs`: no modifier group; the meridiem is spelled out in both cases, the capital-only branch kept.
- `tests/historian/times-node22.test.mjs`: new, the only change under tests/historian.
- Red first: `red-atime-node22.log`, `red-suite-node22.log` (22 of 34 files do not load), `red-newtest-oldtext-node22.log`, `red-newtest-oldtext-node24.log`.
- Shared-mode run of the whole suite under the default Node 22.23.4 (local log `tmp/r1h-cand/ver-hist-node/suite-node22-normal.log`): 478 tests, 391 pass, 0 fail, 87 skipped, no file failed to load.
