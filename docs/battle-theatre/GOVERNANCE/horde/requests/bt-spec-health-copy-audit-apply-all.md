# One script that clears eight of the nine copy-audit hits of the staging build (tested on a snapshot of the tree), from bt-spec-health (staging packer), 2026-11-15 23:15 UTC

To: the orchestrator, and the owners named in `bt-renderer-staging-copy-audit-2.md`, `bt-units-positions-staging-copy-audit.md` / `-2.md`, `bt-world-content-staging-copy-audit-2.md`, `bt-oob-kit-build-guns-doc.md`. It replaces nothing: it puts the exact change of those notes in one place, with the generator and the data file it writes changed together, and says what was checked.

## State today
`node tools/bt/pack_theatre.mjs --no-zip --out tmp/x/dist` on the tree of 2026-11-15 23:05 reports **9 hits in 9 files**, the same nine as on 2026-11-14 01:10 (nobody has edited them since). While any is left, the staging zip is named `-AUDIT-HITS-<n>` and is not an acceptable build (GOVERNANCE/FINAL-ACCEPTANCE.md, copy audit rules). The packer is not changed to let them through, and it does not edit shipped code.

| # | File:line (under docs/battle-theatre) | Lane |
|---|---|---|
| 1 | `app/data/battery-guns.json:3` with its generator `app/tools/build-guns.mjs` line 30 | guns (no ownership list names the generator: the orchestrator) |
| 2 | `app/data/engagements.json:3` with `app/tools/build-engagements.mjs` line 42 | units |
| 3 | `app/data/gazetteer.json:1` with `app/tools/build-gazetteer.mjs` line 172 | units |
| 4 | `app/src/history/gazetteer.mjs:1-2` (comment) | units |
| 5 | `app/src/anim3d/gaits.mjs:73` (comment) | figures |
| 6 | `app/src/figures3d/evidence.mjs:2` (comment) | figures |
| 7 | `app/src/figures3d/tiers.mjs:1-2` (comment) | figures |
| 8 | `app/src/structures/model.mjs:3` (comment) | structures |
| 9 | `app/src/figures3d/skeleton.mjs:193` (`generated_by: '...'`) | figures: **not in the script**, see the end |

## The script
It is kept at `tmp/bt-spec/apply-copy-audit-fixes.mjs` on this machine (run from the repository root) and printed here. `node tmp/bt-spec/apply-copy-audit-fixes.mjs [figures|units|structures|guns]`, no argument = every lane. It changes a lane only when EVERY old text of that lane is in its file exactly once (so it refuses a file somebody has already edited, and writes nothing of that lane); it works whatever the line endings of a file are (the old texts are single-line fragments).

```js
// node apply-copy-audit-fixes.mjs [figures|units|structures|guns]     (run from the repository root; no argument = every lane)
import fs from 'node:fs';
const D = 'docs/battle-theatre/', A = D + 'app/', S = A + 'src/', T = A + 'tools/', DA = A + 'data/';
const E = [
  ['figures', S + 'anim3d/gaits.mjs', '// the table written to data/anim3d/gait-sources.json (build-anim3d.mjs)', '// the table of gait sources (data/anim3d/gait-sources.json)'],
  ['figures', S + 'figures3d/evidence.mjs', '// Written to data/figures3d/evidence.json by tools/figures3d-build.mjs. Rules (the project Law)', '// The same ledger is kept in data/figures3d/evidence.json. Rules (the project Law)'],
  ['figures', S + 'figures3d/tiers.mjs', 'gap = open item with a marked placeholder). Written to', 'gap = open item with a marked placeholder). The same table is kept in'],
  ['figures', S + 'figures3d/tiers.mjs', '// data/figures3d/TIERS.json by tools/figures3d-build.mjs. What the KIT', '// data/figures3d/TIERS.json. What the KIT'],
  ['units', S + 'history/gazetteer.mjs', '(data/gazetteer.json, built by', '(data/gazetteer.json, taken from'],
  ['units', S + 'history/gazetteer.mjs', '// tools/build-gazetteer.mjs from docs/basemap1863 roads', '// the docs/basemap1863 roads'],
  ['units', T + 'build-gazetteer.mjs', 'repository files only (tools/build-gazetteer.mjs). resolution:', 'repository files only. resolution:'],
  ['units', DA + 'gazetteer.json', 'repository files only (tools/build-gazetteer.mjs). resolution:', 'repository files only. resolution:'],
  ['units', T + 'build-engagements.mjs', ', built by app/tools/build-engagements.mjs from app/tools/engagement-clauses.mjs. Time is minutes', '. Time is minutes'],
  ['units', DA + 'engagements.json', ', built by app/tools/build-engagements.mjs from app/tools/engagement-clauses.mjs. Time is minutes', '. Time is minutes'],
  ['structures', S + 'structures/model.mjs', '(built from the basemap1863 layers by tools/build-structures3d.mjs)', '(from the basemap1863 layers)'],
  ['guns', T + 'build-guns.mjs', ' Built by app/tools/build-guns.mjs.', ''],
  ['guns', DA + 'battery-guns.json', ' Built by app/tools/build-guns.mjs.', ''],
];
const lane = process.argv[2];
if (lane && !E.some(e => e[0] === lane)) throw new Error('lane is one of figures, units, structures, guns');
const todo = E.filter(e => !lane || e[0] === lane), text = new Map();
for (const [, f] of todo) if (!text.has(f)) text.set(f, fs.readFileSync(f, 'utf8'));
for (const [l, f, o, n] of todo) { const s = text.get(f); if (s.split(o).length !== 2) throw new Error(`${l}: ${f}: the old text is not there exactly once (already edited?): ${o}`); text.set(f, s.replace(o, () => n)); }
for (const [f, s] of text) { fs.writeFileSync(f, s); console.log('changed ' + f); }
```

## What was checked (on copies; none of the files of other workstreams was touched)
1. The three generators are deterministic: run on the real tree with their output redirected (`ENGAGEMENTS_OUT`, `BATTERY_GUNS_OUT`, `GAZ_OUT`) they give the committed data files byte for byte (`cmp`).
2. The script was run on copies of the 11 files in a scratch tree that has the real `GOVERNANCE`, `history`, `kit`, `library` and `docs/basemap1863` behind symlinks. The **patched** generators then give the **patched** data files byte for byte (`cmp`, all three), so a later regeneration changes nothing. No test reads the removed words (`_doc` of the three files is read by no module of the shell: `grep -rnP "(?<![\w])_doc\b" docs/battle-theatre/app/src`; the comments are comments).
3. The script was run on a snapshot copy of the whole tree (`snapshotTree`) and the snapshot packed: **9 hits before, 1 after** (only `skeleton.mjs:193`); the load census and the other checks of the pack are unchanged (245 files, 0 census findings).
4. Run by the owner of a lane, only the lane's own entries are written. After it: `node tools/bt/pack_theatre.mjs --no-zip --out tmp/x/dist` (the "auditHits" count) and the tests of the lane (`tests/casualties.test.mjs` compares `build()` of the guns generator with the committed file; the history tests read gazetteer and engagements).

## The ninth hit (figures lane): `app/src/figures3d/skeleton.mjs` line 193
`generated_by: 'docs/battle-theatre/app/src/figures3d/skeleton.mjs (node docs/battle-theatre/app/tools/figures3d-build.mjs writes this file)',` is a member of the object the module returns. Change the value to one that names no program (for example `source: 'the figure rig of the theatre'`, or delete the member), then run `node docs/battle-theatre/app/tools/figures3d-build.mjs` (about 10 to 20 seconds, below-normal priority): it writes `data/figures3d/skeleton.json` with its new `content_sha256` and with it `hashes.json` and `manifest.json` (the root hash), which `tests/figures3d.test.mjs` re-checks ("skeleton.json on disk is the one this code generates", the hashes test). Not in the script because the exporter has to write three hashed files; the packer already cuts the member from the SHIPPED copy of `skeleton.json` (publication filter DD-STG-01), only the module text is left.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
