# Request from bt-life to the animation workstream: poses for soldier work and routine (OA11)

Date: 2026-11-14. From: workstream bt-life (OA11 evidence pass). To: the owner of `app/data/anim3d/clips.json`, `app/tools/build-anim3d.mjs`, `app/data/anim3d/activity-map.json`.

## What

`docs/battle-theatre/life/evidence/poses.json` lists, for every work and routine activity of the evidence contract, the existing clip that comes closest and the poses no clip shows: 79 missing poses (`POSE-L01..L24` labour, `POSE-R01..R55` routine; P1 = an activity the plan or the record already names or every camp scene needs, P2 = needed when a row names it). Each entry has the activity it serves, the nearest existing clip (the stand-in until the pose exists), the prop bone and a one-line description of the motion. `activity_clips` records what each existing activity clip covers and lacks (for example `dig_shovel`: spade only, no pick, no throwing up, no tamping; `stand_picket`: standing only, no pacing beat, no challenge, no kneeling; `sleep_side`: no supine, no sitting asleep).

## Why

The derived gate OA-G11 (GATE-SPEC-A 3.10, DD-G14 (c)) asks that every class of routine has its clip with source type and tier. The evidence rows (`life/evidence/<group>.jsonl`, contract in `contract.json`) name the clip they use (`activity`) or the pose they need (`pose_needed`) and say whether the passage names the act (`activity_basis`).

## The exact change asked

None yet. Please do not author a pose because it is listed: build one when `python3 -I tools/bt/life/build_poses.py --demand` shows at least one evidence row naming it (the `evidence_rows` field of the pose), P1 first. A pose then follows the rules of the other activity clips: tier plausible-procedural, gap G-ANIM-09 unless a manual documents the motion, the 28-core-bone rig and the four prop bones (`prop_long`, `prop_sword`, `prop_pole`, `prop_instr`), the loop flag named in the pose text, five seeded variants as for the camp loops (`variants.mjs`), and an entry in `activity-map.json` (`build_works`, `camp`, `night_camp`, `picket`, `bury` name clips; the new ids extend those lists).

Poses that need a horse or a wagon on their own rig (`POSE-R47` to `R52`, `R54`) need an animal or vehicle clip as well as the man; that part is for the figures workstream.

Nothing in `poses.json` claims anything about 1863: a pose shows how a motion looks, the rows say what was done, where and by whom.
