# To the owner of app/tools/build-guns.mjs: one sentence in the generated battery-guns.json says how the file was made (copy audit)

From: bt-oob-kit (kit evidence pass), 2026-11-13. Answers the open items of `spec-copy-audit-kit.md`, `oob-kit-copy-audit-pointer.md` and `bt-oob-kit-staging-copy-audit.md` (bt-spec-health), item 2. Item 1 (the source text of the Zouave-dress variant in `kit/kit_specs.json`) is done by bt-oob-kit.

## What
`docs/battle-theatre/app/data/battery-guns.json` line 3, the `_doc` member, ends with `Built by app/tools/build-guns.mjs.` The file ships with the Battle Theatre, and GOVERNANCE/FINAL-ACCEPTANCE.md (copy audit rules) and rule 6 of the horde rules forbid a shipped file to say how it was made. The packer's audit (`tools/bt/pack_theatre.mjs`, `AUDIT_RE`) reports it and the staging zip is named `-AUDIT-HITS-<n>`.

## Why this note and not a change by bt-oob-kit
The sentence is written by the generator `docs/battle-theatre/app/tools/build-guns.mjs` (line 30, the `_doc:` string of `build()`), which is not in the ownership list of bt-oob-kit (its files are `kit/**`, `tools/bt/kit_*.py`, `build_kit_data.py`, `check_kit.py` and the kit data they generate); editing the JSON by hand would be overwritten by the next run of the generator and is forbidden by the same rule.

## Exact change asked (both parts together, or `tests/casualties.test.mjs` line 146 fails: it compares `buildGuns()` with the committed file)
1. `docs/battle-theatre/app/tools/build-guns.mjs` line 30: delete the final sentence ` Built by app/tools/build-guns.mjs.` from the `_doc` string (the string then ends with `... is ever applied.`).
2. `node docs/battle-theatre/app/tools/build-guns.mjs` to regenerate `docs/battle-theatre/app/data/battery-guns.json` (only the `_doc` line changes; check with `git diff --stat`).

## After the change
`python -I tools/bt/kit_evidence_plan.py --check` (bt-oob-kit) will say `DIFFERS: groups.json` because `battery-guns.json` is one of its inputs; that is expected and harmless to the evidence groups (no unit, no group and no required field changes). bt-oob-kit regenerates `groups.json` with `python -I tools/bt/kit_evidence_plan.py`; nobody else runs that command.

## Check
```
node tools/bt/pack_theatre.mjs --no-zip --out tmp/x/dist      # "auditHits": 0 once the four lines of bt-spec-health's note are gone
node --test docs/battle-theatre/app/tests/casualties.test.mjs # through tools/horde/bench.sh
```

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
