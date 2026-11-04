# vis-anim shard report (2026-11-04)

Scope: animation sub-requirements (R17 marching, R16 cavalry, R05 preparatory activity and casualties, R18 camp and night, OA02 one-to-one, OA07 Hollywood-grade movement) against src/anim3d, data/anim3d and their tests. Linux machine, node only; no browser run; nothing here has been seen.

Baseline (full suite, `node --test docs/battle-theatre/app/tests/*.test.mjs`): 355 tests, 350 pass, 4 fail, 1 skipped. Failures in this shard: anim3d.test.mjs "catalogue" (drill-march-extras.json OCR fields cannot regenerate without the Hardee/Casey OCR texts, which are on the Windows machine, not here); anim3d.test.mjs "no allocation churn" is load-sensitive (failed once in an isolated file run while the machine was loaded, passed alone and in the baseline full run; it measures heap growth). Other failures (figures3d-evidence x2, one in another shard) are listed in the vis-figures REPORT.

Work: the catalogue test now compares every field of drill-march-extras.json except the five OCR-derived fields when the OCR texts are absent (it still compares them where present; no gate lowered; the committed file keeps the verified values; data was NOT regenerated degraded). New tests/anim3d-onetoone.test.mjs (3 tests): per-man selection and phase for 4,000 men, shots from every man of a 4,000-man firing unit, no figure caps in src.

Rows: results.jsonl has 13 rows (VISANIM-01..13): met 5 (walk, loading, artillery, determinism, event interface), partially met 7, open 1 (oblique/side/back step and other missing states). Proposed register: EG-VISANIM-01 (missing clips, steps need the OCR), -02 (G3 mocap impossible for 1863, escalated), -03 (397 of about 600 clips).

Owner-decision items: gait basis default (modern_range vs documented bases) stays PENDING OWNER; whether to commission a modern capture (EG-VISANIM-02).

BROWSER-VERIFICATION-LIST (all deferred; see ANIM3D-NOTES sections 9, 10.8, 11.9 items 1-25): play the march, fire and load cycles on the FIGURES meshes at 2, 5 and 15 m; foot planting on Little Round Top and Culp's Hill; scrub the pops listed in 11.9; 200-man column at 15 m and 60 m (do the six variants read as different men); gun detachment beside the Napoleon; the one-to-one count check: instance count equals the roster strength at the Pickett's Charge minute (OA02, V1).
