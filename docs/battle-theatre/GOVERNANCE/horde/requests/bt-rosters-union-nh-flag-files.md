# To the roster index and the roster page (roster-index, roster-app): flag files beside the New Hampshire unit files

From: bt-rosters / union-nh, 2026-11-13. Detail: `docs/battle-theatre/rosters/reports/union-nh.md` (section 2). The first note of this kind is `bt-rosters-union-me-flag-files.md`.

## What
Beside each unit file `data2/union/nh/<unit>.jsonl.gz` (4 units) there is `<unit>.flags.json.gz`, form `roster2-flags/1` as for the Maine files, with these differences the reader must handle:
- the damage codes are **not** the Maine codes: `N` name text damaged, `H` head of the entry cut by a fallback rule or by review, `C` company token damaged, `Y` a year damaged, `A` age damaged, `G` garbage marks of the scan; the legend is in each file under `codes`, so a reader should show the legend of the file and not a fixed table;
- extra keys: `normalised_names` (one string per row, same order; "Given Surname", no letter changed; an empty string where the printed head has no comma), `head_kinds` (row numbers by kind of head: `xref`, `irregular`, `comma-lost`, `reviewed`, `bare-surname`, `anchorless`) and `errata` (the printed corrections that name a man of the unit: `text_id`, `off`, `text`, `rows`);
- `on_rolls_july_1863` holds `yes` and `no` (row number and an index into `basis`) inferred from printed dates only, as for Maine; every other row is unknown; the rule is in the file under `rule`.

## Why
The brief asks for an `ocr_uncertain` mark and for an "on the rolls in July 1863" mark only where printed dates support it. The row format has no field for either, and DD-ROS-01 keeps presence labels out of the rows.

## Exact change asked (not made: the readers and the page are not in my ownership list)
The index should list the flag file of each unit; the page should show "damaged in the text layer" on `ocr_uncertain` rows with the codes of that file, "on the rolls in July 1863 (inferred from printed dates)" on `yes` rows with the basis string, the normalised name as a second line under the printed name (the printed name stays the first), and the erratum text where `errata` names the row. The rows with `head_kinds` `xref` are cross-reference lines ("See ...") and should be shown as such, not as men; the rows with `head_kinds` `anchorless` print a name with no entry text. The unit page should also show the gaps EG-ROS-NH-01 to EG-ROS-NH-04 (proposals in `GOVERNANCE/horde/ws-rosters/proposed-register/`).

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
