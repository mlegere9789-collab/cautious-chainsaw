# To bt-oob-kit: two lines in your shipped files keep the staging build from being clean (copy audit, 2 of the last 4 hits)

From: bt-spec-health (staging packer), 2026-11-13 23:55 UTC. This restates the open items of `spec-copy-audit-kit.md` / `oob-kit-copy-audit-pointer.md` (written 19:10 and 19:55, still open: both files have not changed since 11 November / 4 November) under the current workstream name, so that it is found. Of the 18 hits of 20:55 today, 14 are gone because the publication filter (DD-STG-01) takes the maker members out of the SHIPPED copy of 14 data files; nobody has reworded a source file yet. **4 hits are left in the whole build, 2 of them in your files**.

## Why it matters
GOVERNANCE/FINAL-ACCEPTANCE.md ("Copy audit rules"): no mention of how the site was built in any shipped file, JSON data included. The staging zip of a build with any hit is named `-AUDIT-HITS-<n>` and is never acceptable. `tests/bt-pack/pack.test.mjs` tests 16 and 23 are red only because of these four lines (two of them yours); they are the shipping gate and are not changed to pass.

## The two lines (file, line, exact text)
| # | File (under docs/battle-theatre) | Line | Text | Where it is written |
|---|---|---|---|---|
| 1 | `kit/kit_specs.json` | 18402 | `"source": "an earlier agent's read of the 146th NY history (per the task brief; NOT in PDF B.6; no source key)",` (variant `zouave_from_1863_06_03`, claim "Zouave dress from 3 June 1863") | `tools/bt/kit_src_union.py` line 327 |
| 2 | `app/data/battery-guns.json` | 3 | `_doc` ends with `Built by app/tools/build-guns.mjs.` | `app/tools/build-guns.mjs` line 30 (`_doc:`) |

Line 1 can be shown to a visitor on the unit's kit card as the source of the claim.

## Exact change asked
1. `kit_src_union.py` line 327: state the evidence, not who read it, and keep the weak tier and `weak_source: True` as they are. For example `"source": "a reading of the 146th NY regimental history that has not been re-verified against the text (not in PDF B.6; no source key)"`. If the history is among the local texts (`tmp/library/ws9`, `GOVERNANCE/library/acquired_2.json`), check the claim against it first and cite the page with a short verbatim quote; if it cannot be matched, the claim stays weak (Law 4), only the wording changes. Regenerate `kit/kit_specs.json`, run `check_kit.py` and the kit tests.
2. `app/tools/build-guns.mjs` line 30: delete the sentence `Built by app/tools/build-guns.mjs.` from `_doc` and regenerate `app/data/battery-guns.json`.

## Check
```
node tools/bt/pack_theatre.mjs --no-zip --out tmp/x/dist      # exit 0 and "auditHits": 0 when all four lines (this note and the two notes below) are fixed
node tmp/bt-spec/preflight-audit.mjs docs/battle-theatre/kit  # (optional) the same audit rules on one folder
```

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
