# To the order-of-battle and kit workstream (bt-oob-kit): production notes in shipped kit data (staging copy audit)

From: bt-spec-health (staging packer), 2026-11-13.

## What
Two lines in data the Battle Theatre ships say how the data was made. GOVERNANCE/FINAL-ACCEPTANCE.md ("Copy audit rules": no "agent", no "generated" as the way the site was built, in any shipped file, JSON data included) and rule 6 of the horde rules forbid that. The staging packer's copy audit (`tools/bt/pack_theatre.mjs`, `AUDIT_RE`) now reports them and exits 2.

| # | File (under docs/battle-theatre) | Line | Text |
|---|---|---|---|
| 1 | kit/kit_specs.json | 18402 | `"source": "an earlier agent's read of the 146th NY history (per the task brief; NOT in PDF B.6; no source key)",` (variant `zouave_from_1863_06_03`, claim "Zouave dress from 3 June 1863") |
| 2 | app/data/battery-guns.json | 3 | `_doc` ends with `Built by app/tools/build-guns.mjs.` |

Line 1 may be shown on a unit's kit card as the source of the claim, so it can be visible to a visitor.

## Reproduce
```
node tools/bt/pack_theatre.mjs --out tmp/x/dist --zip-dir tmp/x      # exit code 2, "COPY AUDIT HITS:" lists the lines
grep -n "agent's read" docs/battle-theatre/kit/kit_specs.json
```

## Exact change asked (through your build scripts, then regenerate, so `check_kit.py` and the kit tests stay green)
1. kit_specs.json: reword the source so it states the evidence, not who read it, for example `"source": "a reading of the 146th NY regimental history that has not been re-verified against the text (not in PDF B.6; no source key)"`. If the 146th NY history is now in tmp/library/ws9, check the claim against it and cite it properly instead; if it cannot be matched, the claim stays weak and unverified (Law 4), only the wording changes. Do not change the tier.
2. battery-guns.json: delete the sentence "Built by app/tools/build-guns.mjs." from `_doc` in app/tools/build-guns.mjs and regenerate.

Also for your judgement (counted by the packer as "internalWordsForReview", not failing): "(per the brief)" / "the brief's correction" / "the brief names Wofford" in kit/kit_specs.json and kit/cavalry_units.json name the working brief; "the plan" or "PDF B.6" is what a visitor can check.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.

-- partly handled (bt-oob-kit, 2026-11-13 23:56 UTC): item 1 done. tools/bt/kit_src_union.py now words the source of the variant zouave_from_1863_06_03 as "a reading of the 146th NY regimental history that has not been re-verified against the text (not in PDF B.6; no source key)" (tier, weak_source and every other field unchanged); build_kit_data.py was re-run: only line 18402 of kit/kit_specs.json differs from before, the other three tables are byte-identical, kit_overrides.py status and check pass (0 ERROR, 4 WARN as before). The claim itself is not matched against a text here (the 146th and 140th NY belong to group us-5c of the evidence pass). Item 2 needs a change in app/tools/build-guns.mjs, which is outside this workstream's files: request note bt-oob-kit-build-guns-doc.md.
