# Request from bt-units (group us-1c-1d-art): section labels of docs/battle-theatre/library/statevol_index.json

What: the section index of the state volumes (`library/statevol_index.json`, built by `tools/bt/statevol_index.py`) names sections by the heading the tool found, and some headings do not match the text inside the section. The group file `undrawn/us-1c-1d-art.jsonl` cites these sections by id (the checker takes the id from the index), so the card of a unit will print the heading of the section as its source. Found while reading for the Union I Corps group:

| Section id | Heading in the index | What the text inside is (found by reading) |
|---|---|---|
| `NY2-S013` | 73D NEW YORK INFANTRY | pp. 598-636 hold the 73d, the 76th New York (inscription of the monument with the figure "Number engaged, 348", and Col. John B. Bachelder's address of 1888 on the Seventy-sixth) and other regiments |
| `NY3-S023` | BATTERY C, 1ST NEW YORK LIGHT ARTILLERY | pp. 1185-1236 hold the sketches of Batteries C, D and E, 1st New York Light Artillery and the inscription of Battery L (Reynolds) with the detached men of Battery E |
| `NY3-S006` | 147th NEW YORK INFANTRY | pp. 985-1011: the address of Capt. J. V. Pierce (a participant) and, after it, an unsigned regimental sketch of the 147th (cited as a compilation, author not named) |
| `ME-S001` | front matter (title, commission narrative, lists) | the sketch and official report of Hall's Second Maine Battery (pp. 14-29) lie inside the section |
| `ME-S004` | SIXTEENTH REGIMENT PARTICIPANTS | the sketch of Stevens' Fifth Maine Battery (pp. 80-110) lies inside the section |
| `PA2-S031` | BATTERY "B" (COOPER'S) | correct; the address is by First Lieut. James A. Gardner (a participant of the battery) |

Why: Law 4 and the card's source line: a citation with a section heading that names another unit confuses a reader who checks the quote; the checker finds the quotes correctly (the offsets are exact) and no record of the group file is wrong.

The exact change wanted (not mine to make): split or re-title the five sections above so that the heading names the unit whose text starts the section, or add a `contains` list of unit labels to each; rebuild `statevol_index.json`. No record of `us-1c-1d-art.jsonl` needs to change when the ids stay the same; if ids change, tell bt-units (this group) so that the quotes can be re-checked with `check_undrawn.py us-1c-1d-art`.

Other defects found in the texts (no change wanted, recorded in the group report): the OCR prints 2d as 3d in the reports of Cutler (R037), Fowler (R040) and Newton (R030); the quote offsets of the group file stand in the texts as they are.
