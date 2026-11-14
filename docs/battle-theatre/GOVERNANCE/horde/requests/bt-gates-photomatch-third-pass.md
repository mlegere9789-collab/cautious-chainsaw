# Request and notice: gate Q16 inputs changed in the third photo-match pass (workstream bt-web, task photomatch, 2026-11-14)

To: bt-gates (owner of GATE-SPEC and the runner of Q16). Nothing in requirements.json, gates.json or register/ was edited; this note lists what changed in the files the Q16 runner reads, so that GATE-SPEC section Q16 ("State") and the runner can be brought up to date.

## What changed in `tools/bt/photomatch/`

- `photograph_registry.json`: one entry per catalogued record, now 189 (109 first run + 20 added + 62 of the wide search of the whole Civil War group, `catalogue: "wide search (third pass)"`); every entry has `same_exposure_as`, `superseded_pose_ids`, `staged_flag`, `class`, `verdict`. `catalogue_wide_items.json` (62 records) and `wide_images_ledger.json` (57 images, 5 records not digitized) are new inputs; `images_ledger.json` has 6 more files (two records outside cwp).
- `poses.json`: 20 poses. New: P13 (rendered, verdict roughly), P27 and P28 (one exposure, the view of Gettysburg from the Evergreen Cemetery lodge, as two readings of the NPS direction word: north 0 degrees, northwest 315 degrees; they supersede P07 and P06, whose verdicts are kept), P29 (the view east from the same building, LOC record 2012647704). Fields: `position.place_documented` (true on P27, P28, P29), `superseded_by` / `supersedes`, `also_loc_ids` (other prints of the same exposure).
- `verdicts.json` `gate_q16`: `passes` false; `documented_position_count` 0 (DD-PM-01: a coordinate, a lens and a plate); new `documented_place_count` (poses at a building of known outline that the National Park Service names as the camera place, with a cardinal word; DD-PM-06). The verdict words map to Q16.4 as before; a pose verdict is evidence, not the gate's verdict.
- `criteria.json` (new): the pass criteria of the first tests at a documented place, each with `written_utc` and `render_existed_when_written: false`; `criteria_measurements.json` and `skyline_results.json` (new): the measured results. The skyline test fits three parameters (heading inside the NPS sector, lens, vertical shift) and says so; it is compared with 24 control stations.
- `position_statements.json`: 145 statements (was 70 at the second pass): the NPS Record of Treatment figure captions (`PS-NPS-ROTV1-F*`, `PS-NPS-ROTV2-F*`, 31 new, from `nps_figures.json`), the NPS Place pages, the Cemetery CLR statements that identify the lodge-roof view, and the record texts of the wide search (leads where the Library cites Frassanito).

## What this means for Q16 (bt-gates decides; none of it is a gate result)

1. Q16.1 (the set P): by DD-PM-01 the set is still empty (no coordinate, lens and plate). If bt-gates or the owner reads a building roof named by a non-lead source as a documented camera position (the wording of Q16.1 does not say), the first members would be P27/P28 and P29: horizontal uncertainty about 20 m (the 2023 outline of STR-TOWN-GATEHOUSE), camera height an assumption (8 m, sensitivity 5 and 11 m), heading a cardinal word with a sector of 45 degrees, lens unknown.
2. Q16.3 / T-Q16-1 stays UNSET. The pre-written thresholds of this pass (0.5 degree match-level, 1.0 partial, discrimination against 24 control stations) are this pass's own and are not offered as T-Q16-1. The three binary tests of C-P27-P28-1 are necessary conditions only (poses P06 and P07 pass all three though their verdict is "does not"); a gate runner should not use them as a metric.
3. A pose verdict `matches` is not given for any pose; the words and their reasons are in `verdicts.json`.

## Counts the runner section quotes (re-read from the files at run time, never constants)

127 records and 16 poses at the second pass; now 189 records, 20 poses (P01 to P29 with gaps), 145 statements. `tests/photomatch.test.mjs` (not mine) still fails as described in `bt-web-photomatch-old-test.md`.
