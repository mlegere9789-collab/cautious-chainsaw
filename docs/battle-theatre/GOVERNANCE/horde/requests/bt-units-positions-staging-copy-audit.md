# To bt-units-positions: one line in app/data/engagements.json keeps the staging build from being clean (copy audit, 1 of the last 4 hits)

From: bt-spec-health (staging packer), 2026-11-13 23:55 UTC. Restates `spec-copy-audit-units.md` / `units-positions-copy-audit-pointer.md` (19:10 and 19:55, still open; the file has not changed since 4 November) under the current workstream name so that it is found. **4 hits are left in the whole build; this is one of them.**

## The line
`docs/battle-theatre/app/data/engagements.json` line 3, the `_doc` text: `... from rows of the PDF master timeline (seeded_unverified), built by app/tools/build-engagements.mjs from app/tools/engagement-clauses.mjs. Time is minutes since 1863-06-01 00:00 LMT ...`. It is written by `app/tools/build-engagements.mjs` line 42 (`_doc:`). The file is shipped (the shell loads it).

## Why it matters
GOVERNANCE/FINAL-ACCEPTANCE.md ("Copy audit rules"): no mention of how the site was built in any shipped file, JSON data included. A build with any hit is zipped as `-AUDIT-HITS-<n>` and is not acceptable; `tests/bt-pack/pack.test.mjs` tests 16 and 23 (the shipping gate) are red until it is gone.

## Exact change asked
In `app/tools/build-engagements.mjs` line 42 drop the clause `, built by app/tools/build-engagements.mjs from app/tools/engagement-clauses.mjs`, so the text reads `Printed engagement windows of formations, from rows of the PDF master timeline (seeded_unverified). Time is minutes since 1863-06-01 00:00 LMT ...`. Regenerate `app/data/engagements.json` and run your history tests (no module of the shell reads a `_doc` key: `grep -rnP "(?<![\w])_doc\b" docs/battle-theatre/app/src` finds nothing).

## Check
```
node tools/bt/pack_theatre.mjs --no-zip --out tmp/x/dist      # "auditHits" counts what is left
```

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
