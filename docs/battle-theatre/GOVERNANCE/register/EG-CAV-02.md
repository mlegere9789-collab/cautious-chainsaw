# EG-CAV-02: Horse casualties of cavalry

| Field | Content |
|---|---|
| ID | EG-CAV-02 |
| Requirement IDs | R01, R03 |
| Category | evidence missing |
| Description | One regimental horse figure is printed in the ledgers (6th US, 292 horses with 290 men, OCR digits). Horses killed under unhurt riders, horses lost with missing men, wounded horses led off and horse losses of the other regiments are not in the record and are not drawn; the time of each loss is the time of the rider's fall. |
| Why literal 100% is not possible or blocked | Horse losses are printed for some commands in OR Ser. I vol. 27 (found, below) but not for every regiment, and not with the circumstance (under an unhurt rider, with a missing man) or the time; no source acquired closes the set. |
| Evidence searched | Run on 2026-11-24 on the acquired OR Ser. I vol. 27 text, parts 1-3 (library OR-27-1..3, tools/bt/or27_find.py): 4 searches, 2 with a relevant find (register/search_logs/EG-CAV-02.json holds each pattern, hit counts and result). Earlier: kit/cavalry_units.json (horses, strengths, behaviour_states), history/positions ledgers A, D, E, kit/artillery_batteries.json losses. Print sources (Busey and Martin, Coddington, Pfanz) are print-only and could not be searched. |
| Autonomous substitute applied | The model in app/src/history/cavalry.mjs, marked plausible-procedural on the unit card (section Riders and horses) and in app/data/cavalry-horses.json. |
| Strongest evidence-based reconstruction | Keep the model (a horse down with each fallen trooper, time of the rider's fall), marked plausible-procedural. Printed figures found in the search (not yet in the product): Gamble p. 933, 3rd Indiana 18 and 8th Illinois 17 horses killed, 36 with the colonel's; Marshall (7th Virginia Cavalry) p. 762, horses killed 37 (OCR ".37"), wounded 45, captured 9 for the campaign period. They are totals without times and can bound, not place, the losses. |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | Unit card section "Riders and horses": range, basis, tier pill and gap id. |
| Visual and audio impact | Fallen-horse figures of every cavalry fight. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | Accept the rider-fall model with the printed regimental totals shown as the bound where they exist, or supply the regimental histories that give horse losses with times. |
| Agent recommendation | Keep the marked model until a source is read; do not read the model as history. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
