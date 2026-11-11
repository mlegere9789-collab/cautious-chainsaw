# ws6-EG-01: Gun counts of drawn batteries whose count the kit data does not state

| Field | Content |
|---|---|
| ID | ws6-EG-01 |
| Requirement IDs | R01, R02, R04 (every unit; guns, limbers, caissons and teams), R13; PDF B.6.14.4, B.6.14.6 |
| Category | evidence missing |
| Description | The kit data states a count for 29 of 125 batteries and the roster draws 22 of them (124 pieces). 51 further drawn batteries and battalions have none. The default reading of the product draws their guns with the printed PDF defaults (Union six, Confederate four; a battalion = the batteries the kit lists x four; Stuart's horse artillery 13 as printed; a joined kit entry keeps its printed total divided evenly): 186 extra Union and 156 Confederate guns at history layer v8, so 310 Union and 156 Confederate guns against the printed inventory of 366-372 and 281-282. No gun is added to reach the inventory. |
| Why literal 100% is not possible or blocked | No per-battery return is in the repository (the Pendleton table is unreadable, shard terrain-1); the PDF itself calls the Union 'usually six' line unverified background knowledge and the Confederate four a total check. |
| Evidence searched | PDF B.6.14.4 and B.6.14.6 (plan-clean.txt pp. 78-82); kit/artillery_batteries.json (96 batteries 'gap'); app/data/battery-guns.json; shards terrain-1 EG-17, terrain-2. No web lookup (hosts refused earlier shards). |
| Autonomous substitute applied | plausible_fill policy in app/src/structures/artillery.mjs: marked plausible-procedural per battery (count tier, basis and source on every card); policy stated_only (the 124) kept as a selectable reading. |
| Strongest evidence-based reconstruction | Counts from the Official Records battery by battery once the scan is restored; until then the printed defaults, visibly marked. |
| Confidence tier | plausible-procedural (the filled counts); inferred (the four OR counts, EG-06); documented where the kit cites a non-weak source (the 124 stated) |
| Competing values | stated_only (124 guns) / plausible_fill (default); caissons: see ws6-EG-03 |
| Product marking | Tier overlay glyph on each extra gun and on the battery card (basis: 'PDF default for a Union battery (6 guns), applied because the kit data states no count'); gap marker for the three battalions with no count. |
| Visual and audio impact | About 342 extra guns, 466 limbers, 466 caissons and 6,400 horses on the field at 3 July; no gun appears before its battery's earliest arrival. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | Is the plausible fill the default view, or only the 124 stated guns? (Law cl.6: the requirement stands in full until the owner reduces it; the agent chose fill as the default and logged it PENDING OWNER.) |
| Agent recommendation | Keep plausible_fill as the default; carry stated_only as a selectable scenario. |
| Status | open (proposed by workstream 6; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
