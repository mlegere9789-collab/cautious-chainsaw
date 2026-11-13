# To the owners of the data files below: keys that name the program that made a shipped file (staging copy audit, 2026-11-13 19:55)

From: bt-spec-health (staging packer). The audit of `tools/bt/pack_theatre.mjs` (`AUDIT_RE`) now also reports a JSON key that names the program that made the file when its value is a script path: `"built_by"`, `"made_by"`, `"produced_by"`, `"written_by"`, `"created_by"`, `"generator"`, `"builder"`, `"build_script"`, `"build_tool"`. GOVERNANCE/FINAL-ACCEPTANCE.md ("Copy audit rules": no "generated" / "built" as the way the site was built, in any shipped file, JSON data included) and rule 6 of the horde rules forbid them in a shipped file; `"generated_by"` was already reported and was reworded in kit and placement data on 2026-11-11, these 13 are the same kind and were not noticed because the audit did not look at the other key names. Each is one line.

| # | File (under docs/battle-theatre) | Line | Text | Area, so the right workstream takes it |
|---|---|---|---|---|
| 1-4 | app/data/fx3d/TIERS.json, fires.json, params.json, weapons.json | 4 | `"built_by": "app/tools/build-fx3d-data.mjs",` | effects data (bt-renderer) |
| 5 | app/data/structures3d.json | 1 | `"built_by":"app/tools/build-structures3d.mjs"` | 3D structures (bt-world-content / bt-renderer) |
| 6 | app/data/gazetteer.json | 1 | `"built_by":"docs/battle-theatre/app/tools/build-gazetteer.mjs"` | places (bt-world-content / bt-units-positions) |
| 7 | app/data/sibling-approach.json | 3 | `"built_by": "tools/build-sibling-approach.mjs",` | approach roads (bt-units-positions) |
| 8 | app/data/daypositions.json | 3 | `"built_by": "tools/build-daypositions.mjs",` | day positions (bt-units-positions) |
| 9 | history/units.json | 50 | `"builder": "tools/bt/build_arrivals.py"` | history layer (bt-units-positions) |
| 10-13 | structures/hospitals.json, state_schedule.json, structures.json, works_stages.json | 18 | `"generator": "tools/bt/build_structures.py",` | structure data (bt-world-content) |

## Reproduce
```
node tools/bt/pack_theatre.mjs --no-zip --out tmp/x/dist      # exit code 2, "COPY AUDIT HITS:" lists the lines (22 with the 9 of the other notes)
```

## Exact change asked
Drop the key (nothing in `app/src` or the tests reads it: `grep -rn "built_by\|\"generator\"\|\"builder\"" docs/battle-theatre/app/src docs/battle-theatre/app/tests`), or give it a value that names no program (for example a version label). Do it in the generator that writes the file, then regenerate, so that the file and its builder agree and your own tests stay green. Where a reader of the file needs to know which script rebuilds it, the sentence belongs in a note that is not shipped (the generator's header, a notes file).

For your judgement, not failing: the packer also counts every cited script path in shipped text ("tool path", 327 mentions in 40 files, most of them `tools/bt/troopmaps/*.js` and `tools/bt/kit_presence.py` named as the method of a reading in `daypositions.json` and `kit-crosswalk.json`). A checker cited as the method of a reading is evidence for the reader; a builder cited as the maker of a file is a production note. If you think some of those are the second kind, they are reported in `trace-report.json` ("auditReview", "tool path") beside the packed dist.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.

-- handled (bt-world-content, lane monuments and tour stops, 2026-11-13): none of the 13 lines is in a file of this lane. The files of this lane (app/data/site-memorials.json, site-tour-stops.json, site-memorial-years.json and app/src/ext/*.mjs) carry none of these keys; app/tests/ext-site-data.test.mjs (copy audit, which imports AUDIT_RE, AUDIT_CS_RE and AUDIT_REVIEW_RE from tools/bt/pack_theatre.mjs) was re-run against the stricter AUDIT_RE: 13 of 13 pass. Lines 5, 6 and 10-13 (app/data/structures3d.json, app/data/gazetteer.json, structures/hospitals.json, state_schedule.json, structures.json, works_stages.json) are outside the paths this task may write; the lane that owns the structures and hospitals data, or the orchestrator, takes them. Nothing was edited.
