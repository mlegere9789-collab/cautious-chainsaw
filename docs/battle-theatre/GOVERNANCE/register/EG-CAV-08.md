# EG-CAV-08: Draught-horse losses of the batteries: times

| Field | Content |
|---|---|
| ID | EG-CAV-08 |
| Requirement IDs | R01, R03 |
| Category | evidence missing |
| Description | Counts are printed for six batteries (kit losses: 15th NY 25 killed or wounded, 1st NY B 13 disabled, 1st RI B 24 killed and 6 disabled, 4th NY 11, 13th NY 12, 2nd US A 13); no time is printed. Each loss is placed by the counter-based RNG inside the battery's engagement windows. 2nd US A (Calef, horse artillery) is not a drawn leaf unit of the layer. |
| Why literal 100% is not possible or blocked | Counts of draught-horse losses are printed for some batteries; no time is printed for any single loss. |
| Evidence searched | Run on 2026-11-24 on the acquired OR Ser. I vol. 27 text, parts 1-3 (library OR-27-1..3, tools/bt/or27_find.py): 6 searches, 1 with a relevant find (register/search_logs/EG-CAV-08.json holds each pattern, hit counts and result). Earlier: kit/cavalry_units.json (horses, strengths, behaviour_states), history/positions ledgers A, D, E, kit/artillery_batteries.json losses. Print sources (Busey and Martin, Coddington, Pfanz) are print-only and could not be searched. |
| Autonomous substitute applied | The model in app/src/history/cavalry.mjs, marked plausible-procedural on the unit card (section Riders and horses) and in app/data/cavalry-horses.json. |
| Strongest evidence-based reconstruction | Each loss is placed by the counter-based RNG inside the battery's engagement windows, marked plausible-procedural. Printed counts: McMahon p. 889 (13 horses killed in the day's fight), Ames p. 901 (14 horses killed in two days), Calef p. 1032 (OCR "1.3"), Robertson p. 1021 for Captain Daniels' battery (23). |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | Unit card section "Riders and horses": range, basis, tier pill and gap id. |
| Visual and audio impact | Fallen draught horses of the batteries. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | Accept RNG placement inside the engagement windows, or supply the battery histories that time the losses. |
| Agent recommendation | Keep the marked model until a source is read; do not read the model as history. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
