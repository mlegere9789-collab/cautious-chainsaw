# EG-CAV-06: The mounted charge: path and full-speed pace

| Field | Content |
|---|---|
| ID | EG-CAV-06 |
| Requirement IDs | R01, R03 |
| Category | evidence missing |
| Description | The charge clauses of the layer (AC-12, the Jul 3 15:00 attack of the 3rd Division) carry no path, so a charging unit has no ground speed and stands. The manual's schedule (Wheeler paras 292, 410-411: walk 20, trot 60, gallop 80, charge 60 paces) is data in gaits.mjs; the speed of the last pace ("nearly full speed", para 189) has no printed number. A unit whose path runs faster than the Wheeler gallop plays the gallop clip. |
| Why literal 100% is not possible or blocked | The manual's paces are data in gaits.mjs; the speed of the final pace of a charge ("nearly full speed") has no printed number and no charge in the layer carries a path. |
| Evidence searched | Run on 2026-11-24 on the acquired OR Ser. I vol. 27 text, parts 1-3 (library OR-27-1..3, tools/bt/or27_find.py) and on the kit and plan files: 3 searches, 0 with a relevant find (register/search_logs/EG-CAV-06.json holds each pattern, hit counts and result). Earlier: kit/cavalry_units.json (horses, strengths, behaviour_states), history/positions ledgers A, D, E, kit/artillery_batteries.json losses. Print sources (Busey and Martin, Coddington, Pfanz) are print-only and could not be searched. |
| Autonomous substitute applied | The model in app/src/history/cavalry.mjs, marked plausible-procedural on the unit card (section Riders and horses) and in app/data/cavalry-horses.json. |
| Strongest evidence-based reconstruction | A unit whose path runs faster than the manual's gallop plays the gallop clip; a charging unit with no path stands. Marked plausible-procedural. |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | Unit card section "Riders and horses": range, basis, tier pill and gap id. |
| Visual and audio impact | Pace and path of every mounted charge. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | Accept the gallop clip for charges with a path, or supply a source for charge speed and the paths of the charges. |
| Agent recommendation | Keep the marked model until a source is read; do not read the model as history. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
