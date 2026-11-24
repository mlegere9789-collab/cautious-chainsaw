# EG-CAV-01: Mounted strength of every cavalry regiment (horses per man)

| Field | Content |
|---|---|
| ID | EG-CAV-01 |
| Requirement IDs | R01, R03 |
| Category | evidence missing |
| Description | No regimental present-for-duty or mounted strength is in the record (Busey and Martin print-only; kit strengths_note). Three weak observations bound the share of men with a serviceable horse from 0.47 to 0.77; the range card shows that share up to one horse per man and the picture draws one horse per drawn trooper. |
| Why literal 100% is not possible or blocked | No regimental present-for-duty, mounted or horse strength of a cavalry regiment is printed in any text acquired; OR Ser. I vol. 27 prints army and command aggregates of men only. The print sources that carry regimental strengths are print-only. |
| Evidence searched | Run on 2026-11-24 on the acquired OR Ser. I vol. 27 text, parts 1-3 (library OR-27-1..3, tools/bt/or27_find.py): 9 searches, 0 with a relevant find (register/search_logs/EG-CAV-01.json holds each pattern, hit counts and result). Earlier: kit/cavalry_units.json (horses, strengths, behaviour_states), history/positions ledgers A, D, E, kit/artillery_batteries.json losses. Print sources (Busey and Martin, Coddington, Pfanz) are print-only and could not be searched. |
| Autonomous substitute applied | The model in app/src/history/cavalry.mjs, marked plausible-procedural on the unit card (section Riders and horses) and in app/data/cavalry-horses.json. |
| Strongest evidence-based reconstruction | Keep the model of src/history/cavalry.mjs (one horse per drawn trooper, shown as a range 0.47 to 1.0 with the basis), marked plausible-procedural; replace it by printed figures if Busey and Martin or a regimental history is acquired. |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | Unit card section "Riders and horses": range, basis, tier pill and gap id. |
| Visual and audio impact | Every mounted figure (about 12,000 horses): the count of horses per regiment. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | Accept one horse per drawn trooper (range card 0.47 to 1.0) as the marked model, or supply or approve acquisition of the print source for regimental mounted strengths. |
| Agent recommendation | Keep the marked model until a source is read; do not read the model as history. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
