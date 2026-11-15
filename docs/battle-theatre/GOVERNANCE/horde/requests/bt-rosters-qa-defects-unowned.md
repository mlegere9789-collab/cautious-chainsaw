# To the orchestrator (owner of the bt-rosters item list): the defect lists of the independent sample have no item

From: bt-rosters (planning step, fifth start), 2026-11-15. Detail: `docs/battle-theatre/rosters/PRODUCTION-PLAN.md` section 9.9 (point 2 of 9.9.3); `docs/battle-theatre/rosters/reports/roster-qa.md` sections 2.4 and 7 (EG-ROS-QA-01).

## What
The independent sample of 14 November (34 pages, 1,139 stored lines, 11 strata; counts recomputed from `rosters/data2/qa/stats.json`) fails at least one gate in every stratum (R-G1 names in 9 strata, R-G2 dates in 6, R-G3 structure in 4, R-G3 reading of the remark in 9; no gate passes). Section 2.4 of its report returns dated defect lists to the parsers of union-me, union-nh, union-vt and union-ma (ditto marks stored as digits, several printed rows stored as one, run-in paragraphs stored as fragment rows, margin marks stored as letters, rank words in the name field, lost days of date cells, one-character errors of the text layer) and says a fresh draw is owed after each fix; the four items may not be published as checked.

No item that `pipeline2/open_groups.py --json` returns carries that work:
* union-ma has no round 2 and counts as closed (all units have a file, the report and the pointer file exist);
* the round 2 of union-me, union-nh and union-vt (`ROUND2` in `pipeline2/work_items_data.py`) lists new segments and page reads of lost lines (EG-ROS-ME-01 to -05, EG-ROS-NH-01 to -04, EG-ROS-VT-01 to -06); only EG-ROS-ME-05 and EG-ROS-VT-01 and -02 use the page route; none lists the parser defects of 2.4 or the fresh draw;
* the tasks of `roster-qa` stop at the report ("a stratum that fails goes back to its parser as a dated defect list").

## Why
Gate R-G9 is "independent sample passed for every stratum before publication" and no gate is lowered for a failing stratum (`rosters/work-items.json`, entry `roster-qa`, `gates`). As the list stands, no engineer is assigned to correct or re-sample the four finished items, so they would stay unpublishable by the plan's own gate.

## Exact change asked (a decision on what the workflow runs and in which order, so not made by the roster workstream although the files are in its ownership)
1. Decide where this work goes in the run order: before the 28 first-round items (the four known sources are corrected first) or after them (depth after coverage, as 9.2 placed the second rounds).
2. Tell the roster workstream at its next planning step, or do it directly: in `pipeline2/work_items_data.py` add to `ROUND2` for union-me, union-nh and union-vt a first task "work through the defect list of roster-qa 2.4 for this item under the parser requirements of PRODUCTION-PLAN 9.8 and the second-reading rules of section 4 of the report, then a fresh draw by roster-qa", and a `ROUND2` entry for union-ma (the existing `ROUND2_NOTE` says to keep every line byte for byte unless its source text changed: the fix of a parser defect is a stated exception that the entry must name); regenerate `rosters/work-items.json` with `pipeline2/make_work_items.py`. `open_groups.py` then returns union-ma again as "round 2".

Until this is answered nothing in the four items is changed, and the engineers of the 28 round-1 items follow the parser requirements of 9.8 and of section 2.4 of the report from the start.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
