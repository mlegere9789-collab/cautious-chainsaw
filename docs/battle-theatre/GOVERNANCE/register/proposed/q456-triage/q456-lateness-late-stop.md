# q456-lateness-late-stop: Lateness the documented rate cannot avoid: late stop

| Field | Content |
|---|---|
| ID | q456-lateness-late-stop |
| Requirement IDs | R04, R17 |
| Category | physics against record (a documented time the documented rate cannot meet) |
| Description | 26 BLOCKED-INPUT item(s) of gate Q05.4 over 26 unit(s) and 26 (unit, stop) pair(s): a later stop of the unit's ledger path reached late after a scenario moved a step-off or an earlier stop was late. Place(s): Cemetery Hill. Lateness 14 to 18 minutes; distance along the road 2101 to 2667 m. Scenario conflicts under which it appears: C-043. Units: us-1c-1d-meredith-19in, us-1c-1d-meredith-24mi, us-1c-1d-meredith-2wi, us-1c-1d-meredith-6wi, us-1c-1d-meredith-7wi, us-1c-2d-baxter-11pa, us-1c-2d-baxter-12ma, us-1c-2d-baxter-83ny, us-1c-2d-baxter-88pa, us-1c-2d-baxter-90pa, us-1c-2d-baxter-97ny, us-1c-2d-paul-104ny, us-1c-2d-paul-107pa, us-1c-2d-paul-13ma, us-1c-2d-paul-16me, us-1c-2d-paul-94ny, us-1c-3d-biddle-121pa, us-1c-3d-biddle-142pa, us-1c-3d-biddle-151pa, us-1c-3d-biddle-80ny, us-1c-art-1nye, us-1c-art-1nyl, us-1c-art-1pab, us-1c-art-2me, us-1c-art-4usb, us-1c-art-5me. |
| Why literal 100% is not possible or blocked | The record prints a time at a place; the documented speed (urgent double quick, 2.5146 m/s; Hardee para 114) from the point where the road enters the loaded ground cannot reach the place by then. Either the ground that is loaded ends too far out (the unit was nearer at that time), or the printed time is the head of a column, a later arrival of the unit or a clock of another style. No source read says which. |
| Evidence searched | No source search has been made for this entry yet: the dated search log of GATE-SPEC 1.4 (register/search_logs/<id>.json) is owed, and the gate keeps the items BLOCKED-INPUT until it exists. The gate record states what the layer computed, not what a source says. |
| Autonomous substitute applied | The layer keeps the speed bound and reports the lateness (report().offsets); the unit arrives late by the minutes above and the card says so. Nothing is drawn faster than the bound, nothing is moved earlier than its gate. |
| Strongest evidence-based reconstruction | The unit is drawn marching along the printed road at the documented rate from the edge of the loaded ground, arriving late; the lateness is a visible marked figure on its card (tier plausible-procedural). |
| Confidence tier | plausible-procedural |
| Competing values | the printed time (ledger) against the time the rate allows |
| Product marking | The unit card names this id and the minutes of lateness; the tier glyph stays plausible-procedural. |
| How it would be closed | A report that places the unit nearer at an earlier time (then the entry place moves in, a march from there), or an owner decision to extend the loaded ground along the road so the march starts where the record puts it. |
| Owner decision requested | Whether the loaded ground may be extended along this road, and whether a printed time may be read as the head of the column. |
| Status | open (proposed by tools/bt/propose_q456_gaps.py; not yet in register/); search log owed |
