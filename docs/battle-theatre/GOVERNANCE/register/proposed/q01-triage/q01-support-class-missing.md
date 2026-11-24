# q01-support-class-missing: Support-troop classes of the kit that the layer holds as no unit (ambulance corps, stretcher bearers, provost guards, signal, engineers, ordnance, teamsters, sutlers, medical staff)

| Field | Content |
|---|---|
| ID | q01-support-class-missing |
| Requirement IDs | R04, R10 |
| Category | evidence missing (class not drawn) |
| Description | 11 FAIL item(s) of gate Q01 (Q01.2 11) over 11 unit(s). Units: CS.SUP.MEDICAL, US.SUP.AMBULANCE, US.SUP.ENGINEER, US.SUP.MEDICAL, US.SUP.MUSICIAN, US.SUP.ORDNANCE, US.SUP.PROVOST, US.SUP.SIGNAL, US.SUP.STRETCHER, US.SUP.SUTLER, US.SUP.TEAMSTER. |
| Why literal 100% is not possible or blocked | The layer carries combat units; the support classes of PDF K.1 exist in the kit as class records without a roster unit, strength or arrival ledger row. |
| Evidence searched | kit/verified_oob.json rows US.SUP.* and CS.SUP.*: no non-lead strength source has been read for the classes. |
| Autonomous substitute applied | Not drawn; Q01.2 fails for each class. |
| Strongest evidence-based reconstruction | None above the kit class record: no strength or arrival is stated by a source read so far. |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | The unit card says what is open and this id; the tier glyph stays on the value. |
| How it would be closed | A strength and arrival source for each class (Letterman, the army returns), then a layer unit that arrives as a march. |
| Owner decision requested | Whether classes with no unit-level record may be drawn as procedural shares (marked). |
| Status | open (proposed by tools/bt/propose_q01_gaps.py; not yet in register/) |
