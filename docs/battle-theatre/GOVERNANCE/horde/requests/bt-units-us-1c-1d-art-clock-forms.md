# Request from bt-units (group us-1c-1d-art): clock forms in words, the Fairfield road, and the gate of the 1st Division

Three things the group file `history/undrawn/us-1c-1d-art.jsonl` meets and cannot settle inside its own ownership. None is a defect of a record; each changes what the integrator can do with the records. Earlier note of this group: `bt-units-us-1c-1d-art-statevol-index.md` (section headings of the state-volume index).

## 1. Times printed in words or as a range cannot be coded as a clock

The contract takes `when.basis` `printed_clock` only when `t_iso` is a clock that stands in `printed` as numerals. Seven records of the group print the time in words or as a range; they are carried as `day_only`, `printed_period` or `sequence` with the printed words in `when.printed`, so the integrator reads a period or a chain, not the hour:

| Record | Unit | Printed words | Source | Carried as |
|---|---|---|---|---|
| 0076, 0086, 0087 | Artillery brigade and Fifth Maine Battery | "between ten and eleven o'clock a. m." | ME-S004 (Maine sketch of the Fifth Maine Battery) | `day_only` |
| 0140 | Battery L, 1st New York | "between 10 and 1 1 o'clock" (the OCR prints 1 1 for 11) | NY3-S024 (Breck, 1889) | `day_only` |
| 0127 | Sixth Wisconsin | "About one o'clock at night" | DAWES-1890 | `printed_period` night |
| 0289 | Sixth Wisconsin | "at half past one o'clock in the afternoon" | DAWES-1890 | `printed_period` afternoon |
| 0249 | Fifth Maine Battery | "At a few minutes past 2" | OR27-1-R073 (Whittier) | `sequence`, after a clocked record |

What is lost: the hour (a range of 10 to 11 a. m. for 0076, 0086, 0087 and 0140; 1 a. m. for 0127; 1.30 p. m. for 0289; a few minutes after 2 p. m. for 0249). The records are right as they stand; the words are in `printed`.

The change wanted (not mine to make): let the clock reader of `tools/check_undrawn.py` and `app/tools/claim-ledger.mjs` read an hour printed in words ("one o'clock", "half past one", "a few minutes past 2" as an approximate 2.00 to 2.10) and a range ("between ten and eleven o'clock": `t_iso` 10:00 and `t_end_iso` 11:00, approximate), so that these seven records can be re-coded as `printed_clock`. The claim ids stay; bt-units (this group) re-codes them when the reader exists. If the contract stays as it is, nothing is owed: the records keep their period or day.

## 2. "The Fairfield road" (concordance RC-08) is read two ways

`library/ROAD-CONCORDANCE.md` RC-08 leaves "the Fairfield road" unresolved between the Hagerstown Road (GZ-048) and the road from the Peach Orchard (Millerstown Road), because the claims it reads describe moves of 2 July. Two records of this group print the name for 1 July at the seminary:

- 0099 (`road_identification`, inferred): Gardner (PA2-S031) prints "Hagerstown- (Fairfield) road" for the road Cooper's battery entered after passing up Willoughby Run; the identification rests on the printed Hagerstown name (GZ-048).
- 0186 (`position`, inferred, `conflicts_with` RC-08): Dawes (R035) puts the left of the Sixth Wisconsin on "the Fairfield road" when the regiment was detached as a reserve; the place is anchored on GZ-048 near the seminary because Gardner's address gives the Hagerstown road the Fairfield name at that place.

The change wanted (not mine to make): split RC-08 by place and time (the road at the seminary on 1 July, the road of the moves of 2 July), or add these two passages to the row, so that the integrator can tell whether 0186 stands or waits for the owner. Until then 0186 is carried as inferred with the concordance entry named as the alternative; no default was chosen.

## 3. The layer's gate for the 1st Division is later than three printed arrivals

`history/arrivals.json` gives the 1st Division the gate "about 10:20 (vanguard)" (the plan's first-on-field cell, tier documented) and the I Corps "head about 10:00 on the Emmitsburg Road". The rule of the integrator (PLAN section 6) is that a unit's gate is the earliest printed time of its own `arrival` records. The group file prints, for units of the division, earlier times than 10:20: the 24th Michigan "about 9 a. m." (0016, Morrow), the 147th New York about 9:30 a. m. (0044, the regimental sketch) and the division and brigade about 10 a. m. (0004 Wadsworth, 0015 Mansfield, 0021 Robinson); the 76th New York about 10.30 a. m. (0043) is later. These are carried as one cluster of conflicts (the arrival of the division and the brigades), none resolved.

Owner decision needed (Law 6: only the owner decides the default view of conflicting sources): which hour the layer shows as the gate of the division and its regiments (the plan's 10:20, the earliest printed time of each unit, or a selectable range). Until it is recorded the integrator applies its own rule and the plan's 10:20 stays as the conflict.

## What was checked

`python3 -I docs/battle-theatre/history/undrawn/tools/check_undrawn.py us-1c-1d-art --complete` exits 0 with this file as it is: 0 errors, 2 warnings (records 0084 and 0209, whose notes say why no anchor exists). Nothing was committed or deployed and no `passes` flag was touched.
