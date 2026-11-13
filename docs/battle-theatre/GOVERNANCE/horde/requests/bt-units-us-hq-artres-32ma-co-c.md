# bt-units / us-hq-artres: the roster gap of Company C, 32d Massachusetts, is assigned to two groups

**What.** `history/undrawn/roster-gaps.json` lists `us-5c-1d-sweitzer-32ma-co-c` (action `status`, parent `us-art-reserve`, group `us-hq-artres`), and `groups.json` holds the same unit in the group `us-5c` (class `not_on_field`, why `listed_not_on_field`). `check_undrawn.py` refuses a record of group `us-hq-artres` that names a unit of another group ("unit_id ... belongs to group us-5c"), so the researcher of `us-hq-artres` could not write the `unit` record the plan asks for, and no record of this file names the company.

**Why it matters.** The roster lists the company as never on the field. Two texts of the Official Records say it was on the field with the Artillery Reserve on 3 July:

- Tyler, OR27-1-R315, p. 874 (quote offset 3082437): "guarding my train, were formed in line, and assisted in driving back stragglers", in the sentence "The company of the Thirty-second Massachusetts (Company C, Capt. J. C. Fuller commanding) and the battalion of the Fourth New Jersey, guarding my train, were formed in line, and assisted in driving back stragglers during the afternoon's engagement."
- The organization table, OR27-1-R009, printed page 167 by the running heads (quote offset 568782): "32d Massachusetts Infantry, Company C, Capt. Josiah C. Fuller", under the heading Headquarters Guard of the Artillery Reserve.

**The exact change wanted** (either one):

1. Move the unit to the group `us-hq-artres` in `groups.json` (re-run `build_groups.py`), and the researcher of `us-hq-artres` adds the `unit` record (action `status`, status `on_field`, quote of Tyler as above) and the arrival and position records of 3 July; or
2. Leave the unit in `us-5c` and have the researcher of `us-5c` write in `us-5c.jsonl` a `unit` record with `unit.action` `status`, `unit.status` `on_field`, citing the Tyler quote above (`source.report_id` OR27-1-R315, `printed_page` 874, `author_role` `formation_commander`, tier `documented`), plus a `position` record of 3 July in the afternoon at the Artillery Reserve train.

The 4th New Jersey (`us-4nj-train-guard`, same sentence of Tyler, and OR27-1-R335 of Maj. Charles Ewing) is in the group `us-hq-artres` and is done there (records U-us-hq-artres-0096, 0104 and 0105 of the file).

Nothing else in the roster, the ledgers or the layer data is touched by this request.
