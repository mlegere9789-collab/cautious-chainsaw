# q456-lateness-ledger-vs-edge-baltimore-pike: Lateness the documented rate cannot avoid: ledger vs edge (Baltimore Pike)

| Field | Content |
|---|---|
| ID | q456-lateness-ledger-vs-edge-baltimore-pike |
| Requirement IDs | R04, R17 |
| Category | physics against record (a documented time the documented rate cannot meet) |
| Description | 14 BLOCKED-INPUT item(s) of gate Q05.4 over 14 unit(s) and 14 (unit, stop) pair(s): a ledger time at a place that the documented speed cannot reach from where the printed road enters the loaded ground. Place(s): Cemetery Ridge; road Baltimore Pike. Lateness 32 to 39 minutes; distance along the road 4662 to 5768 m. Scenario conflicts under which it appears: the default views only. Units: us-12c-2d-candy-147pa, us-12c-2d-candy-28pa, us-12c-2d-candy-29oh, us-12c-2d-candy-5oh, us-12c-2d-candy-66oh, us-12c-2d-candy-7oh, us-12c-2d-greene-102ny, us-12c-2d-greene-137ny, us-12c-2d-greene-149ny, us-12c-2d-greene-60ny, us-12c-2d-greene-78ny, us-12c-2d-kane-109pa, us-12c-2d-kane-111pa, us-12c-2d-kane-29pa. |
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
