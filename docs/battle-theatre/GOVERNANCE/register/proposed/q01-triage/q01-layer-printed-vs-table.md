# q01-layer-printed-vs-table: Formations that carry the PDF's printed single figure while the table holds Official Records ranges

| Field | Content |
|---|---|
| ID | q01-layer-printed-vs-table |
| Requirement IDs | R04, R10 |
| Category | source conflict (weak printed figure vs documented ranges) |
| Description | 14 FAIL item(s) of gate Q01 (Q01.3 14) over 14 unit(s). Units: cs-1c, cs-1c-pickett-garnett, cs-2c, cs-2c-rodes-iverson, cs-3c, us-11c, us-12c, us-1c-1d-meredith, us-2c, us-3c, us-5c, us-6c, us-art-reserve, us-cav. |
| Why literal 100% is not possible or blocked | The PDF prints one figure for 13 corps and 8 brigades (Stone Sentinels, a weak source); the table holds ranges of several bases from the returns. The printed figure sets the pool that the procedural shares of the leaves without a documented range are cut from, so replacing it changes figures drawn for other units. |
| Evidence searched | kit/verified_oob.json strength.ranges of the formation; history/units.json `strength.strength` and the allocation in app/src/history/strength.mjs. |
| Autonomous substitute applied | The printed figure stays, marked weak and inferred; the documented ranges are in the table for the owner. |
| Strongest evidence-based reconstruction | A formation total is the sum of its leaves where all leaves have documented figures. |
| Confidence tier | inferred |
| Competing values | - |
| Product marking | The unit card says what is open and this id; the tier glyph stays on the value. |
| How it would be closed | The owner decides whether a documented formation range replaces the printed figure as the pool of the remaining leaves; then the builder follows. |
| Owner decision requested | Whether the printed corps and brigade figures give way to the documented ranges (PENDING OWNER). |
| Status | open (proposed by tools/bt/propose_q01_gaps.py; not yet in register/) |
