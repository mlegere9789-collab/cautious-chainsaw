# candidates/r1h

Home of the candidate groups of the main-site workstream for train R1h: page groups, bundle rows, overlay files and data patches that are built and tested here but registered in no train until the release workstream takes them. R1h is cumulative on R1g (release id 52cec836); R1g stays frozen.

Rules for everything in this folder:
- Nothing here ships by itself. A candidate becomes part of a train only when the release workstream registers it in tools/t0/trains.json and rebuilds.
- Each candidate has a red-first test (it must fail on the tree without it).
- No file here may mention how the site was produced; the same copy audit applies as for shipped files.
- The work list is docs/plan/STATUS/backlog.json (one entry per open item of docs/plan/STATUS/items-A.json and items-B.json; summary in docs/plan/STATUS/STATUS.md). The folder name of a candidate is the backlog id (lowercase letters, digits, hyphens).
- Nothing weakens a gate, a threshold or a test to make a candidate pass. `passes` is true only when `prove.mjs` or `record.mjs` ran the check and it held.

## A candidate of route "candidate-group" (changes to the published pages, bundle, data or new overlay files)

```
candidates/r1h/<id>/
  group.json     patch group, format of tools/t0/README.md "Patch data files": {"group": "PG-r1h-<id>", "train": "R1h", "optional": true, "patches": [{id, target, find, repl, expect[, regex]}], "delete": []}
                 A group that patches the bundle (target js, help, book, css) must not be named PG-*; call it R1H-<id>.
                 Anchors are written against the text of release/R1g/dist (cumulative: the finished R1g text), every patch id starts with "r1h-<id>-", expect is the exact count.
  overlay/       new files, path relative to the dist root (a file the group adds, for example well-known/security.txt)
  test.mjs       red-first test (node:test). It reads the tree through candidates/r1h/_lib/tree.mjs: openTree().text('manifest.json'). Red run: untouched R1g tree, must fail. Green run: scratch tree with the group applied, must pass.
  STATUS.json    written by prove.mjs (route, anchors, red run, green run, passes); keep a "notes" array of what was NOT run (browser, GPU, device)
  HANDOFF.md     for the release workstream: files, the registration step (group name, train row, order after which group), expected anchors.json delta, identity-file lines the change needs, risks, and every request note written (docs/battle-theatre/GOVERNANCE/horde/requests/main-site-<id>.md) for files outside this workstream (tools/t0, tests/t0, ops/)
```

Commands (all from the repository root):

```
python3 candidates/r1h/_lib/apply_group.py <id>      apply group.json and overlay/ to a scratch tree (tmp/r1h-cand/<id>/green); every anchor is asserted with the build's own applier; report in tmp/r1h-cand/<id>/report.json
node candidates/r1h/_lib/prove.mjs <id>              anchors, red run (must fail), green run (must pass); writes STATUS.json; add --check to verify an existing STATUS.json without writing
node tools/copy/copy_lint.mjs <scratch tree or file> --no-baseline --rules <IDS>      copy rules (REALTIME, TICK, AIPERSONA, ...) on the patched files
tools/horde/bench.sh node candidates/r1h/_lib/prove.mjs <id>    when the test starts a browser or needs more than about 30 s of CPU
```
The scratch tree is sparse (only touched files); tests that need a whole tree for a browser run build one with `python3 tools/t0/build.py --train R1g --patches <dir> --out tmp/r1h-cand/<id>/full` through the machine lock, where `<dir>` is a copy of tools/t0/patches plus the group file. A full build proves the anchors in order; the sparse tree is the quick proof.

## A candidate of route "source-rebuild" (work under src/, historian-src/, data-src/, tools/data, tools/time, tools/historian, tests/data, tests/time, tests/historian)

The work lives in its own directories. The record of the item lives here, so every backlog item is closed the same way:

```
candidates/r1h/<id>/STATUS.json   written by record.mjs (route, the test commands that were run and exited 0, the red-first record, passes)
candidates/r1h/<id>/HANDOFF.md    what was built, where, how a train or the next work package consumes it, what was not run
```
```
node candidates/r1h/_lib/record.mjs <id> --test "node --test tests/<area>/<name>.test.mjs" --red-cmd "<same command before the change>" --red-exit 1 --red-log tmp/r1h-cand/<id>/red.log --files path1,path2
node candidates/r1h/_lib/record.mjs <id> --check
```
The red-first record is the failing run captured before the implementation (its log must exist and be non-empty).

## Closing rule

An item is done only when its STATUS.json says `"passes": true`, HANDOFF.md exists, the files named in the backlog entry exist, and `python3 docs/plan/STATUS/check_backlog.py --rerun <id>` has re-run the recorded check and got the same result. `python3 docs/plan/STATUS/check_backlog.py` validates backlog.json and every done claim; `python3 docs/plan/STATUS/merge_status.py` rebuilds STATUS.md and backlog.json from items-A.json, items-B.json and backlog-authored.json.

## Conventions

- Folders whose name starts with an underscore (`_lib`, `_selftest`) are tooling and are not backlog items.
- A candidate never edits tools/t0, tests/t0, tools/accept, tools/ship, release or deliver (the release workstream owns them): it prepares the change as files in its own folder and writes the request note.
- The Virtual Walkthrough and the Monuments section are protected (owner decision 2026-10-04 item 3, delegated row A69): no patch of their code without a row of the walkthrough guard that names it.
- Candidates for opt-in or owner-gated features are `"optional": true` and stay out of every train until the release workstream registers them on a recorded decision.
