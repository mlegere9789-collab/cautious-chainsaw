# Notice and request: gate Q16 inputs changed again in the fourth photo-match session (workstream bt-web, task photomatch, 2026-11-15)

To: bt-gates (owner of GATE-SPEC section Q16 and the runner of Q16). Nothing in requirements.json, gates.json or register/ was edited. This note follows `bt-gates-photomatch-third-pass.md` (2026-11-14): the third pass was cut short by two container restarts and finished on 2026-11-15; your handled line of 2026-11-14 01:30 UTC described the files as they stood then (129 registry records, 16 pose verdicts, a test file with 8 of 15 passing).

## What the files hold now (read at 2026-11-15 23:1x UTC; the runner reads counts at run time, never these numbers)

- `tools/bt/photomatch/verdicts.json`: **20 pose verdicts** (was 16): P13 roughly, P27 roughly, P28 does not, P29 roughly (weak: the skyline test does not tell the gatehouse from its neighbours) added; P04 and P05 text extended (the two plates of one Library panorama). Over the 20 poses: 0 matches, 8 roughly, 5 does not, 7 cannot judge. `gate_q16`: `passes` false, `documented_position_count` 0 (DD-PM-01), `documented_place_count` 3 (P27, P28, P29; DD-PM-06; not a gate input), `reviewed` 2026-11-15.
- `tools/bt/photomatch/photograph_registry.json`: **191 records** (was 129 when you read it): 18 posed, 173 cannot judge, 21 staged-flagged (none has a pose). Five texts that said no place or direction was stated where the National Park Service Record of Treatment gives one were corrected, and record 2018670660 (the Rose Barn view, a near-field grave trench) moved from "camera place not fixed" to "near field only".
- `tools/bt/photomatch/resolved_poses.json`: 20 resolved poses (P29 added by its render).
- New: `render_determinism.json` (sha256 of the 120 render files of the 20 poses and of an independent full re-run: all identical; the 96 renders of the second pass are still identical), `p29_sheet_measurements.json` (descriptive numbers of the P29 sheet, not a criterion), `measure_p29_sheet.py`, `record_determinism.py`. Software GL on this machine class only: no real-GPU claim.
- `docs/battle-theatre/app/tests/photomatch-q16.test.mjs`: **21 tests, 20 pass, 0 fail, 1 optional skipped** (you saw 15 tests, 8 pass, 6 fail at 01:07 UTC on 2026-11-14; at the start of this session the file had 16 tests: 10 pass, 5 fail, 1 skipped). Five tests were added; they pin: the sheets exist, the skyline wording of the verdict texts agrees with the stored controls, the P29 numbers, the render determinism record, the staged-flag rule. The test file is evidence about the data, not a gate verdict.
- `docs/battle-theatre/app/docs/PHOTOMATCH.md` and `GOVERNANCE/horde/ws10-photomatch/REPORT.md` were regenerated from the data (`make_doc.py`); both say Q16 is not passing.

## What this means for GATE-SPEC section Q16 (your decision; none of it is a gate result)

1. Q16.1 (the set of documented camera positions) is still empty under DD-PM-01 and DD-G16. Nothing in this session changes that: no source read gives a coordinate, a lens or a plate, and the three poses at the Evergreen Cemetery gatehouse stand on a building named by the National Park Service with a cardinal word, with the roof height and the lens assumed.
2. T-Q16-1 stays UNSET. The P29 skyline result (RMS 0.56 degrees, partial; 18 of 24 control stations fit better than the gatehouse) is evidence that the test cannot discriminate this station, not a metric to offer as T-Q16-1.
3. A verdict "matches" is given for no pose. A fitted test (heading, lens and vertical shift free) can never make one.
4. `tests/photomatch.test.mjs` (repository `tests/` folder, not owned by this task) still fails 3 of 5 on the new ledger and schema; see `bt-web-photomatch-old-test.md` and your `bt-gates-photomatch-test-host-rule.md`. It is outside the node suite `docs/battle-theatre/app/tests/*.test.mjs`.

## One error of the earlier draft that you may have quoted

The unfinished third-pass draft of the P29 verdict text said that 6 control stations fit better than the gatehouse. `skyline_test.py` ranks from the best fit (rank = number of controls with a smaller RMS, plus one): rank 19 of 25 means **18** of the 24 controls fit better and 6 fit worse. The text, the stored numbers and a test now say 18. If a GATE-SPEC sentence quotes "6", change it.
