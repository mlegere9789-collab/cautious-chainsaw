# q01-required-set: Units drawn with a strength whose kit row does not require a strength (artillery battalions, headquarters)

| Field | Content |
|---|---|
| ID | q01-required-set |
| Requirement IDs | R04, R10 |
| Category | evidence missing (kit required set) |
| Description | 20 BLOCKED-INPUT item(s) of gate Q01 (Q01.3 20) over 20 unit(s). Units: cs-1c-art, cs-1c-hood-henry, cs-1c-mclaws-cabell, cs-1c-pickett-dearing, cs-1c-res-art-washington, cs-2c-early-jones, cs-2c-johnson-andrews, cs-2c-res-art-1vaartbn, cs-2c-res-art-nelson, cs-2c-rodes-carter, cs-3c-anderson-cutts, cs-3c-heth-garnett, cs-3c-pender-poague, cs-3c-res-art-mcintosh, cs-3c-res-art-pegram, cs-anv-hq, cs-cav-horse-art, us-aop-hq, us-cav-art, us-hancock-acting. |
| Why literal 100% is not possible or blocked | groups.json lists guns and casualties as the required fields of an artillery battalion, so the evidence pass never looked for the men of the battalion; the layer draws a figure for it. |
| Evidence searched | kit/evidence/groups.json required sets; kit/verified_oob.json fields.strength absent for these units. |
| Autonomous substitute applied | Q01.3 reports BLOCKED-INPUT. |
| Strongest evidence-based reconstruction | None above the layer's tier-marked figure. |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | The unit card says what is open and this id; the tier glyph stays on the value. |
| How it would be closed | Add strength to the required set of these units in groups.json and read the battalion returns, or record that the layer must not draw a figure. |
| Owner decision requested | - |
| Status | open (proposed by tools/bt/propose_q01_gaps.py; not yet in register/) |
