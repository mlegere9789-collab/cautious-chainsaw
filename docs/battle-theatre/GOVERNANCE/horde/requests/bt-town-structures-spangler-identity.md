# Request to the structures owner (world-content): the record bld-spangler-farm and hospital H-06 are drawn on the wrong Spangler farm

From: bt-town (planning step of the evidence pass for OA10), 2026-11-14. Nothing has been changed by this workstream.

## What

`structures/structures.json` record `bld-spangler-farm` and `structures/hospitals.json` H-06 ("Spangler farm") carry the plan row of **George Spangler's** farm: "Hospital Road; George Spangler, 166 acres; bank barn with 7 ft forebay, summer kitchen, smokehouse; XI Corps hospital from mid-afternoon 1 July to 6 August; Artillery Reserve camped 2 July". `app/data/structures3d.json` draws that record on the geometry `STR-SPANGLER_H-HOUSE1`, `STR-SPANGLER_H-BARN1` and the `STR-SPANGLER_H-OUTBUILDING3..5` markers, which are the **Henry Spangler** farmstead of the base-map catalogue (`docs/basemap1863/features/structures/structures.geojson`, farm key `spangler_h`). The hospital badge (a solid or hollow "H") is therefore drawn on the Henry Spangler house, and the George Spangler farm has no geometry.

## Why (local Park Service texts; every quote below was located by `tools/bt/town/validate_evidence.py` in `town/evidence/EXAMPLES.jsonl`)

- NPS-CLI-PCB p.73: "Henry Spangler Farmstead. (Contributing Site) This farmstead was located between the Confederate and Union battle lines on Seminary and Cemetery Ridges." and "During the battle the barn was burned. The farm may have served as a temporary hospital."
- NPS-COMMON-PRIDE-2 p.184: "in charge of the 2nd Division, 11th Corps Union hospital at the George Spangler farm".
- NPS-MON-LOC-1932 p.24: "The Eleventh Corps on Hospital Road 700 feet east of George Spangler house".
- NPS-CLI-ERR p.101: Confederate artillery "would have had clear fields of fire into the Union army's artillery and ammunition park on the nearby George Spangler farm".
- `app/data/gazetteer.json`: "Spangler farm" lies at the Henry Spangler farmstead (about 1.6 km west and 2.4 km south of the Diamond).

So there are two farms. The Warren plate labels five symbols about 1.9 km south-east of the Diamond "HENRY SPANGLER" (OCR hints, unreviewed or reviewed symbols STR-MAPSYM-0163 to 0167): that label does not say whose farm it was in 1863 and is not used to place George Spangler's farm.

## The change asked (when the group passes have delivered their rows; not before)

1. Keep the current drawing until the group files `farms-emmitsburg-road.jsonl` (Henry Spangler: house, barn burned in the battle) and `farms-culps-hill-baltimore-pike.jsonl` (George Spangler: XI Corps hospital) exist and pass `validate_evidence.py --complete`; their `identity` rows are in conflict and neither is chosen.
2. Then, if the owner or you choose the Park Service reading: declare a new building for George Spangler's farm (the pass declares it as a TWN id with its place an open gap), link hospital H-06 to it, and link `STR-SPANGLER_H-*` to a record for the Henry Spangler farm. The plan row's details stay with the George farm.
3. Meanwhile, please add to the card of `bld-spangler-farm` the line "identity under review: the details of this record are those of George Spangler's farm; the geometry drawn is Henry Spangler's farmstead" (an informational line; it changes no pixel).

No gate is lowered by this request, and no choice between the two readings is made here (Law cl.6): the register entry proposal is `GOVERNANCE/horde/ws-town/proposed-register/plan-EG-01.md`.
