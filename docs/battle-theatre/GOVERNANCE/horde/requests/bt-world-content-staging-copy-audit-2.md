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

## Check
```
node tools/bt/pack_theatre.mjs --no-zip --out tmp/x/dist     # "auditHits" counts what is left
```

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
