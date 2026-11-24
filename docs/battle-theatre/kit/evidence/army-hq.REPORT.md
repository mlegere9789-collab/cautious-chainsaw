# Kit evidence report: army-hq

Group: headquarters of both armies, guards, engineers, signal and support troops, and the nine army-wide default records. Checker: `python -I tools/bt/kit_evidence_check.py army-hq --coverage --require-complete` exits 0, 0 errors. Written 2026-11-24.

## Counts
68 lines: 44 evidence, 23 gap, 1 source declaration; 16 evidence lines are `unit_id: null` (units of general headquarters the plan lacks). Required pairs: 49 of 49 evidenced or recorded as gaps; none open.

| field | lines by tier |
|---|---|
| arms | documented 2, inferred 3 |
| commander | documented 12 |
| dress | documented 3, inferred 4 |
| roster | documented 19, inferred 1 |

By unit: the two armies and the Union headquarters have roster and commander lines (Meade from OR27-1-R009 p. 155; Lee from the heading of OR27-2-R426 p. 293, since the Confederate table prints no army commander); Union support records roster lines for provost, signal, engineer, ambulance, medical, teamster (trains), ordnance, stretcher (inferred); CS.SUP.MEDICAL roster from Lee's letter; the Ambulance Corps has headgear, badge and side-arms lines from Letterman's printed orders; default.union.cavalry has four dress fields and weapon and sidearm lines, default.confederate.cavalry weapon and sidearm lines (Crowninshield; inferred where undated).

## Corrections
| unit | field | kit value now | evidence value | source | line |
|---|---|---|---|---|---|
| default.union.cavalry | arms weapon | sharps, burnside, gallager, smith, merrill carbines (draw) | Smith carbines of 1862 condemned February 1863 and replaced by Sharps, "in most general use in the United States cavalry" | Crowninshield (declared) | arms lines |
| US.SUP.AMBULANCE | dress | kit mix at tier I/P | green band around the cap, green half-chevron on each arm, revolvers (order of 2 Aug 1862; later order of Meade narrows the band) | LETTERMAN-1866 | dress lines |

## Conflicts
None declared. The two printed orders of the Ambulance Corps differ (cap band two inches; one and a quarter inches in the second, undated, order of Meade) and are two lines of different `as_of`.

## Gaps
Gap lines: roster (6 units: cs-anv-hq, CS.OTHERS, CS.SCSSBN, CS.SS_GENERIC, US.SUP.MUSICIAN, US.SUP.SUTLER), dress of ten support groups and of the other fields of the Ambulance Corps, arms and dress of the default records for infantry, German corps, officers, artillery and Confederate infantry, officers, artillery, and the undescribed dress fields of the cavalry defaults. Register proposals: kit-army-hq-01-roster, 02-dress, 03-defaults.

## Roster
Units of the table the plan lacks (null lines, parent us-aop-hq): 93d New York, 8th United States Infantry (eight companies), 3d Pennsylvania Cavalry and 6th Pennsylvania Cavalry Companies E and I (provost-marshal-general's command), Oneida (New York) Cavalry (guards and orderlies), 15th and 50th New York Engineers, United States Engineer Battalion. No South Carolina sharpshooter battalion is in the Confederate table; the kit records CS.SCSSBN, CS.OTHERS and CS.SS_GENERIC are not in it. Footnote: the Engineer Brigade, except the regular battalion, was ordered to Washington on 1 July. See requests/bt-oob-kit-army-hq-roster.md.

## For other groups
- us-cav: the cavalry arms and dress lines of this group's defaults rest on the same Crowninshield passage as the 1st Massachusetts lines in us-cav.jsonl.
- The Edie ordnance report (OR27-1-R026) counts stores collected (19,664 muskets, 9,250 bayonets among them) without models.

## Sources
OR27-1 (R009 p. 155; R016, R017, R024, R025, R026, R027, R028 searched or read; R008), OR27-2 (R424 p. 283, R426 p. 293, R428, R429), LETTERMAN-1866 (Ambulance Corps orders), Crowninshield (declared, file kept by us-cav at tmp/kit-us-cav/lib). Hosts: archive.org only (by us-cav). No host refused.

## Not done
No required pair is open. The Confederate side has no state or regimental text on disk for headquarters troops, so cs-anv-hq has no roster line; the provost, signal and engineer units have no strength or casualty lines because those fields are not required here (the return of casualties rows of headquarters, OR27-1-R013 p. 173, were not read for this group).
