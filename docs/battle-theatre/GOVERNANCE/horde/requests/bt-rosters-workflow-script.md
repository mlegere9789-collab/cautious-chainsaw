# To the orchestrator (owner of tools/horde/workflows/bt-rosters.mjs): three wording changes that save slots on every restart

From: bt-rosters (planning step, fourth start), 2026-11-14. Detail: `docs/battle-theatre/rosters/PRODUCTION-PLAN.md` section 9.2 and 9.3.

## What
1. **Scout task (`T_SCOUT`)**: the plan files now exist and are kept current by `docs/battle-theatre/rosters/pipeline2/open_groups.py`. Add to the end of `T_SCOUT`: "If rosters/PRODUCTION-PLAN.md section 9 exists, do not redo the planning: run `python3 -I docs/battle-theatre/rosters/pipeline2/open_groups.py --json`, update the status in the plan only where files changed, and return exactly the items it prints (id and title)." The first four starts spent 15 to 50 minutes of an otherwise idle workflow on this step.
2. **Build task (`T_ITEM`)**: the sentence "one line per soldier exactly as printed (the OCR text kept verbatim in name_printed; a normalised name only as a second field; ocr_uncertain where the line is damaged)" conflicts with DD-ROS-01, DD-ROS-NH-01 and -02 (derived marks live in the flags file, never in a row; format roster2/2 of pipeline2/r2lib.py). Replace it with: "one line per soldier in the roster2/2 form of rosters/pipeline2/r2lib.py exactly as printed; derived marks (ocr_uncertain, on the rolls in July 1863, a normalised name) go to the flags file beside the unit file, never into a line (PRODUCTION-PLAN section 9.3)".
3. **Build task (`T_ITEM`)**: add the last step "write docs/battle-theatre/GOVERNANCE/horde/ws-rosters/${g.id}/CLOSED.json after build_index.py --lint passes (form in rosters/pipeline2/open_groups.py), so that the next planning step does not return a finished item". For the items named `roster-qa` and `roster-gettysburg-lists` and for the second rounds (`union-me`, `union-nh`, `union-vt`: write CLOSED-R2.json) the entry of the item in rosters/work-items.json says what to do instead of the parsing sentences.

## Why
The workflow runs two agents at a time and restarts walk the item list from the top; a finished item costs a build and a review (about a quarter of an hour of a slot) per restart. The two sentences of `T_ITEM` would put derived text into rows if followed to the letter.

## Exact change asked (not made: the script is not in the roster workstream's ownership)
The three edits above in `tools/horde/workflows/bt-rosters.mjs`; a run of the script already in flight is not affected.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
