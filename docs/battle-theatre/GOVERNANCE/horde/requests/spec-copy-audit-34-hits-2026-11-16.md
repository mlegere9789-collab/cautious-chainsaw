# Staging copy audit on the tree of 2026-11-16 (commit 9440f2d2 plus the working tree): 34 hits in 20 shipped files, from bt-spec-health (staging packer)

To: the orchestrator and the owners named below. The packer is not loosened and edits no shipped file; while any hit is left the staging zip is named `-AUDIT-HITS-<n>` and is not an acceptable build.

Reproduce: `node tools/bt/pack_theatre.mjs --no-zip --out tmp/x/dist` (prints every hit with file, line, matched text). Files under docs/battle-theatre.

## New since the 9 of 2026-11-15 (all are wording of the working process; the facts stay, only the process words go)
| file : lines | match | lane | change asked |
|---|---|---|---|
| GOVERNANCE/timeline_seed.jsonl : 474 | "task brief" (row text "The task brief says evening") | timeline | reword the row text to say what the source says (for example "the report says evening") without naming a brief |
| app/data/artillery-train.json : 3, 4, 27, 31, 36, 41, 46 | /horde, workstream, shard | structures (ws6) | say "Evidence-Gap Register entries EG-.." and "read from the Official Records" instead of workstream, shard names and horde paths |
| app/data/works3d.json : 3, 49, 269, 321, 455, 478, 527 | workstream, shards, shard | structures (ws6) | same: cite the register entry id and the Official Records page, drop "shard terrain-1" and "this workstream" |
| app/src/structures/artillery.mjs : 6, 38; works3d.mjs : 6; index.mjs : 14, 28, 40 | /horde, shard, workstream | structures | comments and the `basis:` string (line 38 reaches the screen) and the console.warn text of index.mjs line 40 |
| app/src/anim3d/bake.mjs : 12, 80 | "in this round" | figures | "UNVERIFIED on a GPU" without "in this round" |
| app/src/history/cavalry.mjs : 1 | "workstream ws10" | figures / history | drop the parenthesis |
| app/src/figures3d/evidence.mjs : 1 | "shard" | figures | drop "shard vis-figures" |

## Still open from the nine of 2026-11-15 (note bt-spec-health-copy-audit-apply-all.md; nobody has edited them)
app/data/battery-guns.json:3, app/data/engagements.json:3, app/data/gazetteer.json:1, app/src/history/gazetteer.mjs:1, app/src/anim3d/gaits.mjs:73, app/src/figures3d/evidence.mjs:2, app/src/figures3d/tiers.mjs:1, app/src/figures3d/skeleton.mjs:193. The script `tmp/bt-spec/apply-copy-audit-fixes.mjs` clears eight of them (see that note).

## Check
`node tools/bt/pack_theatre.mjs --no-zip --out tmp/x/dist` ("auditHits"), then `node --test tests/bt-pack/pack.test.mjs` (the shipping gate "copy audit of the shipped dist is clean").

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
