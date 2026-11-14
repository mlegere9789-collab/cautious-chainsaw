# To bt-world-content (structures lane): one comment in app/src/structures/model.mjs names the program that made a data file (staging copy audit, stricter rules of 2026-11-14)

From: bt-spec-health (staging packer), 2026-11-14 00:27 UTC. The audit of `tools/bt/pack_theatre.mjs` was made stricter today because a read of the real files showed wordings it did not see; the rule is the owner's (nothing shipped says how the site was made, GOVERNANCE/FINAL-ACCEPTANCE.md, copy audit rules). A checker or a test cited as the method of a reading is still allowed.

## What
`app/src/structures/model.mjs` line 3:
`// Nothing is invented: geometry comes only from data/structures3d.json (built from the basemap1863 layers by tools/build-structures3d.mjs); dimensions the record prints are used`
becomes
`// Nothing is invented: geometry comes only from data/structures3d.json (from the basemap1863 layers); dimensions the record prints are used`
(a comment only; `app/src/structures/**` is in your ownership list).

## Also open, and a pointer
`app/data/battery-guns.json` line 3 (`Built by app/tools/build-guns.mjs.`): no ownership list names `app/tools/build-guns.mjs`, the generator of that file. The request is `bt-oob-kit-build-guns-doc.md` (written by bt-oob-kit), with the pointer `bt-world-content-build-guns-doc-pointer.md`. It is one of the lines the staging zip is named for.

## Not hits, advisory (words of the working process in shipped files; counted for the acceptance review)
The audit counts the words workstream, horde and shard (they name no tool, so they do not fail it), and the owner's rule is that nothing shipped says how the site was produced. In your lane they stand in strings a visitor or a console can show:
- `app/data/artillery-train.json`: 12 mentions (`as read by shard terrain-1 (GOVERNANCE/horde/terrain-1/proposed-register/terrain-1-EG-17.md: ...)`, `(shard terrain-1; 'six 12-pdr'; the same shard records ...)`, workstream, horde); `app/src/structures/artillery.mjs` line 38 builds the visible basis text `Official Records, read by shard terrain-1, not re-verified here: ...` from it, and lines 6 of `artillery.mjs` and `works3d.mjs` cite `GOVERNANCE/horde/ws6-structures/proposed-register/` (a working folder that is not part of the build: the link would be dead anyway).
- `app/data/works3d.json`: 7 mentions (`the shards' second-witness extraction`, `(shard terrain-2, P-14)`, workstream).
- `app/src/structures/index.mjs` lines 14, 28 and 40: `workstream 6 inputs`, `workstream 6 draw lists`, `console.warn('workstream 6 lists not built:', ...)`.
A neutral wording keeps the evidence and drops the process: cite the Official Records page and the register entry id (`OR27-1-R028 Hunt p.229-231`, `EG-17`), not the pass that read it or the working path; `the artillery train inputs`, `the construction-state inputs`.
`GOVERNANCE/timeline_seed.jsonl` line 474 (row T3-001) says `The task brief says evening.`: that sentence is the owner's own PDF text (BIBLE/plan-clean.txt line 10427), not yours and not mine to change; it is only listed for the acceptance review.

## Check
```
node tools/bt/pack_theatre.mjs --no-zip --out tmp/x/dist     # "auditHits" counts what is left
```

When done, append `-- handled: <what was done>` to this note with a shell `>>`.

-- patch ready (bt-spec-health, 2026-11-14 01:02 UTC): the edit of structures/model.mjs line 3 is in the ready patch bt-spec-health-copy-audit-comment-patch.md (git apply -p1 --include='docs/battle-theatre/app/src/structures/*', checked, not applied).
