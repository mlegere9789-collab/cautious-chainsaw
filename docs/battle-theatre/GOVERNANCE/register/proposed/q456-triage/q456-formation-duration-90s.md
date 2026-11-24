# q456-formation-duration-90s: The duration of a change of formation (90 s) is the shell's tuning value, not a drill-manual figure

| Field | Content |
|---|---|
| ID | q456-formation-duration-90s |
| Requirement IDs | R17 |
| Category | evidence missing (no manual figure read) |
| Description | 133 item(s) of gate Q06.2 over 33 unit(s) that deploy from the column of march after they have marched to their place (clauses that print "deploys"). The time of the change is dated by the clause (tier inferred); its duration is 90 s (FORMATION_SECONDS, decision DEC-008). Units: cs-1c-mclaws-barksdale-13ms, cs-1c-mclaws-barksdale-17ms, cs-1c-mclaws-barksdale-18ms, cs-1c-mclaws-barksdale-21ms, cs-1c-mclaws-kershaw-15sc, cs-1c-mclaws-kershaw-2sc, cs-1c-mclaws-kershaw-3sc, cs-1c-mclaws-kershaw-3scbn, cs-1c-mclaws-kershaw-7sc, cs-1c-mclaws-kershaw-8sc, cs-2c-rodes-carter, cs-2c-rodes-daniel-2ncbn, cs-2c-rodes-daniel-32nc, cs-2c-rodes-daniel-43nc, cs-2c-rodes-daniel-45nc, cs-2c-rodes-daniel-53nc, cs-2c-rodes-doles-12ga, cs-2c-rodes-doles-21ga, cs-2c-rodes-doles-44ga, cs-2c-rodes-doles-4ga, cs-2c-rodes-iverson-12nc, cs-2c-rodes-iverson-20nc, cs-2c-rodes-iverson-23nc, cs-2c-rodes-iverson-5nc, cs-2c-rodes-oneal-12al, cs-2c-rodes-oneal-26al, cs-2c-rodes-oneal-3al, cs-2c-rodes-oneal-5al, cs-2c-rodes-oneal-6al, cs-2c-rodes-ramseur-14nc, cs-2c-rodes-ramseur-2nc, cs-2c-rodes-ramseur-30nc, cs-2c-rodes-ramseur-4nc. |
| Why literal 100% is not possible or blocked | No drill manual read so far gives the time of a regiment forming line from the column of march in a form the shell can use; DEC-008 is a decision of the builder, not a register entry. |
| Evidence searched | No source search has been made for this entry yet: the dated search log of GATE-SPEC 1.4 (register/search_logs/<id>.json) is owed, and the gate keeps the items BLOCKED-INPUT until it exists. The gate record states what the layer computed, not what a source says. |
| Autonomous substitute applied | The change lasts 90 s and the event shows the weakest tier of its parts, plausible-procedural (fixed in app/src/history/real.mjs). |
| Strongest evidence-based reconstruction | The drill manuals in the library (Hardee 1861, Casey 1862) give the manoeuvres of a battalion and, read with the step lengths, a time can be derived; none has been read for this purpose. |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | The change of formation shows tier plausible-procedural and this id on the unit card. |
| How it would be closed | Read the manoeuvre (deployment on a named company or by the flank) in Hardee/Casey, derive the duration with the documented cadence and replace the 90 s; then close. |
| Owner decision requested | Whether a derived figure replaces 90 s once read (T-Q06-1). |
| Status | open (proposed by tools/bt/propose_q456_gaps.py; not yet in register/); search log owed |
