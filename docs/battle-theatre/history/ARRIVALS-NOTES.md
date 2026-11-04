# Arrivals ledger and order of battle: parse notes

Source: PDF Part B.2.4 (unit arrival and departure ledger, pages 59-62, `plan-clean.txt` lines 15463-16444), B.3 (order of battle, pages 64-65, lines 16891-17071), animation gating rules (page 63, lines 16709-16716). Conflicts: `GOVERNANCE/conflicts_structured.json` (C-001..C-047).

Rebuild: `python tools/bt/build_arrivals.py` (idempotent; exits 1 and writes nothing if the curated interpretation disagrees with the printed text). Check: `python tools/bt/check_arrivals.py` (exit 1 on any failure).

## Files

| File | Content |
|---|---|
| `units.json` | 726 units: armies, corps, divisions, brigades, regiments, battalions, batteries, ledger groups, not-on-field units. Names and commanders as printed; strength fields from the B.3 table (source `PDF-B3`). |
| `arrivals.json` | 44 ledger rows (raw cells verbatim, parsed gates, nights, conflicts, tier), 9 sub-unit gates, 4 derived gates, `gates` map used by the checker, 4 unparsed cells. |
| `not_on_field.json` | The two "never or only partly on the field" tables, the unit records they map to, the gating rules 1-5 (+ the sixth printed sentence on hospitals and trains) as objects. |
| `crosscheck.json` | Ledger vs B.3 regiment lists, ledger battery letters/commanders matched to B.3 batteries, Confederate artillery battalion list vs corps lists. |
| `tools/bt/oob_units.py`, `build_arrivals.py`, `check_arrivals.py` | Parser, builder, validator (with `presence_ok`). `arrivals_cells.py` (cell line ranges) and `arrivals_data.py` (curated interpretation) are inputs. |

## What was parsed

* Ledger cells: every one of the 44 rows x 7 cells is reconstructed from hand-checked line ranges. The builder prints each reconstructed cell once (no `--quiet`) and fails on a leaked page marker, an empty cell, a row/SPEC mismatch, a SPEC clock that is not in the printed cells (the word "noon" is accepted for 12:00), a SPEC source key not printed in the row, a conflict id absent from the register, or a printed `C-nnn` in a row (none is: the B.2.4 rows never print C ids; links are by topic, labelled `cited_by_reference`, `topic_arrival` or `topic_other_cell`).
* `us-2c-3d` is printed twice (end of p.59, partial; p.60, complete). The p.59 fragments are asserted to be contained in the p.60 text; p.60 is used.
* Night cells are split at dated segments into `segments`, and mapped to the five night columns (Jun 29 .. Jul 3) as `printed`, `gap_printed` (the cell says gap) or `gap_not_mentioned` (the cell is silent; PDF: "otherwise gap"). A dashed label (`Jun 29-30:`, `Jul 1-2:`) is expanded to each night it names and flagged `range_label`; a two-day non-gap range is also flagged `range_ambiguous` (it can mean the night spanning the two dates or both nights; the PDF does not say). Segments with no date label are kept unlabelled. Dates outside the five columns (Jun 25-28, Jun 26-27) stay in `segments` only.
* Key positions are carried raw (not split). Left-or-moved cells are carried raw plus a purely lexical `events` list (date, clock, period words as printed).
* B.3: Union and Confederate corps bodies split at division/artillery labels (Confederate divisions on the known labels, so "R. H. Anderson", "J. T. Brown" do not split). Regiment lists are expanded from the printed list; state or arm suffixes are inherited from the next token that has one (flag `state_inherited_from_next_token`), ranges are expanded (`70th-74th`, `5th-9th LA`, `1st-5th VA`), `1st and 2nd SC` is split, battery letters `E and L` become two batteries, plural suffixes printed once are distributed (`Cobb's, Phillips Legions` -> Cobb's Legion, Phillips Legion; `34th and 36th VA Bns` -> two battalions). Letters after a cavalry regiment (`3rd WV A and C`) are kept as one record (companies, not expanded).
* The Pennsylvania Reserves lists print no state (`McCandless (1st, 2nd, 6th, 13th); Fisher (5th, 9th-12th)`); they are named `1st PA Reserves` etc. from the printed division label `Crawford (PA Reserves)` (flag `state_not_printed_name_from_division_label_PA_Reserves`).
* Regimental commanders: the PDF says they were stripped from the fetched order of battle. None is supplied. Brigade and division commanders are as printed (`(k)`, `(w)`, `(mw)` kept).
* Strength figures: the 13 corps rows of the B.3 table (Union 9, Confederate 4) and the 8 brigade figures printed below it are attached to the units as single printed figures with the printed basis (Stone Sentinels, caveats B.1); no range is declared by the PDF, so none is invented (`range_declared: false`). Printed rates were recomputed and all agree with lost/strength after rounding. C-047 (strength and casualty totals) is linked to every unit carrying a figure.

## Counts against the PDF's rough counts (B.3: "not sourced")

| | PDF rough | Parsed from B.3 | Difference |
|---|---|---|---|
| Union regiments | about 270 | 270 = 238 infantry + 30 cavalry regiments + 1 battalion (10th NY Bn) + 1 attached company (1st Co. Mass. Sharpshooters); the 4th NJ (not in B.3, train guard) would make 271 | 0 |
| Union batteries | about 65 | 61 (letters expanded; `1st CT Heavy` counted once) | -4 (the PDF's count is unsourced; no battery was invented) |
| Confederate regiments and battalions | about 170 | 171 infantry (165 regiments + 6 battalions); plus 22 cavalry (18 regiments + 4 battalions) = 193 | +1 infantry, +23 with cavalry (the rough figure does not say whether cavalry is included) |
| Confederate batteries | about 65 | 6 (only Alexander's battalion lists batteries: Ashland, Bedford, Brooks SC, Madison LA, Richmond, Bath) | -59: the PDF names no other Confederate battery; "battery captain names are in the notes for some battalions" but the notes are not in the PDF |
| Confederate artillery battalions | about 15 | 16 battalion-level artillery units in the corps lists (incl. Washington Artillery, 1st VA Artillery Bn, Stuart Horse Artillery); the printed list at line 17007 has 15 names | see below |

Totals: 726 units (707 from B.3 including the two army nodes, 19 added from the ledger and the not-on-field tables). Brigades 60 US / 44 CS.

Artillery battalion list (line 17007) vs the corps lists: Latimer/Raine, Dance and Lane are only in the printed list; Andrews, Cutts, the Stuart Horse Artillery (Beckham) and the unnamed-commander 1st VA Artillery Bn are only in the corps lists. The PDF does not say they are the same battalions; no equivalence assumed. The ledger also mentions "Huger's four batteries" (I Corps artillery key positions) and, for the Artillery Reserve, "Phillips" and "Hart": none is in any list.

Ledger vs B.3 regiment lists agree wherever the ledger prints a list (`crosscheck.json`). Where they differ it is only a ledger omission or wording: Biddle and Stone (I Corps 3rd Div) print no list in the ledger, Kelly's Irish Brigade prints none, "Berdan's two Sharpshooter regiments" (ledger) = 1st and 2nd US Sharpshooters (B.3), "3rd Ga SS Bn" (ledger) = "3rd GA Sharpshooters" (B.3), the 35th VA Cav Bn is outside the parentheses in the ledger.

## Gate conventions (what `presence_ok` uses)

* A time is a **printed** clock only if it appears in the cell. Everything else is labelled: `named_period_convention` (dusk/evening 19:32, night 20:04, sunrise Jul 3 04:36: PDF B.2.2 definitions; "evening" has no PDF clock, so the start of [DUSK] is a checker floor), `date_floor` (00:00 of a printed date), `event_floor` (PDF gating rule 3), `children_min`.
* Defaults copied from B.2.5 are **PDF recommendations, PENDING OWNER**, never owner decisions (`default_status`). Where the cell prints a range and B.2.5 has no entry, the earliest is the default and the midpoint required by PDF rule 1 ("middle or the better-sourced value") is carried as `midpoint_pdf_rule_1` (us-1c-art 10:22, cs-2c-early 15:30). Owner to decide.
* `presence_ok(unit, time, scenario, location)` is a permission test: False means the PDF forbids drawing the unit. Scenarios: `earliest`, `default`, `latest`, `vN`. A unit with no own gate inherits its parent's (army nodes carry a derived gate = earliest formation). Date-only floors are 00:00 of the date, so they are permissive within the day.
* **Departures are not gated.** `left_or_moved` is carried verbatim with lexical events; `presence_ok` never removes a unit after it leaves (Buford Jul 2 noon, Kilpatrick Jul 4, the Jul 4-5 retreat). Open item for the owner/next session: a departure gate needs a rule for which departures are drawn as marches.
* Tier: `documented` only if clock times are printed AND a non-weak key is printed in the row (weak patterns in `arrivals.json` meta: `^W-` Wikipedia, `^OOB-`, `EPP` (the legend itself says weak, unreferenced), `^CWT` forum, `PADRE` blog, `^WHB`, `^SS`, `STONE-RES`, `^SStone` Stone Sentinels). Named-period, date-only and event-floor gates are `inferred`; no usable time is `open gap`. The cells do not say which key supports which time, so this is row-level; `claim_support_verified` is false everywhere. 27 rows documented, 13 inferred, 4 open gap. Weak-only rows: us-1c-3d, us-1c-art, us-3c-art, cs-anv-hq, cs-cav-jenkins, cs-cav-robertson-jones-imboden.

## Ambiguities and judgement calls (all visible in the data)

* us-11c: "before noon (W-D1)" is an upper bound with no lower bound. It is kept as a selectable value (`v3`, 12:00) and sets `earliest` to 12:00; the default stays at the earliest printed clock (12:30). `lower_bound_uncertain` is set.
* us-1c-2d: "late morning to early afternoon" has no clock; only 11:00 (Coulter) is a clock.
* us-1c-3d: Biddle and Stone have no clock; the row gate is the date floor Jul 1; Stannard's brigade has its own gate (earliest documented sighting 18:00 Jul 2, flagged gap).
* us-cav-1d-merritt: Merritt's own gate (about 15:00 Jul 3) is derived from the key-positions cell ("leaves Emmitsburg noon Jul 3; about 15:00 on the Emmitsburg Road") by gating rule 3, because the arrival cell names only the division (Jun 30). This may hide Merritt on earlier days if he was present; the PDF does not say. Flagged `derived`, tier inferred.
* cs-1c-pickett: the only clock in the cell (06:00 Jul 2, EPP) is when marching begins. Gate: earliest = night of Jul 2 (20:04), default = sunrise Jul 3 (04:36, C-021 recommended, PENDING OWNER), latest = "by noon Jul 3" (key-positions cell). Row marked `unresolved`.
* Stuart's brigades: Hampton and Fitzhugh Lee/Chambliss are gated to 19:32 Jul 2 (rule 4). **Jenkins** is gated the same way by my reading of rule 4 and the timeline row T2-200 (brigades arrive Jul 2 evening); his own ledger cells contradict each other (see defects). Hampton's rear guard at Hunterstown (Jul 2 16:30 to dark) and Jones at Fairfield (Jul 3, date only) are detached roles, True at their location only. Union cavalry at Hunterstown is the first-on-field value of us-cav-3d (16:30).
* cs-3c: the corps cell gives locations only; the corps gate is the earliest of its three divisions (Heth 07:30 Jul 1).
* cs-cav-div: the cell is a pointer ("See the cavalry rows below"); date floor Jul 2 from the key-positions cell. Stuart's own arrival (C-023, "early afternoon") has no clock; the Stuart Horse Artillery (Beckham) inherits this floor.
* Pre-battle dates are not gate values: Early occupying Gettysburg Jun 26 and Pettigrew's Jun 30 raid are stored as `pre_battle` text only. The Q04 gate for Early's and Heth's divisions starts at their Jul 1 values.
* Sub-unit rows needed for ids: Washington Artillery is `cs-1c-res-art-washington` with commander Eshleman taken from the ledger commander cell; Cabell is filed under McLaws, Dearing under Pickett, Henry under Hood (B.3), Alexander under the Reserve artillery (Walton). The ledger's "I Corps artillery" row (`cs-1c-art`) is kept as a grouping unit.
* 1st CT Heavy (2nd Vol Bde) and the 32nd Mass. are `partly_on_field`; Batteries B and M and Co. C are `never_on_field` children. The 4th NJ is not in B.3; it is added from the table with parent `us-aop` (its corps is unknown). "Two Vermont regiments guarding trains" (B.3 text) are unnamed in the PDF and are not added.
* C-003 lists 05:00 and 08:00 only; the us-5c row adds "lead regiments about 07:00 (CHAM)", kept as a printed value. C-001 default "about 01:00" is taken from the range "about 00:00-01:00" in the row.

## Unparsed cells (verbatim in `arrivals.json` `unparsed`)

1. `us-2c-1d` left_or_moved: "Hospital moves after Jul 3 overshots" (the word "overshots" is unexplained; possible stray text).
2. `cs-3c` first_on_field: "Jul 1: Heth at Cashtown; corps at Fayetteville Jun 29" (locations, not an arrival time).
3. `cs-cav-jenkins` first_on_field: "Jun 29 at Carlisle with Ewell; attached to Stuart Jul 3" (no arrival on the field stated).
4. `cs-cav-jenkins` night_positions: "Where wounded: gap" (not a night position).

Rows with no usable arrival time (gate is a floor or inherited): us-1c-3d, us-2c-1d, us-2c-3d, us-art-reserve (date only); us-2c-art, us-3c-art (row), cs-1c-art (gap, inherit parent); us-5c-3d (event floor 19:00 Jul 2); cs-cav-div (pointer); cs-cav-robertson-jones-imboden (never on the main field).

## PDF defects noticed

1. `cs-2c` (II Corps) first-on-field "about 14:30 Ewell's right appears on Hill's left" is later than the Rodes division row "Jul 1 about 12:30 on Oak Hill (Carter first)" and than the corps' own "about 11:00 turns toward Gettysburg".
2. `us-12c` cell is headed "Jul 1 evening on Culp's Hill" but prints 17:30 (sunset is 19:32), and "Geary on Cemetery Ridge 17:30" sits in a cell about Culp's Hill.
3. Jenkins's cells contradict each other: "attached to Stuart Jul 3" (arrival), "wounded Jul 2" (commanders), "Where wounded: gap" in the night column, ECF Jul 3 key position, and timeline row T2-200 lists him among the brigades arriving Jul 2 evening.
4. `us-2c` says "see the gate table below", but B.2.4 has no gate table (the conflict register is in B.2.5); none of the 44 rows prints a C-nnn id although the register note says rows cite them (B.2.2 and the day sections do).
5. The same EPP 06:00 value appears in `us-2c` and (as "Gibbon's division") `us-2c-2d`; C-004 does not say which unit EPP means.
6. `us-2c-3d` is printed twice (p.59 partial, p.60 complete); the p.59 fragment duplicates the unit heading.
7. `us-2c-1d` "overshots" (see unparsed). The Jenkins cell "Where wounded: gap" in the night column is the tail of timeline row T2-200 ("Where and when Jenkins was wounded: gap"), pasted into the wrong column.
8. `us-3c` prints two corps arrival values in one cell (Birney dusk Jul 1 about 20:00 vs Jul 2 about 07:00 at Little Round Top, EPP) and B.2.5 has no entry for it; both are kept as selectable values, default = earliest.
9. B.3 notes its own slips (VI Corps, Cavalry Corps, Howe's missing first brigade); the table "Union units never or only partly on the field" lists Howe's 1st Brigade as "(Howe)" although Howe commands the division; only Grant and Neill are listed in B.3.
10. Ledger rows give no time for Biddle/Stone, Artillery Reserve, II Corps 1st and 3rd Divisions (gap rows, rule 3).
11. The B.3 artillery-battalion list and the corps lists name different battalions (see above); the Union battery count (about 65) and Confederate battery count (about 65) are not reproducible from the PDF.
12. `cs-3c-anderson` "Perry's/Lang's" (ledger) vs "Perry/Lang" (B.3); the ledger prints "Hoke's (Avery)" vs "Hoke/Avery".

## Not done / open

* Departure gating (see above).
* Per-regiment arrival times (the PDF lists them as an open gap for II, III and XII Corps): regiments inherit their brigade, division or corps gate; they carry no times of their own.
* Official Records / unit-history verification of any time: `claim_support_verified` is false for every record.
