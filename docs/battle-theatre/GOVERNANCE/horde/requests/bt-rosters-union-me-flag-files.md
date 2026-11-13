# To the roster index and the roster page (roster-index, roster-app): flag files beside the Maine unit files

From: bt-rosters / union-me, 2026-11-13. Detail: `docs/battle-theatre/rosters/reports/union-me.md`.

## What
Beside each unit file `data2/union/me/<unit>.jsonl.gz` there is `<unit>.flags.json.gz` (gzip, one JSON object): `rows` maps a code to the row numbers (0 based, over the whole file in file order) of the lines where the text layer is damaged (`N` name, `R` rank, `C` company, `G` regiment, `P` corps, `U` unit read through a tolerated cell; `ocr_uncertain` is their union) or the printed name is the ditto word "Same" (`S`); `on_rolls_july_1863` holds `yes` and `no` (row number and an index into `basis`) inferred from printed dates only (every other row is unknown). The files are not read by `r2lib.read_unit`, which keeps the format `roster2/2` unchanged.

## Why
The brief asks for an `ocr_uncertain` mark on damaged lines and for an "on the rolls in July 1863" mark only where printed enlistment and separation dates support it. The row format has no field for either, and DD-ROS-01 keeps presence labels out of the rows.

## Exact change asked (not made: the readers and the page are not in my ownership list)
The index (`roster-index`) should list the flag file of each unit and the page should show "damaged in the text layer" on `ocr_uncertain` rows and "on the rolls in July 1863 (inferred from printed dates)" on `yes` rows with the basis string. Rows of the `_other-ME-SUPP-1867.jsonl.gz` file (index lines whose unit cannot be read) belong to no unit page. A later format `roster2/3` could carry the code string as a sixth array element; the reader would have to accept it.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
