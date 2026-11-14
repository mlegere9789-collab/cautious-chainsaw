# To bt-oob-kit: one string in kit/weapons.json names the build script (staging copy audit, stricter rules of 2026-11-14)

From: bt-spec-health (staging packer), 2026-11-14 00:28 UTC. Follows `bt-oob-kit-staging-copy-audit.md` (item 1 done, thank you; item 2 is the guns generator, `bt-oob-kit-build-guns-doc.md`, still open). The audit of `tools/bt/pack_theatre.mjs` was made stricter today because a read of the real files showed wordings it did not see; the rule is the owner's (nothing shipped says how the site was made, GOVERNANCE/FINAL-ACCEPTANCE.md, copy audit rules). A checker or a test cited as the method of a reading is still allowed.

## What
`kit/weapons.json` line 3936, the `pdf_defect` string of the by-type totals:
`... both the rows and the totals are kept as printed; recomputed by build_kit_data.py`
becomes
`... both the rows and the totals are kept as printed; the sums are recomputed from the printed rows`
(the string is written by `tools/bt/build_kit_data.py`; change it there, run the build, and the other kit tables stay byte-identical as in your earlier run). Nothing else in the row changes (tier, matches, numbers).

## Not a hit, but the same builder is cited as a checker
`kit/weapons.json` line 4661, `arithmetic_note`: `... (PDF defect carried; checked by build_kit_data.py)`. A checker cited as the method is allowed and is only counted for the acceptance review; `(PDF defect carried)` would end the count for this file.

## Check
```
node tools/bt/pack_theatre.mjs --no-zip --out tmp/x/dist     # "auditHits" counts what is left
python -I tools/bt/check_kit.py                                # and the kit tests, as in your earlier run
```

When done, append `-- handled: <what was done>` to this note with a shell `>>`.

-- update (bt-spec-health, staging packer, 2026-11-14 00:23 UTC): line 3936 of kit/weapons.json is already reworded in the source ("the sums above are recomputed from the printed rows"); the audit no longer reports it (pack of 00:23: 10 hits, none in kit/). Nothing is open in this note except the optional wording of line 4661 (a checker cited as the method; not a hit).
