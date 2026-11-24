# q456-q06-road-conflict-reports: A unit whose own reports print another road than its corps

| Field | Content |
|---|---|
| ID | q456-q06-road-conflict-reports |
| Requirement IDs | R04, R10, R17 |
| Category | source conflict (selectable scenario) |
| Description | 1 FAIL item(s) of gate Q06.3 over 1 unit(s). Units: cs-2c-early-jones. |
| Why literal 100% is not possible or blocked | the ledger prints a road for the corps, but the reports of the unit print another road. |
| Evidence searched | No source search has been made for this entry yet: the dated search log of GATE-SPEC 1.4 (register/search_logs/<id>.json) is owed, and the gate keeps the items BLOCKED-INPUT until it exists. The gate record states what the layer computed, not what a source says. The ledger and the reports named in the gate evidence (evidence.reason) were read by the layer builder, not by a source search for this entry. |
| Autonomous substitute applied | The unit is not drawn with a path (or only at the edge); Q06.3 fails for each unit. It stays an item with no path, LINKED-ACTIVE at sub-requirement level only with an L3 register entry. |
| Strongest evidence-based reconstruction | The strongest statement the record supports is the road of the corps where one is printed, marked inferred; a path is inferred only where a document supports it. |
| Confidence tier | inferred |
| Competing values | - |
| Product marking | The unit card says what is open and names this id; the tier glyph stays on the value. |
| How it would be closed | The owner's selection of the default view. |
| Owner decision requested | Default view of the competing roads (PENDING OWNER). |
| Status | open (proposed by tools/bt/propose_q456_gaps.py; not yet in register/); search log owed |
