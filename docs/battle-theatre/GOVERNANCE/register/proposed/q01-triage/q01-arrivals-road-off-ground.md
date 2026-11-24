# q01-arrivals-road-off-ground: The printed road of approach lies outside the loaded ground (Black Horse Tavern Road, Third Corps)

| Field | Content |
|---|---|
| ID | q01-arrivals-road-off-ground |
| Requirement IDs | R04, R10 |
| Category | evidence missing (ground not loaded) |
| Description | 12 FAIL item(s) of gate Q01 (Q01.5 12) over 12 unit(s). Units: us-3c-2d-brewster-120ny, us-3c-2d-brewster-70ny, us-3c-2d-brewster-71ny, us-3c-2d-brewster-72ny, us-3c-2d-brewster-73ny, us-3c-2d-brewster-74ny, us-3c-2d-carr-11ma, us-3c-2d-carr-11nj, us-3c-2d-carr-12nh, us-3c-2d-carr-16ma, us-3c-2d-carr-1ma, us-3c-2d-carr-26pa. |
| Why literal 100% is not possible or blocked | The ledger prints the Black Horse Tavern Road for the unit; the road does not cross the edge of the loaded terrain, so no entry place can be placed from it. |
| Evidence searched | history/arrivals.json AP-07; the gazetteer roads and the loaded ground extent. |
| Autonomous substitute applied | No entry place is drawn; Q01.5 fails. |
| Strongest evidence-based reconstruction | The point where the printed road meets the edge of the loaded ground cannot be fixed from the record read. |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | The unit card says what is open and this id; the tier glyph stays on the value. |
| How it would be closed | Extend the loaded ground along the road, or a source that places the column at the edge. |
| Owner decision requested | Whether the loaded ground may be extended. |
| Status | open (proposed by tools/bt/propose_q01_gaps.py; not yet in register/) |
