# EG-CAV-04: Dismounted shares: squadron arithmetic and unstated fractions

| Field | Content |
|---|---|
| ID | EG-CAV-04 |
| Requirement IDs | R01, R03 |
| Category | evidence missing |
| Description | Where the report names squadrons the share rests on two companies to the squadron (not printed in any acquired text) and the kit's company count; where it names companies without a total (1st Vermont), a number of squadrons without a company count (6th Michigan) or says only "the rest" (9th New York) no fraction exists and the unit is drawn mounted with this gap listed. The hours of a fight are the engagement windows of the timeline rows (seeded_unverified). |
| Why literal 100% is not possible or blocked | Reports name squadrons dismounted (found) but no text acquired gives the number of companies or men in a squadron, so a fraction of a regiment cannot be derived; several reports name no fraction at all. |
| Evidence searched | Run on 2026-11-24 on the acquired OR Ser. I vol. 27 text, parts 1-3 (library OR-27-1..3, tools/bt/or27_find.py) and on the kit and plan files: 6 searches, 2 with a relevant find (register/search_logs/EG-CAV-04.json holds each pattern, hit counts and result). Earlier: kit/cavalry_units.json (horses, strengths, behaviour_states), history/positions ledgers A, D, E, kit/artillery_batteries.json losses. Print sources (Busey and Martin, Coddington, Pfanz) are print-only and could not be searched. |
| Autonomous substitute applied | The model in app/src/history/cavalry.mjs, marked plausible-procedural on the unit card (section Riders and horses) and in app/data/cavalry-horses.json. |
| Strongest evidence-based reconstruction | Keep two companies to the squadron as a marked assumption (plausible-procedural) and draw a unit mounted where no fraction is printed. Printed squadron counts found (not yet applied): Devin p. 939-941 (one squadron of the 9th NY; two squadrons of the 17th PA, etc.), Gamble p. 932 (one squadron of the 3rd Indiana), Custer p. 999 (five squadrons of a regiment). |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | Unit card section "Riders and horses": range, basis, tier pill and gap id. |
| Visual and audio impact | The share of each regiment shown dismounted. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | Accept two companies to the squadron as a marked assumption, or supply the printed company strength and organisation. |
| Agent recommendation | Keep the marked model until a source is read; do not read the model as history. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
