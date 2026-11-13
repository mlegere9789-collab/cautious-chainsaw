# bt-oob-kit / us-2c-1d: requests (catalog, library, roster)

Written 2026-11-13 by workstream bt-oob-kit for the integrator and the roster and library owners. Nothing in this note changes a file outside the workstream's ownership; it lists what the evidence file `kit/evidence/us-2c-1d.jsonl` could not express.

## Catalog (kit_items.py, kit_weapons_data.py: integrator)

1. Arms of the 63d New York, "smooth-bore Springfield muskets, caliber .69" and 60 rounds of buck and ball (OR27-1-R084 p. 388): the line uses `m1842_smoothbore` and `buck_and_ball_load`; the passage does not name the model year. The catalog id `smoothbore_69_musket_unspecified` is flagged placeholder (the 116th Pennsylvania's forum source), so it could not carry a documented line. Request: decide whether a catalog id for ".69 smoothbore, model not named" is wanted; until then the line stands on `m1842_smoothbore` with its note.
2. The 145th Pennsylvania's "old Harper's Ferry musket ... smooth-bore guns" (September 1862, PA-GB-1914-v2) and the 148th Pennsylvania's "breech-loading rifles" (September 1864, FOX-1889): no catalog id; the lines carry `weapon_id: null` and the printed words.
3. Bayonet states: the 53d Pennsylvania fixed bayonets and the 66th New York advanced without fixing them (OR27-1-R095, R091). The lines use `arms` with `kit_field: bayonet` and `weapon_id: socket_bayonet` and say "fixed" or "not fixed" in the item's note; the kit's bayonet state items (`bayonet_fixed`, `bayonet_scabbarded`) are dress items. Request: say which route the compile should take for a state of the bayonet.
4. Items with `item_id: null` because the passage names no pattern: knapsack and blanket roll, cartridge box, canteen (PA-GB-1914-v2, the 116th Pennsylvania's march of June 1863).

## Library (GOVERNANCE/library: owner of the ledger)

No new text was declared by this group. Regimental or state volumes are missing for the 5th New Hampshire, the 28th Massachusetts, the 27th Connecticut and the 2d Delaware (gap line us-2c-1d:0257, result `source_unavailable`). A public-domain regimental history of each, if one is found on archive.org, would be the source for their arms, dress and strengths. No title is asserted here; a library search is owed. Owner-only acts (accounts, purchases) are not needed for public-domain texts.

## Roster (history/units.json owner)

1. Add the 6th New York Cavalry, Companies D and K (Capt. Riley Johnson), escort of Second Corps headquarters (organization table OR27-1-R009 p. 157; roster line us-2c-1d:0254, commander 0255; casualty row 0119). Not in the plan's group.
2. `us-hancock-acting` is described as "II Corps commander acting for Meade": the record says Hancock was assigned to command the First, Third and Eleventh Corps (the table: all the troops on the field) from about 3 p.m. to 5-6 p.m. on 1 July, with orders to decide whether to fight at Gettysburg (OR27-1-R076 pp. 367-368; lines 0069, 0070).
3. The corps commanders in the roster are "Hancock (w); Gibbon; Hays": the record adds Caldwell (from the evening of 3 July, lines 0067 and 0265) and distinguishes William Hays (corps) from Alexander Hays (Third Division); Hancock took the corps back on the morning of the 2d and Gibbon had it again from the afternoon (lines 0064-0066).
4. The Third Brigade's commanders after Zook: Fraser (140th Pennsylvania) and Chapman (57th New York), in an order the record does not state (lines 0076, 0077).
