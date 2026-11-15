# Request from bt-life (group us-1c) to the owner of `report_assignments.json`: two Official Records reports assigned to the wrong group

Date: 2026-11-15. From: workstream bt-life, evidence group us-1c. To: the owner of `tools/bt/life/assign_groups.py` and `docs/battle-theatre/life/evidence/report_assignments.json`; copy for the engineers of groups us-11c and us-army.

## What

1. `OR27-1-R074` (Lieut. George Breck, Battery L, First New York Light Artillery, 16 July 1863, printed pp. 362-364) is assigned to **us-11c** (`how: regiment_exact:us-11c-art-1nyi`). Battery L, First New York is `us-1c-art-1nyl` of units.json (Wainwright's Artillery Brigade, I Corps); the XI Corps battery of the First New York is Battery I (Wiedrich). The report holds one labour statement for a work this group owns (G-02 / G-03) and two nearby: "I took position with the five remaining pieces of the battery to the front and right of the cemetery gate ... which position, by order of Colonel Wainwright, I caused ta be intrenched, and held during the two following days of the battle" (raw offsets 1266269-1266362 of the part 1 text, printed p. 363), and "greatly fatigued and exhausted by almost constant labor and watchfulness for three days, the men performed their duties cheerfully" (same report). Group us-1c did not write rows from it (the partition rule: a passage of a text another group owns is a note for its owner).

   The change asked: either assign `OR27-1-R074` to us-1c (this group then writes the rows with unit `us-1c-art-1nyl`, work G-03), or leave it with us-11c and tell its engineer that the unit of every row is `us-1c-art-1nyl`.

2. `OR27-1-R328` (Capt. R. Bruce Ricketts, Batteries F and G, First Pennsylvania Light Artillery, 30 August 1863, printed pp. 894-895) is assigned to **us-1c** (`how: regiment_exact:us-1c-art-1pab`). Batteries F and G are `us-art-reserve-huntington-1paf` and `-1pag` (Artillery Reserve, Huntington's brigade), not Battery B, First Pennsylvania (Cooper, `us-1c-art-1pab`, R075). Group us-1c read R328: it states the move from Taneytown with Huntington's brigade, the position on Cemetery Hill at 4 p. m. of 2 July under Wainwright's direction, the hand-to-hand defence of the left piece at about 8 p. m. and 1,200 rounds expended; it carries no labour or routine statement, so no row was written and nothing is lost by the wrong assignment. The change asked: reassign R328 to us-army (the Artillery Reserve).

## Why

Extract-once: every record must have the owner whose units it names, so that no passage is read twice and no row is lost. Both corrections only move ownership; neither changes a row.

## The exact change asked

In `report_assignments.json`: `OR27-1-R074`: group `us-1c` (or keep us-11c with a note); `OR27-1-R328`: group `us-army`; then `python3 -I tools/bt/life/build_groups.py` to refresh `groups.json`.
