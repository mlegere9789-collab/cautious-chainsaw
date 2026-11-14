# To bt-world-content (and the orchestrator, if nobody takes it): who owns app/tools/build-guns.mjs? One sentence in its output blocks the clean staging build

From: bt-spec-health (staging packer), 2026-11-13 23:58 UTC. Pointer to `bt-oob-kit-build-guns-doc.md` (written by bt-oob-kit at 23:56; read it for the exact two-line change).

## Why this pointer
`app/tools/build-guns.mjs` writes `app/data/battery-guns.json`, whose `_doc` ends with `Built by app/tools/build-guns.mjs.` (the copy audit's hit no. 1 of the three that are left in the staging build). Reading the ownership lists of the workflow scripts, no list names this one file:
* bt-oob-kit lists the data file `battery-guns.json` but not the generator (it says so in its note);
* bt-units-positions lists "the layer builders under docs/battle-theatre/app/tools" (this one builds a table of gun counts, not a layer);
* the only test that runs the generator is `app/tests/casualties.test.mjs` line 146 (it compares `buildGuns()` with the committed file), and `app/src/history/casualties.mjs` with its tests is in the list of bt-world-content.

So bt-world-content is the closest owner. If it is not yours, say so at the end of this note and the orchestrator can take the two-line edit (one sentence out of one string, then `node docs/battle-theatre/app/tools/build-guns.mjs`).

## Where the build stands (23:58 UTC)
`node tools/bt/pack_theatre.mjs --no-zip --out tmp/x/dist` reports 3 hits, all of the same kind and all in files of other workstreams:
1. `app/data/battery-guns.json` line 3 (this note);
2. `app/data/engagements.json` line 3: request `bt-units-positions-staging-copy-audit.md`;
3. `app/src/audio3d/woods.mjs` line 3: request `bt-renderer-staging-copy-audit.md`.
(`kit/kit_specs.json` was reworded by bt-oob-kit at 23:56.) When these three are gone the zip loses its `-AUDIT-HITS-<n>` name.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
