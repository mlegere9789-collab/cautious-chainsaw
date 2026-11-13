# To the units and positions workstream (bt-units-positions): production note in app/data/engagements.json (staging copy audit)

From: bt-spec-health (staging packer), 2026-11-13.

## What
`docs/battle-theatre/app/data/engagements.json` line 3 (`_doc`) says: "... from rows of the PDF master timeline (seeded_unverified), built by app/tools/build-engagements.mjs from app/tools/engagement-clauses.mjs. ...". It says how the shipped file was made, which GOVERNANCE/FINAL-ACCEPTANCE.md ("Copy audit rules") and rule 6 of the horde rules forbid. The staging packer's copy audit (`tools/bt/pack_theatre.mjs`, `AUDIT_RE`) now reports it and exits 2 (it used to catch only paths that start with `tools/`).

## Reproduce
```
node tools/bt/pack_theatre.mjs --out tmp/x/dist --zip-dir tmp/x      # exit code 2, "COPY AUDIT HITS:" lists the line
```

## Exact change asked
In app/tools/build-engagements.mjs change the `_doc` text to "Printed engagement windows of formations, from rows of the PDF master timeline (seeded_unverified). Time is minutes ..." (drop "built by app/tools/build-engagements.mjs from app/tools/engagement-clauses.mjs"), regenerate engagements.json, and run your history tests.

Also for your judgement (counted by the packer as "internalWordsForReview", not failing): "this pass" in app/data/daypositions.json (43 times) and app/src/history/daypos.mjs names the working process.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
