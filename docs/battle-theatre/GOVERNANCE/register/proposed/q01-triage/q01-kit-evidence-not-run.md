# q01-kit-evidence-not-run: Kit units without a verified strength or commander: 22 of 26 research groups have no evidence file

| Field | Content |
|---|---|
| ID | q01-kit-evidence-not-run |
| Requirement IDs | R04, R10 |
| Category | evidence missing |
| Description | 1180 BLOCKED-INPUT item(s) of gate Q01 (Q01.3 446, Q01.4 135, Q01.7 599) over 602 unit(s). Units by research group: army-hq 4; cs-anderson 28; cs-art-1c 13; cs-art-2c 6; cs-art-3c 6; cs-cav 33; cs-early 25; cs-heth 23; cs-hood 23; cs-johnson 27; cs-mclaws 26; cs-pender 24; cs-pickett 20; cs-rodes 28; us-11c 36; us-12c 37; us-1c 1; us-2c-1d 1; us-3c-1d 1; us-3c-2d 23; us-5c 48; us-6c 49; us-art-corps 45; us-art-reserve-horse 33; us-cav 42. |
| Why literal 100% is not possible or blocked | No non-lead source has been read for these units yet: the kit evidence pass has run for four groups (us-1c, us-2c-1d, us-2c-2d3d, us-3c-1d). The kit tables hold the owner PDF's values, which cite Wikipedia and web pages (leads), so nothing may be called verified. |
| Evidence searched | The pass plan (kit/evidence/PLAN.md) names the reports and tables to read per group; for the groups listed none has been read into an evidence file. No lookup failed: the work is not yet done. |
| Autonomous substitute applied | The unit is drawn at the layer's tier (printed single figure or plausible-procedural share) and gates Q01.3, Q01.4 and Q01.7 report BLOCKED-INPUT, never PASS. |
| Strongest evidence-based reconstruction | The Official Records organization tables and returns (OR27-1-R008, R009, R013; OR27-2-R424, R425, R427) state regiment commanders with succession, and return strengths by corps and division; the evidence pass extracts them with verbatim quotes. |
| Confidence tier | inferred |
| Competing values | - |
| Product marking | The unit card says what is open and this id; the tier glyph stays on the value. |
| How it would be closed | Run the kit evidence pass for each listed group (tools/bt/kit_evidence_plan.py, kit_evidence_check.py), then python3 -I tools/bt/kit_verified.py build. |
| Owner decision requested | - |
| Status | open (proposed by tools/bt/propose_q01_gaps.py; not yet in register/) |
