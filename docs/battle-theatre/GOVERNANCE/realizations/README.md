# GOVERNANCE/realizations: the records of gate Q17 and what the harness made of them

Gate Q17 (PDF p. 136): "every timeline row has a visual realization or an open register entry". This folder holds the first half of that sentence: one record per timeline row that says what the Battle Theatre shows for it and the check that proves it. The harness that reads them is `tools/bt/realize/` (README.md there: the record, the assertions, the tolerances, the commands). The gate's own reading of a record is `GOVERNANCE/gate_results/GATE-SPEC.md` section 6.

| file | what it is | who writes it |
|---|---|---|
| `tl-01.jsonl` ... `tl-12.jsonl`, `epilogue.jsonl` | the records of a shard (one JSON object per line, one per row; `harness` is `bt-realize-1`) | the engineer of the shard (none exists yet: the files appear when the shard workstreams run) |
| `EXAMPLES.jsonl` | 20 worked examples: the first 20 rows of shard tl-01 (T1-001 ... T1-020), 4 realized or partly realized by what the product shows, 16 `not_realized` with the exact reason; a shard file overrides it for a row it has | the harness workstream |
| `RESULTS.json` | the result of every record against the product: per row `realized`, `why`, the assertions with the scenario each was run in, the exact time the row allows, the scenario group, `q17_covered_strict`; the totals and the Q17 verdict (`q17.ok`, `q17.ok_strict`) computed from the rows; the digests of the harness and of its inputs. **Valid only while both digests equal `node tools/bt/realize/check.mjs --digests`**: the shell, the data and the timeline files are inputs, so other workstreams' edits make it stale; `check.mjs` without arguments writes it again. It sets no `passes` flag | `node tools/bt/realize/check.mjs` |
| `gazetteer.json` | every place name the timeline prints: resolved (kind, centre, distance tolerance), ambiguous, off the loaded ground, unknown (never given coordinates) | `node tools/bt/realize/q.mjs gazetteer --write` |
| `<shard>.MISSING.md` | the build list of a shard: what the product lacks for the rows that are not realized, grouped by the code a check reports, with who can build it; a row with no record says nothing about what is missing | `node tools/bt/realize/buildlist.mjs --write` |
| `MUTATION-CHECK.json` | the check of the harness's own tests: every rule of `tools/bt/realize/mutations.json` removed or changed in a scratch copy, killed when a test fails and survived when none does, with the notes on the equivalent mutants | `node tools/bt/realize/mutate.mjs` |

A row with no record, a record whose check fails, and a record of kind `not_realized` is **not realized**: its coverage then comes from an open register entry only. Nothing here is a claim that a row is shown that a check did not confirm.

To write a record: `node tools/bt/realize/q.mjs row <id>` (what the row says, the time it allows, the places and units its words name), `q.mjs suggest <id>` (where the named units are in that time), then the README of the harness, section 9.
