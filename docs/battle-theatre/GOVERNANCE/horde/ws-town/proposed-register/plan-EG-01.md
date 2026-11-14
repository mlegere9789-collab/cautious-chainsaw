# plan-EG-01: TW-ID-01: the plan row, the hospital H-06 and the geometry of "the Spangler farm" belong to two different farms

| Field | Content |
|---|---|
| ID | plan-EG-01 |
| Requirement IDs | R12, OA10 |
| Category | source conflict / identity defect in the product data |
| Description | structures.json record bld-spangler-farm and hospital H-06 carry the plan row of George Spangler's farm (Hospital Road, 166 acres, XI Corps hospital, bank barn with a 7 ft forebay), and the product draws that record on the geometry STR-SPANGLER_H-* (house, barn burned in the battle, smokehouse, stable), which Park Service texts place at the Henry Spangler farmstead between Seminary and Cemetery Ridges. The hospital badge and the XI Corps details therefore sit on the wrong farm in the drawing, and the George Spangler farm has no geometry. The Warren plate labels five symbols about 1.9 km south-east of the Diamond "HENRY SPANGLER" (OCR hints): the label does not say whose farm it was in 1863. |
| Why literal 100% is not possible or blocked | Not a limit of the record: the sources exist and are local; the defect is in how the product links a record to a geometry. |
| Evidence searched | town/evidence/EXAMPLES.jsonl (rows located by tools/bt/town/validate_evidence.py): NPS-CLI-PCB p.73 ("Henry Spangler Farmstead. (Contributing Site) This farmstead was located between the Confederate and Union battle lines on Seminary and Cemetery Ridges"; "During the battle the barn was burned. The farm may have served as a temporary hospital"); NPS-COMMON-PRIDE-2 p.184 ("2nd Division, 11th Corps Union hospital at the George Spangler farm"); NPS-MON-LOC-1932 p.24 ("The Eleventh Corps on Hospital Road 700 feet east of George Spangler house"); NPS-CLI-ERR p.101 ("the George Spangler farm" as the Union artillery and ammunition park); app/data/gazetteer.json "Spangler farm". |
| Autonomous substitute applied | None applied to the data. The group passes farms-emmitsburg-road (Henry) and farms-culps-hill-baltimore-pike (George) carry identity rows in conflict; request note bt-town-structures-spangler-identity.md tells the structures owner. |
| Strongest evidence-based reconstruction | Two farms, two buildings: the Henry Spangler farm drawn where it is; the George Spangler farm declared as a new building with its place an open gap until a map reading or text fixes it; the hospital H-06 linked to the George farm. |
| Confidence tier | documented (the two farms are two places in the local texts); position of the George Spangler farm: open gap |
| Competing values | The plan row reading (one Spangler farm, hospital on the drawn geometry) versus the Park Service reading (two farms) |
| Product marking | Hospital badge H-06 and the card of bld-spangler-farm flagged "identity under review" until the owner or the structures owner chooses. |
| Visual and audio impact | Hospital badge, farm geometry and card text of one farm. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | Which reading is the default view (Law cl.6). Agent recommendation: the Park Service reading, both selectable. |
| Agent recommendation | Carry both; correct the link only on a recorded choice. |
| Status | open (proposed by the planning step of bt-town, 2026-11-14) |
| Owner decision and date | (filled only from the Decision Log) |
