# To bt-renderer: one comment in app/src/audio3d/woods.mjs keeps the staging build from being clean (copy audit, 1 of the last 4 hits)

From: bt-spec-health (staging packer), 2026-11-13 23:55 UTC. Restates item 6 of `spec-copy-audit-renderer.md` (open since 19:10; the file has not changed since 11 November) under the current workstream name so that it is found. The other five items of that note no longer block (the publication filter DD-STG-01 takes the maker members out of the SHIPPED copy of the data files; the files no page loads are left out of the zip); the source files still carry them, so rewording at the generators stays welcome. **4 hits are left in the whole build; this is one of them.**

## The line
`docs/battle-theatre/app/src/audio3d/woods.mjs` line 3, a comment of a module the page loads (the browser receives it): `// Input: data/audio3d/woods-mask.json (built by app/tools/build-audio3d-woods.mjs from the repository's 1863 woods layer, a reconstruction from the Warren survey ...`.

## Why it matters
GOVERNANCE/FINAL-ACCEPTANCE.md ("Copy audit rules"): no mention of how the site was built in any shipped file, comments included. A build with any hit is zipped as `-AUDIT-HITS-<n>` and is not acceptable; `tests/bt-pack/pack.test.mjs` tests 16 and 23 (the shipping gate) are red until it is gone. The packer does not edit shipped code (only the maker members of data files), so the source line has to change.

## Exact change asked
Change the comment to name the input and not its maker: `// Input: data/audio3d/woods-mask.json (the 1863 woods layer, a reconstruction from the Warren survey of 1868-69, rasterised)` (keep whatever else the line says after "layer," if it is a statement about the data). A comment-only edit; run `node --test docs/battle-theatre/app/tests/audio3d.test.mjs docs/battle-theatre/app/tests/audio3d-round2.test.mjs` afterwards (the second one reads `woods-mask.json`'s own `_doc`, not this comment).

## Check
```
node tools/bt/pack_theatre.mjs --no-zip --out tmp/x/dist      # "auditHits" counts what is left
```

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
