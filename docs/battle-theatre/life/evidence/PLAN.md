# OA11 evidence pass: soldier work and routine (plan)

Workstream bt-life. Built 2026-11-14 by `tools/bt/life/build_groups.py`; the narrative below is that script's text, the tables are generated from `groups.json`, `contract.json`, `poses.json`, `inventory/works.json`, `leads/SUMMARY.json`. Nothing here is evidence: the evidence is the rows of `evidence/<group>.jsonl`, each with a verbatim quote that `validate_evidence.py` finds in a local text.

## 1. What is asked, and the rules that bind it

Owner addition OA11 (2026-11-13): "soldiers are shown doing the work and the routine of the armies: building artillery positions, earthworks and defenses, and ordinary things such as eating meals in their camps". DEC-OA10-12 maps it to PDF B.7 (works are built on screen, never pre-placed; what existed before the battle is never given a construction animation), the unit activity rows of the timeline, gates Q08 and Q17 and the clips already in `app/data/anim3d/clips.json`; DEC-OA10-12 item 4 is the evidence rule this plan carries out: an activity is drawn as documented only where a non-lead source states it for that unit or place and time; otherwise it is plausible-procedural and marked; no meal time, ration or camp layout is invented; where the record is silent the scene uses the regulation or the period-documented practice and says so.

* No literal 100 percent is claimed (Law cl.3, DEC-003): documented / inferred / plausible-procedural, every gap registered and shown. Nothing is narrowed or deferred: a source that cannot be read here is listed as blocked, a lookup that finds nothing is recorded as failed (`open gap` rows with the list of what was searched).
* Source conflicts are carried as selectable scenarios (`conflicts` of a row, `scenario_key`); no default view is chosen (Law cl.6). The start of the Culp's Hill works (about 06:00 or the night of 1-2 July) is the first example (`us-12c-L001`).
* Never fabricate (Law cl.4): a row without a quote that the validator finds in the named local text is refused; a manual is never evidence that a unit did something on a day; Wikipedia, forums, blogs, auction pages and memory are not in the source registry and cannot be cited.
* Nothing here is deployed; no account, key or login was used. The six period manuals were fetched from archive.org (public domain, one request per second, no login).

## 2. What already exists and is reused (not redone)

* `structures/works_stages.json` (E-01..E-18, the 7-stage build model), `structures/state_schedule.json` (S-001..S-088), PDF B.7.3 (P-01..P-14 pre-existing walls: never construction), PDF B.7.5 (G-01..G-18 gun emplacements): the register `inventory/works.json` joins them.
* The fence close-outs `GOVERNANCE/evidence_corrections/fence-1..3.jsonl` (verbatim quotes with offsets for E-01..E-18 and S-001..S-088): `works.json` carries a digest of every sub-claim and whether it was supported; the groups turn the supported quotes into rows and add what is missing.
* `app/data/anim3d/clips.json` (397 clips): the activity clips and their limits are in `poses.json`.
* The local texts (`sources.json`, 190 texts): Official Records vol. 27 parts 1-3, the state volumes, narratives, the 1863 newspapers, the National Park Service reports and six period manuals fetched for this pass (US Regulations 1861, Confederate Regulations 1863, Butterfield 1863, Mahan 1862, Duane 1862, Billings 1887).

## 3. The groups (22)

Partition rule: **every text or record has exactly one owner** (Official Records records by the unit that wrote them, or by date for part 3; state-volume sections by regiment; other texts by subject), so each passage is read once (extract-once). A group extracts every row from the texts it owns, whichever unit the row is about; `unit_id` is the unit, not the group. A work is assigned to the group whose texts most likely name its builder; a work that only another group's texts name is extracted there and cross-listed. The two army-level groups (`us-army`, `cs-cav-army`) also own the records the assignment rules could not place (`needs_hand_check` in `report_assignments.json`): decide the unit first, note it in the group report, extract.

| group | what it owns | records (pt1/pt2/pt3) | leads (hits) | works | rows now |
|---|---|---|---|---|---|
| `us-1c` | I Corps (Reynolds, Doubleday, Newton) and its artillery brigade | 47 (47/0/0) | not scanned | E-01, E-02, G-02, S-009, S-010, S-014, W-13MA-RIFLE-PIT, W-COULTER-BREASTWORKS ... | 2 |
| `us-2c` | II Corps (Hancock) and its artillery brigade | 56 (56/0/0) | not scanned | E-17, G-12, W-ANGLE-WALL-STRENGTHENED, W-CEM-RIDGE-RAIL-STONE, W-SKIRMISH-PITS-EMMITSBURG-RD | 2 |
| `us-3c` | III Corps (Sickles) and its artillery brigade | 47 (47/0/0) | not scanned | E-16, G-05 | 0 |
| `us-5c` | V Corps (Sykes) and its artillery brigade | 37 (37/0/0) | not scanned | E-13, E-14, E-15, G-06, S-043, W-BIG-ROUND-TOP-WORKS | 1 |
| `us-6c` | VI Corps (Sedgwick) and its artillery brigade | 17 (17/0/0) | not scanned | - | 0 |
| `us-11c` | XI Corps (Howard) and its artillery brigade | 36 (36/0/0) | not scanned | E-04, E-12, G-03, S-026, W-WEST-CEMETERY-HILL-WORKS | 0 |
| `us-12c` | XII Corps (Slocum) and its artillery brigade | 47 (47/0/0) | not scanned | E-03, E-05, E-06, E-07, E-08, E-09, E-11, G-17 ... | 1 |
| `us-cav` | Cavalry Corps (Pleasonton) | 31 (31/0/0) | not scanned | G-01, S-003 | 0 |
| `us-army` | Army of the Potomac, army level | 53 (53/0/0) | not scanned | G-07, G-10, G-11, G-13 | 2 |
| `cs-1c` | Longstreet's First Corps (McLaws, Pickett, Hood) and its reserve artillery | 33 (0/33/0) | not scanned | G-08, G-09, G-14, W-CONFED-WARFIELD-WORKS | 0 |
| `cs-2c` | Ewell's Second Corps (Early, Johnson, Rodes) and its reserve artillery | 57 (0/57/0) | not scanned | E-10, G-04, G-15, S-001, W-CONFED-OAK-HILL-BENNER, W-GBG-STATION-RAILS-TORN | 3 |
| `cs-3c` | Hill's Third Corps (Anderson, Heth, Pender) and its reserve artillery | 27 (0/27/0) | not scanned | E-18, G-16, W-CONFED-SEMINARY-WORKS | 0 |
| `cs-cav-army` | Army of Northern Virginia | 48 (0/48/0) | not scanned | S-054 | 0 |
| `town-burial` | The borough of Gettysburg, civilians, newspapers, hospitals as camps, burial and the cemetery | 0 (0/0/0) | not scanned | S-052, W-BURIAL-TRENCHES, W-CAMP-LETTERMAN, W-TOWN-BARRICADES | 0 |
| `bridges-roads` | Engineers, pioneers, bridges, roads and railroads of the campaign | 3 (3/0/0) | not scanned | W-FALLING-WATERS-PONTOON, W-LEE-RETREAT-BRIDGES, W-POTOMAC-PONTOONS-JUN, W-ROADS-CUT, W-WRIGHTSVILLE-BRIDGE | 0 |
| `corr-jun26-30` | Official Records part 3, correspondence and orders dated 22-30 June | 504 (0/0/504) | not scanned | - | 0 |
| `corr-jul1-3` | Official Records part 3, correspondence and orders dated 1-3 July | 144 (0/0/144) | not scanned | - | 0 |
| `corr-jul4-14` | Official Records part 3, correspondence and orders dated 4-14 July | 531 (0/0/531) | not scanned | W-FALLING-WATERS-WORKS-JUL14, W-WILLIAMSPORT-WORKS | 0 |
| `period-manuals` | Period manuals and regulations | 0 (0/0/0) | not scanned | - | 0 |
| `narratives-us` | Union narratives, early guides and the state volumes without a section index | 0 (0/0/0) | not scanned | - | 0 |
| `narratives-cs` | Confederate narratives | 0 (0/0/0) | not scanned | - | 0 |
| `campaign-elsewhere` | The campaign outside the Gettysburg map | 133 (4/129/0) | not scanned | W-HARRISBURG-DEFENSES, W-WRIGHTSVILLE-WORKS | 0 |

Official Records records outside the theatre clock (part 3 documents dated before 22 June or after 14 July, or undatable): 979, listed in `report_assignments.json` with the reason (group null); they are not read for rows.

### `us-1c`: I Corps (Reynolds, Doubleday, Newton) and its artillery brigade

Days: 26 Jun - 14 Jul. Phases: approach, 1 Jul fight, 2-3 Jul reserve and Culp's Hill, retreat. Output: `docs/battle-theatre/life/evidence/us-1c.jsonl`; report: `docs/battle-theatre/life/evidence/us-1c.report.md`. Depends on: `period-manuals`.

Looks for:
* the Seminary Ridge rail barricade (E-01): who stacked the rails, when, how many men, tools; its first mention by a participant
* the breastworks "thrown up" near the seminary on 1 July by regiments that report it (say which regiments)
* the 6th Wisconsin and Wadsworth's division on Culp's Hill the evening of 1 July (E-02): tools (the PDF says about a dozen spades and shovels from the regimental wagon, source HistoryNet: find the non-lead text or register the gap), men, hour
* fences and walls used as cover on McPherson and Oak Ridge (P-07; wall_improved only), the unfinished railroad cut (P-12, terrain not work)
* battery works of Wainwright's brigade on 1 July (G-02) and the rail-fence guns at the seminary
* routine: the approach march of 26-30 June (camps, rations, rain), the night of 1-2 July, 2-3 July in reserve, the retreat of 4-14 July

Works owned (register `inventory/works.json`): E-01, E-02, G-02, S-009, S-010, S-014, W-13MA-RIFLE-PIT, W-COULTER-BREASTWORKS, W-SEMINARY-BREASTWORKS-94NY. Schedule rows for context (state_schedule.json, not in the register): S-005, S-011.
Units (history/units.json): `us-1c`, `us-1c-1d`, `us-1c-2d`, `us-1c-3d`, `us-1c-art`.
Clips likely used: `dig_shovel`, `chop_axe`, `march_carry_rail`, `stand_picket`, `sleep_side`, `eat_hardtack`.

### `us-2c`: II Corps (Hancock) and its artillery brigade

Days: 26 Jun - 14 Jul. Phases: approach, 1 Jul night arrival, 2-3 Jul Cemetery Ridge, retreat. Output: `docs/battle-theatre/life/evidence/us-2c.jsonl`; report: `docs/battle-theatre/life/evidence/us-2c.report.md`. Depends on: `period-manuals`.

Looks for:
* the rail and stone works on Cemetery Ridge (E-17: the plan says open gap, do not animate as documented): Hancock, Gibbon, Hays, Webb, Harrow
* skirmish pits and rail piles in front of the line on 2-3 July (Bryan and Codori farms, Emmitsburg Road)
* the Angle wall (P-01): any statement that rails or earth were added; never a construction of the wall
* Ziegler's Grove and Cushing's position (G-12): prepared or improvised, who worked
* routine: the march of 29 June - 1 July, meals and sleep 2-3 July, the cooking before the cannonade of 3 July, burial of the dead 4 July, the retreat

Works owned (register `inventory/works.json`): E-17, G-12, W-ANGLE-WALL-STRENGTHENED, W-CEM-RIDGE-RAIL-STONE, W-SKIRMISH-PITS-EMMITSBURG-RD. Schedule rows for context (state_schedule.json, not in the register): S-058, S-062.
Units (history/units.json): `us-2c`, `us-2c-1d`, `us-2c-2d`, `us-2c-3d`, `us-2c-art`.
Clips likely used: `dig_shovel`, `march_carry_rail`, `lay_stone`, `stand_picket`, `sleep_side`, `cook_stir`, `eat_hardtack`.

### `us-3c`: III Corps (Sickles) and its artillery brigade

Days: 26 Jun - 14 Jul. Phases: approach, 2 Jul Peach Orchard and Devil's Den, 3 Jul, retreat. Output: `docs/battle-theatre/life/evidence/us-3c.jsonl`; report: `docs/battle-theatre/life/evidence/us-3c.report.md`. Depends on: `period-manuals`.

Looks for:
* Devil's Den and Houck's Ridge (E-16: the plan says no works, Ward lacked time or inclination: find the sentence or the gap)
* rail or stone cover at the Peach Orchard, the Emmitsburg Road fences and the Wheatfield wall (P-04, P-10: used, not built)
* rifle pits and skirmish works before the attack of 2 July; Berdan's sharpshooters
* gun positions of Smith, Bigelow, Hart (G-05, G-07, G-10): improvised on open ground
* routine: the camp of 1-2 July, rations and the 2 July morning, picket duty, retreat

Works owned (register `inventory/works.json`): E-16, G-05. Schedule rows for context (state_schedule.json, not in the register): S-033, S-034.
Units (history/units.json): `us-3c`, `us-3c-1d`, `us-3c-2d`, `us-3c-art`.
Clips likely used: `dig_shovel`, `march_carry_rail`, `stand_picket`, `cook_stir`, `eat_hardtack`.

### `us-5c`: V Corps (Sykes) and its artillery brigade

Days: 26 Jun - 14 Jul. Phases: approach, 2 Jul Little Round Top and Wheatfield, 3 Jul, retreat. Output: `docs/battle-theatre/life/evidence/us-5c.jsonl`; report: `docs/battle-theatre/life/evidence/us-5c.report.md`. Depends on: `period-manuals`.

Looks for:
* the Little Round Top breastworks (E-14: Weed's brigade, the Pennsylvania Reserves; the plan says built the evening of 2 July or later, NPS says built on 2 July): who, hour, material
* Big Round Top and the south slope: any works or road cut by gunners
* Hazlett's guns hauled up by hand (G-06: improvised, no earth): the men who did it
* the stone wall used by the 20th Maine (P-14: used, not built)
* routine: the night march of 1-2 July to Little Round Top, the halt for coffee or rest, 3 July, the retreat to Maryland

Works owned (register `inventory/works.json`): E-13, E-14, E-15, G-06, S-043, W-BIG-ROUND-TOP-WORKS. Schedule rows for context (state_schedule.json, not in the register): S-038.
Units (history/units.json): `us-5c`, `us-5c-1d`, `us-5c-2d`, `us-5c-3d`, `us-5c-art`.
Clips likely used: `dig_shovel`, `lay_stone`, `march_carry_rail`, `sleep_side`, `cook_stir`.

### `us-6c`: VI Corps (Sedgwick) and its artillery brigade

Days: 26 Jun - 14 Jul. Phases: the long march of 29 Jun - 2 Jul, 3 Jul on the left, pursuit and works of 5-14 Jul. Output: `docs/battle-theatre/life/evidence/us-6c.jsonl`; report: `docs/battle-theatre/life/evidence/us-6c.report.md`. Depends on: `period-manuals`.

Looks for:
* the march of 29 June - 2 July: halts, meals, rations, men falling out, rest in the night, arrival; the number of miles each report states
* positions on 2-3 July near Little Round Top and Wolf's Hill: any works, pickets, camps
* works or camps of the pursuit (Fairfield, Boonsboro, Funkstown, Williamsport 5-14 July): who intrenched, when
* routine of the retreat: the days of rain, rations, burials
Units (history/units.json): `us-6c`, `us-6c-1d`, `us-6c-2d`, `us-6c-3d`, `us-6c-art`.
Clips likely used: `march_carry_rail`, `dig_shovel`, `sleep_side`, `stand_rest`, `cook_stir`.

### `us-11c`: XI Corps (Howard) and its artillery brigade

Days: 26 Jun - 14 Jul. Phases: approach, 1 Jul town and Cemetery Hill, 2-3 Jul Cemetery Hill, retreat. Output: `docs/battle-theatre/life/evidence/us-11c.jsonl`; report: `docs/battle-theatre/life/evidence/us-11c.report.md`. Depends on: `period-manuals`, `town-burial`.

Looks for:
* Cemetery Hill and East Cemetery Hill works (E-04, E-12): the plan says von Steinwehr "fortified" it and the lunette builders are unknown (builder_unknown: stand-in crew): find who dug, when, with what
* West Cemetery Hill battery works and the Evergreen Cemetery walls and fences (Osborn, Wainwright, Hunt)
* rifle pits and barricades in the streets on 1 July and on the Baltimore Pike
* the brickyard lane and low walls (P-02, P-03: pre-existing)
* routine: bivouac on Cemetery Hill the night of 1-2 July, rations, pickets toward the town, burial details

Works owned (register `inventory/works.json`): E-04, E-12, G-03, S-026, W-WEST-CEMETERY-HILL-WORKS. Schedule rows for context (state_schedule.json, not in the register): S-020, S-044, S-045.
Units (history/units.json): `us-11c`, `us-11c-1d`, `us-11c-2d`, `us-11c-3d`, `us-11c-art`.
Clips likely used: `dig_shovel`, `lay_stone`, `chop_axe`, `stand_picket`, `sleep_side`, `eat_hardtack`.

### `us-12c`: XII Corps (Slocum) and its artillery brigade: Culp's Hill

Days: 26 Jun - 14 Jul. Phases: approach, 1-2 Jul arrival, 2-3 Jul Culp's Hill works, retreat. Output: `docs/battle-theatre/life/evidence/us-12c.jsonl`; report: `docs/battle-theatre/life/evidence/us-12c.report.md`. Depends on: `period-manuals`.

Looks for:
* Greene's brigade (E-05): start about 06:00 or the night of 1-2 July (conflict carried), finish about 09:00-10:00 or noon (conflict carried), tools, men per regiment, traverse and head logs (E-06), the 137th NY trench
* Kane's and Lockwood's brigades, Williams's division, Wadsworth's men on Greene's left (E-07, E-08): per-regiment work (the plan lists this as an open gap)
* the 123rd NY works of 1 July (E-03) against the 6 a.m. start (conflict carried)
* the line left on the evening of 2 July when the corps moved (E-09, S-041), then the return
* Powers Hill and the Culp's Hill batteries (G-17, G-18); tools, spades, axes carried by the regiments or issued
* routine: the camp of 1 July, the night of 2-3 July, rations during the fight of 3 July, the dead of the lower hill, the retreat

Works owned (register `inventory/works.json`): E-03, E-05, E-06, E-07, E-08, E-09, E-11, G-17, G-18, S-015, S-023, S-024, S-025, W-POWERS-HILL-EMPLACEMENTS. Schedule rows for context (state_schedule.json, not in the register): S-041, S-050, S-056, S-057.
Units (history/units.json): `us-12c`, `us-12c-1d`, `us-12c-2d`, `us-12c-art`.
Clips likely used: `dig_shovel`, `chop_axe`, `lay_stone`, `march_carry_rail`, `stand_picket`, `sleep_side`, `cook_stir`, `eat_hardtack`.

### `us-cav`: Cavalry Corps (Pleasonton): Buford, Gregg, Kilpatrick, Merritt, horse artillery

Days: 26 Jun - 14 Jul. Phases: approach and Hanover, 1 Jul McPherson Ridge, 2-3 Jul flanks, pursuit. Output: `docs/battle-theatre/life/evidence/us-cav.jsonl`; report: `docs/battle-theatre/life/evidence/us-cav.report.md`. Depends on: `period-manuals`.

Looks for:
* fences and rails used for cover or fuel (McPherson fences S-003, East Cavalry Field fences S-055, Rummel barn loopholes S-054)
* barricades and works made by cavalry on the pursuit (Fairfield, Monterey, Williamsport, Falling Waters)
* horse care: feeding, watering, grooming, horse-holders (every fourth man), vedettes and pickets
* routine: bivouacs of the approach, rations and forage, the nights, the retreat

Works owned (register `inventory/works.json`): G-01, S-003. Schedule rows for context (state_schedule.json, not in the register): S-005, S-055.
Units (history/units.json): `us-cav`, `us-cav-1d`, `us-cav-2d`, `us-cav-3d`, `us-cav-art`.
Clips likely used: `horse_holder`, `stand_picket`, `dig_shovel`, `sleep_side`, `cook_stir`.

### `us-army`: Army of the Potomac, army level: headquarters, Artillery Reserve, ordnance, quartermaster, signal, provost, trains, unplaced Union reports

Days: 26 Jun - 14 Jul. Phases: all. Output: `docs/battle-theatre/life/evidence/us-army.jsonl`; report: `docs/battle-theatre/life/evidence/us-army.report.md`. Depends on: `period-manuals`.

Looks for:
* Meade's and Hunt's reports: works ordered or inspected, gun positions, Powers Hill, the order to intrench on 2-3 July
* rations and supply: Ingalls (quartermaster), the beef herd, the wagon trains and where they parked, issue of rations, the 3-day and 8-day rations carried
* ordnance: ammunition issued and replenished (Edie, Gillett, Rosengarten), the ammunition trains
* signal stations and the cupolas used (Pennsylvania Hall, Little Round Top): construction of stations if stated
* provost duty: guards, stragglers, the provost marshal (Patrick), burial orders
* every Union report the assignment rules could not place (report_assignments.json needs_hand_check): decide its corps before extracting and note it in the group report

Works owned (register `inventory/works.json`): G-07, G-10, G-11, G-13. Schedule rows for context (state_schedule.json, not in the register): S-002, S-029, S-046, S-059, S-060.
Units (history/units.json): `us-aop`, `us-aop-hq`, `us-art-reserve`, `us-art-reserve-ransom`, `us-art-reserve-mcgilvery`, `us-art-reserve-taft`, `us-art-reserve-huntington`, `us-art-reserve-fitzhugh`, `us-4nj-train-guard`.
Clips likely used: `stand_picket`, `march_carry_rail`, `stand_rest`, `bugler_call`, `drummer_beat`.

### `cs-1c`: Longstreet's First Corps (McLaws, Pickett, Hood) and its reserve artillery

Days: 26 Jun - 14 Jul. Phases: Chambersburg, 1-2 Jul march, 2-3 Jul Warfield Ridge and Round Top, retreat. Output: `docs/battle-theatre/life/evidence/cs-1c.jsonl`; report: `docs/battle-theatre/life/evidence/cs-1c.report.md`. Depends on: `period-manuals`, `narratives-cs`.

Looks for:
* Confederate works on Warfield Ridge, at Devil's Den and on Round Top (the plan lists Confederate works as an open gap): stone or rail cover built by Law's, Robertson's, Benning's, Anderson's men
* artillery positions of Alexander's, Cabell's, Henry's battalions on 2-3 July (G-08, G-09: no works described): any pits, platforms, brush or ammunition parks
* Pickett's division on 2-3 July: halts, rest, meals before the charge, the order to cook or not
* routine: the march from Chambersburg, rations, rain, camps near Marsh Creek, the night of 2-3 July, the retreat and the Potomac crossing

Works owned (register `inventory/works.json`): G-08, G-09, G-14, W-CONFED-WARFIELD-WORKS.
Units (history/units.json): `cs-1c`, `cs-1c-mclaws`, `cs-1c-pickett`, `cs-1c-hood`, `cs-1c-res-art`, `cs-1c-art`.
Clips likely used: `dig_shovel`, `lay_stone`, `sleep_side`, `cook_stir`, `eat_hardtack`, `stand_picket`.

### `cs-2c`: Ewell's Second Corps (Early, Johnson, Rodes) and its reserve artillery

Days: 26 Jun - 14 Jul. Phases: York, Carlisle, Wrightsville, 1 Jul Oak Hill, 2-3 Jul Culp's Hill and the town, retreat. Output: `docs/battle-theatre/life/evidence/cs-2c.jsonl`; report: `docs/battle-theatre/life/evidence/cs-2c.report.md`. Depends on: `period-manuals`, `town-burial`, `bridges-roads`.

Looks for:
* Steuart's occupation and any work on the lower Culp's Hill works (E-10: occupation, not construction: look for improvement by Confederate hands)
* breastworks and rifle pits of Johnson's and Early's men on 2-3 July; the Stonewall brigade, Daniel, Walker
* the Rock Creek railroad bridge (S-001) and the Wrightsville bridge: who burned or destroyed, when
* Oak Hill and Benner's Hill battery positions (G-04, G-15)
* routine: requisitions and cooking at York and Carlisle, rations in the town, camps, the nights, the retreat

Works owned (register `inventory/works.json`): E-10, G-04, G-15, S-001, W-CONFED-OAK-HILL-BENNER, W-GBG-STATION-RAILS-TORN. Schedule rows for context (state_schedule.json, not in the register): S-021.
Units (history/units.json): `cs-2c`, `cs-2c-early`, `cs-2c-johnson`, `cs-2c-rodes`, `cs-2c-res-art`.
Clips likely used: `dig_shovel`, `chop_axe`, `lay_stone`, `sleep_side`, `cook_stir`, `eat_hardtack`.

### `cs-3c`: Hill's Third Corps (Anderson, Heth, Pender) and its reserve artillery

Days: 26 Jun - 14 Jul. Phases: Cashtown, 1 Jul Herr and McPherson Ridge, 2-3 Jul Seminary Ridge, retreat. Output: `docs/battle-theatre/life/evidence/cs-3c.jsonl`; report: `docs/battle-theatre/life/evidence/cs-3c.report.md`. Depends on: `period-manuals`.

Looks for:
* works on Seminary Ridge on 1-3 July (the plan: Confederate works unknown): rails, rifle pits, battery pits of Pender's, Heth's and Anderson's commands
* the shoe foray of 30 June (Pettigrew at Gettysburg) and the camp at Cashtown
* artillery of McIntosh's, Pegram's, Poague's, Garnett's battalions: positions made, pits dug (G-16)
* routine: marches, cooking, rest in the line of 2-3 July, ambulances and burial, the retreat

Works owned (register `inventory/works.json`): E-18, G-16, W-CONFED-SEMINARY-WORKS.
Units (history/units.json): `cs-3c`, `cs-3c-anderson`, `cs-3c-heth`, `cs-3c-pender`, `cs-3c-res-art`.
Clips likely used: `dig_shovel`, `march_carry_rail`, `sleep_side`, `cook_stir`, `stand_picket`.

### `cs-cav-army`: Army of Northern Virginia: cavalry (Stuart, Jenkins, Imboden), army level, artillery reserve, ordnance, unplaced Confederate reports

Days: 26 Jun - 14 Jul. Phases: all. Output: `docs/battle-theatre/life/evidence/cs-cav-army.jsonl`; report: `docs/battle-theatre/life/evidence/cs-cav-army.report.md`. Depends on: `period-manuals`, `bridges-roads`.

Looks for:
* Lee's and Pendleton's reports: artillery reserve, ammunition replenished, works ordered at Williamsport
* Stuart's cavalry: rest, forage, horse care, the Rummel barn loopholes (S-054), East Cavalry Field
* Imboden's command and the train at Williamsport: works, guards, burial, rations of the retreat
* the pontoon bridge at Falling Waters and the Potomac crossing 13-14 July (cross-list with bridges-roads)
* every Confederate report the assignment rules could not place (needs_hand_check): decide its corps first

Works owned (register `inventory/works.json`): S-054. Schedule rows for context (state_schedule.json, not in the register): S-067.
Units (history/units.json): `cs-anv`, `cs-anv-hq`, `cs-cav-div`, `cs-cav-hampton`, `cs-cav-flee`, `cs-cav-jenkins`, `cs-cav-chambliss`, `cs-cav-flee-chambliss`, `cs-cav-robertson-jones-imboden`, `cs-cav-horse-art`.
Clips likely used: `horse_holder`, `stand_picket`, `dig_shovel`, `sleep_side`, `cook_stir`.

### `town-burial`: The borough of Gettysburg, civilians, newspapers, hospitals as camps, burial and the cemetery

Days: 26 Jun - 14 Jul and the Nov epilogue. Phases: all. Output: `docs/battle-theatre/life/evidence/town-burial.jsonl`; report: `docs/battle-theatre/life/evidence/town-burial.report.md`. Depends on: `period-manuals`.

Looks for:
* barricades in the streets, loopholes cut in buildings, sniper posts (Sweney house, the church belfry S-022), fences and doors used as cover: civilians' and newspapers' words
* soldiers cooking, foraging, requisitioning and sleeping in the town and farms (Jacobs, Tillie Pierce, the Compiler and the Sentinel of June to August 1863)
* water drawn at wells and springs; washing; bread baked for soldiers by townswomen
* burial of the dead by soldiers and civilians (4 July onward): Massachusetts burial committee, cemetery reports, Bartlett, the NPS cemetery reports; numbers and methods
* Bliss barn (S-052): men who set the fires, tools

Works owned (register `inventory/works.json`): S-052, W-BURIAL-TRENCHES, W-CAMP-LETTERMAN, W-TOWN-BARRICADES. Schedule rows for context (state_schedule.json, not in the register): S-022, S-051, S-053.
Clips likely used: `dig_shovel`, `cook_stir`, `eat_hardtack`, `drink_cup`, `orderly_water`.

### `bridges-roads`: Engineers, pioneers, bridges, roads and railroads of the campaign

Days: 26 Jun - 14 Jul. Phases: all. Output: `docs/battle-theatre/life/evidence/bridges-roads.jsonl`; report: `docs/battle-theatre/life/evidence/bridges-roads.report.md`. Depends on: `period-manuals`.

Looks for:
* the reports of the Engineer Brigade, the pioneer corps and the military railroads (the three records this group owns), and Duane (1862) for how engineer troops laid a bridge
* every bridge laid, burned, repaired or destroyed 26 June - 14 July (Rock Creek, Wrightsville-Columbia, Potomac pontoons at Falling Waters and Williamsport, the Conococheague, Monocacy and railroad bridges): collate the rows of the other groups into one chronology, carry conflicts of date
* roads cut or corduroyed, fords improved; the road cut by gunners (PDF B.7.8)
* tools and labour of engineer troops (working parties, tool wagons)

Works owned (register `inventory/works.json`): W-FALLING-WATERS-PONTOON, W-LEE-RETREAT-BRIDGES, W-POTOMAC-PONTOONS-JUN, W-ROADS-CUT, W-WRIGHTSVILLE-BRIDGE. Schedule rows for context (state_schedule.json, not in the register): S-076.
Clips likely used: `march_carry_rail`, `chop_axe`, `dig_shovel`, `lay_stone`.

### `corr-jun26-30`: Official Records part 3, correspondence and orders dated 22-30 June

Days: 22-30 Jun. Phases: approach. Output: `docs/battle-theatre/life/evidence/corr-jun26-30.jsonl`; report: `docs/battle-theatre/life/evidence/corr-jun26-30.report.md`. Depends on: `period-manuals`.

Looks for:
* orders of march, camps ordered, rations and ammunition issued, shoes, wagons reduced, pickets and outposts posted
* works ordered or reported (Harrisburg, Carlisle, Wrightsville, Maryland Heights, Frederick, Baltimore): outside the Gettysburg map but kept as evidence
* the Confederate side: requisitions, orders on conduct and foraging, camps, Ewell's and Early's movements
* the days before 26 June are context only: nothing earlier than the theatre clock becomes a row
Clips likely used: `march_carry_rail`, `dig_shovel`, `stand_picket`, `cook_stir`.

### `corr-jul1-3`: Official Records part 3, correspondence and orders dated 1-3 July

Days: 1-3 Jul. Phases: battle. Output: `docs/battle-theatre/life/evidence/corr-jul1-3.jsonl`; report: `docs/battle-theatre/life/evidence/corr-jul1-3.report.md`. Depends on: `period-manuals`.

Looks for:
* dispatches that order or report works (Warren, Hunt, Hancock, Slocum, Howard, Sedgwick, Pleasonton), tools and working parties
* orders on rations, ammunition, pickets, guards and the trains during the fight
* times stated in dispatches: these anchor the windows of other groups' rows (window basis other_row)
Clips likely used: `dig_shovel`, `stand_picket`, `march_carry_rail`.

### `corr-jul4-14`: Official Records part 3, correspondence and orders dated 4-14 July: the retreat and the pursuit

Days: 4-14 Jul. Phases: retreat and pursuit. Output: `docs/battle-theatre/life/evidence/corr-jul4-14.jsonl`; report: `docs/battle-theatre/life/evidence/corr-jul4-14.report.md`. Depends on: `period-manuals`, `bridges-roads`.

Looks for:
* works at Williamsport, Hagerstown, Funkstown and Falling Waters by Lee's army and the Union lines of 12-14 July
* camps, rations, rain and mud, trains, burial parties, the wounded left behind, ambulance trains (cross-list with the hospitals evidence)
* the pontoon bridges at Falling Waters and Williamsport: laid, destroyed, rebuilt (cross-list with bridges-roads)

Works owned (register `inventory/works.json`): W-FALLING-WATERS-WORKS-JUL14, W-WILLIAMSPORT-WORKS. Schedule rows for context (state_schedule.json, not in the register): S-069.
Clips likely used: `dig_shovel`, `sleep_side`, `cook_stir`, `march_carry_rail`.

### `period-manuals`: Period manuals and regulations: the basis of plausible-procedural scenes

Days: n/a (generic practice). Phases: all. Output: `docs/battle-theatre/life/evidence/period-manuals.jsonl`; report: `docs/battle-theatre/life/evidence/period-manuals.report.md`. Depends on: nothing.

Looks for:
* US Regulations 1861 and CS Regulations 1863: rations (the ration table), the daily routine and calls, police of camps, guard and picket duty
* Butterfield, Camp and Outpost Duty for Infantry (1863): camp layout, pickets, cooking and meals, the standing orders
* Mahan, Treatise on Field Fortification (1862): profiles, order of work, tools and the labour a work needs, epaulements, gun pits, abatis, rifle pits
* Billings, Hard Tack and Coffee (1887): what the soldiers ate, cooked and did in camp: general practice only
* for every subkind that no documented row covers: one generic row per manual statement (plausible-procedural, generic true), so that no scene is drawn without a stated basis
* optional second fetch: Casey and Hardee (the drill group has their archive identifiers) if "stack arms" and the halts are wanted
Clips likely used: `dig_shovel`, `chop_axe`, `lay_stone`, `sit_fire`, `cook_stir`, `eat_hardtack`, `sleep_side`, `stand_picket`.

### `narratives-us`: Union narratives, early guides and the state volumes without a section index

Days: 26 Jun - 14 Jul. Phases: all. Output: `docs/battle-theatre/life/evidence/narratives-us.jsonl`; report: `docs/battle-theatre/life/evidence/narratives-us.report.md`. Depends on: `period-manuals`.

Looks for:
* Haskell, Meade's Life and Letters, Frank Pierce, Battles and Leaders vol. 3 (Union articles), Bachelder's guides, Long (1891): statements of works, meals, camps, pickets by unit and time
* New Jersey, Vermont, Minnesota, Indiana and Ohio volumes: regimental accounts of camps, rations, works and burials (assign each passage to its regiment and corps in the row)
* the state volumes that carry a section index (New York, Pennsylvania, Maine, Michigan) are owned by the corps groups, not by this group
Clips likely used: `dig_shovel`, `cook_stir`, `eat_hardtack`, `sleep_side`, `stand_picket`.

### `narratives-cs`: Confederate narratives: Alexander, Longstreet, Fremantle, Southern Historical Society Papers

Days: 26 Jun - 14 Jul. Phases: all. Output: `docs/battle-theatre/life/evidence/narratives-cs.jsonl`; report: `docs/battle-theatre/life/evidence/narratives-cs.report.md`. Depends on: `period-manuals`.

Looks for:
* Alexander's Military Memoirs and Longstreet's memoirs: artillery positions made, works, rest and rations of the corps
* Fremantle's diary of the campaign: what an observer saw soldiers do in camp and on the march
* Southern Historical Society Papers vols. 4, 5, 6, 11, 12: veterans' accounts of cooking, camps, picket duty, works, burial, the retreat
Clips likely used: `dig_shovel`, `cook_stir`, `sleep_side`, `stand_picket`, `eat_hardtack`.

### `campaign-elsewhere`: The campaign outside the Gettysburg map: Susquehanna, Maryland Heights, Harper's Ferry, Baltimore, Winchester and the other-operations reports of OR part 2

Days: 26 Jun - 14 Jul. Phases: all. Output: `docs/battle-theatre/life/evidence/campaign-elsewhere.jsonl`; report: `docs/battle-theatre/life/evidence/campaign-elsewhere.report.md`. Depends on: `period-manuals`.

Looks for:
* the defenses of Harrisburg and the Susquehanna crossings built by militia and regulars (June 26 - 4 July)
* Maryland Heights, Harper's Ferry, Frederick and Baltimore works and camps; the Winchester returns of June (context)
* rows are marked place.map_scope outside_map: kept, not drawn on the Gettysburg map (never narrowed)

Works owned (register `inventory/works.json`): W-HARRISBURG-DEFENSES, W-WRIGHTSVILLE-WORKS.
Clips likely used: `dig_shovel`, `chop_axe`, `stand_picket`, `cook_stir`.

## 4. The evidence contract

File: `docs/battle-theatre/life/evidence/<group>.jsonl`, one JSON object per line, ordered by id; definition in `contract.json` (read by the validator). Fields:

| field | meaning |
|---|---|
| `id` | string ^<group>-[LR]\d{3,5}$ (L labour, R routine); unique across all files |
| `group` | string, the group id, equal to the file name |
| `kind` | labour / routine |
| `subkind` | one of subkinds[kind] |
| `unit_id` | id of docs/battle-theatre/history/units.json, or null (then work_id or generic) |
| `unit_text` | the unit as the source names it (verbatim fragment) or null |
| `work_id` | E-nn of structures/works_stages.json or W-... of life/inventory/works.json, or null (labour: required unless unit_id given) |
| `builder_unknown` | true only for a work whose builder the sources do not name (PDF B.7.1: built by a labelled stand-in crew) |
| `window` | {start_min, end_min, basis, part_of_day, note, derived_from}: minutes on the page clock (since 1863-06-01 00:00 local mean time); start <= end; inside the theatre clock; basis from window_bases; part_of_day carries a stated period word (evening, just before sunset) when the passage has no hour: no hour is invented for it (DD-LIFE-02) |
| `place` | {text, ref, map_scope, preexisting_ref}: the place as the source words it; ref a gazetteer or structures id or null; map_scope from map_scopes; preexisting_ref a P-nn of PDF B.7.3 when the work touches a pre-existing wall or fence |
| `activity` | a clip id of app/data/anim3d/clips.json, or null |
| `pose_needed` | a pose id of life/evidence/poses.json (a pose no clip shows), or null; at least one of activity and pose_needed unless tier is open gap |
| `activity_basis` | stated / inferred / procedural: whether the passage names the act the clip shows (stated), it follows from the passage (inferred), or the clip is a stand-in chosen by the scene (procedural); required when activity or pose_needed is given |
| `tools_props` | [{item, role, count [lo,hi] or null, basis}] roles from tool_roles, basis from item_bases |
| `men` | {lo, hi, basis}: a range with its basis (men_bases); integers; lo/hi null only with basis unknown |
| `tier` | one of tiers |
| `tier_basis` | string: required for inferred, plausible-procedural and open gap |
| `generic` | bool: true for a manual-based or general-practice row |
| `source_id` | id of life/evidence/sources.json (a local text) or null for open gap |
| `part` | Official Records part 1/2/3 or null |
| `report_id` | Official Records record id (OR27-1-R062) or a state-volume section id (NY3-S006) or null |
| `printed_page` | the printed page as a string, or null; Official Records pages are checked against the scan-leaf map (page_basis scan_leaf, the project convention of DD-TL02-04) or the running-head page model (running_head, interpolated) |
| `page_basis` | one of page_bases |
| `pdf_page` | for park reports: the "=== PAGE n ===" marker before the passage (int) |
| `quote` | verbatim passage, 20 to 600 characters, whitespace and hyphenation tolerant, OCR errors kept as printed |
| `offset_start` | character offset of the quote in the raw local text (UTF-8, newline untouched) |
| `offset_end` | end offset (exclusive) |
| `context_quote` | optional second verbatim passage of the same text (a heading, a date, a number the claim needs); same checks, offsets in context_offset_start / context_offset_end |
| `ocr_repairs` | [{ocr, reads, basis}] only where the quote differs from the text by an OCR confusion; basis second_witness / page_image / context |
| `text_sha256` | optional: sha256 of the local text the offsets refer to (checked against sources.json) |
| `conflicts` | [{id, kind, other_rows, note, scenario_key}]: a conflict of sources is carried, never resolved here (Law cl.6); scenario_key names the selectable scenario |
| `searched` | [{source_id, pattern, result}] for open gap rows |
| `register_ref` | EG-LIFE-nnnn for open gap rows (and for any row whose gap is registered) |
| `work_stage` | optional {from, to}: stages 0-6 of structures/works_stages.json stage_model that the row documents |
| `notes` | free text or null |

Subkinds: labour `breastwork_infantry`, `rail_barricade`, `log_works`, `stone_works`, `earth_parapet`, `rifle_pits`, `gun_pit_or_epaulement`, `battery_platform`, `abatis_or_slashing`, `barricade_street`, `loopholing`, `fence_taken_down`, `wall_improved`, `road_cut_or_improved`, `bridge_laid`, `bridge_repaired`, `bridge_destroyed`, `ford_improved`, `tools_issue_or_carry`, `works_layout`, `fire_fighting`, `other_labour`; routine `ration_issue`, `cooking`, `meal`, `rest_halt`, `sleep_bivouac`, `camp_made`, `picket_duty`, `guard_duty`, `water_carrying`, `washing_bathing`, `burial_party`, `forage_requisition`, `ammunition_issue`, `horse_care`, `religious_service`, `music_calls`, `roll_call`, `foot_care_shoes`, `idle_camp_life`, `other_routine`.

Tiers: **documented**: a non-lead source of a class that allows it states exactly this (unit or work, activity, place, time as the window says); quote matched in the named local text; generic false; **inferred**: reasoned from documented facts, reasoning shown in tier_basis (at least 20 characters naming the step); the quote is the fact reasoned from; never a manual; **plausible-procedural**: generic: true; the practice of the period from a manual or a general statement; the scene says so; never evidence that the unit did it; **open gap**: quote null and source_id null; searched lists what was looked for and found nothing (a failed lookup is recorded as failed); register_ref names the registered gap EG-LIFE-nnnn; shown as a visible gap.

Source classes and the tiers they may carry: `official_report` (documented/inferred); `official_correspondence` (documented/inferred); `official_other` (documented/inferred); `regimental_volume` (documented/inferred); `memoir_narrative` (documented/inferred); `civilian_account` (documented/inferred); `newspaper_1863` (documented/inferred); `secondary_early` (documented/inferred); `medical_account` (documented/inferred); `burial_record` (documented/inferred); `reference_table` (documented/inferred); `park_report` (documented/inferred); `period_manual` (plausible-procedural).

Windows are page-clock minutes (since 1863-06-01 00:00 local mean time; the theatre runs 26 Jun - 14 Jul and 18-19 Nov). Bases: `stated_clock` the passage states a clock time or an hour (6 a. m., about noon, at 4 o'clock); `stated_period` the passage states a part of the day or a relation to the light (morning, at daybreak, before dark, that night); `stated_date` the passage states the date only: the window is that day (00:00 to 23:59); `report_span` the window is the span the report or section covers, no finer statement; `other_row` derived from another documented row (derived_from lists its ids); `sun_event` bounded by sunrise or sunset computed from the project ephemeris (derived_from names the call); `procedural` plausible-procedural placement inside a documented span (generic rows only). A period word without an hour (morning, evening, "just before sunset") is carried as `part_of_day` with the day's bounds, the convention of `state_schedule.json` (date granularity); no hour is invented for it.

Men are a range with a basis (`stated_number`, `detail_stated`, `unit_strength`, `stated_fraction`, `procedural`, `unknown`); a number stated as a count must stand in the quote (checked, digits and number words). Tools and props carry their own basis (`stated`, `inferred`, `regulation`, `procedural`). `activity_basis` says whether the passage names the act the clip shows (`stated`), it follows (`inferred`) or the clip is a stand-in (`procedural`).

Page-clock, offsets and pages: `offset_start`/`offset_end` are character offsets in the raw local text (UTF-8, newline untouched, the convention of `or27_find.py` and the fence files); for the Official Records the validator also checks the record (`report_id`), the part and the printed page against the running-head page model; for park reports the `=== PAGE n ===` marker (`pdf_page`).

## 5. The validator

`python3 -I tools/bt/life/validate_evidence.py <group>` | `--all` | `--self-test` (exit 1 on any failure; `--strict` refuses a quote that needed the OCR fold; `--json`). Checks, per row: keys and enumerations; unit id in `units.json`; work id; clip id in `clips.json`; pose id in `poses.json`; window inside the theatre clock; tier against source class; the quote found in the named local text (whitespace, hyphenation and typography tolerant; an OCR-confusion fold or a small edit distance only with declared `ocr_repairs`) at the stated offsets, inside the stated record, on the stated printed page, with every stated number present; the clock words behind a `stated_clock` window; open gaps carrying no quote and a list of failed lookups; pre-existing features never built; with `--all`: unique ids, duplicate passages, cross-references. The self-test (55 checks) builds a synthetic text and a synthetic manual, checks the matcher (exact, hyphenation, typography, OCR fold, edit distance, a fabricated sentence), then mutates a valid row 26 ways and requires the validator to refuse each with the right code, and runs checks on real text: a passage of the Official Records (record, part, page by running head and by scan leaf) and a state-volume section (section, page anchor).

## 6. Works (labour) register

`inventory/works.json`: 74 candidate works (closeout_supported 44, evidence_row 7, pdf_only 3, search_target 20). It lists every work the plan's tables print (E-01..E-18, G-01..G-18, the labour rows of the state schedule) with builder, window as printed, flags, the fence close-out digest and the rows of this pass; and 25 candidates of this pass (search targets named by PDF B.7.8 and the bridges, roads and works outside the Gettysburg map the Official Records name). Nothing is marked documented in the register.

Eleven seed rows already stand in six group files (`us-1c`, `us-2c`, `us-5c`, `us-12c`, `us-army`, `cs-2c`): passages found while planning, each located by the validator's own matcher, each owed a second reading by its group. They show the contract on real text: a documented row, two inferred rows (a supposition and a hearsay), a conflict carried as a scenario (`C-E05-START`), a work outside the map, a bridge burned, a fire fought, a coffee cooked at 02:30, supper preparing at sunset.

## 7. Routine: how it is listed

Routine statements are not a table the plan can print in full: there are n/a keyword hits in the owned texts. `leads/<group>.leads.jsonl` lists every hit (up to n/a per record and class; the rest counted in `leads/SUMMARY.json`) with source, record, page, offsets, a date hint and a verbatim context; `inventory/leads_by_record.json` orders the records of each group by number of leads. A lead is a lead: the group reads it, decides what it says, and writes the row (or records that it says nothing about work or routine). Classes: `meal` (breakfast, coffee, rations, cooking, hardtack, supper), `rest` (bivouac, camp, slept, rested, stacked arms, blankets), `picket` (picket, outpost, vedette, sentry, patrol), `water_wash_burial` (canteens, wells, springs, washing, burial, graves), `works`, `tools`, `bridge_road`. The approach days (26-30 June), the nights, and the retreat (4-14 July) are covered by the correspondence groups and by every corps group's own reports.

## 8. Clips and the poses that are missing

The activity clips (`poses.json activity_clips`) and what each covers and lacks:

| clip | tier / gap | covers | limit |
|---|---|---|---|
| `dig_shovel` | plausible-procedural / G-ANIM-09 | burial_party, earth_parapet, gun_pit_or_epaulement, rifle_pits | spade only; one digging motion for earth work, burial and gun pits (no pick, no throwing up, no tamping) |
| `chop_axe` | plausible-procedural / G-ANIM-09 | abatis_or_slashing, log_works | axe only, one chopping motion (no saw, no trimming limbs, no splitting) |
| `march_carry_rail` | plausible-procedural / - | log_works, rail_barricade | a single man with a rail on the shoulder; walks at 0.85 m/s (no two-man carry, no throwing down) |
| `lay_stone` | plausible-procedural / G-ANIM-09 | earth_parapet, stone_works | lift and set one stone; no carrying, no prying; also the nearest clip for stacking rails and logs |
| `sit_fire` | plausible-procedural / G-ANIM-09 | cooking, meal, rest_halt, sleep_bivouac | seated at a fire, hands to the warmth, head turning (no tending, no eating, no writing) |
| `cook_stir` | plausible-procedural / G-ANIM-09 | cooking | standing or crouched stirring one pot with a ladle (no frying, no coffee, no kettle carry) |
| `drink_cup` | plausible-procedural / G-ANIM-09 | meal, water_carrying | cup or canteen to the mouth, one shot, not looped (no filling a vessel) |
| `eat_hardtack` | plausible-procedural / G-ANIM-09 | meal | hand to mouth and chewing (posture not stated by the clip name: check before use for a seated meal) |
| `sleep_side` | plausible-procedural / G-ANIM-09 | sleep_bivouac | sleeping on the side, breathing (no supine, no sitting asleep, no pairs) |
| `stand_picket` | plausible-procedural / G-ANIM-09 | picket_duty | standing alert, head scanning, rifle at order arms (no pacing, no challenge, no kneeling) |
| `stand_rest` | documented / - | rest_halt | rest or at ease; documented in the drill manual (the standing rest, not a seated rest) |
| `orderly_water` | plausible-procedural / G-ANIM-09 | water_carrying | orderly carrying a bucket (hospital role); usable as a stand-in for a water carry until a canteen carry exists |
| `drummer_beat` | plausible-procedural / G-ANIM-09 | - | drummer beating |
| `bugler_call` | plausible-procedural / G-ANIM-09 | - | bugle call |
| `horse_holder` | plausible-procedural / G-ANIM-08 | - | Horse-holder (dismounted, holds the reins of the horses) |
| `officer_point` | plausible-procedural / G-ANIM-09 | - | Officer points (left arm extended, the sword stays in the right hand) |
| `officer_speak` | plausible-procedural / G-ANIM-09 | - | Officer speaks to the men (head turns, left hand gestures) |
| `color_stand` | plausible-procedural / G-ANIM-09 | - | Colour-bearer standing with the colours (breeze: small sway) |

79 poses are missing (24 labour, 55 routine; P1 35, P2 44). Each has an id (`POSE-L..`, `POSE-R..`), the activity it serves, the nearest existing clip as a stand-in, the prop bone and a one-line description of the motion; a row names it in `pose_needed`; a pose is authored only when a row names it (`build_poses.py --demand` counts the rows). All are plausible-procedural animation (gap G-ANIM-09 and the clip tier rules): a pose claims nothing about 1863. Poses that need a horse or a wagon say so (request note to the figures workstream, not built here).

| id | pose | serves | nearest clip | prop |
|---|---|---|---|---|
| `POSE-L01` | pick_swing: both hands on the pick helve, overhead swing and strike, stooped recovery; loop | earth_parapet, rifle_pits, gun_pit_or_epaulement, road_cut_or_improved | `dig_shovel` | prop_pole: pick |
| `POSE-L02` | shovel_throw_up: standing in the ditch, load the shovel and throw the earth up and forward onto the parapet | earth_parapet, gun_pit_or_epaulement, rifle_pits | `dig_shovel` | prop_pole: shovel |
| `POSE-L03` | earth_tamp: stand on the parapet and tamp or beat the earth with the flat of the spade or a rammer; lo | earth_parapet, gun_pit_or_epaulement | `dig_shovel` | prop_pole: spade or rammer |
| `POSE-L04` | sod_cut_lay: cut a sod with the spade, lift it, lay it grass down on the face of the work; loop | gun_pit_or_epaulement, earth_parapet | `dig_shovel` | prop_pole: spade |
| `POSE-L05` | log_carry_two: two men carry a log or stringer on the shoulders or between them on handspikes, in step; l | log_works, barricade_street, bridge_repaired | `march_carry_rail` | prop_long: log (two men) |
| `POSE-L06` | log_roll_handspike: heave a log along the ground with a handspike, step and re-seat the bar; loop | log_works, gun_pit_or_epaulement | `lay_stone` | prop_long: handspike |
| `POSE-L07` | head_log_set: lift a log from the ground to chest height and set it on top of the work; one shot and loo | log_works, breastwork_infantry | `lay_stone` | prop_long: log |
| `POSE-L08` | rail_pull_fence: lift a rail out of a zigzag fence, throw it down, take the next; loop | fence_taken_down, rail_barricade | `march_carry_rail` | prop_long: rail |
| `POSE-L09` | rail_stack: lay rails crosswise in a pile, stooped placing, step back; loop | rail_barricade, breastwork_infantry | `lay_stone` | prop_long: rail |
| `POSE-L10` | stone_carry: carry a stone in both hands at the waist or chest over rough ground; loop | stone_works, wall_improved | `lay_stone` | prop_pole: stone |
| `POSE-L11` | stone_roll_pry: pry or roll a boulder with a bar or handspike, lean and release; loop | stone_works | `lay_stone` | prop_long: bar |
| `POSE-L12` | saw_crosscut_pair: two men draw a crosscut saw alternately through a trunk, kneeling or stooped; loop | log_works, abatis_or_slashing | `chop_axe` | prop_long: crosscut saw (two men) |
| `POSE-L13` | trunk_trim_limbs: stooped over a felled trunk, trim the limbs with short axe strokes, step along; loop | abatis_or_slashing, log_works | `chop_axe` | prop_pole: axe |
| `POSE-L14` | abatis_drag_place: drag a tree top or branch by the butt, set it with the points outward; loop | abatis_or_slashing | `march_carry_rail` | prop_long: tree top |
| `POSE-L15` | stake_drive_maul: hold a stake upright, strike it with the maul; loop | works_layout, gun_pit_or_epaulement | `chop_axe` | prop_pole: maul and stake |
| `POSE-L16` | line_pace_officer: an officer walks the line with measured steps and points out the trace to the men told off | works_layout | `officer_point` | prop_sword: sword at the side |
| `POSE-L17` | plank_pry_loophole: pry a board off a wall or cut through it at head height; loop | loopholing | `chop_axe` | prop_pole: bar or axe |
| `POSE-L18` | carry_bulky_pair: two men carry a bulky object (barrel, box, wagon box) between them; loop | barricade_street | `carry_litter_front` | prop_long: bulky object (two men) |
| `POSE-L19` | pontoon_chess_lay: stoop on a bridge or platform and lay a plank across the stringers, step forward; loop | bridge_laid, bridge_repaired, battery_platform | `lay_stone` | prop_long: plank |
| `POSE-L20` | pontoon_pole_boat: stand in a boat and set a pole or pull an oar; loop | bridge_laid, ford_improved | `march_carry_rail` | prop_long: pole or oar |
| `POSE-L21` | torch_set_fire: stoop, set a bundle of straw alight and push it under a structure, step back; one shot | bridge_destroyed | `stand_picket` | prop_pole: torch or straw bundle |
| `POSE-L24` | fire_beat_bucket_line: pass buckets hand to hand along a line, or beat flames with a wet blanket or a branch; loo | fire_fighting | `orderly_water` | prop_instr: bucket; prop_pole: wet blanket or branch |
| `POSE-L22` | tool_bundle_carry: carry a bundle of tools on the shoulder; loop | tools_issue_or_carry | `march_carry_rail` | prop_long: bundle of spades and axes |
| `POSE-L23` | tool_wagon_hand_out: at a wagon, take tools from the bed and hand them down the line; loop | tools_issue_or_carry | `stand_rest` | prop_pole: spade handed over |
| `POSE-R01` | sit_ground_eat: seated on the ground, knees up, hand to mouth, cup beside; loop | meal, ration_issue | `eat_hardtack` | prop_instr: cup; food in hand |
| `POSE-R02` | boil_coffee_kneel: kneel at a small fire and hold a tin cup over the flame, watch it, lift it; loop | cooking, meal | `cook_stir` | prop_instr: tin cup on a stick |
| `POSE-R03` | fry_pan_hold: crouch at a fire holding a pan over the coals, turn the food; loop | cooking | `cook_stir` | prop_pole: frying pan or stick |
| `POSE-R04` | kettle_carry_pole: carry a camp kettle by the bail, or two kettles on a pole between two men; loop | cooking, water_carrying | `orderly_water` | prop_long: pole with kettles |
| `POSE-R05` | canteen_bundle_carry: walk with a bundle of canteens hanging from both hands and shoulders; loop | water_carrying | `orderly_water` | prop_instr: canteens by their slings |
| `POSE-R06` | spring_draw_kneel: kneel or stoop at a spring or stream, fill the vessel, rise; loop | water_carrying, washing_bathing | `drink_cup` | prop_instr: canteen or bucket |
| `POSE-R07` | well_pump_work: work a pump handle or draw a bucket at a well; loop | water_carrying | `orderly_water` | prop_pole: pump handle or well bucket |
| `POSE-R08` | ration_sack_carry: carry a sack or box of bread on the shoulder or back; loop | ration_issue | `march_carry_rail` | prop_long: sack or box |
| `POSE-R09` | ration_hand_out: stand at a box or barrel and hand out issue to men in line; loop | ration_issue | `stand_rest` | prop_pole: box lid |
| `POSE-R10` | beef_cut_cleaver: cut meat on a block or a log with a cleaver; loop | ration_issue, forage_requisition | `chop_axe` | prop_pole: cleaver or axe |
| `POSE-R11` | cattle_drive_walk: walk beside driven cattle with a switch; loop | forage_requisition, ration_issue | `march_quick_time_atwill` | prop_pole: switch |
| `POSE-R12` | sleep_back: lie on the back under a blanket, hat over the face, breathing; loop | sleep_bivouac | `sleep_side` | prop_pole: hat or rifle by the side |
| `POSE-R13` | sleep_pair_blanket: two men lie close under one blanket, back to back; loop | sleep_bivouac | `sleep_side` | prop_pole: shared blanket |
| `POSE-R14` | doze_sit_tree: sit with the back against a tree or a knapsack, head dropped, doze; loop | sleep_bivouac, rest_halt | `stand_rest` | prop_long: musket across the knees |
| `POSE-R15` | lie_prop_elbow: lie propped on one elbow, head turning as if talking; loop | rest_halt, idle_camp_life | `sleep_side` | none |
| `POSE-R16` | sit_ground_idle: sit on the ground, arms on the knees, shift weight and look about; loop | rest_halt, idle_camp_life | `sit_fire` | none |
| `POSE-R17` | fall_out_roadside_rest: sit or lie against a fence or bank at the roadside after a halt; loop | rest_halt, foot_care_shoes | `stand_rest` | prop_long: musket on the ground |
| `POSE-R18` | stack_arms: set three muskets upright, lock the bayonets or swivels together, step back; one shot | camp_made, rest_halt | `arms_order_from_shoulder` | prop_long: musket, stack of three |
| `POSE-R19` | pitch_tent_pair: two men raise a small tent: spread the cloth, set the poles, tie down; one shot | camp_made | `lay_stone` | prop_pole: tent poles and canvas |
| `POSE-R20` | blanket_roll_wrap: unroll a blanket roll or roll it up and sling it; one shot | sleep_bivouac, camp_made | `sleep_side` | prop_pole: blanket roll |
| `POSE-R21` | firewood_armful_carry: carry an armful of wood or rails to the fire; loop | cooking, camp_made | `march_carry_rail` | prop_long: wood or rails |
| `POSE-R22` | fire_tend_poke: squat at a camp fire, push a stick into it and feed wood; loop | cooking, idle_camp_life | `sit_fire` | prop_pole: stick |
| `POSE-R23` | letter_write_sit: sit and write on the knee, pause, write; loop | idle_camp_life | `sit_fire` | prop_pole: pencil and paper on the knee |
| `POSE-R24` | read_sit: sit and hold a paper before the face, turn it; loop | idle_camp_life | `sit_fire` | prop_pole: paper or book |
| `POSE-R25` | pipe_smoke_sit: sit, pipe to the mouth, take it away, exhale; loop | idle_camp_life | `sit_fire` | prop_pole: pipe |
| `POSE-R26` | rifle_clean_sit: sit and wipe the lock and barrel with a rag, look along it; loop | idle_camp_life, ammunition_issue | `sit_fire` | prop_long: musket across the knees |
| `POSE-R27` | cartridge_box_fill: at a crate, take packets, fill the cartridge box, close the flap; loop | ammunition_issue | `stand_rest` | prop_pole: cartridge packets |
| `POSE-R28` | ammo_box_carry_pair: two men carry an ammunition box by its rope handles; loop | ammunition_issue | `carry_litter_front` | prop_long: ammunition box (two men) |
| `POSE-R29` | shoe_off_foot_inspect: sit, pull off a shoe, look at the foot and the sole; loop | foot_care_shoes | `sit_fire` | prop_pole: shoe |
| `POSE-R30` | wash_face_basin: stoop at a basin or stream, wash face and hands, dry; loop | washing_bathing | `drink_cup` | prop_instr: basin or cupped hands |
| `POSE-R31` | bathe_stream_wade: stand in a creek to the knee, scoop and splash water over the body; loop | washing_bathing | `march_route_step_atwill` | none |
| `POSE-R32` | laundry_wring_scrub: scrub cloth on a board or stone, wring it; loop | washing_bathing | `cook_stir` | prop_pole: shirt |
| `POSE-R33` | sentry_walk_beat: pace a beat at common time, turn at each end, look along the line; loop | guard_duty, picket_duty | `march_common_time_shoulder` | prop_long: musket at the shoulder |
| `POSE-R34` | sentry_challenge_port: bring the musket to the port, face the sound, hold; one shot | guard_duty, picket_duty | `stand_picket` | prop_long: musket at the port |
| `POSE-R35` | picket_tree_kneel_watch: kneel behind a tree or rail, head turning to observe, not firing; loop | picket_duty | `cover_tree_stand_L` | prop_long: musket |
| `POSE-R36` | rider_halt_watch: sit a halted horse, head turning to watch, horse shifting its weight; loop | picket_duty, guard_duty | `rider_command` | prop_sword: carbine on the thigh |
| `POSE-R37` | grave_dig_shallow: dig and throw earth in a shallow trench beside a body on the ground; loop | burial_party | `dig_shovel` | prop_pole: shovel |
| `POSE-R38` | body_carry_blanket_two: two men carry a body in a blanket by its corners; loop | burial_party | `carry_litter_front` | prop_long: blanket with a body (two men) |
| `POSE-R39` | body_lower_trench: lower a body into a trench by the blanket, step back; one shot | burial_party | `lie_down` | prop_long: blanket with a body |
| `POSE-R40` | grave_board_set: set a headboard at the head of the grave and tap it in; one shot | burial_party | `dig_shovel` | prop_pole: headboard and mallet |
| `POSE-R41` | hat_off_stand_bare: stand bareheaded, hat at the chest, head bowed; loop | burial_party, religious_service | `stand_rest` | prop_pole: hat held at the chest |
| `POSE-R42` | chaplain_read_stand: stand with a book, read, look up at the men; loop | religious_service | `officer_speak` | prop_pole: book |
| `POSE-R43` | fife_play: stand and play a fife, fingers moving; loop | music_calls | `drummer_beat` | prop_instr: fife |
| `POSE-R44` | band_brass_play: stand and play a brass instrument over the shoulder or in front; loop | music_calls | `bugler_call` | prop_instr: brass instrument |
| `POSE-R45` | roll_call_stand_paper: stand before a rank, read a name from a paper, tick it; loop | roll_call | `officer_speak` | prop_pole: roll |
| `POSE-R46` | orders_read_stand: stand before the assembled men and read an order aloud; loop | roll_call | `officer_speak` | prop_pole: paper |
| `POSE-R47` | horse_feed_nosebag: fit a nosebag over the horse's head, stroke its neck; loop (horse head down on its own rig | horse_care | `horse_holder` | prop_pole: nosebag |
| `POSE-R48` | horse_water_lead: lead horses to a stream and let them drink, head down; loop (horse head down on its own ri | horse_care, water_carrying | `horse_walk` | prop_pole: reins |
| `POSE-R49` | horse_groom_curry: stand at the horse's side and curry its flank with short strokes; loop | horse_care | `horse_holder` | prop_pole: curry comb |
| `POSE-R50` | saddle_girth_tighten: lift the stirrup, reach under, draw the girth tight; one shot | horse_care | `horse_holder` | prop_pole: girth strap |
| `POSE-R51` | team_harness_fit: lift the collar over the horse's head and buckle the traces; one shot | horse_care | `horse_holder` | prop_pole: collar and trace |
| `POSE-R52` | horse_graze: the horse stands with its head down eating from the ground, tail swishing; loop (horse rig | horse_care, rest_halt | `horse_idle` | none |
| `POSE-R53` | ford_wade_carry: wade a stream to the thigh, weapon and box held above the water; loop | water_carrying, rest_halt | `march_route_step_atwill` | prop_long: musket and cartridge box held high |
| `POSE-R54` | wagon_driver_seat: sit on a wagon seat with the reins, the team walking; loop (wagon rig) | ration_issue, forage_requisition | `rider_walk` | prop_pole: whip or reins |
| `POSE-R55` | wagon_unload_barrel: lift a barrel or box from a wagon tail and carry it away; loop | ration_issue | `march_carry_rail` | prop_long: barrel or box |

## 9. What a group does (the procedure)

1. Read `groups.json` for the group, `leads/<group>.leads.jsonl` and `inventory/leads_by_record.json` (the reading order); start with the records that carry the most leads.
2. Read each owned record in full around its leads; do not extract from a lead's snippet alone. For a work of `works.json`, start from its close-out digest and the quotes of the fence file it names (re-find them with `or27_find.py --verify`; never copy an offset blindly).
3. Write one row per statement (one unit, one activity, one place, one window); several materials or tools of one passage are one row with several `tools_props`. Quote 20 to 600 characters, OCR errors as printed; give the offsets from `or27_find.py` or from the matcher.
4. Choose the tier by the rules of section 4; set `activity_basis`; map the clip (`poses.json`) or name the missing pose; set `men` and `tools_props` only from the passage (a number not in the quote is refused).
5. Where two texts disagree (time, number, builder, place) write both rows and a `conflicts` entry on each with a `scenario_key`; never merge or choose.
6. Where the record is silent for a unit or work the plan names, write an `open gap` row (what was searched, in which texts, with which patterns, the result) and a register entry `EG-LIFE-nnnn`; a failed lookup is recorded as failed.
7. Run `python3 -I tools/bt/life/validate_evidence.py <group>` until it exits 0; then a second reading of every row against its own quote (a different pass, a different sitting); then write `<group>.report.md` (counts by kind, subkind, tier; conflicts; gaps; poses named; what was not read).
8. Do not edit another group's file: a row about a unit of another group that sits in a text you own is yours; a passage in a text you do not own is a note in your report for its owner.
9. Append one dated line to `GOVERNANCE/progress.md` at each milestone with a single shell append.

## 10. Done means

A group is done when its file validates (`--all` exit 0), every owned record has been read at its leads, every work assigned to it has rows or a registered gap, every row has had a second reading, the report is written, and nothing in the file says how the page was produced. The pass is done when all 22 groups are done and `validate_evidence.py --all` exits 0 on the merged files. Nothing in this plan marks OA11 satisfied: the gates (Q08, Q17) and the content modules that draw these rows are later steps.

## 11. How the rows meet the derived gate OA-G11 (GATE-SPEC-A 3.10, DD-G14)

* (a) works: every construction (E-01..E-18 construction rows, the prepared emplacements G-03 and G-12, the builds of DD-04 (G-03 per-gun earthworks of the evening of 1 July, G-11 split, G-18 Stevens' Knoll, from the terrain-1 and terrain-2 close-outs) and every further defence a source documents, such as rails pulled for breastworks) needs its builder, its tools and its interval: the labour rows carry `unit_id` or `work_id` with `builder_unknown` (the labelled stand-in crew of PDF B.7.1), `tools_props` and `window`; a work with no row stays a registered gap, never an unbuilt feature.
* (b) artillery positions: `gun_pit_or_epaulement` and `battery_platform` rows for the G rows; the guns brought and served there belong to the artillery workstreams, not to this evidence.
* (c) routine: every unit-time slot needs an activity class and a place region. This pass supplies the sourced slots (rows of kind routine, with place and window) and the basis for the rest (generic rows of `period-manuals`: the ration, the daily calls, camp police, guard and picket duty). Which slots are covered by a documented, an inferred or only a generic row is computed from the files by the content module and by each group report (units of the group x days 26 Jun - 14 Jul); this plan claims no coverage.
* (d) evidence: documented only from a non-lead source that states it for that unit, place and time; otherwise plausible-procedural, marked; no meal time, ration or camp layout invented: a meal hour is only ever a manual's hour (generic row) or a unit's own statement (documented row).
* (e) nights: every group report lists the nights of its window (26/27 June to 13/14 July) by unit with a row or the generic basis; the night rows (sleep, picket, fires, cooking at 02:30 as in `us-2c-R001`) are the ones the luminance floor of Q10 draws.
* (f) the page loads the scenes: the data of the content module (`app/data/life`) is a later step and is not started here.

## 12. Rebuild order and files

`python3 -I tools/bt/life/acquire_texts.py` (period manuals, 1 request per second) -> `build_sources.py` -> `assign_groups.py` -> `scan_leads.py` (heavy: through `tools/horde/bench.sh`) -> `build_contract.py` -> `build_poses.py` -> `seed_rows.py` (only writes missing ids) -> `build_inventory.py` -> `build_groups.py` (this file) -> `validate_evidence.py --self-test` and `--all`. Files: `evidence/{contract,groups,sources,poses,report_assignments,acquired_period}.json`, `evidence/<group>.jsonl`, `leads/*.leads.jsonl`, `leads/SUMMARY.json`, `inventory/{works,leads_by_record}.json`, `tools/bt/life/*.py`.

## 13. Not run, not claimed, owed

* No evidence row beyond the 11 seed rows exists yet; no count of documented rows is claimed.
* The lead scan is a keyword scan: a passage that speaks of work or routine without those words is not a lead (the groups read their records, not only their leads).
* The assignment of records to groups is by header rules (corps in the heading, regiment name, commander name); `needs_hand_check` lists what was placed by default.
* Pages: for Official Records records whose running head is lost the page is a range (the validator accepts any page in it); the state volumes and newspapers have no page model here.
* The matcher's OCR fold and edit distance are tolerance for scan errors; they do not repair digits: a number read from a damaged print needs a second witness (`ocr_repairs`).
* Browser and GPU: nothing here draws anything; no view was looked at, no timing was taken. The content modules (`src/ext/camp-life`) and their data (`app/data/life`) are not started by this task.
* Owner-only steps: none. The period manuals are public domain and were fetched without an account; if the owner wants Casey and Hardee (the stack-arms and halt commands), the identifiers are in the drill notes (`infantrytacticsf01brig`, `hardeesrifleligh01hard`) and the group `period-manuals` may fetch them with `acquire_texts.py`.
