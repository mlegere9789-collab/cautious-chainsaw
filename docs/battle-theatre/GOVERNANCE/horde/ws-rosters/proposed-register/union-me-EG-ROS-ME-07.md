# EG-ROS-ME-07: Row-to-name binding of the Maine 1863 returns and the 1898 lists is not independently sampled

| Field | Content |
|---|---|
| ID | EG-ROS-ME-07 |
| Requirement IDs | OA03 (complete roster section of both armies, source and rights per name); R22; Law clauses 3, 4 and 7 |
| Category | verification not run |
| Description | Every line is located in the pinned text (name, remark tokens, page) and verify_unit.py passes on 15 files. That does not prove that the remark beside a name belongs to it on the pages where the text layer lists the columns in separate blocks: the binding is by word-box geometry (rows by the vertical position corrected for tilt; cells by position and content). The independent sample of page images (R-G9) has not been run. |
| Why literal 100% is not possible or blocked | The check needs page images and a reader; none was run in this item. |
| Evidence searched | pipeline2/union_me (me_index.py, me_agr.py, me_gett.py) and the reading of printed sample lines in the run (about 40 output lines read beside the word-box rows of leaves 346 and 347 and the text of other leaves; this is not a sample in the sense of PLAN.md 4.4); two defects of the first runs were found that way and fixed (section headings of the cavalry returns taken as names; a rank cell holding the age). |
| Autonomous substitute applied | None; no page of the unit files is described as checked beyond V1-V3. |
| Strongest evidence-based reconstruction | The sample of PLAN.md 4.4 over these 14 units (299 lines with no error give an upper bound of 1 percent). |
| Confidence tier | verification not run |
| Competing values | - |
| Product marking | The unit page of the roster states the gap with this id on each of the units named; no line is invented. |
| Visual and audio impact | None. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | None. |
| Agent recommendation | Run roster-qa on a stratum of these files before any use of the remarks. |
| Status | open (proposed by bt-rosters / union-me; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
