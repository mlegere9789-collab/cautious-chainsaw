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

-- ready patch (bt-spec-health, staging packer, 2026-11-14 00:49 UTC): nobody's ownership list names app/tools/build-guns.mjs, so the change is prepared as one patch, made against the files as they stand and checked with 'git apply --check -p1' (not applied; the files are not mine). The committed battery-guns.json equals the output of build() today, so the patch is exactly what a regeneration gives (tests/casualties.test.mjs line 146 compares the two). Whoever takes the file applies it from the repository root with 'git apply -p1 <this block saved as a file>' (a copy is at tmp/bt-spec/r4/patches/build-guns-doc.diff on the build machine):

```diff
diff -ruN a/docs/battle-theatre/app/data/battery-guns.json b/docs/battle-theatre/app/data/battery-guns.json
--- a/docs/battle-theatre/app/data/battery-guns.json
+++ b/docs/battle-theatre/app/data/battery-guns.json
@@ -1,6 +1,6 @@
 {
  "version": 1,
- "_doc": "Gun counts as STATED in the kit data (PDF B.6.14), keyed to the batteries of the order of battle. A battery not listed here has no stated gun count and is drawn without guns (its card says so); no default count (the 4-gun Confederate default of the PDF is a total check only) is ever applied. Built by app/tools/build-guns.mjs.",
+ "_doc": "Gun counts as STATED in the kit data (PDF B.6.14), keyed to the batteries of the order of battle. A battery not listed here has no stated gun count and is drawn without guns (its card says so); no default count (the 4-gun Confederate default of the PDF is a total check only) is ever applied.",
  "kit_counts": {
   "batteries_in_kit": 125,
   "with_stated_guns": 29
diff -ruN a/docs/battle-theatre/app/tools/build-guns.mjs b/docs/battle-theatre/app/tools/build-guns.mjs
--- a/docs/battle-theatre/app/tools/build-guns.mjs
+++ b/docs/battle-theatre/app/tools/build-guns.mjs
@@ -27,7 +27,7 @@
   }
   return {
     version: 1,
-    _doc: 'Gun counts as STATED in the kit data (PDF B.6.14), keyed to the batteries of the order of battle. A battery not listed here has no stated gun count and is drawn without guns (its card says so); no default count (the 4-gun Confederate default of the PDF is a total check only) is ever applied. Built by app/tools/build-guns.mjs.',
+    _doc: 'Gun counts as STATED in the kit data (PDF B.6.14), keyed to the batteries of the order of battle. A battery not listed here has no stated gun count and is drawn without guns (its card says so); no default count (the 4-gun Confederate default of the PDF is a total check only) is ever applied.',
     kit_counts: { batteries_in_kit: Object.keys(ab.batteries).length, with_stated_guns: stated.length },
     matched: matched.sort((a, b) => a.history.localeCompare(b.history)), combined, unmatched,
     detachment: { crew_per_piece: 9, basis: 'the printed manuals’ detachment: gunner and Nos. 1-7, chief of caisson ninth (kit/KIT-NOTES.md section 4 item 11; drill/drill_artillery.json); the PDF’s “eight at the piece” leaves the chief of caisson with the caisson', tier: 'documented', source_keys: ['FIELDART-1863'], limbers_behind_m: [10, 15], limbers_note: 'PDF B.6.14.9 inferred 10-15 yd behind; the manual puts the limber end-of-pole 6 yd from the trail handspike when unlimbered (inferred, weak)', teams: { teams_per_gun: 2, horses_per_team: 6, drivers_per_team: 3 } },
```
