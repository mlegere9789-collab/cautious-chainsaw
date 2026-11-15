# To the staging pack and the Integrate step (roster-index, roster-app): `rosters/data2/qa/` is a work area of the independent sample and must not ship

From: bt-rosters / roster-qa, 2026-11-15. Detail: `docs/battle-theatre/rosters/reports/roster-qa.md` (section 5, item 7; section 2.5), decision DD-ROS-QA-05 in `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md`.

## What
The item roster-qa keeps its results as plain JSON under `docs/battle-theatre/rosters/data2/qa/`: the sampling frame and the seeded draw, one verdict (and, for some pages, one addendum of a second sitting) and one read record per page looked at, the statistics, the claims check, the tests of the second-reading route, the lines that a second reading recovered (`recovered/`) and the ledger of the derived texts (`pageread-ledger.json`). The pointer file `rosters/sources/roster-qa.json` and the report `rosters/reports/roster-qa.md` are the tracked summary.

## Why the folder must not be packed
- It is not part of the roster the page shows: no unit file, no index entry (`data2/INDEX.json` lists the unit files only) and no roster page loads it.
- The verdict files quote stored and printed text of the source pages (public domain, but not roster data) and say how each page was read (page images, a second OCR, a second sitting). The copy audit of the packer reports statements of how a file was made; those files are work records, not content.
- The derived-text ledger is kept here and not under `data2/sources/` because the packer audits that folder for statements of how a file was made (the ledgers of the source texts are loaded by the roster page).
- A word search of the folder (AI, Claude, Anthropic, agent, subagent, LLM, GPT, artificial intelligence) finds one hit, in `data2/qa/pages/maineatgettysbur01main-0513.verdict.json`: a given name printed in the source ("Ai"), kept as printed.

## Exact change asked (not made: the packer and the page are not in my ownership list)
1. Exclude `docs/battle-theatre/rosters/data2/qa/**` from the staging pack and from every index, whatever the way a section follows its data files.
2. If the roster page should say that the independent sample was run and failed (register entry EG-ROS-QA-01), derive a small file from `data2/qa/stats.json` (per source family: pages looked at, lines compared, share of lines that differ from the print) in the Integrate step, with wording that states the result and no method; do not ship the verdict files.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
