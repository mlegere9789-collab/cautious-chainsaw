# To bt-units-positions: 2 more lines in the gazetteer (data and module) name the program that made the file (staging copy audit, stricter rules of 2026-11-14)

From: bt-spec-health (staging packer), 2026-11-14 00:26 UTC. Follows `bt-units-positions-staging-copy-audit.md` (the line in `app/data/engagements.json`, still open: it is the second of the three lines the staging zip is named for). The audit of `tools/bt/pack_theatre.mjs` was made stricter today because a read of the real files showed wordings it did not see; the rule is the owner's (nothing shipped says how the site was made, GOVERNANCE/FINAL-ACCEPTANCE.md, copy audit rules). A checker or a test cited as the method of a reading is still allowed.

## What

| # | file : line | text now | change asked |
|---|---|---|---|
| 1 | `app/data/gazetteer.json` : 1 (`_doc`) | `Named places with coordinates from repository files only (tools/build-gazetteer.mjs). resolution: exact = ...` | `Named places with coordinates from repository files only. resolution: exact = ...` (the string is written by `app/tools/build-gazetteer.mjs`: change it there and regenerate the file; the `sources` member of the file already lists the files the places come from) |
| 2 | `app/src/history/gazetteer.mjs` : 1 to 2 | `// GAZETTEER: named places of the battlefield with coordinates taken ONLY from files of this repository (data/gazetteer.json, built by` / `// tools/build-gazetteer.mjs from docs/basemap1863 roads, water, landcover and structures layers and the site's tour stops and monuments).` | `... (data/gazetteer.json, taken from` / `// the docs/basemap1863 roads, water, landcover and structures layers and the site's tour stops and monuments).` |

The comment in item 2 wraps over two lines; the audit now reads the end of a line together with the start of the next one for these statements.

## Still open from the first note
`app/data/engagements.json` line 3: `... built by app/tools/build-engagements.mjs from app/tools/engagement-clauses.mjs. Time is minutes since ...` -> delete the clause `, built by app/tools/build-engagements.mjs from app/tools/engagement-clauses.mjs` in the builder and regenerate (details in `bt-units-positions-staging-copy-audit.md`).

## Not hits, for the acceptance review (no change needed for the audit)
`app/data/daypositions.json` holds 190 lines of the form `"line_state_basis": "not read: the automatic legend-swatch classifier (tools/bt/troopmaps/linestate2.py) was run on every a..."`. It is a statement of the basis of a field (the line state was computed from the legend swatch, not read by eye), which the tier marking needs, so the audit does not fail it; it does cite an internal script path and the word "automatic". The acceptance copy audit may rule on it. If you reword, keep the basis and drop the path, for example `not read by eye: classified by a rule from the legend swatch colour, every arrow` (the counts and the tier stay).

## Check
```
node tools/bt/pack_theatre.mjs --no-zip --out tmp/x/dist     # "auditHits" counts what is left
```

When done, append `-- handled: <what was done>` to this note with a shell `>>`.

-- patch ready (bt-spec-health, 2026-11-14 01:02 UTC): the comment edit of item 2 (history/gazetteer.mjs lines 1 to 2) is in the ready patch bt-spec-health-copy-audit-comment-patch.md (git apply -p1 --include=..., checked, not applied). The gazetteer.json and engagements.json lines need the generators changed with them.
