# To the roster index and the roster page (roster-index, roster-app): flag files and cells files beside the Pennsylvania unit files

From: bt-rosters / union-pa, 2026-11-16. Detail: `docs/battle-theatre/rosters/reports/union-pa.md` (sections 0, 2 and 6). Earlier notes of this kind: `bt-rosters-union-me-flag-files.md`, `bt-rosters-union-nh-flag-files.md`, `bt-rosters-union-ma-flag-files.md`.

## What
Beside each of the 82 unit files `data2/union/pa/<unit>.jsonl.gz` there are two sidecar files:
- `<unit>.flags.json.gz`, form `roster2-flags/1` as for the Maine, New Hampshire and Massachusetts files, with these differences the reader must handle:
  - the damage codes are the codes of this item, not the codes of another state: `N` name text damaged, `R` rank cell lost or damaged, `D` date of muster cell damaged, `K` remark text damaged, `G` stray marks beside the line, `J` name and rank cell run together by leader dots in the text layer and cut at the dots, `W` a printed word that the text layer lacks, `S` a name word that stands apart from the name, `C` company letter taken from the order of the titles, `Q` a company title is missing after this line's company (the letter may be wrong), `O` the text layer lists the words of the line in another order than the page, `L` a line of more than six printed lines; the legend is in each file under `codes`, so a reader should show the legend of the file and not a fixed table; `ocr_uncertain` is the union of all codes except `L`;
  - `normalised_names` (one string per row, same order; "Given Surname", no letter changed; an empty string where the printed name is not regular);
  - `on_rolls_july_1863` holds `yes` and `no` (row number and an index into `basis`) inferred from printed dates only; every other row is unknown; the rule is in the file under `rule`.
- `<unit>.cells.json.gz`, form `roster2-cells/1`: for each row whose words the text layer lists in another order than the page (flag `O`), the words of the remarks in the order of the page. The unit file keeps the order of the text layer because its offsets point into that text.

The date of muster, the term digit and the remarks are one field of the line (the remarks of `roster2/2`), exactly as the text layer prints the words right of the rank cell; there is no separate date field.

## Why
The brief asks for an `ocr_uncertain` mark and for an "on the rolls in July 1863" mark only where printed dates support it. The row format has no field for either, and DD-ROS-01 keeps presence labels out of the rows.

## Exact change asked (not made: the readers and the page are not in my ownership list)
The index should list both sidecar files of each unit; the page should show "damaged in the text layer" on `ocr_uncertain` rows with the codes of that file, "on the rolls in July 1863 (inferred from printed dates)" on `yes` rows with the basis string, and the normalised name as a second line under the printed name (the printed name stays the first). The unit page should also show the gaps EG-ROS-PA-01 to EG-ROS-PA-09 (proposals in `GOVERNANCE/horde/ws-rosters/proposed-register/`), in particular the number of printed lines whose name the text layer lost (listed in `GOVERNANCE/horde/ws-rosters/union-pa/diag/<unit>.json`, not written to the unit file) and the Q flags of the units whose company letters may be wrong.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
